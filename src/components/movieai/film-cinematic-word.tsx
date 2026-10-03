import { useEffect, useRef, useState } from "react";
import { FilmIDoor } from "./film-i-door";

export function FilmCinematicWord() {
  const footerRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("resize", checkMobile);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    let animFrameId: number;

    const updateScrollProgress = () => {
      if (footerRef.current) {
        const rect = footerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        const rawProgress =
          (windowHeight - rect.top) / (windowHeight * 0.75);

        const clampedProgress = Math.max(0, Math.min(1, rawProgress));

        setProgress(clampedProgress);
      }

      animFrameId = requestAnimationFrame(updateScrollProgress);
    };

    animFrameId = requestAnimationFrame(updateScrollProgress);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  return (
    <footer
      ref={footerRef}
      className="relative flex h-[calc(100vh-58px)] w-full items-start overflow-hidden bg-white text-foreground"
    >
      <div className="w-full overflow-hidden text-center">
        <div className="relative mx-auto flex w-full items-start justify-center whitespace-nowrap select-none">
          <div className="font-swizzy flex items-start justify-center text-[clamp(16rem,62vw,66rem)] font-medium leading-[0.82] tracking-[-0.03em] text-[#111111]">
            <span>F</span>
            <span>l</span>

            <FilmIDoor
              progress={progress}
              isMobile={isMobile}
              isReducedMotion={isReducedMotion}
            />

            <span>m</span>
          </div>
        </div>
      </div>
    </footer>
  );
}