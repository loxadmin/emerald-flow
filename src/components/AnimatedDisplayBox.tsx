import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface AnimatedDisplayBoxProps {
  children: React.ReactNode;
}

export default function AnimatedDisplayBox({ children }: AnimatedDisplayBoxProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative z-10 rounded-[4rem] border-4 border-white/20 bg-white/5 p-4 backdrop-blur-2xl shadow-[0_50px_100px_rgba(0,0,0,0.3),inset_0_2px_20px_rgba(255,255,255,0.2)] overflow-hidden transition-all duration-200"
    >
      {/* 3D Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

      {/* Claymorphism Inner Shadows */}
      <div className="absolute inset-4 rounded-[3.5rem] shadow-[inset_0_0_40px_rgba(255,255,255,0.05)] pointer-events-none border border-white/10" />

      <div style={{ transform: "translateZ(50px)" }} className="relative">
        {children}
      </div>

      {/* Decorative Glows */}
      <div className="absolute -top-20 -right-20 h-64 w-64 bg-primary/20 blur-[100px] rounded-full" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 bg-primary/10 blur-[100px] rounded-full" />
    </motion.div>
  );
}
