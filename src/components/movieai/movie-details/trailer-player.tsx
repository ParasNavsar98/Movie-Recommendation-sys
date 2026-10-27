import { useEffect, useRef } from "react";
import { AlertCircle, X } from "lucide-react";

interface TrailerPlayerProps {
  trailerUrl: string | null;
  posterUrl: string | null;
  title: string;
  onClose: () => void;
}

export function TrailerPlayer({
  trailerUrl,
  posterUrl,
  title,
  onClose,
}: TrailerPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isYouTube = Boolean(
    trailerUrl &&
      (trailerUrl.includes("youtube.com") ||
        trailerUrl.includes("youtu.be") ||
        trailerUrl.includes("youtube-nocookie.com"))
  );

  return (
    <div
      role="dialog"
      aria-label={`Trailer for ${title}`}
      className="relative h-full w-full bg-black select-none"
    >
      {/* Top Action Bar: Title & Close Button */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent p-4 sm:p-6 pointer-events-auto">
        <span className="text-xs sm:text-sm font-medium tracking-wide text-zinc-300 drop-shadow-md truncate max-w-[70%]">
          Trailer: <span className="font-semibold text-white">{title}</span>
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close trailer"
          className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-black/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 backdrop-blur-md transition-all hover:scale-105 hover:border-zinc-400 hover:bg-zinc-900 hover:text-white"
        >
          <X size={15} />
          <span>Close</span>
        </button>
      </div>

      {trailerUrl ? (
        isYouTube ? (
          <div className="h-full w-full pt-12 sm:pt-14 pb-0 bg-black flex items-center justify-center">
            <iframe
              src={trailerUrl}
              title={`Trailer for ${title}`}
              className="h-full w-full border-0 aspect-video max-h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <video
            ref={videoRef}
            src={trailerUrl}
            poster={posterUrl || undefined}
            autoPlay
            controls
            playsInline
            className="h-full w-full object-contain"
          />
        )
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
          <AlertCircle size={44} className="text-zinc-500 mb-3" />
          <h3 className="text-lg font-semibold text-white">Trailer unavailable for this movie.</h3>
          <p className="mt-2 max-w-md text-xs sm:text-sm text-zinc-400 leading-relaxed">
            A verified high-definition trailer is not currently linked in the catalogue archive for{" "}
            <span className="text-zinc-200 font-medium">{title}</span>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 rounded-full border border-zinc-700 bg-zinc-900 px-6 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 hover:border-zinc-500"
          >
            Return to Backdrop
          </button>
        </div>
      )}
    </div>
  );
}
