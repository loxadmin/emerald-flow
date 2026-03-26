import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import FluidCanvas from "@/components/FluidCanvas";
import { GlassButton } from "@/components/ui/glass-button";
import MotionWrapper from "@/components/MotionWrapper";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <FluidCanvas />
      <MotionWrapper className="relative z-10 text-center">
        <h1 className="mb-4 text-6xl font-bold text-gradient">404</h1>
        <p className="mb-6 text-xl text-white/40">Oops! Page not found</p>
        <a href="/">
          <GlassButton variant="glow">Return to Home</GlassButton>
        </a>
      </MotionWrapper>
    </div>
  );
};

export default NotFound;
