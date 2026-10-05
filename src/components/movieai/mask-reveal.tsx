import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const MaskGroupContext = createContext<boolean>(false);

export interface MaskGroupProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
}

export function MaskGroup({
  children,
  className = "",
  threshold = 0.2,
}: MaskGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsRevealed(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={containerRef} className={className}>
      <MaskGroupContext.Provider value={isRevealed}>
        {children}
      </MaskGroupContext.Provider>
    </div>
  );
}

export interface MaskRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  threshold?: number;
  block?: boolean;
  as?: any;
}

export function MaskReveal({
  children,
  className = "",
  delay = 2,
  duration = 1.5,
  threshold = 0.2,
  block = true,
  as: Component = "div",
}: MaskRevealProps) {
  const parentRevealed = useContext(MaskGroupContext);
  const selfRef = useRef<HTMLElement>(null);
  const [selfRevealed, setSelfRevealed] = useState(false);

  const isRevealed = parentRevealed || selfRevealed;

  useEffect(() => {
    if (parentRevealed) return;
    const el = selfRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSelfRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSelfRevealed(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [parentRevealed, threshold]);

  return (
    <Component
      ref={selfRef as any}
      className={`overflow-hidden ${block ? "block" : "inline-block"} ${className}`}
    >
      <div
        className="transform-gpu transition-all ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: isRevealed ? "translate3d(0, 0, 0)" : "translate3d(0, 110%, 0)",
          opacity: isRevealed ? 1 : 0,
          transitionDuration: `${duration}s`,
          transitionDelay: `${delay}ms`,
          willChange: "transform, opacity",
        }}
      >
        {children}
      </div>
    </Component>
  );
}
