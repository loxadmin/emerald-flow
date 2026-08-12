import { Link } from "react-router-dom";
import { Helmet } from "@/components/Seo";
import { Sun, Moon, BookOpen, GraduationCap, ArrowRight, Search } from "lucide-react";
import { useState } from "react";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper from "@/components/MotionWrapper";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { useTheme } from "@/lib/theme";
import { GLOSSARY_ENTRIES, GUIDE_ENTRIES, LEARN_ENTRIES } from "@/data/learn-content";

export default function LearnHub() {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filter = (list: typeof LEARN_ENTRIES) =>
    !q
      ? list
      : list.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.excerpt.toLowerCase().includes(q) ||
            e.keywords.some((k) => k.toLowerCase().includes(q))
        );

  const glossary = filter(GLOSSARY_ENTRIES);
  const guides = filter(GUIDE_ENTRIES);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>Learn Hub: Performance Advertising Glossary & Guides | Karbali Ads</title>
        <meta
          name="description"
          content="Plain-English definitions and how-to guides for performance advertising: CAC, ROAS, attribution, ad fraud, CPA vs CPC, and customer acquisition playbooks."
        />
        <link rel="canonical" href="https://advertiser.karbali.com/learn" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Karbali Learn Hub",
            description:
              "Performance advertising glossary and customer acquisition guides for ecommerce, Shopify, and SaaS founders.",
            url: "https://advertiser.karbali.com/learn",
            hasPart: LEARN_ENTRIES.map((e) => ({
              "@type": "Article",
              headline: e.title,
              url: `https://advertiser.karbali.com/learn/${e.slug}`,
              description: e.excerpt,
            })),
          })}
        </script>
      </Helmet>

      <FluidCanvas />

      <header className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-md border-b border-border py-2">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={22} />
              <span className="text-lg font-bold tracking-tight">Karbali Ads</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/blog" className="hidden text-sm sm:block text-muted-foreground hover:text-primary">
                Blog
              </Link>
              <Link to="/learn" className="hidden text-sm sm:block text-primary font-medium">
                Learn
              </Link>
              <button
                onClick={toggleTheme}
                className="rounded-lg p-2 text-muted-foreground hover:text-primary"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link to="/signup">
                <GlassButton variant="default" size="sm">
                  Get Started
                </GlassButton>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20 px-6">
        <div className="mx-auto max-w-6xl">
          <MotionWrapper className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
              <BookOpen className="h-3.5 w-3.5" /> Karbali Learn Hub
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Performance Advertising, Explained Simply
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              A glossary of the metrics and models advertisers actually use, plus step-by-step guides for getting real
              customers without burning your budget.
            </p>
          </MotionWrapper>

          <MotionWrapper className="max-w-xl mx-auto mb-16 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <GlassInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search glossary and guides..."
              className="pl-11 h-12"
            />
          </MotionWrapper>

          {/* Glossary */}
          <section className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-2xl md:text-3xl font-extrabold">Glossary</h2>
              <span className="text-sm text-muted-foreground">({glossary.length})</span>
            </div>
            {glossary.length === 0 ? (
              <p className="text-muted-foreground">No glossary terms match your search.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {glossary.map((e) => (
                  <Link
                    key={e.slug}
                    to={`/learn/${e.slug}`}
                    className="group block p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md hover:border-primary/40 hover:bg-card/60 transition-all"
                  >
                    <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                      {e.shortTitle}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{e.excerpt}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                      Read definition <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Guides */}
          <section className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h2 className="text-2xl md:text-3xl font-extrabold">How-To Guides</h2>
              <span className="text-sm text-muted-foreground">({guides.length})</span>
            </div>
            {guides.length === 0 ? (
              <p className="text-muted-foreground">No guides match your search.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {guides.map((e) => (
                  <Link
                    key={e.slug}
                    to={`/learn/${e.slug}`}
                    className="group block p-7 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md hover:border-primary/40 hover:bg-card/60 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">Guide</span>
                      <span>{e.readMinutes} min read</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{e.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{e.excerpt}</p>
                    <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                      Read guide <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <MotionWrapper className="rounded-3xl border border-primary/20 bg-primary/5 p-10 md:p-14 text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-4">Stop paying for clicks. Pay for customers.</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Karbali Ads only charges you when a real sale or signup happens. No impression fees. No click fees.
            </p>
            <Link to="/signup">
              <GlassButton variant="glow" className="h-12 px-8 rounded-2xl">
                Start a Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </GlassButton>
            </Link>
          </MotionWrapper>
        </div>
      </main>

      <Footer />
    </div>
  );
}
