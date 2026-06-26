import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Target, Zap, Crosshair, Award, ShieldAlert, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GameTarget {
  id: number;
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  type: 'normal' | 'fast' | 'headshot';
  hp: number;
  maxHp: number;
  spawnTime: number;
}

interface BulletDecal {
  id: number;
  x: number;
  y: number;
  age: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  age: number;
  maxAge: number;
}

interface CS2AimTrainerProps {
  onClose: () => void;
}

export function CS2AimTrainer({ onClose }: CS2AimTrainerProps) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return Number(localStorage.getItem('cs2_aim_highscore') || '0');
  });
  const [weapon, setWeapon] = useState<'AK47' | 'AWP' | 'Deagle'>('AK47');
  const [ammo, setAmmo] = useState(30);
  const [isReloading, setIsReloading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timer, setTimer] = useState(30);
  const [isScoped, setIsScoped] = useState(false);
  const [streak, setStreak] = useState(0);
  const [accuracy, setAccuracy] = useState({ shots: 0, hits: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Recoil offset for visual crosshair expansion
  const [recoilSpread, setRecoilSpread] = useState(0);
  
  // Refs for animation and game loops
  const targetsRef = useRef<GameTarget[]>([]);
  const decalsRef = useRef<BulletDecal[]>([]);
  const textsRef = useRef<FloatingText[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const stateRef = useRef(gameState);
  const timerRef = useRef(timer);
  const weaponRef = useRef(weapon);
  const ammoRef = useRef(ammo);
  const reloadRef = useRef(isReloading);
  const accuracyRef = useRef(accuracy);

  // Synchronize state references for callbacks inside loop
  useEffect(() => { stateRef.current = gameState; }, [gameState]);
  useEffect(() => { timerRef.current = timer; }, [timer]);
  useEffect(() => { weaponRef.current = weapon; }, [weapon]);
  useEffect(() => { ammoRef.current = ammo; }, [ammo]);
  useEffect(() => { reloadRef.current = isReloading; }, [isReloading]);
  useEffect(() => { accuracyRef.current = accuracy; }, [accuracy]);

  // Audio synthesis helper
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (type: 'shoot' | 'headshot' | 'hit' | 'reload' | 'empty' | 'gameover' | 'tick') => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'shoot') {
        // Synthesis of Gunshot
        const isAWP = weaponRef.current === 'AWP';
        const isDeagle = weaponRef.current === 'Deagle';
        
        // Gun noise
        const bufferSize = ctx.sampleRate * (isAWP ? 0.35 : isDeagle ? 0.22 : 0.15);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = isAWP ? 400 : isDeagle ? 600 : 800;
        filter.Q.value = 1.0;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + (isAWP ? 0.3 : isDeagle ? 0.18 : 0.12));

        // Low frequency thud
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(isAWP ? 80 : isDeagle ? 120 : 150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);

        noise.start(now);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'hit') {
        // High-pitched tactical feedback
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'headshot') {
        // Dual pitch ding for headshot feedback
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';
        
        osc1.frequency.setValueAtTime(1200, now);
        osc2.frequency.setValueAtTime(2400, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        
        osc1.stop(now + 0.15);
        osc2.stop(now + 0.15);
      } else if (type === 'reload') {
        // Magazine out & in double-click sound
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(450, now + 0.15);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.setValueAtTime(0, now + 0.08);
        gain.gain.setValueAtTime(0.1, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'empty') {
        // Click sound for dry fire
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, now);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'gameover') {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.5);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      }
    } catch (e) {
      console.warn('Audio synthesis is blocked/not supported:', e);
    }
  };

  // Switch weapons and adjust default attributes
  const selectWeapon = (w: 'AK47' | 'AWP' | 'Deagle') => {
    setWeapon(w);
    setIsScoped(false);
    if (w === 'AK47') setAmmo(30);
    else if (w === 'AWP') setAmmo(10);
    else setAmmo(7);
    setIsReloading(false);
    playSound('reload');
  };

  // Reload action
  const handleReload = () => {
    if (isReloading) return;
    const max = weapon === 'AK47' ? 30 : weapon === 'AWP' ? 10 : 7;
    if (ammo === max) return;

    setIsReloading(true);
    playSound('reload');

    setTimeout(() => {
      setAmmo(max);
      setIsReloading(false);
      setIsScoped(false);
    }, weapon === 'AWP' ? 1500 : weapon === 'AK47' ? 1000 : 800);
  };

  // Keyboard controls for weapons & reload
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.key === '1') selectWeapon('AK47');
      if (e.key === '2') selectWeapon('Deagle');
      if (e.key === '3') selectWeapon('AWP');
      if (e.key.toLowerCase() === 'r') handleReload();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, weapon, ammo, isReloading]);

  // Game Countdown loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setGameState('gameover');
          playSound('gameover');
          clearInterval(interval);
          return 0;
        }
        if (prev <= 6) {
          playSound('tick');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  // Update high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('cs2_aim_highscore', score.toString());
    }
  }, [score, highScore]);

  // Game loop: Update physics and draw onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const handleResize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = rect?.width || 800;
      canvas.height = Math.max(rect?.height || 450, 360);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Initial targets if empty and state is playing
    const spawnTarget = () => {
      if (!canvas) return;
      const typeRand = Math.random();
      let type: 'normal' | 'fast' | 'headshot' = 'normal';
      let r = 24;
      let hp = 1;
      let vx = (Math.random() - 0.5) * 2.5;
      let vy = (Math.random() - 0.5) * 1.5;

      if (typeRand > 0.8) {
        type = 'headshot'; // Headshot-only, smaller target
        r = 13;
        hp = 1;
        vx = (Math.random() - 0.5) * 1.8;
      } else if (typeRand > 0.5) {
        type = 'fast'; // Fast moving, medium size
        r = 18;
        hp = 1;
        vx = (Math.random() - 0.5) * 5.5;
        vy = (Math.random() - 0.5) * 3.0;
      }

      targetsRef.current.push({
        id: Math.random(),
        x: r + Math.random() * (canvas.width - r * 2),
        y: r + 50 + Math.random() * (canvas.height - r * 2 - 100),
        r,
        vx,
        vy,
        type,
        hp,
        maxHp: hp,
        spawnTime: Date.now()
      });
    };

    const updatePhysics = () => {
      if (stateRef.current !== 'playing') return;

      // Spawn target if count is low
      const targetThreshold = weaponRef.current === 'AWP' ? 2 : 3;
      if (targetsRef.current.length < targetThreshold) {
        spawnTarget();
      }

      // Update targets
      targetsRef.current.forEach((t) => {
        t.x += t.vx;
        t.y += t.vy;

        // Bounce check
        if (t.x - t.r < 0 || t.x + t.r > canvas.width) t.vx *= -1;
        if (t.y - t.r < 0 || t.y + t.r > canvas.height) t.vy *= -1;
      });

      // Filter dead / out-of-bounds targets or auto-expired fast ones
      const now = Date.now();
      targetsRef.current = targetsRef.current.filter((t) => {
        // Expire targets if they stay too long (e.g., 6 seconds max)
        return now - t.spawnTime < 6000;
      });

      // Update decals decay
      decalsRef.current.forEach((d) => d.age++);
      decalsRef.current = decalsRef.current.filter((d) => d.age < 180);

      // Update particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.age++;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.age < p.maxAge);

      // Update texts
      textsRef.current.forEach((t) => t.age++);
      textsRef.current = textsRef.current.filter((t) => t.age < 60);
    };

    const drawGridBackground = (w: number, h: number) => {
      // Sleek grid lines for training arena
      ctx.fillStyle = '#0e1117';
      ctx.fillRect(0, 0, w, h);

      // Horizontal and vertical grid wires
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Subtle light columns (CS2 Dust II simulation)
      ctx.strokeStyle = 'rgba(232, 112, 42, 0.05)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.25, 0); ctx.lineTo(w * 0.25, h);
      ctx.moveTo(w * 0.75, 0); ctx.lineTo(w * 0.75, h);
      ctx.stroke();
    };

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);
      drawGridBackground(w, h);

      if (stateRef.current === 'idle') {
        // Welcome screen logo/text inside canvas
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.font = 'bold 120px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CS2 AIM', w / 2, h / 2 - 20);
        return;
      }

      // Draw Decals (Bullet impacts)
      decalsRef.current.forEach((d) => {
        const opacity = Math.max(0, 1 - d.age / 180);
        
        // Inner hole
        ctx.fillStyle = `rgba(10, 10, 10, ${opacity})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Gun smoke/burn aura
        ctx.strokeStyle = `rgba(232, 112, 42, ${opacity * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw Targets
      targetsRef.current.forEach((t) => {
        const pulse = Math.sin(Date.now() / 150) * 2;
        const radius = t.r + pulse * 0.2;

        ctx.save();
        // Shadow glow
        ctx.shadowBlur = 15;
        if (t.type === 'headshot') {
          ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
          ctx.strokeStyle = '#ef4444';
          ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        } else if (t.type === 'fast') {
          ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
          ctx.strokeStyle = '#a855f7';
          ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
        } else {
          ctx.shadowColor = 'rgba(232, 112, 42, 0.6)';
          ctx.strokeStyle = '#e8702a';
          ctx.fillStyle = 'rgba(232, 112, 42, 0.15)';
        }

        // Draw tactical rings
        ctx.beginPath();
        ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner ring
        ctx.beginPath();
        ctx.arc(t.x, t.y, radius * 0.6, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Center solid core
        ctx.fillStyle = t.type === 'headshot' ? '#ef4444' : t.type === 'fast' ? '#a855f7' : '#e8702a';
        ctx.beginPath();
        ctx.arc(t.x, t.y, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // Cross decoration
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // horizontal line
        ctx.moveTo(t.x - radius, t.y);
        ctx.lineTo(t.x + radius, t.y);
        // vertical line
        ctx.moveTo(t.x, t.y - radius);
        ctx.lineTo(t.x, t.y + radius);
        ctx.stroke();

        // Draw HP indicator if it's headshot or strong
        ctx.restore();
      });

      // Draw Blood/Spark Particles
      particlesRef.current.forEach((p) => {
        const opacity = 1 - p.age / p.maxAge;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // Draw Floating Texts
      textsRef.current.forEach((ft) => {
        const opacity = 1 - ft.age / 60;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = opacity;
        ctx.fillText(ft.text, ft.x, ft.y - ft.age * 0.6);
        ctx.globalAlpha = 1.0;
      });
    };

    const loop = () => {
      updatePhysics();
      render();
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [gameState]);

  // Handle Aim Canvas Shooting Action
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (gameState !== 'playing') return;

    if (reloadRef.current) return; // Cant shoot while reloading

    if (ammoRef.current <= 0) {
      playSound('empty');
      return;
    }

    // Fire Gun
    setAmmo((prev) => prev - 1);
    playSound('shoot');

    // Accuracy increment
    setAccuracy((prev) => ({ ...prev, shots: prev.shots + 1 }));

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Simulate recoil spread slightly in coordinates
    const spreadRange = weapon === 'AK47' ? 12 : weapon === 'Deagle' ? 5 : 0;
    const finalX = clickX + (Math.random() - 0.5) * spreadRange;
    const finalY = clickY + (Math.random() - 0.5) * spreadRange;

    // Animate custom crosshair recoil expand
    setRecoilSpread((prev) => Math.min(20, prev + 8));

    // Spawn decal
    decalsRef.current.push({
      id: Math.random(),
      x: finalX,
      y: finalY,
      age: 0,
    });

    // Check hit intersections
    let hitSomething = false;
    targetsRef.current.forEach((t) => {
      const dist = Math.hypot(t.x - finalX, t.y - finalY);
      
      if (dist <= t.r + 3) {
        // HIT!
        hitSomething = true;
        const isHeadshot = dist < t.r * 0.45 || t.type === 'headshot';

        // Calculate score increment
        let pts = 100;
        let bonusText = '';
        let textColor = '#e8702a';

        if (isHeadshot) {
          pts = 250;
          bonusText = 'HEADSHOT! +250';
          textColor = '#ef4444';
          playSound('headshot');
        } else {
          playSound('hit');
          if (t.type === 'fast') {
            pts = 180;
            bonusText = 'FAST KILL! +180';
            textColor = '#a855f7';
          } else {
            bonusText = '+100';
          }
        }

        // Apply score
        setScore((prev) => prev + pts);
        setStreak((prev) => prev + 1);

        // Record accuracy hit
        setAccuracy((prev) => ({ ...prev, hits: prev.hits + 1 }));

        // Spawn splat particles
        for (let i = 0; i < 15; i++) {
          particlesRef.current.push({
            id: Math.random(),
            x: t.x,
            y: t.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            color: isHeadshot ? '#ef4444' : t.type === 'fast' ? '#a855f7' : '#e8702a',
            size: Math.random() * 3 + 1,
            age: 0,
            maxAge: 30 + Math.random() * 30,
          });
        }

        // Spawn Float Text
        textsRef.current.push({
          id: Math.random(),
          x: t.x,
          y: t.y - 15,
          text: bonusText,
          color: textColor,
          age: 0,
        });

        // Delete this target instantly
        targetsRef.current = targetsRef.current.filter((target) => target.id !== t.id);
      }
    });

    if (!hitSomething) {
      setStreak(0);
      // Spawn tiny wall sparks
      for (let i = 0; i < 5; i++) {
        particlesRef.current.push({
          id: Math.random(),
          x: finalX,
          y: finalY,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          color: 'rgba(255, 255, 255, 0.4)',
          size: Math.random() * 1.5 + 0.5,
          age: 0,
          maxAge: 20,
        });
      }
    }
  };

  // Recoil decay helper
  useEffect(() => {
    const decay = setInterval(() => {
      setRecoilSpread((prev) => Math.max(0, prev - 1.2));
    }, 30);
    return () => clearInterval(decay);
  }, []);

  // Scope right-click prevent and action
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    if (weapon === 'AWP') {
      setIsScoped((prev) => !prev);
      playSound('hit');
    }
  };

  // Start/Restart Game
  const startGame = () => {
    setScore(0);
    setTimer(30);
    setStreak(0);
    setAccuracy({ shots: 0, hits: 0 });
    targetsRef.current = [];
    decalsRef.current = [];
    textsRef.current = [];
    particlesRef.current = [];
    setGameState('playing');
    selectWeapon('AK47');
    initAudio();
  };

  const calculatedAccuracyRate = accuracy.shots > 0 
    ? Math.round((accuracy.hits / accuracy.shots) * 100) 
    : 0;

  return (
    <div className="flex flex-col gap-3 font-sans w-full max-w-2xl bg-black/90 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl relative select-none">
      {/* Upper Tactical HUD */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="text-[#e8702a] animate-pulse" size={20} />
          <span className="font-bold tracking-wider text-sm text-white uppercase font-mono">
            CS2 Aim Trainer v2.6
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-white/60 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
            title={soundEnabled ? "Дуу хаах" : "Дуу нээх"}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button 
            onClick={onClose}
            className="text-xs bg-white/10 hover:bg-white/20 text-white font-mono px-2.5 py-1 rounded-md transition-colors cursor-pointer"
          >
            ХААХ
          </button>
        </div>
      </div>

      {/* Main Game Stage */}
      <div className="relative overflow-hidden rounded-xl bg-[#090b0e] border border-white/5 h-[340px] sm:h-[380px] w-full flex items-center justify-center">
        {gameState === 'idle' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-[#e8702a]/10 border border-[#e8702a]/40 flex items-center justify-center text-[#e8702a]">
                <Target size={36} className="animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide uppercase font-mono">CS2 БЭЛТГЭЛИЙН ТАЛБАР</h3>
                <p className="text-xs text-white/60 max-w-sm mt-1.5 leading-relaxed">
                  Чинхүслэнгийн бүтээсэн интерактив Aim Trainer. Хурд, нарийвчлалаа шалгаж, хамгийн өндөр оноог аваарай!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full max-w-xs">
                <button
                  onClick={startGame}
                  className="flex-1 bg-[#e8702a] hover:bg-[#d2611f] text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-[#e8702a]/20"
                >
                  <Play size={14} />
                  <span>ЭХЛЭХ (30сек)</span>
                </button>
              </div>

              {highScore > 0 && (
                <div className="text-[10px] font-mono text-[#e8702a] flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  <Award size={11} />
                  <span>ХАМГИЙН ӨНДӨР ОНОО: <strong>{highScore} pts</strong></span>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm text-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3.5 max-w-md"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-400 uppercase tracking-wider font-mono">ЦАГ ДУУСЛАА!</h3>
                <p className="text-xs text-white/50 mt-1">Бэлтгэл амжилттай дууслаа.</p>
              </div>

              {/* Score Display Stats */}
              <div className="grid grid-cols-3 gap-2 w-full bg-white/5 p-3 rounded-xl border border-white/10 mt-1">
                <div className="text-center">
                  <span className="block text-[9px] uppercase tracking-wider font-mono text-white/40">Оноо</span>
                  <span className="text-sm font-bold text-white font-mono">{score}</span>
                </div>
                <div className="text-center border-x border-white/10">
                  <span className="block text-[9px] uppercase tracking-wider font-mono text-white/40">Нарийвчлал</span>
                  <span className="text-sm font-bold text-[#e8702a] font-mono">{calculatedAccuracyRate}%</span>
                </div>
                <div className="text-center">
                  <span className="block text-[9px] uppercase tracking-wider font-mono text-white/40">Буудсан</span>
                  <span className="text-sm font-bold text-white/90 font-mono">{accuracy.shots}</span>
                </div>
              </div>

              <div className="flex gap-2 w-full mt-2">
                <button
                  onClick={startGame}
                  className="flex-1 bg-[#e8702a] hover:bg-[#d2611f] text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>ДАХИН ТОГЛОХ</span>
                </button>
                <button
                  onClick={onClose}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                >
                  ГАРАХ
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Dynamic AWP Zoom Overlay */}
        {gameState === 'playing' && weapon === 'AWP' && isScoped && (
          <div className="absolute inset-0 pointer-events-none z-10 border-[3px] border-[#e8702a]/20 flex items-center justify-center bg-black/10">
            {/* Standard scope rings */}
            <div className="w-[180px] h-[180px] sm:w-[240px] sm:h-[240px] rounded-full border-[1.5px] border-black absolute flex items-center justify-center bg-transparent shadow-[0_0_0_2000px_rgba(0,0,0,0.65)]">
              {/* Target lines */}
              <div className="w-full h-[0.5px] bg-red-500/80 absolute" />
              <div className="h-full w-[0.5px] bg-red-500/80 absolute" />
              {/* Blur focus vignette */}
              <div className="absolute inset-0 rounded-full border border-red-500/30 animate-pulse" />
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/75 px-2.5 py-1 rounded text-[9px] font-mono text-red-400 font-bold tracking-widest uppercase">
              AWP ZOOM ACTIVE
            </div>
          </div>
        )}

        {/* Screen Recoil Shake */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasClick}
          onContextMenu={handleContextMenu}
          className="w-full h-full cursor-crosshair block active:scale-[0.99] transition-transform duration-75"
        />

        {/* Custom FPS Counter */}
        {gameState === 'playing' && (
          <div className="absolute top-2.5 left-3 pointer-events-none flex items-center gap-2 font-mono text-[9px] text-white/50 bg-black/40 px-2 py-1 rounded border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>FPS: 60</span>
            <span className="text-white/20">|</span>
            <span>PING: 14ms</span>
          </div>
        )}
      </div>

      {/* Bottom Interface HUD (Weapons, Ammo, HP) */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-12 gap-2.5 items-center">
          {/* HP and Armor */}
          <div className="col-span-3 bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-white font-mono">
            <div>
              <span className="block text-[8px] text-white/40 uppercase">Оноо</span>
              <span className="text-base font-black text-[#e8702a]">{score}</span>
            </div>
            <div className="text-right">
              <span className="block text-[8px] text-white/40 uppercase">Цаг</span>
              <span className={`text-base font-black ${timer <= 6 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                {timer}s
              </span>
            </div>
          </div>

          {/* Weapon select panel */}
          <div className="col-span-6 flex gap-1.5 bg-white/5 border border-white/10 p-1 rounded-xl">
            {(['AK47', 'Deagle', 'AWP'] as const).map((w) => (
              <button
                key={w}
                onClick={() => selectWeapon(w)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wide font-mono transition-all uppercase cursor-pointer ${
                  weapon === w
                    ? 'bg-[#e8702a] text-white shadow-md shadow-[#e8702a]/15'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {w === 'AK47' && 'AK-47'}
                {w === 'Deagle' && 'Deagle'}
                {w === 'AWP' && 'AWP'}
              </button>
            ))}
          </div>

          {/* Ammo Clip */}
          <div className="col-span-3 bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between font-mono text-white">
            <div className="flex flex-col">
              <span className="text-[8px] text-white/40 uppercase">Сум</span>
              <div className="flex items-baseline gap-0.5">
                <span className={`text-base font-black ${ammo <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {ammo}
                </span>
                <span className="text-[10px] text-white/30">
                  /{weapon === 'AK47' ? 30 : weapon === 'AWP' ? 10 : 7}
                </span>
              </div>
            </div>
            <button
              onClick={handleReload}
              disabled={isReloading}
              className={`text-[9px] font-bold px-2 py-1.5 rounded bg-white/10 hover:bg-white/20 text-[#e8702a] transition-all cursor-pointer ${
                isReloading ? 'opacity-50 cursor-not-allowed animate-pulse' : ''
              }`}
            >
              {isReloading ? 'RELOAD...' : 'R - ЦЭНЭГЛЭХ'}
            </button>
          </div>
        </div>
      )}

      {/* Mini Game Instructions Guide */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 text-[10px] sm:text-xs text-white/60 flex flex-col gap-1 leading-relaxed">
        <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
          <span className="text-[#e8702a] font-bold">Хэрхэн тоглох вэ?</span>
          <span>• <strong>Зүүн товч:</strong> Буудах</span>
          <span>• <strong>AWP Баруун товч:</strong> Дуран харах (Scope)</span>
          <span>• <strong>R товч:</strong> Цэнэглэх</span>
          <span>• <strong>1, 2, 3:</strong> Буу солих</span>
        </div>
        <div className="text-[10px] text-white/40">
          * Санамж: Чихэвчтэй тогловол зэвсэг буудах, бай устгах, "Headshot" зэрэг дууны эффектүүдийг сонсох боломжтой.
        </div>
      </div>
    </div>
  );
}
