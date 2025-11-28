// lib/db.ts
import { openDB } from "idb";

const DB_NAME = "saybetter-db";
const DB_VERSION = 2;
const STORE_SNIPPETS = "snippets";

export interface Snippet {
    id?: number;
    input: string;
    corrected: string;
    professional: string;
    casual: string;
    genz?: string;
    tone?: string;
    createdAt: number;
}

async function getDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_SNIPPETS)) {
                const store = db.createObjectStore(STORE_SNIPPETS, {
                    keyPath: "id",
                    autoIncrement: true,
                });
                store.createIndex("createdAt", "createdAt");
            }
        },
    });
}

export async function saveSnippet(snippet: Omit<Snippet, "id">) {
    const db = await getDB();
    const tx = db.transaction(STORE_SNIPPETS, "readwrite");
    await tx.store.add(snippet);
    await tx.done;
}

export async function loadSnippets(): Promise<Snippet[]> {
    const db = await getDB();
    const tx = db.transaction(STORE_SNIPPETS, "readonly");
    const index = tx.store.index("createdAt");
    const all = await index.getAll();
    await tx.done;
    // terbaru di atas
    return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function clearSnippets() {
    const db = await getDB();
    const tx = db.transaction(STORE_SNIPPETS, "readwrite");
    await tx.store.clear();
    await tx.done;
}
