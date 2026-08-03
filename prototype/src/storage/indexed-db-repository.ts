import type { LifeEvent, RetirementPlan, StoredSourceDocument } from "../domain/models.ts";
import { validateLifeEvent } from "../domain/validation.ts";
import {
  LEGACY_EVENT_KEY, LEGACY_PLAN_KEY, MIGRATION_SETTING_KEY, RETIREMENT_SETTING_KEY,
  migrateLegacyEvents, migrateLegacyPlan, migrateStoredDocument,
} from "./migration.ts";
import type { LifeOSRepository } from "./repository.ts";

const DB_NAME = "lifeos-vault";
const DB_VERSION = 2;
const EVENTS = "events";
const DOCUMENTS = "documents";
const SETTINGS = "settings";

interface Setting<T> { key: string; value: T }

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local database request failed."));
  });
}

export class IndexedDbLifeOSRepository implements LifeOSRepository {
  private db?: IDBDatabase;

  async initialize(defaultPlan: RetirementPlan): Promise<void> {
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DOCUMENTS)) db.createObjectStore(DOCUMENTS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(EVENTS)) db.createObjectStore(EVENTS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS, { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Could not open local LifeOS storage."));
      request.onblocked = () => reject(new Error("Local LifeOS storage upgrade is blocked by another tab."));
    });
    await this.migrateV1(defaultPlan);
  }

  private database(): IDBDatabase {
    if (!this.db) throw new Error("Local repository has not been initialized.");
    return this.db;
  }

  private async migrateV1(defaultPlan: RetirementPlan): Promise<void> {
    const db = this.database();
    const markerTx = db.transaction(SETTINGS, "readonly");
    const marker = await requestResult(markerTx.objectStore(SETTINGS).get(MIGRATION_SETTING_KEY));
    if (marker) return;

    let rawEvents: unknown;
    let rawPlan: unknown;
    try { rawEvents = JSON.parse(localStorage.getItem(LEGACY_EVENT_KEY) ?? "null"); } catch { rawEvents = null; }
    try { rawPlan = JSON.parse(localStorage.getItem(LEGACY_PLAN_KEY) ?? "null"); } catch { rawPlan = null; }
    const events = migrateLegacyEvents(rawEvents);
    const plan = migrateLegacyPlan(rawPlan, defaultPlan);
    const existingDocuments = await requestResult(db.transaction(DOCUMENTS, "readonly").objectStore(DOCUMENTS).getAll());

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([EVENTS, DOCUMENTS, SETTINGS], "readwrite");
      const eventStore = tx.objectStore(EVENTS);
      events.forEach(event => eventStore.put(event));
      const documentStore = tx.objectStore(DOCUMENTS);
      existingDocuments.map(migrateStoredDocument).filter(Boolean).forEach(document => documentStore.put(document));
      const settings = tx.objectStore(SETTINGS);
      settings.put({ key: RETIREMENT_SETTING_KEY, value: plan });
      settings.put({ key: MIGRATION_SETTING_KEY, value: { completedAt: new Date().toISOString(), legacyKeysRetained: true } });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not migrate local LifeOS data."));
      tx.onabort = () => reject(tx.error ?? new Error("Local LifeOS migration was aborted."));
    });
  }

  async listEvents(): Promise<LifeEvent[]> {
    return requestResult(this.database().transaction(EVENTS, "readonly").objectStore(EVENTS).getAll());
  }

  async putEvent(event: LifeEvent): Promise<void> {
    const errors = validateLifeEvent(event);
    if (errors.length) throw new Error(errors.join(" "));
    await this.write(EVENTS, store => store.put(event));
  }

  async deleteEvent(id: string): Promise<void> { await this.write(EVENTS, store => store.delete(id)); }

  async getRetirementPlan(): Promise<RetirementPlan | undefined> {
    const setting = await requestResult<Setting<RetirementPlan> | undefined>(this.database().transaction(SETTINGS, "readonly").objectStore(SETTINGS).get(RETIREMENT_SETTING_KEY));
    return setting?.value;
  }

  async putRetirementPlan(plan: RetirementPlan): Promise<void> {
    await this.write(SETTINGS, store => store.put({ key: RETIREMENT_SETTING_KEY, value: plan }));
  }

  async listDocuments(): Promise<StoredSourceDocument[]> {
    const values = await requestResult(this.database().transaction(DOCUMENTS, "readonly").objectStore(DOCUMENTS).getAll());
    return values.map(migrateStoredDocument).filter((item): item is StoredSourceDocument => Boolean(item));
  }

  async putDocument(document: StoredSourceDocument): Promise<void> { await this.write(DOCUMENTS, store => store.put(document)); }
  async deleteDocument(id: string): Promise<void> { await this.write(DOCUMENTS, store => store.delete(id)); }

  private async write(storeName: string, action: (store: IDBObjectStore) => void): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const tx = this.database().transaction(storeName, "readwrite");
      action(tx.objectStore(storeName));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not save local LifeOS data."));
      tx.onabort = () => reject(tx.error ?? new Error("Local LifeOS write was aborted."));
    });
  }
}
