import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Users, 
  User, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw,
  Heart,
  X,
  Share2,
  Lock,
  Smile
} from 'lucide-react';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { db, auth } from './lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp, 
  arrayUnion 
} from 'firebase/firestore';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { CARDS, Card } from './data/cards';
import { Room, GameState, Reaction } from './types';
import { cn, generateRoomCode } from './lib/utils';

// --- Components ---

const Background = ({ isReactionFlashing }: { isReactionFlashing: boolean }) => {
  return (
    <div className="atmosphere">
      <motion.div 
        animate={{ 
          scale: isReactionFlashing ? 1.4 : [1, 1.1, 0.9, 1],
          opacity: isReactionFlashing ? 0.8 : [0.4, 0.6, 0.4]
        }}
        transition={{ duration: isReactionFlashing ? 0.4 : 15, repeat: isReactionFlashing ? 0 : Infinity, ease: "easeInOut" }}
        className="orb-purple" 
      />
      <motion.div 
        animate={{ 
          scale: isReactionFlashing ? 1.5 : [1, 1.2, 0.8, 1],
          opacity: isReactionFlashing ? 0.7 : [0.3, 0.5, 0.3]
        }}
        transition={{ duration: isReactionFlashing ? 0.5 : 20, repeat: isReactionFlashing ? 0 : Infinity, ease: "easeInOut" }}
        className="orb-rose" 
      />
      <motion.div 
        animate={{ 
          opacity: isReactionFlashing ? 0.5 : [0.2, 0.3, 0.2]
        }}
        transition={{ duration: isReactionFlashing ? 0.3 : 10, repeat: isReactionFlashing ? 0 : Infinity, ease: "easeInOut" }}
        className="orb-blue" 
      />
    </div>
  );
};

const CardCategoryBadge = ({ category }: { category: string }) => {
  const styles: any = {
    icebreaker: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
    deep: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
    fun: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
    hot: 'text-rose-400 border-rose-500/30 bg-rose-500/5',
    cultural: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/5',
  };
  
  const labels: any = {
    icebreaker: 'Romper el hielo',
    deep: 'Profundo',
    fun: 'Divertido',
    hot: 'Picante',
    cultural: 'Cultura / Regional',
  };

  return (
    <span className={cn("badge", styles[category])}>
      {labels[category]}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [guestId] = useState(() => {
    const existing = localStorage.getItem('d2_guest_id');
    if (existing) return existing;
    const newId = 'gst_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('d2_guest_id', newId);
    return newId;
  });

  // We prioritize Firebase Auth if available, otherwise fallback to guestId
  // but we try to keep it stable during a session.
  const currentUid = useMemo(() => user?.uid || guestId, [user?.uid, guestId]);
  const [room, setRoom] = useState<Room | null>(null);
  const [view, setView] = useState<'landing' | 'lobby' | 'game' | 'solo' | 'rules'>('landing');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [soloIndex, setSoloIndex] = useState(0);
  const [soloDeck, setSoloDeck] = useState<string[]>([]);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          setUser(cred.user);
        } catch (err) {
          console.error("Anonymous sign-in failed:", err);
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError('Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('room');
    if (code) {
      setRoomCode(code.toUpperCase());
      // Instant auto-join attempt
      joinRoom(code.toUpperCase());
    }
  }, []); // Run on mount

  useEffect(() => {
    if (room?.id) {
      const unsub = onSnapshot(doc(db, 'rooms', room.id), (docS) => {
        if (docS.exists()) {
          const roomData = docS.data() as Room;
          setRoom(roomData);
          if (roomData.status === 'playing') {
            setView('game');
          }
        }
      });
      return () => unsub();
    }
  }, [room?.id]);

  const createRoom = async () => {
    setError('');
    setLoading(true);
    const code = generateRoomCode();
    const shuffledDeck = CARDS.map(c => c.id).sort(() => Math.random() - 0.5);
    
    const newRoom: Room = {
      id: code,
      status: 'waiting',
      players: { p1: currentUid, p2: null },
      playerNames: { [currentUid]: user?.displayName || 'Descolgado 1' },
      gameState: {
        currentCardIndex: 0,
        deck: shuffledDeck,
        hotConsent: {}
      },
      reactions: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      const roomRef = doc(db, 'rooms', code);
      await setDoc(roomRef, newRoom);
      setRoom(newRoom);
      setView('lobby');
    } catch (err) {
      console.error("Firestore Error in createRoom:", err);
      setError('No se pudo crear la sala. Revisá tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (code: string) => {
    if (!code) {
      setError('Ingresá un código');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const roomRef = doc(db, 'rooms', code);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const roomData = roomSnap.data() as Room;
        if (roomData.players.p2 && roomData.players.p2 !== currentUid && roomData.players.p1 !== currentUid) {
          setError('La sala ya está llena');
        } else {
          // If we are p1 reconnecting, or joining as p2
          const isPlayer1 = roomData.players.p1 === currentUid;
          const updateData: any = {
            updatedAt: serverTimestamp()
          };
          
          if (!isPlayer1 && !roomData.players.p2) {
            updateData['players.p2'] = currentUid;
            updateData[`playerNames.${currentUid}`] = user?.displayName || 'Descolgado 2';
            updateData.status = 'playing';
          }

          await updateDoc(roomRef, updateData);
          setRoom(roomData);
          setView(roomData.status === 'waiting' && isPlayer1 ? 'lobby' : 'game');
        }
      } else {
        setError('No se encontró la sala. Verificá el código.');
      }
    } catch (err) {
      console.error("Firestore Error in joinRoom:", err);
      setError('Error al unirse a la sala.');
    } finally {
      setLoading(false);
    }
  };

  const startSolo = () => {
    const shuffledDeck = CARDS.map(c => c.id).sort(() => Math.random() - 0.5);
    setSoloDeck(shuffledDeck);
    setSoloIndex(0);
    setShowEndScreen(false);
    setView('solo');
  };

  const navigateSolo = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      if (soloIndex < soloDeck.length - 1) {
        setSoloIndex(v => v + 1);
      } else {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
        setShowEndScreen(true);
      }
    } else {
      if (soloIndex > 0) {
        setSoloIndex(v => v - 1);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view === 'solo' && !showEndScreen) {
        if (e.key === 'ArrowRight') navigateSolo('next');
        if (e.key === 'ArrowLeft') navigateSolo('prev');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, soloIndex, soloDeck, showEndScreen]);

  const handleNextCard = async () => {
    if (!room) return;
    const nextIndex = room.gameState.currentCardIndex + 1;
    if (nextIndex >= room.gameState.deck.length) return;

    await updateDoc(doc(db, 'rooms', room.id), {
      'gameState.currentCardIndex': nextIndex,
      'gameState.hotConsent': {}, // Reset consent
      updatedAt: serverTimestamp()
    });
  };

  const giveConsent = async (consent: boolean) => {
    if (!room) return;
    await updateDoc(doc(db, 'rooms', room.id), {
      [`gameState.hotConsent.${currentUid}`]: consent,
      updatedAt: serverTimestamp()
    });
  };

  const sendReaction = async (emoji: string) => {
    if (!room) return;
    const reaction: Reaction = {
      id: Math.random().toString(36).substring(2),
      type: emoji,
      userId: currentUid,
      timestamp: Date.now()
    };
    await updateDoc(doc(db, 'rooms', room.id), {
      reactions: arrayUnion(reaction),
      updatedAt: serverTimestamp()
    });
  };

  const [lastReactionId, setLastReactionId] = useState<string | null>(null);
  const [isReactionFlashing, setIsReactionFlashing] = useState(false);

  useEffect(() => {
    if (room?.reactions?.length) {
      const latest = room.reactions[room.reactions.length - 1];
      if (latest.id !== lastReactionId) {
        setLastReactionId(latest.id);
        setIsReactionFlashing(true);
        setTimeout(() => setIsReactionFlashing(false), 500);
      }
    }
  }, [room?.reactions]);

  const currentCard = useMemo(() => {
    if (view === 'solo') {
      const cardId = soloDeck[soloIndex];
      return cardId ? CARDS.find(c => c.id === cardId) : null;
    }
    if (room && room.gameState && room.gameState.deck) {
      const cardId = room.gameState.deck[room.gameState.currentCardIndex];
      return cardId ? CARDS.find(c => c.id === cardId) : null;
    }
    return null;
  }, [room?.gameState?.currentCardIndex, soloIndex, view, soloDeck]);

  const bothConsented = useMemo(() => {
    if (!room) return false;
    const consents = room.gameState.hotConsent;
    return consents[room.players.p1!] === true && consents[room.players.p2!] === true;
  }, [room?.gameState.hotConsent]);

  const anyDenied = useMemo(() => {
    if (!room) return false;
    const consents = room.gameState.hotConsent;
    return Object.values(consents).some(v => v === false);
  }, [room?.gameState.hotConsent]);

  const hasWaitingConsent = useMemo(() => {
    if (!room) return false;
    return room.gameState.hotConsent[currentUid] === undefined;
  }, [room?.gameState.hotConsent, currentUid]);

  // --- Views ---

  const LandingView = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="mb-12 flex flex-col items-center"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-900/20 rotate-12 mb-6">
          <span className="font-black text-3xl">D2</span>
        </div>
        <h1 className="text-7xl font-black italic tracking-tighter mb-2 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
          DESCOLGA2
        </h1>
        <p className="text-zinc-500 font-bold tracking-[0.4em] uppercase text-[10px]">
          Animate a charlar en serio
        </p>
      </motion.div>

      <div className="space-y-6 w-full max-w-sm">
        <button 
          onClick={createRoom} 
          disabled={loading} 
          className="w-full bg-gradient-to-r from-rose-600 to-purple-600 p-5 rounded-[24px] shadow-2xl shadow-rose-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col items-center gap-1 group"
        >
          <div className="flex items-center gap-2">
            <Plus size={24} className="text-white" />
            <span className="text-xl font-black uppercase tracking-tighter">Empezar una Sala</span>
          </div>
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">Instantáneo • Sin Registro</span>
        </button>
        
        <div className="p-1 rounded-[24px] bg-white/5 border border-white/10">
          <div className="p-6 space-y-4">
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">O unirse a una existente</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="CÓDIGO DE SALA" 
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-1 text-center font-mono focus:outline-none focus:border-rose-500/50 uppercase text-white placeholder:text-zinc-700 tracking-[0.2em]"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
              />
              <button 
                onClick={() => joinRoom(roomCode)} 
                className="bg-zinc-800 hover:bg-zinc-700 px-6 rounded-xl flex items-center justify-center transition-colors"
                disabled={loading}
              >
                <span className="font-black text-sm uppercase">Ir</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-6 pt-4">
          <button onClick={startSolo} className="text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center">
              <User size={16} />
            </div>
            Modo Solo
          </button>
          
          <button onClick={() => setView('rules')} className="text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center">
              <HelpCircle size={16} />
            </div>
            Reglas
          </button>
        </div>
      </div>

      {error && <p className="mt-6 text-rose-500 text-sm font-medium animate-pulse">{error}</p>}
    </div>
  );

  const LobbyView = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="glass-heavy p-10 rounded-[40px] max-w-sm w-full relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6">
          <Share2 className="text-white/10" size={20} />
        </div>
        
        <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
          <span className="font-black text-xl">D2</span>
        </div>

        <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Sala de Espera</h2>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-10">Invitá a tu descolgado/a</p>
        
        <div className="bg-white p-4 rounded-3xl mb-10 flex justify-center shadow-2xl relative">
          <div className="absolute inset-0 bg-rose-500/10 blur-2xl -z-10 rounded-full"></div>
          <QRCodeSVG value={`${window.location.origin}?room=${room?.id}`} size={200} level="H" />
        </div>

        <div className="glass bg-white/5 border border-white/10 p-5 rounded-2xl mb-4">
          <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.2em] mb-2">Código de Sala</p>
          <p className="text-4xl font-mono font-black text-white tracking-widest">{room?.id}</p>
        </div>

        <button 
          onClick={() => {
            const url = `${window.location.origin}?room=${room?.id}`;
            if (navigator.share) {
              navigator.share({
                title: 'Descolga2',
                text: '¡Unite a mi sala de Descolga2 para charlar en serio!',
                url: url
              });
            } else {
              navigator.clipboard.writeText(url);
              alert('¡Enlace copiado al portapapeles!');
            }
          }}
          className="w-full mb-8 bg-zinc-800 hover:bg-zinc-700 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-[10px] font-black uppercase tracking-widest text-zinc-300"
        >
          <Share2 size={14} /> Compartir Enlace
        </button>

        <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }} 
            transition={{ duration: 2, repeat: Infinity }} 
            className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.6)]" 
          />
          Esperando conexión...
        </div>
      </div>
      
      <button onClick={() => setView('landing')} className="mt-10 text-zinc-600 hover:text-white transition-colors flex items-center gap-2 text-[10px] uppercase font-black tracking-[0.2em]">
        <ChevronLeft size={14} /> Cancelar Sala
      </button>
    </div>
  );

  const RulesView = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="glass-heavy p-10 rounded-[40px] max-w-md w-full relative">
        <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 w-16 h-16 bg-[#0d0d1a] border border-white/10 rounded-2xl flex items-center justify-center shadow-xl">
          <HelpCircle className="text-rose-500" size={32} />
        </div>

        <h2 className="text-3xl font-black italic mb-8 mt-4 text-center tracking-tighter">REGLAS DEL JUEGO</h2>
        <div className="space-y-6 text-left text-zinc-400 text-xs font-bold leading-relaxed uppercase tracking-widest">
          <div className="flex gap-4">
            <span className="text-rose-500 font-black">01.</span>
            <p><b>DESCOLGA2</b> es para conectar sin filtros. Pasen por 40 cartas diseñadas para un primer encuentro inolvidable.</p>
          </div>
          <div className="flex gap-4">
            <span className="text-rose-500 font-black">02.</span>
            <p>Las cartas <b>HOT</b> son opcionales: solo se revelan si ambos aceptan la propuesta en el momento.</p>
          </div>
          <div className="flex gap-4">
            <span className="text-rose-500 font-black">03.</span>
            <p>Usen las <b>REACCIONES</b> en vivo para que el otro sepa qué sentís con cada pregunta o desafío.</p>
          </div>
          <div className="flex gap-4">
            <span className="text-rose-500 font-black">04.</span>
            <p>No hay puntajes ni ganadores. El único objetivo es pasar un buen momento y charlar en serio.</p>
          </div>
        </div>
        <button onClick={() => setView('landing')} className="btn-vibrant w-full mt-10">¡VAMOS!</button>
      </div>
    </div>
  );

  const EndGameView = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-heavy p-10 rounded-[40px] max-w-sm w-full"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-purple-500/20">
          <Heart fill="white" size={40} />
        </div>
        <h2 className="text-3xl font-black italic tracking-tighter mb-4">¡FIN DEL VIAJE!</h2>
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-10 leading-relaxed px-4">
          Pasaron por todas las cartas. Esperamos que se hayan descolgado un poco y conocido de verdad.
        </p>
        <div className="space-y-4">
          <button onClick={() => setView('landing')} className="btn-vibrant w-full">VOLVER AL INICIO</button>
          <p className="text-[10px] text-zinc-600 font-black tracking-widest uppercase">Animate a charlar en serio</p>
        </div>
      </motion.div>
    </div>
  );

  const GameView = () => {
    const isHot = currentCard?.isHot;
    const showHotContent = view === 'solo' || (isHot && bothConsented);
    const waitingForOthers = isHot && view !== 'solo' && !bothConsented && !anyDenied && !hasWaitingConsent;
    const accessDenied = isHot && view !== 'solo' && anyDenied;
    const currentIndex = view === 'solo' ? soloIndex : (room?.gameState.currentCardIndex || 0);

    if (showEndScreen) return <EndGameView />;

    return (
      <div className="flex flex-col h-screen relative z-10">
        {/* Subtle Reaction Flash Overlay */}
        <AnimatePresence>
          {isReactionFlashing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-rose-500 pointer-events-none z-0"
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="flex justify-between items-center p-8 max-w-7xl w-full mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20 rotate-12">
              <span className="font-black text-xl">D2</span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              DESCOLGA2
            </h1>
          </div>
          <div className="flex gap-3">
            <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
              <span className="text-[10px] font-black tracking-widest uppercase">
                {view === 'solo' ? 'Modo Solo' : `Sala: ${room?.id}`}
              </span>
            </div>
            <button onClick={() => window.location.reload()} className="glass p-2 rounded-full hover:bg-white/20 transition-colors">
              <RotateCcw size={16} />
            </button>
          </div>
        </header>

        {/* Maincontent Grid */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-8 items-center px-8 max-w-7xl w-full mx-auto pb-8">
          
          {/* Left Stats Sidebar (Hidden on mobile) */}
          <div className="hidden md:flex col-span-3 flex-col gap-6">
            <div className="glass p-6 rounded-3xl">
              <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-4">Progreso</p>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold">Cartas jugadas</span>
                <span className="text-xs font-black text-rose-400">{currentIndex + 1}/40</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentIndex + 1) / 40) * 100}%` }}
                  className="bg-gradient-to-r from-rose-500 to-purple-500 h-full rounded-full" 
                />
              </div>
            </div>

            {view !== 'solo' && (
              <div className="glass p-6 rounded-3xl">
                <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-4">Tu Cita</p>
                <div className="bg-white p-2 rounded-xl mb-4 w-24 h-24 mx-auto">
                  <QRCodeSVG value={`${window.location.origin}?room=${room?.id}`} size={80} level="H" />
                </div>
                <p className="text-center text-[10px] text-zinc-600 leading-tight italic">
                  Escaneá para sincronizar en vivo
                </p>
              </div>
            )}
          </div>

          {/* Center Card */}
          <div className="col-span-1 md:col-span-6 flex justify-center perspective-[1000px] relative h-full items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard?.id || 'empty'}
                initial={{ rotateY: 90, opacity: 0, scale: 0.9 }}
                animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                exit={{ rotateY: -90, opacity: 0, scale: 0.9 }}
                transition={{ 
                  type: "spring", 
                  damping: 20, 
                  stiffness: 100,
                  mass: 0.8
                }}
                className={cn(
                  "glass-heavy p-10 w-full max-w-sm aspect-[3/4] flex flex-col items-center justify-center relative",
                  isHot && !showHotContent && "border-rose-500/30"
                )}
              >
                {/* Decorative Quotes */}
                <div className="absolute top-6 left-8">
                  <span className="text-5xl font-serif italic opacity-10 text-rose-300">“</span>
                </div>
                <div className="absolute bottom-6 right-8 rotate-180">
                  <span className="text-5xl font-serif italic opacity-10 text-rose-300">“</span>
                </div>

                <div className="absolute top-8 left-8">
                  <CardCategoryBadge category={currentCard?.category || 'icebreaker'} />
                </div>

                <div className="text-center px-4 w-full z-10">
                  {isHot && !showHotContent ? (
                    <div className="space-y-6">
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1] }} 
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-rose-500/10"
                      >
                        <span className="text-3xl">🔥</span>
                      </motion.div>
                      <div>
                        <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">¡Se puso picante!</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed max-w-[240px] mx-auto">
                          Esta carta es del mazo <span className="text-rose-400 font-bold italic">HOT</span>. <br /> ¿Ambos aceptan verla?
                        </p>
                      </div>

                      {accessDenied ? (
                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-xs uppercase tracking-widest">
                          No hay match en la decisión
                        </div>
                      ) : waitingForOthers ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex gap-2">
                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Esperando respuesta...</p>
                        </div>
                      ) : (
                        <div className="flex gap-4 justify-center">
                          <button onClick={() => giveConsent(false)} className="w-16 h-16 rounded-full glass border-white/10 flex items-center justify-center text-xl hover:bg-rose-500/20 transition-all">
                            ✕
                          </button>
                          <button onClick={() => giveConsent(true)} className="w-16 h-16 rounded-full bg-rose-600 border border-rose-400 flex items-center justify-center text-xl shadow-lg shadow-rose-900/40 hover:scale-110 active:scale-95 transition-all">
                            ❤️
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <motion.h3 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-2xl font-semibold italic leading-tight text-white/90 mb-8"
                      >
                        {currentCard?.text}
                      </motion.h3>
                      <div className="w-12 h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent"></div>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-8 left-0 w-full text-center">
                  <div className="md:hidden flex justify-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-1 h-1 rounded-full",
                          Math.floor(currentIndex / 8) === i ? "bg-rose-500 scale-125" : "bg-white/10"
                        )} 
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-rose-400 font-black tracking-[0.3em] uppercase">
                    DESCOLGA2
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Controls Sidebar */}
          <div className="col-span-1 md:col-span-3 flex flex-col gap-8 items-center md:items-end w-full">
            <div className="w-full relative">
              <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-4 text-center md:text-right px-2 leading-none">Reacciones</p>
              <div className="grid grid-cols-6 md:grid-cols-2 gap-3 w-full">
                {[
                  { e: '🧉', l: 'Mate' },
                  { e: '😂', l: 'Jaja' },
                  { e: '💖', l: 'Me va' },
                  { e: '🇦🇷', l: 'País' },
                  { e: '👀', l: 'Mira' }
                ].map(({ e, l }) => (
                  <button 
                    key={e} 
                    onClick={() => sendReaction(e)}
                    className="flex flex-col items-center justify-center gap-1 p-3 glass rounded-2xl hover:bg-white/20 transition-all active:scale-90"
                  >
                    <span className="text-2xl">{e}</span>
                    <span className="text-[8px] uppercase font-black text-zinc-500 tracking-widest hidden md:block">{l}</span>
                  </button>
                ))}
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-3 glass rounded-2xl transition-all active:scale-90",
                    showEmojiPicker ? "bg-rose-500/20 border-rose-500/50" : "hover:bg-white/10"
                  )}
                >
                  <Smile size={24} className={showEmojiPicker ? "text-rose-400" : "text-zinc-400"} />
                  <span className="text-[8px] uppercase font-black text-zinc-500 tracking-widest hidden md:block">Más</span>
                </button>
              </div>

              {/* Advanced Emoji Picker Flyout/Modal */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="absolute bottom-full right-0 mb-4 z-50 shadow-2xl rounded-[32px] overflow-hidden border border-white/10"
                  >
                    <div className="bg-[#0d0d1a] p-1">
                      <EmojiPicker 
                        theme={Theme.DARK}
                        emojiStyle={EmojiStyle.NATIVE}
                        onEmojiClick={(emojiData) => {
                          sendReaction(emojiData.emoji);
                          setShowEmojiPicker(false);
                        }}
                        lazyLoadEmojis={true}
                        searchDisabled={false}
                        width={300}
                        height={400}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-auto w-full group flex gap-3">
              {view === 'solo' && soloIndex > 0 && (
                <button 
                  onClick={() => navigateSolo('prev')}
                  className="glass p-4 rounded-2xl hover:bg-white/10 transition-colors active:scale-90"
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              <button 
                disabled={isHot && !showHotContent && !anyDenied}
                onClick={() => {
                  if (view === 'solo') {
                    navigateSolo('next');
                  } else {
                    handleNextCard();
                  }
                }} 
                className="flex-1 bg-gradient-to-r from-rose-500 to-purple-600 p-px rounded-2xl overflow-hidden transition-transform active:scale-95"
              >
                <div className="w-full bg-[#0d0d1a] hover:bg-transparent transition-colors rounded-[15px] py-4 px-6 flex justify-between items-center group-disabled:opacity-50">
                  <span className="font-black uppercase text-[10px] tracking-[0.2em]">
                    {currentIndex === 39 ? 'FINALIZAR' : 'SIGUIENTE'}
                  </span>
                  <span className="text-xl">→</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-8 flex justify-between items-center text-[8px] tracking-[0.3em] text-zinc-600 border-t border-white/5 uppercase font-black">
          <div className="hidden sm:flex gap-6">
            <span>Feedback Directo</span>
            <span>Argentina 2024</span>
          </div>
          <div className="italic text-rose-500/50">
            DESCOLGA2 — EXPERIENCIA PREMIUM
          </div>
        </footer>

        {/* Reaction Visualization */}
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          <AnimatePresence>
            {room?.reactions.filter(r => Date.now() - r.timestamp < 2000).map(r => (
              <motion.div
                key={r.id}
                initial={{ y: 20, x: (Math.random() * 40 - 20) + (window.innerWidth / 2), opacity: 0, scale: 0.5 }}
                animate={{ y: -600, opacity: [0, 1, 1, 0], scale: [0.5, 2, 2, 3], rotate: Math.random() * 40 - 20 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute bottom-20 text-5xl"
              >
                {r.type}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full select-none overflow-hidden">
      <Background isReactionFlashing={isReactionFlashing} />
      <AnimatePresence mode="wait">
        {view === 'landing' && <motion.div key="landing" exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}><LandingView /></motion.div>}
        {view === 'lobby' && <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><LobbyView /></motion.div>}
        {view === 'rules' && <motion.div key="rules" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><RulesView /></motion.div>}
        {(view === 'game' || view === 'solo') && <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><GameView /></motion.div>}
      </AnimatePresence>
    </div>
  );
}
