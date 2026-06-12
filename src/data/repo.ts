/**
 * The single seam the app reads and writes through. Screens import `{ repo }`
 * from here and nothing else about storage. Swapping IndexedDB for Supabase
 * later means changing only this line — every screen keeps importing `repo`.
 */
import type { Repository } from '@/lib/types';
import { DexieRepository } from './DexieRepository';

export const repo: Repository = new DexieRepository();
