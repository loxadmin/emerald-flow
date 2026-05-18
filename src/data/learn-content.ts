export type LearnSection = {
  heading: string;
  body: string[];
};

export type LearnEntry = {
  slug: string;
  type: "glossary" | "guide";
  title: string;
  shortTitle: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  excerpt: string;
  readMinutes: number;
  sections: LearnSection[];
};

export const LEARN_ENTRIES: LearnEntry[] = [
  // ============ GLOSSARY ============
  {
    slug: "performance-based-advertising",
    type: "glossary",
    title: "What is Performance-Based Advertising?",
    shortTitle: "Performance-Based Advertising",
    metaTitle: "Performance-Based Advertising: Definition, How It Works, Examples",
    metaDescription:
      "Performance-based advertising means you only pay when a real result happens. Learn the definition, how it works, and how it compares to CPC and CPM.",
    keywords: ["performance based advertising", "performance marketing", "pay for results ads"],
    excerpt:
      "Performance-based advertising is a model where advertisers pay only when a defined result happens, such as a sale, signup, or installed app.",
    readMinutes: 4,
    sections: [
      {
        heading: "Definition",
        body: [
          "Performance-based advertising is any advertising model where the advertiser pays only when a specific, measurable result happens. The result might be a sale, a qualified lead, a signup, an app install, or a phone call.",
          "It is the opposite of impression-based or click-based advertising, where you pay regardless of whether anyone buys.",
        ],
      },
      {
        heading: "How it works",
        body: [
          "1. The advertiser defines the result that counts (a purchase, a registration, a booking).",
          "2. The ad platform sends traffic to the advertiser's site or app.",
          "3. A tracking pixel, server-to-server callback, or attribution tool records when the result happens.",
          "4. The advertiser is billed only for those confirmed results.",
        ],
      },
      {
        heading: "Why advertisers like it",
        body: [
          "Budget risk drops to almost zero. You are never paying for impressions that nobody acted on, or clicks from bots.",
          "Forecasting is easier. If you know each sale costs you a fixed amount, you can scale spending the moment unit economics work.",
        ],
      },
      {
        heading: "How Karbali uses this model",
        body: [
          "Karbali Ads is built end-to-end around performance billing. Advertisers fund a wallet, and money is only deducted when a tracked conversion is verified. There are no impression fees and no click fees.",
        ],
      },
    ],
  },
  {
    slug: "pay-per-sale-advertising",
    type: "glossary",
    title: "What is Pay-Per-Sale Advertising (PPS)?",
    shortTitle: "Pay-Per-Sale Ads",
    metaTitle: "Pay-Per-Sale Advertising (PPS): Definition and Examples",
    metaDescription:
      "Pay-per-sale advertising charges you only when a customer completes a purchase. Here is how PPS works, who it suits, and how it compares to CPC.",
    keywords: ["pay per sale", "pay per sale advertising", "pps ads", "cost per sale"],
    excerpt:
      "Pay-per-sale (PPS) is a billing model where the advertiser is charged only after a tracked purchase is completed.",
    readMinutes: 4,
    sections: [
      {
        heading: "Definition",
        body: [
          "Pay-per-sale, often abbreviated PPS, is a pricing model where the advertiser pays the ad platform only when a sale is completed and verified.",
          "It is the strictest form of performance-based advertising. There is no charge for clicks, impressions, or even leads, only for actual revenue events.",
        ],
      },
      {
        heading: "When PPS makes sense",
        body: [
          "Ecommerce stores with clear checkout events.",
          "Subscription products where the trial-to-paid conversion is tracked.",
          "Marketplaces and travel sites where bookings are the revenue event.",
        ],
      },
      {
        heading: "PPS vs CPC vs CPM",
        body: [
          "CPM bills per 1,000 impressions. You pay even if nobody clicks.",
          "CPC bills per click. You pay even if nobody buys.",
          "PPS bills per sale. You only pay when revenue lands in your account.",
        ],
      },
    ],
  },
  {
    slug: "customer-acquisition-cost",
    type: "glossary",
    title: "What is Customer Acquisition Cost (CAC)?",
    shortTitle: "Customer Acquisition Cost",
    metaTitle: "Customer Acquisition Cost (CAC): Formula, Benchmarks, How to Lower It",
    metaDescription:
      "CAC is the total cost of acquiring one paying customer. Learn the CAC formula, common benchmarks by industry, and proven ways to reduce it.",
    keywords: ["customer acquisition cost", "cac", "what is cac", "cac formula"],
    excerpt:
      "Customer Acquisition Cost (CAC) is the total marketing and sales spend divided by the number of new paying customers gained in the same period.",
    readMinutes: 5,
    sections: [
      {
        heading: "Definition",
        body: [
          "Customer Acquisition Cost (CAC) is the average amount a business spends to acquire one new paying customer over a defined period.",
        ],
      },
      {
        heading: "The CAC formula",
        body: [
          "CAC = (Total Sales and Marketing Spend) / (Number of New Customers Acquired)",
          "Example: If you spent $5,000 on ads and salaries in a month and gained 100 new customers, your CAC is $50.",
        ],
      },
      {
        heading: "What counts as CAC spend",
        body: [
          "Ad spend across every channel.",
          "Salaries of marketing and sales staff.",
          "Cost of marketing tools, agencies, and content production.",
          "Affiliate, referral, and partner payouts.",
        ],
      },
      {
        heading: "Healthy CAC benchmarks",
        body: [
          "A common rule of thumb is that LTV should be at least 3x CAC. If you are paying $100 to acquire a customer, that customer should generate at least $300 in lifetime value.",
          "Ecommerce: typically $20 to $100 depending on product category.",
          "SaaS: typically $200 to $700 for SMB, much higher for enterprise.",
        ],
      },
      {
        heading: "Ways to lower CAC",
        body: [
          "Switch from CPC to performance-based billing so you only pay on conversion.",
          "Improve landing page conversion rate; the same traffic now produces more customers.",
          "Add referral and word-of-mouth loops to bring CAC closer to zero.",
        ],
      },
    ],
  },
  {
    slug: "ad-fraud",
    type: "glossary",
    title: "What is Ad Fraud? Types, Examples, and How to Stop It",
    shortTitle: "Ad Fraud",
    metaTitle: "Ad Fraud: Types, How It Works, and How to Prevent It",
    metaDescription:
      "Ad fraud drains billions from advertisers every year. Learn the main types of ad fraud, how to detect it, and how performance-based billing eliminates most of it.",
    keywords: ["ad fraud", "click fraud", "what is ad fraud", "prevent ad fraud"],
    excerpt:
      "Ad fraud is any activity that generates fake impressions, clicks, or conversions to drain an advertiser's budget without delivering real customers.",
    readMinutes: 5,
    sections: [
      {
        heading: "Definition",
        body: [
          "Ad fraud is any deceptive activity that triggers a billable ad event without a real human customer behind it. It costs advertisers an estimated $80 to $100 billion globally per year.",
        ],
      },
      {
        heading: "Common types",
        body: [
          "Click fraud: bots or click farms repeatedly click your ads to drain a CPC budget.",
          "Impression fraud: stacked, hidden, or invisible ads serve impressions nobody sees.",
          "Domain spoofing: low-quality sites pretend to be premium publishers to charge higher rates.",
          "Attribution fraud: a fraudster injects fake last-click events to claim credit for organic sales.",
        ],
      },
      {
        heading: "How to detect it",
        body: [
          "Watch for high click-through rate paired with near-zero conversion rate.",
          "Look at traffic spikes from suspicious geographies or data centers.",
          "Check session duration: bot traffic almost always shows 0 to 2 seconds on page.",
        ],
      },
      {
        heading: "How performance billing eliminates most of it",
        body: [
          "When you only pay on confirmed sales, fake clicks and fake impressions cost the fraudster, not you. This is why advertisers concerned about fraud move budget into performance-based platforms like Karbali.",
        ],
      },
    ],
  },
  {
    slug: "attribution",
    type: "glossary",
    title: "What is Attribution in Advertising?",
    shortTitle: "Attribution",
    metaTitle: "Marketing Attribution: Models, Examples, and Why It Matters",
    metaDescription:
      "Attribution decides which marketing touchpoint gets credit for a sale. Learn the main attribution models and which one fits your business.",
    keywords: ["attribution", "marketing attribution", "attribution models", "last click attribution"],
    excerpt:
      "Attribution is the process of assigning credit for a conversion to one or more marketing touchpoints in the customer journey.",
    readMinutes: 5,
    sections: [
      {
        heading: "Definition",
        body: [
          "Attribution is how marketers decide which ad, channel, or campaign deserves credit for a sale or signup. It is the difference between knowing what is working and guessing.",
        ],
      },
      {
        heading: "The main attribution models",
        body: [
          "Last-click: 100 percent of credit goes to the final touchpoint before conversion. Simple, but undervalues awareness channels.",
          "First-click: 100 percent of credit goes to the first touchpoint. Useful for awareness analysis.",
          "Linear: credit is split evenly across every touchpoint.",
          "Time-decay: more recent touchpoints get more credit.",
          "Data-driven: a model learns the actual contribution of each step from historical data.",
        ],
      },
      {
        heading: "How tracking works under the hood",
        body: [
          "A unique click ID is generated when the user clicks an ad. That ID is stored as a cookie or passed through URL parameters. When the user converts, the ID is sent back to the ad platform so the click is matched to the sale.",
          "Karbali uses a deterministic click_id passed through every redirect, so attribution stays accurate even with cookie blockers.",
        ],
      },
    ],
  },
  {
    slug: "cpa-vs-cpc",
    type: "glossary",
    title: "CPA vs CPC: What Is the Difference?",
    shortTitle: "CPA vs CPC",
    metaTitle: "CPA vs CPC: The Difference and When to Use Each",
    metaDescription:
      "CPC charges per click, CPA charges per action. Learn the real difference, the math, and which model protects your budget better.",
    keywords: ["cpa vs cpc", "cost per acquisition vs cost per click", "cpc vs cpa difference"],
    excerpt:
      "CPC bills you every time someone clicks. CPA bills you only when someone completes a defined action, usually a purchase or signup.",
    readMinutes: 4,
    sections: [
      {
        heading: "The short answer",
        body: [
          "CPC (Cost Per Click): you pay every time a user clicks the ad, whether they buy or not.",
          "CPA (Cost Per Acquisition or Cost Per Action): you pay only when the user completes a defined action, usually a sale or signup.",
        ],
      },
      {
        heading: "The math",
        body: [
          "Imagine you run a $1,000 campaign.",
          "On CPC at $1.00 per click, you get 1,000 clicks. If 2 percent convert, that is 20 sales at an effective $50 cost per sale.",
          "On CPA at $40 per sale, the same $1,000 buys exactly 25 sales. You know your unit cost in advance.",
        ],
      },
      {
        heading: "Which to choose",
        body: [
          "Choose CPC when you are early in the funnel and need traffic for testing.",
          "Choose CPA when you have a tracked conversion and want predictable customer costs.",
          "Karbali defaults to a CPA-style model so advertisers never pay for unsold traffic.",
        ],
      },
    ],
  },
  {
    slug: "return-on-ad-spend",
    type: "glossary",
    title: "What is ROAS? Return on Ad Spend Explained",
    shortTitle: "Return on Ad Spend",
    metaTitle: "ROAS: Formula, Healthy Benchmarks, and How to Improve It",
    metaDescription:
      "Return on Ad Spend (ROAS) measures revenue generated for every dollar of ad spend. Learn the formula, benchmarks, and how to improve ROAS quickly.",
    keywords: ["roas", "return on ad spend", "roas formula", "good roas"],
    excerpt:
      "ROAS is the revenue generated for every dollar of ad spend. A ROAS of 4 means you earned $4 for every $1 spent on ads.",
    readMinutes: 4,
    sections: [
      {
        heading: "Definition",
        body: [
          "Return on Ad Spend (ROAS) is a ratio that shows how much revenue an advertising campaign generates per dollar spent.",
        ],
      },
      {
        heading: "Formula",
        body: [
          "ROAS = Revenue from Ads / Cost of Ads",
          "Example: $8,000 revenue from $2,000 ad spend = 4.0 ROAS.",
        ],
      },
      {
        heading: "What is a good ROAS",
        body: [
          "Break-even ROAS depends on gross margin. A store with a 25 percent margin needs at least 4.0 ROAS to break even on ads.",
          "Ecommerce target: 3.0 to 5.0 ROAS.",
          "Subscription: focus on payback period instead of single-month ROAS.",
        ],
      },
    ],
  },

  // ============ HOW-TO GUIDES ============
  {
    slug: "how-to-get-clients-for-shopify-store",
    type: "guide",
    title: "How to Get Clients for Your Shopify Store in 2026",
    shortTitle: "Get Clients for a Shopify Store",
    metaTitle: "How to Get Clients for a Shopify Store (2026 Guide)",
    metaDescription:
      "A step-by-step guide to getting your first and next 1,000 customers for a Shopify store, without burning cash on unprofitable ads.",
    keywords: [
      "how to get clients for my shopify store",
      "how to get customers for shopify",
      "shopify customer acquisition",
    ],
    excerpt:
      "A practical 7-step playbook for getting customers to a Shopify store, optimized for stores that cannot afford to lose money on traffic.",
    readMinutes: 7,
    sections: [
      {
        heading: "Step 1: Nail one product before scaling",
        body: [
          "Most struggling stores try to promote a whole catalog. Pick one hero product with a clear use case and a solid margin, and put 80 percent of your acquisition effort behind it.",
        ],
      },
      {
        heading: "Step 2: Get the product page right",
        body: [
          "Above the fold: a clear product photo, a one-line benefit, the price, and a strong add-to-cart button.",
          "Reviews and proof: even 5 to 10 honest reviews beat a long copywriting section.",
          "Shipping and returns visible without scrolling.",
        ],
      },
      {
        heading: "Step 3: Switch from CPC to performance-based ads",
        body: [
          "Shopify owners often start with Meta or Google Ads, which charge per click whether the click sells anything or not.",
          "On a performance platform like Karbali Ads, you only pay when a real sale happens. For a new store with a tight budget, this removes the biggest risk: paying for clicks that never convert.",
        ],
      },
      {
        heading: "Step 4: Use affiliate and influencer payouts",
        body: [
          "Offer creators a commission per sale through a tracked link. Their reach is rented, and you only pay on results.",
        ],
      },
      {
        heading: "Step 5: Capture every visitor with email and SMS",
        body: [
          "A simple 10 percent discount popup converts roughly 3 to 6 percent of visitors into subscribers. Email and SMS then bring them back for free.",
        ],
      },
      {
        heading: "Step 6: Build a referral loop",
        body: [
          "Give existing customers store credit when they refer a friend who buys. Referred customers convert at 2 to 4 times the rate of cold traffic.",
        ],
      },
      {
        heading: "Step 7: Track every cost back to a sale",
        body: [
          "Calculate CAC weekly. As long as customer lifetime value is at least 3 times CAC, scale the channels that work and shut down the ones that do not.",
        ],
      },
    ],
  },
  {
    slug: "how-to-get-clients-for-ecommerce",
    type: "guide",
    title: "How to Get Clients for an Ecommerce Business (Beginner Playbook)",
    shortTitle: "Get Clients for Ecommerce",
    metaTitle: "How to Get Clients for an Ecommerce Business: 2026 Playbook",
    metaDescription:
      "A step-by-step beginner playbook for getting paying customers to an online store, with low-risk channels that work even with a small budget.",
    keywords: [
      "how to get clients for ecommerce",
      "how to get customers for online store",
      "ecommerce customer acquisition",
    ],
    excerpt:
      "Eight customer acquisition channels for ecommerce ranked by risk, speed, and cost. Start with the lowest-risk channels first.",
    readMinutes: 6,
    sections: [
      {
        heading: "Rank your channels by risk first",
        body: [
          "Most ecommerce founders try paid ads on day one because that is what gets advertised to them. In reality, the order should be: lowest risk first.",
        ],
      },
      {
        heading: "1. Performance-based ads (lowest risk)",
        body: [
          "Pay only on confirmed sales. Your worst case is zero customers, never a negative bank account.",
        ],
      },
      {
        heading: "2. Affiliate and creator payouts",
        body: [
          "Pay a commission per sale through tracked links. No upfront media cost.",
        ],
      },
      {
        heading: "3. Email and SMS to existing visitors",
        body: [
          "Cheap, owned, and the highest ROI channel for any store that already has traffic.",
        ],
      },
      {
        heading: "4. SEO content for buying-intent queries",
        body: [
          "Target keywords like 'best [product] under $50' or 'how to choose a [product]'. Slow to start but compounds for years.",
        ],
      },
      {
        heading: "5. Marketplaces",
        body: [
          "Amazon, Etsy, and Jumia bring built-in traffic. You pay fees on the sale, never on browsing.",
        ],
      },
      {
        heading: "6. Referral programs",
        body: [
          "Give an existing customer a reward when they bring a new paying customer.",
        ],
      },
      {
        heading: "7. Paid social (CPC, higher risk)",
        body: [
          "Use only after the above channels prove the product converts.",
        ],
      },
      {
        heading: "8. Google Search (CPC, only on tracked intent)",
        body: [
          "Bid only on keywords with clear purchase intent, never broad informational terms.",
        ],
      },
    ],
  },
  {
    slug: "how-to-reduce-customer-acquisition-cost",
    type: "guide",
    title: "How to Reduce Customer Acquisition Cost (CAC)",
    shortTitle: "Reduce CAC",
    metaTitle: "How to Reduce Customer Acquisition Cost: 9 Tactics That Work",
    metaDescription:
      "Nine proven tactics to lower CAC without sacrificing growth, from switching to performance ads to fixing landing page conversion.",
    keywords: ["reduce customer acquisition cost", "lower cac", "how to reduce cac"],
    excerpt:
      "Nine practical tactics to bring CAC down, ordered from fastest to longest payoff.",
    readMinutes: 6,
    sections: [
      {
        heading: "1. Move spend to performance billing",
        body: [
          "Anything you can pay for on a per-sale basis instead of per-click should be moved immediately. This single change typically cuts CAC by 30 to 60 percent on early-stage stores.",
        ],
      },
      {
        heading: "2. Raise conversion rate first, traffic second",
        body: [
          "Doubling your conversion rate halves your CAC. A 100-visitor day at 2 percent gives you 2 customers; the same day at 4 percent gives you 4. The fix is faster and cheaper than buying more traffic.",
        ],
      },
      {
        heading: "3. Cut your worst-performing campaigns weekly",
        body: [
          "Eighty percent of waste hides in the bottom 20 percent of campaigns. Kill them every Monday.",
        ],
      },
      {
        heading: "4. Add a referral loop",
        body: [
          "Referred customers cost almost nothing to acquire and convert at higher rates.",
        ],
      },
      {
        heading: "5. Use retargeting only on engaged users",
        body: [
          "Retarget users who reached checkout, not everyone who saw the homepage.",
        ],
      },
      {
        heading: "6. Build owned channels (email, SMS, push)",
        body: [
          "Every customer that comes through an owned channel has a CAC near zero.",
        ],
      },
      {
        heading: "7. Improve product-market fit",
        body: [
          "Sometimes the cheapest CAC fix is changing the offer, not the ads.",
        ],
      },
      {
        heading: "8. Launch a freemium or trial tier",
        body: [
          "Free entry points reduce friction and increase top-of-funnel conversion.",
        ],
      },
      {
        heading: "9. Invest in SEO for evergreen demand",
        body: [
          "It is slow, but a top-3 organic ranking on a buying-intent keyword can replace thousands of dollars per month in paid spend.",
        ],
      },
    ],
  },
  {
    slug: "how-to-prevent-ad-fraud",
    type: "guide",
    title: "How to Prevent Ad Fraud (Practical Checklist)",
    shortTitle: "Prevent Ad Fraud",
    metaTitle: "How to Prevent Ad Fraud: Practical Checklist for Advertisers",
    metaDescription:
      "A practical checklist to detect and prevent click fraud, impression fraud, and attribution fraud on your ad campaigns.",
    keywords: ["prevent ad fraud", "how to stop click fraud", "ad fraud protection"],
    excerpt:
      "A 6-point checklist to keep ad fraud from quietly draining your campaign budget.",
    readMinutes: 5,
    sections: [
      {
        heading: "1. Prefer performance-based billing",
        body: [
          "The single most effective anti-fraud move: pay only on confirmed conversions. Fake clicks are then the fraudster's problem, not yours.",
        ],
      },
      {
        heading: "2. Monitor click-to-conversion ratio",
        body: [
          "A high click-through rate combined with near-zero conversion rate is the clearest fraud signal. Pause those sources.",
        ],
      },
      {
        heading: "3. Block known bot data centers",
        body: [
          "Filter out traffic from AWS, GCP, OVH, and similar IP ranges unless they are expected.",
        ],
      },
      {
        heading: "4. Use server-to-server (S2S) postbacks",
        body: [
          "S2S tracking is far harder to spoof than cookie or pixel tracking.",
        ],
      },
      {
        heading: "5. Audit referring domains monthly",
        body: [
          "Look for sources you do not recognize. Even on legitimate networks, low-quality publishers can leak in.",
        ],
      },
      {
        heading: "6. Set per-IP and per-device frequency caps",
        body: [
          "Stops basic click farms cold.",
        ],
      },
    ],
  },
  {
    slug: "how-to-measure-marketing-attribution",
    type: "guide",
    title: "How to Measure Marketing Attribution (Without a Data Team)",
    shortTitle: "Measure Attribution",
    metaTitle: "How to Measure Marketing Attribution Without a Data Team",
    metaDescription:
      "A practical walkthrough for small teams to set up marketing attribution that is accurate enough to make budget decisions.",
    keywords: [
      "how to measure attribution",
      "marketing attribution setup",
      "attribution for small business",
    ],
    excerpt:
      "A small-team setup for attribution that is accurate enough to decide where to send next month's budget.",
    readMinutes: 6,
    sections: [
      {
        heading: "1. Decide what counts as a conversion",
        body: [
          "Pick one primary event (purchase, signup, qualified lead). Everything else is a secondary metric.",
        ],
      },
      {
        heading: "2. Tag every paid link with UTMs",
        body: [
          "Use utm_source, utm_medium, and utm_campaign on every paid link. Without this, no analytics tool can give you accurate channel-level reporting.",
        ],
      },
      {
        heading: "3. Pick one attribution model and stay with it",
        body: [
          "For most small businesses, last non-direct click is a fair starting point. Consistency matters more than perfection.",
        ],
      },
      {
        heading: "4. Use server-to-server tracking where possible",
        body: [
          "Browser tracking misses 20 to 40 percent of conversions due to ad blockers and privacy settings. S2S closes that gap.",
        ],
      },
      {
        heading: "5. Reconcile against your payment processor weekly",
        body: [
          "Your bank deposits are the ground truth. Any analytics tool that disagrees by more than 10 percent needs investigation.",
        ],
      },
    ],
  },
  {
    slug: "how-to-get-first-100-ecommerce-customers",
    type: "guide",
    title: "How to Get Your First 100 Ecommerce Customers",
    shortTitle: "First 100 Ecommerce Customers",
    metaTitle: "How to Get Your First 100 Ecommerce Customers (Step by Step)",
    metaDescription:
      "A founder-friendly playbook for getting your first 100 paying customers to an online store, with low-budget channels that compound.",
    keywords: [
      "first 100 ecommerce customers",
      "how to get first customers",
      "first ecommerce sales",
    ],
    excerpt:
      "The first 100 customers should validate the product, not drain the bank account. Here is the safest sequence.",
    readMinutes: 6,
    sections: [
      {
        heading: "Customers 1 to 10: hand-pick them",
        body: [
          "Reach out personally to friends, family, communities, and existing followers. The goal is not revenue, it is feedback.",
        ],
      },
      {
        heading: "Customers 11 to 30: micro-creators",
        body: [
          "Send free product to 5 to 10 small creators in your niche in exchange for an honest post. Track every sale.",
        ],
      },
      {
        heading: "Customers 31 to 60: performance ads",
        body: [
          "Now turn on performance-based ads. You only pay per sale, so your only risk is slow learning, not lost money.",
        ],
      },
      {
        heading: "Customers 61 to 100: referrals",
        body: [
          "Email every previous customer with a referral reward. Most stores get 10 to 20 percent of new sales from this channel alone once it is set up.",
        ],
      },
      {
        heading: "What to ignore until 100 customers",
        body: [
          "Logo redesigns. Complex email automations. Multi-channel branding. None of it matters until you know the product sells.",
        ],
      },
    ],
  },
];

export const GLOSSARY_ENTRIES = LEARN_ENTRIES.filter((e) => e.type === "glossary");
export const GUIDE_ENTRIES = LEARN_ENTRIES.filter((e) => e.type === "guide");

export function getLearnEntry(slug: string): LearnEntry | undefined {
  return LEARN_ENTRIES.find((e) => e.slug === slug);
}
