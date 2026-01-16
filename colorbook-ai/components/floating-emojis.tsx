"use client";

import { motion, useReducedMotion } from "framer-motion";

const emojis = [
  { emoji: "🐼", x: "5%", y: "8%", delay: 0, size: "text-4xl" },
  { emoji: "📘", x: "92%", y: "12%", delay: 0.5, size: "text-3xl" },
  { emoji: "✨", x: "8%", y: "35%", delay: 1, size: "text-3xl" },
  { emoji: "🖍️", x: "88%", y: "28%", delay: 1.5, size: "text-4xl" },
  { emoji: "📄", x: "3%", y: "55%", delay: 2, size: "text-3xl" },
  { emoji: "🖨️", x: "95%", y: "50%", delay: 2.5, size: "text-3xl" },
  { emoji: "📐", x: "10%", y: "75%", delay: 3, size: "text-2xl" },
  { emoji: "🎨", x: "90%", y: "70%", delay: 3.5, size: "text-3xl" },
  { emoji: "⭐", x: "6%", y: "90%", delay: 4, size: "text-2xl" },
  { emoji: "📚", x: "93%", y: "88%", delay: 4.5, size: "text-3xl" },
];

export function FloatingEmojis() {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {emojis.map((item, i) => (
          <div
            key={i}
            className={`absolute opacity-40 ${item.size}`}
            style={{ left: item.x, top: item.y }}
          >
            {item.emoji}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {emojis.map((item, i) => (
        <motion.div
          key={i}
          className={`absolute ${item.size}`}
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
            y: [0, -15, 0],
            scale: 1,
          }}
          transition={{
            opacity: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: item.delay },
            y: { duration: 5 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: item.delay },
            scale: { duration: 0.6, delay: item.delay },
          }}
        >
          {item.emoji}
        </motion.div>
      ))}
    </div>
  );
}
