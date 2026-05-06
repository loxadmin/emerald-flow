import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionItem, MotionStagger } from "@/components/MotionWrapper";
import { ArrowRight, Calendar, User, Search } from "lucide-react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { GlassCard, GlassCardContent } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  created_at: string;
}

export default function BlogList() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blogs" as any)
      .select("id, title, slug, excerpt, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (!error) {
      setBlogs((data as unknown as Blog[]) || []);
    }
    setLoading(false);
  };

  const filteredBlogs = blogs.filter(blog =>
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (blog.excerpt && blog.excerpt.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Karbali Ads Blog",
    url: "https://advertiser.karbali.com/blog",
    blogPost: filteredBlogs.slice(0, 20).map((b) => ({
      "@type": "BlogPosting",
      headline: b.title,
      datePublished: b.created_at,
      url: `https://advertiser.karbali.com/blog/${b.slug}`,
      description: b.excerpt || "",
    })),
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>Karbali Ads Blog — Customer Acquisition & Performance Marketing</title>
        <meta
          name="description"
          content="Insights on performance marketing, attribution, and customer acquisition. Learn how to grow with pay-for-results advertising on Karbali Ads."
        />
        <link rel="canonical" href="https://advertiser.karbali.com/blog" />
        <meta property="og:title" content="Karbali Ads Blog" />
        <meta property="og:description" content="Performance marketing and customer acquisition insights." />
        <meta property="og:url" content="https://advertiser.karbali.com/blog" />
        <script type="application/ld+json">{JSON.stringify(blogJsonLd)}</script>
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
              <Link to="/about" className="hidden text-sm transition-colors sm:block text-muted-foreground hover:text-primary">About</Link>
              <Link to="/docs" className="hidden text-sm transition-colors sm:block text-muted-foreground hover:text-primary">API</Link>
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
        <div className="mx-auto max-w-5xl">
          <MotionWrapper className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">Resources & Insights</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Expert guides on customer acquisition, user growth, and performance marketing.
            </p>

            <div className="mt-10 max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <GlassInput
                className="pl-12 h-14 text-lg rounded-2xl"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </MotionWrapper>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <MotionStagger className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredBlogs.length > 0 ? (
                filteredBlogs.map((blog) => (
                  <MotionItem key={blog.id}>
                    <Link to={`/blog/${blog.slug}`}>
                      <GlassCard className="h-full hover:border-primary/50 transition-all duration-300 hover:-translate-y-2 group">
                        <GlassCardContent className="p-8 flex flex-col h-full">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 font-medium uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(blog.created_at).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> Karbali Team</span>
                          </div>
                          <h2 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors line-clamp-2">{blog.title}</h2>
                          <p className="text-muted-foreground mb-8 flex-grow line-clamp-3">{blog.excerpt}</p>
                          <div className="flex items-center text-primary font-bold">
                            Read Article <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-transform" />
                          </div>
                        </GlassCardContent>
                      </GlassCard>
                    </Link>
                  </MotionItem>
                ))
              ) : (
                <div className="col-span-full text-center py-20 bg-card/30 rounded-[2.5rem] border border-border/50 backdrop-blur-sm">
                  <p className="text-muted-foreground text-lg">No articles found matching your search.</p>
                </div>
              )}
            </MotionStagger>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
