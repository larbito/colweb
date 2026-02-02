"use client";

export function GradientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      {/* Main radial gradient - subtle teal accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(160_84%_39%/0.08),transparent_70%)]" />
      
      {/* Secondary gradient - bottom */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,hsl(0_0%_100%/0.02),transparent_60%)]" />
      
      {/* Grid pattern - subtle */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
}
