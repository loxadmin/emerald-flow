import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper from "@/components/MotionWrapper";
import { ArrowLeft, Calendar, User, Share2, MessageCircle, Send, Link2, CheckCircle2 } from "lucide-react";
import Logo from "@/components/Logo";
import { GlassButton } from "@/components/ui/glass-button";
import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Helmet } from "react-helmet-async";

interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
}

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetchBlog();
  }, [slug]);

  const fetchBlog = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blogs" as any)
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error || !data) {
      navigate("/blog");
    } else {
      setBlog(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!blog) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": blog.title,
    "description": blog.meta_description || blog.excerpt,
    "author": {
      "@type": "Organization",
      "name": "Karbali Ads"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Karbali Ads",
      "logo": {
        "@type": "ImageObject",
        "url": "https://karbali.com/logo.png"
      }
    },
    "datePublished": blog.created_at,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://karbali.com/blog/${blog.slug}`
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>{blog.meta_title || blog.title}</title>
        <meta name="description" content={blog.meta_description || blog.excerpt || ""} />
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <FluidCanvas />

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-md border-b border-border py-2">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={22} />
              <span className="text-lg font-bold tracking-tight">Karbali Ads</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/blog" className="hidden text-sm transition-colors sm:block text-muted-foreground hover:text-primary">Blog</Link>
              <button onClick={toggleTheme} className="rounded-lg p-2 text-muted-foreground hover:text-primary">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link to="/signup">
                <GlassButton variant="default" size="sm">Get Started</GlassButton>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20 px-6">
        <div className="mx-auto max-w-3xl">
          <MotionWrapper>
            <Link to="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
            </Link>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6 font-medium uppercase tracking-widest">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(blog.created_at).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><User className="h-3 w-3" /> Karbali Team</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-8 leading-tight">
              {blog.title}
            </h1>

            {blog.excerpt && (
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed italic border-l-4 border-primary/30 pl-6 mb-12">
                {blog.excerpt}
              </p>
            )}

            <div className="prose prose-invert max-w-none prose-emerald prose-headings:font-extrabold prose-headings:tracking-tight prose-p:text-lg prose-p:leading-relaxed prose-a:text-primary">
              <ReactMarkdown>{blog.content || ""}</ReactMarkdown>
            </div>

            <div className="mt-16 pt-8 border-t border-border/30 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-muted-foreground">Share:</span>
                <div className="flex gap-2">
                  <GlassButton variant="ghost" size="sm" className="rounded-full w-10 h-10 p-0">
                    <MessageCircle className="h-4 w-4" />
                  </GlassButton>
                  <GlassButton variant="ghost" size="sm" className="rounded-full w-10 h-10 p-0">
                    <Send className="h-4 w-4" />
                  </GlassButton>
                  <GlassButton variant="ghost" size="sm" className="rounded-full w-10 h-10 p-0">
                    <Link2 className="h-4 w-4" />
                  </GlassButton>
                </div>
              </div>

              <Link to="/signup">
                <GlassButton variant="glow" className="rounded-2xl">
                  Try Karbali Ads <CheckCircle2 className="ml-2 h-4 w-4" />
                </GlassButton>
              </Link>
            </div>
          </MotionWrapper>

          {/* Related CTA */}
          <div className="mt-24 p-12 rounded-[2.5rem] bg-primary/5 border border-primary/20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
            <h2 className="text-3xl font-extrabold mb-4">Ready to grow your business?</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Stop paying for clicks. Start paying for sales. Join Karbali Ads today and acquire customers at scale.
            </p>
            <Link to="/signup">
              <GlassButton variant="glow" size="lg" className="px-10 h-14 rounded-2xl">
                Get Started for Free
              </GlassButton>
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/50 py-16 px-6">
        <div className="mx-auto max-w-7xl flex flex-col items-center justify-center text-center gap-6">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="text-lg font-bold text-gradient">Karbali Ads</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">Performance Attribution Platform. Track real outcomes, not vanity metrics.</p>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <Link to="/docs" className="hover:text-primary transition-colors">API Docs</Link>
            <Link to="/what-is-karbali" className="hover:text-primary transition-colors">What is Karbali?</Link>
          </div>
          <p className="text-xs text-muted-foreground/50">&copy; {new Date().getFullYear()} Karbali Ads. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
