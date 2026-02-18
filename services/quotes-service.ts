/**
 * Service for fetching curated Bible quotes from online.
 * 
 * Quotes are hosted as a JSON file on GitHub and fetched on startup.
 * They are curated for humor, dark humor, and out-of-context absurdity,
 * and filtered to be short (≤20 words).
 * 
 * To add/update quotes: edit data/quotes.json and push to GitHub.
 */

const QUOTES_URL = 'https://raw.githubusercontent.com/wallaceip/BibleQuotesApp/main/data/quotes.json';
const TIMEOUT_MS = 8000;
const MAX_WORDS = 20;

export interface Quote {
    id: string;
    text: string;
    verse: string;
    text_zh: string;
    verse_zh: string;
    tags?: string[];
}

let cachedPool: Quote[] = [];
let shuffledQueue: Quote[] = [];

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function wordCount(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Fetch the curated quotes pool from GitHub.
 * Filters to short quotes (≤20 words) and caches the result.
 */
async function ensurePool(): Promise<void> {
    if (cachedPool.length > 0) return;

    try {
        const res = await fetchWithTimeout(QUOTES_URL, TIMEOUT_MS);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Quote[] = await res.json();

        // Filter to short quotes only
        cachedPool = data.filter(q => wordCount(q.text) <= MAX_WORDS);

        // If filtering removed too many, relax to all quotes
        if (cachedPool.length < 20) {
            cachedPool = data;
        }
    } catch (e) {
        console.log('Failed to fetch online quotes:', e);
        // Fallback: use the local quotes
        try {
            const { QUOTES_DATA } = require('../constants/quotes');
            cachedPool = QUOTES_DATA.filter((q: Quote) => wordCount(q.text) <= MAX_WORDS);
            if (cachedPool.length < 20) {
                cachedPool = QUOTES_DATA;
            }
        } catch {
            cachedPool = [];
        }
    }

    shuffledQueue = shuffle(cachedPool);
}

/**
 * Get the next batch of shuffled quotes.
 * When the shuffled queue runs out, reshuffle the full pool.
 */
export async function fetchRandomBatch(count: number = 5): Promise<Quote[]> {
    await ensurePool();

    if (cachedPool.length === 0) return [];

    const batch: Quote[] = [];
    for (let i = 0; i < count; i++) {
        if (shuffledQueue.length === 0) {
            shuffledQueue = shuffle(cachedPool);
        }
        batch.push(shuffledQueue.pop()!);
    }
    return batch;
}

/**
 * Force refresh the pool from online (e.g. on pull-to-refresh).
 */
export async function refreshPool(): Promise<void> {
    cachedPool = [];
    shuffledQueue = [];
    await ensurePool();
}

/**
 * Builds a Bible Gateway URL for viewing the full passage.
 */
export function getBibleGatewayUrl(verse: string, language: string): string {
    const version = language === 'zh' ? 'CUVS' : 'NIV';
    const search = encodeURIComponent(verse);
    return `https://www.biblegateway.com/passage/?search=${search}&version=${version}`;
}
