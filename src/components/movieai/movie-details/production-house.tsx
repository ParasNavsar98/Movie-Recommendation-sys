import { Clapperboard } from "lucide-react";

interface ProductionHouseProps {
  studio: string | null;
}

export function ProductionHouse({ studio }: ProductionHouseProps) {
  return (
    <section aria-labelledby="production-heading" className="space-y-3">
      <h2
        id="production-heading"
        className="text-xl font-semibold tracking-tight text-white md:text-2xl"
      >
        Production House
      </h2>

      <div>
        {studio ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-700/80 bg-[#121214] px-4 py-2.5 text-xs font-semibold text-zinc-200">
            <Clapperboard size={15} className="text-purple-400" />
            <span>{studio}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3.5 py-2 text-xs text-zinc-500">
            <span>Independent / Production studio undisclosed</span>
          </div>
        )}
      </div>
    </section>
  );
}
