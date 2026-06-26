import { useEffect, useRef, useState } from 'react';

interface RevealLayerProps {
  image: string;
  cursorX: number;
  cursorY: number;
}

export function RevealLayer({ image, cursorX, cursorY }: RevealLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const revealDivRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const SPOTLIGHT_R = 260;

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    // Initial size
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const revealDiv = revealDivRef.current;
    if (!canvas || !revealDiv) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Build radial gradient at (cursorX, cursorY)
    // 0 -> rgba(255,255,255,1), 0.4 -> 1, 0.6 -> 0.75, 0.75 -> 0.4, 0.88 -> 0.12, 1 -> 0.
    const grad = ctx.createRadialGradient(
      cursorX,
      cursorY,
      0,
      cursorX,
      cursorY,
      SPOTLIGHT_R
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.75)');
    grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.4)');
    grad.addColorStop(0.88, 'rgba(255, 255, 255, 0.12)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    // Fill arc
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, SPOTLIGHT_R, 0, Math.PI * 2);
    ctx.fill();

    // Export to Data URL and apply mask
    try {
      const dataUrl = canvas.toDataURL();
      revealDiv.style.maskImage = `url(${dataUrl})`;
      revealDiv.style.webkitMaskImage = `url(${dataUrl})`;
      revealDiv.style.maskSize = '100% 100%';
      revealDiv.style.webkitMaskSize = '100% 100%';
    } catch {
      // Safe fallback
    }
  }, [cursorX, cursorY, dimensions]);

  return (
    <>
      <canvas
        id="reveal-layer-canvas"
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0 pointer-events-none"
        style={{ display: 'none' }}
      />
      <div
        id="reveal-layer-div"
        ref={revealDivRef}
        className="absolute inset-0 bg-center bg-cover bg-no-repeat z-30 pointer-events-none"
        style={{ backgroundImage: `url(${image})` }}
      />
    </>
  );
}
