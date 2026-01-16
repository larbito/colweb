"use client";

import { motion, useReducedMotion } from "framer-motion";

const emojis = [
  { emoji: "🐼", x: "5%", y: "15%", delay: 0, size: "text-3xl" },
  { emoji: "📘", x: "85%", y: "10%", delay: 0.5, size: "text-2xl" },
  { emoji: "✨", x: "10%", y: "65%", delay: 1, size: "text-2xl" },
  { emoji: "🖍️", x: "90%", y: "55%", delay: 1.5, size: "text-3xl" },
  { emoji: "📄", x: "0%", y: "40%", delay: 2, size: "text-2xl" },
  { emoji: "🖨️", x: "95%", y: "80%", delay: 2.5, size: "text-2xl" },
  { emoji: "📐", x: "8%", y: "85%", delay: 3, size: "text-xl" },
];

export function FloatingEmojis() {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {emojis.map((item, i) => (
          <div
            key={i}
            className={`absolute opacity-20 ${item.size}`}
            style={{ left: item.x, top: item.y }}
          >
            {item.emoji}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {emojis.map((item, i) => (
        <motion.div
          key={i}
          className={`absolute ${item.size}`}
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: [0.15, 0.25, 0.15],
            y: [0, -10, 0],
            scale: 1,
          }}
          transition={{
            opacity: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: item.delay },
            y: { duration: 5 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: item.delay },
            scale: { duration: 0.5, delay: item.delay },
          }}
        >
          <span className="drop-shadow-sm filter">{item.emoji}</span>
        </motion.div>
      ))}
    </div>
  );
}

