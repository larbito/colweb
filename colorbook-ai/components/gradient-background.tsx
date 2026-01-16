"use client";

export function GradientBackground() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* Main mesh gradient */}
        <div className="absolute -top-[50%] left-0 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-[120px]" />
        <div className="absolute top-[30%] right-[5%] h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-blue-500/20 via-transparent to-transparent blur-[100px]" />
        <div className="absolute bottom-[20%] left-[30%] h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-purple-500/15 via-transparent to-transparent blur-[100px]" />
        
        {/* Subtle grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
        
        {/* Noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
          }}
        />
      </div>
      
      {/* Radial fade overlay */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-radial from-transparent via-background/50 to-background" />
    </>
  );
}

