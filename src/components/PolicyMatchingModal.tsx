/* ─────────────────────────────────────────────────────────────────────────────
   PolicyMatchingModal
   -----------------------------------------------------------------------------
   Tree-of-checkboxes picker for selecting folders → policies → sub-policies,
   with free-text search and tag filtering. Rendered inside the Alloy Dialog.

   Selection model: when a parent is checked, all of its descendants are
   considered selected (the modal auto-syncs descendants into the selected-id
   sets on toggle). A descendant can also be independently checked while its
   parent is not. The Policy node receives three separate string[] arrays
   (folders / policies / sub-policies) on Save.
   ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@alloy/components/Dialog';
import { Button } from '@alloy/components/Button';
import { SearchField } from '@alloy/components/Input';
import { Checkbox } from '@alloy/components/Checkbox';
import { Tag } from '@alloy/components/Tag';
import { Badge } from '@alloy/components/Badge';
import { ChevronRightIcon } from '@alloy/components/icons/ChevronRightIcon';
import { FolderIcon } from '@alloy/components/icons/FolderIcon';
import styles from './PolicyMatchingModal.module.css';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PolicySelection {
  folders: string[];
  policies: string[];
  subPolicies: string[];
}

interface SubPolicy {
  id: string;
  label: string;
  tags: string[];
}

interface Policy {
  id: string;
  label: string;
  tags: string[];
  subPolicies: SubPolicy[];
}

interface Folder {
  id: string;
  label: string;
  policies: Policy[];
}

// ── Sample data ──────────────────────────────────────────────────────────────
// Replace with real API data when backend lands.

const POLICY_LIBRARY: Folder[] = [
  {
    id: 'folder_time_attendance',
    label: 'Time & Attendance',
    policies: [
      {
        id: 'policy_overtime',
        label: 'Overtime Policies',
        tags: ['Overtime', 'Compliance'],
        subPolicies: [
          { id: 'sub_ca_daily_ot',      label: 'CA Daily Overtime',        tags: ['Overtime', 'California'] },
          { id: 'sub_federal_weekly_ot', label: 'Federal Weekly Overtime',  tags: ['Overtime', 'Federal']    },
          { id: 'sub_double_time',       label: 'Double Time Threshold',    tags: ['Overtime']               },
        ],
      },
      {
        id: 'policy_breaks',
        label: 'Break Policies',
        tags: ['Break', 'Compliance'],
        subPolicies: [
          { id: 'sub_ca_meal',  label: 'CA Meal Break',  tags: ['Break', 'California'] },
          { id: 'sub_ca_rest',  label: 'CA Rest Break',  tags: ['Break', 'California'] },
          { id: 'sub_ny_meal',  label: 'NY Meal Break',  tags: ['Break', 'New York']   },
        ],
      },
      {
        id: 'policy_attendance',
        label: 'Attendance Policies',
        tags: ['Attendance'],
        subPolicies: [
          { id: 'sub_tardiness',   label: 'Tardiness Threshold',  tags: ['Attendance'] },
          { id: 'sub_no_call',     label: 'No-Call No-Show',      tags: ['Attendance'] },
        ],
      },
    ],
  },
  {
    id: 'folder_payroll',
    label: 'Payroll',
    policies: [
      {
        id: 'policy_pay_rates',
        label: 'Regular Pay Rates',
        tags: ['Pay'],
        subPolicies: [
          { id: 'sub_standard_rate', label: 'Standard Rate',    tags: ['Pay'] },
          { id: 'sub_shift_diff',    label: 'Shift Differential', tags: ['Pay'] },
        ],
      },
      {
        id: 'policy_holiday_pay',
        label: 'Holiday Pay',
        tags: ['Holiday', 'Pay'],
        subPolicies: [
          { id: 'sub_federal_holiday', label: 'Federal Holiday', tags: ['Holiday'] },
          { id: 'sub_state_holiday',   label: 'State Holiday',   tags: ['Holiday'] },
        ],
      },
      {
        id: 'policy_fringe',
        label: 'Fringe & Per Diem',
        tags: ['Pay'],
        subPolicies: [
          { id: 'sub_fringe_rate', label: 'Fringe Rate',  tags: ['Pay'] },
          { id: 'sub_per_diem',    label: 'Per Diem',     tags: ['Pay'] },
        ],
      },
    ],
  },
  {
    id: 'folder_compliance',
    label: 'Compliance',
    policies: [
      {
        id: 'policy_credentialing',
        label: 'Credentialing',
        tags: ['Credentialing', 'Compliance'],
        subPolicies: [
          { id: 'sub_license',    label: 'License Verification', tags: ['Credentialing'] },
          { id: 'sub_background', label: 'Background Check',     tags: ['Credentialing'] },
        ],
      },
      {
        id: 'policy_certifications',
        label: 'Certifications',
        tags: ['Credentialing'],
        subPolicies: [
          { id: 'sub_bls',   label: 'BLS Certification',  tags: ['Credentialing'] },
          { id: 'sub_hipaa', label: 'HIPAA Training',     tags: ['Compliance']    },
        ],
      },
    ],
  },
];

const ALL_TAGS = Array.from(
  new Set(
    POLICY_LIBRARY.flatMap(f =>
      f.policies.flatMap(p => [...p.tags, ...p.subPolicies.flatMap(s => s.tags)]),
    ),
  ),
).sort();

/** Flat lists of every id in the library — used by the "All selected"
 *  master checkbox above the tree to toggle everything in one action. */
const ALL_FOLDER_IDS = POLICY_LIBRARY.map(f => f.id);
const ALL_POLICY_IDS = POLICY_LIBRARY.flatMap(f => f.policies.map(p => p.id));
const ALL_SUBPOLICY_IDS = POLICY_LIBRARY.flatMap(f =>
  f.policies.flatMap(p => p.subPolicies.map(s => s.id)),
);
const TOTAL_FOLDER_COUNT    = ALL_FOLDER_IDS.length;
const TOTAL_POLICY_COUNT    = ALL_POLICY_IDS.length;
const TOTAL_SUBPOLICY_COUNT = ALL_SUBPOLICY_IDS.length;

// ── Helpers ──────────────────────────────────────────────────────────────────

function matchesQuery(text: string, query: string): boolean {
  if (!query) return true;
  return text.toLowerCase().includes(query.toLowerCase());
}

function hasAnyTag(itemTags: string[], activeTags: Set<string>): boolean {
  if (activeTags.size === 0) return true;
  return itemTags.some(t => activeTags.has(t));
}

/** Filter the library to only entries that match the search query & tag set.
 *  A folder is included if it has any visible policy. A policy is included
 *  if its label matches, it has a matching tag, or at least one of its
 *  sub-policies matches. */
function filterLibrary(query: string, activeTags: Set<string>): Folder[] {
  return POLICY_LIBRARY.map(folder => {
    const policies = folder.policies
      .map(policy => {
        const visibleSubs = policy.subPolicies.filter(s =>
          (matchesQuery(s.label, query) || matchesQuery(policy.label, query) || matchesQuery(folder.label, query)) &&
          (hasAnyTag(s.tags, activeTags) || hasAnyTag(policy.tags, activeTags))
        );
        const policySelfVisible =
          (matchesQuery(policy.label, query) || matchesQuery(folder.label, query)) &&
          hasAnyTag(policy.tags, activeTags);
        if (!policySelfVisible && visibleSubs.length === 0) return null;
        return { ...policy, subPolicies: visibleSubs.length ? visibleSubs : policy.subPolicies };
      })
      .filter((p): p is Policy => p !== null);
    if (policies.length === 0) return null;
    return { ...folder, policies };
  }).filter((f): f is Folder => f !== null);
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface PolicyMatchingModalProps {
  open: boolean;
  initialSelection: PolicySelection;
  onCancel: () => void;
  onSave: (selection: PolicySelection) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function PolicyMatchingModal({ open, initialSelection, onCancel, onSave }: PolicyMatchingModalProps) {
  // Initial selection is empty by default; we seed it with the full
  // library so the "All selected" master checkbox at the top of the
  // tree starts checked. Callers passing their own non-empty initial
  // selection (e.g. previously-configured policy nodes) keep that.
  const seedInitial = useCallback(() => {
    const hasAny =
      initialSelection.folders.length +
      initialSelection.policies.length +
      initialSelection.subPolicies.length > 0;
    return hasAny
      ? {
          f: new Set<string>(initialSelection.folders),
          p: new Set<string>(initialSelection.policies),
          s: new Set<string>(initialSelection.subPolicies),
        }
      : {
          f: new Set<string>(ALL_FOLDER_IDS),
          p: new Set<string>(ALL_POLICY_IDS),
          s: new Set<string>(ALL_SUBPOLICY_IDS),
        };
  }, [initialSelection]);

  const [folders,     setFolders]     = useState<Set<string>>(() => seedInitial().f);
  const [policies,    setPolicies]    = useState<Set<string>>(() => seedInitial().p);
  const [subPolicies, setSubPolicies] = useState<Set<string>>(() => seedInitial().s);
  const [query,       setQuery]       = useState('');
  const [activeTags,  setActiveTags]  = useState<Set<string>>(new Set());
  const [expanded,    setExpanded]    = useState<Set<string>>(new Set());

  // Reset draft state whenever modal opens with a (possibly new) initial selection
  useEffect(() => {
    if (!open) return;
    const seed = seedInitial();
    setFolders(seed.f);
    setPolicies(seed.p);
    setSubPolicies(seed.s);
    setQuery('');
    setActiveTags(new Set());
    // Expand any folder/policy that already has a selection so the user sees their picks
    const toExpand = new Set<string>([...seed.f, ...seed.p]);
    setExpanded(toExpand);
  }, [open, seedInitial]);

  // True when the current selection covers every id in the library — drives
  // the "All selected" master checkbox at the top of the tree. Becomes
  // false the moment the user unchecks any item.
  const allSelected =
    folders.size    === TOTAL_FOLDER_COUNT &&
    policies.size   === TOTAL_POLICY_COUNT &&
    subPolicies.size === TOTAL_SUBPOLICY_COUNT;

  const toggleAll = () => {
    if (allSelected) {
      // Clearing — drop every selection.
      setFolders(new Set());
      setPolicies(new Set());
      setSubPolicies(new Set());
    } else {
      // Selecting all — populate every id from the library.
      setFolders(new Set(ALL_FOLDER_IDS));
      setPolicies(new Set(ALL_POLICY_IDS));
      setSubPolicies(new Set(ALL_SUBPOLICY_IDS));
    }
  };

  const visible = useMemo(() => filterLibrary(query, activeTags), [query, activeTags]);

  const toggleFolder = (folder: Folder) => {
    const checked = folders.has(folder.id);
    const nextF = new Set(folders);
    const nextP = new Set(policies);
    const nextS = new Set(subPolicies);
    if (checked) {
      nextF.delete(folder.id);
      folder.policies.forEach(p => {
        nextP.delete(p.id);
        p.subPolicies.forEach(s => nextS.delete(s.id));
      });
    } else {
      nextF.add(folder.id);
      folder.policies.forEach(p => {
        nextP.add(p.id);
        p.subPolicies.forEach(s => nextS.add(s.id));
      });
    }
    setFolders(nextF);
    setPolicies(nextP);
    setSubPolicies(nextS);
  };

  const togglePolicy = (policy: Policy) => {
    const checked = policies.has(policy.id);
    const nextP = new Set(policies);
    const nextS = new Set(subPolicies);
    if (checked) {
      nextP.delete(policy.id);
      policy.subPolicies.forEach(s => nextS.delete(s.id));
    } else {
      nextP.add(policy.id);
      policy.subPolicies.forEach(s => nextS.add(s.id));
    }
    setPolicies(nextP);
    setSubPolicies(nextS);
  };

  const toggleSubPolicy = (subId: string) => {
    const next = new Set(subPolicies);
    if (next.has(subId)) next.delete(subId); else next.add(subId);
    setSubPolicies(next);
  };

  const toggleExpanded = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  const toggleTag = (tag: string) => {
    const next = new Set(activeTags);
    if (next.has(tag)) next.delete(tag); else next.add(tag);
    setActiveTags(next);
  };

  const totalSelected =
    `${folders.size} folder${folders.size === 1 ? '' : 's'}, ` +
    `${policies.size} polic${policies.size === 1 ? 'y' : 'ies'}, ` +
    `${subPolicies.size} sub-polic${subPolicies.size === 1 ? 'y' : 'ies'} selected`;

  const handleSave = () => {
    onSave({
      folders: Array.from(folders),
      policies: Array.from(policies),
      subPolicies: Array.from(subPolicies),
    });
  };

  return (
    <Dialog open={open} onClose={onCancel} size="lg" aria-label="Policy matching">
      <DialogHeader onClose={onCancel}>Policy matching</DialogHeader>
      <DialogContent>
        <div className={styles.body}>
          {/* Master "All selected" row — sits at the very top of the
              modal body, above the search and tag filters, so the
              user's "select everything" affordance is the first thing
              they see. Checked by default (the modal seeds the
              selection with the full library when no prior selection
              exists); the `allSelected` flag is derived from the
              selection sets, so unchecking any item below
              automatically flips this back to off. */}
          <div
            className={`${styles.row} ${styles.rowFolder}`}
            onClick={toggleAll}
            role="button"
            aria-pressed={allSelected}
          >
            <span className={styles.checkboxSlot} onClick={e => e.stopPropagation()}>
              <Checkbox size="sm" checked={allSelected} onChange={toggleAll} />
            </span>
            <span className={styles.rowLabel}>All selected</span>
            <span className={styles.countBadge}>
              {folders.size + policies.size + subPolicies.size}
              {' / '}
              {TOTAL_FOLDER_COUNT + TOTAL_POLICY_COUNT + TOTAL_SUBPOLICY_COUNT}
            </span>
          </div>

          <div className={styles.filters}>
            <div className={styles.searchField}>
              <SearchField
                size="md"
                placeholder="Search folders, policies, or sub-policies…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label="Search policies"
              />
            </div>
          </div>

          <div className={styles.tagFilter} role="group" aria-label="Filter by tag">
            {ALL_TAGS.map(tag => {
              const selected = activeTags.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={selected ? `${styles.tagChip} ${styles.tagChipSelected}` : styles.tagChip}
                  onClick={() => toggleTag(tag)}
                  aria-pressed={selected}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <div className={styles.tree} role="tree">
            {visible.length === 0 ? (
              <div className={styles.treeEmpty}>No policies match your search.</div>
            ) : (
              visible.map(folder => {
                const folderOpen = expanded.has(folder.id);
                const folderChecked = folders.has(folder.id);
                return (
                  <div key={folder.id} className={styles.folder}>
                    <div
                      className={`${styles.row} ${styles.rowFolder}`}
                      onClick={() => toggleExpanded(folder.id)}
                      role="treeitem"
                      aria-expanded={folderOpen}
                    >
                      <span
                        className={folderOpen ? `${styles.disclosure} ${styles.disclosureOpen}` : styles.disclosure}
                        aria-hidden
                      >
                        <ChevronRightIcon size={12} />
                      </span>
                      <span onClick={e => e.stopPropagation()} className={styles.checkboxSlot}>
                        <Checkbox
                          size="sm"
                          checked={folderChecked}
                          onChange={() => toggleFolder(folder)}
                          aria-label={`Select all policies in ${folder.label}`}
                        />
                      </span>
                      <span className={styles.rowFolderIcon} aria-hidden>
                        <FolderIcon size={14} />
                      </span>
                      <span className={styles.rowLabel}>{folder.label}</span>
                      <Badge variant="neutral">{folder.policies.length}</Badge>
                    </div>

                    {folderOpen && folder.policies.map(policy => {
                      const policyOpen = expanded.has(policy.id);
                      const policyChecked = policies.has(policy.id);
                      return (
                        <div key={policy.id}>
                          <div
                            className={`${styles.row} ${styles.rowPolicy}`}
                            onClick={() => toggleExpanded(policy.id)}
                            role="treeitem"
                            aria-expanded={policyOpen}
                          >
                            <span
                              className={policyOpen ? `${styles.disclosure} ${styles.disclosureOpen}` : styles.disclosure}
                              aria-hidden
                            >
                              <ChevronRightIcon size={12} />
                            </span>
                            <span onClick={e => e.stopPropagation()} className={styles.checkboxSlot}>
                              <Checkbox
                                size="sm"
                                checked={policyChecked}
                                onChange={() => togglePolicy(policy)}
                                aria-label={`Select ${policy.label}`}
                              />
                            </span>
                            <span className={styles.rowLabel}>{policy.label}</span>
                            <span className={styles.rowTags}>
                              {policy.tags.map(t => (
                                <Tag key={t} size="sm" variant="subtle" color="neutral">{t}</Tag>
                              ))}
                            </span>
                          </div>

                          {policyOpen && policy.subPolicies.map(sub => (
                            <div
                              key={sub.id}
                              className={`${styles.row} ${styles.rowSubPolicy}`}
                              role="treeitem"
                            >
                              <span className={styles.disclosure} aria-hidden />
                              <span onClick={e => e.stopPropagation()} className={styles.checkboxSlot}>
                                <Checkbox
                                  size="sm"
                                  checked={subPolicies.has(sub.id)}
                                  onChange={() => toggleSubPolicy(sub.id)}
                                  aria-label={`Select ${sub.label}`}
                                />
                              </span>
                              <span className={styles.rowLabel}>{sub.label}</span>
                              <span className={styles.rowTags}>
                                {sub.tags.map(t => (
                                  <Tag key={t} size="sm" variant="subtle" color="neutral">{t}</Tag>
                                ))}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <span className={styles.footerSummary}>{totalSelected}</span>
        <Button variant="secondary" size="md" onClick={onCancel}>Cancel</Button>
        <Button variant="primary"   size="md" onClick={handleSave}>Save</Button>
      </DialogFooter>
    </Dialog>
  );
}
