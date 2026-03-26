import { useState, useRef, useEffect } from "react";
import logo from "@/assets/up1/logo.png";
import telaPopup from "@/assets/up1/tela-popup.png";
import iphoneImg from "@/assets/up1/iphone.png";
import smarttvImg from "@/assets/up1/smarttv.png";
import geladeiraImg from "@/assets/up1/geladeira.png";
import { Clover } from "lucide-react";
import PrizeIcon from "./PrizeIcon";

const SYMBOLS = [
  { id: "10", value: "10", label: "REAIS", color: "blue", image: null },
  { id: "20", value: "20", label: "REAIS", color: "red", image: null },
  { id: "50", value: "50", label: "REAIS", color: "green", image: null },
  { id: "100", value: "100", label: "REAIS", color: "orange", image: null },
  { id: "1000", value: "1000", label: "REAIS", color: "cyan", image: null },
  { id: "5000", value: "5000", label: "REAIS", color: "pink", image: null },
  { id: "10000", value: "10000", label: "REAIS", color: "purple", image: null },
  { id: "iphone", value: "iPHONE", label: "17 PRO MAX", color: "gold", image: iphoneImg },
  { id: "smarttv", value: "SMART", label: "TV HD", color: "purple", image: smarttvImg },
  { id: "geladeira", value: "GELADEIRA", label: "CONSUL", color: "cyan", image: geladeiraImg },
];

const getRandomSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

const SlotReel = ({ spinning, finalSymbol, delay, isWinning }: { spinning: boolean; finalSymbol: typeof SYMBOLS[0]; delay: number; isWinning: boolean }) => {
  const [displayedSymbols, setDisplayedSymbols] = useState(() => Array.from({ length: 3 }, getRandomSymbol));
  const [isSpinning, setIsSpinning] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (spinning) {
      setShowWinAnimation(false);
      const startTimer = setTimeout(() => {
        setIsSpinning(true);
        intervalRef.current = setInterval(() => {
          setDisplayedSymbols(Array.from({ length: 3 }, getRandomSymbol));
        }, 80);
      }, delay);
      
      const stopTimer = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsSpinning(false);
        setDisplayedSymbols([getRandomSymbol(), finalSymbol, getRandomSymbol()]);
        if (isWinning) setTimeout(() => setShowWinAnimation(true), 300);
      }, 2000 + delay + Math.random() * 500);
      
      return () => {
        clearTimeout(startTimer);
        clearTimeout(stopTimer);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [spinning, finalSymbol, delay, isWinning]);
  
  return (
    <div className="slot-column flex-1 h-72 overflow-hidden relative">
      <div className={`flex flex-col transition-transform ${isSpinning ? 'duration-0' : 'duration-300'}`}>
        {displayedSymbols.map((symbol, idx) => (
          <div key={idx} className={`slot-icon h-24 flex items-center justify-center ${isSpinning ? 'blur-[1px]' : ''} ${idx === 1 ? 'scale-110' : 'opacity-50 scale-90'} ${idx === 1 && showWinAnimation ? 'animate-winner-pulse' : ''}`}>
            {symbol.image ? (
              <img src={symbol.image} alt={symbol.value} className="object-contain drop-shadow-lg" style={{ width: idx === 1 ? 72 : 56, height: idx === 1 ? 72 : 56 }} />
            ) : (
              <PrizeIcon value={symbol.value} label={symbol.label} color={symbol.color} size={idx === 1 ? 72 : 56} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const SlotGame = () => {
  const [tentativas, setTentativas] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [clickCount, setClickCount] = useState(0);
  const [isWinningRound, setIsWinningRound] = useState(false);
  const [wonPrize, setWonPrize] = useState<typeof SYMBOLS[0] | null>(null);
  const [reelSymbols, setReelSymbols] = useState(() => [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 6000);
    return () => clearTimeout(timer);
  }, []);
  
  const handleSpin = () => {
    if (isSpinning || tentativas <= 0) return;
    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);
    setIsSpinning(true);
    setTentativas(prev => prev - 1);
    
    if (newClickCount === 2) {
      const prizeOptions = SYMBOLS.filter(s => s.id === "iphone" || s.id === "smarttv" || s.id === "geladeira");
      const winningSymbol = prizeOptions[Math.floor(Math.random() * prizeOptions.length)];
      setReelSymbols([winningSymbol, winningSymbol, winningSymbol]);
      setIsWinningRound(true);
      setWonPrize(winningSymbol);
    } else {
      setReelSymbols([getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
      setIsWinningRound(false);
    }
    
    setTimeout(() => {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); }
    }, 700);
    
    if (newClickCount === 2) {
      setTimeout(() => setShowPopup(true), 4000);
    }
    
    setTimeout(() => setIsSpinning(false), 3500);
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start px-4 py-6 overflow-hidden">
      {showWelcome && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 cursor-pointer animate-fade-in" onClick={() => setShowWelcome(false)}>
          <img src={telaPopup} alt="Tesouro da Sorte" className="w-full max-w-xs animate-scale-in drop-shadow-2xl rounded-2xl" />
          <p className="mt-8 text-foreground/80 text-lg animate-pulse">Toque para começar</p>
        </div>
      )}
      
      {showPopup && wonPrize && (
        <div className="popup-overlay animate-fade-in">
          <div className="popup-content">
            <h2 className="text-2xl font-bold text-primary mb-2">🎉 PARABÉNS!</h2>
            <p className="text-foreground/80 mb-4">Você ganhou:</p>
            <img src={wonPrize.image!} alt={wonPrize.id === "iphone" ? "iPhone 17 Pro Max" : wonPrize.id === "geladeira" ? "Geladeira Consul" : "Smart TV Samsung"} className="w-48 h-48 object-contain mx-auto mb-4 drop-shadow-2xl" />
            <p className="text-xl font-bold text-foreground mb-6">{wonPrize.id === "iphone" ? "iPhone 17 Pro Max" : wonPrize.id === "geladeira" ? "Geladeira Consul Frost Free" : "Smart TV Samsung HD"}</p>
            <a href={(() => {
              const base = wonPrize.id === "iphone" ? "/iphone.html" : wonPrize.id === "geladeira" ? "/geladeira.html" : "/smarttv.html";
              const params = new URLSearchParams(window.location.search);
              return params.toString() ? `${base}?${params.toString()}` : base;
            })()} className="btn-resgate inline-block w-full">
              🎉 RESGATAR PRÊMIO
            </a>
          </div>
        </div>
      )}
      
      <img src={logo} alt="Tesouro da Sorte" className="w-64 max-w-[80%] mb-4 drop-shadow-xl" />
      
      <p className="text-foreground text-center text-lg leading-relaxed mb-6 max-w-sm">
        Para vencer, você precisa ter 3 símbolos iguais na linha horizontal do meio, destacada com um <span className="text-primary font-bold">dourado</span> nas bordas
      </p>
      
      <div className="slot-container w-full max-w-sm p-4 shadow-glow-blue">
        <div className="bg-secondary/50 rounded-xl p-2 relative">
          <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary rounded-tl-lg" />
          <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-primary rounded-tr-lg" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-primary rounded-br-lg" />
          
          <div className="flex gap-1 relative">
            <div className="slot-frame" />
            <div className="slot-highlight" />
            <SlotReel spinning={isSpinning} finalSymbol={reelSymbols[0]} delay={0} isWinning={isWinningRound} />
            <SlotReel spinning={isSpinning} finalSymbol={reelSymbols[1]} delay={200} isWinning={isWinningRound} />
            <SlotReel spinning={isSpinning} finalSymbol={reelSymbols[2]} delay={400} isWinning={isWinningRound} />
          </div>
        </div>
        
        <div className="flex justify-between mt-3 px-4">
          <Clover className="text-accent opacity-60" size={24} />
          <button onClick={handleSpin} disabled={isSpinning || tentativas <= 0} className={`btn-spin-inline ${isSpinning ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            🍀
          </button>
          <Clover className="text-accent opacity-60" size={24} />
        </div>
      </div>
      
      <audio ref={audioRef}><source src="/click.mp3" type="audio/mpeg" /></audio>
      
      <p className="text-foreground/80 text-center mt-6 text-base">Clique no trevo para girar</p>
      
      <div className="mt-4 text-foreground text-xl flex items-center gap-3">
        <div className="flex gap-2">
          {[...Array(Math.min(tentativas, 10))].map((_, i) => (
            <span key={i} className="w-3 h-3 rounded-full bg-primary animate-pulse-scale" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <span className="text-muted-foreground">
          <strong className="text-primary">{tentativas}</strong> tentativas
        </span>
      </div>
      
      <button className="mt-6 text-muted-foreground underline text-sm hover:text-foreground transition-colors">Entenda os prêmios</button>
    </div>
  );
};

export default SlotGame;