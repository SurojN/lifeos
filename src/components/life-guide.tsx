"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, Download, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { answerLifeQuestion, type GuideAnswer, type GuideFact } from "@/lib/life-guide";

const starterQuestions = [
  "Show my recent health records",
  "What medicines are listed in my records?",
  "What are my upcoming plans?",
] as const;

export function LifeGuide({ facts }: { facts: GuideFact[] }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<GuideAnswer | null>(null);

  function ask(nextQuestion: string) {
    setQuestion(nextQuestion);
    setAnswer(answerLifeQuestion(nextQuestion, facts));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  return <section className="overflow-hidden rounded-[1.6rem] border border-emerald-900/10 bg-[linear-gradient(145deg,rgba(236,249,241,.94),rgba(255,255,255,.82))] shadow-[0_18px_45px_rgba(22,70,48,.08)]" aria-labelledby="life-guide-heading">
    <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <div>
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-ink text-emerald-200 shadow-lg"><Bot className="size-5"/></span><div><p className="eyebrow">PRIVATE LIFE GUIDE</p><h2 id="life-guide-heading" className="mt-1 text-2xl font-medium tracking-tight">Ask your own history</h2></div></div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">Find useful facts across information you confirmed or entered. Answers stay grounded in your LifeOS data and link back to evidence.</p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="life-guide-question" className="sr-only">Ask LifeOS about your saved history</label>
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input id="life-guide-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={200} autoComplete="off" placeholder="e.g. What was my latest prescription?" className="h-12 w-full rounded-xl border bg-white pl-10 pr-3 text-sm shadow-sm"/></div>
          <Button type="submit" className="h-12" disabled={!question.trim()}>Find from my records</Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">{starterQuestions.map((starter) => <button type="button" key={starter} onClick={() => ask(starter)} className="rounded-full border border-emerald-900/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-white hover:text-foreground">{starter}</button>)}</div>
      </div>
      <aside className="rounded-2xl border border-emerald-900/10 bg-white/65 p-4 text-xs leading-5 text-muted-foreground"><p className="flex items-center gap-2 font-semibold text-foreground"><LockKeyhole className="size-4 text-primary"/>Private by design</p><p className="mt-2">This first version searches locally in the page. It does not send your question or records to an AI provider.</p><p className="mt-3 flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary"/>No diagnosis, prescriptions, financial advice, or invented facts.</p></aside>
    </div>

    {answer && <div className="border-t border-emerald-900/10 bg-white/55 p-6 sm:p-8" aria-live="polite">
      <p className="text-lg font-semibold tracking-tight">{answer.answer}</p>
      {answer.caveat && <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{answer.caveat}</p>}
      {answer.matches.length > 0 && <div className="mt-5 grid gap-3 lg:grid-cols-2">{answer.matches.map((fact) => <article key={`${fact.category}-${fact.id}`} className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2"><Badge className={fact.provenance === "USER_CONFIRMED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : undefined}>{fact.provenance === "USER_CONFIRMED" ? "User confirmed" : "User entered"}</Badge><span className="text-xs font-semibold text-primary">{fact.category}</span></div>
        <h3 className="mt-3 font-semibold">{fact.title}</h3><p className="mt-1 text-xs text-muted-foreground">{fact.occurredAtLabel}{fact.providerName ? ` · ${fact.providerName}` : ""}</p>
        {fact.description && <p className="mt-3 line-clamp-3 text-sm leading-6">{fact.description}</p>}
        {fact.medications.length > 0 && <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">{fact.medications.map((medication, index) => <li key={`${medication.name}-${index}`}><strong className="text-foreground">{medication.name}</strong>{medication.instructions ? ` — ${medication.instructions}` : ""}</li>)}</ul>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs"><Link href={fact.href} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Open in LifeOS<ArrowUpRight className="size-3.5"/></Link>{fact.sourceDocument?.available ? <a href={`/api/documents/${fact.sourceDocument.id}/download`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"><Download className="size-3.5"/>Source</a> : <span className="text-muted-foreground">{fact.sourceDocument ? "Source deleted" : "No source document"}</span>}</div>
      </article>)}</div>}
    </div>}
  </section>;
}
