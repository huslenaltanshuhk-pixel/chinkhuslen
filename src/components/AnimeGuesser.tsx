import React, { useState, useEffect, useRef } from "react";
import { X, Trophy, Heart, Timer, RefreshCw, Award, Volume2, VolumeX, Flame, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Question {
  id: number;
  emojis: string;
  answer: string;
  options: string[];
  image?: string;
  video?: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function AnimeGuesser({ onClose }: { onClose: () => void }) {
  const [originalQuestions, setOriginalQuestions] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const [streak, setStreak] = useState(0);
  const [gameState, setGameState] = useState<"loading" | "lobby" | "playing" | "gameover" | "victory">("loading");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answeredState, setAnsweredState] = useState<"correct" | "incorrect" | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sound generator using Web Audio API
  const playSound = (type: "ding" | "buzz" | "bonus" | "gameover") => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === "ding") {
        // High-pitched sweet bell ding
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "buzz") {
        // Deep buzzer warning
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(130, ctx.currentTime); // C3
        osc.frequency.linearRampToValueAtTime(85, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === "bonus") {
        // Arpeggio rising for streak bonus
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + index * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.1 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + index * 0.1);
          osc.stop(ctx.currentTime + index * 0.1 + 0.2);
        });
      } else if (type === "gameover") {
        // Melancholic descending synth
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.8); // A2
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.9);
      }
    } catch (e) {
      console.warn("Audio Context is blocked or not supported yet:", e);
    }
  };

  // Fetch Questions from data.json on mount
  useEffect(() => {
    fetch("/data.json")
      .then((res) => {
        if (!res.ok) throw new Error("Асуулт уншихад алдаа гарлаа");
        return res.json();
      })
      .then((data) => {
        setOriginalQuestions(data);
        setQuestions(data);
        setGameState("lobby");
      })
      .catch((err) => {
        console.error(err);
        // Fallback static questions just in case fetching fails or for robustness
        const fallback: Question[] = [
          {
            id: 1,
            emojis: "🏴‍☠️🍖👒",
            answer: "One Piece",
            options: ["One Piece", "Naruto", "Bleach", "Dragon Ball"]
          },
          {
            id: 2,
            emojis: "🦊🍜🍥",
            answer: "Naruto",
            options: ["Naruto", "Attack on Titan", "My Hero Academia", "Fullmetal Alchemist"]
          },
          {
            id: 3,
            emojis: "🎴⚔️👹",
            answer: "Demon Slayer",
            options: ["Demon Slayer", "Jujutsu Kaisen", "Bleach", "Chainsaw Man"]
          }
        ];
        setOriginalQuestions(fallback);
        setQuestions(fallback);
        setGameState("lobby");
      });
  }, []);

  // Timer logic
  useEffect(() => {
    if (gameState !== "playing" || selectedOption !== null) return;

    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, gameState, selectedOption]);

  const handleTimeout = () => {
    playSound("buzz");
    setSelectedOption("TIMEOUT");
    setAnsweredState("incorrect");
    setLives((l) => {
      const nextLives = l - 1;
      if (nextLives <= 0) {
        setTimeout(() => {
          playSound("gameover");
          setGameState("gameover");
        }, 2000);
      }
      return nextLives;
    });
    setStreak(0);
  };

  const startGame = () => {
    const sourceQuestions = originalQuestions.length > 0 ? originalQuestions : questions;
    
    // Extract all unique answers to use as a pool for generating random wrong options
    const allAnswers: string[] = Array.from(new Set(sourceQuestions.map((q: Question) => q.answer)));

    // Shuffle questions, take exactly 15 questions, and dynamically generate 4 options (1 correct + 3 random incorrect from pool)
    const shuffled = shuffleArray<Question>(sourceQuestions).slice(0, 15).map((q: Question) => {
      const wrongPool = allAnswers.filter(ans => ans !== q.answer);
      const randomWrong = shuffleArray<string>(wrongPool).slice(0, 3);
      const dynamicOptions = shuffleArray<string>([q.answer, ...randomWrong]);
      return {
        ...q,
        options: dynamicOptions
      };
    });
    setQuestions(shuffled);

    // Reset stats
    setScore(0);
    setLives(3);
    setCurrentIndex(0);
    setTimeLeft(30);
    setStreak(0);
    setSelectedOption(null);
    setAnsweredState(null);
    setGameState("playing");
  };

  const handleAnswer = (option: string) => {
    if (selectedOption !== null || gameState !== "playing") return;

    setSelectedOption(option);
    const currentQuestion = questions[currentIndex];
    const isCorrect = option === currentQuestion.answer;

    if (isCorrect) {
      playSound("ding");
      setAnsweredState("correct");
      setScore((s) => s + 10);
      setStreak((st) => {
        const nextStreak = st + 1;
        if (nextStreak === 3) {
          // Bonus +30 for 3 in a row
          setTimeout(() => {
            playSound("bonus");
            setScore((s) => s + 30);
          }, 400);
          return 0; // reset streak after awarding bonus
        }
        return nextStreak;
      });

    } else {
      playSound("buzz");
      setAnsweredState("incorrect");
      setStreak(0);
      setLives((l) => {
        const nextLives = l - 1;
        if (nextLives <= 0) {
          setTimeout(() => {
            playSound("gameover");
            setGameState("gameover");
          }, 2000);
        }
        return nextLives;
      });
    }
  };

  const nextQuestion = () => {
    setSelectedOption(null);
    setAnsweredState(null);
    setTimeLeft(30);
    setCurrentIndex((prev) => prev + 1);
  };

  // Rendering Helper for game stats
  const renderHearts = () => {
    return Array.from({ length: 3 }).map((_, i) => (
      <motion.span
        key={i}
        initial={{ scale: 1 }}
        animate={{
          scale: i < lives ? [1, 1.2, 1] : 1,
          opacity: i < lives ? 1 : 0.2
        }}
        transition={{ duration: 0.3 }}
        className="text-rose-500"
      >
        <Heart size={20} fill={i < lives ? "currentColor" : "none"} />
      </motion.span>
    ));
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 text-white overflow-hidden shadow-2xl flex flex-col h-[85vh] max-h-[640px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <h2 className="text-sm font-bold uppercase tracking-wider font-mono">ANIME EMOJI GUESSER</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title={soundEnabled ? "Дуу хаах" : "Дуу нээх"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* LOADING STATE */}
        {gameState === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-3 bg-radial-gradient"
          >
            <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
            <p className="text-xs font-mono text-slate-400">Асуултуудыг бэлдэж байна...</p>
          </motion.div>
        )}

        {/* LOBBY STATE */}
        {gameState === "lobby" && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 animate-pulse">
              <Flame size={38} className="text-rose-500" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white font-sans">Anime Emoji Таавар!</h1>
            <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed font-sans">
              Анимег илэрхийлсэн эможинуудыг хараад зөв анимег таана уу. Сонгодог ба алдартай 15 асуултанд хариулна.
            </p>

            {/* Rules list */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 mt-6 text-left w-full max-w-sm flex flex-col gap-1.5 text-[11px] font-mono text-slate-300">
              <span className="text-xs font-bold text-rose-400 mb-1 block uppercase tracking-wider">Тоглоомын Дүрэм:</span>
              <div>• Асуулт тус бүр 4 сонголттой ба зөв хариулбал <span className="text-emerald-400 font-bold">+10 оноо</span>.</div>
              <div>• Асуулт бүрт <span className="text-amber-400 font-bold">30 секунд</span> өгөгдөнө.</div>
              <div>• Танд нийт <span className="text-rose-400 font-bold">3 амь (❤️)</span> байгаа бөгөөд дуусвал Game Over!</div>
              <div>• Дараалан 3 удаа зөв хариулбал <span className="text-sky-400 font-bold">Bonus +30 оноо</span>.</div>
              <div>• Нийт 15 асуултанд хамгийн өндөр оноо аваарай!</div>
            </div>

            <button
              onClick={startGame}
              className="mt-8 px-8 py-3 bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-950/40 cursor-pointer"
            >
              ТОГЛООМЫГ ЭХЛҮҮЛЭХ
            </button>
          </motion.div>
        )}

        {/* PLAYING STATE */}
        {gameState === "playing" && currentQuestion && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col p-4 sm:p-6"
          >
            {/* Top Info Bar */}
            <div className="flex items-center justify-between mb-4">
              {/* Hearts Lives */}
              <div className="flex items-center gap-1.5">
                {renderHearts()}
              </div>

              {/* Progress bar */}
              <div className="text-[11px] font-mono text-slate-400">
                Асуулт: <span className="text-white font-bold">{currentIndex + 1}</span> / 15
              </div>

              {/* Score */}
              <div className="flex items-center gap-1 text-amber-400 font-mono text-xs font-bold">
                <Trophy size={14} />
                <span>{score} PTS</span>
              </div>
            </div>

            {/* Streak Multiplier Banner */}
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="flex items-center gap-1 text-orange-400 font-mono text-[10px]">
                {streak > 0 && (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="flex items-center gap-1"
                  >
                    <Flame size={12} fill="currentColor" />
                    <span>STREAK: {streak}/3 ({streak === 2 ? "Дараагийнх bonus!" : "Зөв хариулж байна!"})</span>
                  </motion.div>
                )}
              </div>
              
              {/* Timer Pill */}
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-xs font-bold ${
                timeLeft <= 10 ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse" : "bg-slate-900 text-slate-300 border border-slate-800"
              }`}>
                <Timer size={13} />
                <span>{timeLeft}s</span>
              </div>
            </div>

            {/* Question Emojis Display / Reveal Screen */}
            <div className="flex-1 flex flex-col items-center justify-center my-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden overflow-y-auto">
              <div className="absolute inset-0 bg-radial-gradient opacity-10 pointer-events-none" />
              
              {selectedOption !== null ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full flex flex-col items-center gap-3 py-2"
                >
                  {answeredState === "correct" ? (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-mono font-bold animate-pulse">
                      🎉 ЗӨВ ХАРИУЛЛАА! (+10 PTS)
                    </span>
                  ) : (
                    <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full font-mono font-bold animate-shake">
                      {selectedOption === "TIMEOUT" ? "⌛ ХУГАЦАА ДУУССАН!" : "❌ БУРУУ ХАРИУЛЛАА!"}
                    </span>
                  )}

                  <div className="text-center">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">ЗӨВ ХАРИУЛТ:</span>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">{currentQuestion.answer}</h3>
                  </div>

                  {/* Anime Image */}
                  {currentQuestion.image && (
                    <motion.img
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      src={currentQuestion.image}
                      alt={currentQuestion.answer}
                      referrerPolicy="no-referrer"
                      className="w-full max-h-32 sm:max-h-36 object-cover rounded-xl border border-slate-800 shadow-md"
                    />
                  )}

                  {/* YouTube Iframe Embed */}
                  {currentQuestion.video && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="w-full aspect-video max-h-[140px] rounded-xl overflow-hidden border border-slate-800 shadow-lg"
                    >
                      <iframe
                        src={`${currentQuestion.video}?autoplay=1&modestbranding=1`}
                        title={`${currentQuestion.answer} Trailer`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </motion.div>
                  )}

                  {/* Continue Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (currentIndex + 1 >= 15 || currentIndex + 1 >= questions.length) {
                        setGameState("victory");
                      } else {
                        nextQuestion();
                      }
                    }}
                    className="mt-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-rose-950/40 cursor-pointer flex items-center gap-1"
                  >
                    <span>ҮРГҮЛЖЛҮҮЛЭХ</span>
                    <span>➔</span>
                  </motion.button>
                </motion.div>
              ) : (
                <>
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="text-5xl sm:text-6xl tracking-widest filter drop-shadow-[0_8px_8px_rgba(244,63,94,0.3)] select-none my-4"
                  >
                    {currentQuestion.emojis}
                  </motion.div>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-rose-400 mt-4">
                    Эдгээр эможи ямар анимег илэрхийлж байна вэ?
                  </div>
                </>
              )}
            </div>

            {/* Options grid with Hover Glow and Shake Action on Wrong Answer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 shrink-0">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOption === option;
                const isCorrectAnswer = option === currentQuestion.answer;
                
                let btnStyle = "bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-200";
                
                if (selectedOption !== null) {
                  if (isCorrectAnswer) {
                    btnStyle = "bg-emerald-600 border-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/50";
                  } else if (isSelected) {
                    btnStyle = "bg-red-600 border-red-500 text-white font-bold shadow-lg shadow-red-950/50";
                  } else {
                    btnStyle = "bg-slate-900 border-slate-900 opacity-30 text-slate-500";
                  }
                }

                return (
                  <motion.button
                    key={option}
                    disabled={selectedOption !== null}
                    onClick={() => handleAnswer(option)}
                    whileHover={{ scale: selectedOption === null ? 1.025 : 1, filter: selectedOption === null ? "brightness(1.15)" : "none" }}
                    animate={
                      isSelected && answeredState === "incorrect"
                        ? { x: [-8, 8, -6, 6, -3, 3, 0] }
                        : {}
                    }
                    transition={{ type: "spring", stiffness: 1000, damping: 15 }}
                    className={`p-3.5 rounded-xl border text-xs sm:text-sm font-sans text-left transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <span>{option}</span>
                    {selectedOption !== null && isCorrectAnswer && (
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">ЗӨВ</span>
                    )}
                    {selectedOption !== null && isSelected && !isCorrectAnswer && (
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">БУРУУ</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* GAMEOVER STATE */}
        {gameState === "gameover" && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-500 mb-4">
              <Heart size={32} />
            </div>
            <h2 className="text-xl font-bold font-mono tracking-tight text-red-500 uppercase">ТОГЛООМ ДУУСЛАА</h2>
            <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed font-sans">
              Таны бүх амь дууслаа. Дараагийн удаа илүү олон аниме үзээд оролдоорой!
            </p>

            <div className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-4 mt-6 flex flex-col items-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Авсан нийт оноо:</span>
              <span className="text-3xl font-black text-amber-400 mt-1">{score} PTS</span>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={startGame}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>ДАХИН ТОГЛОХ</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl font-bold text-xs uppercase text-slate-300 cursor-pointer"
              >
                ХААХ
              </button>
            </div>
          </motion.div>
        )}

        {/* VICTORY STATE */}
        {gameState === "victory" && (
          <motion.div
            key="victory"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-4">
              <Award size={32} />
            </div>
            <h2 className="text-xl font-bold font-mono tracking-tight text-emerald-400 uppercase">АВАРГА БОЛЛОО! 🏆</h2>
            <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed font-sans">
              Баяр хүргэе! Та бүх 15 асуултанд маш амжилттай хариулж, аниме таавар тоглоомыг бүрэн дуусгалаа!
            </p>

            <div className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-4 mt-6 flex flex-col items-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Таны эцсийн оноо:</span>
              <span className="text-3xl font-black text-amber-400 mt-1">{score} PTS</span>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={startGame}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>ДАХИН ТОГЛОХ</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl font-bold text-xs uppercase text-slate-300 cursor-pointer"
              >
                ХААХ
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
