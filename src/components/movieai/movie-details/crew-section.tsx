import { User } from "lucide-react";
import type { CrewMember } from "./types";

interface CrewSectionProps {
  crew: CrewMember[];
}

export function CrewSection({ crew }: CrewSectionProps) {
  if (crew.length === 0) return null;

  return (
    <section aria-labelledby="crew-heading" className="space-y-4">
      <h2
        id="crew-heading"
        className="text-xl font-semibold tracking-tight text-white md:text-2xl"
      >
        Crew
      </h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {crew.map((member) => {
          const initials = member.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-[#121214] p-3"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-zinc-300">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : initials ? (
                  initials
                ) : (
                  <User size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {member.name}
                </p>
                <p className="truncate text-[11px] text-zinc-400">
                  {member.role}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
