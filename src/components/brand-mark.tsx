import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return <span className={cn("brand-mark", className)} aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span className="brand-mark__leaf" key={index} />)}</span>;
}

export function LifeOrbit({ className }: { className?: string }) {
  return <div className={cn("life-orbit", className)} aria-hidden="true"><span className="life-orbit__ring life-orbit__ring--one"/><span className="life-orbit__ring life-orbit__ring--two"/><span className="life-orbit__ring life-orbit__ring--three"/><span className="life-orbit__core"><BrandMark /></span><span className="life-orbit__satellite life-orbit__satellite--one"/><span className="life-orbit__satellite life-orbit__satellite--two"/></div>;
}
