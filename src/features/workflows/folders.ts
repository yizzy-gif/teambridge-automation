/* ─────────────────────────────────────────────────────────────────────────────
   Workflows · folder grouping
   -----------------------------------------------------------------------------
   Local-first folder model for the Manage page. Folders own a flat group of
   workflows; the system "Uncategorized" folder always exists last and holds
   workflows whose `folderId` is null. State persists to localStorage so a
   page reload preserves the grouping until the API is wired.

   TODO(api): replace each hook with a real fetch + mutation pair against the
   backend folder endpoints once they exist.
   ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useState } from 'react';

export interface WorkflowFolder {
  /** "uncategorized" is reserved for the system folder; user folders use
   *  random ids so name collisions never bleed into identity. */
  id: string;
  name: string;
  isSystem: boolean;
  /** User-controlled ordering. Ignored for the system folder, which is
   *  always pinned last. */
  order: number;
}

/** Reserved id for the system "Uncategorized" folder. */
export const UNCATEGORIZED_FOLDER_ID = 'uncategorized';

/** Workflow → folder assignment store. Keyed by workflow id, value is the
 *  folder id (or null for Uncategorized). Lives next to the folder list so
 *  hooks can mutate both with one localStorage write. */
type FolderStore = {
  folders: WorkflowFolder[];
  /** workflowId → folderId | null */
  assignments: Record<string, string | null>;
};

const STORAGE_KEY = 'teambridge:manage:folder-store';

const SYSTEM_FOLDER: WorkflowFolder = {
  id: UNCATEGORIZED_FOLDER_ID,
  name: 'Uncategorized',
  isSystem: true,
  order: Number.POSITIVE_INFINITY,
};

function loadStore(): FolderStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { folders: [], assignments: {} };
    const parsed = JSON.parse(raw) as FolderStore;
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      assignments: parsed.assignments && typeof parsed.assignments === 'object'
        ? parsed.assignments
        : {},
    };
  } catch {
    return { folders: [], assignments: {} };
  }
}

function saveStore(store: FolderStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch { /* swallow — not blocking the UI on a quota / privacy error */ }
}

// ─── Cross-hook subscription bus ─────────────────────────────────────────────
// Multiple hooks can read folders / assignments in different parts of the
// page tree; a tiny pub-sub keeps every consumer in sync after a mutation
// without requiring a Context or external store.

type Listener = () => void;
const listeners = new Set<Listener>();

let memoryStore: FolderStore | null = null;

function getStore(): FolderStore {
  if (!memoryStore) memoryStore = loadStore();
  return memoryStore;
}

function setStore(updater: (prev: FolderStore) => FolderStore) {
  const next = updater(getStore());
  memoryStore = next;
  saveStore(next);
  listeners.forEach(l => l());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ─── Public ordering helper ──────────────────────────────────────────────────

/** Stable folder list — user folders by `order`, then the system folder. */
export function orderedFolders(folders: WorkflowFolder[]): WorkflowFolder[] {
  const user = folders
    .filter(f => !f.isSystem)
    .slice()
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return [...user, SYSTEM_FOLDER];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Returns the current folder list (user folders + system folder, in order)
 *  and the per-workflow assignment map. Re-renders on any mutation. */
export function useWorkflowFolders() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = subscribe(() => setTick(t => t + 1));
    return () => { unsubscribe(); };
  }, []);
  // tick is read so React picks up the dependency for the rerender; the
  // value itself is irrelevant.
  void tick;
  const store = getStore();
  return {
    folders: orderedFolders(store.folders),
    assignments: store.assignments,
  };
}

/** Append a new user folder. Returns the created folder id. */
export function useCreateFolder() {
  return useCallback((name: string): string => {
    const trimmed = name.trim();
    if (trimmed === '') throw new Error('Folder name cannot be empty');
    const id = `folder_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    setStore(prev => {
      // New folders show at the TOP of the list. We assign an order that
      // is one less than the current minimum so the existing sort
      // (ascending, with the system folder pinned last) places the new
      // folder first without renumbering anything else.
      const nextOrder = prev.folders.reduce(
        (min, f) => (f.isSystem ? min : Math.min(min, f.order)),
        0,
      ) - 1;
      return {
        ...prev,
        folders: [
          ...prev.folders,
          { id, name: trimmed, isSystem: false, order: nextOrder },
        ],
      };
    });
    return id;
  }, []);
}

/** Rename a user folder. No-op for the system folder. */
export function useRenameFolder() {
  return useCallback((id: string, name: string) => {
    if (id === UNCATEGORIZED_FOLDER_ID) return;
    const trimmed = name.trim();
    if (trimmed === '') return;
    setStore(prev => ({
      ...prev,
      folders: prev.folders.map(f =>
        f.id === id ? { ...f, name: trimmed } : f,
      ),
    }));
  }, []);
}

/** Delete a user folder. Workflows in the folder are reassigned to
 *  Uncategorized (folderId = null). No-op for the system folder. */
export function useDeleteFolder() {
  return useCallback((id: string) => {
    if (id === UNCATEGORIZED_FOLDER_ID) return;
    setStore(prev => {
      const nextAssignments: Record<string, string | null> = {};
      for (const [wfId, folderId] of Object.entries(prev.assignments)) {
        nextAssignments[wfId] = folderId === id ? null : folderId;
      }
      return {
        folders: prev.folders.filter(f => f.id !== id),
        assignments: nextAssignments,
      };
    });
  }, []);
}

/** Move a workflow to a folder, or to Uncategorized when `folderId` is null. */
export function useMoveWorkflowToFolder() {
  return useCallback((workflowId: string, folderId: string | null) => {
    setStore(prev => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        [workflowId]: folderId === UNCATEGORIZED_FOLDER_ID ? null : folderId,
      },
    }));
  }, []);
}

/** Resolve a workflow's folder id, defaulting to null (Uncategorized). */
export function getWorkflowFolderId(
  assignments: Record<string, string | null>,
  workflowId: string,
): string | null {
  const v = assignments[workflowId];
  return v === undefined ? null : v;
}
