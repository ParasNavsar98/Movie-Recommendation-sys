import { useEffect, useRef } from "react";
import { type FilmCinematicData, defaultFilmCinematicData } from "./film-cinematic-data";

type FilmIDoorProps = {
  progress: number;
  data?: FilmCinematicData;
  isMobile?: boolean;
  isReducedMotion?: boolean;
};

export function FilmIDoor({
  progress,
  data = defaultFilmCinematicData,
  isMobile = false,
  isReducedMotion = false,
}: FilmIDoorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay fallback
      });
    }
  }, []);

  // Compute rotation angle based on scroll progress
  const maxRotation = isMobile ? -80 : 100;
  const rotationY = isReducedMotion ? -30 : progress * maxRotation;

  return (
    <span className="relative inline-block align-baseline mx-[0.02em]">
      {/* TOP PART: Video Frame + 3D Door Panel (Positioned directly above the i-stem as its dot) */}
      <span
        className="absolute left-1/2 bottom-full mb-[-0.225em] -translate-x-1/2 block aspect-square w-[0.18em] select-none"
        style={{ perspective: "1000px" }}
      >
        {/* Cinematic Video Layer */}
        <span className="relative block h-full w-full overflow-hidden rounded-[2px] bg-[#111111] shadow-2xl">
          <video
            ref={videoRef}
            src={data.videoUrl}
            poster={data.posterUrl}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        </span>

        {/* 3D Rotating Door Panel (Hinged on the left vertical edge) */}
        <span
          className="absolute inset-0 z-20 block origin-right rounded-[2px] bg-[#111111] shadow-2xl transition-transform duration-500 ease-in"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateY(${rotationY}deg)`,
            willChange: "transform",
          }}
        >
          {/* Solid #111111 face matching the typography */}
          <span className="block h-full w-full bg-[#111111] border-r border-primary/30" />
        </span>
      </span>

      {/* BOTTOM PART: Typographic Stem of lowercase 'i' (Sitting natively on the font baseline) */}
      <span className="inline-block h-[0.52em] w-[0.2em] rounded-[1px] bg-[#111111] align-baseline" />
    </span>
  );
}
