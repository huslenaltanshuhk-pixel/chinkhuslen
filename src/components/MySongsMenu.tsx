import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Plus, Trash2, Music, ListMusic, Disc, Heart, Sparkles, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: string;
  genre: string;
  isFavorite?: boolean;
  lyrics?: string;
}

class TrapBeatSequencer {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private nextNoteTime: number = 0.0;
  private step: number = 0;
  private tempo: number = 140; // Trap tempo
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.1; // seconds
  private timerId: any = null;
  private gainNode: GainNode | null = null;
  private activeOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private onTimeUpdate: ((secs: number) => void) | null = null;
  private startTime: number = 0;
  private currentVolume: number = 0.5;

  constructor() {}

  start(volume: number, initialTime: number, onTimeUpdate: (secs: number) => void) {
    if (this.isRunning) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    this.ctx = new AudioContextClass();
    this.gainNode = this.ctx.createGain();
    this.currentVolume = volume;
    this.gainNode.gain.setValueAtTime(volume * 0.45, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);

    this.onTimeUpdate = onTimeUpdate;
    this.isRunning = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime;
    this.startTime = this.ctx.currentTime - initialTime; // Adjust start time for seek
    
    this.scheduler();
    this.updateTimeLoop();
  }

  setVolume(volume: number) {
    this.currentVolume = volume;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(volume * 0.45, this.ctx.currentTime);
    }
  }

  seek(time: number) {
    if (this.ctx) {
      this.startTime = this.ctx.currentTime - time;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    
    this.activeOscillators.forEach(({ osc, gain }) => {
      try {
        osc.stop();
      } catch (e) {}
    });
    this.activeOscillators = [];
    
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) {}
      this.ctx = null;
    }
  }

  private updateTimeLoop() {
    if (!this.isRunning || !this.ctx) return;
    
    const elapsed = this.ctx.currentTime - this.startTime;
    if (this.onTimeUpdate) {
      this.onTimeUpdate(elapsed % 362); // Loop song at 6:02
    }
    
    setTimeout(() => this.updateTimeLoop(), 250);
  }

  private scheduler() {
    if (!this.isRunning || !this.ctx) return;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.step, this.nextNoteTime);
      this.advanceNote();
    }
    
    this.timerId = setTimeout(() => this.scheduler(), this.lookahead);
  }

  private advanceNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th note
    this.step = (this.step + 1) % 16;
  }

  private scheduleNote(step: number, time: number) {
    if (!this.ctx || !this.gainNode) return;

    // Kick drum (Heavy 808 sub kick)
    const hasKick = (step === 0 || step === 6 || step === 10 || step === 11 || step === 14);
    if (hasKick) {
      this.playKick(time);
    }

    // Snare drum (crisp trap snare on 4 and 12)
    const hasSnare = (step === 4 || step === 12);
    if (hasSnare) {
      this.playSnare(time);
    }

    // Hi-hat (8th notes with some trap rolls at the end)
    const hasHat = (step % 2 === 0 || step === 7 || step === 15);
    if (hasHat) {
      this.playHihat(time, step === 7 || step === 15);
    }

    // Melodic Synth loop (catchy hip hop / trap progression in C-minor)
    const melodyNotes = [
      130.81, // C3
      155.56, // D#3
      174.61, // F3
      196.00, // G3
      174.61, // F3
      155.56, // D#3
      146.83, // D3
      130.81  // C3
    ];
    
    if (step % 2 === 0) {
      const melodyIndex = Math.floor(step / 2) % melodyNotes.length;
      const freq = melodyNotes[melodyIndex];
      this.playMelody(freq, time);
    }
  }

  private playKick(time: number) {
    if (!this.ctx || !this.gainNode) return;
    
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    
    osc.connect(oscGain);
    oscGain.connect(this.gainNode);

    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.35);

    oscGain.gain.setValueAtTime(1.2, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.38);

    osc.start(time);
    osc.stop(time + 0.4);

    this.activeOscillators.push({ osc, gain: oscGain });
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.gainNode) return;

    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1200;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.gainNode);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.gainNode);

    noise.start(time);
    noise.stop(time + 0.15);
    osc.start(time);
    osc.stop(time + 0.08);
  }

  private playHihat(time: number, isRoll: boolean) {
    if (!this.ctx || !this.gainNode) return;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(12000, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 10000;

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(this.gainNode);

    const volume = isRoll ? 0.3 : 0.18;
    const duration = isRoll ? 0.04 : 0.07;

    oscGain.gain.setValueAtTime(volume, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  private playMelody(frequency: number, time: number) {
    if (!this.ctx || !this.gainNode) return;

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    
    // Warm triangle wave for melody
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency * 2, time);

    // Sine wave for clean sub bass reinforcement
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(frequency, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, time);
    filter.frequency.exponentialRampToValueAtTime(350, time + 0.4);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(this.gainNode);

    oscGain.gain.setValueAtTime(0.25, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.38);

    osc.start(time);
    subOsc.start(time);
    osc.stop(time + 0.4);
    subOsc.stop(time + 0.4);

    this.activeOscillators.push({ osc, gain: oscGain });
    this.activeOscillators.push({ osc: subOsc, gain: oscGain });
  }
}

const ANTHEM_SONG: Song = {
  id: 'chinkhuslen-anthem',
  title: 'Хүслэн (Huslen Anthem)',
  artist: 'Хүслэн',
  url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  duration: '6:02',
  genre: 'Hip Hop',
  isFavorite: true,
  lyrics: `[Дахилт]
Хар, ногоон өнгөөр дэлхийг би будна
Хүсэл мөрөөдөлдөө Хүслэн тулна
168 өндөр, талбай дээр гараад
Сагсны шийд рүү би шууд дайрна!
Roblox, CS2-т би ухрахгүй дайчин
Миний түүхийг сонс, би ирээдүйн хаан!

[Бадаг 1]
13-хон настай ч би зогсолтгүй урагшилна
Нарны цацраг шиг ухаанаараа гялалзана
Наруто шиг зоригтой, Эрен шиг тэмцэгч
Доктор Стоун шиг шинжлэх ухааны хөтөч!
Вэндэбо-гийн хэмнэлд би толгойгоо дохиод
Жүжүцү Кайсэн шиг шидээ би гаргаад
Харри Поттер шиг шидэт саваагаар
Ирээдүйн ертөнцөө кодоор би бүтээнэ!

[Дахилт]
Хар, ногоон өнгөөр дэлхийг би будна
Хүсэл мөрөөдөлдөө Хүслэн тулна
168 өндөр, талбай дээр гараад
Сагсны шийд рүү би шууд дайрна!
Roblox, CS2-т би ухрахгүй дайчин
Миний түүхийг сонс, би ирээдүйн хаан!

[Бадаг 2]
CS2-ийн Dust 2 дээр аварга нь би шүү
Roblox-ын ертөнцөд чөлөөтэй дүүлнэ шүү
Сагсан бөмбөгийн шийдэнд гурваас би шиднэ
Амжилтын оргил руу Хүслэн зүтгэнэ.
Аниме ертөнцийн баатар шиг хүчирхэг
Миний зүрх сэтгэл яг л ган шиг бат бөх!
Энэ бол миний түүх, энэ бол миний дуу
Дурсамж бүхнээ хадгалсан сүлд дуу минь шүү!

[Outro]
Yes, Vendebo style...
Хүслэн... 168...
Хар ба Ногоон...
Бид урагшилсаар...`
};

const DEFAULT_SONGS: Song[] = [ANTHEM_SONG];

export function MySongsMenu() {
  const [songs, setSongs] = useState<Song[]>(() => {
    const saved = localStorage.getItem('chinkhuslen_songs');
    if (saved) {
      const parsed: Song[] = JSON.parse(saved);
      // Check if the anthem song is present, if not add it back because user wants it added
      const hasAnthem = parsed.some(s => s.id === 'chinkhuslen-anthem');
      if (!hasAnthem) {
        const updated = [ANTHEM_SONG, ...parsed];
        localStorage.setItem('chinkhuslen_songs', JSON.stringify(updated));
        return updated;
      }
      return parsed;
    }
    // If not saved, store DEFAULT_SONGS to localStorage
    localStorage.setItem('chinkhuslen_songs', JSON.stringify(DEFAULT_SONGS));
    return DEFAULT_SONGS;
  });

  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [showLyrics, setShowLyrics] = useState(true);

  // New song modal/inputs
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newGenre, setNewGenre] = useState('Lofi');
  const [showAddForm, setShowAddForm] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sequencerRef = useRef<TrapBeatSequencer | null>(null);
  const progressBarRef = useRef<HTMLInputElement | null>(null);

  // Initialize and keep only one sequencer
  if (!sequencerRef.current) {
    sequencerRef.current = new TrapBeatSequencer();
  }

  // Save to localStorage when songs change
  useEffect(() => {
    localStorage.setItem('chinkhuslen_songs', JSON.stringify(songs));
  }, [songs]);

  // Clean up sequencer on unmount
  useEffect(() => {
    return () => {
      if (sequencerRef.current) {
        sequencerRef.current.stop();
      }
    };
  }, []);

  // Handle song initialization and audio changes
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    const activeSong = songs[currentSongIndex];

    if (!activeSong) return;

    const isAnthem = activeSong.id === 'chinkhuslen-anthem';

    if (isAnthem) {
      // Pause traditional audio
      audio.pause();
      
      // Set fixed duration for anthem
      setDuration(362); // 6:02

      if (isPlaying) {
        if (sequencerRef.current) {
          sequencerRef.current.stop();
          sequencerRef.current.start(isMuted ? 0 : volume, currentTime, (secs) => {
            setCurrentTime(secs);
          });
        }
      } else {
        if (sequencerRef.current) {
          sequencerRef.current.stop();
        }
      }
    } else {
      // Stop sequencer
      if (sequencerRef.current) {
        sequencerRef.current.stop();
      }

      // Setup traditional audio
      audio.src = activeSong.url;
      audio.load();
      
      if (isPlaying) {
        audio.play().catch(e => {
          console.log('Play interrupted:', e);
          setIsPlaying(false);
        });
      }
    }

    // Audio event listeners
    const handleTimeUpdate = () => {
      if (!isAnthem) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (!isAnthem) {
        setDuration(audio.duration || 0);
      }
    };

    const handleSongEnded = () => {
      handleNext();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleSongEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleSongEnded);
    };
  }, [currentSongIndex, songs, isPlaying]);

  // Adjust volume
  useEffect(() => {
    const vol = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    if (sequencerRef.current) {
      sequencerRef.current.setVolume(vol);
    }
  }, [volume, isMuted]);

  // Toggle play/pause
  const togglePlay = () => {
    if (songs.length === 0) return;
    const activeSong = songs[currentSongIndex];
    const isAnthem = activeSong?.id === 'chinkhuslen-anthem';

    if (isPlaying) {
      setIsPlaying(false);
      if (isAnthem) {
        if (sequencerRef.current) {
          sequencerRef.current.stop();
        }
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      setIsPlaying(true);
      if (isAnthem) {
        if (sequencerRef.current) {
          sequencerRef.current.start(isMuted ? 0 : volume, currentTime, (secs) => {
            setCurrentTime(secs);
          });
        }
      } else if (audioRef.current) {
        audioRef.current.play().catch(err => {
          console.warn('Аудио тоглуулахад алдаа гарлаа:', err);
        });
      }
    }
  };

  const handleNext = () => {
    if (songs.length === 0) return;
    setCurrentSongIndex((prev) => (prev + 1) % songs.length);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (songs.length === 0) return;
    setCurrentSongIndex((prev) => (prev - 1 + songs.length) % songs.length);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    const activeSong = songs[currentSongIndex];
    const isAnthem = activeSong?.id === 'chinkhuslen-anthem';

    if (isAnthem) {
      setCurrentTime(newTime);
      if (sequencerRef.current) {
        sequencerRef.current.seek(newTime);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0) setIsMuted(false);
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSongs(prev => prev.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
  };

  const deleteSong = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const indexToDelete = songs.findIndex(s => s.id === id);
    const updatedSongs = songs.filter(s => s.id !== id);
    
    setSongs(updatedSongs);
    
    if (updatedSongs.length === 0) {
      setCurrentSongIndex(0);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      if (audioRef.current) audioRef.current.pause();
      if (sequencerRef.current) sequencerRef.current.stop();
      return;
    }
    
    if (indexToDelete === currentSongIndex) {
      setCurrentSongIndex(0);
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    } else if (indexToDelete < currentSongIndex) {
      setCurrentSongIndex(prev => prev - 1);
    }
  };

  const addNewSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    // Check if url is valid MP3 link (simple check, or default if broken)
    let finalUrl = newUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      alert('Дууны холбоос заавал http:// эсвэл https://-оор эхлэх ёстой!');
      return;
    }

    const newSong: Song = {
      id: Math.random().toString(),
      title: newTitle.trim(),
      artist: newArtist.trim() || 'Үл мэдэгдэх уран бүтээлч',
      url: finalUrl,
      duration: '3:00', // Mock duration before load
      genre: newGenre,
      isFavorite: false
    };

    setSongs([...songs, newSong]);
    setNewTitle('');
    setNewArtist('');
    setNewUrl('');
    setNewGenre('Lofi');
    setShowAddForm(false);
  };

  // Helper formats for time representation (e.g. 125s -> 2:05)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const activeSong = songs[currentSongIndex];

  return (
    <div className="flex flex-col gap-4 font-sans select-none h-full text-white">
      {/* 1. COMPACT INTERACTIVE PLAYER BOX */}
      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-3 relative overflow-hidden shadow-lg">
        {/* Animated Background Pulse Glow */}
        <div className="absolute -right-16 -top-16 w-32 h-32 bg-[#e8702a]/10 rounded-full blur-2xl pointer-events-none" />
        
        {activeSong ? (
          <>
            {/* Song Cover Disc and Details */}
            <div className="flex items-center gap-4">
              {/* Spinning Disc visualizer */}
              <div className="relative shrink-0">
                <div 
                  className={`w-14 h-14 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-950 border border-white/20 flex items-center justify-center relative overflow-hidden shadow-inner ${
                    isPlaying ? 'animate-spin' : ''
                  }`}
                  style={{ animationDuration: '6s' }}
                >
                  {/* Center circle */}
                  <div className="w-4 h-4 rounded-full bg-[#111827] border border-white/10 z-10" />
                  {/* Music icon or subtle gradient */}
                  <Disc className="absolute inset-0 text-white/5 w-full h-full p-2" />
                </div>
                {isPlaying && (
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#e8702a] border-2 border-zinc-950 flex items-center justify-center text-[7px] text-white animate-bounce">
                    ♩
                  </span>
                )}
              </div>

              {/* Title & Artist */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] bg-[#e8702a]/20 text-[#e8702a] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                    {activeSong.genre}
                  </span>
                  {activeSong.isFavorite && (
                    <Heart size={10} className="text-red-500 fill-red-500 animate-pulse" />
                  )}
                </div>
                <h3 className="font-bold text-sm text-white truncate mt-1">
                  {activeSong.title}
                </h3>
                <p className="text-xs text-white/60 truncate font-mono">
                  {activeSong.artist}
                </p>
              </div>
            </div>

            {/* Progress Slider Bar */}
            <div className="flex flex-col gap-1 mt-1 font-mono">
              <input
                ref={progressBarRef}
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#e8702a] transition-all"
              />
              <div className="flex justify-between text-[9px] text-white/50">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Navigation and Volume Control */}
            <div className="flex items-center justify-between mt-1">
              {/* Play buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrev}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
                  title="Өмнөх дуу"
                >
                  <SkipBack size={15} />
                </button>
                <button
                  onClick={togglePlay}
                  className="p-2.5 bg-[#e8702a] hover:bg-[#d2611f] text-white rounded-full transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-[#e8702a]/20 flex items-center justify-center"
                  title={isPlaying ? "Түр зогсоох" : "Тоглуулах"}
                >
                  {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current ml-0.5" />}
                </button>
                <button
                  onClick={handleNext}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
                  title="Дараагийн дуу"
                >
                  <SkipForward size={15} />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  {isMuted || volume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#e8702a]"
                />
              </div>
            </div>

            {activeSong.lyrics && (
              <div className="border-t border-white/10 pt-2.5 mt-1.5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowLyrics(!showLyrics)}
                  className="flex items-center justify-between text-[11px] text-[#e8702a] font-mono font-bold hover:text-white transition-colors px-1 cursor-pointer w-full"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText size={12} className="animate-pulse text-[#e8702a]" />
                    <span>ДУУНЫ ҮГ {showLyrics ? 'ХААХ' : 'ХАРАХ'}</span>
                  </span>
                  {showLyrics ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                
                <AnimatePresence initial={false}>
                  {showLyrics && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="bg-black/35 border border-white/5 rounded-xl p-3 overflow-y-auto text-[11px] text-white/90 leading-relaxed font-sans whitespace-pre-line text-center max-h-[170px] select-text scrollbar-thin"
                    >
                      {activeSong.lyrics}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-xs text-white/40">Дууны жагсаалт хоосон байна</div>
        )}
      </div>

      {/* 2. DYNAMIC PLAYLIST HEADER & LIST */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-1.5">
            <ListMusic size={14} className="text-[#e8702a]" />
            <span className="font-bold text-xs uppercase tracking-wider font-mono text-white/80">
              Миний Дууны Жагсаалт ({songs.length})
            </span>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[10px] bg-white/10 hover:bg-white/15 border border-white/5 px-2.5 py-1 rounded-lg text-[#e8702a] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus size={11} />
            <span>ДУУ НЭМЭХ</span>
          </button>
        </div>

        {/* 3. ADD NEW SONG FORM PANEL */}
        <AnimatePresence>
          {showAddForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={addNewSong}
              className="p-3 bg-white/5 border border-[#e8702a]/20 rounded-xl flex flex-col gap-2 overflow-hidden font-sans"
            >
              <div className="text-[10px] font-bold text-yellow-400 flex items-center gap-1 mb-1 font-mono">
                <Sparkles size={11} />
                <span>ДУРТАЙ ДУУНЫ ХОЛБООС (MP3 LINK) НЭМЭХ</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Дууны нэр (Title)"
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none focus:border-[#e8702a]"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={newArtist}
                    onChange={(e) => setNewArtist(e.target.value)}
                    placeholder="Дуучин (Artist)"
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none focus:border-[#e8702a]"
                  />
                </div>
              </div>
              <div>
                <input
                  type="url"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="Дууны шууд MP3 холбоос (URL)"
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-white font-mono focus:outline-none focus:border-[#e8702a]"
                />
              </div>
              <div className="flex gap-2 items-center justify-between">
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-white/50 font-mono">Төрөл:</span>
                  <select
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="bg-zinc-800 text-white text-[11px] border border-white/10 rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value="Lofi">Lofi</option>
                    <option value="Pop">Pop</option>
                    <option value="Rock">Rock</option>
                    <option value="Synthwave">Synthwave</option>
                    <option value="Ambient">Ambient</option>
                    <option value="HipHop">HipHop</option>
                  </select>
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-[10px] text-white/60 hover:text-white px-2 py-1"
                  >
                    Цуцлах
                  </button>
                  <button
                    type="submit"
                    className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-[10px] font-bold px-3 py-1 rounded"
                  >
                    Жагсаалтад нэмэх
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* 4. PLAYLIST COMPONENT VIEW */}
        <div className="flex flex-col gap-1.5 max-h-[170px] overflow-y-auto pr-1">
          {songs.map((song, idx) => {
            const isCurrent = idx === currentSongIndex;
            return (
              <div
                key={song.id}
                onClick={() => {
                  setCurrentSongIndex(idx);
                  setIsPlaying(true);
                }}
                className={`p-2 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                  isCurrent 
                    ? 'bg-[#e8702a]/10 border-[#e8702a]/40' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 flex items-center justify-center">
                    {isCurrent && isPlaying ? (
                      <div className="flex items-end gap-0.5 w-3 h-3 h-[10px] overflow-hidden">
                        <span className="w-0.5 bg-[#e8702a] rounded-full animate-[bounce_0.6s_infinite_alternate]" />
                        <span className="w-0.5 bg-[#e8702a] rounded-full animate-[bounce_0.8s_infinite_alternate_0.2s]" />
                        <span className="w-0.5 bg-[#e8702a] rounded-full animate-[bounce_0.5s_infinite_alternate_0.1s]" />
                      </div>
                    ) : (
                      <Music size={12} className={isCurrent ? "text-[#e8702a]" : "text-white/40"} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className={`text-xs font-bold truncate ${isCurrent ? "text-[#e8702a]" : "text-white"}`}>
                      {song.title}
                    </h4>
                    <p className="text-[10px] text-white/50 truncate font-mono mt-0.5">
                      {song.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 font-mono text-[10px] text-white/40 shrink-0">
                  <span className="hidden sm:inline bg-white/5 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold text-white/60">
                    {song.genre}
                  </span>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => toggleFavorite(song.id, e)}
                      className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-red-500 transition-colors"
                      title="Дуртай дуугаар тэмдэглэх"
                    >
                      <Heart 
                        size={11} 
                        className={song.isFavorite ? "text-red-500 fill-red-500" : ""} 
                      />
                    </button>
                    <button
                      onClick={(e) => deleteSong(song.id, e)}
                      className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-red-400 transition-all"
                      title="Устгах"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. USER FRIENDLY EXPLANATORY TIP */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 text-[10px] text-white/50 leading-relaxed font-mono">
        <div>💡 <strong>ЗӨВЛӨГӨӨ:</strong> Чинхүслэн чи өөрийнхөө хамгийн дуртай дууг сонсохын тулд дээрх <strong>"ДУУ НЭМЭХ"</strong> товчлуур дээр даран дууны шууд MP3 холбоосыг (URL) оруулаарай. Таны дуунууд хөтчийн санах ойд найдвартай хадгалагдах болно!</div>
      </div>
    </div>
  );
}
