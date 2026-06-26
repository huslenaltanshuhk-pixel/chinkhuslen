import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Car, Shield, Flame, Coins, Skull, Volume2, VolumeX, ShieldAlert, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'building' | 'block' | 'tree';
}

interface CashBag {
  id: number;
  x: number;
  y: number;
  amount: number;
}

interface PoliceCar {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  hp: number;
  sirenTick: number;
}

interface PlayerBullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

interface GameParticle {
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

interface FloatText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
}

interface GTAMiniGameProps {
  onClose: () => void;
}

export function GTAMiniGame({ onClose }: GTAMiniGameProps) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0); // Money collected
  const [highScore, setHighScore] = useState(() => {
    return Number(localStorage.getItem('gta_chase_highscore') || '0');
  });
  
  const [health, setHealth] = useState(100); // Armor / Car health
  const [wantedStars, setWantedStars] = useState(1); // 1 to 5 stars
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeSurvived, setTimeSurvived] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Engine audio node refs to dynamically adjust pitch in real-time
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);
  const sirenOscRef = useRef<OscillatorNode | null>(null);
  const sirenGainRef = useRef<GainNode | null>(null);

  // Keyboard controls state
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Game Arena configuration
  const arenaWidth = 1600;
  const arenaHeight = 1600;

  // Player car state inside ref for loop safety
  const playerRef = useRef({
    x: 800,
    y: 800,
    vx: 0,
    vy: 0,
    angle: 0,
    speed: 0,
    maxSpeed: 7,
    accel: 0.18,
    decel: 0.08,
    turnSpeed: 0.065,
    width: 38,
    height: 20
  });

  // Entity storage refs
  const obstaclesRef = useRef<Obstacle[]>([]);
  const cashBagsRef = useRef<CashBag[]>([]);
  const policeCarsRef = useRef<PoliceCar[]>([]);
  const bulletsRef = useRef<PlayerBullet[]>([]);
  const particlesRef = useRef<GameParticle[]>([]);
  const textsRef = useRef<FloatText[]>([]);

  // Keep state sync
  const stateRef = useRef(gameState);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  // Audio System init
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Start continuous engine noise
  const startEngineSound = () => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      stopEngineSound();

      // Create engine sound using low frequency triangle oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(45, ctx.currentTime);

      // Lowpass filter to make it sound muffled like a car interior
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 160;

      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();

      engineOscRef.current = osc;
      engineGainRef.current = gain;

      // Start police siren sound (always running background at 0 volume, fluctuates dynamically based on nearest cop)
      const sOsc = ctx.createOscillator();
      const sGain = ctx.createGain();
      sOsc.type = 'sawtooth';
      sOsc.frequency.setValueAtTime(600, ctx.currentTime);

      const sFilter = ctx.createBiquadFilter();
      sFilter.type = 'lowpass';
      sFilter.frequency.value = 800;

      sGain.gain.setValueAtTime(0, ctx.currentTime);

      sOsc.connect(sFilter);
      sFilter.connect(sGain);
      sGain.connect(ctx.destination);

      sOsc.start();

      sirenOscRef.current = sOsc;
      sirenGainRef.current = sGain;
    } catch (e) {
      console.warn('Engine audio initialization skipped:', e);
    }
  };

  const stopEngineSound = () => {
    try {
      if (engineOscRef.current) {
        engineOscRef.current.stop();
        engineOscRef.current.disconnect();
        engineOscRef.current = null;
      }
      if (engineGainRef.current) {
        engineGainRef.current.disconnect();
        engineGainRef.current = null;
      }
      if (sirenOscRef.current) {
        sirenOscRef.current.stop();
        sirenOscRef.current.disconnect();
        sirenOscRef.current = null;
      }
      if (sirenGainRef.current) {
        sirenGainRef.current.disconnect();
        sirenGainRef.current = null;
      }
    } catch (e) {
      // Ignored
    }
  };

  // Play discrete sound effects
  const playSoundEffect = (type: 'shoot' | 'explosion' | 'cash' | 'crash' | 'siren_alert') => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'shoot') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'explosion') {
        // Deep explosion thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.5);

        // Lowpass rumble filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'cash') {
        // Double ding retro cashier sound
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(987.77, now); // B5
        osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6
        osc2.frequency.setValueAtTime(1975.53, now + 0.08); // B6

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
      } else if (type === 'crash') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.2);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'siren_alert') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.25);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn('Sound effect played before user interaction:', e);
    }
  };

  // Set up Map Obstacles & Static elements once
  const buildCityMap = () => {
    const list: Obstacle[] = [];

    // Let's place building blocks inside the 1600x1600 grid
    // Outside boundary blocks (walls)
    // Left boundary
    list.push({ x: 0, y: 0, w: 40, h: 1600, type: 'building' });
    // Right boundary
    list.push({ x: 1560, y: 0, w: 40, h: 1600, type: 'building' });
    // Top boundary
    list.push({ x: 0, y: 0, w: 1600, h: 40, type: 'building' });
    // Bottom boundary
    list.push({ x: 0, y: 1560, w: 1600, h: 40, type: 'building' });

    // Internal building blocks creating roads/streets layout
    // Grid Block 1 (Top Left)
    list.push({ x: 200, y: 200, w: 300, h: 250, type: 'building' });
    // Grid Block 2 (Top Right)
    list.push({ x: 1100, y: 200, w: 300, h: 250, type: 'building' });
    // Grid Block 3 (Middle Center Park/Block)
    list.push({ x: 650, y: 650, w: 300, h: 300, type: 'building' });
    // Grid Block 4 (Bottom Left)
    list.push({ x: 200, y: 1100, w: 300, h: 250, type: 'building' });
    // Grid Block 5 (Bottom Right)
    list.push({ x: 1100, y: 1100, w: 300, h: 250, type: 'building' });

    // Decorative concrete blocks / small pillars
    list.push({ x: 650, y: 300, w: 80, h: 80, type: 'block' });
    list.push({ x: 870, y: 300, w: 80, h: 80, type: 'block' });
    list.push({ x: 650, y: 1150, w: 80, h: 80, type: 'block' });
    list.push({ x: 870, y: 1150, w: 80, h: 80, type: 'block' });

    obstaclesRef.current = list;
  };

  // Spawn fresh cash bags around streets
  const spawnCash = (count = 8) => {
    const list: CashBag[] = [...cashBagsRef.current];
    const obs = obstaclesRef.current;

    while (list.length < count) {
      const rx = 100 + Math.random() * 1400;
      const ry = 100 + Math.random() * 1400;

      // Ensure not inside any building
      const collision = obs.some(o => 
        rx > o.x - 15 && rx < o.x + o.w + 15 && 
        ry > o.y - 15 && ry < o.y + o.h + 15
      );

      if (!collision) {
        list.push({
          id: Math.random(),
          x: rx,
          y: ry,
          amount: 250 + Math.floor(Math.random() * 6) * 50
        });
      }
    }
    cashBagsRef.current = list;
  };

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // Handle Shooting trigger on Spacebar
      if (e.key === ' ' && stateRef.current === 'playing') {
        e.preventDefault();
        firePlayerWeapon();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Fire car-mounted primary gun towards driving direction or cursor
  const firePlayerWeapon = () => {
    const p = playerRef.current;
    
    // Calculate barrel position at front of the car
    const bx = p.x + Math.cos(p.angle) * 22;
    const by = p.y + Math.sin(p.angle) * 22;

    // Bullet travels in direction of car angle
    const bSpeed = 12;
    const vx = Math.cos(p.angle) * bSpeed + p.vx * 0.4;
    const vy = Math.sin(p.angle) * bSpeed + p.vy * 0.4;

    bulletsRef.current.push({
      id: Math.random(),
      x: bx,
      y: by,
      vx,
      vy,
      age: 0
    });

    playSoundEffect('shoot');

    // Gunfire sparks
    for (let i = 0; i < 4; i++) {
      particlesRef.current.push({
        id: Math.random(),
        x: bx,
        y: by,
        vx: Math.cos(p.angle + (Math.random() - 0.5) * 0.4) * (5 + Math.random() * 3),
        vy: Math.sin(p.angle + (Math.random() - 0.5) * 0.4) * (5 + Math.random() * 3),
        color: '#ffbe3b',
        size: Math.random() * 2.5 + 1,
        age: 0,
        maxAge: 15
      });
    }
  };

  // Collision with static buildings
  const checkBuildingCollision = (x: number, y: number, r = 16) => {
    const obs = obstaclesRef.current;
    for (let o of obs) {
      if (
        x + r > o.x && x - r < o.x + o.w &&
        y + r > o.y && y - r < o.y + o.h
      ) {
        return o; // Returns building hit
      }
    }
    return null;
  };

  // Start the simulation / Reset state
  const startChaseGame = () => {
    setScore(0);
    setHealth(100);
    setWantedStars(1);
    setTimeSurvived(0);
    
    // Place player at center intersection
    playerRef.current = {
      x: 800,
      y: 530,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 0,
      maxSpeed: 7,
      accel: 0.18,
      decel: 0.08,
      turnSpeed: 0.065,
      width: 38,
      height: 20
    };

    obstaclesRef.current = [];
    cashBagsRef.current = [];
    policeCarsRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    textsRef.current = [];

    buildCityMap();
    spawnCash(10);
    setGameState('playing');
    startEngineSound();
    playSoundEffect('siren_alert');
  };

  // Game ticker for Time Survived
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setTimeSurvived((prev) => {
        const nextTime = prev + 1;
        // wanted star logic: increase stars over time
        if (nextTime === 15) { setWantedStars(2); playSoundEffect('siren_alert'); }
        if (nextTime === 35) { setWantedStars(3); playSoundEffect('siren_alert'); }
        if (nextTime === 65) { setWantedStars(4); playSoundEffect('siren_alert'); }
        if (nextTime === 105) { setWantedStars(5); playSoundEffect('siren_alert'); }
        return nextTime;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Handle game loop: Physics, controls & rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleResize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent?.getBoundingClientRect().width || 800;
      canvas.height = Math.max(parent?.getBoundingClientRect().height || 450, 360);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const mainGameLoop = () => {
      if (stateRef.current !== 'playing') {
        renderFrame();
        animId = requestAnimationFrame(mainGameLoop);
        return;
      }

      // 1. UPDATE PLAYER PHYSICS
      const p = playerRef.current;
      const keys = keysPressed.current;

      // Handle forward / backward acceleration
      if (keys['w'] || keys['arrowup']) {
        p.speed = Math.min(p.maxSpeed, p.speed + p.accel);
      } else if (keys['s'] || keys['arrowdown']) {
        p.speed = Math.max(-p.maxSpeed * 0.5, p.speed - p.accel * 0.8);
      } else {
        // Natural friction decay
        if (p.speed > 0) p.speed = Math.max(0, p.speed - p.decel);
        else if (p.speed < 0) p.speed = Math.min(0, p.speed + p.decel);
      }

      // Handle Left / Right Steering
      const activeSpeedRatio = Math.min(1, Math.abs(p.speed) / 2.5); // Can steer more when moving
      if (keys['a'] || keys['arrowleft']) {
        p.angle -= p.turnSpeed * activeSpeedRatio * (p.speed >= 0 ? 1 : -1);
      }
      if (keys['d'] || keys['arrowright']) {
        p.angle += p.turnSpeed * activeSpeedRatio * (p.speed >= 0 ? 1 : -1);
      }

      // Calculate directional vector velocity
      p.vx = Math.cos(p.angle) * p.speed;
      p.vy = Math.sin(p.angle) * p.speed;

      // Try moving player on X
      const nextX = p.x + p.vx;
      const nextY = p.y + p.vy;

      // Check boundary walls and buildings on separate axes to allow sliding along walls!
      if (!checkBuildingCollision(nextX, p.y, 14)) {
        p.x = nextX;
      } else {
        // Impact decel
        p.speed *= -0.3;
        if (Math.abs(p.speed) > 1.5) playSoundEffect('crash');
      }

      if (!checkBuildingCollision(p.x, nextY, 14)) {
        p.y = nextY;
      } else {
        p.speed *= -0.3;
        if (Math.abs(p.speed) > 1.5) playSoundEffect('crash');
      }

      // Clamp player inside absolute arena limits
      p.x = Math.max(50, Math.min(arenaWidth - 50, p.x));
      p.y = Math.max(50, Math.min(arenaHeight - 50, p.y));

      // Update Engine Synthesizer Pitch on-the-fly
      if (soundEnabled && engineOscRef.current) {
        const speedFactor = Math.abs(p.speed) / p.maxSpeed;
        const pitch = 45 + speedFactor * 55; // Pitch ranges between 45Hz and 100Hz
        engineOscRef.current.frequency.setValueAtTime(pitch, audioCtxRef.current!.currentTime);
      }

      // 2. POLICE CARS BEHAVIOR
      // Wanted-based dynamic spawning limits
      const maxCops = wantedStars * 2;
      if (policeCarsRef.current.length < maxCops && Math.random() < 0.04) {
        // Spawn police car out-of-screen but within arena
        let px = p.x + (Math.random() > 0.5 ? 400 : -400) + (Math.random() - 0.5) * 200;
        let py = p.y + (Math.random() > 0.5 ? 300 : -300) + (Math.random() - 0.5) * 200;

        // Clip spawn
        px = Math.max(60, Math.min(arenaWidth - 60, px));
        py = Math.max(60, Math.min(arenaHeight - 60, py));

        if (!checkBuildingCollision(px, py, 20)) {
          policeCarsRef.current.push({
            id: Math.random(),
            x: px,
            y: py,
            vx: 0,
            vy: 0,
            angle: Math.random() * Math.PI * 2,
            speed: 3 + wantedStars * 0.4,
            hp: 2,
            sirenTick: 0
          });
        }
      }

      // Move police cars towards player
      let nearestCopDist = 9999;
      policeCarsRef.current.forEach((cop) => {
        cop.sirenTick++;
        const dx = p.x - cop.x;
        const dy = p.y - cop.y;
        const dist = Math.hypot(dx, dy);
        nearestCopDist = Math.min(nearestCopDist, dist);

        // Simple steering towards player
        const targetAngle = Math.atan2(dy, dx);
        
        // Interpolate angle
        let diff = targetAngle - cop.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        cop.angle += diff * 0.04;

        // Drive forward
        cop.vx = Math.cos(cop.angle) * cop.speed;
        cop.vy = Math.sin(cop.angle) * cop.speed;

        const nextCopX = cop.x + cop.vx;
        const nextCopY = cop.y + cop.vy;

        // Check environment collisions for cops
        if (!checkBuildingCollision(nextCopX, cop.y, 16)) {
          cop.x = nextCopX;
        } else {
          cop.angle += Math.PI * 0.5; // Turn around on hit
        }

        if (!checkBuildingCollision(cop.x, nextCopY, 16)) {
          cop.y = nextCopY;
        } else {
          cop.angle += Math.PI * 0.5;
        }

        // Check ramming player car
        if (dist < 26) {
          // Ram hit! Push back slightly & subtract player HP
          const pushX = Math.cos(cop.angle) * 3;
          const pushY = Math.sin(cop.angle) * 3;
          p.x += pushX;
          p.y += pushY;
          p.speed *= 0.5;

          setHealth((h) => {
            const nextH = Math.max(0, h - (5 + wantedStars * 2));
            if (nextH <= 0) {
              setGameState('gameover');
              stopEngineSound();
              playSoundEffect('explosion');
            }
            return nextH;
          });

          // Crash FX sparks
          playSoundEffect('crash');
          textsRef.current.push({
            id: Math.random(),
            x: p.x,
            y: p.y - 12,
            text: `COLLISION! -${5 + wantedStars * 2} HP`,
            color: '#ef4444',
            age: 0
          });

          for (let i = 0; i < 12; i++) {
            particlesRef.current.push({
              id: Math.random(),
              x: (p.x + cop.x) / 2,
              y: (p.y + cop.y) / 2,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              color: '#ef4444',
              size: Math.random() * 2.5 + 1.2,
              age: 0,
              maxAge: 35
            });
          }

          // Damage cop too on impact
          cop.hp -= 1;
        }
      });

      // Filter destroyed cop cars
      policeCarsRef.current.forEach((cop) => {
        if (cop.hp <= 0) {
          // Explosion effect
          playSoundEffect('explosion');
          setScore((s) => s + 500); // Bounty reward

          textsRef.current.push({
            id: Math.random(),
            x: cop.x,
            y: cop.y - 15,
            text: 'COP DESTROYED! +$500',
            color: '#10b981',
            age: 0
          });

          // Smoke particles
          for (let i = 0; i < 25; i++) {
            particlesRef.current.push({
              id: Math.random(),
              x: cop.x,
              y: cop.y,
              vx: (Math.random() - 0.5) * 7,
              vy: (Math.random() - 0.5) * 7,
              color: Math.random() > 0.4 ? '#4b5563' : '#e8702a',
              size: Math.random() * 4 + 1.5,
              age: 0,
              maxAge: 55
            });
          }
        }
      });
      policeCarsRef.current = policeCarsRef.current.filter((cop) => cop.hp > 0);

      // Adjust Siren Audio Gain based on distance to nearest cop
      if (soundEnabled && sirenGainRef.current && sirenOscRef.current) {
        if (policeCarsRef.current.length > 0 && nearestCopDist < 600) {
          const intensity = Math.max(0, 1 - nearestCopDist / 600) * 0.12;
          sirenGainRef.current.gain.setValueAtTime(intensity, audioCtxRef.current!.currentTime);
          
          // Modulate pitch wail
          const wail = 700 + Math.sin(Date.now() / 120) * 250;
          sirenOscRef.current.frequency.setValueAtTime(wail, audioCtxRef.current!.currentTime);
        } else {
          sirenGainRef.current.gain.setValueAtTime(0, audioCtxRef.current!.currentTime);
        }
      }

      // 3. BULLETS TRAJECTORY & COLLISION WITH COPS/BUILDINGS
      bulletsRef.current.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.age++;

        // Hit building check
        if (checkBuildingCollision(b.x, b.y, 4)) {
          b.age = 9999; // Expire bullet
          // Tiny impact dust
          for (let i = 0; i < 3; i++) {
            particlesRef.current.push({
              id: Math.random(),
              x: b.x,
              y: b.y,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              color: '#9ca3af',
              size: Math.random() * 1.5 + 0.5,
              age: 0,
              maxAge: 12
            });
          }
        }

        // Hit Cop check
        policeCarsRef.current.forEach((cop) => {
          if (Math.hypot(cop.x - b.x, cop.y - b.y) < 22) {
            b.age = 9999; // Expire
            cop.hp -= 1; // Bullet damage
            
            // Blood/Metal splash FX
            for (let i = 0; i < 8; i++) {
              particlesRef.current.push({
                id: Math.random(),
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                color: '#e8702a',
                size: Math.random() * 2 + 1,
                age: 0,
                maxAge: 20
              });
            }
          }
        });
      });
      // Filter out bullets
      bulletsRef.current = bulletsRef.current.filter((b) => b.age < 80);

      // 4. CASH COLLECTION LOGIC
      cashBagsRef.current.forEach((bag) => {
        const dist = Math.hypot(p.x - bag.x, p.y - bag.y);
        if (dist < 26) {
          // Collected!
          playSoundEffect('cash');
          setScore((s) => s + bag.amount);
          
          // Spawn green text
          textsRef.current.push({
            id: Math.random(),
            x: bag.x,
            y: bag.y - 15,
            text: `+$${bag.amount}`,
            color: '#10b981',
            age: 0
          });

          // Green sparkle FX
          for (let i = 0; i < 10; i++) {
            particlesRef.current.push({
              id: Math.random(),
              x: bag.x,
              y: bag.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              color: '#10b981',
              size: Math.random() * 2.5 + 1,
              age: 0,
              maxAge: 30
            });
          }

          // Flag for removal
          (bag as any).collected = true;
        }
      });
      cashBagsRef.current = cashBagsRef.current.filter((b: any) => !b.collected);

      // Respawn cash if low
      if (cashBagsRef.current.length < 5) {
        spawnCash(12);
      }

      // 5. OTHER FX ENGINE DECAY
      particlesRef.current.forEach((prt) => {
        prt.x += prt.vx;
        prt.y += prt.vy;
        prt.age++;
      });
      particlesRef.current = particlesRef.current.filter((prt) => prt.age < prt.maxAge);

      textsRef.current.forEach((t) => t.age++);
      textsRef.current = textsRef.current.filter((t) => t.age < 50);

      // RENDER CANVAS Frame
      renderFrame();

      animId = requestAnimationFrame(mainGameLoop);
    };

    const renderFrame = () => {
      const w = canvas.width;
      const h = canvas.height;
      const p = playerRef.current;

      // Camera centering mechanics with boundaries lock
      const cx = Math.max(0, Math.min(arenaWidth - w, p.x - w / 2));
      const cy = Math.max(0, Math.min(arenaHeight - h, p.y - h / 2));

      // 3D Perspective Projection helper
      const project = (worldX: number, worldY: number, z: number) => {
        const screenX = worldX - cx;
        const screenY = worldY - cy;
        const centerX = w / 2;
        const centerY = h / 2;
        const dx = screenX - centerX;
        const dy = screenY - centerY;
        // z represents height. As z increases, elements lean outwards from center to create pseudo-3D perspective.
        const perspective = 0.0012;
        return {
          x: screenX + dx * z * perspective,
          y: screenY + dy * z * perspective
        };
      };

      const getCarCorners = (carX: number, carY: number, carAngle: number, carW: number, carH: number) => {
        const cos = Math.cos(carAngle);
        const sin = Math.sin(carAngle);
        const halfL = carW / 2;
        const halfW = carH / 2;
        
        const localCorners = [
          { x: -halfL, y: -halfW }, // Back-left
          { x: halfL, y: -halfW },  // Front-left
          { x: halfL, y: halfW },   // Front-right
          { x: -halfL, y: halfW }   // Back-right
        ];
        
        return localCorners.map(c => ({
          x: carX + (c.x * cos - c.y * sin),
          y: carY + (c.x * sin + c.y * cos)
        }));
      };

      const drawWall = (p1_base: {x:number, y:number}, p2_base: {x:number, y:number}, p2_roof: {x:number, y:number}, p1_roof: {x:number, y:number}, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p1_base.x, p1_base.y);
        ctx.lineTo(p2_base.x, p2_base.y);
        ctx.lineTo(p2_roof.x, p2_roof.y);
        ctx.lineTo(p1_roof.x, p1_roof.y);
        ctx.closePath();
        ctx.fill();
      };

      const interpolate = (p1: {x: number, y: number}, p2: {x: number, y: number}, t: number) => {
        return {
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t
        };
      };

      const adjustBrightness = (hex: string, percent: number) => {
        let num = parseInt(hex.replace("#",""), 16);
        let amt = Math.round(2.55 * percent);
        let R = (num >> 16) + amt;
        let G = (num >> 8 & 0x00FF) + amt;
        let B = (num & 0x0000FF) + amt;
        R = R < 0 ? 0 : R > 255 ? 255 : R;
        G = G < 0 ? 0 : G > 255 ? 255 : G;
        B = B < 0 ? 0 : B > 255 ? 255 : B;
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
      };

      const draw3DCar = (carX: number, carY: number, carAngle: number, carW: number, carH: number, colorMain: string, colorRoof: string, isPlayer: boolean, copSirenTick?: number) => {
        const baseCorners = getCarCorners(carX, carY, carAngle, carW, carH);
        
        // Project base (Z = 0) and roof (Z = 12)
        const baseProj = baseCorners.map(c => project(c.x, c.y, 0));
        const roofProj = baseCorners.map(c => project(c.x, c.y, 12));
        
        // 1. Draw Wheels on the ground (Z = 0)
        ctx.fillStyle = '#111827';
        baseCorners.forEach((c) => {
          const proj = project(c.x, c.y, 0);
          ctx.save();
          ctx.translate(proj.x, proj.y);
          ctx.rotate(carAngle);
          ctx.fillRect(-5, -2, 10, 4);
          ctx.restore();
        });
        
        // 2. Draw 3D side walls of the car body
        // Back Wall (Corner 0 -> Corner 3)
        drawWall(baseProj[0], baseProj[3], roofProj[3], roofProj[0], '#0b0f19');
        // Left Wall (Corner 3 -> Corner 2)
        drawWall(baseProj[3], baseProj[2], roofProj[2], roofProj[3], adjustBrightness(colorMain, -30));
        // Front Wall (Corner 2 -> Corner 1)
        drawWall(baseProj[2], baseProj[1], roofProj[1], roofProj[2], adjustBrightness(colorMain, 15));
        // Right Wall (Corner 1 -> Corner 0)
        drawWall(baseProj[1], baseProj[0], roofProj[0], roofProj[1], adjustBrightness(colorMain, -15));
        
        // 3. Draw Roof
        ctx.fillStyle = colorRoof;
        ctx.beginPath();
        ctx.moveTo(roofProj[0].x, roofProj[0].y);
        for(let i = 1; i < 4; i++) ctx.lineTo(roofProj[i].x, roofProj[i].y);
        ctx.closePath();
        ctx.fill();
        
        // Glass windshield on the roof (front part)
        ctx.fillStyle = '#1e293b';
        const w1 = interpolate(roofProj[1], roofProj[0], 0.35);
        const w2 = interpolate(roofProj[2], roofProj[3], 0.35);
        ctx.beginPath();
        ctx.moveTo(roofProj[1].x, roofProj[1].y);
        ctx.lineTo(roofProj[2].x, roofProj[2].y);
        ctx.lineTo(w2.x, w2.y);
        ctx.lineTo(w1.x, w1.y);
        ctx.closePath();
        ctx.fill();
        
        // Back window on the roof
        const bg1 = interpolate(roofProj[0], roofProj[1], 0.25);
        const bg2 = interpolate(roofProj[3], roofProj[2], 0.25);
        ctx.beginPath();
        ctx.moveTo(roofProj[0].x, roofProj[0].y);
        ctx.lineTo(roofProj[3].x, roofProj[3].y);
        ctx.lineTo(bg2.x, bg2.y);
        ctx.lineTo(bg1.x, bg1.y);
        ctx.closePath();
        ctx.fill();
        
        // Brake Lights (back corners)
        const isBraking = isPlayer && (keysPressed.current['s'] || keysPressed.current['arrowdown']);
        ctx.fillStyle = isBraking ? '#ef4444' : '#b91c1c';
        ctx.beginPath();
        ctx.arc(roofProj[0].x, roofProj[0].y, 2.2, 0, Math.PI * 2);
        ctx.arc(roofProj[3].x, roofProj[3].y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Headlights (front corners)
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(roofProj[1].x, roofProj[1].y, 2.2, 0, Math.PI * 2);
        ctx.arc(roofProj[2].x, roofProj[2].y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Sirens for police car
        if (copSirenTick !== undefined) {
          const isRed = Math.floor(copSirenTick / 4) % 2 === 0;
          const sirenColor = isRed ? '#ef4444' : '#3b82f6';
          
          const rCenter = {
            x: (roofProj[0].x + roofProj[1].x + roofProj[2].x + roofProj[3].x) / 4,
            y: (roofProj[0].y + roofProj[1].y + roofProj[2].y + roofProj[3].y) / 4
          };
          
          const sirenProj = project(carX, carY, 17);
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(rCenter.x, rCenter.y);
          ctx.lineTo(sirenProj.x, sirenProj.y);
          ctx.stroke();
          
          ctx.fillStyle = sirenColor;
          ctx.beginPath();
          ctx.arc(sirenProj.x, sirenProj.y, 4, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.save();
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = sirenColor;
          ctx.beginPath();
          ctx.arc(sirenProj.x, sirenProj.y, 25, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      };

      ctx.clearRect(0, 0, w, h);

      // DRAW ARENA BACKGROUND
      ctx.fillStyle = '#141923'; // Dark asphalt road canvas
      ctx.fillRect(0, 0, w, h);

      // Draw road boundary outlines within view (Projected flat at Z=0)
      ctx.strokeStyle = '#263147';
      ctx.lineWidth = 1.5;
      const arenaTopLeft = project(0, 0, 0);
      const arenaBottomRight = project(arenaWidth, arenaHeight, 0);
      ctx.strokeRect(arenaTopLeft.x, arenaTopLeft.y, arenaBottomRight.x - arenaTopLeft.x, arenaBottomRight.y - arenaTopLeft.y);

      // Draw dashed yellow street lines inside the map (Projected at Z=0)
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([15, 15]);

      // Vertical road lanes
      for (let rx of [500, 1000]) {
        const laneTop = project(rx, 40, 0);
        const laneBottom = project(rx, arenaHeight - 40, 0);
        ctx.beginPath();
        ctx.moveTo(laneTop.x, laneTop.y);
        ctx.lineTo(laneBottom.x, laneBottom.y);
        ctx.stroke();
      }
      // Horizontal road lanes
      for (let ry of [500, 1000]) {
        const laneLeft = project(40, ry, 0);
        const laneRight = project(arenaWidth - 40, ry, 0);
        ctx.beginPath();
        ctx.moveTo(laneLeft.x, laneLeft.y);
        ctx.lineTo(laneRight.x, laneRight.y);
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset dash

      // DRAW OBSTACLES (3D Buildings & Blocks)
      obstaclesRef.current.forEach((o) => {
        // Only draw if within expanded viewport view to handle 3D leaning
        if (
          o.x + o.w > cx - 150 && o.x < cx + w + 150 &&
          o.y + o.h > cy - 150 && o.y < cy + h + 150
        ) {
          const H = o.type === 'building' ? 110 : 35;
          
          // Project base (Z=0) and roof (Z=H) corners
          const b1 = project(o.x, o.y, 0);
          const b2 = project(o.x + o.w, o.y, 0);
          const b3 = project(o.x + o.w, o.y + o.h, 0);
          const b4 = project(o.x, o.y + o.h, 0);
          
          const r1 = project(o.x, o.y, H);
          const r2 = project(o.x + o.w, o.y, H);
          const r3 = project(o.x + o.w, o.y + o.h, H);
          const r4 = project(o.x, o.y + o.h, H);
          
          // Draw sides (walls) with different shades to simulate 3D depth and sun shadow
          // North Wall
          drawWall(b1, b2, r2, r1, '#1e293b');
          // East Wall
          drawWall(b2, b3, r3, r2, '#0f172a');
          // South Wall
          drawWall(b3, b4, r4, r3, '#020617');
          // West Wall
          drawWall(b4, b1, r1, r4, '#1e293b');
          
          // Draw Roof
          ctx.fillStyle = o.type === 'building' ? '#334155' : '#475569';
          ctx.beginPath();
          ctx.moveTo(r1.x, r1.y);
          ctx.lineTo(r2.x, r2.y);
          ctx.lineTo(r3.x, r3.y);
          ctx.lineTo(r4.x, r4.y);
          ctx.closePath();
          ctx.fill();
          
          // Highlight roof border
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(r1.x, r1.y);
          ctx.lineTo(r2.x, r2.y);
          ctx.lineTo(r3.x, r3.y);
          ctx.lineTo(r4.x, r4.y);
          ctx.closePath();
          ctx.stroke();
          
          // Roof details (Tech/Ventilation)
          if (o.type === 'building') {
            const vSize = Math.min(o.w, o.h) * 0.25;
            const vx = o.x + o.w / 2 - vSize / 2;
            const vy = o.y + o.h / 2 - vSize / 2;
            
            const vb1 = project(vx, vy, H);
            const vb2 = project(vx + vSize, vy, H);
            const vb3 = project(vx + vSize, vy + vSize, H);
            const vb4 = project(vx, vy + vSize, H);
            
            const vr1 = project(vx, vy, H + 12);
            const vr2 = project(vx + vSize, vy, H + 12);
            const vr3 = project(vx + vSize, vy + vSize, H + 12);
            const vr4 = project(vx, vy + vSize, H + 12);
            
            // Draw vent walls
            drawWall(vb1, vb2, vr2, vr1, '#0f172a');
            drawWall(vb2, vb3, vr3, vr2, '#020617');
            drawWall(vb3, vb4, vr4, vr3, '#0f172a');
            drawWall(vb4, vb1, vr1, vr4, '#020617');
            
            // Vent roof
            ctx.fillStyle = '#111827';
            ctx.beginPath();
            ctx.moveTo(vr1.x, vr1.y);
            ctx.lineTo(vr2.x, vr2.y);
            ctx.lineTo(vr3.x, vr3.y);
            ctx.lineTo(vr4.x, vr4.y);
            ctx.closePath();
            ctx.fill();
          }
        }
      });

      // DRAW CASH BAGS (Floating spinning 3D diamonds in Z-space)
      cashBagsRef.current.forEach((bag) => {
        const floatZ = 12 + Math.sin(Date.now() / 150 + bag.id) * 3;
        const groundProj = project(bag.x, bag.y, 0);
        const coreProj = project(bag.x, bag.y, floatZ);
        
        // Draw real ground shadow
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(groundProj.x, groundProj.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw 3D gemstone emerald
        ctx.save();
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        
        const angle = (Date.now() / 400) % (Math.PI * 2);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1;
        
        const r = 7;
        const d1 = { x: coreProj.x + Math.cos(angle) * r, y: coreProj.y + Math.sin(angle) * r };
        const d2 = { x: coreProj.x + Math.cos(angle + Math.PI/2) * r * 0.5, y: coreProj.y + Math.sin(angle + Math.PI/2) * r * 0.5 };
        const d3 = { x: coreProj.x + Math.cos(angle + Math.PI) * r, y: coreProj.y + Math.sin(angle + Math.PI) * r };
        const d4 = { x: coreProj.x + Math.cos(angle + Math.PI*1.5) * r * 0.5, y: coreProj.y + Math.sin(angle + Math.PI*1.5) * r * 0.5 };
        
        const topPoint = project(bag.x, bag.y, floatZ + 8);
        const bottomPoint = project(bag.x, bag.y, floatZ - 8);
        
        const drawFace = (pt1: {x:number, y:number}, pt2: {x:number, y:number}, pt3: {x:number, y:number}, faceColor: string) => {
          ctx.fillStyle = faceColor;
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.lineTo(pt3.x, pt3.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        };
        
        drawFace(topPoint, d1, d2, '#059669');
        drawFace(topPoint, d2, d3, '#10b981');
        drawFace(topPoint, d3, d4, '#059669');
        drawFace(topPoint, d4, d1, '#10b981');
        
        drawFace(bottomPoint, d2, d1, '#047857');
        drawFace(bottomPoint, d3, d2, '#065f46');
        drawFace(bottomPoint, d4, d3, '#047857');
        drawFace(bottomPoint, d1, d4, '#065f46');
        
        ctx.restore();
      });

      // DRAW BULLETS (Fitted with a 3D flying height)
      ctx.fillStyle = '#ffbe3b';
      bulletsRef.current.forEach((b) => {
        const bulletProj = project(b.x, b.y, 9);
        ctx.beginPath();
        ctx.arc(bulletProj.x, bulletProj.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // DRAW POLICE CARS (Beautifully rendered in 3D)
      policeCarsRef.current.forEach((cop) => {
        draw3DCar(cop.x, cop.y, cop.angle, 36, 19, '#1e293b', '#ffffff', false, cop.sirenTick);
      });

      // DRAW PARTICLES (Falling nicely from 3D height to ground as they age)
      particlesRef.current.forEach((prt) => {
        const opacity = Math.max(0, 1 - prt.age / prt.maxAge);
        const particleZ = 12 * (1 - prt.age / prt.maxAge); // Falling effect
        const prtProj = project(prt.x, prt.y, particleZ);
        
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = prt.color;
        ctx.beginPath();
        ctx.arc(prtProj.x, prtProj.y, prt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // DRAW PLAYER CAR (Beautifully rendered in 3D)
      draw3DCar(p.x, p.y, p.angle, p.width, p.height, '#f59e0b', '#111827', true);

      // DRAW FLOATING TEXTS (Animated in floating 3D Z-space)
      textsRef.current.forEach((t) => {
        const opacity = Math.max(0, 1 - t.age / 50);
        const textZ = 20 + t.age * 0.7; // Rises into the air
        const textProj = project(t.x, t.y, textZ);
        
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = t.color;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, textProj.x, textProj.y);
        ctx.restore();
      });

      // RENDER MINIMAP RADAR (Bottom Left)
      drawMiniMap(ctx, w, h);
    };

    const drawMiniMap = (c: CanvasRenderingContext2D, screenW: number, screenH: number) => {
      // Small circular HUD radar in corner
      const radarSize = 90;
      const margin = 15;
      const rx = radarSize / 2 + margin;
      const ry = screenH - radarSize / 2 - margin;

      c.save();
      c.shadowBlur = 8;
      c.shadowColor = 'rgba(0,0,0,0.5)';

      // Radar backing
      c.fillStyle = 'rgba(17, 24, 39, 0.8)';
      c.beginPath();
      c.arc(rx, ry, radarSize / 2, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      c.lineWidth = 1.5;
      c.stroke();

      // Crosshairs in radar
      c.strokeStyle = 'rgba(255,255,255,0.06)';
      c.beginPath();
      c.moveTo(rx - radarSize / 2, ry); c.lineTo(rx + radarSize / 2, ry);
      c.moveTo(rx, ry - radarSize / 2); c.lineTo(rx, ry + radarSize / 2);
      c.stroke();

      // Radar pulse ring
      const pulse = (Date.now() / 15) % (radarSize / 2);
      c.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      c.beginPath();
      c.arc(rx, ry, pulse, 0, Math.PI * 2);
      c.stroke();

      // Plot entities inside radar relative to player car
      const p = playerRef.current;
      const scale = (radarSize / 2) / 600; // Map radius range of 600px

      // Draw cash drops as green dots
      c.fillStyle = '#10b981';
      cashBagsRef.current.forEach((bag) => {
        const dx = (bag.x - p.x) * scale;
        const dy = (bag.y - p.y) * scale;
        if (Math.hypot(dx, dy) < radarSize / 2 - 3) {
          c.beginPath();
          c.arc(rx + dx, ry + dy, 2.2, 0, Math.PI * 2);
          c.fill();
        }
      });

      // Draw cop cars as blinking red dots
      const blink = Math.floor(Date.now() / 150) % 2 === 0;
      c.fillStyle = blink ? '#ef4444' : '#3b82f6';
      policeCarsRef.current.forEach((cop) => {
        const dx = (cop.x - p.x) * scale;
        const dy = (cop.y - p.y) * scale;
        if (Math.hypot(dx, dy) < radarSize / 2 - 3) {
          c.beginPath();
          c.arc(rx + dx, ry + dy, 3, 0, Math.PI * 2);
          c.fill();
        }
      });

      // Draw player in center as small yellow arrow pointing in player's angle
      c.fillStyle = '#f59e0b';
      c.save();
      c.translate(rx, ry);
      c.rotate(p.angle);
      c.beginPath();
      c.moveTo(6, 0);
      c.lineTo(-4, -4);
      c.lineTo(-2, 0);
      c.lineTo(-4, 4);
      c.closePath();
      c.fill();
      c.restore();

      c.restore();
    };

    mainGameLoop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [gameState, wantedStars, soundEnabled]);

  // Update high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('gta_chase_highscore', score.toString());
    }
  }, [score, highScore]);

  return (
    <div className="flex flex-col gap-3 font-sans w-full max-w-2xl bg-black/95 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl relative select-none">
      
      {/* GTA upper panel */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Car className="text-yellow-500 animate-pulse" size={20} />
          <span className="font-bold tracking-wider text-xs sm:text-sm text-white uppercase font-mono">
            LOS SANTOS AUTOPRIME (GTA CHASE v1.2)
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
            onClick={() => {
              stopEngineSound();
              onClose();
            }}
            className="text-xs bg-white/10 hover:bg-white/20 text-white font-mono px-2.5 py-1 rounded-md transition-colors cursor-pointer"
          >
            ХААХ
          </button>
        </div>
      </div>

      {/* Main Canvas view */}
      <div className="relative overflow-hidden rounded-xl bg-[#090b0e] border border-white/5 h-[340px] sm:h-[380px] w-full flex items-center justify-center">
        {gameState === 'idle' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm text-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/40 flex items-center justify-center text-yellow-500">
                <Car size={36} className="animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide uppercase font-mono text-yellow-400">LOS SANTOS CHASE</h3>
                <p className="text-xs text-white/60 max-w-sm mt-1.5 leading-relaxed">
                  Чинхүслэнгийн бүтээсэн GTA-с сэдэвлэсэн 2D хөөцөлдөөнт тоглоом. Цагдаа нараас зугтаж, мөнгө цуглуулан амьд үлдээрэй!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full max-w-xs">
                <button
                  onClick={startChaseGame}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-yellow-500/25"
                >
                  <Play size={14} />
                  <span>ШУУД ТОГЛОХ</span>
                </button>
              </div>

              {highScore > 0 && (
                <div className="text-[10px] font-mono text-yellow-500 flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  <Coins size={11} />
                  <span>ХАМГИЙН ӨНДӨР ХЭМЖЭЭ: <strong>${highScore}</strong></span>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md text-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4 max-w-md"
            >
              <div className="text-red-500 font-mono text-4xl font-extrabold tracking-widest uppercase animate-pulse select-none">
                BUSTED!
              </div>
              <p className="text-xs text-white/50 -mt-1">Цагдаа нар таныг баривчиллаа эсвэл машин тань дэлбэрлээ.</p>

              {/* Stats table */}
              <div className="grid grid-cols-2 gap-2 w-full bg-white/5 p-3 rounded-xl border border-white/10 mt-1">
                <div className="text-center">
                  <span className="block text-[9px] uppercase tracking-wider font-mono text-white/40">Олсон Мөнгө</span>
                  <span className="text-base font-bold text-green-400 font-mono">${score}</span>
                </div>
                <div className="text-center border-l border-white/10">
                  <span className="block text-[9px] uppercase tracking-wider font-mono text-white/40">Амьд үлдсэн хугацаа</span>
                  <span className="text-base font-bold text-yellow-400 font-mono">{timeSurvived} секунд</span>
                </div>
              </div>

              <div className="flex gap-2 w-full mt-2">
                <button
                  onClick={startChaseGame}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>ДАХИН ОРОЛДОХ</span>
                </button>
                <button
                  onClick={() => {
                    stopEngineSound();
                    onClose();
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                >
                  ГАРАХ
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Real-time Game Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
        />

        {/* HUD wanted stars and surviving timer */}
        {gameState === 'playing' && (
          <div className="absolute top-3 right-3 pointer-events-none flex flex-col items-end gap-1.5 select-none z-10">
            {/* Wanted Level Stars indicator */}
            <div className="flex gap-0.5 bg-black/60 px-2.5 py-1 rounded-lg border border-white/10 items-center">
              <span className="text-[8px] font-mono font-bold text-white/60 mr-1.5">WANTED:</span>
              {[1, 2, 3, 4, 5].map((s) => (
                <ShieldAlert 
                  key={s} 
                  size={14} 
                  className={`${
                    s <= wantedStars 
                      ? 'text-yellow-500 fill-yellow-500 animate-pulse' 
                      : 'text-white/20'
                  }`} 
                />
              ))}
            </div>

            {/* Survivor Clock timer */}
            <div className="bg-black/60 px-2.5 py-1 rounded-lg border border-white/10 font-mono text-[10px] text-white/90">
              ХУГАЦАА: <span className="font-bold text-yellow-500">{timeSurvived}s</span>
            </div>
          </div>
        )}

        {/* HUD bottom left Radar instructions overlay indicator */}
        {gameState === 'playing' && (
          <div className="absolute bottom-2.5 left-28 pointer-events-none flex flex-col gap-0.5 select-none z-10 font-mono text-[8px] text-white/40 bg-black/40 px-2 py-1 rounded">
            <div>🟢 НОГООН: МӨНГӨ</div>
            <div>🔴 УЛААН/ХӨХ: ЦАГДАА</div>
          </div>
        )}
      </div>

      {/* Bottom Status dashboard (Health and Score) */}
      {gameState === 'playing' && (
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Health bar Armor */}
          <div className="col-span-6 bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-1.5 font-mono">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-white/40 uppercase flex items-center gap-1">
                <Shield size={11} className="text-blue-400" />
                ХУЯГТ / МАШИНЫ ЭРҮҮЛ МЭНД
              </span>
              <span className={`font-black ${health <= 35 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                {health}%
              </span>
            </div>
            {/* Health segment bar */}
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <div 
                className={`h-full transition-all duration-300 ${
                  health <= 35 
                    ? 'bg-red-500' 
                    : health <= 65 
                      ? 'bg-yellow-500' 
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>

          {/* Current Score / Cash collected */}
          <div className="col-span-6 bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-0.5 font-mono">
            <span className="text-[10px] text-white/40 uppercase flex items-center gap-1">
              <Coins size={11} className="text-green-400" />
              НИЙТ ОЛЗ / СҮҮЛИЙН БОУНТИ
            </span>
            <div className="text-2xl font-black text-green-400 tracking-wide">
              ${score}
            </div>
          </div>
        </div>
      )}

      {/* Control Instruction bar */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 text-[10px] sm:text-xs text-white/60 flex flex-col gap-1 leading-relaxed">
        <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
          <span className="text-yellow-500 font-bold">УДИРДЛАГА:</span>
          <span>• <strong>W, A, S, D эсвэл Сумнууд:</strong> Жолоодох</span>
          <span>• <strong>Spacebar (Зай авах):</strong> Буудах (Дайралтыг зогсоох)</span>
          <span>• <strong>Шижир мөнгөнүүдийг ($)</strong> цуглуулж оноогоо өсгөөрэй!</span>
        </div>
        <div className="text-[10px] text-white/30">
          * Санамж: Цагдаагийн машинуудыг буудаж устган урамшуулал авах боломжтой ба цаг явах тусам Цагдаа нарын Wanted зэрэг нэмэгдэнэ!
        </div>
      </div>

    </div>
  );
}
