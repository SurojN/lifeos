export type GuideMedication = {
  name: string;
  instructions: string | null;
};

export type GuideFact = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  occurredAt: string;
  occurredAtLabel: string;
  provenance: "USER_CONFIRMED" | "USER_ENTERED";
  kind: string | null;
  recordType: string | null;
  providerName: string | null;
  medications: GuideMedication[];
  sourceDocument: {
    id: string;
    originalFileName: string;
    available: boolean;
  } | null;
  href: string;
};

export type GuideAnswer = {
  answer: string;
  caveat: string | null;
  matches: GuideFact[];
};

const STOP_WORDS = new Set([
  "a", "about", "all", "am", "and", "are", "can", "did", "do", "due", "find", "for", "from", "future", "give", "have", "help", "i", "in", "is", "last", "latest", "list", "listed", "listing", "me", "my", "newest", "next", "of", "on", "plan", "planned", "plans", "please", "recent", "record", "records", "saved", "show", "tell", "that", "the", "to", "upcoming", "was", "what", "when", "where", "which", "with",
]);

const categoryTerms: Record<string, string[]> = {
  HEALTH: ["clinic", "doctor", "health", "hospital", "lab", "medical", "medicine", "medicines", "medication", "medications", "prescription"],
  FINANCE: ["finance", "financial", "money", "retirement", "saving", "savings", "sip"],
  TRAVEL: ["flight", "hotel", "trip", "travel"],
  EDUCATION: ["course", "education", "goal", "learn", "learning", "study"],
};

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function searchableFact(fact: GuideFact): string {
  return normalize([
    fact.category,
    fact.title,
    fact.description,
    fact.kind,
    fact.recordType,
    fact.providerName,
    fact.occurredAt,
    fact.occurredAtLabel,
    fact.sourceDocument?.originalFileName,
    ...fact.medications.flatMap((medication) => [medication.name, medication.instructions]),
  ].filter(Boolean).join(" "));
}

function includesQuestionTerm(searchable: string, term: string): boolean {
  if (searchable.includes(term)) return true;
  return term.length > 3 && term.endsWith("s") && searchable.includes(term.slice(0, -1));
}

function dateInKathmandu(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function requestedCategory(questionTerms: Set<string>): string | null {
  return Object.entries(categoryTerms).find(([, terms]) => terms.some((term) => questionTerms.has(term)))?.[0] ?? null;
}

export function answerLifeQuestion(rawQuestion: string, facts: GuideFact[], now = new Date()): GuideAnswer {
  const question = normalize(rawQuestion).slice(0, 200);
  if (!question) return { answer: "Ask about something you have saved in LifeOS.", caveat: null, matches: [] };

  const questionTerms = new Set(question.split(/\s+/));
  const medicationQuestion = /\b(medicine|medicines|medication|medications|prescription)\b/u.test(question);
  const upcomingQuestion = /\b(next|upcoming|future|due|planned)\b/u.test(question);
  const latestQuestion = /\b(last|latest|recent|newest)\b/u.test(question);
  const year = question.match(/\b(?:19|20)\d{2}\b/u)?.[0] ?? null;
  const category = requestedCategory(questionTerms);
  const terms = question.split(/\s+/).filter((term) => term.length > 1 && !STOP_WORDS.has(term) && term !== year && !Object.values(categoryTerms).flat().includes(term));
  const today = dateInKathmandu(now);

  let candidates = facts.filter((fact) => {
    if (medicationQuestion && fact.medications.length === 0 && fact.recordType !== "PRESCRIPTION") return false;
    if (category && fact.category !== category) return false;
    if (upcomingQuestion && fact.occurredAt < today) return false;
    if (year && !fact.occurredAt.startsWith(year)) return false;
    const searchable = searchableFact(fact);
    return terms.every((term) => includesQuestionTerm(searchable, term));
  });

  candidates = candidates.toSorted((left, right) => {
    if (upcomingQuestion) return left.occurredAt.localeCompare(right.occurredAt);
    return right.occurredAt.localeCompare(left.occurredAt);
  });
  const matches = candidates.slice(0, latestQuestion ? 1 : 5);

  if (matches.length === 0) return {
    answer: "I could not find a matching fact in your saved LifeOS history.",
    caveat: "Try a title, year, provider, medicine, category, or source filename. LifeOS will not invent an answer when evidence is missing.",
    matches: [],
  };

  if (medicationQuestion) return {
    answer: `I found medicines or prescriptions in ${matches.length} source-backed record${matches.length === 1 ? "" : "s"}.`,
    caveat: "This shows what your saved sources list, not what you currently take. Confirm current use with a qualified clinician.",
    matches,
  };
  if (latestQuestion) return {
    answer: `The latest matching item I found is “${matches[0].title}” from ${matches[0].occurredAtLabel}.`,
    caveat: matches[0].sourceDocument ? "Open the source before relying on an important detail." : "This item was entered by you and has no source document.",
    matches,
  };
  if (upcomingQuestion) return {
    answer: `I found ${matches.length} upcoming item${matches.length === 1 ? "" : "s"} in your saved plans.`,
    caveat: "LifeOS does not automatically verify schedule, travel, price, or provider changes.",
    matches,
  };
  return {
    answer: `I found ${matches.length} matching item${matches.length === 1 ? "" : "s"} in your saved history.`,
    caveat: "Every result below is limited to information you confirmed or entered.",
    matches,
  };
}
