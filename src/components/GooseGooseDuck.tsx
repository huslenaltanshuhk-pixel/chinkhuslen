import React, { useState, useEffect, useRef } from 'react';
import { X, Play, RefreshCw, AlertTriangle, Check, User, ShieldAlert, Zap, Radio, Database, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Player {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  isGoose: boolean; // true = Goose (Crew), false = Duck (Impostor)
  isAlive: boolean;
  hatType: 'none' | 'chef' | 'detective' | 'police' | 'beanie';
  targetX?: number;
  targetY?: number;
  speed: number;
  currentRoom: string;
  voteWeight: number;
}

interface Task {
  id: string;
  name: string;
  room: string;
  x: number;
  y: number;
  completed: boolean;
  type: 'wires' | 'upload' | 'keypad';
}

interface Vent {
  id: string;
  x: number;
  y: number;
  room: string;
  connectedTo: string; // ID of connected vent
}

interface DeadBody {
  id: string;
  x: number;
  y: number;
  color: string;
  name: string;
}

interface ChatMessage {
  sender: string;
  color: string;
  text: string;
}

export function GooseGooseDuck({ onClose }: { onClose: () => void }) {
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'meeting' | 'gameover'>('lobby');
  const [role, setRole] = useState<'goose' | 'duck'>('goose');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [winner, setWinner] = useState<'goose' | 'duck' | null>(null);
  const [killCooldown, setKillCooldown] = useState(0);
  
  // Meeting states
  const [reporter, setReporter] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [votes, setVotes] = useState<Record<string, string>>({}); // voters -> votedId
  const [votedOutName, setVotedOutName] = useState<string | null>(null);
  const [votedOutRole, setVotedOutRole] = useState<'goose' | 'duck' | null>(null);
  const [isTie, setIsTie] = useState(false);
  const [meetingPhase, setMeetingPhase] = useState<'discuss' | 'voting' | 'result'>('discuss');

  // Interactive Mini-game state variables
  // Wire task
  const [wireConnections, setWireConnections] = useState<Record<string, string>>({}); // leftColor -> rightColor
  const [selectedWire, setSelectedWire] = useState<string | null>(null);
  // Upload task
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  // Keypad task
  const [keypadCode, setKeypadCode] = useState('');
  const [keypadInput, setKeypadInput] = useState('');
  const [keypadStatus, setKeypadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Screen sizing
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Entities state persistent in ref for rendering loop
  const playersRef = useRef<Player[]>([]);
  const deadBodiesRef = useRef<DeadBody[]>([]);
  const keysPressed = useRef<Record<string, boolean>>({});
  const gameLoopId = useRef<number | null>(null);

  // Constants
  const mapWidth = 1000;
  const mapHeight = 1000;

  const rooms = [
    { name: 'Cafeteria (Цайны газар)', x: 500, y: 250, r: 160 },
    { name: 'Reactor (Реакторын өрөө)', x: 180, y: 500, r: 130 },
    { name: 'Storage (Агуулах)', x: 500, y: 780, r: 140 },
    { name: 'Navigation (Удирдлага)', x: 820, y: 500, r: 130 },
    { name: 'Vitals (Хяналтын өрөө)', x: 500, y: 500, r: 100 }
  ];

  const vents: Vent[] = [
    { id: 'vent1', x: 220, y: 450, room: 'Reactor', connectedTo: 'vent3' },
    { id: 'vent2', x: 480, y: 200, room: 'Cafeteria', connectedTo: 'vent4' },
    { id: 'vent3', x: 480, y: 720, room: 'Storage', connectedTo: 'vent1' },
    { id: 'vent4', x: 780, y: 450, room: 'Navigation', connectedTo: 'vent2' }
  ];

  const botNames = [
    'Чинхүслэн', 'Дональд', 'Даффи', 'Гүүси', 'Алтангэрэл', 'Содном', 'Болд', 'Сараа', 'Мишээл', 'Тэмүүлэн'
  ];

  const colors = [
    '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#64748b'
  ];

  const hats: Array<'none' | 'chef' | 'detective' | 'police' | 'beanie'> = [
    'none', 'chef', 'detective', 'police', 'beanie'
  ];

  // Initialize Game Session
  const initGame = (selectedRole: 'goose' | 'duck') => {
    // 1. Create players
    const userPlayer: Player = {
      id: 'player',
      name: 'Чинхүслэн (Та)',
      color: '#f59e0b', // Golden goose
      x: 500,
      y: 500,
      isGoose: selectedRole === 'goose',
      isAlive: true,
      hatType: 'detective',
      speed: 4,
      currentRoom: 'Vitals',
      voteWeight: 1
    };

    // Shuffle and pick bots
    const shuffledNames = [...botNames].sort(() => 0.5 - Math.random());
    const shuffledColors = [...colors].sort(() => 0.5 - Math.random());
    
    // Assign 1 AI Impostor if user is Goose, otherwise user is the Impostor and all others are Geese (maybe 1 more helper impostor)
    const totalPlayers = 7;
    const aiPlayers: Player[] = [];

    // Let's decide who the AI Impostor is if user is goose
    const impostorIndex = userPlayer.isGoose ? Math.floor(Math.random() * (totalPlayers - 1)) : -1;

    for (let i = 0; i < totalPlayers - 1; i++) {
      const isGoose = impostorIndex !== i;
      aiPlayers.push({
        id: `bot-${i}`,
        name: shuffledNames[i],
        color: shuffledColors[i],
        x: 300 + Math.random() * 400,
        y: 300 + Math.random() * 400,
        isGoose,
        isAlive: true,
        hatType: hats[Math.floor(Math.random() * hats.length)],
        speed: 2 + Math.random() * 1.5,
        currentRoom: 'Vitals',
        voteWeight: 1
      });
    }

    playersRef.current = [userPlayer, ...aiPlayers];
    deadBodiesRef.current = [];

    // 2. Generate Tasks
    const initialTasks: Task[] = [
      { id: 'task1', name: 'Утас холбох', room: 'Reactor', x: 180, y: 500, completed: false, type: 'wires' },
      { id: 'task2', name: 'Системд өгөгдөл татах', room: 'Cafeteria', x: 500, y: 250, completed: false, type: 'upload' },
      { id: 'task3', name: 'Удирдлагын ПИН код хийх', room: 'Navigation', x: 820, y: 500, completed: false, type: 'keypad' },
      { id: 'task4', name: 'Цахилгаан сэргээх', room: 'Storage', x: 500, y: 780, completed: false, type: 'wires' }
    ];
    setTasks(initialTasks);
    setGameState('playing');
    setWinner(null);
    setActiveTask(null);
    setKillCooldown(15);
  };

  // Input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Kill Cooldown Timer
  useEffect(() => {
    if (gameState === 'playing' && role === 'duck' && killCooldown > 0) {
      const interval = setInterval(() => {
        setKillCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, role, killCooldown]);

  // Main game loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
      return;
    }

    const tick = () => {
      updateEntities();
      drawGame();
      checkGameConditions();
      gameLoopId.current = requestAnimationFrame(tick);
    };

    gameLoopId.current = requestAnimationFrame(tick);
    return () => {
      if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
    };
  }, [gameState, tasks]);

  // Determine current room based on coordinates
  const getCurrentRoom = (x: number, y: number) => {
    for (const r of rooms) {
      const dx = x - r.x;
      const dy = y - r.y;
      if (dx * dx + dy * dy < r.r * r.r) {
        return r.name;
      }
    }
    return 'Hallway (Коридор)';
  };

  // Physics, player and AI movement
  const updateEntities = () => {
    const players = playersRef.current;
    const user = players.find((p) => p.id === 'player');
    
    if (!user || !user.isAlive) return;

    // 1. User Movement
    let dx = 0;
    let dy = 0;
    if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
    if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;

    if (dx !== 0 && dy !== 0) {
      // Normalize diagonal speed
      dx *= 0.7071;
      dy *= 0.7071;
    }

    let nextX = user.x + dx * user.speed;
    let nextY = user.y + dy * user.speed;

    // Bounds constraint
    nextX = Math.max(50, Math.min(mapWidth - 50, nextX));
    nextY = Math.max(50, Math.min(mapHeight - 50, nextY));

    // Collision check with solid map walls (simple circle constraints for rooms or borders)
    // Make sure user stays within overall map boundaries or doesn't exit rooms into the outer space void
    const distFromCenter = Math.hypot(nextX - 500, nextY - 500);
    if (distFromCenter < 470) {
      user.x = nextX;
      user.y = nextY;
      user.currentRoom = getCurrentRoom(user.x, user.y);
    }

    // 2. AI Bot Movement
    players.forEach((bot) => {
      if (bot.id === 'player' || !bot.isAlive) return;

      // Select new target if reached or randomly
      if (!bot.targetX || !bot.targetY || Math.hypot(bot.x - bot.targetX, bot.y - bot.targetY) < 15) {
        // AI targets a random room or wanders
        const targetRoom = rooms[Math.floor(Math.random() * rooms.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (targetRoom.r - 30);
        bot.targetX = targetRoom.x + Math.cos(angle) * dist;
        bot.targetY = targetRoom.y + Math.sin(angle) * dist;
      }

      // Move towards target
      const adx = bot.targetX - bot.x;
      const ady = bot.targetY - bot.y;
      const len = Math.hypot(adx, ady);
      if (len > 0) {
        bot.x += (adx / len) * bot.speed;
        bot.y += (ady / len) * bot.speed;
        bot.currentRoom = getCurrentRoom(bot.x, bot.y);
      }

      // 3. AI Impostor logic (Kill other Geese if alone)
      if (!bot.isGoose) {
        // This bot is an impostor! Find nearest alive goose
        const targets = players.filter((p) => p.isGoose && p.isAlive);
        let nearestTarget: Player | null = null;
        let minDist = 9999;
        
        targets.forEach((t) => {
          const d = Math.hypot(t.x - bot.x, t.y - bot.y);
          if (d < minDist) {
            minDist = d;
            nearestTarget = t;
          }
        });

        // If very close to a goose and not in public Cafeteria hallway, do a silent kill!
        if (nearestTarget && minDist < 35 && Math.random() < 0.005) {
          const victim: Player = nearestTarget;
          victim.isAlive = false;
          deadBodiesRef.current.push({
            id: `body-${victim.id}`,
            x: victim.x,
            y: victim.y,
            color: victim.color,
            name: victim.name
          });
          // Move impostor away quickly
          bot.targetX = bot.x + (Math.random() - 0.5) * 300;
          bot.targetY = bot.y + (Math.random() - 0.5) * 300;
        }
      }
    });

    // 4. Check if player auto-reports a dead body
    deadBodiesRef.current.forEach((body) => {
      const dist = Math.hypot(user.x - body.x, user.y - body.y);
      if (dist < 50) {
        // Trigger report automatically if nearby!
        triggerMeeting(body.name, 'Та цогцос оллоо!');
      }
    });

    // Check if AI reports a dead body
    players.forEach((bot) => {
      if (bot.id === 'player' || !bot.isAlive) return;
      deadBodiesRef.current.forEach((body) => {
        const dist = Math.hypot(bot.x - body.x, bot.y - body.y);
        if (dist < 45 && Math.random() < 0.1) {
          triggerMeeting(bot.name, `${bot.name} цогцос олж, мэдээллээ!`);
        }
      });
    });
  };

  // Check victory/loss conditions
  const checkGameConditions = () => {
    const players = playersRef.current;
    const geese = players.filter((p) => p.isGoose);
    const ducks = players.filter((p) => !p.isGoose);

    const aliveGeese = geese.filter((p) => p.isAlive).length;
    const aliveDucks = ducks.filter((p) => p.isAlive).length;

    // Ducks win if their number equals or exceeds alive geese
    if (aliveDucks >= aliveGeese) {
      setWinner('duck');
      setGameState('gameover');
    }
    // Geese win if all ducks are eliminated
    else if (aliveDucks === 0) {
      setWinner('goose');
      setGameState('gameover');
    }
    // Geese win if all tasks are completed
    else {
      const allTasksDone = tasks.length > 0 && tasks.every((t) => t.completed);
      if (allTasksDone) {
        setWinner('goose');
        setGameState('gameover');
      }
    }
  };

  // Report and Trigger Emergency Meeting
  const triggerMeeting = (victimName: string, messageHeadline: string) => {
    if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
    
    setReporter(messageHeadline);
    setGameState('meeting');
    setMeetingPhase('discuss');
    setVotes({});
    setVotedOutName(null);
    setVotedOutRole(null);
    setIsTie(false);

    // Build chat log simulating debate
    const livingBots = playersRef.current.filter((p) => p.isAlive && p.id !== 'player');
    const impostorBot = playersRef.current.find((p) => !p.isGoose && p.isAlive);
    const accused = livingBots[Math.floor(Math.random() * livingBots.length)];

    const discussions: ChatMessage[] = [
      { sender: 'Мэдэгдэл', color: '#10b981', text: `🚨 ЦОГЦОС ОЛДЛОО! Хохирогч: ${victimName}` },
    ];

    setTimeout(() => {
      if (livingBots.length > 0) {
        const firstSpeaker = livingBots[0];
        discussions.push({
          sender: firstSpeaker.name,
          color: firstSpeaker.color,
          text: `Би саяхан ${victimName}-ийг харсан юмсан. Маш сэжигтэй байна шүү.`
        });
        setChatMessages([...discussions]);
      }
    }, 1200);

    setTimeout(() => {
      if (livingBots.length > 1) {
        const secondSpeaker = livingBots[1];
        discussions.push({
          sender: secondSpeaker.name,
          color: secondSpeaker.color,
          text: accused ? `${accused.name} реакторын хажууд маш хурдан гүйж явсан. Түүнийг шалгах хэрэгтэй!` : 'Вэнт дотор сонин чимээ гарсан шүү.'
        });
        setChatMessages([...discussions]);
      }
    }, 2800);

    setTimeout(() => {
      if (accused && accused.isAlive) {
        discussions.push({
          sender: accused.name,
          color: accused.color,
          text: 'Би даалгавар хийж байсан! Намайг битгий гүтгэ. Надад даалгаврын баталгаа байгаа.'
        });
        setChatMessages([...discussions]);
      }
    }, 4500);

    setTimeout(() => {
      if (impostorBot && impostorBot.isAlive && impostorBot.id !== 'player') {
        discussions.push({
          sender: impostorBot.name,
          color: impostorBot.color,
          text: 'Би Удирдлагын өрөөнд дата татаж байсан. Өөр хүн сэжигтэй байна уу?'
        });
        setChatMessages([...discussions]);
      }
      setMeetingPhase('voting');
    }, 6000);

    setChatMessages(discussions);
  };

  // Submit vote logic
  const handleVote = (votedId: string | 'skip') => {
    const players = playersRef.current;
    const living = players.filter((p) => p.isAlive);
    
    const newVotes: Record<string, string> = { 'player': votedId };

    // Simulate AI Votes
    // Impostors vote randomly for innocent, innocents vote based on discussions or randomly
    const suspect = living.find((p) => p.id !== 'player' && Math.random() < 0.4);
    
    living.forEach((p) => {
      if (p.id === 'player') return;
      
      // AI Logic
      if (!p.isGoose) {
        // Impostor votes to framed innocent or skips
        const target = living.find((v) => v.isGoose && v.id !== p.id);
        newVotes[p.id] = target ? target.id : 'skip';
      } else {
        // Innocent Goose votes randomly or suspects someone
        if (suspect && Math.random() < 0.6) {
          newVotes[p.id] = suspect.id;
        } else {
          newVotes[p.id] = Math.random() < 0.3 ? 'skip' : living[Math.floor(Math.random() * living.length)].id;
        }
      }
    });

    setVotes(newVotes);
    setMeetingPhase('result');

    // Count votes
    const voteCounts: Record<string, number> = {};
    Object.values(newVotes).forEach((v) => {
      if (v !== 'skip') {
        voteCounts[v] = (voteCounts[v] || 0) + 1;
      }
    });

    let maxVotes = 0;
    let ejectedId: string | null = null;
    let tie = false;

    Object.entries(voteCounts).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        ejectedId = id;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
      }
    });

    const skipCount = Object.values(newVotes).filter((v) => v === 'skip').length;
    if (skipCount >= maxVotes) {
      ejectedId = null;
      tie = true;
    }

    if (ejectedId && !tie) {
      const ejectedPlayer = players.find((p) => p.id === ejectedId);
      if (ejectedPlayer) {
        ejectedPlayer.isAlive = false;
        setVotedOutName(ejectedPlayer.name);
        setVotedOutRole(ejectedPlayer.isGoose ? 'goose' : 'duck');
      }
    } else {
      setIsTie(true);
    }
  };

  // End meeting phase and resume game
  const resumeGame = () => {
    setGameState('playing');
    setActiveTask(null);
  };

  // Render game onto 2D Canvas
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const user = playersRef.current.find((p) => p.id === 'player');
    if (!user) return;

    // Camera view follows the player
    const w = canvas.width;
    const h = canvas.height;
    const cx = user.x - w / 2;
    const cy = user.y - h / 2;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw outer space starry background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // Dynamic tiny stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 243 + Math.sin(Date.now() / 2000) * 10) % w;
      const sy = (i * 382) % h;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // 2. Draw Space Station Main Floor (Z=0 circle container)
    ctx.save();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(500 - cx, 500 - cy, 470, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Draw Room Boundaries and Floor Grids
    rooms.forEach((r) => {
      ctx.save();
      // Floor circle
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x - cx, r.y - cy, r.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Grid inside room
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let offset = -r.r; offset < r.r; offset += 30) {
        ctx.beginPath();
        ctx.moveTo(r.x - cx - r.r, r.y - cy + offset);
        ctx.lineTo(r.x - cx + r.r, r.y - cy + offset);
        ctx.moveTo(r.x - cx + offset, r.y - cy - r.r);
        ctx.lineTo(r.x - cx + offset, r.y - cy + r.r);
        ctx.stroke();
      }

      // Room name label on the floor
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(r.name, r.x - cx, r.y - cy - r.r + 25);
      ctx.restore();
    });

    // 4. Draw Corridors connecting rooms
    ctx.save();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 16;
    // Central Vitlas connection lines
    rooms.forEach((r) => {
      if (r.name !== 'Vitals (Хяналтын өрөө)') {
        ctx.beginPath();
        ctx.moveTo(500 - cx, 500 - cy);
        ctx.lineTo(r.x - cx, r.y - cy);
        ctx.stroke();
      }
    });
    ctx.restore();

    // 5. Draw Vents (Teleport system for Impostor)
    vents.forEach((v) => {
      const isNear = Math.hypot(user.x - v.x, user.y - v.y) < 40;
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = isNear && !user.isGoose ? '#ef4444' : '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(v.x - cx, v.y - cy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Vent grate details
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      for (let d = -8; d <= 8; d += 4) {
        ctx.beginPath();
        ctx.moveTo(v.x - cx - 10, v.y - cy + d);
        ctx.lineTo(v.x - cx + 10, v.y - cy + d);
        ctx.stroke();
      }
      ctx.restore();
    });

    // 6. Draw Tasks (Yellow glow triggers)
    tasks.forEach((t) => {
      if (t.completed) return;
      const isNear = Math.hypot(user.x - t.x, user.y - t.y) < 55;
      const pulse = Math.sin(Date.now() / 150) * 3;

      ctx.save();
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 10 + pulse;
      ctx.fillStyle = isNear ? 'rgba(234, 179, 8, 0.4)' : 'rgba(234, 179, 8, 0.2)';
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x - cx, t.y - cy, 20 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Exclamation mark/Indicator icon
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', t.x - cx, t.y - cy);
      ctx.restore();
    });

    // 7. Draw Dead Bodies (Bone remnants)
    deadBodiesRef.current.forEach((body) => {
      ctx.save();
      // Draw colored egg bottom
      ctx.fillStyle = body.color;
      ctx.beginPath();
      ctx.arc(body.x - cx, body.y - cy, 14, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();

      // Draw bone sticking out
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(body.x - cx - 3, body.y - cy - 8, 6, 12);
      ctx.beginPath();
      ctx.arc(body.x - cx - 3, body.y - cy - 8, 3, 0, Math.PI * 2);
      ctx.arc(body.x - cx + 3, body.y - cy - 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 8. Draw Players (Geese & Impostors)
    playersRef.current.forEach((p) => {
      if (!p.isAlive) return;

      const isUser = p.id === 'player';

      ctx.save();
      // Egg-shaped body
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x - cx, p.y - cy, 14, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Beak (Нугасны хошуу)
      ctx.fillStyle = '#f97316'; // Orange beak
      ctx.beginPath();
      ctx.moveTo(p.x - cx + 8, p.y - cy - 4);
      ctx.lineTo(p.x - cx + 22, p.y - cy);
      ctx.lineTo(p.x - cx + 8, p.y - cy + 4);
      ctx.closePath();
      ctx.fill();

      // Draw Eye/Visor
      ctx.fillStyle = '#38bdf8'; // Blue glass visor
      ctx.beginPath();
      ctx.ellipse(p.x - cx + 5, p.y - cy - 5, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mini visor highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(p.x - cx + 6, p.y - cy - 6, 2, 1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Hat
      if (p.hatType === 'police') {
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(p.x - cx - 10, p.y - cy - 24, 20, 6);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(p.x - cx - 7, p.y - cy - 29, 14, 5);
      } else if (p.hatType === 'chef') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x - cx - 4, p.y - cy - 26, 6, 0, Math.PI * 2);
        ctx.arc(p.x - cx + 4, p.y - cy - 26, 6, 0, Math.PI * 2);
        ctx.arc(p.x - cx, p.y - cy - 30, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(p.x - cx - 6, p.y - cy - 22, 12, 5);
      } else if (p.hatType === 'beanie') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(p.x - cx, p.y - cy - 18, 8, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x - cx, p.y - cy - 26, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render name labels
      ctx.fillStyle = isUser ? '#f59e0b' : '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.name, p.x - cx, p.y - cy + 28);

      // Label Duck roles clearly only for the user if they are a duck
      if (!user.isGoose && !p.isGoose && !isUser) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('ХОРЛОН СҮЙТГЭГЧ', p.x - cx, p.y - cy - 36);
      }

      ctx.restore();
    });
  };

  // Click on canvas (Interact, Do task, Teleport)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const user = playersRef.current.find((p) => p.id === 'player');
    if (!user || !user.isAlive) return;

    const cx = user.x - canvas.width / 2;
    const cy = user.y - canvas.height / 2;

    const worldClickX = clickX + cx;
    const worldClickY = clickY + cy;

    // Check if clicked close to a task to activate
    tasks.forEach((t) => {
      if (t.completed) return;
      const dist = Math.hypot(user.x - t.x, user.y - t.y);
      if (dist < 60) {
        const clickDist = Math.hypot(worldClickX - t.x, worldClickY - t.y);
        if (clickDist < 30) {
          activateTask(t);
        }
      }
    });

    // Check Vents for Impostor
    if (!user.isGoose) {
      vents.forEach((v) => {
        const dist = Math.hypot(user.x - v.x, user.y - v.y);
        if (dist < 40) {
          const clickDist = Math.hypot(worldClickX - v.x, worldClickY - v.y);
          if (clickDist < 25) {
            // Find connected vent
            const targetVent = vents.find((vt) => vt.id === v.connectedTo);
            if (targetVent) {
              user.x = targetVent.x;
              user.y = targetVent.y;
              user.currentRoom = targetVent.room;
            }
          }
        }
      });
    }
  };

  // Task initiation
  const activateTask = (task: Task) => {
    setActiveTask(task);
    if (task.type === 'wires') {
      // Randomize connections
      setWireConnections({});
    } else if (task.type === 'upload') {
      setUploadProgress(0);
      setIsUploading(false);
    } else if (task.type === 'keypad') {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setKeypadCode(code);
      setKeypadInput('');
      setKeypadStatus('idle');
    }
  };

  // Perform Impostor Kill trigger
  const handleKillAction = () => {
    const user = playersRef.current.find((p) => p.id === 'player');
    if (!user || user.isGoose || killCooldown > 0 || !user.isAlive) return;

    // Find nearest goose inside range
    const targets = playersRef.current.filter((p) => p.isGoose && p.isAlive);
    let nearestTarget: Player | null = null;
    let minDist = 9999;

    targets.forEach((t) => {
      const dist = Math.hypot(t.x - user.x, t.y - user.y);
      if (dist < minDist) {
        minDist = dist;
        nearestTarget = t;
      }
    });

    if (nearestTarget && minDist < 60) {
      const victim: Player = nearestTarget;
      victim.isAlive = false;
      deadBodiesRef.current.push({
        id: `body-${victim.id}`,
        x: victim.x,
        y: victim.y,
        color: victim.color,
        name: victim.name
      });
      setKillCooldown(15); // Reset cooldown
    }
  };

  // Mini-game: Drag wires resolver
  const connectWire = (leftColor: string, rightColor: string) => {
    if (leftColor === rightColor) {
      const updated = { ...wireConnections, [leftColor]: rightColor };
      setWireConnections(updated);
      // Check if all 3 connected
      if (Object.keys(updated).length === 3) {
        completeActiveTask();
      }
    }
    setSelectedWire(null);
  };

  // Mini-game: Data Upload trigger
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isUploading && uploadProgress < 100) {
      interval = setInterval(() => {
        setUploadProgress((p) => {
          if (p >= 100) {
            completeActiveTask();
            return 100;
          }
          return p + 5;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isUploading, uploadProgress]);

  // Keypad pin submitter
  const submitPin = () => {
    if (keypadInput === keypadCode) {
      setKeypadStatus('success');
      setTimeout(() => {
        completeActiveTask();
      }, 800);
    } else {
      setKeypadStatus('error');
      setTimeout(() => {
        setKeypadInput('');
        setKeypadStatus('idle');
      }, 1000);
    }
  };

  const completeActiveTask = () => {
    if (activeTask) {
      const updated = tasks.map((t) => (t.id === activeTask.id ? { ...t, completed: true } : t));
      setTasks(updated);
      setActiveTask(null);
    }
  };

  const progressPercent = tasks.length > 0
    ? Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100)
    : 0;

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 text-white overflow-hidden shadow-2xl flex flex-col h-[85vh] max-h-[640px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <h2 className="text-sm font-bold uppercase tracking-wider font-mono">GOOSE GOOSE DUCK - САНСРЫН ТУЛААН</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* LOBBY SCREEN */}
        {gameState === 'lobby' && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-radial-gradient"
          >
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4 animate-bounce">
              <ShieldAlert size={38} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Нугас уу? Эсвэл Хорлон сүйтгэгч үү?</h1>
            <p className="text-xs text-slate-400 mt-2 max-w-md leading-relaxed">
              Та сансрын хөлгийн багийн гишүүн үү эсвэл даалгавар нурааж бүхнийг устгах даалгавартай Хорлон сүйтгэгч үү? Үүргээ сонгоод тоглоомыг эхлүүлнэ үү.
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8">
              <button
                onClick={() => {
                  setRole('goose');
                  initGame('goose');
                }}
                className="flex flex-col items-center p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all hover:border-amber-500/50 group"
              >
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <User size={22} />
                </div>
                <span className="text-sm font-bold">Нугас (Goose)</span>
                <span className="text-[10px] text-slate-500 mt-1">Даалгавар биелүүлж зугтах</span>
              </button>

              <button
                onClick={() => {
                  setRole('duck');
                  initGame('duck');
                }}
                className="flex flex-col items-center p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all hover:border-red-500/50 group"
              >
                <div className="p-3 bg-red-500/20 text-red-400 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <Zap size={22} />
                </div>
                <span className="text-sm font-bold">Хорлон сүйтгэгч (Duck)</span>
                <span className="text-[10px] text-slate-500 mt-1">Хүн бүрийг сэмээр устгах</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* PLAYING SCREEN */}
        {gameState === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden"
          >
            {/* Task Progress Bar */}
            <div className="absolute top-3 left-4 right-4 z-10 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex-1 pr-4">
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>НИЙТ ДААЛГАВРЫН БИЕЛЭЛТ</span>
                  <span className="text-amber-400">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <div className="text-[10px] bg-slate-800 px-2 py-1 rounded font-mono text-slate-300">
                Таны үүрэг: <span className={role === 'goose' ? 'text-emerald-400 font-bold' : 'text-red-500 font-bold'}>{role === 'goose' ? 'НУГАС' : 'ХОРЛОН СҮЙТГЭГЧ'}</span>
              </div>
            </div>

            {/* Instruction Help Tip */}
            <div className="absolute bottom-16 left-4 z-10 bg-slate-900/90 backdrop-blur-sm border border-slate-800 p-2.5 rounded-xl max-w-[200px] text-[10px] text-slate-400 leading-relaxed font-mono">
              <div className="font-bold text-white mb-1 flex items-center gap-1">
                <HelpCircle size={10} /> Удирдамж:
              </div>
              <div>• WASD эсвэл Сумаар хөдөлнө</div>
              <div>• Шар дугуйтай даалгаварт хүрээд дарж гүйцэтгэнэ</div>
              {role === 'duck' && <div className="text-red-400 font-bold mt-1">• Хүнээс хол вэнт дээр дарж телепорт хийнэ</div>}
            </div>

            {/* Impostor Action buttons */}
            {role === 'duck' && (
              <div className="absolute bottom-16 right-4 z-10 flex flex-col gap-2">
                <button
                  onClick={handleKillAction}
                  disabled={killCooldown > 0}
                  className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-slate-800 border-2 border-red-500 flex flex-col items-center justify-center text-white transition-all active:scale-95 shadow-lg shadow-red-900/30 font-mono"
                >
                  <Zap size={18} />
                  <span className="text-[8px] font-bold mt-0.5">{killCooldown > 0 ? `${killCooldown}s` : 'УСТГАХ'}</span>
                </button>
              </div>
            )}

            {/* 2D HTML5 Canvas for map and players */}
            <canvas
              ref={canvasRef}
              width={640}
              height={440}
              onClick={handleCanvasClick}
              className="w-full h-full block cursor-crosshair"
            />

            {/* Task Interacting Overlays (Modals inside the game container) */}
            <AnimatePresence>
              {activeTask && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-20 flex items-center justify-center p-6"
                >
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 w-full max-w-sm flex flex-col relative">
                    <button
                      onClick={() => setActiveTask(null)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-white"
                    >
                      <X size={16} />
                    </button>

                    <h3 className="text-sm font-bold mb-4 font-mono text-amber-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                      {activeTask.type === 'wires' && <Radio size={14} />}
                      {activeTask.type === 'upload' && <Database size={14} />}
                      {activeTask.type === 'keypad' && <Zap size={14} />}
                      ДААЛГАВАР: {activeTask.name} ({activeTask.room})
                    </h3>

                    {/* WIRE TASK MINI-GAME */}
                    {activeTask.type === 'wires' && (
                      <div className="flex flex-col gap-5 py-3">
                        <p className="text-[11px] text-slate-400 font-mono">Шулуун өнгүүдийг хооронд нь ижил өнгөөр нь зөв холбоно уу.</p>
                        <div className="flex justify-between items-center px-4">
                          {/* Left Nodes */}
                          <div className="flex flex-col gap-4">
                            {['Red', 'Blue', 'Yellow'].map((color) => {
                              const isConnected = !!wireConnections[color];
                              return (
                                <button
                                  key={color}
                                  onClick={() => setSelectedWire(color)}
                                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isConnected
                                      ? 'bg-slate-800 border-slate-700 opacity-50'
                                      : selectedWire === color
                                      ? 'border-amber-500 scale-110 shadow-lg shadow-amber-500/20'
                                      : 'border-slate-700'
                                  }`}
                                  style={{ backgroundColor: color.toLowerCase() }}
                                />
                              );
                            })}
                          </div>

                          {/* Connection indicator */}
                          <div className="flex flex-col gap-2 items-center">
                            <span className="text-[10px] font-mono text-slate-500">→ ХОЛБОХ →</span>
                          </div>

                          {/* Right Nodes */}
                          <div className="flex flex-col gap-4">
                            {['Blue', 'Yellow', 'Red'].map((color) => {
                              const isConnected = Object.values(wireConnections).includes(color);
                              return (
                                <button
                                  key={color}
                                  disabled={!selectedWire}
                                  onClick={() => selectedWire && connectWire(selectedWire, color)}
                                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isConnected
                                      ? 'bg-slate-800 border-slate-700 opacity-50'
                                      : 'border-slate-700 hover:border-slate-500'
                                  }`}
                                  style={{ backgroundColor: color.toLowerCase() }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* UPLOAD DATA MINI-GAME */}
                    {activeTask.type === 'upload' && (
                      <div className="flex flex-col gap-5 py-4 items-center">
                        <p className="text-[11px] text-slate-400 font-mono text-center">Сервер рүү сансрын хөлгийн системийн өгөгдлийг дамжуулах.</p>
                        
                        <div className="w-full bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center">
                          {uploadProgress < 100 ? (
                            <div className="flex flex-col items-center gap-3 w-full">
                              <span className="text-2xl font-mono text-amber-500 font-bold">{uploadProgress}%</span>
                              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-amber-500 h-full transition-all" style={{ width: `${uploadProgress}%` }} />
                              </div>
                              <button
                                onClick={() => setIsUploading(!isUploading)}
                                className={`mt-2 px-5 py-2 rounded-lg font-bold text-xs font-mono transition-all active:scale-95 cursor-pointer ${
                                  isUploading ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {isUploading ? 'ЗОГСООХ' : 'ДАТА ТАТАХ'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-emerald-400">
                              <Check className="w-10 h-10 animate-pulse" />
                              <span className="text-xs font-bold uppercase font-mono">АМЖИЛТТАЙ ИЛГЭЭГДЛЭЭ</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* KEYPAD MINI-GAME */}
                    {activeTask.type === 'keypad' && (
                      <div className="flex flex-col gap-4 py-2">
                        <p className="text-[11px] text-slate-400 font-mono">Дэлгэц дээр заасан кодыг зөв оруулан баталгаажуулна уу.</p>
                        
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center gap-3">
                          <div className="flex justify-between items-center w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded font-mono text-sm">
                            <span className="text-slate-500">ЗААВАР КОД: <span className="text-yellow-400 font-bold">{keypadCode}</span></span>
                            <span className={`font-bold ${keypadStatus === 'success' ? 'text-emerald-400 animate-pulse' : keypadStatus === 'error' ? 'text-red-500' : 'text-white'}`}>
                              {keypadInput || '____'}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 w-full max-w-[180px] mt-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((btn) => (
                              <button
                                key={btn}
                                onClick={() => {
                                  if (btn === 'C') setKeypadInput('');
                                  else if (btn === 'OK') submitPin();
                                  else if (keypadInput.length < 4) setKeypadInput((i) => i + btn.toString());
                                }}
                                className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded py-2 font-mono text-sm text-white transition-colors cursor-pointer"
                              >
                                {btn}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* EMERGENCY MEETING DIALOGUE / VOTING SCREEN */}
        {gameState === 'meeting' && (
          <motion.div
            key="meeting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col md:flex-row bg-slate-950 overflow-hidden"
          >
            {/* Debate Chat Panel */}
            <div className="flex-1 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col h-1/2 md:h-full p-4">
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3 mb-4 shrink-0">
                <AlertTriangle className="text-red-500 shrink-0" size={18} />
                <div>
                  <h4 className="font-bold text-xs font-mono">{reporter}</h4>
                  <p className="text-[10px] text-slate-400">Нугаснуудын хуралдаан эхэллээ. Сэжигтнийг илрүүлнэ үү!</p>
                </div>
              </div>

              {/* Chat Message Box */}
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 overflow-y-auto flex flex-col gap-3 min-h-0">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className="flex flex-col text-xs font-mono">
                    <span className="font-bold" style={{ color: msg.color }}>{msg.sender}:</span>
                    <span className="text-slate-300 mt-0.5 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-950">{msg.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Voting List Panel */}
            <div className="w-full md:w-80 flex flex-col p-4 h-1/2 md:h-full shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono mb-3 text-slate-400">
                {meetingPhase === 'discuss' && 'Хуралдаж байна (Хэлэлцүүлэг)...'}
                {meetingPhase === 'voting' && 'Санал хураах үе (Хэнийг хасах вэ?)'}
                {meetingPhase === 'result' && 'Санал хураалтын дүн'}
              </h3>

              {meetingPhase === 'voting' ? (
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0 pr-1">
                  {playersRef.current.map((p) => (
                    <button
                      key={p.id}
                      disabled={!p.isAlive}
                      onClick={() => handleVote(p.id)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                        !p.isAlive
                          ? 'bg-slate-900 border-slate-900 opacity-40'
                          : 'bg-slate-900 border-slate-800 hover:border-amber-500/50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-xs font-bold font-mono">{p.name}</span>
                      </div>
                      <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                        {p.isAlive ? 'АМЬД' : 'ҮХСЭН'}
                      </span>
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handleVote('skip')}
                    className="w-full p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 rounded-xl flex items-center justify-center font-mono text-xs font-bold transition-all cursor-pointer"
                  >
                    САНАЛ ТАТГАЛЗАХ (Skip)
                  </button>
                </div>
              ) : meetingPhase === 'result' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  {votedOutName ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
                        <ShieldAlert size={24} />
                      </div>
                      <h4 className="font-bold text-sm text-white font-mono">{votedOutName} сансарт шидэгдлээ!</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                        Тэр бол {votedOutRole === 'duck' ? 'Хорлон сүйтгэгч байжээ! 🔴' : 'ямар ч буруугүй Багийн нугас байлаа. 🟢'}
                      </p>
                    </motion.div>
                  ) : isTie ? (
                    <div className="flex flex-col items-center gap-2">
                      <h4 className="font-bold text-sm text-amber-500 font-mono">Санал тэнцлээ!</h4>
                      <p className="text-xs text-slate-400 max-w-[200px]">Хэн нэгэн хангалттай олонх санал авсангүй тул хэнийг ч хассангүй.</p>
                    </div>
                  ) : (
                    <div className="text-slate-500 font-mono text-xs">Дүн гарч байна...</div>
                  )}

                  <button
                    onClick={resumeGame}
                    className="mt-6 w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold font-mono text-xs rounded-lg shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    ХӨЛӨГ РҮҮ БУЦАХ
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500 font-mono text-xs">
                  <RefreshCw className="animate-spin mb-3 text-slate-600" size={24} />
                  Нугаснууд хэлэлцэж байна...
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* GAME OVER SCREEN */}
        {gameState === 'gameover' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-radial-gradient"
          >
            {winner === 'goose' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                  <Check size={32} />
                </div>
                <h1 className="text-2xl font-black text-emerald-400">Ялалт! Нугаснууд Яллаа</h1>
                <p className="text-xs text-slate-400 mt-2 max-w-sm">
                  Бүх хорлон сүйтгэгчдийг илрүүлж сансарт хаяж чадлаа эсвэл бүх даалгавраа амжилттай биелүүллээ!
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 animate-pulse">
                  <ShieldAlert size={32} />
                </div>
                <h1 className="text-2xl font-black text-red-500">Ялагдал! Хорлон сүйтгэгч нугаснууд Яллаа</h1>
                <p className="text-xs text-slate-400 mt-2 max-w-sm">
                  Хорлон сүйтгэгчид багийн ихэнх гишүүдийг устгаж сансрын хөлгийг сүйтгэлээ.
                </p>
              </>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setGameState('lobby')}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold rounded-lg font-mono transition-all cursor-pointer"
              >
                ЛОББИ РҮҮ БУЦАХ
              </button>
              <button
                onClick={() => initGame(role)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg font-mono transition-all shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer"
              >
                ДАХИН ТОГЛОХ
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
