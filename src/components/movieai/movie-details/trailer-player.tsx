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

  return (
    <div className="relative h-full w-full bg-black">
      {/* Top action bar: Title & Close Button */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 sm:p-6">
        <span className="text-sm font-medium tracking-wide text-zinc-300">
          Trailer: <span className="font-semibold text-white">{title}</span>
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close trailer"
          className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-black/70 px-3 py-1.5 text-xs font-semibold text-zinc-200 backdrop-blur-md transition-colors hover:border-zinc-500 hover:bg-zinc-800 hover:text-white"
        >
          <X size={15} />
          <span>Close</span>
        </button>
      </div>

      {trailerUrl ? (
        <video
          ref={videoRef}
          src={trailerUrl}
          poster={posterUrl || undefined}
          autoPlay
          controls
          playsInline
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
          <AlertCircle size={40} className="text-zinc-500 mb-3" />
          <h3 className="text-lg font-semibold text-white">Trailer Unavailable</h3>
          <p className="mt-1 max-w-md text-sm text-zinc-400">
            A verified high-definition trailer is not yet linked in the catalogue archive for{" "}
            <span className="text-zinc-200 font-medium">{title}</span>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 rounded-full border border-zinc-700 bg-zinc-900 px-5 py-2 text-xs font-medium text-white hover:bg-zinc-800"
          >
            Return to Backdrop
          </button>
        </div>
      )}
    </div>
  );
}
