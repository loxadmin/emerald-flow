import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "@/components/Seo";
import { Sun, Moon, ArrowLeft, ArrowRight, BookOpen, Clock } from "lucide-react";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper from "@/components/MotionWrapper";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { GlassButton } from "@/components/ui/glass-button";
import { useTheme } from "@/lib/theme";
import { getLearnEntry, LEARN_ENTRIES } from "@/data/learn-content";

export default function LearnArticle() {
  const { slug } = useParams();
  const { theme, toggleTheme } = useTheme();
  const entry = slug ? getLearnEntry(slug) : undefined;

  if (!entry) return <Navigate to="/learn" replace />;

  const related = LEARN_ENTRIES.filter((e) => e.slug !== entry.slug).slice(0, 3);
  const url = `https://advertiser.karbali.com/learn/${entry.slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": entry.type === "guide" ? "HowTo" : "DefinedTerm",
    name: entry.title,
    description: entry.metaDescription,
    url,
    ...(entry.type === "guide"
      ? {
          step: entry.sections.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.heading,
            text: s.body.join(" "),
          })),
        }
      : {}),
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>{entry.metaTitle}</title>
        <meta name="description" content={entry.metaDescription} />
        <meta name="keywords" content={entry.keywords.join(", ")} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={entry.metaTitle} />
        <meta property="og:description" content={entry.metaDescription} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
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
              <Link to="/learn" className="hidden text-sm sm:block text-muted-foreground hover:text-primary">
                Learn
              </Link>
              <Link to="/blog" className="hidden text-sm sm:block text-muted-foreground hover:text-primary">
                Blog
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
        <div className="mx-auto max-w-3xl">
          <MotionWrapper>
            <Link
              to="/learn"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Learn Hub
            </Link>

            <div className="flex items-center gap-3 mb-6 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium uppercase tracking-wide">
                {entry.type === "guide" ? "How-To Guide" : "Glossary"}
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" /> {entry.readMinutes} min read
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6">{entry.title}</h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-12">{entry.excerpt}</p>
          </MotionWrapper>

          <MotionWrapper>
            <article className="space-y-10">
              {entry.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-2xl font-bold mb-4">{section.heading}</h2>
                  <div className="space-y-3 text-base text-foreground/90 leading-relaxed">
                    {section.body.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </section>
              ))}
            </article>
          </MotionWrapper>

          <MotionWrapper className="mt-16 rounded-3xl border border-primary/20 bg-primary/5 p-8 md:p-10 text-center">
            <h3 className="text-xl md:text-2xl font-extrabold mb-3">
              Want results without paying for empty clicks?
            </h3>
            <p className="text-muted-foreground mb-6">
              Karbali Ads only bills you when a real customer takes action. Try it free.
            </p>
            <Link to="/signup">
              <GlassButton variant="glow" className="h-12 px-8 rounded-2xl">
                Create a Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </GlassButton>
            </Link>
          </MotionWrapper>

          <MotionWrapper className="mt-20">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-bold">Keep reading</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/learn/${r.slug}`}
                  className="group block p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md hover:border-primary/40 transition-all"
                >
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    {r.type === "guide" ? "Guide" : "Glossary"}
                  </p>
                  <h4 className="font-bold leading-snug group-hover:text-primary transition-colors">
                    {r.shortTitle}
                  </h4>
                </Link>
              ))}
            </div>
          </MotionWrapper>
        </div>
      </main>

      <Footer />
    </div>
  );
}
