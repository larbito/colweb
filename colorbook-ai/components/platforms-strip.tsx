"use client";

import { motion } from "framer-motion";

const platforms = [
  { name: "Amazon KDP", logo: "/logos/amazon-kdp.svg" },
  { name: "Etsy", logo: "/logos/etsy.svg" },
  { name: "Gumroad", logo: "/logos/gumroad.svg" },
  { name: "Lulu", logo: "/logos/lulu.svg" },
  { name: "IngramSpark", logo: "/logos/ingram.svg" },
  { name: "Shopify", logo: "/logos/shopify.svg" },
];

export function PlatformsStrip() {
  return (
    <section className="border-y border-border/50 bg-muted/20 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 text-center text-sm font-medium text-muted-foreground"
        >
          Works great for publishing on
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6"
        >
          {platforms.map((platform, i) => (
            <motion.div 
              key={platform.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="flex items-center gap-3 text-muted-foreground/70 hover:text-foreground transition-colors group cursor-default"
            >
              <img 
                src={platform.logo} 
                alt={platform.name}
                className="h-8 w-auto opacity-50 group-hover:opacity-80 transition-opacity grayscale group-hover:grayscale-0"
                style={{ filter: "grayscale(100%)" }}
              />
              <span className="text-sm font-medium">{platform.name}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

