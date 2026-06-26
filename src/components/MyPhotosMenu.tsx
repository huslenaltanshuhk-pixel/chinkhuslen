import React, { useState, useEffect } from 'react';
import { Image, Heart, Trash2, Plus, Sparkles, Eye, ChevronLeft, ChevronRight, Play, Pause, Grid, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import chinkhuslenSkin from '../assets/images/chinkhuslen_skin_1782310120339.jpg';

interface Photo {
  id: string;
  title: string;
  description: string;
  url: string;
  category: 'Gaming' | 'Nature' | 'Art' | 'Other';
  isFavorite?: boolean;
}

const CHINKHUSLEN_PHOTO: Photo = {
  id: 'chinkhuslen-photo',
  title: 'Чинхүслэн (Minecraft Skin)',
  description: 'Чинхүслэнгийн хамгийн дуртай, загварлаг Spider хоодойтой Minecraft дүр',
  url: chinkhuslenSkin,
  category: 'Gaming',
  isFavorite: true
};

const DEFAULT_PHOTOS: Photo[] = [
  CHINKHUSLEN_PHOTO,
  {
    id: 'p1',
    title: 'Cyberpunk Neon City',
    description: 'Ирээдүйн неон гэрэлт гудамж ба хурдны машин',
    url: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?q=80&w=800&auto=format&fit=crop',
    category: 'Gaming',
    isFavorite: true
  },
  {
    id: 'p2',
    title: 'CS2 Dust 2 Peak',
    description: 'Домогт Dust II газрын нарлаг өглөөний зураглал',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
    category: 'Gaming',
    isFavorite: false
  },
  {
    id: 'p3',
    title: 'Уулын Сүрлэг Оргил',
    description: 'Манан дундах мөнх цаст уулсын үзэсгэлэн',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop',
    category: 'Nature',
    isFavorite: true
  },
  {
    id: 'p4',
    title: 'Ойн Нам гүм Нар',
    description: 'Мөнх ногоон моддын завсраар тусах алтан туяа',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800&auto=format&fit=crop',
    category: 'Nature',
    isFavorite: false
  },
  {
    id: 'p5',
    title: 'Космос Хийсвэр Урлаг',
    description: 'Сансрын тоос, оддын урсгал бүхий уран зураг',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=800&auto=format&fit=crop',
    category: 'Art',
    isFavorite: false
  },
  {
    id: 'p6',
    title: 'Синтвейв Нар Жаргалт',
    description: '80-аад оны ретро загвартай тоон урлаг',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    category: 'Art',
    isFavorite: true
  }
];

export function MyPhotosMenu() {
  const [photos, setPhotos] = useState<Photo[]>(() => {
    const saved = localStorage.getItem('chinkhuslen_photos');
    if (saved) {
      const parsed: Photo[] = JSON.parse(saved);
      const hasChinkhuslenPhoto = parsed.some(p => p.id === 'chinkhuslen-photo');
      if (!hasChinkhuslenPhoto) {
        return [CHINKHUSLEN_PHOTO, ...parsed];
      }
      return parsed;
    }
    return DEFAULT_PHOTOS;
  });

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState<'Gaming' | 'Nature' | 'Art' | 'Other'>('Gaming');

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('chinkhuslen_photos', JSON.stringify(photos));
  }, [photos]);

  // Slideshow auto play effect
  useEffect(() => {
    if (!isSlideshowPlaying || selectedPhotoIndex === null) return;

    const interval = setInterval(() => {
      setSelectedPhotoIndex((prev) => {
        if (prev === null) return 0;
        return (prev + 1) % filteredPhotos.length;
      });
    }, 3500); // changes every 3.5 seconds

    return () => clearInterval(interval);
  }, [isSlideshowPlaying, selectedPhotoIndex, activeCategory]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
  };

  const deletePhoto = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotos(prev => prev.filter(p => p.id !== id));
    // Reset selection if active
    setSelectedPhotoIndex(null);
    setIsSlideshowPlaying(false);
  };

  const handleAddNewPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      alert('Зургийн холбоос заавал http:// эсвэл https://-оор эхлэх ёстой!');
      return;
    }

    const newPhoto: Photo = {
      id: Math.random().toString(),
      title: newTitle.trim(),
      description: newDesc.trim() || 'Тайлбаргүй',
      url: newUrl.trim(),
      category: newCategory,
      isFavorite: false
    };

    setPhotos([...photos, newPhoto]);
    setNewTitle('');
    setNewDesc('');
    setNewUrl('');
    setNewCategory('Gaming');
    setShowAddForm(false);
  };

  const filteredPhotos = photos.filter(p => activeCategory === 'All' ? true : p.category === activeCategory);

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedPhotoIndex === null || filteredPhotos.length === 0) return;
    setSelectedPhotoIndex((prev) => (prev === null ? 0 : (prev - 1 + filteredPhotos.length) % filteredPhotos.length));
  };

  const handleNextPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedPhotoIndex === null || filteredPhotos.length === 0) return;
    setSelectedPhotoIndex((prev) => (prev === null ? 0 : (prev + 1) % filteredPhotos.length));
  };

  return (
    <div className="flex flex-col gap-3 font-sans text-white h-full">
      
      {/* 1. FILTER BAR AND ADD BUTTON */}
      <div className="flex items-center justify-between gap-1 border-b border-white/5 pb-2">
        <div className="flex flex-wrap gap-1">
          {['All', 'Gaming', 'Nature', 'Art'].map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setSelectedPhotoIndex(null);
                }}
                className={`text-[10px] font-mono font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#e8702a] text-white shadow-sm' 
                    : 'bg-white/5 hover:bg-white/10 text-white/60'
                }`}
              >
                {cat === 'All' && 'БҮХ'}
                {cat === 'Gaming' && 'ТОГЛООМ'}
                {cat === 'Nature' && 'БАЙГАЛЬ'}
                {cat === 'Art' && 'УРЛАГ'}
              </button>
            );
          })}
        </div>

        <div className="flex gap-1.5 shrink-0">
          {photos.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Бүх зургийг устгахдаа итгэлтэй байна уу?')) {
                  setPhotos([]);
                  setSelectedPhotoIndex(null);
                  setIsSlideshowPlaying(false);
                }
              }}
              className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 font-mono font-bold px-2.5 py-1 rounded-lg border border-red-500/20 flex items-center gap-1 cursor-pointer transition-all"
            >
              <Trash2 size={11} />
              <span>БҮГДИЙГ УСТГАХ</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[10px] bg-[#e8702a]/10 hover:bg-[#e8702a]/20 text-[#e8702a] font-mono font-bold px-2.5 py-1 rounded-lg border border-[#e8702a]/25 flex items-center gap-1 cursor-pointer transition-all"
          >
            <Plus size={12} />
            <span>ЗУРАГ НЭМЭХ</span>
          </button>
        </div>
      </div>

      {/* 2. ADD FORM DROPDOWN PANEL */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddNewPhoto}
            className="p-3 bg-white/5 border border-[#e8702a]/20 rounded-xl flex flex-col gap-2 overflow-hidden font-sans"
          >
            <div className="text-[10px] font-bold text-yellow-400 flex items-center gap-1 font-mono">
              <Sparkles size={11} />
              <span>ШИНЭ СҮРЛЭГ ЗУРАГ НЭМЭХ</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Зургийн гарчиг..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none focus:border-[#e8702a]"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="bg-zinc-800 text-white text-[11px] border border-white/10 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="Gaming">Тоглоом</option>
                <option value="Nature">Байгаль</option>
                <option value="Art">Урлаг</option>
                <option value="Other">Бусад</option>
              </select>
            </div>
            <input
              type="url"
              required
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Шууд зургийн холбоос URL (https://...)"
              className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-2 text-xs font-mono text-white focus:outline-none focus:border-[#e8702a]"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Товч тайлбар бичих..."
              className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none focus:border-[#e8702a]"
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-[10px] text-white/60 hover:text-white px-2 py-1"
              >
                Цуцлах
              </button>
              <button
                type="submit"
                className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg"
              >
                Жагсаалтад оруулах
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* 3. IMAGES GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
        {filteredPhotos.map((photo, index) => (
          <div
            key={photo.id}
            onClick={() => {
              setSelectedPhotoIndex(index);
              setIsSlideshowPlaying(false);
            }}
            className="group relative h-20 rounded-xl overflow-hidden border border-white/5 bg-zinc-900 cursor-pointer hover:border-[#e8702a]/50 hover:-translate-y-0.5 transition-all duration-300"
          >
            {/* Image itself */}
            <img
              src={photo.url}
              alt={photo.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {/* Black overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-60 group-hover:opacity-85 transition-opacity duration-300" />
            
            {/* Overlay Info text */}
            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col min-w-0">
              <span className="text-[9px] font-black tracking-wide truncate text-white uppercase font-sans">
                {photo.title}
              </span>
              <span className="text-[7px] text-white/50 truncate font-mono">
                {photo.category}
              </span>
            </div>

            {/* Float Buttons */}
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={(e) => toggleFavorite(photo.id, e)}
                className="p-1 bg-black/60 rounded-md hover:bg-black/90 text-white/70 hover:text-red-500 transition-all cursor-pointer"
              >
                <Heart size={10} className={photo.isFavorite ? "fill-red-500 text-red-500" : ""} />
              </button>
              <button
                onClick={(e) => deletePhoto(photo.id, e)}
                className="p-1 bg-black/60 rounded-md hover:bg-black/90 text-white/70 hover:text-red-400 transition-all cursor-pointer"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}

        {filteredPhotos.length === 0 && (
          <div className="col-span-3 text-center py-8 text-xs text-white/30 font-mono">
            Энэ ангилалд тохирох зураг одоогоор байхгүй байна
          </div>
        )}
      </div>

      {/* 4. ACTIVE SELECTED PHOTO DETAILED VIEWER (LIGHTBOX) */}
      <AnimatePresence>
        {selectedPhotoIndex !== null && filteredPhotos[selectedPhotoIndex] && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-3 bg-white/5 rounded-2xl border border-[#e8702a]/20 flex flex-col gap-2.5 relative"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-yellow-400">
                <Eye size={12} />
                <span>ОДОО ҮЗЭЖ БАЙНА ({selectedPhotoIndex + 1}/{filteredPhotos.length})</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* Slideshow button */}
                <button
                  onClick={() => setIsSlideshowPlaying(!isSlideshowPlaying)}
                  className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    isSlideshowPlaying 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25'
                  }`}
                >
                  {isSlideshowPlaying ? <Pause size={8} /> : <Play size={8} />}
                  <span>{isSlideshowPlaying ? 'СЛАЙДШОУ ЗОГСООХ' : 'АВТО ТОГЛУУЛАХ'}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedPhotoIndex(null);
                    setIsSlideshowPlaying(false);
                  }}
                  className="text-[9px] bg-white/5 hover:bg-white/10 text-white/50 px-2 py-0.5 rounded font-mono"
                >
                  ХААХ
                </button>
              </div>
            </div>

            {/* Large Interactive Image Frame */}
            <div className="relative h-44 w-full rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
              <img
                src={filteredPhotos[selectedPhotoIndex].url}
                alt={filteredPhotos[selectedPhotoIndex].title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain"
              />

              {/* Slider Arrows */}
              <button
                onClick={handlePrevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/75 border border-white/10 text-white hover:bg-[#e8702a] transition-all cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>

              <button
                onClick={handleNextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/75 border border-white/10 text-white hover:bg-[#e8702a] transition-all cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Image description block */}
            <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 flex justify-between items-center gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs text-white truncate uppercase">
                  {filteredPhotos[selectedPhotoIndex].title}
                </h4>
                <p className="text-[10px] text-white/60 mt-0.5 truncate font-sans">
                  {filteredPhotos[selectedPhotoIndex].description}
                </p>
              </div>
              <button
                onClick={(e) => toggleFavorite(filteredPhotos[selectedPhotoIndex].id, e)}
                className="shrink-0 p-2 bg-white/5 rounded-lg text-white/50 hover:text-red-500 transition-colors"
              >
                <Heart 
                  size={14} 
                  className={filteredPhotos[selectedPhotoIndex].isFavorite ? "fill-red-500 text-red-500" : ""} 
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. USER FRIENDLY TIPS */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 text-[10px] text-white/50 leading-relaxed font-mono">
        <div>💡 <strong>САНАМЖ:</strong> Чинхүслэн чи утас эсвэл компьютер дээрээ байгаа дурын зургийн холбоосыг <strong>"ЗУРАГ НЭМЭХ"</strong> ашиглан оруулж өөрийн галерейг баяжуулаарай!</div>
      </div>

    </div>
  );
}
