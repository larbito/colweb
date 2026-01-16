"use client";

export function GradientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Mesh gradient blobs */}
      <div className="absolute -top-[40%] left-[10%] h-[600px] w-[600px] rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl" />
      <div className="absolute top-[20%] right-[10%] h-[500px] w-[500px] rounded-full bg-gradient-to-br from-secondary/30 via-secondary/10 to-transparent blur-3xl" />
      <div className="absolute bottom-[10%] left-[20%] h-[400px] w-[400px] rounded-full bg-gradient-to-br from-accent/20 via-transparent to-transparent blur-3xl" />
      
      {/* Subtle noise overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

