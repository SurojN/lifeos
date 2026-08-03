import "../styles.css";
import { futureValue, inflationAdjusted } from "./domain/calculations.ts";
import { createConfirmedMedicalEvent, createStoredDocument, createUserEnteredEvent } from "./domain/factories.ts";
import type { DocumentCategory, LifeEvent, LifeEventCategory, RetirementPlan, StoredSourceDocument } from "./domain/models.ts";
import { normalizeRetirementPlan, validateDocumentFile } from "./domain/validation.ts";
import { IndexedDbLifeOSRepository } from "./storage/indexed-db-repository.ts";

const defaultPlan: RetirementPlan = { currentAge: 30, retirementAge: 60, currentSavings: 0, monthlyContribution: 5000, expectedAnnualReturn: 10, expectedInflation: 6, desiredMonthlyExpense: 50000 };
const categoryLabels: Partial<Record<LifeEventCategory, string>> = { health: "Health", finance: "Finance", travel: "Travel", education: "Education", general: "General" };
const repository = new IndexedDbLifeOSRepository();
const state: { events: LifeEvent[]; plan: RetirementPlan; documents: StoredSourceDocument[] } = { events: [], plan: defaultPlan, documents: [] };

function element<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing required interface element: ${selector}`);
  return found;
}

function uuid(): string { return globalThis.crypto.randomUUID(); }
function money(value: number): string { return new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0); }
function escapeHtml(value: unknown): string { return String(value).replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character] ?? character); }
function formatDate(value: string): string { return new Date(`${value}T00:00:00`).toLocaleDateString("en-NP", { year: "numeric", month: "short", day: "numeric" }); }
function notify(message: string): void { const notice = element<HTMLButtonElement>("#notice"); notice.textContent = `${message} ×`; notice.classList.remove("hidden"); }
function reportError(error: unknown): void { notify(error instanceof Error ? error.message : "The local operation could not be completed."); }

function eventMarkup(events: LifeEvent[]): string {
  if (!events.length) return '<div class="empty">No events yet. Record the first trusted memory.</div>';
  return `<div class="event-list">${events.map(event => `<article class="event-row"><div class="event-icon ${escapeHtml(event.category)}">${escapeHtml(categoryLabels[event.category]?.[0] || "L")}</div><div class="event-body"><div><strong>${escapeHtml(event.title)}</strong><span>${formatDate(event.occurredAt)}</span></div>${event.description ? `<p>${escapeHtml(event.description)}</p>` : ""}<small>Source: ${escapeHtml(event.source.label)} · ${event.verificationStatus === "user_confirmed" ? "Confirmed" : "Unverified"}${event.source.documentId ? ` · <button class="text-button open-doc" data-id="${escapeHtml(event.source.documentId)}">Open source</button>` : ""}</small></div><button class="danger-text delete-event" data-id="${escapeHtml(event.id)}">Delete</button></article>`).join("")}</div>`;
}

function renderEvents(): void {
  const sorted = [...state.events].sort((a,b) => b.occurredAt.localeCompare(a.occurredAt) || b.createdAt.localeCompare(a.createdAt));
  const health = sorted.filter(event => event.category === "health");
  element("#overview-events").innerHTML = eventMarkup(sorted.slice(0,4));
  element("#timeline-events").innerHTML = eventMarkup(sorted);
  element("#health-events").innerHTML = eventMarkup(health);
  element("#event-count").textContent = `${sorted.length} events`;
  element("#health-count").textContent = `${health.length} records`;
  element("#metric-events").textContent = String(sorted.length);
  element("#metric-health").textContent = String(health.length);
}

function renderFinance(): void {
  const years = Math.max(0, state.plan.retirementAge - state.plan.currentAge);
  const fund = futureValue(state.plan);
  const todayValue = inflationAdjusted(fund, state.plan.expectedInflation, years);
  const income = todayValue * 0.04 / 12;
  Object.entries(state.plan).forEach(([key, value]) => { const input = document.querySelector<HTMLInputElement>(`[name="${key}"]`); if (input && document.activeElement !== input) input.value = String(value); });
  element("#metric-fund").textContent = money(fund); element("#years-label").textContent = `${years} years to your target`;
  element("#summary-fund").textContent = money(fund); element("#summary-today").textContent = money(todayValue); element("#summary-income").textContent = money(income);
  element("#result-fund").textContent = money(fund); element("#result-years").textContent = `${years} years`; element("#result-today").textContent = money(todayValue); element("#result-income").textContent = money(income); element("#result-desired").textContent = money(state.plan.desiredMonthlyExpense);
  element<HTMLElement>("#progress-bar").style.width = `${Math.min(100, Math.max(3, state.plan.currentSavings / Math.max(fund, 1) * 100))}%`;
  const status = element("#finance-status"); status.className = income >= state.plan.desiredMonthlyExpense ? "success-box" : "warning"; status.innerHTML = `<strong>${income >= state.plan.desiredMonthlyExpense ? "Projection meets the current target" : "Current assumptions may leave a gap"}</strong><p>Change contribution and return assumptions to understand sensitivity. Do not treat this as guaranteed.</p>`;
}

function renderDocuments(): void {
  element("#metric-docs").textContent = String(state.documents.length); element("#doc-count").textContent = `${state.documents.length} files`;
  element("#document-list").innerHTML = state.documents.length ? `<div class="document-list">${state.documents.map(document => `<div class="document-row"><div><strong>${escapeHtml(document.title)}</strong><span>${escapeHtml(document.filename)} · ${(document.size/1024).toFixed(1)} KB · ${document.extractionStatus === "reviewed" ? "Confirmed" : "Needs review"}</span></div><div><button class="text-button open-doc" data-id="${escapeHtml(document.id)}">Open</button>${document.category === "health" && document.extractionStatus !== "reviewed" ? `<button class="text-button review-doc" data-id="${escapeHtml(document.id)}">Review</button>` : ""}<button class="danger-text delete-doc" data-id="${escapeHtml(document.id)}">Delete</button></div></div>`).join("")}</div>` : '<div class="empty">No source documents saved yet.</div>';
}

function showMedicalReview(document: StoredSourceDocument): void {
  const panel = element<HTMLElement>("#medical-review-panel");
  const form = element<HTMLFormElement>("#medical-review-form");
  form.reset();
  form.elements.namedItem("documentId") && ((form.elements.namedItem("documentId") as HTMLInputElement).value = document.id);
  (form.elements.namedItem("title") as HTMLInputElement).value = document.title;
  (form.elements.namedItem("occurredOn") as HTMLInputElement).value = document.documentDate;
  panel.classList.remove("hidden");
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideMedicalReview(): void { element("#medical-review-panel").classList.add("hidden"); }

function renderAll(): void { renderEvents(); renderFinance(); renderDocuments(); }
function switchView(view: string): void { document.querySelectorAll(".view").forEach(node => node.classList.toggle("active", node.id === `view-${view}`)); document.querySelectorAll<HTMLElement>(".nav-button").forEach(button => button.classList.toggle("active", button.dataset.view === view)); element("#page-title").textContent = view === "overview" ? "Good morning. Your life, in one place." : view[0]?.toUpperCase() + view.slice(1); }
function setDefaultDates(): void { document.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach(input => { if (!input.value) input.value = new Date().toISOString().slice(0,10); }); }

document.querySelectorAll<HTMLElement>(".nav-button").forEach(button => button.addEventListener("click", () => switchView(button.dataset.view ?? "overview")));
document.querySelectorAll<HTMLElement>("[data-go]").forEach(button => button.addEventListener("click", () => switchView(button.dataset.go ?? "overview")));
element("#notice").addEventListener("click", event => (event.currentTarget as HTMLElement).classList.add("hidden"));

element<HTMLFormElement>("#event-form").addEventListener("submit", async event => {
  event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const data = new FormData(form);
  try { const item = createUserEnteredEvent({ title: String(data.get("title")), category: String(data.get("category")) as LifeEventCategory, occurredAt: String(data.get("occurredOn")), sourceLabel: String(data.get("source")), description: String(data.get("notes")) }, uuid(), new Date().toISOString()); await repository.putEvent(item); state.events.push(item); form.reset(); setDefaultDates(); renderEvents(); notify("Life event saved locally."); } catch (error) { reportError(error); }
});

element<HTMLFormElement>("#health-form").addEventListener("submit", async event => {
  event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const data = new FormData(form);
  try { const item = createUserEnteredEvent({ title: String(data.get("title")), category: "health", occurredAt: String(data.get("occurredOn")), sourceLabel: String(data.get("source")), description: String(data.get("notes")) }, uuid(), new Date().toISOString()); await repository.putEvent(item); state.events.push(item); form.reset(); setDefaultDates(); renderEvents(); notify("Medical record saved locally."); } catch (error) { reportError(error); }
});

element<HTMLFormElement>("#finance-form").addEventListener("input", event => {
  const input = event.target as HTMLInputElement; if (!input.name) return;
  state.plan = normalizeRetirementPlan({ ...state.plan, [input.name]: Number(input.value) }); renderFinance();
  void repository.putRetirementPlan(state.plan).catch(reportError);
});

element<HTMLFormElement>("#vault-form").addEventListener("submit", async event => {
  event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const data = new FormData(form); const file = data.get("file"); if (!(file instanceof File) || !file.size) return;
  try { const errors = validateDocumentFile(file); if (errors.length) throw new Error(errors.join(" ")); const item = createStoredDocument({ title: String(data.get("title")), category: String(data.get("category")) as DocumentCategory, documentDate: String(data.get("occurredOn")), file }, uuid(), new Date().toISOString()); await repository.putDocument(item); state.documents = await repository.listDocuments(); form.reset(); setDefaultDates(); renderDocuments(); notify("Document saved inside this browser only."); } catch (error) { reportError(error); }
});

element("#cancel-review").addEventListener("click", hideMedicalReview);
element<HTMLFormElement>("#medical-review-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  const document = state.documents.find(item => item.id === String(data.get("documentId")));
  if (!document) return reportError(new Error("The source document could not be found."));
  try {
    const item = createConfirmedMedicalEvent({ title: String(data.get("title")), occurredAt: String(data.get("occurredOn")), provider: String(data.get("provider")), facts: String(data.get("facts")) }, document, uuid(), new Date().toISOString());
    const reviewedDocument: StoredSourceDocument = { ...document, extractionStatus: "reviewed" };
    await repository.confirmMedicalDocument(reviewedDocument, item);
    state.events.push(item);
    state.documents = state.documents.map(current => current.id === reviewedDocument.id ? reviewedDocument : current);
    hideMedicalReview(); renderEvents(); renderDocuments(); notify("Confirmed medical event linked to its source document.");
  } catch (error) { reportError(error); }
});

document.body.addEventListener("click", async event => {
  const target = event.target as Element;
  try {
    const deleteEvent = target.closest<HTMLElement>(".delete-event"); if (deleteEvent?.dataset.id) { await repository.deleteEvent(deleteEvent.dataset.id); state.events = state.events.filter(item => item.id !== deleteEvent.dataset.id); renderEvents(); }
    const openDoc = target.closest<HTMLElement>(".open-doc"); if (openDoc) { const document = state.documents.find(item => item.id === openDoc.dataset.id); if (document) { const url = URL.createObjectURL(document.blob); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60000); } }
    const reviewDoc = target.closest<HTMLElement>(".review-doc"); if (reviewDoc) { const document = state.documents.find(item => item.id === reviewDoc.dataset.id); if (document) showMedicalReview(document); }
    const deleteDoc = target.closest<HTMLElement>(".delete-doc"); if (deleteDoc?.dataset.id) { await repository.deleteDocument(deleteDoc.dataset.id); state.documents = await repository.listDocuments(); renderDocuments(); }
  } catch (error) { reportError(error); }
});

element("#export-btn").addEventListener("click", () => { const payload = { format: "lifeos-export-v2", schemaVersion: 2, exportedAt: new Date().toISOString(), events: state.events, retirementPlan: state.plan, note: "Vault files remain local and are not included." }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `lifeos-export-${new Date().toISOString().slice(0,10)}.json`; anchor.click(); URL.revokeObjectURL(url); });
element("#reset-btn").addEventListener("click", async () => { if (!confirm("Delete locally stored events and retirement settings? Vault files must be deleted individually.")) return; try { await Promise.all(state.events.map(event => repository.deleteEvent(event.id))); state.events = []; state.plan = { ...defaultPlan }; await repository.putRetirementPlan(state.plan); renderAll(); notify("Prototype data reset."); } catch (error) { reportError(error); } });

async function start(): Promise<void> {
  setDefaultDates();
  try { await repository.initialize(defaultPlan); state.events = await repository.listEvents(); state.plan = await repository.getRetirementPlan() ?? defaultPlan; state.documents = await repository.listDocuments(); renderAll(); }
  catch (error) { reportError(error); renderAll(); }
}

void start();
