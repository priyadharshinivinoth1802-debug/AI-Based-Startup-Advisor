/* Business advisor engine: weighted scoring + rule-based advice.
   Runs in Node (backend) and in the browser (so GitHub Pages works without a server). */
(function (root) {
const requiredFields = ["founderName", "email", "businessIdea", "problemSolved", "targetCustomers", "industry", "businessModel", "location", "startupStage", "budget", "customers", "funding", "usp", "businessGoal", "adviceType"];
function cleanText(value, max = 1500) {
  return String(value ?? "").trim().slice(0, max);
}

/* ---- Lightweight NLP: tokenize -> remove stop words -> detect specificity signals ---- */
const STOP = new Set("a an the and or but if of to in on at for with by from is are was be this that it its as we our i my you your they them their can will want need make have has get so very just more most than then into about".split(" "));
const VAGUE = ["everyone", "everybody", "anyone", "all people", "all kinds", "many people", "general public", "people", "something", "anything"];
const SIGNALS = {
  problem: ["problem", "waste", "costly", "expensive", "slow", "difficult", "hard", "lack", "unable", "delay", "shortage", "unsafe", "unhealthy", "time", "stress", "complicated", "missing", "high price", "no access"],
  usp: ["only", "unique", "first", "cheaper", "faster", "better", "affordable", "free", "custom", "personalised", "personalized", "certified", "organic", "local", "automated", "24/7", "guarantee", "fresh", "easy", "quality", "quick"],
  customer: ["students", "women", "farmers", "women", "parents", "doctors", "teachers", "workers", "employees", "owners", "shops", "families", "youth", "seniors", "patients", "startups", "customers", "professionals", "buyers", "villagers", "children", "age", "years", "city", "chennai", "village", "college", "office"]
};
function tokens(text) {
  return cleanText(text).toLowerCase().replace(/[^a-z0-9\u20b9\s/-]/g, " ").split(/\s+/).filter(w => w && !STOP.has(w));
}
function scoreText(value, targetLength, kind) {
  const text = cleanText(value).toLowerCase();
  const toks = tokens(text);
  const unique = new Set(toks);
  if (!toks.length) return 0;
  const lengthScore = Math.min(1, text.length / targetLength);           // enough detail
  const varietyScore = Math.min(1, unique.size / Math.max(6, targetLength / 12)); // not repeated/filler words
  const repeatPenalty = unique.size / toks.length < 0.5 ? 0.5 : 1;         // "good good good" gets penalised
  const hits = (SIGNALS[kind] || []).filter(k => text.includes(k)).length;
  const signalScore = Math.min(1, hits / 2);                              // domain keywords found
  const numberBonus = /\d/.test(text) ? 0.1 : 0;                         // numbers = concrete
  const vaguePenalty = VAGUE.some(v => text.includes(v)) ? 0.15 : 0;      // "everyone" = not specific
  const raw = (0.4 * lengthScore + 0.3 * varietyScore + 0.3 * signalScore) * repeatPenalty + numberBonus - vaguePenalty;
  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

function scoreBusiness(data) {
  const components = {
    ideaClarity: scoreText(data.businessIdea, 180, "idea"),
    problemClarity: scoreText(data.problemSolved, 160, "problem"),
    customerSpecificity: scoreText(data.targetCustomers, 120, "customer"),
    differentiation: scoreText(data.usp, 120, "usp"),
    stage: {
      "Idea Stage": 55, "MVP / Prototype": 70, "Pre-launch": 65,
      "Recently Launched": 78, "Early Growth": 88
    }[data.startupStage] ?? 50,
    traction: {
      "No Customers": 35, "Few Customers": 65, "Growing Customer Base": 90
    }[data.customers] ?? 40,
    funding: {
      "Self Funded": 70, "Investor Funded": 90, "Loan": 60,
      "Looking for Funding": 50, "Not Decided": 40
    }[data.funding] ?? 40,
    budget: {
      "Below ₹50,000": 55, "₹50,000 - ₹1 Lakh": 65, "₹1 Lakh - ₹5 Lakh": 78,
      "₹5 Lakh - ₹10 Lakh": 85, "Above ₹10 Lakh": 90, "Not Decided": 40
    }[data.budget] ?? 40
  };

  const readinessScore = Math.round(
    components.ideaClarity * 0.15 +
    components.problemClarity * 0.15 +
    components.customerSpecificity * 0.15 +
    components.differentiation * 0.15 +
    components.stage * 0.10 +
    components.traction * 0.10 +
    components.funding * 0.10 +
    components.budget * 0.10
  );

  const level = readinessScore >= 80 ? "Strong preparation" : readinessScore >= 60 ? "Moderate preparation" : "Early preparation";

  const priorityMeta = {
    ideaClarity: { label: "Clarify the business idea", action: "State exactly what you offer, who it is for and the main customer benefit." },
    problemClarity: { label: "Validate the customer problem", action: "Interview at least 10 potential customers and record repeated pain points." },
    customerSpecificity: { label: "Narrow the target customer", action: "Choose one specific first customer segment and define its needs." },
    differentiation: { label: "Strengthen the USP", action: "Compare 3 existing alternatives and write one clear reason customers would choose you." },
    stage: { label: "Build and test an MVP", action: "Create a small version of the product or service and test it with real users." },
    traction: { label: "Get early customer evidence", action: "Try to obtain initial users, enquiries, trials or paid orders before scaling." },
    funding: { label: "Prepare a funding plan", action: "List launch costs, available funds and the amount still required." },
    budget: { label: "Build a minimum launch budget", action: "Separate essential launch costs from optional spending and keep a reserve." }
  };

  const priorities = Object.entries(components)
    .map(([key, value]) => ({ key, score: value, ...(priorityMeta[key] || {}) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return {
    readinessScore: Math.max(0, Math.min(100, readinessScore)),
    level,
    components,
    priorities,
    explanation: "The score is calculated using a transparent weighted algorithm with simple text analysis (keyword, specificity and vagueness checks): idea clarity (15%), problem clarity (15%), target-customer specificity (15%), differentiation (15%), startup stage (10%), customer traction (10%), funding readiness (10%), and budget readiness (10%)."
  };
}

function makeAnalysis(data, algorithm) {
  const score = algorithm.readinessScore;
  const idea = cleanText(data.businessIdea);
  const problem = cleanText(data.problemSolved);
  const customers = cleanText(data.targetCustomers);
  const usp = cleanText(data.usp);

  const weak = Object.entries(algorithm.components)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([key]) => key);

  const improvementMap = {
    ideaClarity: "Define the product/service, customer benefit and expected outcome more specifically.",
    problemClarity: "Validate the problem through interviews or surveys with at least 10 potential customers.",
    customerSpecificity: "Choose a narrower first customer segment instead of targeting everyone.",
    differentiation: "Write a clear one-sentence USP and compare it with 3 existing alternatives.",
    stage: "Build a small MVP or prototype and test it with real users.",
    traction: "Try to get the first few paying or test customers before spending heavily.",
    funding: "Prepare a simple cost estimate and funding plan before approaching investors or lenders.",
    budget: "Create a minimum viable launch budget and separate essential from optional expenses."
  };

  const improvements = weak.map(k => improvementMap[k]).join(" ");

  const summary = score >= 80
    ? `Your startup idea has a relatively strong level of preparation based on the information provided. Focus on validating demand and improving the weaker areas before scaling.`
    : score >= 60
      ? `Your startup idea has a moderate level of preparation. The concept can be developed further by validating customers, sharpening the value proposition and planning costs carefully.`
      : `Your startup is still in an early preparation stage. Start with customer validation, a clear problem statement and a small test version before making large investments.`;

  return {
    summary,
    ideaAnalysis: `Business idea: ${idea}. The algorithm checks how clearly the idea explains what is being offered and who benefits from it. Improve the idea statement by mentioning the product/service, customer and main benefit in one simple sentence.`,
    customerAnalysis: `Target customers: ${customers}. Customer clarity is important because pricing, marketing and product decisions depend on the first customer segment. Start with a specific group and learn their needs before expanding.`,
    marketAnalysis: `Problem addressed: ${problem}. Before assuming market demand, validate the problem with potential customers, compare existing alternatives and test whether customers are willing to pay.`,
    competitorAnalysis: `Your stated differentiator is: ${usp}. Compare this value proposition with at least three existing alternatives. Look for differences in price, convenience, quality, speed, service or technology rather than assuming there is no competition.`,
    budgetAnalysis: `Starting budget: ${data.budget}; business model: ${data.businessModel}; funding: ${data.funding}. Prepare a basic launch budget covering product/service creation, marketing, operations and emergency reserve. Track revenue and expenses from the first day.`,
    riskAnalysis: `Main risks to validate are customer demand, competition, cost control and execution. The three weakest algorithm areas are ${weak.join(", ")}. ${improvements}`,
    marketingSuggestions: `Start with one clearly defined customer segment. Create a simple social-media/content plan, collect testimonials from early users, use referrals where appropriate and measure enquiries, conversions and repeat customers.`,
    firstSteps: `1. Define the exact customer and problem.\n2. Interview potential customers and record repeated pain points.\n3. Create a small MVP/service trial.\n4. Test pricing and collect the first real feedback or orders.\n5. Review the algorithm score and update the business plan using the evidence collected.`,
    actionPlan: `Week 1: Validate the problem and customer segment.\nWeek 2: Build or prepare a small MVP and define pricing.\nWeek 3: Test with potential customers and collect feedback.\nWeek 4: Improve the offer, estimate real costs and create the next-month marketing and sales plan.`
  };
}


  function analyze(data) {
    const algorithm = scoreBusiness(data);
    return { success: true, algorithm, analysis: makeAnalysis(data, algorithm), method: "Weighted scoring + NLP keyword analysis + rule-based advice" };
  }
  const api = { analyze, requiredFields, cleanText };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.AdvisorEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
