import { useEffect, useRef, useState } from "react";
import { Film, Sparkles } from "lucide-react";
import { viewerTestimonials } from "./viewer-testimonial-data";
import { ViewerTestimonialCard } from "./viewer-testimonial-card";
import { MaskGroup, MaskReveal } from "./mask-reveal";

export function ViewerTestimonialWall() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const singleTrackRef = useRef<HTMLDivElement>(null);

  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Physics & Animation state refs (kept in refs to avoid React re-render lags)
  const offsetRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartOffsetRef = useRef<number>(0);

  const lastPointerXRef = useRef<number>(0);
  const lastPointerTimeRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  useEffect(() => {
    if (isReducedMotion) return;

    const autoSpeed = 0.85; // Base auto scroll speed in px per frame

    const tick = () => {
      if (trackRef.current && singleTrackRef.current) {
        const singleWidth = singleTrackRef.current.offsetWidth || 1;

        if (!isDraggingRef.current) {
          // If momentum velocity exists, apply decay
          if (Math.abs(velocityRef.current) > 0.05) {
            offsetRef.current += velocityRef.current;
            velocityRef.current *= 0.94; // Smooth damping
          } else {
            velocityRef.current = 0;
            offsetRef.current += autoSpeed;
          }
        }

        // Wrap around seamlessly
        if (offsetRef.current >= singleWidth) {
          offsetRef.current %= singleWidth;
        } else if (offsetRef.current < 0) {
          offsetRef.current = singleWidth + (offsetRef.current % singleWidth);
        }

        // Apply hardware-accelerated transform
        trackRef.current.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
      }

      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isReducedMotion]);

  // Pointer event handlers for drag & touch interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isReducedMotion) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;

    lastPointerXRef.current = e.clientX;
    lastPointerTimeRef.current = performance.now();
    velocityRef.current = 0;

    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - dragStartXRef.current;
    offsetRef.current = dragStartOffsetRef.current - deltaX;

    const now = performance.now();
    const dt = now - lastPointerTimeRef.current;
    if (dt > 8) {
      const dx = lastPointerXRef.current - e.clientX;
      velocityRef.current = (dx / dt) * 16; // Normalize to roughly px per 60fps frame
      lastPointerXRef.current = e.clientX;
      lastPointerTimeRef.current = now;
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (containerRef.current) {
      try {
        containerRef.current.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if capture was already released
      }
    }
  };

  // Trackpad horizontal wheel support
  const handleWheel = (e: React.WheelEvent) => {
    if (isReducedMotion) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      offsetRef.current += e.deltaX;
      velocityRef.current = e.deltaX * 0.4;
    }
  };

  return (
    <section
      id="viewers-saying"
      aria-label="What Viewers Are Saying"
      className="grid-background relative flex min-h-[90vh] w-full flex-col justify-between overflow-hidden border-b border-border py-20 md:min-h-screen md:py-28"
    >
      {/* Editorial Header Section */}
      <MaskGroup className="mx-auto flex w-full max-w-[1600px] flex-col items-center px-5 text-center md:px-10">
        {/* Top Eyebrow Tag */}
        <MaskReveal delay={0}>
          <div className="technical mb-5 flex items-center justify-center gap-2 text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 bg-primary" aria-hidden="true" />
            <span>03 / WHAT VIEWERS ARE SAYING</span>
          </div>
        </MaskReveal>

        {/* Display Headline */}
        <h2 className="display max-w-[1200px] text-[clamp(2.3rem,5.2vw,5.5rem)] text-foreground">
          <MaskReveal delay={120}>
            <span>MOVIES AREN'T ONE-SIZE-FITS-ALL.</span>
          </MaskReveal>
          <MaskReveal delay={240}>
            <span className="text-muted-foreground">
              THEY SHOULDN'T BE RECOMMENDED THAT WAY EITHER.
            </span>
          </MaskReveal>
        </h2>

        {/* Center Accent Icon */}
        <MaskReveal delay={360}>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-border md:w-20" />
            <div className="flex h-9 w-9 items-center justify-center rounded-none border border-foreground bg-foreground text-primary shadow-sm">
              <Film className="h-4 w-4" />
            </div>
            <div className="h-px w-12 bg-border md:w-20" />
          </div>
        </MaskReveal>
      </MaskGroup>

      {/* Draggable Testimonial Canvas Track */}
      <MaskReveal delay={200} className="mt-14 w-full md:mt-20">
        {isReducedMotion ? (
          /* Reduced Motion Fallback */
          <div className="flex w-full gap-6 overflow-x-auto px-6 pb-6">
            {viewerTestimonials.map((item) => (
              <ViewerTestimonialCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          /* High-Performance Infinite Track */
          <div
            ref={containerRef}
            className="w-full overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrCancel}
            onPointerCancel={handlePointerUpOrCancel}
            onWheel={handleWheel}
          >
            <div
              ref={trackRef}
              className="flex w-max items-stretch gap-8 py-6 transition-none will-change-transform md:gap-10"
            >
              {/* Dataset Copy 1 (Used for track dimension measurement) */}
              <div ref={singleTrackRef} className="flex shrink-0 items-stretch gap-8 md:gap-10">
                {viewerTestimonials.map((item) => (
                  <ViewerTestimonialCard key={`set1-${item.id}`} item={item} />
                ))}
              </div>

              {/* Dataset Copy 2 (Enables seamless infinite wrapping) */}
              <div className="flex shrink-0 items-stretch gap-8 md:gap-10" aria-hidden="true">
                {viewerTestimonials.map((item) => (
                  <ViewerTestimonialCard key={`set2-${item.id}`} item={item} />
                ))}
              </div>

              {/* Dataset Copy 3 (Ensures full wide screen coverage during fast drags) */}
              <div className="flex shrink-0 items-stretch gap-8 md:gap-10" aria-hidden="true">
                {viewerTestimonials.map((item) => (
                  <ViewerTestimonialCard key={`set3-${item.id}`} item={item} />
                ))}
              </div>
            </div>
          </div>
        )}
      </MaskReveal>

      {/* Editorial Footer Caption */}
      <div className="mx-auto mt-12 flex w-full max-w-[1600px] items-center justify-between px-5 text-muted-foreground md:px-10">
        <span className="technical">DRAG CANVAS TO EXPLORE TASTES</span>
        <span className="technical flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-signal" />
          MOVIEAI CONCEPT WALL
        </span>
      </div>
    </section>
  );
}
