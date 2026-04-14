import { useRef, useEffect, useCallback } from "react";

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  startTime: number;
  duration: number;
}

interface Dot {
  x: number;
  y: number;
  opacity: number;
  startTime: number;
  duration: number;
}

const BLUE = "#4A7AB5";

const ParticleCanvas = ({ triggerCount }: { triggerCount: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const dotsRef = useRef<Dot[]>([]);
  const animFrameRef = useRef<number>(0);
  const prevTrigger = useRef(0);

  const spawnEvent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    // Bias toward center
    const x = w * 0.3 + Math.random() * w * 0.4;
    const y = h * 0.2 + Math.random() * h * 0.6;

    ripplesRef.current.push({
      x, y,
      radius: 0,
      maxRadius: 60 + Math.random() * 40,
      opacity: 0.5,
      startTime: performance.now(),
      duration: 1200,
    });

    dotsRef.current.push({
      x, y,
      opacity: 0.8,
      startTime: performance.now(),
      duration: 800,
    });
  }, []);

  useEffect(() => {
    if (triggerCount > prevTrigger.current) {
      const diff = triggerCount - prevTrigger.current;
      for (let i = 0; i < diff; i++) {
        setTimeout(() => spawnEvent(), i * 150);
      }
    }
    prevTrigger.current = triggerCount;
  }, [triggerCount, spawnEvent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Draw ripples
      ripplesRef.current = ripplesRef.current.filter((r) => {
        const t = (now - r.startTime) / r.duration;
        if (t > 1) return false;
        const radius = r.maxRadius * t;
        const opacity = r.opacity * (1 - t);
        ctx.beginPath();
        ctx.arc(r.x / 2, r.y / 2, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(74, 122, 181, ${opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        return true;
      });

      // Draw dots
      dotsRef.current = dotsRef.current.filter((d) => {
        const t = (now - d.startTime) / d.duration;
        if (t > 1) return false;
        const opacity = d.opacity * (1 - t);
        ctx.beginPath();
        ctx.arc(d.x / 2, d.y / 2, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(74, 122, 181, ${opacity})`;
        ctx.fill();
        return true;
      });

      // Subtle ambient shimmer
      const shimmer = Math.sin(now / 2000) * 0.02 + 0.02;
      ctx.fillStyle = `rgba(74, 122, 181, ${shimmer})`;
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
};

export default ParticleCanvas;
