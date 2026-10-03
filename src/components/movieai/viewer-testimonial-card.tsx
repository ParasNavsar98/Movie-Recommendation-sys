import type { ViewerTestimonial } from "./viewer-testimonial-data";

type ViewerTestimonialCardProps = {
  item: ViewerTestimonial;
};

export function ViewerTestimonialCard({ item }: ViewerTestimonialCardProps) {
  return (
    <div
      className={`relative shrink-0 ${item.width || "w-[440px]"} w-[85vw] sm:w-[420px] md:w-[470px] select-none transition-transform duration-300 hover:scale-[1.01]`}
    >
      {/* Top Left Green Badge Icon matching reference screenshot */}
      {item.hasBadge && (
        <div className="absolute -top-4 -left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#15803d] p-1.5 shadow-md ring-4 ring-[#f8f9fa]">
          <div className="h-3.5 w-3.5 rounded-full bg-black" />
        </div>
      )}

      {/* Large Editorial Card Surface matching reference image */}
      <article className="flex h-full min-h-[420px] md:min-h-[460px] flex-col justify-between rounded-[22px] border border-black/5 bg-white p-8 md:p-11 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        {/* Large Bold Quote */}
        <p className="text-2xl font-semibold leading-[1.3] tracking-tight text-foreground md:text-[27px]">
          {item.quote}
        </p>

        {/* Author Metadata at bottom */}
        <div className="mt-10 flex flex-col gap-0.5 pt-4">
          <span className="text-base font-semibold text-foreground md:text-[17px]">
            {item.author}
          </span>
          <span className="text-xs font-normal text-muted-foreground md:text-sm">
            {item.role}
          </span>
        </div>
      </article>
    </div>
  );
}
