"use client";

import { motion, useReducedMotion } from "framer-motion";

const emojis = [
  { emoji: "🎨", x: "10%", y: "20%", delay: 0 },
  { emoji: "📚", x: "85%", y: "15%", delay: 0.5 },
  { emoji: "✨", x: "15%", y: "70%", delay: 1 },
  { emoji: "🖌️", x: "90%", y: "60%", delay: 1.5 },
  { emoji: "📖", x: "5%", y: "45%", delay: 2 },
  { emoji: "🌟", x: "80%", y: "85%", delay: 2.5 },
];

export function FloatingEmojis() {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 -z-5 overflow-hidden">
      {emojis.map((item, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl opacity-20 sm:text-3xl md:text-4xl"
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: 0.15, 
            scale: 1,
            y: [0, -15, 0],
          }}
          transition={{
            opacity: { duration: 0.5, delay: item.delay },
            scale: { duration: 0.5, delay: item.delay },
            y: { 
              duration: 3 + i * 0.5, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: item.delay 
            },
          }}
        >
          {item.emoji}
        </motion.div>
      ))}
    </div>
  );
}

