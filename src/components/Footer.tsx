import { Link } from "react-router-dom";
import Logo from "./Logo";

interface FooterProps {
  content?: string | null;
}

export default function Footer({ content }: FooterProps) {
  const defaultContent = "Karbali is a customer acquisition and advertising platform that helps businesses get users through targeted campaigns and performance-based marketing.";

  return (
    <footer className="relative z-10 border-t border-border/50 py-16 px-6 sm:px-10">
      <div className="mx-auto max-w-7xl flex flex-col items-center justify-center text-center gap-6">
        <div className="flex items-center gap-2">
          <Logo size={20} />
          <span className="text-lg font-bold text-gradient">Karbali Ads</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-md">{content || defaultContent}</p>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <Link to="/about" className="hover:text-primary transition-colors">About</Link>
          <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
          <Link to="/learn" className="hover:text-primary transition-colors">Learn</Link>
          <Link to="/use-cases" className="hover:text-primary transition-colors">Use Cases</Link>
          <Link to="/what-is-karbali" className="hover:text-primary transition-colors">What is Karbali?</Link>
          <Link to="/affiliates" className="hover:text-primary transition-colors">Affiliate</Link>
          <Link to="/docs" className="hover:text-primary transition-colors">Docs</Link>
          <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
        </div>
        <p className="text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Karbali Ads. All rights reserved.</p>
      </div>
    </footer>
  );
}
