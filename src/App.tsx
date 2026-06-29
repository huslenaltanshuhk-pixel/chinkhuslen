/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowUpRight, Compass, Shield, Layers, HelpCircle, Info, Gamepad2, Mail, User, BookOpen, Send, Sparkles, Code2, Globe, Heart, Film, Tv, Music, Palette, Trophy, Image } from 'lucide-react';
import { RevealLayer } from './components/RevealLayer';
import { CS2AimTrainer } from './components/CS2AimTrainer';
import { GTAMiniGame } from './components/GTAMiniGame';
import { MySongsMenu } from './components/MySongsMenu';
import { MyPhotosMenu } from './components/MyPhotosMenu';
import { GooseGooseDuck } from './components/GooseGooseDuck';
import { MyIdolChat } from './components/MyIdolChat';
import { MeAIChat } from './components/MeAIChat';
import { motion, AnimatePresence } from 'motion/react';

const BG_IMAGE_1 = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png&w=1280&q=85";
const BG_IMAGE_2 = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png&w=1280&q=85";

export default function App() {
  const [activeTab, setActiveTab] = useState('My Games');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });
  const [showDiggingInfo, setShowDiggingInfo] = useState(false);
  
  // Custom interactive panel open state and contact states
  const [showPanel, setShowPanel] = useState(true);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const [showCS2Game, setShowCS2Game] = useState(false);
  const [showGTAGame, setShowGTAGame] = useState(false);
  const [showGooseGame, setShowGooseGame] = useState(false);

  const mouseRef = useRef({ x: -999, y: -999 });
  const smoothRef = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    const tick = () => {
      // If smooth x/y are still uninitialized but actual mouse was captured, snap it first
      if (smoothRef.current.x === -999 && mouseRef.current.x !== -999) {
        smoothRef.current = { ...mouseRef.current };
      } else if (mouseRef.current.x !== -999) {
        smoothRef.current.x += (mouseRef.current.x - smoothRef.current.x) * 0.1;
        smoothRef.current.y += (mouseRef.current.y - smoothRef.current.y) * 0.1;
      }

      setCursorPos({
        x: smoothRef.current.x,
        y: smoothRef.current.y,
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const menuItems = ['My Games', 'My Songs', 'My Photos', '🤖 My Idol', 'Contact Me', 'About Me', 'My Story'];

  return (
    <div 
      id="lithos-app-root"
      className="min-h-screen bg-white text-gray-900 tracking-[-0.02em] select-none"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Fixed Navigation */}
      <nav 
        id="lithos-main-nav"
        className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5 transition-all duration-300"
      >
        {/* Brand Logo & Wordmark */}
        <div id="lithos-logo-section" className="flex items-center gap-2.5 z-50">
          <svg 
            id="lithos-logo-svg"
            width="26" 
            height="26" 
            viewBox="0 0 256 256" 
            fill="#ffffff"
            className="transition-transform duration-500 hover:rotate-180"
          >
            <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
          </svg>
          <span className="text-white text-2xl font-playfair italic leading-none select-none">
            Lithos
          </span>
        </div>

        {/* Center Pill Menu for Tablet & Desktop */}
        <div 
          id="lithos-desktop-menu-pill"
          className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1 shadow-lg shadow-black/10"
        >
          {menuItems.map((item) => (
            <button
              key={item}
              id={`nav-item-${item.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setActiveTab(item)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${
                activeTab === item
                  ? 'bg-white text-gray-950 font-semibold shadow-sm'
                  : 'text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Right Desktop Button (Sign Up) */}
        <div id="lithos-nav-right-btn" className="hidden md:block">
          <button 
            id="nav-btn-signup"
            className="bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-300 active:scale-95 cursor-pointer"
          >
            Sign Up
          </button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          id="lithos-mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-white p-2 focus:outline-none transition-transform duration-300 hover:scale-105 active:scale-95 z-50 cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="lithos-mobile-nav-panel"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-x-0 top-0 bg-black/95 backdrop-blur-xl border-b border-white/10 z-[90] pt-20 pb-8 px-6 flex flex-col gap-5 md:hidden shadow-2xl"
          >
            <div className="flex flex-col gap-1.5">
              {menuItems.map((item) => (
                <button
                  key={item}
                  id={`mobile-nav-item-${item.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => {
                    setActiveTab(item);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 cursor-pointer ${
                    activeTab === item
                      ? 'bg-white/15 text-white border-l-4 border-[#e8702a] pl-3'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="h-[1px] bg-white/10 my-1" />

            <button 
              id="mobile-nav-btn-signup"
              className="w-full bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-semibold py-3.5 rounded-xl text-center transition-all duration-200 cursor-pointer"
            >
              Sign Up
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Hero Section */}
      <section 
        id="lithos-hero-section"
        className="relative w-full overflow-hidden h-screen bg-black"
        style={{ height: '100dvh' }}
      >
        {/* Layer 1: Base Image (z-10) with Ken Burns slow zoom-out animation */}
        <div 
          id="lithos-hero-bg-base"
          className="absolute inset-0 bg-center bg-cover bg-no-repeat z-10 hero-zoom pointer-events-none"
          style={{ backgroundImage: `url(${BG_IMAGE_1})` }}
        />

        {/* Layer 2: Interactive Reveal Layer (z-30) */}
        {cursorPos.x !== -999 && cursorPos.y !== -999 && (
          <RevealLayer 
            image={BG_IMAGE_2}
            cursorX={cursorPos.x}
            cursorY={cursorPos.y}
          />
        )}

        {/* Ambient Dark Overlay to ensure premium readability */}
        <div 
          id="lithos-ambient-overlay"
          className="absolute inset-0 bg-black/15 z-20 pointer-events-none" 
        />

        {/* Layer 3: Main Heading (z-50) */}
        <div 
          id="lithos-hero-heading"
          className="absolute top-[14%] left-0 right-0 flex flex-col items-center text-center px-5 pointer-events-none z-50"
        >
          <h1 id="lithos-heading-text" className="text-white leading-[0.95] max-w-4xl mx-auto select-none">
            <span 
              className="block font-playfair italic font-normal text-5xl sm:text-7xl md:text-8xl hero-anim hero-reveal"
              style={{ letterSpacing: '-0.05em', animationDelay: '0.25s' }}
            >
              Namaig Chinkhuslen
            </span>
            <span 
              className="block font-normal text-5xl sm:text-7xl md:text-8xl -mt-1 hero-anim hero-reveal"
              style={{ letterSpacing: '-0.08em', animationDelay: '0.42s' }}
            >
              gedeg
            </span>
          </h1>
        </div>

        {/* Layer 4: Dynamic Interactive Portfolio Bento Widget (z-50) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id="lithos-dynamic-portfolio-panel"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-6 sm:bottom-14 left-4 sm:left-10 md:left-14 w-[calc(100%-2rem)] sm:w-[350px] md:w-[410px] bg-black/60 backdrop-blur-xl border border-white/20 p-5 rounded-2xl text-white shadow-2xl z-50 flex flex-col gap-4 max-h-[46vh] sm:max-h-[50vh] overflow-y-auto cursor-default pointer-events-auto"
          >
            {/* Header portion */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                {activeTab === 'My Games' && <Gamepad2 className="text-[#e8702a]" size={18} />}
                {activeTab === 'My Songs' && <Music className="text-[#e8702a]" size={18} />}
                {activeTab === 'My Photos' && <Image className="text-[#e8702a]" size={18} />}
                {activeTab === '🤖 My Idol' && <Trophy className="text-[#e8702a]" size={18} />}
                {activeTab === 'Contact Me' && <Mail className="text-[#e8702a]" size={18} />}
                {activeTab === 'About Me' && <User className="text-[#e8702a]" size={18} />}
                {activeTab === 'My Story' && <BookOpen className="text-[#e8702a]" size={18} />}
                <span className="font-semibold text-sm tracking-wide text-white uppercase font-mono">
                  {activeTab === 'My Games' && 'Миний Тоглоомууд'}
                  {activeTab === 'My Songs' && 'Миний Дуунууд'}
                  {activeTab === 'My Photos' && 'Миний Зургууд'}
                  {activeTab === '🤖 My Idol' && '🤖 My Idol'}
                  {activeTab === 'Contact Me' && 'Холбоо Барих'}
                  {activeTab === 'About Me' && 'Миний Тухай'}
                  {activeTab === 'My Story' && 'Миний Түүх'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-sans">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest">ACTIVE</span>
              </div>
            </div>

            {/* Render dynamically corresponding item list */}
            {activeTab === 'My Games' && (
              <div className="flex flex-col gap-3 font-sans">
                <div 
                  onClick={() => setShowCS2Game(true)}
                  className="p-3 bg-gradient-to-r from-red-500/10 to-orange-500/10 hover:from-red-500/15 hover:to-orange-500/15 rounded-xl border border-orange-500/25 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-0.5 group cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xs text-white group-hover:text-[#e8702a] transition-colors flex items-center gap-1.5">
                      🎯 CS2 Aim Trainer (Бэлтгэл тоглоом)
                    </h3>
                    <span className="text-[9px] bg-[#e8702a] text-white px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">ТОГЛОХ</span>
                  </div>
                  <p className="text-[11px] text-white/80 mt-1">Онооны систем, зэвсэг солих, дуран харах, дууны эффектүүдтэй шууд вэб дээрээ тоглох!</p>
                </div>

                <div 
                  onClick={() => setShowGTAGame(true)}
                  className="p-3 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 hover:from-yellow-500/15 hover:to-amber-500/15 rounded-xl border border-yellow-500/25 hover:border-yellow-500/50 transition-all duration-300 hover:-translate-y-0.5 group cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xs text-white group-hover:text-yellow-400 transition-colors flex items-center gap-1.5">
                      🚗 Los Santos Chase (GTA загвар)
                    </h3>
                    <span className="text-[9px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-mono font-black animate-pulse">ТОГЛОХ</span>
                  </div>
                  <p className="text-[11px] text-white/80 mt-1">Цагдаа нараас зугтаж, мөнгө цуглуулан, жолоодож, буудаж амьд үлдэх сонирхолтой 2D тоглоом!</p>
                </div>

                <div 
                  onClick={() => setShowGooseGame(true)}
                  className="p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/15 hover:to-teal-500/15 rounded-xl border border-emerald-500/25 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-0.5 group cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xs text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5 font-semibold">
                      🦆 Goose Goose Duck (Сансрын тулаан)
                    </h3>
                    <span className="text-[9px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">ТОГЛОХ</span>
                  </div>
                  <p className="text-[11px] text-white/80 mt-1">Багийн гишүүн болж даалгавар биелүүлэх эсвэл хорлон сүйтгэгчээр бусдыг устгах хөгжөөнт тоглоом!</p>
                </div>

                <div className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all duration-300 hover:-translate-y-0.5 group cursor-pointer">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xs text-white group-hover:text-[#e8702a] transition-colors">✨ Чулуулгийн Радар (Lithos Reveal)</h3>
                    <span className="text-[9px] bg-[#e8702a]/20 text-[#e8702a] px-1.5 py-0.5 rounded font-mono">REACT</span>
                  </div>
                  <p className="text-[11px] text-white/70 mt-1">Хулганы заагчаар хөрсийг нэвт хардаг физик өгөгдлийн интерактив механик.</p>
                </div>

                <div className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all duration-300 hover:-translate-y-0.5 group cursor-pointer">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xs text-white group-hover:text-[#e8702a] transition-colors">🚀 Хязгааргүй Сансар (Cosmo Flight)</h3>
                    <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono">UNITY</span>
                  </div>
                  <p className="text-[11px] text-white/70 mt-1">Сансрын хөлгүүдийн хурдтай тулаан, хөгжөөнт аркад тоглоом.</p>
                </div>
              </div>
            )}

            {activeTab === 'My Songs' && (
              <MySongsMenu />
            )}

            {activeTab === 'My Photos' && (
              <MyPhotosMenu />
            )}

            {activeTab === '🤖 My Idol' && (
              <MyIdolChat />
            )}

            {activeTab === 'Contact Me' && (
              <div className="flex flex-col gap-2.5 font-sans">
                {contactSent ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-6 text-center flex flex-col items-center gap-2.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Sparkles size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-white">Амжилттай илгээгдлээ!</h3>
                    <p className="text-xs text-white/75 px-4 leading-relaxed">
                      Чинхүслэнтэй холбоо барих өгөгдөл илгээгдлээ. Танд тун удахгүй эргэн хариулах болно!
                    </p>
                    <button 
                      onClick={() => setContactSent(false)}
                      className="text-[#e8702a] hover:text-white underline text-[10px] mt-2 cursor-pointer"
                    >
                      Дахин илгээх
                    </button>
                  </motion.div>
                ) : (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (contactName.trim() && contactMessage.trim()) {
                        setContactSent(true);
                      }
                    }}
                    className="flex flex-col gap-2.5"
                  >
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase tracking-wider text-white/60 font-mono mb-1">Нэр</label>
                        <input
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Таны нэр"
                          className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#e8702a] transition-all"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase tracking-wider text-white/60 font-mono mb-1">Имэйл хаяг</label>
                        <input
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="huslen@example.com"
                          className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#e8702a] transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-white/60 font-mono mb-1">Зурвас</label>
                      <textarea
                        required
                        rows={2}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Зурвасаа энд бичнэ үү..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#e8702a] transition-all resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="mt-1 bg-[#e8702a] hover:bg-[#d2611f] text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer shadow-md"
                    >
                      <span>Илгээх</span>
                      <Send size={12} />
                    </button>
                    <div className="text-center text-[10px] text-white/50 mt-1 font-mono">
                      Шууд холбоо: <span className="text-[#e8702a]">huslenaltanshuhk@gmail.com</span>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'About Me' && (
              <div className="flex flex-col gap-3.5 text-xs text-white/95 leading-relaxed font-sans">
                <p>
                  Сайн байна уу! Намайг <strong>Чинхүслэн</strong> гэдэг. Би гайхалтай тоглоомын төслүүд, интерактив дижитал ертөнцийг бүтээх дуртай бүтээлч дизайнер бөгөөд вэб технологийн хөгжүүлэгч юм.
                </p>
                <div className="h-[1px] bg-white/10" />
                <div className="flex flex-col gap-2 font-mono">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-white/70">GAME DESIGN & UNREAL</span>
                    <span className="text-[#e8702a] font-bold">95%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#e8702a] h-full rounded-full" style={{ width: '95%' }} />
                  </div>

                  <div className="flex justify-between items-center text-[10px] mt-1">
                    <span className="text-white/70">WEB GL & REACT ENGINE</span>
                    <span className="text-[#e8702a] font-bold">90%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#e8702a] h-full rounded-full" style={{ width: '90%' }} />
                  </div>

                  <div className="flex justify-between items-center text-[10px] mt-1">
                    <span className="text-white/70">SHADERS & VISUAL FX</span>
                    <span className="text-[#e8702a] font-bold">85%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#e8702a] h-full rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'My Story' && (
              <div className="flex flex-col gap-3 font-sans select-none animate-fadeIn">
                {/* Introduction Summary Header */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#e8702a]/20 flex items-center justify-center text-[#e8702a] font-bold text-sm shrink-0">
                    13
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Миний нэрийг Чинхүслэн гэдэг</h4>
                    <p className="text-[10px] text-white/50 mt-0.5">Би 13 настай, миний өндөр 168см.</p>
                  </div>
                </div>

                {/* Bento Grid Item: Games */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex gap-3 items-start hover:bg-white/10 transition-colors">
                  <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-lg shrink-0">
                    <Gamepad2 size={16} />
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-indigo-400 font-bold block">Дуртай тоглоомууд</span>
                    <p className="text-xs text-white/90 font-medium mt-0.5">Roblox, CS2</p>
                  </div>
                </div>

                {/* Bento Grid Item: Anime */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex gap-3 items-start hover:bg-white/10 transition-colors">
                  <div className="p-2 bg-rose-500/15 text-rose-400 rounded-lg shrink-0">
                    <Tv size={16} />
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-rose-400 font-bold block">Дуртай аниме</span>
                    <p className="text-xs text-white/90 font-medium mt-0.5">
                      Naruto, Attack on Titan, Jujutsu Kaisen, Dr.Stone
                    </p>
                  </div>
                </div>

                {/* Bento Grid Item: Movies & Band */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-1 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <Film size={14} />
                      <span className="text-[9px] uppercase font-mono font-bold">Дуртай Кино</span>
                    </div>
                    <p className="text-xs text-white/90 font-medium mt-0.5">Harry Potter</p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-1 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-1.5 text-sky-400">
                      <Music size={14} />
                      <span className="text-[9px] uppercase font-mono font-bold">Дуртай Хамтлаг</span>
                    </div>
                    <p className="text-xs text-white/90 font-medium mt-0.5 font-sans">Vendebo</p>
                  </div>
                </div>

                {/* Bento Grid Item: Sports & Colors */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-1 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Trophy size={14} />
                      <span className="text-[9px] uppercase font-mono font-bold">Дуртай спорт</span>
                    </div>
                    <p className="text-xs text-white/90 font-medium mt-0.5">Сагсан бөмбөг</p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-1 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-1.5 text-purple-400">
                      <Palette size={14} />
                      <span className="text-[9px] uppercase font-mono font-bold">Дуртай Өнгө</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-black border border-white/30" title="Хар" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white/10" title="Ногоон" />
                      </div>
                      <span className="text-xs text-white/90 font-medium">Хар, Ногоон</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Layer 5: Bottom-Right Block (z-50) */}
        <div 
          id="lithos-bottom-right-wrapper"
          className="absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] flex flex-col items-start gap-4 sm:gap-5 z-50 hero-anim hero-fade"
          style={{ animationDelay: '0.85s' }}
        >
          <p 
            id="lithos-bottom-right-p"
            className="text-xs sm:text-sm text-white/80 leading-relaxed drop-shadow-sm select-none"
          >
            Our interactive maps let you peel back the crust to trace how stones, fossils, and deep time combine to shape the ground beneath your feet.
          </p>
          <button
            id="lithos-start-digging-btn"
            onClick={() => setShowDiggingInfo(!showDiggingInfo)}
            className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#e8702a]/30 cursor-pointer flex items-center gap-1.5 self-start shadow-md"
          >
            <span>Start Digging</span>
            <ArrowUpRight size={16} />
          </button>
        </div>

        {/* Dynamic Spotlight Tip / Indicator Layer */}
        {cursorPos.x === -999 && (
          <div 
            id="lithos-intro-tip"
            className="absolute inset-x-0 bottom-1/3 flex justify-center items-center z-50 pointer-events-none"
          >
            <div className="bg-black/40 backdrop-blur-md border border-white/10 px-5 py-3 rounded-full text-white/90 text-sm flex items-center gap-2 animate-bounce">
              <Compass size={16} className="text-[#e8702a] animate-spin-slow" />
              <span>Хулганы заагчийг хөдөлгөж чулуулгийн давхаргыг нээнэ үү</span>
            </div>
          </div>
        )}

        {/* Modally injected premium overlay in response to "Start Digging" toggle to expand user experience cleanly without distracting from constraints */}
        <AnimatePresence>
          {showDiggingInfo && (
            <motion.div
              id="lithos-digging-modal-panel"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute bottom-32 sm:bottom-48 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[340px] bg-black/85 backdrop-blur-xl border border-white/20 p-5 rounded-2xl z-50 shadow-2xl flex flex-col gap-3"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-[#e8702a] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} />
                  Lithos Exploration
                </span>
                <button 
                  id="lithos-digging-modal-close"
                  onClick={() => setShowDiggingInfo(false)} 
                  className="text-white/60 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close information"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-white/90 leading-relaxed">
                Таны дэлгэц дээр гүйж байгаа гэрэл бол <strong>Гүн чулуулгийн радар</strong> юм. Хулганаа хөдөлгөснөөр доод үеийн тунамал чулуулаг, талст болон эртний шим ертөнцийн ул мөр (Reveal Image)-ийг нэвт харах боломжтой.
              </p>
              <div className="flex items-center gap-2 mt-1 py-1 px-2.5 bg-white/5 rounded-lg border border-white/5">
                <Info size={12} className="text-[#e8702a] shrink-0" />
                <span className="text-[10px] text-white/70">
                  Мэдрэгчтэй дэлгэц дээр хуруугаар чирж ажиллуулна уу.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CS2 Aim Trainer Modal Overlay */}
        <AnimatePresence>
          {showCS2Game && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-2xl"
              >
                <CS2AimTrainer onClose={() => setShowCS2Game(false)} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GTA Mini Game Modal Overlay */}
        <AnimatePresence>
          {showGTAGame && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-2xl"
              >
                <GTAMiniGame onClose={() => setShowGTAGame(false)} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Goose Goose Duck Modal Overlay */}
        <AnimatePresence>
          {showGooseGame && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-2xl"
              >
                <GooseGooseDuck onClose={() => setShowGooseGame(false)} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messenger-style popup chatbot */}
        <MeAIChat />
      </section>
    </div>
  );
}
