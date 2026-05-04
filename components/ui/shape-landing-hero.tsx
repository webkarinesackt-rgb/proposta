"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate: rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border border-[rgba(139,183,175,0.18)]",
            "shadow-[0_8px_32px_0_rgba(139,183,175,0.08)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(184,212,208,0.12),transparent_70%)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

function HeroGeometric({
  badge = "Fysi Lab Digital",
  title1 = "Transforme sua presença",
  title2 = "digital agora",
  onAccept,
}: {
  badge?: string;
  title1?: string;
  title2?: string;
  onAccept?: () => void;
}) {
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
      },
    }),
  };

  return (
    <div
      className="relative w-full flex items-center justify-center overflow-hidden py-20 md:min-h-screen md:py-0"
      style={{ background: 'var(--bg-void)' }}
    >
      {/* Ambient teal glow */}
      <div
        className="absolute inset-0 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(139,183,175,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(244,249,157,0.03) 0%, transparent 60%)' }}
      />

      <div className="absolute inset-0 overflow-hidden">
        {/* Large teal shape — left */}
        <ElegantShape
          delay={0.3} width={600} height={140} rotate={12}
          gradient="from-[rgba(139,183,175,0.12)]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />
        {/* Neon citron shape — right bottom */}
        <ElegantShape
          delay={0.5} width={500} height={120} rotate={-15}
          gradient="from-[rgba(244,249,157,0.1)]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
        />
        {/* Mid teal shape — left bottom */}
        <ElegantShape
          delay={0.4} width={300} height={80} rotate={-8}
          gradient="from-[rgba(111,163,154,0.12)]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
        />
        {/* Small neon — right top */}
        <ElegantShape
          delay={0.6} width={200} height={60} rotate={20}
          gradient="from-[rgba(184,212,208,0.1)]"
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
        />
        {/* Tiny teal — left top */}
        <ElegantShape
          delay={0.7} width={150} height={40} rotate={-25}
          gradient="from-[rgba(139,183,175,0.08)]"
          className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-8 md:mb-12"
            style={{
              background: 'rgba(139,183,175,0.07)',
              border: '1px solid rgba(139,183,175,0.18)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--teal)' }}
            />
            <span
              className="text-sm tracking-wide"
              style={{ color: 'var(--text-secondary)' }}
            >
              {badge}
            </span>
          </motion.div>

          <motion.div custom={1} variants={fadeUpVariants} initial="hidden" animate="visible">
            <h1
              className="font-bold mb-8 md:mb-10 tracking-tight"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', lineHeight: 1.1 }}
            >
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(to bottom, var(--text-primary), rgba(240,246,245,0.75))' }}
              >
                {title1}
              </span>
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(to right, var(--teal), var(--green-pastel), var(--neon))' }}
              >
                {title2}
              </span>
            </h1>
          </motion.div>

          {onAccept && (
            <motion.div custom={2} variants={fadeUpVariants} initial="hidden" animate="visible">
              <button
                onClick={onAccept}
                className="inline-flex items-center gap-2 group"
                style={{
                  padding: '1rem 2.25rem',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #C8E6E0 0%, var(--green-pastel) 50%, #A8D4CC 100%)',
                  color: '#071F20',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 32px rgba(184,212,208,0.3)',
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 48px rgba(184,212,208,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 32px rgba(184,212,208,0.3)'; e.currentTarget.style.transform = 'none' }}
              >
                Aceitar proposta
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}
        </div>
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--bg-void) 0%, transparent 30%, transparent 70%, var(--bg-void) 100%)' }}
      />
    </div>
  );
}

export { HeroGeometric };
