"use client";

export function GradientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      {/* Main radial gradient - subtle accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--accent)/0.1),transparent_70%)]" />
      
      {/* Secondary gradient - bottom */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,hsl(var(--muted)/0.3),transparent_60%)]" />
      
      {/* Grid pattern - subtle */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
}
