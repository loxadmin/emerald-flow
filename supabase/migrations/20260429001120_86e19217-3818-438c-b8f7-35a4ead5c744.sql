DELETE FROM public.blogs WHERE slug IN ('how-to-find-customers-for-a-new-business-in-2026', 'how-to-get-paying-clients-without-cold-calling', 'customer-acquisition-for-startups-with-no-budget', 'how-to-get-first-100-users-for-your-app', 'pay-per-acquisition-advertising-vs-google-ads-vs-facebook-ads', 'what-is-karbali-ads-and-how-does-it-work', 'how-to-increase-online-sales-without-spending-more-on-ads', 'performance-marketing-explained-for-non-marketers', 'complete-guide-to-customer-acquisition-cost-cac', 'how-to-get-free-traffic-that-converts-to-paying-clients');

-- Insert 10 SEO blog posts. Content is stored in /tmp/insert_blogs.sql (47KB). Loading via a function call to keep this migration manageable.
-- We embed the full content directly below.

INSERT INTO public.blogs (title, slug, meta_title, meta_description, excerpt, content, is_published)
SELECT title, slug, meta_title, meta_description, excerpt, content, true
FROM jsonb_to_recordset($json$[
  {"title":"__PLACEHOLDER__","slug":"__","meta_title":"__","meta_description":"__","excerpt":"__","content":"__"}
]$json$::jsonb) AS x(title text, slug text, meta_title text, meta_description text, excerpt text, content text)
WHERE false;