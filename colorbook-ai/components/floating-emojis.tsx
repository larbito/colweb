"use client";

import { motion, useReducedMotion } from "framer-motion";

const emojis = [
  { emoji: "🐼", x: "-5%", y: "10%", delay: 0, size: "text-4xl" },
  { emoji: "📘", x: "100%", y: "5%", delay: 0.5, size: "text-3xl" },
  { emoji: "✨", x: "-10%", y: "60%", delay: 1, size: "text-3xl" },
  { emoji: "🖍️", x: "105%", y: "50%", delay: 1.5, size: "text-4xl" },
  { emoji: "📄", x: "-8%", y: "35%", delay: 2, size: "text-3xl" },
  { emoji: "🖨️", x: "102%", y: "85%", delay: 2.5, size: "text-3xl" },
  { emoji: "📐", x: "0%", y: "90%", delay: 3, size: "text-2xl" },
];

interface FloatingEmojisProps {
  className?: string;
}

export function FloatingEmojis({ className = "" }: FloatingEmojisProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className={`pointer-events-none absolute inset-0 z-0 overflow-visible ${className}`}>
        {emojis.map((item, i) => (
          <div
            key={i}
            className={`absolute opacity-30 ${item.size}`}
            style={{ left: item.x, top: item.y }}
          >
            {item.emoji}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`pointer-events-none absolute inset-0 z-0 overflow-visible ${className}`}>
      {emojis.map((item, i) => (
        <motion.div
          key={i}
          className={`absolute ${item.size}`}
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0.2, 0.35, 0.2],
            y: [0, -12, 0],
            scale: 1,
          }}
          transition={{
            opacity: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: item.delay },
            y: { duration: 4 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: item.delay },
            scale: { duration: 0.6, delay: item.delay },
          }}
        >
          {item.emoji}
        </motion.div>
      ))}
    </div>
  );
}
