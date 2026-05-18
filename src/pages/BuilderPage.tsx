import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, Fragment, isValidElement, cloneElement } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { Button } from '@alloy/components/Button';
import { Badge } from '@alloy/components/Badge';
import { Tag } from '@alloy/components/Tag';
import { StatusTag } from '@alloy/components/StatusTag';
import type { StatusTagStatus } from '@alloy/components/StatusTag';
import type { TagColor } from '@alloy/components/Tag';
import { DropdownMenu } from '@alloy/components/DropdownMenu';
import type { DropdownMenuGroup } from '@alloy/components/DropdownMenu';
import { SearchField, TextField, TextArea, NumberField, SelectField, MultiSelectField } from '@alloy/components/Input';
import inputStyles from '@alloy/components/Input/Input.module.css';
import dropdownStyles from '@alloy/components/DropdownMenu/DropdownMenu.module.css';
import { Tooltip } from '@alloy/components/Tooltip';
import tooltipStyles from '@alloy/components/Tooltip/Tooltip.module.css';
import { Tabs } from '@alloy/components/Tabs';
import { FilterPill, FilterPillGroup } from '@alloy/components/FilterPill';
import { Target04Icon } from '@alloy/components/icons/Target04Icon';
import { ArrowCircleBrokenRightIcon } from '@alloy/components/icons/ArrowCircleBrokenRightIcon';
import { Link01Icon } from '@alloy/components/icons/Link01Icon';
import { LinkBroken01Icon } from '@alloy/components/icons/LinkBroken01Icon';
import { ChevronDownIcon } from '@alloy/components/icons/ChevronDownIcon';
import { Grid01Icon } from '@alloy/components/icons/Grid01Icon';
import { XIcon } from '@alloy/components/icons/XIcon';
import { PlusIcon as AlloyPlusIcon } from '@alloy/components/icons/PlusIcon';
import tbAiLightLogo from '../assets/tb-ai-light.svg';
import tbAiDarkLogo from '../assets/tb-ai-dark.svg';
import { CheckCircleIcon } from '@alloy/components/icons/CheckCircleIcon';
import { Users03Icon } from '@alloy/components/icons/Users03Icon';
import { File04Icon } from '@alloy/components/icons/File04Icon';
import { Home02Icon } from '@alloy/components/icons/Home02Icon';
import { ClockIcon } from '@alloy/components/icons/ClockIcon';
import { ClipboardCheckIcon } from '@alloy/components/icons/ClipboardCheckIcon';
import { InfoCircleIcon } from '@alloy/components/icons/InfoCircleIcon';
import { MinusIcon } from '@alloy/components/icons/MinusIcon';
import { Edit03Icon } from '@alloy/components/icons/Edit03Icon';
import { Edit05Icon } from '@alloy/components/icons/Edit05Icon';
import { Mail01Icon } from '@alloy/components/icons/Mail01Icon';
import { Bell01Icon } from '@alloy/components/icons/Bell01Icon';
import { Announcement02Icon } from '@alloy/components/icons/Announcement02Icon';
import { Microphone02Icon } from '@alloy/components/icons/Microphone02Icon';
import { ArrowNarrowUpIcon } from '@alloy/components/icons/ArrowNarrowUpIcon';
import { ArrowNarrowRightIcon } from '@alloy/components/icons/ArrowNarrowRightIcon';
import { TeambridgeAIIcon } from '@alloy/components/icons/TeambridgeAIIcon';
import { SettingsGearIcon } from '@alloy/components/icons/SettingsGearIcon';
import { ChevronLeftIcon } from '@alloy/components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '@alloy/components/icons/ChevronRightIcon';
import { ScrollArea } from '@alloy/components/ScrollArea';
import { Divider } from '@alloy/components/Divider';
import { Dialog, DialogHeader, DialogContent } from '@alloy/components/Dialog';
import { AILoader } from '@alloy/components/ai/AILoader';
import { AIComposer, AIComposerInput } from '@alloy/components/ai/AIComposer';
import { AIAssistantMessage, AIUserMessage, AILabel, AITimestamp } from '@alloy/components/ai/AIThread';
import { AIActivityTrail, AIActivityStep } from '@alloy/components/ai/AIActivityTrail';
import { AIMessageActions } from '@alloy/components/ai/AIMessageActions';
import { Copy01Icon } from '@alloy/components/icons/Copy01Icon';
import { CheckSquareIcon } from '@alloy/components/icons/CheckSquareIcon';
import { ThumbsUpIcon } from '@alloy/components/icons/ThumbsUpIcon';
import { ThumbsDownIcon } from '@alloy/components/icons/ThumbsDownIcon';
// `RefreshCw04Icon` is already imported below — see the icon block.
import {
  ComposerActions,
  ComposerSendButton,
  ComposerVoiceButton,
  ComposerAttachment,
} from '@alloy/components/ComposerActions';
import { ToggleButton } from '@alloy/components/ToggleButton';
import { ListItem } from '@alloy/components/ListItem';
import { Trash03Icon } from '@alloy/components/icons/Trash03Icon';
import { RefreshCw04Icon } from '@alloy/components/icons/RefreshCw04Icon';
import { Eyebrow } from '@alloy/components/Eyebrow';
import { VolumeMaxIcon } from '@alloy/components/icons/VolumeMaxIcon';
import { SearchSmIcon } from '@alloy/components/icons/SearchSmIcon';
import { PlayIcon } from '@alloy/components/icons/PlayIcon';
import { FilterLinesIcon } from '@alloy/components/icons/FilterLinesIcon';
import { GitBranch01Icon } from '@alloy/components/icons/GitBranch01Icon';
import { CircularArrowIcon } from '@alloy/components/icons/CircularArrowIcon';
import { TriangleUpIcon } from '@alloy/components/icons/TriangleUpIcon';
import { AreaButton } from '@alloy/components/AreaButton';
import styles from './BuilderPage.module.css';
import { callFlowAgent } from '@/features/ai/client';
import { GLOBAL_TOOLS, STEP_TOOLS } from '@/features/ai/tools';
import { buildGlobalSystemPrompt, buildStepSystemPrompt } from '@/features/ai/systemPrompts';
import { AI_PERSONAS, getPersonaById, type AiPersona } from '@/features/ai/personas';
import { PersonaAvatar } from '@/features/ai/PersonaAvatar';
import { PolicyMatchingModal, POLICY_LIBRARY } from '@/components/PolicyMatchingModal';

// ─── Workflow settings persistence ─────────────────────────────────────────────

const LS_KEY = 'workflow_settings';

type WorkflowSettingsEntry = { name: string; description: string; tags: string[] };
type WorkflowSettingsStore = Record<string, WorkflowSettingsEntry>;

function loadWorkflowSettings(): WorkflowSettingsStore {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as WorkflowSettingsStore) : {};
  } catch { return {}; }
}

function saveWorkflowSettings(store: WorkflowSettingsStore): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch { /* quota/private */ }
}

// ─── Workflow graph persistence ────────────────────────────────────────────────
// Persists the canvas-level state (nodes, edges, free-positions) per workflow
// id so a user can save a workflow, navigate away, and come back to find it
// exactly as they left it. Stored under a separate key from the metadata
// store above to keep payloads small and concerns separated — metadata is
// also surfaced in list / cards while the graph blob is only consumed by
// the builder.

const LS_GRAPH_KEY = 'workflow_graphs';

interface WorkflowGraphEntry {
  nodes:         unknown[];   // GraphNode[] — typed loosely so the persistence
  edges:         unknown[];   //   layer doesn't depend on internal types
  nodePositions: Record<string, { x: number; y: number }>;
  savedAt:       string;      // ISO timestamp — surfaced as "last saved"
}
type WorkflowGraphStore = Record<string, WorkflowGraphEntry>;

function loadWorkflowGraphs(): WorkflowGraphStore {
  try {
    const raw = localStorage.getItem(LS_GRAPH_KEY);
    return raw ? (JSON.parse(raw) as WorkflowGraphStore) : {};
  } catch { return {}; }
}

function saveWorkflowGraphEntry(id: string, entry: WorkflowGraphEntry): void {
  try {
    const store = loadWorkflowGraphs();
    store[id] = entry;
    localStorage.setItem(LS_GRAPH_KEY, JSON.stringify(store));
  } catch { /* quota / private — silent */ }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type StepType = 'trigger' | 'condition' | 'action' | 'ai' | 'delay' | 'policy';

type DelayUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'custom';

const DELAY_UNIT_LABEL: Record<Exclude<DelayUnit, 'custom'>, { singular: string; plural: string }> = {
  minutes: { singular: 'Minute', plural: 'Minutes' },
  hours:   { singular: 'Hour',   plural: 'Hours'   },
  days:    { singular: 'Day',    plural: 'Days'    },
  weeks:   { singular: 'Week',   plural: 'Weeks'   },
};

// ── Policy node helpers ──────────────────────────────────────────────────────
// Policy selection and threshold live inside `configValues` (a flat string map)
// so no shape change to GraphNode is needed. These helpers hide the string ↔
// object conversion from everything else.

type PolicyThresholdMode = 'score' | 'percentage';

interface PolicyThresholdSnapshot {
  value: number;
  mode: PolicyThresholdMode;
}

interface PolicySelectionSnapshot {
  folders: string[];
  policies: string[];
  subPolicies: string[];
}

function parseJsonIdArray(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function parsePolicySelection(cfg: Record<string, string> | undefined): PolicySelectionSnapshot {
  return {
    folders:     parseJsonIdArray(cfg?.selectedFolders),
    policies:    parseJsonIdArray(cfg?.selectedPolicies),
    subPolicies: parseJsonIdArray(cfg?.selectedSubPolicies),
  };
}

/** A single Policy IF branch — mirrors the condition branch model. Holds
 *  one selection set + threshold, rendered as one row on the canvas card
 *  with its own per-row right anchor. */
interface PolicyBranch {
  id: string;
  folders: string[];
  policies: string[];
  subPolicies: string[];
  thresholdValue: string;
  thresholdMode: PolicyThresholdMode;
}

let _nextPolicyBranchId = 0;
function makePolicyBranchId(): string {
  return `pb${++_nextPolicyBranchId}_${Math.random().toString(36).slice(2, 6)}`;
}

function makeEmptyPolicyBranch(): PolicyBranch {
  return {
    id: makePolicyBranchId(),
    folders: [],
    policies: [],
    subPolicies: [],
    thresholdValue: '50',
    thresholdMode: 'score',
  };
}

/** Resolve the effective branch list for a policy node. Falls back to a
 *  single synthesized branch built from the legacy `configValues` keys so
 *  pre-existing policy nodes continue to render without migration. Empty
 *  legacy state → empty list (canvas will seed an empty IF row). */
function derivePolicyBranches(step: GraphNode): PolicyBranch[] {
  if (step.policyBranches) return step.policyBranches;
  const sel = parsePolicySelection(step.configValues);
  const thr = parsePolicyThreshold(step.configValues);
  const total = sel.folders.length + sel.policies.length + sel.subPolicies.length;
  if (total === 0) return [];
  return [{
    id: 'pb1',
    folders: sel.folders,
    policies: sel.policies,
    subPolicies: sel.subPolicies,
    thresholdValue: String(thr.value),
    thresholdMode: thr.mode,
  }];
}

function parsePolicyThreshold(cfg: Record<string, string> | undefined): PolicyThresholdSnapshot {
  const rawVal = cfg?.thresholdValue ?? '';
  const value = parseInt(rawVal, 10);
  const mode: PolicyThresholdMode = cfg?.thresholdMode === 'percentage' ? 'percentage' : 'score';
  return {
    value: Number.isFinite(value) && value >= 0 ? value : 0,
    mode,
  };
}

function formatPolicySummary(sel: PolicySelectionSnapshot): string {
  const fLabel = `${sel.folders.length} folder${sel.folders.length === 1 ? '' : 's'}`;
  const pLabel = `${sel.policies.length} polic${sel.policies.length === 1 ? 'y' : 'ies'}`;
  const sLabel = `${sel.subPolicies.length} sub-polic${sel.subPolicies.length === 1 ? 'y' : 'ies'}`;
  return `${fLabel}, ${pLabel}, ${sLabel} selected.`;
}

/** Short canvas-card summary for a Policy node — surfaces the actual
 *  selected policy / folder / sub-policy *labels* so a glance at the
 *  card tells the user what the node is matching. Falls back to the
 *  count-based summary when no labels resolve (e.g. legacy ids no
 *  longer in POLICY_LIBRARY). Up to 2 names render verbatim; any
 *  remainder collapses into a "+N more" tail. Priority order:
 *  policies > folders > sub-policies — top-level items read as the
 *  most informative summary. */
function formatPolicyShortSummary(sel: PolicySelectionSnapshot): string {
  const labelById = new Map<string, string>();
  for (const f of POLICY_LIBRARY) {
    labelById.set(f.id, f.label);
    for (const p of f.policies) {
      labelById.set(p.id, p.label);
      for (const s of p.subPolicies) labelById.set(s.id, s.label);
    }
  }
  const labels = [
    ...sel.policies.map(id => labelById.get(id)),
    ...sel.folders.map(id => labelById.get(id)),
    ...sel.subPolicies.map(id => labelById.get(id)),
  ].filter((x): x is string => typeof x === 'string' && x.length > 0);

  if (labels.length === 0) return formatPolicySummary(sel);
  const head = labels.slice(0, 2);
  const remainder = labels.length - head.length;
  return remainder > 0 ? `${head.join(', ')} +${remainder} more` : head.join(', ');
}

function formatThresholdLabel(thr: PolicyThresholdSnapshot): string {
  return thr.mode === 'percentage'
    ? `Threshold: ${thr.value}%`
    : `Threshold: ${thr.value}/100`;
}

/** Format a Delay node's configValues into a summary like "5 Days" or "30 Minutes". */
function formatDelaySummary(cfg: Record<string, string> | undefined): string | null {
  if (!cfg) return null;
  const rawAmount = cfg.amount;
  const unit = cfg.unit as DelayUnit | undefined;
  if (!rawAmount || !unit) return null;
  const amount = parseInt(rawAmount, 10);
  if (!Number.isFinite(amount) || amount < 1) return null;
  if (unit === 'custom') {
    const customUnit = (cfg.customUnit ?? '').trim();
    if (!customUnit) return null;
    return `${amount} ${customUnit}`;
  }
  const labels = DELAY_UNIT_LABEL[unit];
  const label = amount === 1 ? labels.singular : labels.plural;
  return `${amount} ${label}`;
}
/** Workflow lifecycle status. Mirrors the union used in AutomationsPage's
 *  mock data (active | paused | draft) plus the legacy `inactive` and
 *  `archived` states the builder reads from older drafts. */
type AutomationStatus = 'draft' | 'live' | 'archived';

/** A single condition entry inside a condition node (new multi-condition model). */
interface ConditionEntry {
  /** Matches ConditionDef.id (library id). Empty string = unassigned. */
  fieldId: string;
  operator: string;
  /** Supports multi-value operators (e.g. "is any of"). */
  values: string[];
}

/** A group of conditions. Conditions inside the group are AND-ed together;
 *  multiple groups on a node are OR-ed between each other. */
interface ConditionGroup {
  id: string;
  conditions: ConditionEntry[];
}

/** A conditional branch — IF / ELSE IF clause. Each branch holds its own
 *  AND/OR grouping (a list of ConditionGroup, AND inside / OR between).
 *  The first branch is rendered as `IF`, subsequent ones as `ELSE IF`, and
 *  a trailing `ELSE` row is shown after the last branch as the catch-all
 *  fallback path. */
interface ConditionBranch {
  id: string;
  groups: ConditionGroup[];
}

interface GraphNode {
  id: string;
  type: StepType;
  label: string;
  placeholder: string;
  configured: boolean;
  selectedValue?: string;
  /** Legacy single-condition fields — retained only for non-condition nodes
   *  (kept on the interface so the existing compat paths still compile). */
  conditionOperator?: string;
  conditionValues?: string[];
  configValues?: Record<string, string>;
  /** Legacy flat-list model — kept for backwards compatibility. New code
   *  reads `conditionGroups` and derives from this list when absent. */
  conditions?: ConditionEntry[];
  /** Legacy flat-list logic operator. */
  conditionLogic?: 'AND' | 'OR';
  /** Group-based model: within-group = AND, between-groups = OR.
   *  Example `(A && B) || C` → `[{ conditions: [A, B] }, { conditions: [C] }]`.
   *  Used as the canonical OR/AND structure inside a single branch when the
   *  newer `conditionBranches` field is absent. */
  conditionGroups?: ConditionGroup[];
  /** Newest branch-based model: each entry is an IF / ELSE IF clause with
   *  its own nested AND/OR grouping. Takes precedence over
   *  `conditionGroups` when present. */
  conditionBranches?: ConditionBranch[];

  /** Policy node — multi-branch model mirroring `conditionBranches`.
   *  Each entry is one IF clause holding its own selection + threshold;
   *  the canvas card renders an additional catch-all ELSE row beneath
   *  the configured branches. Absent → derived from the legacy single-
   *  selection fields in `configValues` (selectedFolders / selectedPolicies
   *  / selectedSubPolicies / thresholdValue / thresholdMode). */
  policyBranches?: PolicyBranch[];

  /** ── Info metadata — surfaced in the right-panel "Info" section ──
   *  `nodeId` is the stable short human-readable ID (e.g. "node_a1b2c3")
   *  used for prompt/activity references. Distinct from the internal
   *  React `id` key, which existing state paths still target. */
  nodeId?: string;
  /** ISO timestamp set at node creation — never changes. */
  createdAt?: string;
  /** ISO timestamp bumped on every mutation (config/position/connection). */
  updatedAt?: string;
  /** Display name of the user who last modified this node. */
  updatedBy?: string;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  /** Optional source-anchor id on a multi-anchor source node. For condition
   *  nodes, this is the branch id (`branch.id` or `'else'`) that the edge
   *  originates from — drives per-branch routing on the canvas so each IF /
   *  ELSE row's outgoing line starts at its own anchor. Absent on edges from
   *  single-anchor source nodes (action / ai / delay / trigger / policy). */
  fromBranchId?: string;
}

// ─── Edge helpers ────────────────────────────────────────────────────────────
// Plain edge-list mutations. Conditions can fan out to any number of
// downstream nodes — there's no Yes/No labelling, no auto-promotion, and
// no two-edge cap. Each helper is a pure transformation so callers commit
// it through `setEdges` and the undo stack captures one atomic step.

/**
 * Append a single edge. Returns null on exact duplicate (same `from` → `to`
 * pair already exists) so callers can treat it as a silent rejection.
 */
function appendEdgeIfMissing(
  prev: GraphEdge[],
  from: string,
  to: string,
  newId: string,
  fromBranchId?: string,
): GraphEdge[] | null {
  if (prev.some(e => e.from === from && e.to === to && (e.fromBranchId ?? null) === (fromBranchId ?? null))) return null;
  return [...prev, { id: newId, from, to, ...(fromBranchId ? { fromBranchId } : {}) }];
}

// Alias kept so FlowNode component compiles without changes
type FlowStep = GraphNode;

const MAX_CONDITIONS = 20;

/** Return the group model for a step — falls back to the legacy flat list
 *  when `conditionGroups` is absent. Pure AND → one group; pure OR → one
 *  group per condition. Always returns a stable reference for empty. */
function deriveConditionGroups(step: GraphNode): ConditionGroup[] {
  if (step.conditionGroups) return step.conditionGroups;
  const conds = step.conditions ?? [];
  if (conds.length === 0) return [];
  const logic = step.conditionLogic ?? 'AND';
  if (logic === 'AND') return [{ id: 'g1', conditions: conds }];
  return conds.map((c, i) => ({ id: `g${i + 1}`, conditions: [c] }));
}

/** Total condition count across all groups. */
function countConditions(groups: ConditionGroup[]): number {
  return groups.reduce((n, g) => n + g.conditions.length, 0);
}

/** Return the branch model for a step. Falls back to `conditionGroups` —
 *  treating its full flat list as a single IF branch — when the newer
 *  `conditionBranches` field is absent. */
function deriveConditionBranches(step: GraphNode): ConditionBranch[] {
  if (step.conditionBranches) return step.conditionBranches;
  const groups = deriveConditionGroups(step);
  if (groups.length === 0) return [];
  return [{ id: 'b1', groups }];
}

/** Total condition count across every branch. */
function countConditionsInBranches(branches: ConditionBranch[]): number {
  return branches.reduce((n, b) => n + countConditions(b.groups), 0);
}

/** Collapse groups to the legacy flat list + logic operator (for migration
 *  back-compat). Mixed shapes that can't be cleanly represented default to
 *  AND and concatenate — a lossy projection, but the canonical source of
 *  truth for the UI is the `conditionGroups` field. */
function flattenConditionGroups(groups: ConditionGroup[]): { conditions: ConditionEntry[]; conditionLogic: 'AND' | 'OR' } {
  const all = groups.flatMap(g => g.conditions);
  if (groups.length <= 1) return { conditions: all, conditionLogic: 'AND' };
  if (groups.every(g => g.conditions.length === 1)) {
    return { conditions: all, conditionLogic: 'OR' };
  }
  return { conditions: all, conditionLogic: 'AND' };
}

let _nextGroupId = 0;
function makeGroupId(): string {
  return `g${++_nextGroupId}_${Math.random().toString(36).slice(2, 6)}`;
}

let _nextBranchId = 0;
function makeBranchId(): string {
  return `b${++_nextBranchId}_${Math.random().toString(36).slice(2, 6)}`;
}

function makeEmptyCondition(): ConditionEntry {
  const def = CONDITION_LIBRARY[0];
  return { fieldId: '', operator: def?.operators?.[0] ?? 'equals', values: [] };
}

/** Evaluate a single group — returns true if ALL its conditions pass.
 *  Predicate is injected so callers can decide what "pass" means for a given
 *  condition (e.g. runtime vs. editor-time placeholder check). */
function groupPasses(group: ConditionGroup, pred: (c: ConditionEntry) => boolean): boolean {
  if (group.conditions.length === 0) return false;
  return group.conditions.every(pred);
}

/** Evaluate all groups — returns true if ANY group passes. */
function groupsAnyPasses(groups: ConditionGroup[], pred: (c: ConditionEntry) => boolean): boolean {
  if (groups.length === 0) return false;
  return groups.some(g => groupPasses(g, pred));
}

/** Format a single condition entry as "Label op value(s)". */
function formatConditionEntry(c: ConditionEntry): string {
  const def = CONDITION_LIBRARY.find(d => d.id === c.fieldId) ?? null;
  const opLabel = OPERATOR_LABELS[c.operator] ?? c.operator;
  const parts: string[] = [def?.label ?? '?', opLabel];
  if (c.values.length > 0) parts.push(c.values.join(', '));
  return parts.filter(Boolean).join(' ');
}

/** Canvas expression formatter — uses `&&` within a group and `||` between
 *  groups. Parentheses wrap multi-condition groups only when there are 2+
 *  groups overall. */
/** Segment-rendered version of `formatConditionExpr` for the canvas card.
 *  Each entry is either a `'label'` (shown in primary text colour) or a
 *  `'muted'` part (operators, values, parens, `&&` / `||` — shown in the
 *  same slate-300 tone as the single-condition card's secondary line) so
 *  the multi-condition line reads with the same "Label is value" cadence
 *  as the single-condition variant instead of one undifferentiated wall
 *  of primary-colour text. Returns [] for empty / single-condition
 *  groups (single-condition rendering uses the primary/secondary split). */
type ConditionExprSeg = { text: string; role: 'label' | 'muted' };
function buildConditionExprSegs(groups: ConditionGroup[]): ConditionExprSeg[] {
  if (groups.length === 0) return [];
  if (countConditions(groups) <= 1) return [];
  const segs: ConditionExprSeg[] = [];
  groups.forEach((g, gi) => {
    if (gi > 0) segs.push({ text: ' || ', role: 'muted' });
    const wrapParens = g.conditions.length >= 2 && groups.length >= 2;
    if (wrapParens) segs.push({ text: '(', role: 'muted' });
    g.conditions.forEach((c, ci) => {
      if (ci > 0) segs.push({ text: ' && ', role: 'muted' });
      const def = CONDITION_LIBRARY.find(d => d.id === c.fieldId) ?? null;
      segs.push({ text: def?.label ?? '?', role: 'label' });
      const opLabel = OPERATOR_LABELS[c.operator] ?? c.operator;
      if (opLabel) segs.push({ text: ` ${opLabel}`, role: 'muted' });
      if (c.values.length > 0) segs.push({ text: ` ${c.values.join(', ')}`, role: 'muted' });
    });
    if (wrapParens) segs.push({ text: ')', role: 'muted' });
  });
  return segs;
}

function formatConditionExpr(groups: ConditionGroup[]): string {
  if (groups.length === 0) return '';
  const totalCount = countConditions(groups);
  // Single condition total — render the full "Label op value" form.
  if (totalCount === 1) {
    const only = groups[0].conditions[0];
    return only ? formatConditionEntry(only) : '';
  }
  // Multi-condition: render the full "Label op value" form for EACH entry
  // and join with the same logical operators as the legacy label-only path
  // (`&&` within a group, `||` between groups). The card now wraps the
  // primary line, so the longer expression is readable end-to-end instead
  // of being truncated to an ellipsis.
  const formatGroup = (g: ConditionGroup): string => {
    const inner = g.conditions.map(formatConditionEntry).join(' && ');
    // Parens only when there's at least 2 conditions in this group AND at
    // least 2 groups overall (so we never paren a single-condition group,
    // and never paren a single group regardless of its size).
    return g.conditions.length >= 2 && groups.length >= 2 ? `(${inner})` : inner;
  };
  return groups.map(formatGroup).join(' || ');
}

// ─── Icons ──────────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.4"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Link05Icon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 17H7C4.23858 17 2 14.7614 2 12C2 9.23858 4.23858 7 7 7H9M8 12L18 12M15.7778 17H17C19.7614 17 22 14.7614 22 12C22 9.23858 19.7614 7 17 7H15.7778C15.3482 7 15 7.34822 15 7.77778V16.2222C15 16.6518 15.3482 17 15.7778 17Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}




function PlusIcon({ size = 10 }: { size?: number }) {
  // Alloy stroke-width scale (24×24 viewBox): ≤12px → 2, ≤16px → 1.75, ≤20px → 1.5, >20px → 1.25
  const strokeWidth = size <= 12 ? 2 : size <= 16 ? 1.75 : size <= 20 ? 1.5 : 1.25;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  );
}

function ZoomInIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M9 9l2 2M5.5 3.5v4M3.5 5.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M9 9l2 2M3.5 5.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function FitIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M1.5 4.5V2h2.5M10.5 4.5V2H8M1.5 7.5V10h2.5M10.5 7.5V10H8"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}



function ArrowUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 10V2M2 6l4-4 4 4" stroke="currentColor" strokeWidth="1.4"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DotsHorizontalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="3" cy="7" r="1.2" fill="currentColor"/>
      <circle cx="7" cy="7" r="1.2" fill="currentColor"/>
      <circle cx="11" cy="7" r="1.2" fill="currentColor"/>
    </svg>
  );
}

function GripIcon() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden>
      <circle cx="2" cy="2"  r="1" fill="currentColor"/>
      <circle cx="6" cy="2"  r="1" fill="currentColor"/>
      <circle cx="2" cy="6"  r="1" fill="currentColor"/>
      <circle cx="6" cy="6"  r="1" fill="currentColor"/>
      <circle cx="2" cy="10" r="1" fill="currentColor"/>
      <circle cx="6" cy="10" r="1" fill="currentColor"/>
    </svg>
  );
}

function DuplicateSmallIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M8 4V2.5A1.5 1.5 0 0 0 6.5 1H2.5A1.5 1.5 0 0 0 1 2.5v4A1.5 1.5 0 0 0 2.5 8H4"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MoveUpSmallIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 9.5V2.5M3 5.5l3-3 3 3" stroke="currentColor" strokeWidth="1.2"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MoveDownSmallIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 2.5v7M3 6.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M1.5 3h9M4 3V2h4v1M10 3l-.7 7.5A1 1 0 0 1 8.3 11H3.7a1 1 0 0 1-1-.5L2 3"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}


function LoadingDots() {
  return (
    <span className={styles.loadingDots} aria-label="Loading">
      <span /><span /><span />
    </span>
  );
}

// ─── Step config map ───────────────────────────────────────────────────────────

const STEP_CONFIG: Record<StepType, { icon: React.ReactNode; label: string; bgClass: string }> = {
  trigger:   { icon: <PlayIcon          size={12} />,           label: 'Trigger',   bgClass: styles.iconTrigger   },
  condition: { icon: <FilterLinesIcon   size={12} />,           label: 'Condition', bgClass: styles.iconCondition },
  action:    { icon: <CircularArrowIcon size={12} />,           label: 'Action',    bgClass: styles.iconAction    },
  ai:        { icon: <TeambridgeAIIcon  size={12} />,           label: 'AI',        bgClass: styles.iconAi        },
  delay:     { icon: <ClockIcon         size={12} />,           label: 'Delay',     bgClass: styles.iconDelay     },
  policy:    { icon: <TriangleUpIcon    size={12} />,           label: 'Policy',    bgClass: styles.iconPolicy    },
};

const STEP_TOOLTIP_LABEL: Record<StepType, string> = {
  trigger:   'Trigger',
  condition: 'Condition',
  action:    'Action',
  ai:        'AI Specialist',
  delay:     'Delay',
  policy:    'Policy',
};

const NODE_TYPE_TAG_COLOR: Record<StepType, TagColor> = {
  trigger:   'green',
  condition: 'blue',
  action:    'green',
  ai:        'purple',
  delay:     'yellow',
  policy:    'red',
};

// ─── Action icons ──────────────────────────────────────────────────────────────

// Per-item overrides — keyed by LibraryItem.id
const ACTION_ITEM_ICON: Record<string, React.ReactNode> = {
  user_actions_clock_in:              <ClockIcon size={12} />,
  user_actions_clock_out:             <ClockIcon size={12} />,
  update_data_modify:                 <Edit03Icon size={12} />,
  notifications_send_email:           <Mail01Icon size={12} />,
  notifications_webhook_notification: <Bell01Icon size={12} />,
  notifications_send_one_way_sms:     <Announcement02Icon size={12} />,
  notifications_send_feed_message:    <Announcement02Icon size={12} />,
  notifications_send_chat_message:    <Announcement02Icon size={12} />,
  notifications_send_report:          <Announcement02Icon size={12} />,
};

// Category fallbacks for action items without a per-item override
const ACTION_CATEGORY_ICON: Record<string, React.ReactNode> = {
  shift_actions:    <CheckCircleIcon size={12} />,
  geofence_actions: <Home02Icon size={12} />,
  user_actions:     <Users03Icon size={12} />,
  update_data:      <File04Icon size={12} />,
  notifications:    <Bell01Icon size={12} />,
};

// Human-readable labels and sort order for action category section headers.
const ACTION_CATEGORY_LABEL: Record<string, string> = {
  shift_actions:    'Shift Actions',
  geofence_actions: 'Geofence Actions',
  user_actions:     'User Actions',
  update_data:      'Update Data',
  notifications:    'Notifications',
};

const ACTION_CATEGORY_ORDER = [
  'shift_actions',
  'geofence_actions',
  'user_actions',
  'update_data',
  'notifications',
] as const;

// Short descriptions surfaced under each action in the selector list.
const ACTION_DESCRIPTION: Record<string, string> = {
  shift_actions_deny_shift_request:          'Decline a shift request from a user.',
  shift_actions_approve_shift_group_request: 'Approve a request to join a shift group.',
  shift_actions_approve_release_shift_request: 'Approve a user releasing their shift.',
  geofence_actions_start_next_shift:         'Start the next scheduled shift automatically.',
  geofence_actions_end_ongoing_shift:        'End the user\u2019s current shift.',
  user_actions_clock_in:                     'Clock the user in to their shift.',
  user_actions_clock_out:                    'Clock the user out of their shift.',
  user_actions_start_break:                  'Start a break for the current shift.',
  user_actions_end_break:                    'End the active break for the shift.',
  user_actions_approve_shift_request:        'Approve a shift request from a user.',
  update_data_delete_entry:                  'Delete an existing record.',
  update_data_assign_task_group:             'Assign an entire task group to a user.',
  update_data_assign_task:                   'Assign a single task to a user.',
  update_data_split_shift:                   'Split a shift into two separate segments.',
  update_data_lock_record:                   'Lock a record to prevent edits.',
  update_data_unlock_record:                 'Unlock a record so it can be edited.',
  update_data_modify:                        'Modify a column value on a record.',
  update_data_create_new_entry:              'Create a new record in a collection.',
  notifications_export_document:             'Export a document as a file.',
  notifications_send_esign_document:         'Send a document for e-signature.',
  notifications_webhook_notification:        'Send a webhook payload to a URL.',
  notifications_send_email:                  'Send an email to one or more recipients.',
  notifications_send_one_way_sms:            'Send an SMS without expecting a reply.',
  notifications_send_feed_message:           'Post a message to an activity feed.',
  notifications_send_chat_message:           'Send a chat message to a user or channel.',
  notifications_send_report:                 'Send a formatted report to recipients.',
};

function getLibraryItemIcon(item: LibraryItem): React.ReactNode {
  if (item.type === 'action') {
    return ACTION_ITEM_ICON[item.id] ?? ACTION_CATEGORY_ICON[item.category] ?? STEP_CONFIG.action.icon;
  }
  return STEP_CONFIG[item.type].icon;
}

function getStepIcon(step: FlowStep): React.ReactNode {
  if (step.type === 'action' && step.selectedValue) {
    const item = ALL_LIBRARY_ITEMS.find(i => i.label === step.selectedValue && i.type === 'action');
    if (item) {
      return ACTION_ITEM_ICON[item.id] ?? ACTION_CATEGORY_ICON[item.category] ?? STEP_CONFIG.action.icon;
    }
  }
  return STEP_CONFIG[step.type].icon;
}

// ─── Condition library ─────────────────────────────────────────────────────────

interface ConditionDef {
  id: string;
  label: string;
  operators: string[];
  valueOptions?: string[];
}

// Operator sets keyed by JSON field_type
const _OPS = {
  text:        ['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty'],
  number:      ['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal'],
  select:      ['equals', 'not_equals', 'in'],
  multiselect: ['in', 'not_in'],
  boolean:     ['equals'],
  date:        ['equals', 'greater_than', 'less_than', 'within_next'],
  datetime:    ['equals', 'greater_than', 'less_than', 'within_next'],
  time:        ['equals', 'greater_than', 'less_than'],
  file:        ['is_empty', 'is_not_empty'],
} as const;

const CONDITION_LIBRARY: ConditionDef[] = [
  // ── Shift / Policy ────────────────────────────────────────────────────────────
  { id: 'shift_policy_main_credential',              label: 'Main Credential',              operators: [..._OPS.select]      },
  { id: 'shift_policy_regular_bill_rate',            label: 'Regular Bill Rate',            operators: [..._OPS.number]      },
  { id: 'shift_policy_single_overtime_bill_rate',    label: 'Single Overtime Bill Rate',    operators: [..._OPS.number]      },
  { id: 'shift_policy_double_overtime_bill_rate',    label: 'Double Overtime Bill Rate',    operators: [..._OPS.number]      },
  { id: 'shift_policy_regular_bill',                 label: 'Regular Bill',                 operators: [..._OPS.number]      },
  { id: 'shift_policy_single_overtime_bill',         label: 'Single Overtime Bill',         operators: [..._OPS.number]      },
  { id: 'shift_policy_double_overtime_bill',         label: 'Double Overtime Bill',         operators: [..._OPS.number]      },
  { id: 'shift_policy_manager_signature',            label: 'Manager Signature',            operators: [..._OPS.boolean]     },
  { id: 'shift_policy_regular_pay_rate',             label: 'Regular Pay Rate',             operators: [..._OPS.number]      },
  { id: 'shift_policy_single_overtime_pay_rate',     label: 'Single Overtime Pay Rate',     operators: [..._OPS.number]      },
  { id: 'shift_policy_double_overtime_pay_rate',     label: 'Double Overtime Pay Rate',     operators: [..._OPS.number]      },
  { id: 'shift_policy_regular_bill_hours',           label: 'Regular Bill Hours',           operators: [..._OPS.number]      },
  { id: 'shift_policy_single_overtime_bill_hours',   label: 'Single Overtime Bill Hours',   operators: [..._OPS.number]      },
  { id: 'shift_policy_double_overtime_bill_hours',   label: 'Double Overtime Bill Hours',   operators: [..._OPS.number]      },
  { id: 'shift_policy_holiday_bill_hours',           label: 'Holiday Bill Hours',           operators: [..._OPS.number]      },
  { id: 'shift_policy_holiday_pay_rate',             label: 'Holiday Pay Rate',             operators: [..._OPS.number]      },
  { id: 'shift_policy_holiday_bill_rate',            label: 'Holiday Bill Rate',            operators: [..._OPS.number]      },
  { id: 'shift_policy_holiday_pay',                  label: 'Holiday Pay',                  operators: [..._OPS.number]      },
  { id: 'shift_policy_holiday_bill',                 label: 'Holiday Bill',                 operators: [..._OPS.number]      },
  { id: 'shift_policy_facility_signature',           label: 'Facility Signature',           operators: [..._OPS.boolean]     },
  { id: 'shift_policy_upload_timesheet',             label: 'Upload Timesheet',             operators: [..._OPS.boolean]     },
  { id: 'shift_policy_supervisor_signature',         label: 'Supervisor Signature',         operators: [..._OPS.boolean]     },
  { id: 'shift_policy_state',                        label: 'State',                        operators: [..._OPS.select]      },
  { id: 'shift_policy_fringe_rate',                  label: 'Fringe Rate',                  operators: [..._OPS.number]      },
  { id: 'shift_policy_per_diem',                     label: 'Per Diem',                     operators: [..._OPS.number]      },
  { id: 'shift_policy_visit_amount',                 label: 'Visit Amount',                 operators: [..._OPS.number]      },
  { id: 'shift_policy_total_bill',                   label: 'Total Bill',                   operators: [..._OPS.number]      },
  { id: 'shift_policy_rating',                       label: 'Rating',                       operators: [..._OPS.number]      },
  { id: 'shift_policy_holiday_pay_hours',            label: 'Holiday Pay Hours',            operators: [..._OPS.number]      },
  { id: 'shift_policy_payroll_status',               label: 'Payroll Status',               operators: [..._OPS.select]      },
  { id: 'shift_policy_pay_period',                   label: 'Pay Period',                   operators: [..._OPS.select],     valueOptions: ['Open', 'Closed'] },
  { id: 'shift_policy_billing_status',               label: 'Billing Status',               operators: [..._OPS.select]      },
  { id: 'shift_policy_facility_status',              label: 'Facility Status',              operators: [..._OPS.select]      },
  { id: 'shift_policy_cancellation_reason',          label: 'Cancellation Reason',          operators: [..._OPS.text]        },
  { id: 'shift_policy_bill_bonus',                   label: 'Bill Bonus',                   operators: [..._OPS.number]      },
  { id: 'shift_policy_shift_group',                  label: 'Shift Group',                  operators: [..._OPS.select]      },
  { id: 'shift_policy_job_code',                     label: 'Job Code',                     operators: [..._OPS.text]        },
  { id: 'shift_policy_created_at',                   label: 'Created At',                   operators: [..._OPS.datetime]    },
  { id: 'shift_policy_updated_at',                   label: 'Updated At',                   operators: [..._OPS.datetime]    },
  { id: 'shift_policy_template',                     label: 'Template',                     operators: [..._OPS.select]      },
  { id: 'shift_policy_selection',                    label: 'Selection',                    operators: [..._OPS.select]      },
  { id: 'shift_policy_hub',                          label: 'Hub',                          operators: [..._OPS.select]      },
  { id: 'shift_policy_division',                     label: 'Division',                     operators: [..._OPS.select]      },
  { id: 'shift_policy_user_link',                    label: 'User Link',                    operators: [..._OPS.select]      },
  { id: 'shift_policy_regular_pay',                  label: 'Regular Pay',                  operators: [..._OPS.number]      },
  { id: 'shift_policy_overtime_hours',               label: 'Overtime Hours',               operators: [..._OPS.number]      },
  { id: 'shift_policy_overtime_pay',                 label: 'Overtime Pay',                 operators: [..._OPS.number]      },
  { id: 'shift_policy_double_overtime_hours',        label: 'Double Overtime Hours',        operators: [..._OPS.number]      },
  { id: 'shift_policy_double_overtime_pay',          label: 'Double Overtime Pay',          operators: [..._OPS.number]      },
  { id: 'shift_policy_total_pay',                    label: 'Total Pay',                    operators: [..._OPS.number]      },
  { id: 'shift_policy_bill_rates',                   label: 'Bill Rates',                   operators: [..._OPS.number]      },
  { id: 'shift_policy_notes',                        label: 'Notes',                        operators: [..._OPS.text]        },
  { id: 'shift_policy_pay_rate',                     label: 'Pay Rate',                     operators: [..._OPS.number]      },
  { id: 'shift_policy_bonus',                        label: 'Bonus',                        operators: [..._OPS.number]      },
  { id: 'shift_policy_published',                    label: 'Published',                    operators: [..._OPS.boolean]     },
  { id: 'shift_policy_archived',                     label: 'Archived',                     operators: [..._OPS.boolean]     },
  { id: 'shift_policy_status',                       label: 'Status',                       operators: [..._OPS.select]      },
  { id: 'shift_policy_hours_scheduled',              label: 'Hours Scheduled',              operators: [..._OPS.number]      },
  { id: 'shift_policy_hours_worked',                 label: 'Hours Worked',                 operators: [..._OPS.number]      },
  { id: 'shift_policy_regular_hours',                label: 'Regular Hours',                operators: [..._OPS.number]      },
  { id: 'shift_policy_start_time',                   label: 'Start Time',                   operators: [..._OPS.time]        },
  { id: 'shift_policy_end_time',                     label: 'End Time',                     operators: [..._OPS.time]        },
  { id: 'shift_policy_clock_in_time',                label: 'Clock In Time',                operators: [..._OPS.time]        },
  { id: 'shift_policy_clock_out_time',               label: 'Clock Out Time',               operators: [..._OPS.time]        },
  { id: 'shift_policy_assignee',                     label: 'Assignee',                     operators: [..._OPS.select]      },
  { id: 'shift_policy_location',                     label: 'Location',                     operators: [..._OPS.select]      },
  { id: 'shift_policy_roles',                        label: 'Role',                         operators: ['equals', ..._OPS.multiselect], valueOptions: ['RN', 'LPN', 'CNA', 'NP', 'MD', 'PA', 'CMA', 'PT', 'OT'] },
  // ── Shift / Initiating User ───────────────────────────────────────────────────
  { id: 'shift_initiating_user_first_name',          label: 'Initiating User / First Name', operators: [..._OPS.text]        },
  { id: 'shift_initiating_user_last_name',           label: 'Initiating User / Last Name',  operators: [..._OPS.text]        },
  { id: 'shift_initiating_user_email',               label: 'Initiating User / Email',      operators: [..._OPS.text]        },
  { id: 'shift_initiating_user_phone',               label: 'Initiating User / Phone',      operators: [..._OPS.text]        },
  { id: 'shift_initiating_user_ssn',                 label: 'Initiating User / SSN',        operators: [..._OPS.text]        },
  { id: 'shift_initiating_user_birthday',            label: 'Initiating User / Birthday',   operators: [..._OPS.date]        },
  // ── Shift / Credentials ───────────────────────────────────────────────────────
  { id: 'shift_credentials_main_credential_title',   label: 'Main Credential / Title',      operators: [..._OPS.text]        },
  { id: 'shift_credentials_main_credential_type',    label: 'Main Credential / Type',       operators: [..._OPS.select]      },
  { id: 'shift_credentials_main_credential_expiry_date', label: 'Main Credential / Expiry Date', operators: [..._OPS.date]   },
  { id: 'shift_credentials_main_credential_user',    label: 'Main Credential / User',       operators: [..._OPS.select]      },
  { id: 'shift_credentials_main_credential_number',  label: 'Main Credential / Number',     operators: [..._OPS.text]        },
  { id: 'shift_credentials_main_credential_file',    label: 'Main Credential / File',       operators: [..._OPS.file]        },
  // ── Shift / Shift Groups ──────────────────────────────────────────────────────
  { id: 'shift_shift_groups_end_at',                 label: 'Shift Group / End At',         operators: [..._OPS.datetime]    },
  { id: 'shift_shift_groups_status',                 label: 'Shift Group / Status',         operators: [..._OPS.select]      },
  { id: 'shift_shift_groups_assignees',              label: 'Shift Group / Assignees',      operators: [..._OPS.multiselect] },
  { id: 'shift_shift_groups_locations',              label: 'Shift Group / Locations',      operators: [..._OPS.multiselect] },
  { id: 'shift_shift_groups_roles',                  label: 'Shift Group / Roles',          operators: ['equals', ..._OPS.multiselect], valueOptions: ['RN', 'LPN', 'CNA', 'NP', 'MD', 'PA', 'CMA', 'PT', 'OT'] },
  { id: 'shift_shift_groups_name',                   label: 'Shift Group / Name',           operators: [..._OPS.text]        },
  { id: 'shift_shift_groups_start_at',               label: 'Shift Group / Start At',       operators: [..._OPS.datetime]    },
  // ── Shift / User Link ─────────────────────────────────────────────────────────
  { id: 'shift_user_link_first_name',                label: 'User Link / First Name',       operators: [..._OPS.text]        },
  { id: 'shift_user_link_last_name',                 label: 'User Link / Last Name',        operators: [..._OPS.text]        },
  { id: 'shift_user_link_email',                     label: 'User Link / Email',            operators: [..._OPS.text]        },
  { id: 'shift_user_link_phone',                     label: 'User Link / Phone',            operators: [..._OPS.text]        },
  { id: 'shift_user_link_ssn',                       label: 'User Link / SSN',              operators: [..._OPS.text]        },
  { id: 'shift_user_link_birthday',                  label: 'User Link / Birthday',         operators: [..._OPS.date]        },
  { id: 'shift_user_link_created_at',                label: 'User Link / Created At',       operators: [..._OPS.datetime]    },
  { id: 'shift_user_link_updated_at',                label: 'User Link / Updated At',       operators: [..._OPS.datetime]    },
  { id: 'shift_user_link_first_required_expiration_date', label: 'User Link / First Required Expiration Date', operators: [..._OPS.date] },
  { id: 'shift_user_link_last_shift_request',        label: 'User Link / Last Shift Request',   operators: [..._OPS.datetime] },
  { id: 'shift_user_link_last_schedule_view',        label: 'User Link / Last Schedule View',   operators: [..._OPS.datetime] },
  { id: 'shift_user_link_doc',                       label: 'User Link / Doc',              operators: [..._OPS.file]        },
  { id: 'shift_user_link_note',                      label: 'User Link / Note',             operators: [..._OPS.text]        },
  { id: 'shift_user_link_last_active',               label: 'User Link / Last Active',      operators: [..._OPS.datetime]    },
  { id: 'shift_user_link_access_group',              label: 'User Link / Access Group',     operators: [..._OPS.select]      },
  { id: 'shift_user_link_employment_type',           label: 'User Link / Employment Type',  operators: [..._OPS.select]      },
  { id: 'shift_user_link_start_date',                label: 'User Link / Start Date',       operators: [..._OPS.date]        },
  { id: 'shift_user_link_first_login',               label: 'User Link / First Login',      operators: [..._OPS.datetime]    },
  { id: 'shift_user_link_archived',                  label: 'User Link / Archived',         operators: [..._OPS.boolean]     },
  { id: 'shift_user_link_roles',                     label: 'User Link / Roles',            operators: ['equals', ..._OPS.multiselect], valueOptions: ['RN', 'LPN', 'CNA', 'NP', 'MD', 'PA', 'CMA', 'PT', 'OT'] },
  { id: 'shift_user_link_place',                     label: 'User Link / Place',            operators: [..._OPS.select]      },
  { id: 'shift_user_link_timeoff_policy',            label: 'User Link / Time Off Policy',  operators: [..._OPS.select]      },
  { id: 'shift_user_link_overtime_policy',           label: 'User Link / Overtime Policy',  operators: [..._OPS.select]      },
  { id: 'shift_user_link_pin',                       label: 'User Link / Pin',              operators: [..._OPS.text]        },
  // ── Shift / Job Roles ─────────────────────────────────────────────────────────
  { id: 'shift_job_roles_name',                      label: 'Roles / Name',                 operators: [..._OPS.text]        },
  { id: 'shift_job_roles_is_active',                 label: 'Roles / Is Active',            operators: [..._OPS.boolean]     },
  { id: 'shift_job_roles_test_files',                label: 'Roles / Test Files',           operators: [..._OPS.file]        },
  { id: 'shift_job_roles_additional_info',           label: 'Roles / Additional Info',      operators: [..._OPS.text]        },
  { id: 'shift_job_roles_my_custom_field',           label: 'Roles / My Custom Field',      operators: [..._OPS.text]        },
  // ── Shift / Facilities ────────────────────────────────────────────────────────
  { id: 'shift_facilities_location_name',            label: 'Location / Name',              operators: [..._OPS.text]        },
  { id: 'shift_facilities_location_email',           label: 'Location / Email',             operators: [..._OPS.text]        },
  { id: 'shift_facilities_location_phone',           label: 'Location / Phone',             operators: [..._OPS.text]        },
  { id: 'shift_facilities_location_address',         label: 'Location / Address',           operators: [..._OPS.text]        },
  { id: 'shift_facilities_location_geofence',        label: 'Location / Geofence',          operators: [..._OPS.select]      },
  { id: 'shift_facilities_location_break_policy',    label: 'Location / Break Policy',      operators: [..._OPS.select]      },
  { id: 'shift_facilities_location_created_at',      label: 'Location / Created At',        operators: [..._OPS.datetime]    },
  { id: 'shift_facilities_location_updated_at',      label: 'Location / Updated At',        operators: [..._OPS.datetime]    },
  { id: 'shift_facilities_location_coats',           label: 'Location / COATS',             operators: [..._OPS.text]        },
  { id: 'shift_facilities_location_manager',         label: 'Location / Manager',           operators: [..._OPS.select]      },
  { id: 'shift_facilities_location_fulfilled_shift_ratio',  label: 'Location / Fulfilled Shift Ratio',  operators: [..._OPS.number] },
  { id: 'shift_facilities_location_total_shift_count',      label: 'Location / Total Shift Count',      operators: [..._OPS.number] },
  { id: 'shift_facilities_location_assigned_shift_count',   label: 'Location / Assigned Shift Count',   operators: [..._OPS.number] },
  { id: 'shift_facilities_location_holiday_policy',  label: 'Location / Holiday Policy',    operators: [..._OPS.select]      },
  { id: 'shift_facilities_location_archived',        label: 'Location / Archived',          operators: [..._OPS.boolean]     },
  { id: 'shift_facilities_location_certificate_file',label: 'Location / Certificate File',  operators: [..._OPS.file]        },
  // ── Shift / Assignee ──────────────────────────────────────────────────────────
  { id: 'shift_assignee_first_name',                 label: 'Assignee / First Name',        operators: [..._OPS.text]        },
  { id: 'shift_assignee_last_name',                  label: 'Assignee / Last Name',         operators: [..._OPS.text]        },
  { id: 'shift_assignee_email',                      label: 'Assignee / Email',             operators: [..._OPS.text]        },
  { id: 'shift_assignee_phone',                      label: 'Assignee / Phone',             operators: [..._OPS.text]        },
  { id: 'shift_assignee_ssn',                        label: 'Assignee / SSN',               operators: [..._OPS.text]        },
  { id: 'shift_assignee_birthday',                   label: 'Assignee / Birthday',          operators: [..._OPS.date]        },
  { id: 'shift_assignee_archived',                   label: 'Assignee / Archived',          operators: [..._OPS.boolean]     },
  // ── Applicants ────────────────────────────────────────────────────────────────
  // Stage values mirror the kanban column order on the Applicants board:
  // a fresh applicant flows New → Document Review → Interview → Background
  // Check → Offer → Hired, with Rejected as the terminal opt-out lane.
  { id: 'applicants_stage',                          label: 'Applicant stage',              operators: [..._OPS.select],     valueOptions: ['1- New Applicant', '2- Document Review', '3- Interview', '4- Background Check', '5- Offer', '6- Hired', 'X- Rejected'] },
  { id: 'applicants_interview_result',               label: 'Interview result',             operators: [..._OPS.select],     valueOptions: ['Pass', 'Fail'] },
  // Experience — multi-select bucket so a flow can fan out to "any of
  // these tenure ranges". Uses the dedicated `contains_one_of` operator
  // (verb reads "contains one of") which threads through the same
  // multi-value renderer as `in` but with the warmer phrasing the spec
  // calls for.
  { id: 'applicants_experience',                     label: 'Experience',                   operators: ['contains_one_of'],  valueOptions: ['Less Than 6 Months', '6-12 Months', '1-2 Years', '2-5 Years', 'Greater Than 1 Year', 'Greater Than 5 Years'] },
];

const OPERATOR_LABELS: Record<string, string> = {
  equals:                'is',
  not_equals:            'is not',
  in:                    'is one of',
  not_in:                'is not one of',
  contains_one_of:       'contains one of',
  is_empty:              'is empty',
  is_not_empty:          'is not empty',
  greater_than:          'greater than',
  greater_than_or_equal: '≥',
  less_than_or_equal:    '≤',
  less_than:             'less than',
  contains:              'contains',
  within_next:           'within next',
  missing_required:      'is missing',
};

// ─── Library node data ─────────────────────────────────────────────────────────

interface LibraryItem { id: string; type: StepType; label: string; category: string; }

const ALL_LIBRARY_ITEMS: LibraryItem[] = [
  // ── Triggers ──────────────────────────────────────────────────────────────────
  // Data Workflows
  { id: 'data_something_created',                    type: 'trigger', label: 'Something is created',                      category: 'data_workflows'       },
  { id: 'data_something_updated',                    type: 'trigger', label: 'Something is updated',                      category: 'data_workflows'       },
  { id: 'data_something_deleted',                    type: 'trigger', label: 'Something is deleted',                      category: 'data_workflows'       },
  // Comments
  { id: 'comment_added',                             type: 'trigger', label: 'Comment added',                             category: 'comments'             },
  // Button
  { id: 'button_clicked',                            type: 'trigger', label: 'Button clicked',                            category: 'button'               },
  // Recurring Interval
  { id: 'recurring_at_time_interval',                type: 'trigger', label: 'Recurring at time interval',                category: 'recurring_interval'   },
  // Scheduling
  { id: 'scheduling_shift_scheduled_to_start',       type: 'trigger', label: 'Shift scheduled to start',                 category: 'scheduling'           },
  { id: 'scheduling_shift_scheduled_to_end',         type: 'trigger', label: 'Shift scheduled to end',                   category: 'scheduling'           },
  { id: 'scheduling_break_scheduled_to_start',       type: 'trigger', label: 'Break scheduled to start',                 category: 'scheduling'           },
  { id: 'scheduling_break_scheduled_to_end',         type: 'trigger', label: 'Break scheduled to end',                   category: 'scheduling'           },
  { id: 'scheduling_scheduled_time_is_reached',      type: 'trigger', label: 'Scheduled time is reached',                category: 'scheduling'           },
  // Jobs
  { id: 'jobs_user_expresses_interest',              type: 'trigger', label: 'User expresses interest in job',            category: 'jobs'                 },
  // Geofence
  { id: 'geofence_user_enters',                      type: 'trigger', label: 'User enters a geofence area',               category: 'geofence'             },
  { id: 'geofence_user_leaves',                      type: 'trigger', label: 'User leaves a geofence area',               category: 'geofence'             },
  // Tasks
  { id: 'tasks_task_completed',                      type: 'trigger', label: 'Task completed',                            category: 'tasks'                },
  { id: 'tasks_task_assigned',                       type: 'trigger', label: 'Task assigned',                             category: 'tasks'                },
  { id: 'tasks_task_group_completed',                type: 'trigger', label: 'Task group completed',                      category: 'tasks'                },
  { id: 'tasks_task_group_assigned',                 type: 'trigger', label: 'Task group assigned',                       category: 'tasks'                },
  // Recommended Shifts
  { id: 'recommended_shifts_user_recommended',       type: 'trigger', label: 'User is recommended a shift',               category: 'recommended_shifts'   },
  // Documents
  { id: 'documents_document_completed',              type: 'trigger', label: 'Document completed',                        category: 'documents'            },
  // Shift Release
  { id: 'shift_release_user_releases',               type: 'trigger', label: 'User releases a shift',                     category: 'shift_release'        },
  { id: 'shift_release_request_approved',            type: 'trigger', label: "User's shift release request is approved",  category: 'shift_release'        },
  { id: 'shift_release_request_rejected',            type: 'trigger', label: "User's shift release request is rejected",  category: 'shift_release'        },
  // Shift Group Request
  { id: 'shift_group_request_user_claims',           type: 'trigger', label: 'User claims a shift group',                 category: 'shift_group_request'  },
  { id: 'shift_group_request_claim_approved',        type: 'trigger', label: "User's shift group claim is approved",      category: 'shift_group_request'  },
  { id: 'shift_group_request_claim_rejected',        type: 'trigger', label: "User's shift group claim is rejected",      category: 'shift_group_request'  },
  // Shift Request
  { id: 'shift_request_user_claims',                 type: 'trigger', label: 'User claims a shift',                       category: 'shift_request'        },
  { id: 'shift_request_claim_approved',              type: 'trigger', label: "User's shift request is approved",          category: 'shift_request'        },
  { id: 'shift_request_claim_rejected',              type: 'trigger', label: "User's shift request is rejected",          category: 'shift_request'        },
  // Clock In / Clock Out
  { id: 'clock_in_to_shift',                         type: 'trigger', label: 'User clocks in to shift',                   category: 'clock_in_clock_out'   },
  { id: 'clock_in_to_unscheduled_shift',             type: 'trigger', label: 'User clocks in to unscheduled shift',       category: 'clock_in_clock_out'   },
  { id: 'clock_out_of_shift',                        type: 'trigger', label: 'User clocks out of shift',                  category: 'clock_in_clock_out'   },
  // Breaks
  { id: 'breaks_user_starts_break',                  type: 'trigger', label: 'User starts break',                         category: 'breaks'               },
  { id: 'breaks_user_ends_break',                    type: 'trigger', label: 'User ends break',                           category: 'breaks'               },

  // ── Human Action triggers (mid-sequence gates) ───────────────────────────────
  // These triggers fire on a user's in-app behaviour and act as gates between
  // upstream steps and downstream branches — the workflow waits on the user
  // until the action lands, then continues. Distinct from the data/scheduling
  // triggers above which fire from system events.
  { id: 'human_action_task_completed_gate',          type: 'trigger', label: 'User completes a task',                     category: 'human_action'         },
  { id: 'human_action_user_logs_into_app',           type: 'trigger', label: 'User logs into app',                        category: 'human_action'         },
  { id: 'human_action_user_views_page',              type: 'trigger', label: 'User views a page',                         category: 'human_action'         },

  // ── Mobile Action triggers (blocking surfaces inside the mobile app) ────────
  // Used when the next step shouldn't proceed until the user has acknowledged
  // a blocking surface — e.g. a compliance modal that must be dismissed or a
  // form that must be submitted.
  { id: 'mobile_action_blocking_modal_dismissed',    type: 'trigger', label: 'User dismisses blocking modal',             category: 'mobile_action'        },
  { id: 'mobile_action_form_submitted',              type: 'trigger', label: 'User submits form',                         category: 'mobile_action'        },

  // ── Conditions (Shift / Policy) ───────────────────────────────────────────────
  { id: 'shift_policy_main_credential',              type: 'condition', label: 'Main Credential',              category: 'policy'           },
  { id: 'shift_policy_regular_bill_rate',            type: 'condition', label: 'Regular Bill Rate',            category: 'policy'           },
  { id: 'shift_policy_single_overtime_bill_rate',    type: 'condition', label: 'Single Overtime Bill Rate',    category: 'policy'           },
  { id: 'shift_policy_double_overtime_bill_rate',    type: 'condition', label: 'Double Overtime Bill Rate',    category: 'policy'           },
  { id: 'shift_policy_regular_bill',                 type: 'condition', label: 'Regular Bill',                 category: 'policy'           },
  { id: 'shift_policy_single_overtime_bill',         type: 'condition', label: 'Single Overtime Bill',         category: 'policy'           },
  { id: 'shift_policy_double_overtime_bill',         type: 'condition', label: 'Double Overtime Bill',         category: 'policy'           },
  { id: 'shift_policy_manager_signature',            type: 'condition', label: 'Manager Signature',            category: 'policy'           },
  { id: 'shift_policy_regular_pay_rate',             type: 'condition', label: 'Regular Pay Rate',             category: 'policy'           },
  { id: 'shift_policy_single_overtime_pay_rate',     type: 'condition', label: 'Single Overtime Pay Rate',     category: 'policy'           },
  { id: 'shift_policy_double_overtime_pay_rate',     type: 'condition', label: 'Double Overtime Pay Rate',     category: 'policy'           },
  { id: 'shift_policy_regular_bill_hours',           type: 'condition', label: 'Regular Bill Hours',           category: 'policy'           },
  { id: 'shift_policy_single_overtime_bill_hours',   type: 'condition', label: 'Single Overtime Bill Hours',   category: 'policy'           },
  { id: 'shift_policy_double_overtime_bill_hours',   type: 'condition', label: 'Double Overtime Bill Hours',   category: 'policy'           },
  { id: 'shift_policy_holiday_bill_hours',           type: 'condition', label: 'Holiday Bill Hours',           category: 'policy'           },
  { id: 'shift_policy_holiday_pay_rate',             type: 'condition', label: 'Holiday Pay Rate',             category: 'policy'           },
  { id: 'shift_policy_holiday_bill_rate',            type: 'condition', label: 'Holiday Bill Rate',            category: 'policy'           },
  { id: 'shift_policy_holiday_pay',                  type: 'condition', label: 'Holiday Pay',                  category: 'policy'           },
  { id: 'shift_policy_holiday_bill',                 type: 'condition', label: 'Holiday Bill',                 category: 'policy'           },
  { id: 'shift_policy_facility_signature',           type: 'condition', label: 'Facility Signature',           category: 'policy'           },
  { id: 'shift_policy_upload_timesheet',             type: 'condition', label: 'Upload Timesheet',             category: 'policy'           },
  { id: 'shift_policy_supervisor_signature',         type: 'condition', label: 'Supervisor Signature',         category: 'policy'           },
  { id: 'shift_policy_state',                        type: 'condition', label: 'State',                        category: 'policy'           },
  { id: 'shift_policy_fringe_rate',                  type: 'condition', label: 'Fringe Rate',                  category: 'policy'           },
  { id: 'shift_policy_per_diem',                     type: 'condition', label: 'Per Diem',                     category: 'policy'           },
  { id: 'shift_policy_visit_amount',                 type: 'condition', label: 'Visit Amount',                 category: 'policy'           },
  { id: 'shift_policy_total_bill',                   type: 'condition', label: 'Total Bill',                   category: 'policy'           },
  { id: 'shift_policy_rating',                       type: 'condition', label: 'Rating',                       category: 'policy'           },
  { id: 'shift_policy_holiday_pay_hours',            type: 'condition', label: 'Holiday Pay Hours',            category: 'policy'           },
  { id: 'shift_policy_payroll_status',               type: 'condition', label: 'Payroll Status',               category: 'policy'           },
  { id: 'shift_policy_billing_status',               type: 'condition', label: 'Billing Status',               category: 'policy'           },
  { id: 'shift_policy_facility_status',              type: 'condition', label: 'Facility Status',              category: 'policy'           },
  { id: 'shift_policy_cancellation_reason',          type: 'condition', label: 'Cancellation Reason',          category: 'policy'           },
  { id: 'shift_policy_bill_bonus',                   type: 'condition', label: 'Bill Bonus',                   category: 'policy'           },
  { id: 'shift_policy_shift_group',                  type: 'condition', label: 'Shift Group',                  category: 'policy'           },
  { id: 'shift_policy_job_code',                     type: 'condition', label: 'Job Code',                     category: 'policy'           },
  { id: 'shift_policy_created_at',                   type: 'condition', label: 'Created At',                   category: 'policy'           },
  { id: 'shift_policy_updated_at',                   type: 'condition', label: 'Updated At',                   category: 'policy'           },
  { id: 'shift_policy_template',                     type: 'condition', label: 'Template',                     category: 'policy'           },
  { id: 'shift_policy_selection',                    type: 'condition', label: 'Selection',                    category: 'policy'           },
  { id: 'shift_policy_hub',                          type: 'condition', label: 'Hub',                          category: 'policy'           },
  { id: 'shift_policy_division',                     type: 'condition', label: 'Division',                     category: 'policy'           },
  { id: 'shift_policy_user_link',                    type: 'condition', label: 'User Link',                    category: 'policy'           },
  { id: 'shift_policy_regular_pay',                  type: 'condition', label: 'Regular Pay',                  category: 'policy'           },
  { id: 'shift_policy_overtime_hours',               type: 'condition', label: 'Overtime Hours',               category: 'policy'           },
  { id: 'shift_policy_overtime_pay',                 type: 'condition', label: 'Overtime Pay',                 category: 'policy'           },
  { id: 'shift_policy_double_overtime_hours',        type: 'condition', label: 'Double Overtime Hours',        category: 'policy'           },
  { id: 'shift_policy_double_overtime_pay',          type: 'condition', label: 'Double Overtime Pay',          category: 'policy'           },
  { id: 'shift_policy_total_pay',                    type: 'condition', label: 'Total Pay',                    category: 'policy'           },
  { id: 'shift_policy_bill_rates',                   type: 'condition', label: 'Bill Rates',                   category: 'policy'           },
  { id: 'shift_policy_notes',                        type: 'condition', label: 'Notes',                        category: 'policy'           },
  { id: 'shift_policy_pay_rate',                     type: 'condition', label: 'Pay Rate',                     category: 'policy'           },
  { id: 'shift_policy_bonus',                        type: 'condition', label: 'Bonus',                        category: 'policy'           },
  { id: 'shift_policy_published',                    type: 'condition', label: 'Published',                    category: 'policy'           },
  { id: 'shift_policy_archived',                     type: 'condition', label: 'Archived',                     category: 'policy'           },
  { id: 'shift_policy_status',                       type: 'condition', label: 'Status',                       category: 'policy'           },
  { id: 'shift_policy_hours_scheduled',              type: 'condition', label: 'Hours Scheduled',              category: 'policy'           },
  { id: 'shift_policy_hours_worked',                 type: 'condition', label: 'Hours Worked',                 category: 'policy'           },
  { id: 'shift_policy_regular_hours',                type: 'condition', label: 'Regular Hours',                category: 'policy'           },
  { id: 'shift_policy_start_time',                   type: 'condition', label: 'Start Time',                   category: 'policy'           },
  { id: 'shift_policy_end_time',                     type: 'condition', label: 'End Time',                     category: 'policy'           },
  { id: 'shift_policy_clock_in_time',                type: 'condition', label: 'Clock In Time',                category: 'policy'           },
  { id: 'shift_policy_clock_out_time',               type: 'condition', label: 'Clock Out Time',               category: 'policy'           },
  { id: 'shift_policy_assignee',                     type: 'condition', label: 'Assignee',                     category: 'policy'           },
  { id: 'shift_policy_location',                     type: 'condition', label: 'Location',                     category: 'policy'           },
  { id: 'shift_policy_roles',                        type: 'condition', label: 'Role',                         category: 'policy'           },
  // Conditions (Shift / Initiating User)
  { id: 'shift_initiating_user_first_name',          type: 'condition', label: 'Initiating User / First Name', category: 'initiating_user'  },
  { id: 'shift_initiating_user_last_name',           type: 'condition', label: 'Initiating User / Last Name',  category: 'initiating_user'  },
  { id: 'shift_initiating_user_email',               type: 'condition', label: 'Initiating User / Email',      category: 'initiating_user'  },
  { id: 'shift_initiating_user_phone',               type: 'condition', label: 'Initiating User / Phone',      category: 'initiating_user'  },
  { id: 'shift_initiating_user_ssn',                 type: 'condition', label: 'Initiating User / SSN',        category: 'initiating_user'  },
  { id: 'shift_initiating_user_birthday',            type: 'condition', label: 'Initiating User / Birthday',   category: 'initiating_user'  },
  // Conditions (Shift / Credentials)
  { id: 'shift_credentials_main_credential_title',   type: 'condition', label: 'Main Credential / Title',      category: 'credentials'      },
  { id: 'shift_credentials_main_credential_type',    type: 'condition', label: 'Main Credential / Type',       category: 'credentials'      },
  { id: 'shift_credentials_main_credential_expiry_date', type: 'condition', label: 'Main Credential / Expiry Date', category: 'credentials' },
  { id: 'shift_credentials_main_credential_user',    type: 'condition', label: 'Main Credential / User',       category: 'credentials'      },
  { id: 'shift_credentials_main_credential_number',  type: 'condition', label: 'Main Credential / Number',     category: 'credentials'      },
  { id: 'shift_credentials_main_credential_file',    type: 'condition', label: 'Main Credential / File',       category: 'credentials'      },
  // Conditions (Shift / Shift Groups)
  { id: 'shift_shift_groups_end_at',                 type: 'condition', label: 'Shift Group / End At',         category: 'shift_groups'     },
  { id: 'shift_shift_groups_status',                 type: 'condition', label: 'Shift Group / Status',         category: 'shift_groups'     },
  { id: 'shift_shift_groups_assignees',              type: 'condition', label: 'Shift Group / Assignees',      category: 'shift_groups'     },
  { id: 'shift_shift_groups_locations',              type: 'condition', label: 'Shift Group / Locations',      category: 'shift_groups'     },
  { id: 'shift_shift_groups_roles',                  type: 'condition', label: 'Shift Group / Roles',          category: 'shift_groups'     },
  { id: 'shift_shift_groups_name',                   type: 'condition', label: 'Shift Group / Name',           category: 'shift_groups'     },
  { id: 'shift_shift_groups_start_at',               type: 'condition', label: 'Shift Group / Start At',       category: 'shift_groups'     },
  // Conditions (Shift / User Link)
  { id: 'shift_user_link_first_name',                type: 'condition', label: 'User Link / First Name',       category: 'user_link'        },
  { id: 'shift_user_link_last_name',                 type: 'condition', label: 'User Link / Last Name',        category: 'user_link'        },
  { id: 'shift_user_link_email',                     type: 'condition', label: 'User Link / Email',            category: 'user_link'        },
  { id: 'shift_user_link_phone',                     type: 'condition', label: 'User Link / Phone',            category: 'user_link'        },
  { id: 'shift_user_link_ssn',                       type: 'condition', label: 'User Link / SSN',              category: 'user_link'        },
  { id: 'shift_user_link_birthday',                  type: 'condition', label: 'User Link / Birthday',         category: 'user_link'        },
  { id: 'shift_user_link_created_at',                type: 'condition', label: 'User Link / Created At',       category: 'user_link'        },
  { id: 'shift_user_link_updated_at',                type: 'condition', label: 'User Link / Updated At',       category: 'user_link'        },
  { id: 'shift_user_link_first_required_expiration_date', type: 'condition', label: 'User Link / First Required Expiration Date', category: 'user_link' },
  { id: 'shift_user_link_last_shift_request',        type: 'condition', label: 'User Link / Last Shift Request',   category: 'user_link'    },
  { id: 'shift_user_link_last_schedule_view',        type: 'condition', label: 'User Link / Last Schedule View',   category: 'user_link'    },
  { id: 'shift_user_link_doc',                       type: 'condition', label: 'User Link / Doc',              category: 'user_link'        },
  { id: 'shift_user_link_note',                      type: 'condition', label: 'User Link / Note',             category: 'user_link'        },
  { id: 'shift_user_link_last_active',               type: 'condition', label: 'User Link / Last Active',      category: 'user_link'        },
  { id: 'shift_user_link_access_group',              type: 'condition', label: 'User Link / Access Group',     category: 'user_link'        },
  { id: 'shift_user_link_employment_type',           type: 'condition', label: 'User Link / Employment Type',  category: 'user_link'        },
  { id: 'shift_user_link_start_date',                type: 'condition', label: 'User Link / Start Date',       category: 'user_link'        },
  { id: 'shift_user_link_first_login',               type: 'condition', label: 'User Link / First Login',      category: 'user_link'        },
  { id: 'shift_user_link_archived',                  type: 'condition', label: 'User Link / Archived',         category: 'user_link'        },
  { id: 'shift_user_link_roles',                     type: 'condition', label: 'User Link / Roles',            category: 'user_link'        },
  { id: 'shift_user_link_place',                     type: 'condition', label: 'User Link / Place',            category: 'user_link'        },
  { id: 'shift_user_link_timeoff_policy',            type: 'condition', label: 'User Link / Time Off Policy',  category: 'user_link'        },
  { id: 'shift_user_link_overtime_policy',           type: 'condition', label: 'User Link / Overtime Policy',  category: 'user_link'        },
  { id: 'shift_user_link_pin',                       type: 'condition', label: 'User Link / Pin',              category: 'user_link'        },
  // Conditions (Shift / Job Roles)
  { id: 'shift_job_roles_name',                      type: 'condition', label: 'Roles / Name',                 category: 'job_roles'        },
  { id: 'shift_job_roles_is_active',                 type: 'condition', label: 'Roles / Is Active',            category: 'job_roles'        },
  { id: 'shift_job_roles_test_files',                type: 'condition', label: 'Roles / Test Files',           category: 'job_roles'        },
  { id: 'shift_job_roles_additional_info',           type: 'condition', label: 'Roles / Additional Info',      category: 'job_roles'        },
  { id: 'shift_job_roles_my_custom_field',           type: 'condition', label: 'Roles / My Custom Field',      category: 'job_roles'        },
  // Conditions (Shift / Facilities)
  { id: 'shift_facilities_location_name',            type: 'condition', label: 'Location / Name',              category: 'facilities'       },
  { id: 'shift_facilities_location_email',           type: 'condition', label: 'Location / Email',             category: 'facilities'       },
  { id: 'shift_facilities_location_phone',           type: 'condition', label: 'Location / Phone',             category: 'facilities'       },
  { id: 'shift_facilities_location_address',         type: 'condition', label: 'Location / Address',           category: 'facilities'       },
  { id: 'shift_facilities_location_geofence',        type: 'condition', label: 'Location / Geofence',          category: 'facilities'       },
  { id: 'shift_facilities_location_break_policy',    type: 'condition', label: 'Location / Break Policy',      category: 'facilities'       },
  { id: 'shift_facilities_location_created_at',      type: 'condition', label: 'Location / Created At',        category: 'facilities'       },
  { id: 'shift_facilities_location_updated_at',      type: 'condition', label: 'Location / Updated At',        category: 'facilities'       },
  { id: 'shift_facilities_location_coats',           type: 'condition', label: 'Location / COATS',             category: 'facilities'       },
  { id: 'shift_facilities_location_manager',         type: 'condition', label: 'Location / Manager',           category: 'facilities'       },
  { id: 'shift_facilities_location_fulfilled_shift_ratio',  type: 'condition', label: 'Location / Fulfilled Shift Ratio',  category: 'facilities' },
  { id: 'shift_facilities_location_total_shift_count',      type: 'condition', label: 'Location / Total Shift Count',      category: 'facilities' },
  { id: 'shift_facilities_location_assigned_shift_count',   type: 'condition', label: 'Location / Assigned Shift Count',   category: 'facilities' },
  { id: 'shift_facilities_location_holiday_policy',  type: 'condition', label: 'Location / Holiday Policy',    category: 'facilities'       },
  { id: 'shift_facilities_location_archived',        type: 'condition', label: 'Location / Archived',          category: 'facilities'       },
  { id: 'shift_facilities_location_certificate_file',type: 'condition', label: 'Location / Certificate File',  category: 'facilities'       },
  // Conditions (Shift / Assignee)
  { id: 'shift_assignee_first_name',                 type: 'condition', label: 'Assignee / First Name',        category: 'assignee'         },
  { id: 'shift_assignee_last_name',                  type: 'condition', label: 'Assignee / Last Name',         category: 'assignee'         },
  { id: 'shift_assignee_email',                      type: 'condition', label: 'Assignee / Email',             category: 'assignee'         },
  { id: 'shift_assignee_phone',                      type: 'condition', label: 'Assignee / Phone',             category: 'assignee'         },
  { id: 'shift_assignee_ssn',                        type: 'condition', label: 'Assignee / SSN',               category: 'assignee'         },
  { id: 'shift_assignee_birthday',                   type: 'condition', label: 'Assignee / Birthday',          category: 'assignee'         },
  { id: 'shift_assignee_archived',                   type: 'condition', label: 'Assignee / Archived',          category: 'assignee'         },

  // Conditions (Applicants) — paired with the `applicants_stage_changed`
  // trigger so a flow can branch on which stage the applicant moved into,
  // or on the result of a completed interview.
  { id: 'applicants_stage',                          type: 'condition', label: 'Applicant stage',              category: 'applicants'       },
  { id: 'applicants_interview_result',               type: 'condition', label: 'Interview result',             category: 'applicants'       },
  { id: 'applicants_experience',                     type: 'condition', label: 'Experience',                   category: 'applicants'       },

  // ── Actions ───────────────────────────────────────────────────────────────────
  // AI
  { id: 'ai_specialist',                             type: 'ai',      label: 'AI Specialist',                  category: 'ai'               },
  // Shift Actions
  { id: 'shift_actions_deny_shift_request',          type: 'action',  label: 'Deny shift request',             category: 'shift_actions'    },
  { id: 'shift_actions_approve_shift_group_request', type: 'action',  label: 'Approve shift group request',    category: 'shift_actions'    },
  { id: 'shift_actions_approve_release_shift_request', type: 'action', label: 'Approve release shift request', category: 'shift_actions'   },
  // Geofence Actions
  { id: 'geofence_actions_start_next_shift',         type: 'action',  label: 'Start next shift',               category: 'geofence_actions' },
  { id: 'geofence_actions_end_ongoing_shift',        type: 'action',  label: 'End ongoing shift',              category: 'geofence_actions' },
  // User Actions
  { id: 'user_actions_clock_in',                     type: 'action',  label: 'Clock in',                       category: 'user_actions'     },
  { id: 'user_actions_clock_out',                    type: 'action',  label: 'Clock out',                      category: 'user_actions'     },
  { id: 'user_actions_start_break',                  type: 'action',  label: 'Start break',                    category: 'user_actions'     },
  { id: 'user_actions_end_break',                    type: 'action',  label: 'End break',                      category: 'user_actions'     },
  { id: 'user_actions_approve_shift_request',        type: 'action',  label: 'Approve shift request',          category: 'user_actions'     },
  // Update Data
  { id: 'update_data_delete_entry',                  type: 'action',  label: 'Delete entry',                   category: 'update_data'      },
  { id: 'update_data_assign_task_group',             type: 'action',  label: 'Assign task group',              category: 'update_data'      },
  { id: 'update_data_assign_task',                   type: 'action',  label: 'Assign task',                    category: 'update_data'      },
  { id: 'update_data_split_shift',                   type: 'action',  label: 'Split shift',                    category: 'update_data'      },
  { id: 'update_data_lock_record',                   type: 'action',  label: 'Lock record',                    category: 'update_data'      },
  { id: 'update_data_unlock_record',                 type: 'action',  label: 'Unlock record',                  category: 'update_data'      },
  { id: 'update_data_modify',                        type: 'action',  label: 'Modify',                         category: 'update_data'      },
  { id: 'update_data_create_new_entry',              type: 'action',  label: 'Create new entry',               category: 'update_data'      },
  // Notifications
  { id: 'notifications_export_document',             type: 'action',  label: 'Export document',                category: 'notifications'    },
  { id: 'notifications_send_esign_document',         type: 'action',  label: 'Send e-sign document',           category: 'notifications'    },
  { id: 'notifications_webhook_notification',        type: 'action',  label: 'Webhook notification',           category: 'notifications'    },
  { id: 'notifications_send_email',                  type: 'action',  label: 'Send email',                     category: 'notifications'    },
  { id: 'notifications_send_one_way_sms',            type: 'action',  label: 'Send one-way SMS',               category: 'notifications'    },
  { id: 'notifications_send_feed_message',           type: 'action',  label: 'Send feed message',              category: 'notifications'    },
  { id: 'notifications_send_chat_message',           type: 'action',  label: 'Send chat message',              category: 'notifications'    },
  { id: 'notifications_send_report',                 type: 'action',  label: 'Send report',                    category: 'notifications'    },
];

const PINNED_IDS = [
  'data_something_created',
  'scheduling_shift_scheduled_to_start',
  'clock_in_to_shift',
  'shift_policy_status',
  'notifications_send_email',
  'user_actions_clock_in',
  'ai_specialist',
];
const PINNED_ITEMS = ALL_LIBRARY_ITEMS.filter((i) => PINNED_IDS.includes(i.id));
const HIDDEN_ITEMS = ALL_LIBRARY_ITEMS.filter((i) => !PINNED_IDS.includes(i.id));

// ─── Trigger config field definitions ─────────────────────────────────────────

interface NodeConfigField {
  key: string;
  label: string;
  type: 'select' | 'multi_select' | 'text' | 'time' | 'textarea' | 'boolean' | 'multi_add';
  required?: boolean;
  options?: string[];
  /** When set, this field's options come from optionsByDependency[configValues[dependsOn]] */
  dependsOn?: string;
  optionsByDependency?: Record<string, string[]>;
  /** When set, field is hidden unless configValues[hideUnless.key] !== hideUnless.value */
  hideWhenDependsOnIs?: string;   // hide this field when dependsOn's value === this
}

const _ENTITY_OPTIONS = [
  'Contacts', 'Job Roles', 'Breaks', 'Expenses', 'Pay Periods', 'Projects',
  'Shift Groups', 'Placements', 'Facilities', 'Documents', 'Food', 'Jobs',
  'Shifts', 'Master Client', 'Custom Invoice', 'Favorite Food Survey',
  'Departments', 'Education History', 'Users', 'Auto-Submit Preferences',
  'Region', 'Speciality', 'Credentials', 'Cuisine', 'Time Off', 'Contracts',
  'Employee Resources', 'Time Off Requests', 'Cats', 'Skills',
  'Assigned Tasks', 'Work History',
];

const _BUTTON_FIELD_OPTIONS: Record<string, string[]> = {
  Contacts:               ['Anything', 'First Name', 'Last Name', 'Email', 'Phone', 'Address', 'Date of Birth', 'Status'],
  'Job Roles':            ['Anything', 'Role Name', 'Description', 'Department', 'Pay Rate', 'Status'],
  Breaks:                 ['Anything', 'Break Type', 'Duration', 'Start Time', 'End Time', 'Status'],
  Expenses:               ['Anything', 'Amount', 'Category', 'Date', 'Description', 'Status'],
  'Pay Periods':          ['Anything', 'Start Date', 'End Date', 'Status', 'Total Hours', 'Total Pay'],
  Projects:               ['Anything', 'Project Name', 'Status', 'Start Date', 'End Date', 'Manager'],
  'Shift Groups':         ['Anything', 'Group Name', 'Location', 'Start Date', 'End Date', 'Status'],
  Placements:             ['Anything', 'Start Date', 'End Date', 'Status', 'Job Role', 'Facility'],
  Facilities:             ['Anything', 'Facility Name', 'Address', 'Phone', 'Region', 'Status'],
  Documents:              ['Anything', 'Document Name', 'Type', 'Status', 'Expiration Date'],
  Food:                   ['Anything', 'Item Name', 'Category', 'Cuisine', 'Status'],
  Jobs:                   ['Anything', 'Job Title', 'Status', 'Location', 'Pay Rate', 'Start Date'],
  Shifts:                 ['Anything', 'Start Time', 'End Time', 'Location', 'Job Role', 'Status'],
  'Master Client':        ['Anything', 'Client Name', 'Email', 'Phone', 'Address', 'Status'],
  'Custom Invoice':       ['Anything', 'Invoice Number', 'Amount', 'Due Date', 'Client', 'Status'],
  'Favorite Food Survey': ['Anything', 'Cuisine', 'Food Item', 'Rating', 'Comments'],
  Departments:            ['Anything', 'Department Name', 'Manager', 'Status'],
  'Education History':    ['Anything', 'Institution', 'Degree', 'Field of Study', 'Graduation Date', 'Status'],
  Users:                  ['Anything', 'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Status', 'Applicant stage', 'Interview Result'],
  'Auto-Submit Preferences': ['Anything', 'Frequency', 'Status', 'Last Submitted'],
  Region:                 ['Anything', 'Region Name', 'Manager', 'Status'],
  Speciality:             ['Anything', 'Speciality Name', 'Description', 'Status'],
  Credentials:            ['Anything', 'Credential Name', 'Type', 'Expiration Date', 'Status'],
  Cuisine:                ['Anything', 'Cuisine Name', 'Description', 'Status'],
  'Time Off':             ['Anything', 'Type', 'Start Date', 'End Date', 'Duration', 'Status'],
  Contracts:              ['Anything', 'Contract Name', 'Start Date', 'End Date', 'Client', 'Status'],
  'Employee Resources':   ['Anything', 'Resource Name', 'Type', 'URL', 'Status'],
  'Time Off Requests':    ['Anything', 'Type', 'Start Date', 'End Date', 'Reason', 'Status'],
  Cats:                   ['Anything', 'Name', 'Breed', 'Age', 'Status'],
  Skills:                 ['Anything', 'Skill Name', 'Category', 'Level', 'Status'],
  'Assigned Tasks':       ['Anything', 'Task Name', 'Status', 'Due Date', 'Assigned To'],
  'Work History':         ['Anything', 'Employer', 'Job Title', 'Start Date', 'End Date', 'Status'],
};

const _WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const NODE_CONFIG: Record<string, NodeConfigField[]> = {
  data_something_created:  [
    { key: 'entity',       label: 'Entity', type: 'select', required: true, options: _ENTITY_OPTIONS },
    { key: 'record_field', label: 'Column', type: 'select', required: false,
      dependsOn: 'entity', optionsByDependency: _BUTTON_FIELD_OPTIONS },
  ],
  data_something_updated:  [
    { key: 'entity',       label: 'Entity', type: 'select', required: true, options: _ENTITY_OPTIONS },
    { key: 'record_field', label: 'Column', type: 'select', required: false,
      dependsOn: 'entity', optionsByDependency: _BUTTON_FIELD_OPTIONS },
  ],
  data_something_deleted:  [
    { key: 'entity',       label: 'Entity', type: 'select', required: true, options: _ENTITY_OPTIONS },
    { key: 'record_field', label: 'Column', type: 'select', required: false,
      dependsOn: 'entity', optionsByDependency: _BUTTON_FIELD_OPTIONS },
  ],
  comment_added:           [{ key: 'collection',  label: 'Collection',  type: 'select', required: true, options: _ENTITY_OPTIONS }],
  button_clicked: [
    { key: 'collection', label: 'Collection', type: 'select', required: true, options: _ENTITY_OPTIONS },
    { key: 'field',      label: 'Column',     type: 'select', required: true,
      dependsOn: 'collection', optionsByDependency: _BUTTON_FIELD_OPTIONS },
  ],
  recurring_at_time_interval: [
    { key: 'frequency',    label: 'Frequency',    type: 'select', required: true,
      options: ['Daily', 'Weekly', 'Biweekly', 'Monthly'] },
    { key: 'day',          label: 'Day',          type: 'select', required: true,
      dependsOn: 'frequency',
      hideWhenDependsOnIs: 'Daily',
      optionsByDependency: {
        Weekly:   _WEEKDAYS,
        Biweekly: _WEEKDAYS,
        Monthly:  ['Start of Month', 'Middle of Month', 'End of Month'],
      }},
    { key: 'time_of_day',  label: 'Time of Day',  type: 'time',   required: true },
  ],
  geofence_user_enters: [{ key: 'location',   label: 'Location',   type: 'select', required: true, options: ['Facility 1', 'Facility 2'] }],
  geofence_user_leaves: [{ key: 'location',   label: 'Location',   type: 'select', required: true, options: ['Facility 1', 'Facility 2'] }],
  tasks_task_completed:       [{ key: 'task',        label: 'Task',        type: 'select', required: true, options: ['Google Link', 'Google Task', 'Driver License'] }],
  tasks_task_assigned:        [{ key: 'task',        label: 'Task',        type: 'select', required: true, options: ['Google Link', 'Google Task', 'Driver License'] }],
  tasks_task_group_completed: [{ key: 'task_group',  label: 'Task Group',  type: 'select', required: true, options: ['Google Link', 'Google Task', 'Driver License'] }],
  tasks_task_group_assigned:  [{ key: 'task_group',  label: 'Task Group',  type: 'select', required: true, options: ['Google Link', 'Google Task', 'Driver License'] }],

  // ── Actions ──────────────────────────────────────────────────────────────────

  update_data_assign_task: [
    // Multi-select so a single Assign task action can fan out to several
    // tasks at once. Stored as a comma-separated string in configValues
    // (matches the on-disk shape of multi_add fields). Render-time
    // conversion lives in the multi_select branch of the action form.
    { key: 'task', label: 'Tasks', type: 'multi_select', required: true,
      options: ['Google Link', 'Google Task', 'Driver License'] },
  ],
  update_data_assign_task_group: [
    { key: 'task_group', label: 'Task Group', type: 'select', required: true,
      options: ['Google Link', 'Google Task', 'Driver License'] },
  ],
  update_data_modify: [
    { key: 'column',   label: 'Column',   type: 'select', required: true,
      options: ['Status', 'Assignee', 'Location', 'Pay Rate', 'Start Time', 'End Time', 'Notes', 'Job Role', 'Regular Bill Rate', 'Applicant Stage'] },
    { key: 'modifier', label: 'Modifier', type: 'select', required: true,
      options: ['Set to', 'Clear', 'Append', 'Add', 'Subtract'] },
    { key: 'value',    label: 'Value',    type: 'select', required: false,
      dependsOn: 'column',
      optionsByDependency: {
        'Applicant Stage': ['1- New Applicant', '2- Document Review', '3- Interview', '4- Background Check', '5- Offer', '6- Hired', 'X- Rejected'],
      } },
  ],

  // Create new entry — drops a record into a destination collection. The
  // form mirrors the Required-Training entry layout shown in the spec
  // mock: a leading entry-type picker, then per-entry fields. Today the
  // sub-fields are flat (every entry-type renders the same set); a
  // future pass can split them per entry_type once `NodeConfigField`
  // grows a "show this field only when dependsOn === X" branch.
  update_data_create_new_entry: [
    { key: 'entry_type',          label: 'Entry Type',                                         type: 'select', required: true,
      options: ['Required Training', 'Onboarding Document', 'Compliance Training', 'Performance Review', 'Custom Entry'] },
    { key: 'title',               label: 'Title',                                              type: 'text',   required: true },
    { key: 'document_to_review',  label: 'Document to Review',                                 type: 'multi_add', required: false },
    { key: 'signature_confirm',   label: 'Sign to Confirm Document Review and Understanding', type: 'text',   required: false },
    { key: 'staff_member',        label: 'Staff Member',                                       type: 'select', required: true,
      options: ['Automation Determined', 'Initiating User', 'Specific User', 'Manager', 'Supervisor'] },
    { key: 'training_type',       label: 'Training Type',                                      type: 'select', required: false,
      options: ['Job Description - CNA', 'Job Description - RN', 'Onboarding Orientation', 'Annual Compliance', 'Safety Training', 'Other'] },
    { key: 'signed_on',           label: 'Signed On',                                          type: 'select', required: false,
      options: ['Relative', 'Absolute', 'Custom Date'] },
  ],

  notifications_export_document: [
    { key: 'target_object_record', label: 'Target Object Record', type: 'select', required: true,
      options: ['Shifts', 'Users', 'Contacts', 'Placements', 'Pay Periods', 'Time Off Requests'] },
    { key: 'templates', label: 'Template(s)', type: 'multi_add', required: false },
  ],

  notifications_send_email: [
    { key: 'subject',          label: 'Subject',          type: 'text',    required: false },
    { key: 'reply_to_address', label: 'Reply-To Address', type: 'text',    required: false },
    { key: 'send_to_type',     label: 'Send To',          type: 'select',  required: true,
      options: ['Automation Workflow', 'Specific Group of Users', 'Emails', 'All Qualified Users'] },
    { key: 'send_to_value',    label: 'Recipients',       type: 'text',    required: false },
    { key: 'message',          label: 'Message',          type: 'textarea', required: false },
    { key: 'attach_log',       label: 'Attach automation log to email', type: 'boolean', required: false },
  ],

  notifications_send_one_way_sms: [
    { key: 'send_to_type',  label: 'Send To',    type: 'select',  required: true,
      options: ['Automation Workflow', 'Specific Group of Users', 'Phone Numbers'] },
    // Free-text Recipients field — hidden when Send To is the Automation
    // Workflow path, since that flow uses a preset-variable picker
    // (`workflow_recipient`) instead of a typed value.
    { key: 'send_to_value', label: 'Recipients', type: 'text',    required: false,
      dependsOn: 'send_to_type', hideWhenDependsOnIs: 'Automation Workflow' },
    // Preset-variable picker — surfaces only when Send To is the
    // Automation Workflow path. Mirrors the recipient groups available
    // in the Teambridge automation runtime (User default, plus
    // Location-scoped audience variants).
    { key: 'workflow_recipient', label: 'Recipients', type: 'select', required: false,
      dependsOn: 'send_to_type',
      optionsByDependency: {
        'Automation Workflow': [
          'User',
          'Locations / Previous Workers',
          'Locations / Facility Main Contact',
          'Do Not Send / Previous Workers',
          'Do Not Send / Facility Main Contact',
          'Worked at your Facility / Previous Workers',
          'Worked at your Facility / Facility Main Contact',
        ],
      } },
    { key: 'message',       label: 'Message',    type: 'textarea', required: false },
  ],

  notifications_send_feed_message: [
    { key: 'send_to_type',  label: 'Send To',    type: 'select',  required: true,
      options: ['Automation Workflow', 'Specific Group of Users', 'Emails', 'All Qualified Users'] },
    { key: 'send_to_value', label: 'Recipients', type: 'text',    required: false },
    { key: 'message',       label: 'Message',    type: 'textarea', required: false },
  ],

  notifications_send_chat_message: [
    { key: 'department',             label: 'Department', type: 'select', required: false,
      options: ['Engineering', 'Operations', 'HR', 'Finance', 'All Departments'] },
    { key: 'send_to_type',           label: 'Send To',    type: 'select', required: true,
      options: ['Automation Workflow', 'Specific Group of Users', 'Emails', 'All Qualified Users'] },
    { key: 'send_to_value',          label: 'Recipients', type: 'text',   required: false },
    { key: 'message',                label: 'Message',    type: 'textarea', required: false },
    { key: 'link_triggering_record', label: 'Link triggering record', type: 'boolean', required: false },
  ],

  notifications_send_report: [
    { key: 'subject',          label: 'Subject',          type: 'text',   required: false },
    { key: 'reply_to_address', label: 'Reply-To Address', type: 'text',   required: false },
    { key: 'send_to_type',     label: 'Send To',          type: 'select', required: true,
      options: ['Automation Workflow', 'Specific Group of Users', 'Emails', 'All Qualified Users'] },
    { key: 'send_to_value',    label: 'Recipients',       type: 'text',   required: false },
    { key: 'pay_period',       label: 'Pay Period',       type: 'select', required: false,
      options: ['Current Pay Period', 'Previous Pay Period', 'Custom Range'] },
    { key: 'report',           label: 'Report',           type: 'select', required: false,
      options: ['Payroll Summary', 'Timesheet Report', 'Billing Report', 'Shift Summary'] },
  ],
};

// ─── Node card snippet builders ────────────────────────────────────────────────
// Segments drive per-word colouring on the card.
// · 'label' — structural / template text  → nodeConfigLabel (content-secondary, muted)
// · 'val'   — user-selected data          → nodeConfigVal   (type accent-secondary)
// · 'op'    — operator / preposition      → nodeConfigOp    (type accent-tertiary)

type SnippetRole = 'label' | 'val' | 'op';
interface SnippetSeg { text: string; role: SnippetRole; }

/** Converts "HH:mm" (native time input value) to "8:30 AM" / "3:00 PM". */
function fmt12h(t: string): string {
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const NODE_SNIPPET: Record<string, (v: Record<string, string>) => SnippetSeg[] | null> = {
  // Data-workflow triggers — surface the selected `record_field` next to
  // the entity when present, mirroring the same Entity / Field pattern
  // the right-panel form uses ("Shifts / Status is updated"). When no
  // field is picked or the user chose the "Anything" sentinel, the
  // snippet falls back to just the entity so the card doesn't carry an
  // empty slash.
  data_something_created:     (v) => {
    if (!v.entity) return null;
    const showField = v.record_field && v.record_field !== 'Anything';
    return [
      { text: showField ? `${v.entity} / ${v.record_field}` : v.entity, role: 'val'   },
      { text: ' is created',                                              role: 'label' },
    ];
  },
  data_something_updated:     (v) => {
    if (!v.entity) return null;
    const showField = v.record_field && v.record_field !== 'Anything';
    return [
      { text: showField ? `${v.entity} / ${v.record_field}` : v.entity, role: 'val'   },
      { text: ' is updated',                                              role: 'label' },
    ];
  },
  data_something_deleted:     (v) => {
    if (!v.entity) return null;
    const showField = v.record_field && v.record_field !== 'Anything';
    return [
      { text: showField ? `${v.entity} / ${v.record_field}` : v.entity, role: 'val'   },
      { text: ' is deleted',                                              role: 'label' },
    ];
  },
  comment_added:              (v) => v.collection ? [
    { text: v.collection,      role: 'val'   },
    { text: ' comment added',  role: 'label' },
  ] : null,
  button_clicked:             (v) => {
    if (!v.collection) return null;
    const segs: SnippetSeg[] = [];
    if (v.field && v.field !== 'Anything') {
      segs.push({ text: `${v.collection} / ${v.field}`, role: 'val' });
    } else {
      segs.push({ text: v.collection, role: 'val' });
    }
    segs.push({ text: ' clicked', role: 'label' });
    return segs;
  },
  recurring_at_time_interval: (v) => {
    if (!v.frequency) return null;
    const segs: SnippetSeg[] = [{ text: v.frequency, role: 'val' }];
    if (v.day && v.frequency !== 'Daily') {
      segs.push({ text: ' on ', role: 'op' });
      segs.push({ text: v.day, role: 'val' });
    }
    if (v.time_of_day) {
      segs.push({ text: ' at ', role: 'op' });
      segs.push({ text: fmt12h(v.time_of_day), role: 'val' });
    }
    return segs;
  },
  geofence_user_enters:       (v) => v.location ? [
    { text: 'User enters ',  role: 'label' },
    { text: v.location,      role: 'val'   },
  ] : null,
  geofence_user_leaves:       (v) => v.location ? [
    { text: 'User leaves ',  role: 'label' },
    { text: v.location,      role: 'val'   },
  ] : null,
  tasks_task_completed:       (v) => v.task ? [
    { text: v.task,          role: 'val'   },
    { text: ' completed',    role: 'label' },
  ] : null,
  tasks_task_assigned:        (v) => v.task ? [
    { text: v.task,          role: 'val'   },
    { text: ' assigned',     role: 'label' },
  ] : null,
  tasks_task_group_completed: (v) => v.task_group ? [
    { text: v.task_group,       role: 'val'   },
    { text: ' group completed', role: 'label' },
  ] : null,
  tasks_task_group_assigned:  (v) => v.task_group ? [
    { text: v.task_group,       role: 'val'   },
    { text: ' group assigned',  role: 'label' },
  ] : null,

  // ── Actions ──────────────────────────────────────────────────────────────────

  update_data_assign_task: (v) => {
    // Multi-select task picker stores a comma-separated string. The card
    // snippet collapses to "Assign N tasks" for 2+ entries to keep the
    // line length stable; a single selection still reads as "Assign X".
    if (!v.task) return null;
    const tasks = v.task.split(',').map(t => t.trim()).filter(Boolean);
    if (tasks.length === 0) return null;
    if (tasks.length === 1) {
      return [
        { text: 'Assign ', role: 'label' },
        { text: tasks[0],  role: 'val'   },
      ];
    }
    return [
      { text: 'Assign ',                       role: 'label' },
      { text: `${tasks.length} tasks`,         role: 'val'   },
    ];
  },
  update_data_assign_task_group: (v) => v.task_group ? [
    { text: 'Assign group ', role: 'label' },
    { text: v.task_group,   role: 'val'   },
  ] : null,
  update_data_modify: (v) => {
    if (!v.column) return null;
    const segs: SnippetSeg[] = [
      { text: 'Modify ', role: 'label' },
      { text: v.column,  role: 'val'   },
    ];
    if (v.modifier) {
      segs.push({ text: ' → ',      role: 'op'  });
      segs.push({ text: v.modifier, role: 'val' });
    }
    if (v.value) {
      segs.push({ text: ' ',     role: 'op'  });
      segs.push({ text: v.value, role: 'val' });
    }
    return segs;
  },

  notifications_export_document: (v) => v.target_object_record ? [
    { text: 'Export ',                 role: 'label' },
    { text: v.target_object_record,    role: 'val'   },
  ] : null,
  notifications_send_email: (v) => {
    const segs: SnippetSeg[] = [{ text: 'Email', role: 'label' }];
    if (v.send_to_type) { segs.push({ text: ' to ', role: 'op' }); segs.push({ text: v.send_to_type, role: 'val' }); }
    return segs.length > 1 ? segs : null;
  },
  notifications_send_one_way_sms: (v) => {
    const segs: SnippetSeg[] = [{ text: 'SMS', role: 'label' }];
    if (v.send_to_type) { segs.push({ text: ' to ', role: 'op' }); segs.push({ text: v.send_to_type, role: 'val' }); }
    return segs.length > 1 ? segs : null;
  },
  notifications_send_feed_message: (v) => {
    const segs: SnippetSeg[] = [{ text: 'Feed message', role: 'label' }];
    if (v.send_to_type) { segs.push({ text: ' to ', role: 'op' }); segs.push({ text: v.send_to_type, role: 'val' }); }
    return segs.length > 1 ? segs : null;
  },
  notifications_send_chat_message: (v) => {
    const segs: SnippetSeg[] = [{ text: 'Chat message', role: 'label' }];
    if (v.department)   { segs.push({ text: ' in ', role: 'op' }); segs.push({ text: v.department,   role: 'val' }); }
    if (v.send_to_type) { segs.push({ text: ' → ',  role: 'op' }); segs.push({ text: v.send_to_type, role: 'val' }); }
    return segs;
  },
  notifications_send_report: (v) => {
    const segs: SnippetSeg[] = [{ text: 'Report', role: 'label' }];
    if (v.report)       { segs.push({ text: ': ',   role: 'op' }); segs.push({ text: v.report,       role: 'val' }); }
    if (v.send_to_type) { segs.push({ text: ' to ', role: 'op' }); segs.push({ text: v.send_to_type, role: 'val' }); }
    return segs.length > 1 ? segs : null;
  },
};

/**
 * Returns coloured segments for the configured node card summary.
 * Returns null if there's nothing meaningful to show yet.
 */
function buildNodeSnippet(step: FlowStep): SnippetSeg[] | null {
  if (step.type === 'delay') {
    const summary = formatDelaySummary(step.configValues);
    return summary ? [{ text: summary, role: 'val' }] : null;
  }
  if (!step.selectedValue) return null;
  if (step.type === 'trigger' || step.type === 'action') {
    const libItem = ALL_LIBRARY_ITEMS.find(i => i.label === step.selectedValue);
    if (!libItem) return null;
    const fn = NODE_SNIPPET[libItem.id];
    return fn ? fn(step.configValues ?? {}) : null;
  }
  if (step.type === 'condition') {
    const conds = step.conditions ?? [];
    if (conds.length === 0) return null;
    if (conds.length >= 2) {
      const logic = step.conditionLogic ?? 'AND';
      return [
        { text: String(conds.length), role: 'label' },
        { text: ' conditions',        role: 'op'    },
        { text: ` \u2014 ${logic}`,    role: 'val'   },
      ];
    }
    // Single condition — render "field operator value(s)"
    const c = conds[0];
    const def = CONDITION_LIBRARY.find(d => d.id === c.fieldId);
    const fieldLabel = def?.label ?? step.selectedValue ?? '';
    if (!fieldLabel) return null;
    const opLabel = OPERATOR_LABELS[c.operator] ?? c.operator;
    const segs: SnippetSeg[] = [
      { text: fieldLabel,    role: 'label' },
      { text: ` ${opLabel}`, role: 'op'    },
    ];
    if (c.values.length > 0) segs.push({ text: ` ${c.values.join(', ')}`, role: 'val' });
    return segs;
  }
  return null;
}

// ─── Graph validation ─────────────────────────────────────────────────────────

/** Returns true if a node of `type` can be added as a child of `parentId`.
 *  Pass parentId=null to create a new root (triggers only). */
function canAddNodeAfter(
  parentId: string | null,
  type: StepType,
  nodes: GraphNode[],
  edges: GraphEdge[],
): boolean {
  // Triggers are always valid as new disconnected roots
  if (type === 'trigger') return parentId === null;
  // Non-trigger nodes must have a parent
  if (parentId === null) return false;
  const parent = nodes.find(n => n.id === parentId);
  if (!parent) return false;
  // AI specialist nodes only chain to another action or AI. Actions can
  // chain to any non-trigger node type (the trigger guard above already
  // rejects type === 'trigger').
  if (parent.type === 'ai' && type !== 'action' && type !== 'ai') return false;
  // Delay-to-delay is disallowed
  if (parent.type === 'delay' && type === 'delay') return false;
  // Policy-to-policy is disallowed
  if (parent.type === 'policy' && type === 'policy') return false;
  const outCount = edges.filter(e => e.from === parentId).length;
  // Conditions and triggers fan out to any number of downstream nodes
  // (a single trigger can feed multiple flows; conditions branch by
  // design). The bottom-anchor / drag-drop / addEdge paths already
  // permit unlimited children for any source — this exemption keeps
  // the InsertPopover and addNodeAfter API flows in sync. Every other
  // node type is still capped at one outgoing edge.
  if (parent.type !== 'condition' && parent.type !== 'trigger' && outCount >= 1) return false;
  return true;
}

// ─── Layout constants ──────────────────────────────────────────────────────────

const NODE_W        = 200;
const NODE_H        = 130;   // approximate rendered card height (actual ~132px)
const H_SPACING     = 300;   // legacy fallback column pitch — used by manual moves /
                             // nudge that don't go through computeLayout
const V_SPACING     = 210;   // centre-to-centre row pitch (sibling slot height in
                             // horizontal flow)
const NODE_GAP      = 80;    // consistent visible gap on every parent→child path
                             // (driven by layout — applied between parent.right and child.left)
/** Per-type rendered widths — used by `computeLayout` so every connection
 *  ends up with the same `NODE_GAP` between the parent's right edge and
 *  the child's left edge. All cards share NODE_W as their layout footprint;
 *  pills (trigger/delay) sit centred inside the same slot so connectors stay
 *  aligned. */
const NODE_WIDTHS: Record<StepType, number> = {
  trigger:   NODE_W,
  policy:    NODE_W,
  condition: NODE_W,
  action:    NODE_W,
  ai:        NODE_W,
  delay:     NODE_W,
};

/** Per-type rendered heights — used by `computeLayout` so every node's
 *  vertical centre sits exactly on its row's `centreY`, regardless of
 *  whether it's a tall card or a short pill. Anchors live at each card's
 *  vertical centre, so aligning visual centres keeps single-child connectors
 *  perfectly horizontal. */
const NODE_HEIGHTS: Record<StepType, number> = {
  trigger:   52,
  delay:     44,
  policy:    76,
  condition: 92,
  action:    144,
  ai:        144,
};
const CANVAS_TOP    = 16;    // initial top padding
const LEFT_PANEL_W  = 360;   // left panel width — pan offset so content starts in visible area
// With graphContent at `left: 50%` of viewport the natural center is at ~50% of viewport.
// We offset pan.x by this value so nodes centre in the area to the right of the panel.
const INIT_PAN_X    = 300;   // empirically: root at centreX=140 → viewport x=505 (visible midpoint)

// ─── Layout engine ────────────────────────────────────────────────────────────

/** Compute absolute { x, y } pixel positions for every node in the graph.
 *  Handles: multiple independent roots, and simple merge nodes. */
function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  /**
   * Optional override for a node's row slot height. When provided for an id,
   * `getH` uses this value as the node's own-height instead of the default
   * V_SPACING.
   */
  nodeSlotHeightOverrides?: Map<string, number>,
  /**
   * Optional override for a node's actual rendered height — used to compute
   * the y offset so each node's visual centre lands on its row's `centreY`.
   * Falls back to NODE_HEIGHTS[type] when not provided.
   */
  nodeHeightOverrides?: Map<string, number>,
  /**
   * Optional per-node anchor-x offsets (left + right) measured from the
   * wrapper's top-left. When provided, `xOf` is computed from anchor edges
   * rather than the 200px wrapper edge so adjacent nodes always sit
   * `NODE_GAP` apart between anchor-right(parent) and anchor-left(child) —
   * regardless of overhang (condition/policy +30px) or pill auto-widths.
   */
  nodeAnchorOffsets?: Map<string, { left: number; right: number }>,
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  const nodeSlotH = (id: string): number =>
    nodeSlotHeightOverrides?.get(id) ?? V_SPACING;

  // Build adjacency lists
  const out = new Map<string, string[]>();
  const inc = new Map<string, string[]>();
  nodes.forEach(n => { out.set(n.id, []); inc.set(n.id, []); });
  edges.forEach(e => {
    out.get(e.from)?.push(e.to);
    inc.get(e.to)?.push(e.from);
  });

  const roots = nodes.filter(n => (inc.get(n.id)?.length ?? 0) === 0);

  // Topological depth — merge nodes get max(parent depths) + 1
  const depth = new Map<string, number>();
  roots.forEach(r => depth.set(r.id, 0));
  const processed = new Set<string>();
  const queue = roots.map(r => r.id);
  let safety = 0;
  while (queue.length > 0 && safety++ < 10000) {
    const id = queue.shift()!;
    if (processed.has(id)) continue;
    const parents = inc.get(id) ?? [];
    const unresolved = parents.filter(p => !depth.has(p));
    if (unresolved.length > 0) { queue.push(id); continue; } // wait for parents
    depth.set(id, parents.length === 0 ? 0 : Math.max(...parents.map(p => depth.get(p)! + 1)));
    processed.add(id);
    (out.get(id) ?? []).forEach(c => queue.push(c));
  }

  // Subtree height (used to centre parents next to their children along Y)
  const subtreeH = new Map<string, number>();
  const getH = (id: string, seen = new Set<string>()): number => {
    if (subtreeH.has(id)) return subtreeH.get(id)!;
    if (seen.has(id)) return nodeSlotH(id); // cycle guard
    seen.add(id);
    const children = out.get(id) ?? [];
    const total = children.length === 0
      ? nodeSlotH(id)
      : children.reduce((s, c) => s + getH(c, new Set(seen)), 0);
    const h = Math.max(nodeSlotH(id), total);
    subtreeH.set(id, h);
    return h;
  };
  roots.forEach(r => getH(r.id));

  // Compute x per node using per-type widths so every parent→child connector
  // spans the same visible `NODE_GAP`. Walk in topological depth order so
  // each node sees its parents resolved. Merge nodes (multiple parents)
  // align past the *furthest-right* parent's right edge — same convergence
  // semantics as before, just on the X axis instead of Y.
  const nodeMap = new Map(nodes.map(n => [n.id, n] as const));
  const widthOf = (id: string): number => {
    const n = nodeMap.get(id);
    return n ? NODE_WIDTHS[n.type] : NODE_W;
  };
  const anchorLeftOf = (id: string): number =>
    nodeAnchorOffsets?.get(id)?.left ?? 0;
  const anchorRightOf = (id: string): number =>
    nodeAnchorOffsets?.get(id)?.right ?? widthOf(id);
  const xOf = new Map<string, number>();
  const orderedByDepth = nodes
    .map(n => n.id)
    .filter(id => depth.has(id))
    .sort((a, b) => (depth.get(a) ?? 0) - (depth.get(b) ?? 0));
  for (const id of orderedByDepth) {
    const parents = inc.get(id) ?? [];
    if (parents.length === 0) {
      xOf.set(id, 0);
    } else {
      // Place the child so its anchor-left sits exactly NODE_GAP px to the
      // right of every parent's anchor-right. With multiple parents, snap
      // to the right-most parent so connectors stay non-crossing.
      const maxParentAnchorRight = Math.max(
        ...parents.map(p => (xOf.get(p) ?? 0) + anchorRightOf(p)),
      );
      xOf.set(id, maxParentAnchorRight + NODE_GAP - anchorLeftOf(id));
    }
  }

  // Place nodes using DFS — merge nodes keep their first-assigned position.
  // Y is computed from the subtree-centred recursion below; x comes from
  // the per-type accumulator above.
  const positions = new Map<string, { x: number; y: number }>();
  const placed    = new Set<string>();

  const heightOf = (id: string): number => {
    const override = nodeHeightOverrides?.get(id);
    if (override != null) return override;
    const n = nodeMap.get(id);
    return n ? NODE_HEIGHTS[n.type] : NODE_H;
  };

  const place = (id: string, centreY: number) => {
    if (placed.has(id)) return;
    placed.add(id);
    const x = xOf.get(id) ?? 0;
    positions.set(id, { x, y: centreY - heightOf(id) / 2 });
    const children = out.get(id) ?? [];
    if (children.length === 1) {
      // Single child — keep on the parent's row so the chain reads as one
      // straight, vertically-centred horizontal line.
      place(children[0], centreY);
    } else if (children.length > 1) {
      // Multiple children — give every sibling the same slot height (= the
      // tallest child's subtree) so the gaps between adjacent siblings are
      // identical and the group sits symmetrically around the parent's row.
      const slotH = Math.max(
        ...children.map(c => subtreeH.get(c) ?? V_SPACING),
      );
      const totalH = slotH * children.length;
      let childY = centreY - totalH / 2;
      for (const c of children) {
        place(c, childY + slotH / 2);
        childY += slotH;
      }
    }
  };

  let rootCentreY = CANVAS_TOP;
  for (const root of roots) {
    const h = subtreeH.get(root.id) ?? V_SPACING;
    place(root.id, rootCentreY + h / 2);
    rootCentreY += h + V_SPACING;
  }

  return positions;
}

// ─── Popover data ──────────────────────────────────────────────────────────────

const POPOVER_TITLES: Record<StepType, string> = {
  trigger:   'Trigger',
  condition: 'Condition',
  action:    'Action',
  ai:        'AI Specialist',
  delay:     'Delay',
  policy:    'Policy',
};

const POPOVER_SUGGESTIONS: Record<StepType, string[]> = {
  trigger:   ['Something is created', 'Button clicked', 'Task completed', 'Shift scheduled to start', 'User clocks in to shift'],
  condition: ['Status', 'Assignee', 'Start Time', 'Regular Pay Rate', 'Roles'],
  action:    ['Send email', 'Send one-way SMS', 'Clock in', 'Assign task', 'Modify'],
  ai:        ['AI Specialist'],
  delay:     [],
  policy:    [],
};

const AI_PLACEHOLDERS: Record<StepType, string> = {
  trigger:   'Describe what should kick off this automation…',
  condition: 'Describe the condition you want to check…',
  action:    'Describe what you want this step to do…',
  ai:        'Describe what the AI should do with the data…',
  delay:     'Describe how long to wait…',
  policy:    'Describe which policies to match…',
};

// ─── ConditionTagInput ──────────────────────────────────────────────────────────

function ConditionTagInput({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');
  return (
    <div className={styles.conditionTagInput}>
      {/* Chip row — only renders when there's at least one value. Wraps so
          long lists overflow gracefully. Sitting above the input keeps the
          TextField below visually identical to the single-value text path
          (see the `!isNoVal && !isIn && !isWithin && !def.valueOptions`
          branch which uses a bare `<TextField size="md">` for one value). */}
      {values.length > 0 && (
        <div className={styles.conditionTagInputChips}>
          {values.map((v, i) => (
            <span key={i} className={styles.conditionValueChip}>
              {v}
              <button
                className={styles.conditionValueChipRemove}
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                aria-label={`Remove ${v}`}
                type="button"
              >
                <XIcon />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Use the Alloy TextField so the input chrome (border, focus ring,
          height, typography, placeholder colour) matches every other text
          control in the right panel. The placeholder swap on values.length
          keeps the original "Add another…" affordance once the user has
          chips entered. */}
      <TextField
        size="md"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={values.length === 0 ? 'Type and press Enter…' : 'Add another…'}
        aria-label="Condition value"
        onKeyDown={e => {
          if (e.key === 'Enter' && input.trim()) {
            e.preventDefault();
            onChange([...values, input.trim()]);
            setInput('');
          }
          if (e.key === 'Backspace' && !input && values.length > 0) {
            onChange(values.slice(0, -1));
          }
        }}
      />
    </div>
  );
}

// ─── MultiSelectSearchPicker ──────────────────────────────────────────────────
// Right-panel control used by `multi_select` config fields (e.g. the Tasks
// field on the Assign-task action). Shape:
//   ┌─────────────────────────────────┐
//   │ 🔍  Search tasks…              │   Alloy SearchField
//   ├─────────────────────────────────┤
//   │   Google Link                   │   matching unselected options surface
//   │   Driver License                │   in a portal-free dropdown beneath
//   └─────────────────────────────────┘
//   ────────────────────────────────────
//   Google Task                  🗑      ← Alloy ListItem with Trash trailing
//   Google Link                  🗑
//
// Selecting a row from the dropdown adds it to the list below; the trash
// trailing slot on each ListItem removes it. Persists as the same
// comma-separated string the legacy pill-toggle picker used so the
// on-disk shape is unchanged.
function MultiSelectSearchPicker({
  options,
  values,
  onChange,
  placeholder = 'Search…',
  leadingIcon,
}: {
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Optional override for the per-row leading icon. Defaults to the
   *  Copy01 (stacked-squares) glyph since each row reads as one of N
   *  picked items in a stack; callers selecting a different domain
   *  (e.g. document templates) can pass their own icon to fit. */
  leadingIcon?: React.ReactNode;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen]     = useState(false);
  const containerRef        = useRef<HTMLDivElement>(null);

  // Capture-phase outside-click — same reasoning as PopoverSelect: the host
  // popover stops propagation on its own mousedown, so a bubble-phase
  // listener wouldn't see clicks landing elsewhere inside the popover.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [open]);

  const q = search.trim().toLowerCase();
  const matches = options.filter(o =>
    !values.includes(o) && (q === '' || o.toLowerCase().includes(q)),
  );

  const addValue = (v: string) => {
    onChange([...values, v]);
    setSearch('');
    setOpen(true);
  };
  const removeValue = (v: string) => onChange(values.filter(x => x !== v));

  return (
    <div ref={containerRef} className={styles.multiSelectSearchRoot}>
      <SearchField
        size="md"
        placeholder={placeholder}
        value={search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setOpen(true); }}
        onClear={() => { setSearch(''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        aria-label={placeholder}
      />
      {open && matches.length > 0 && (
        <div className={styles.multiSelectSearchDropdown} role="listbox">
          {matches.map(opt => (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={false}
              className={styles.multiSelectSearchOption}
              onMouseDown={e => { e.preventDefault(); addValue(opt); }}
            >
              <span className={styles.multiSelectSearchOptionIcon} aria-hidden>
                {leadingIcon ?? <CheckSquareIcon size={14} />}
              </span>
              {opt}
            </button>
          ))}
        </div>
      )}
      {values.length > 0 && (
        <div className={styles.multiSelectSearchList}>
          {values.map(v => (
            <ListItem
              key={v}
              size="sm"
              label={v}
              leadingSlot={leadingIcon ?? <CheckSquareIcon size={14} />}
              trailingSlot={
                <button
                  type="button"
                  className={styles.multiSelectSearchRemove}
                  aria-label={`Remove ${v}`}
                  onClick={e => { e.stopPropagation(); removeValue(v); }}
                >
                  <Trash03Icon size={14} />
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NodePopover ────────────────────────────────────────────────────────────────

// ─── NodeNameSelect ──────────────────────────────────────────────────────────────

function NodeNameSelect({ step, onSelect }: { step: FlowStep; onSelect: (label: string) => void }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef        = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const typeItems = ALL_LIBRARY_ITEMS.filter(item => item.type === step.type);
  const filtered  = query.trim()
    ? typeItems.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        i.category.toLowerCase().includes(query.toLowerCase()))
    : typeItems;

  // Position panel below trigger on open
  useEffect(() => {
    if (!open || !triggerRef.current) { setPanelPos(null); return; }
    const r = triggerRef.current.getBoundingClientRect();
    setPanelPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, [open]);

  // Close on outside click — capture-phase to bypass the right panel's
  // bubble-phase `stopPropagation()` on mousedown (see the matching note
  // in PopoverSelect below).
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      const panel = document.getElementById('node-name-panel');
      if (panel?.contains(e.target as Node)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = (label: string) => {
    setOpen(false);
    setQuery('');
    onSelect(label);
  };

  return (
    <div className={styles.nameSelect}>
      {/* Trigger — Alloy outlined input shell */}
      <button
        ref={triggerRef}
        className={clsx(inputStyles.shell, inputStyles.md, inputStyles.outlined, styles.nameSelectTrigger)}
        data-has-trailing=""
        data-open={open || undefined}
        onClick={() => setOpen(v => !v)}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.nameSelectValue}>
          {step.selectedValue
            ? step.selectedValue
            : <span className={styles.nameSelectPlaceholder}>{step.placeholder}</span>
          }
        </span>
        <span className={clsx(inputStyles.trailingSlot, 'alloy-icon-slot', styles.nameSelectChevron)}>
          <ChevronDownIcon size={14} />
        </span>
      </button>

      {/* Dropdown panel — portalled to escape overflow:hidden */}
      {open && panelPos && createPortal(
        <div
          id="node-name-panel"
          className={clsx(dropdownStyles.panel, styles.nameSelectPanel)}
          data-open
          data-placement="bottom-start"
          style={{ position: 'fixed', top: panelPos.top, left: panelPos.left, width: panelPos.width, zIndex: 2000 }}
          role="listbox"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Search input at the top of the dropdown */}
          <div className={styles.nameSelectSearchWrap}>
            <SearchField
              size="md"
              placeholder={`Search ${step.type}s…`}
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              onClear={() => setQuery('')}
              autoFocus
            />
          </div>

          {/* Filtered item list */}
          <div className={clsx(dropdownStyles.panelInner, styles.nameSelectList)} role="group">
            {filtered.length > 0 ? filtered.map(item => (
              <button
                key={item.id}
                className={clsx(dropdownStyles.item, styles.nameSelectItem, item.label === step.selectedValue && styles.nameSelectItemSelected)}
                onMouseDown={e => { e.preventDefault(); handleSelect(item.label); }}
                role="option"
                aria-selected={item.label === step.selectedValue}
                type="button"
              >
                <span className={styles.nameSearchItemLabel}>{item.label}</span>
                <span className={styles.nameSearchItemCategory}>{item.category.replace(/_/g, ' ')}</span>
              </button>
            )) : (
              <p className={styles.nameSelectEmpty}>No matches found</p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── PopoverSelect ────────────────────────────────────────────────────────────
// Generic Alloy-styled select used inside node popovers.
// Trigger = Alloy outlined input shell; panel = Alloy DropdownMenu panel,
// portalled to document.body to escape overflow:hidden containers.

interface PopoverSelectOption { value: string; label: string }

function PopoverSelect({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  className,
  /** Legacy props kept for callsite back-compat. The trigger is now
   *  always typeable — the dedicated panel-top search row is gone, the
   *  trigger input itself filters the dropdown. */
  searchable: _searchable,
  searchPlaceholder: _searchPlaceholder,
  disabled = false,
}: {
  value: string;
  options: PopoverSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** @deprecated — typing is always available now. */
  searchable?: boolean;
  /** @deprecated — no separate search row anymore. */
  searchPlaceholder?: string;
  /** Suppress opens + show muted chrome. Used by dependent fields whose
   *  parent dependency hasn't been chosen yet (e.g. "Record Field" stays
   *  disabled until an Entity is picked). */
  disabled?: boolean;
}) {
  // Suppress unused-var lint on the deprecated back-compat props.
  void _searchable; void _searchPlaceholder;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Track trigger position while open
  useEffect(() => {
    if (!open) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    const track = () => {
      if (triggerRef.current) {
        const r = triggerRef.current.getBoundingClientRect();
        setPanelPos({ top: r.bottom + 4, left: r.left, width: r.width });
      }
      rafRef.current = requestAnimationFrame(track);
    };
    rafRef.current = requestAnimationFrame(track);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [open]);

  // Close on outside click. We listen in the *capture* phase because the
  // host right-panel (`.nodePopover`) calls `e.stopPropagation()` on its
  // own mousedown handler, which would otherwise swallow the event before
  // it reached this document-level listener — leaving the dropdown stuck
  // open when the user clicks another field inside the same panel.
  // Capture-phase listeners fire BEFORE any bubble-phase stopPropagation
  // intercepts the event, so this stays robust to wrappers that try to
  // contain their click handling.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const selectedLabel = options.find(o => o.value === value)?.label ?? '';

  // Reset the typed query whenever the panel closes so the next open
  // starts with an unfiltered list and the input shows the selected
  // label again. Auto-focus the trigger input on open so the user can
  // type immediately without a second click.
  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Filter on substring of the typed query when the panel is open.
  // While closed, no filtering is applied — the input simply shows the
  // selected label.
  const visibleOptions = useMemo(() => {
    if (!open) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query, open]);

  // What the input value reflects at any moment:
  //   · open  → the live typed query (so the user sees what they typed)
  //   · closed → the selected option's label (read-only display)
  // The `placeholder` only renders when both are empty.
  const inputDisplayValue = open ? query : selectedLabel;

  return (
    <div className={clsx(styles.psRoot, className)}>
      {/* Combobox-style trigger — a div wrapping a real text input so
          the user can type-to-filter immediately on open. The wrapping
          div carries the same outlined-shell chrome as the legacy
          button trigger so the visual continuity is preserved across
          every right-panel selector. */}
      <div
        ref={triggerRef}
        className={clsx(inputStyles.shell, inputStyles.md, inputStyles.outlined, styles.psTrigger)}
        data-open={open || undefined}
        data-disabled={disabled || undefined}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled || undefined}
        onClick={() => {
          if (disabled) return;
          if (!open) setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className={styles.psValueInput}
          value={inputDisplayValue}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          onChange={e => {
            if (!open) setOpen(true);
            setQuery(e.target.value);
          }}
          onFocus={() => { if (!disabled) setOpen(true); }}
          aria-controls={undefined}
          aria-autocomplete="list"
        />
        <span className={clsx(inputStyles.trailingSlot, 'alloy-icon-slot', styles.psChevron)}>
          <ChevronDownIcon size={14} />
        </span>
      </div>

      {open && !disabled && panelPos && createPortal(
        <div
          ref={panelRef}
          className={clsx(dropdownStyles.panel, styles.psPanel)}
          data-open
          data-placement="bottom-start"
          style={{ position: 'fixed', top: panelPos.top, left: panelPos.left, width: panelPos.width, zIndex: 2000 }}
          role="listbox"
          // Prevent the global outside-click handler from firing when the
          // user mouses down on a panel item; the click below commits
          // the option and closes.
          onMouseDown={e => e.stopPropagation()}
        >
          <div className={dropdownStyles.panelInner}>
            {visibleOptions.length > 0 ? visibleOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={clsx(dropdownStyles.item, styles.psItem, opt.value === value && styles.psItemSelected)}
                onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
              >
                {opt.label}
              </button>
            )) : (
              <p className={styles.psEmpty}>No matches</p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── AI Specialist config components ─────────────────────────────────────────────

const AI_SPEC_READ_FIELDS  = ['First Name', 'Last Name', 'DOB', 'Notes', 'Role', 'Preferred Location'] as const;
const AI_SPEC_WRITE_FIELDS = ['SSN', 'Preferred Name', 'Last Name', 'DOB', 'Notes', 'Role', 'Preferred Location'] as const;
/** Universe of record fields the user can search/add into Read or Write
 *  on the AI Specialist Triggering-record card. Superset of the seed lists. */
const AI_SPEC_AVAILABLE_FIELDS = [
  'First Name', 'Last Name', 'Preferred Name', 'DOB', 'SSN', 'Notes',
  'Role', 'Preferred Location', 'Phone', 'Email', 'Address', 'City',
  'State', 'Zip', 'Department', 'Manager', 'Start Date', 'End Date',
  'Status', 'Pay Rate',
] as const;
const AI_SPEC_CHANNELS     = ['SMS', 'Text', 'Voice'] as const;
const AI_ADD_CARD_OPTIONS  = ['Data', 'Analyze files', 'Claim shifts', 'Policy matches', 'Engage'] as const;
type AiAddCardOption = typeof AI_ADD_CARD_OPTIONS[number];
const AI_ENGAGE_TARGETS    = [
  { value: 'Policy Matches (Users for Shift)', label: 'Policy Matches (Users for Shift)' },
  { value: 'All Users',                        label: 'All Users' },
  { value: 'Specific Group',                   label: 'Specific Group' },
];

/* ─── AiSpecialistPersonaPicker ─────────────────────────────────────────────
   Empty-state picker shown when an AI Specialist node is first added — the
   user picks one of the preset personas before any configuration UI is
   exposed. Pattern mirrors <ActionSelector>: a search field on top, a
   scrolling list of rows below, no group headers (the persona library is
   small enough to display as a single flat list).

   Selecting a row commits two writes:
     · selectedValue          → 'AI Specialist'  (flips the popover into the
                                                  configured branch)
     · configValues.ai_persona_id → persona.id   (so AiSpecialistMeta can
                                                  show the chosen persona) */

interface AiSpecialistPersonaPickerProps {
  onSelect: (persona: AiPersona) => void;
  /** When true, drop the picker's internal section paddings — used when
   *  the picker is rendered inside a Dialog whose `DialogContent` already
   *  contributes the standard 16px padding around its children. */
  bare?: boolean;
}

function AiSpecialistPersonaPicker({ onSelect, bare = false }: AiSpecialistPersonaPickerProps) {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const filtered = q
    ? AI_PERSONAS.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      )
    : AI_PERSONAS;

  return (
    <div className={clsx(styles.actionSelectorRoot, bare && styles.actionSelectorRootBare)}>
      <div className={clsx(styles.actionSelectorSearch, bare && styles.actionSelectorSearchBare)}>
        <SearchField
          size="sm"
          placeholder="Search personas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          aria-label="Search personas"
        />
      </div>

      <div className={clsx(styles.actionSelectorList, bare && styles.actionSelectorListBare)}>
        {filtered.length === 0 ? (
          <p className={styles.actionSelectorEmpty}>No personas match "{search}"</p>
        ) : (
          filtered.map(persona => (
            <button
              key={persona.id}
              type="button"
              className={styles.actionSelectorRow}
              onClick={() => onSelect(persona)}
            >
              {/* Per-persona 3D geometric robot avatar — see PersonaAvatar.tsx
                  for the design rationale. The same component is used in the
                  configured AiSpecialistMeta card and the Test tab header so
                  the picker → configured transition stays visually continuous. */}
              <span className={styles.personaPickerAvatar} aria-hidden>
                <PersonaAvatar personaId={persona.id} size={36} />
              </span>
              <span className={styles.actionSelectorRowText}>
                <span className={styles.actionSelectorRowLabel}>
                  {persona.name}
                  <span className={styles.personaPickerRole}>· {persona.role}</span>
                </span>
                <span className={styles.actionSelectorRowDesc}>{persona.description}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/** Action + Specialist Persona rows — rendered above the Configuration divider */
function AiSpecialistMeta({
  step,
  onUpdateConfigField,
  onPickPersona,
}: {
  step: FlowStep;
  onUpdateConfigField: (key: string, value: string) => void;
  /** Commit a fresh persona pick (writes both `ai_persona_id` and flips
   *  `selectedValue` to the configured sentinel). */
  onPickPersona: (persona: AiPersona) => void;
}) {
  void onUpdateConfigField; // persona writes flow through onPickPersona below
  // Resolve the configured persona, if any. The card now renders an empty
  // state when no `ai_persona_id` has been chosen yet — which is the
  // first state when an AI node is dropped onto the canvas.
  const personaId = step.configValues?.ai_persona_id;
  const persona = personaId ? getPersonaById(personaId) ?? null : null;
  const isConfigured =
    !!persona && step.selectedValue === 'AI Specialist';

  // Dialog state for the picker — opened by both the "Choose" empty-
  // state CTA and the configured-state "Change" button.
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className={styles.aiSpecRows}>
      <div className={styles.aiSpecRow}>
        <Eyebrow>Specialist Persona</Eyebrow>
        <div className={styles.aiSpecPersonaCard}>
          {isConfigured && persona ? (
            <>
              <div className={styles.aiSpecPersonaAvatar}>
                <PersonaAvatar personaId={persona.id} size={32} />
              </div>
              <div className={styles.aiSpecPersonaInfo}>
                <div className={styles.aiSpecPersonaName}>
                  {persona.name}
                  <div className={styles.aiSpecVoicePill}>
                    <div className={styles.aiSpecVoicePillIcon}><VolumeMaxIcon size={12} /></div>
                    <span className={styles.aiSpecVoicePillLabel}>{persona.voice}</span>
                  </div>
                </div>
                <div className={styles.aiSpecPersonaRole}>{persona.role}</div>
              </div>
              <Button variant="ghost" size="xs" onClick={() => setPickerOpen(true)}>
                Change
              </Button>
            </>
          ) : (
            <>
              {/* Empty state — same card geometry as the configured branch
                  so the popover layout doesn't jump between the two
                  states. The diamond glyph stands in for the persona
                  avatar until a specialist is picked. */}
              <div className={clsx(styles.aiSpecPersonaAvatar, styles.aiSpecPersonaAvatarEmpty)} aria-hidden>
                <TeambridgeAIIcon size={20} />
              </div>
              <div className={styles.aiSpecPersonaInfo}>
                <div className={styles.aiSpecPersonaName}>No specialist selected</div>
                <div className={styles.aiSpecPersonaRole}>Pick a persona to power this step</div>
              </div>
              <Button variant="secondary" size="xs" onClick={() => setPickerOpen(true)}>
                Choose
              </Button>
            </>
          )}
        </div>
      </div>

      <AiSpecialistPersonaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={p => {
          onPickPersona(p);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

/** Modal wrapper around `AiSpecialistPersonaPicker`. The picker itself
 *  already supplies a search field + persona list, so the dialog only
 *  contributes chrome (header / close / size). Selection commits via
 *  the picker's existing `onSelect` callback. */
function AiSpecialistPersonaPickerDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (persona: AiPersona) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} size="md" aria-label="Choose a specialist">
      <DialogHeader onClose={onClose}>Choose a specialist</DialogHeader>
      <DialogContent>
        <AiSpecialistPersonaPicker onSelect={onSelect} bare />
      </DialogContent>
    </Dialog>
  );
}

/** Modal wrapper around `ActionSelector`. Same shape as the AI persona
 *  picker dialog: the picker already brings its own search field + grouped
 *  list, so the dialog only contributes chrome (header / close button)
 *  and lets the user cancel without committing a selection. */
function ActionSelectorDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (label: string) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} size="md" aria-label="Choose an action">
      <DialogHeader onClose={onClose}>Choose an action</DialogHeader>
      <DialogContent>
        <ActionSelector onSelect={onSelect} bare />
      </DialogContent>
    </Dialog>
  );
}

/** Triggering record + Engage cards — rendered inside the Configuration section */
// Icon map for each add-card option
const AI_CARD_ICON: Record<AiAddCardOption, React.ReactNode> = {
  'Data': (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 5h11M5 1.5v11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  'Analyze files': (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 1.5h5.5L11 4v8.5H3V1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8.5 1.5V4H11" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5 7h4M5 9.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  'Claim shifts': (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1.5" y="3" width="11" height="9.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 1.5v3M9 1.5v3M1.5 6.5h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  'Policy matches': (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1.5L2 3.5v4c0 2.761 2.239 5 5 5s5-2.239 5-5v-4L7 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'Engage': (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M8 1.5L3.5 7.5H7.5L5.5 12.5L10.5 6.5H6.5L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
};

/* ─── FieldTagPicker ───────────────────────────────────────────────────────────
   Editable list of field chips with an inline search input. Renders the
   selected fields as removable chips, plus a typeahead at the end that
   shows matching unselected fields in a dropdown. Used by the AI
   Specialist Triggering-record card so users can add / remove fields
   without leaving the popover. */
interface FieldTagPickerProps {
  fields: string[];
  available: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** When set, render selected entries as Alloy `<Tag>` chips with the
   *  given colour + variant instead of the default `.fieldChip` shell.
   *  Reserved for cases where the field semantically reads as a tag (e.g.
   *  message channel chips on the AI Engage card). */
  tagColor?: TagColor;
  tagVariant?: 'subtle' | 'outline' | 'fill';
}

function FieldTagPicker({ fields, available, onChange, placeholder, tagColor, tagVariant = 'subtle' }: FieldTagPickerProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click. We listen on the capture phase because
  // the parent popover stops propagation on mousedown — without capture our
  // bubble-phase listener would never see clicks landing inside the popover
  // but outside the picker, leaving the dropdown stuck open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [open]);

  const q = search.trim().toLowerCase();
  const matches = available.filter(f => !fields.includes(f) && (q === '' || f.toLowerCase().includes(q)));

  const addField = (f: string) => {
    onChange([...fields, f]);
    setSearch('');
    setOpen(true);
    inputRef.current?.focus();
  };
  const removeField = (f: string) => onChange(fields.filter(x => x !== f));

  return (
    <div ref={containerRef} className={styles.fieldTagPicker}>
      <div className={styles.aiSpecFieldSubTags}>
        {fields.map(f => (
          tagColor ? (
            // Alloy Tag carries a built-in `dismissible` slot that renders
            // the X glyph INSIDE the pill, so the chip reads as a single
            // unit instead of a two-piece "tag + outboard X" pair. The
            // wrapping span is gone — the Tag component owns the chip
            // shape and the close button alike.
            <Tag
              key={f}
              color={tagColor}
              variant={tagVariant}
              size="sm"
              dismissible
              onDismiss={() => removeField(f)}
              aria-label={f}
            >
              {f}
            </Tag>
          ) : (
            <span key={f} className={styles.fieldChip}>
              {f}
              <button
                type="button"
                className={styles.fieldChipRemove}
                onClick={() => removeField(f)}
                aria-label={`Remove ${f}`}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
                  <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          )
        ))}
        <input
          ref={inputRef}
          type="text"
          className={styles.fieldChipInput}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches.length > 0) {
              e.preventDefault();
              addField(matches[0]);
            } else if (e.key === 'Backspace' && search === '' && fields.length > 0) {
              removeField(fields[fields.length - 1]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder={fields.length === 0 ? (placeholder ?? 'Search fields…') : ''}
          aria-label="Add field"
        />
      </div>
      {open && matches.length > 0 && (
        <div className={styles.fieldChipDropdown} role="listbox">
          {matches.slice(0, 8).map(f => (
            <button
              key={f}
              type="button"
              role="option"
              className={styles.fieldChipOption}
              onMouseDown={(e) => { e.preventDefault(); addField(f); }}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AiSpecialistCards({
  step,
  onUpdateConfigField,
  triggerLabel,
}: {
  step: FlowStep;
  onUpdateConfigField: (key: string, value: string) => void;
  /** Selected label of the workflow's trigger step — drives the "Triggering record" subtitle. */
  triggerLabel?: string;
}) {
  const vals         = step.configValues ?? {};
  const engageTarget = vals.ai_engage_target ?? 'Policy Matches (Users for Shift)';
  const maxTargets   = vals.ai_max_targets   ?? '10';
  const channels     = (vals.ai_channels ?? 'SMS,Text,Voice').split(',').filter(Boolean);

  // Resolve the record noun from the upstream trigger (falls back to "Record"
  // when no trigger is configured yet) so the card reflects whatever flows in.
  const recordNoun = getTriggerRecordType(triggerLabel).noun;

  // Read/Write field selections — local state so users can add/remove fields
  // via the FieldTagPicker below. Seeded from the constant lists; not yet
  // persisted into configValues since this is mock UI.
  const [readFields,  setReadFields]  = useState<string[]>(() => [...AI_SPEC_READ_FIELDS]);
  const [writeFields, setWriteFields] = useState<string[]>(() => [...AI_SPEC_WRITE_FIELDS]);
  const fieldCount = readFields.length + writeFields.length;

  const [activeCards, setActiveCards] = useState<AiAddCardOption[]>(['Engage']);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  // Per-card collapsed state — keyed by a stable card key. Default is
  // "everything collapsed" so the panel opens with a compact summary;
  // clicking a card header expands its body. The Triggering record card
  // uses the literal key 'trigger'; optional cards use their AiAddCardOption.
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(
    () => new Set(['trigger', ...AI_ADD_CARD_OPTIONS]),
  );
  const isCardCollapsed = (key: string) => collapsedCards.has(key);
  const toggleCardCollapsed = (key: string) => {
    setCollapsedCards(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleChannel = (ch: string) => {
    const next = channels.includes(ch)
      ? channels.filter(c => c !== ch)
      : [...channels, ch];
    onUpdateConfigField('ai_channels', next.join(','));
  };

  const removeCard = (opt: AiAddCardOption) =>
    setActiveCards(prev => prev.filter(c => c !== opt));

  const addCard = (opt: AiAddCardOption) => {
    setActiveCards(prev => [...prev, opt]);
    setShowAddMenu(false);
  };

  const openAddMenu = () => {
    if (!addBtnRef.current) return;
    const rect = addBtnRef.current.getBoundingClientRect();
    // Open upward so it's never clipped by the panel bottom
    setMenuPos({ top: rect.top, left: rect.left });
    setShowAddMenu(true);
  };

  // Close popup on outside click (native, works inside portals)
  useEffect(() => {
    if (!showAddMenu) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const menu = document.querySelector('[data-ai-add-menu]');
      if (menu && !menu.contains(target) && !addBtnRef.current?.contains(target)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showAddMenu]);

  return (
    <div className={styles.aiSpecCards}>

      {/* ── Triggering record card — always shown ── */}
      <div className={styles.aiSpecDataCard} data-collapsed={isCardCollapsed('trigger') ? 'true' : 'false'}>
        <div
          className={styles.aiSpecDataCardHeader}
          onClick={() => toggleCardCollapsed('trigger')}
          role="button"
          tabIndex={0}
          aria-expanded={!isCardCollapsed('trigger')}
        >
          <div className={styles.aiSpecDataCardHeaderIcon}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M1.5 13c0-2.761 2.462-4.5 5.5-4.5s5.5 1.739 5.5 4.5"
                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M10 6.5l1.5 1.5L10 9.5"
                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className={styles.aiSpecDataCardHeaderText}>
            <div className={styles.aiSpecDataCardTitle}>Triggering record</div>
            <div className={styles.aiSpecDataCardSubtitle}>{recordNoun} ({fieldCount} fields)</div>
          </div>
          <div className={styles.aiSpecDataCardActions} onClick={e => e.stopPropagation()}>
            <span className={clsx(styles.aiSpecDataCardChevron, !isCardCollapsed('trigger') && styles.aiSpecDataCardChevronOpen)} aria-hidden>
              <ChevronDownIcon size={14} />
            </span>
            <Button variant="ghost" size="xs" iconOnly aria-label="Options">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                <circle cx="3.5" cy="7" r="1.1" />
                <circle cx="7"   cy="7" r="1.1" />
                <circle cx="10.5" cy="7" r="1.1" />
              </svg>
            </Button>
          </div>
        </div>
        {!isCardCollapsed('trigger') && (
        <div className={styles.aiSpecDataCardBody}>
          <div className={styles.aiSpecDataFieldRow}>
            <span className={styles.aiSpecDataFieldLabel}>User</span>
            <div className={styles.aiSpecDataFieldContent}>
              <div className={styles.aiSpecFieldPillRow}>
                <Tag variant="subtle" size="sm" color="green">Read ({readFields.length})</Tag>
                <FieldTagPicker
                  fields={readFields}
                  available={AI_SPEC_AVAILABLE_FIELDS as unknown as string[]}
                  onChange={setReadFields}
                  placeholder="Add field…"
                />
              </div>
              <div className={styles.aiSpecFieldPillRow}>
                <Tag variant="subtle" size="sm" color="purple">Write ({writeFields.length})</Tag>
                <FieldTagPicker
                  fields={writeFields}
                  available={AI_SPEC_AVAILABLE_FIELDS as unknown as string[]}
                  onChange={setWriteFields}
                  placeholder="Add field…"
                />
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* ── Optional active cards ── */}
      {activeCards.map(cardType => {
        if (cardType === 'Engage') return (
          <div key="Engage" className={styles.aiSpecDataCard} data-collapsed={isCardCollapsed('Engage') ? 'true' : 'false'}>
            <div
              className={styles.aiSpecDataCardHeader}
              onClick={() => toggleCardCollapsed('Engage')}
              role="button"
              tabIndex={0}
              aria-expanded={!isCardCollapsed('Engage')}
            >
              <div className={styles.aiSpecDataCardHeaderIcon}>
                {AI_CARD_ICON['Engage']}
              </div>
              <div className={styles.aiSpecDataCardHeaderText}>
                <div className={styles.aiSpecDataCardTitle}>Engage</div>
                <div className={styles.aiSpecDataCardSubtitle}>Communication</div>
              </div>
              <div className={styles.aiSpecDataCardActions} onClick={e => e.stopPropagation()}>
                <span className={clsx(styles.aiSpecDataCardChevron, !isCardCollapsed('Engage') && styles.aiSpecDataCardChevronOpen)} aria-hidden>
                  <ChevronDownIcon size={14} />
                </span>
                <Button variant="ghost" size="xs" iconOnly aria-label="Options">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                    <circle cx="3.5" cy="7" r="1.1" />
                    <circle cx="7"   cy="7" r="1.1" />
                    <circle cx="10.5" cy="7" r="1.1" />
                  </svg>
                </Button>
                <Button variant="ghost" size="xs" iconOnly aria-label="Remove" onClick={() => removeCard('Engage')}>
                  <Trash03Icon size={14} />
                </Button>
              </div>
            </div>
            {!isCardCollapsed('Engage') && (
            <div className={styles.aiSpecDataCardBody}>
              <div className={styles.aiSpecDataFieldRow}>
                <span className={styles.aiSpecDataFieldLabel}>Message</span>
                {/* Channels render as pink Alloy tags inside a typeahead
                    picker — same UX as the Read/Write fields above (type
                    to search, Enter to add, click × to remove, Backspace
                    when input is empty to remove the last chip). */}
                <FieldTagPicker
                  fields={channels}
                  available={[...AI_SPEC_CHANNELS]}
                  onChange={next => onUpdateConfigField('ai_channels', next.join(','))}
                  placeholder={channels.length === 0 ? 'Search channels…' : ''}
                  tagColor="pink"
                />
              </div>
              <div className={styles.aiSpecDataFieldRow}>
                <span className={styles.aiSpecDataFieldLabel}>Target</span>
                <SelectField
                  size="sm"
                  options={AI_ENGAGE_TARGETS}
                  value={engageTarget}
                  onChange={v => onUpdateConfigField('ai_engage_target', v)}
                  className={styles.aiSpecTargetWrap}
                />
              </div>
              <div className={styles.aiSpecDataFieldRow}>
                <span className={styles.aiSpecDataFieldLabel}>Max Targets</span>
                <NumberField
                  size="sm"
                  value={maxTargets}
                  onChange={e => onUpdateConfigField('ai_max_targets', e.target.value)}
                  min={1}
                  aria-label="Max Targets"
                  className={styles.aiSpecMaxTargetsInput}
                />
              </div>
            </div>
            )}
          </div>
        );

        // Empty placeholder card for other types — header only, no body.
        return (
          <div key={cardType} className={styles.aiSpecDataCard} data-collapsed="true">
            <div
              className={styles.aiSpecDataCardHeader}
              onClick={() => toggleCardCollapsed(cardType)}
              role="button"
              tabIndex={0}
              aria-expanded={!isCardCollapsed(cardType)}
            >
              <div className={styles.aiSpecDataCardHeaderIcon}>
                {AI_CARD_ICON[cardType]}
              </div>
              <div className={styles.aiSpecDataCardHeaderText}>
                <div className={styles.aiSpecDataCardTitle}>{cardType}</div>
                <div className={styles.aiSpecDataCardSubtitle}>Not configured</div>
              </div>
              <div className={styles.aiSpecDataCardActions} onClick={e => e.stopPropagation()}>
                <span className={clsx(styles.aiSpecDataCardChevron, !isCardCollapsed(cardType) && styles.aiSpecDataCardChevronOpen)} aria-hidden>
                  <ChevronDownIcon size={14} />
                </span>
                <Button variant="ghost" size="xs" iconOnly aria-label="Options">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                    <circle cx="3.5" cy="7" r="1.1" />
                    <circle cx="7"   cy="7" r="1.1" />
                    <circle cx="10.5" cy="7" r="1.1" />
                  </svg>
                </Button>
                <Button variant="ghost" size="xs" iconOnly aria-label="Remove" onClick={() => removeCard(cardType)}>
                  <Trash03Icon size={14} />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Add button ── */}
      <AreaButton
        ref={addBtnRef}
        label="Add"
        layout="horizontal"
        align="start"
        onClick={openAddMenu}
      />

      {/* ── Option popup — portaled to body to escape overflow:hidden ── */}
      {showAddMenu && menuPos && createPortal(
        <div
          data-ai-add-menu
          className={styles.aiSpecAddMenu}
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {AI_ADD_CARD_OPTIONS.map(opt => (
            <button
              key={opt}
              className={styles.aiSpecAddMenuItem}
              disabled={activeCards.includes(opt)}
              onClick={() => addCard(opt)}
            >
              <span className={styles.aiSpecAddMenuIcon}>{AI_CARD_ICON[opt]}</span>
              {opt}
            </button>
          ))}
        </div>,
        document.body,
      )}

    </div>
  );
}

/** Timeout config card — rendered inside the AI Specialist's
 *  Configuration section, separate from the "Agent has access to"
 *  cluster. Single duration setting drives the "nudge once, then end
 *  the chat" timeout behaviour. */
function AiSpecialistTimeoutCard({
  step,
  onUpdateConfigField,
}: {
  step: FlowStep;
  onUpdateConfigField: (key: string, value: string) => void;
}) {
  const vals          = step.configValues ?? {};
  const timeoutAmount = vals.ai_timeout_amount ?? '5';
  const timeoutUnit   = vals.ai_timeout_unit   ?? 'Minutes';
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className={styles.aiSpecCards}>
      <div className={styles.aiSpecDataCard} data-collapsed={collapsed ? 'true' : 'false'}>
        <div
          className={styles.aiSpecDataCardHeader}
          onClick={() => setCollapsed(c => !c)}
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
        >
          <div className={styles.aiSpecDataCardHeaderIcon}>
            <ClockIcon size={14} />
          </div>
          <div className={styles.aiSpecDataCardHeaderText}>
            <div className={styles.aiSpecDataCardTitle}>Timeout</div>
            <div className={styles.aiSpecDataCardSubtitle}>
              Nudges once, then ends the chat after {timeoutAmount} {String(timeoutUnit).toLowerCase()}
            </div>
          </div>
          <div className={styles.aiSpecDataCardActions} onClick={e => e.stopPropagation()}>
            <span className={clsx(styles.aiSpecDataCardChevron, !collapsed && styles.aiSpecDataCardChevronOpen)} aria-hidden>
              <ChevronDownIcon size={14} />
            </span>
            <Button variant="ghost" size="xs" iconOnly aria-label="Options">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                <circle cx="3.5" cy="7" r="1.1" />
                <circle cx="7"   cy="7" r="1.1" />
                <circle cx="10.5" cy="7" r="1.1" />
              </svg>
            </Button>
          </div>
        </div>
        {!collapsed && (
          <div className={styles.aiSpecDataCardBody}>
            <div className={styles.aiSpecDataFieldRow}>
              <span className={styles.aiSpecDataFieldLabel}>End after</span>
              <div className={styles.conditionWithinNext}>
                <NumberField
                  size="sm"
                  value={timeoutAmount}
                  onChange={e => onUpdateConfigField('ai_timeout_amount', e.target.value)}
                  min={1}
                  aria-label="Timeout amount"
                  className={styles.conditionWithinNextNum}
                />
                <SelectField
                  size="sm"
                  options={[
                    { value: 'Minutes', label: 'Minutes' },
                    { value: 'Hours',   label: 'Hours'   },
                  ]}
                  value={timeoutUnit}
                  onChange={v => onUpdateConfigField('ai_timeout_unit', v)}
                  className={styles.conditionWithinNextUnit}
                />
              </div>
            </div>
            <p className={styles.aiSpecTimeoutHint}>
              If the user doesn't respond, the specialist sends one nudge
              and then ends the conversation when the timer expires.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Specialist Test tab ───────────────────────────────────────────────────

/** Maps a trigger's selected label to a record-type descriptor used by the Test tab. */
function getTriggerRecordType(label: string | undefined): {
  noun: string;
  plural: string;
  samples: string[];
} {
  const shiftDefaults = {
    noun: 'Shift',
    plural: 'Shifts',
    samples: [
      'Morning Shift — Dec 5, 2024 (John D.)',
      'Evening Shift — Dec 6, 2024 (Sarah M.)',
      'Night Shift — Dec 7, 2024 (Alex R.)',
    ],
  };
  if (!label) {
    // No trigger configured yet — neutral record noun.
    return {
      noun: 'Record',
      plural: 'Records',
      samples: shiftDefaults.samples,
    };
  }
  const l = label.toLowerCase();
  // Generic data-workflow triggers operate on an arbitrary record type —
  // the user picks the data source in the trigger's own config. Use a
  // neutral noun here until we can surface that downstream.
  if (l.includes('something is') || l.includes('button clicked') || l.includes('scheduled time')) {
    return {
      noun: 'Record',
      plural: 'Records',
      samples: shiftDefaults.samples,
    };
  }
  if (l.includes('shift') || l.includes('break') || l.includes('clock')) return shiftDefaults;
  if (l.includes('task')) return {
    noun: 'Task',
    plural: 'Tasks',
    samples: [
      'Inventory Count — Dec 5, 2024 (Priya K.)',
      'Equipment Check — Dec 6, 2024 (Marcus T.)',
      'Cleaning Round — Dec 7, 2024 (Leah W.)',
    ],
  };
  if (l.includes('document')) return {
    noun: 'Document',
    plural: 'Documents',
    samples: [
      'W-4 Form — Dec 5, 2024 (John D.)',
      'Training Acknowledgement — Dec 6, 2024 (Sarah M.)',
      'Handbook Receipt — Dec 7, 2024 (Alex R.)',
    ],
  };
  if (l.includes('comment')) return {
    noun: 'Comment',
    plural: 'Comments',
    samples: [
      'Shift feedback — Dec 5, 2024 (John D.)',
      'Policy question — Dec 6, 2024 (Sarah M.)',
      'Schedule note — Dec 7, 2024 (Alex R.)',
    ],
  };
  if (l.includes('geofence')) return {
    noun: 'Location event',
    plural: 'Location events',
    samples: [
      'Entered Site A — Dec 5, 2024 (John D.)',
      'Left Site B — Dec 6, 2024 (Sarah M.)',
      'Entered Site C — Dec 7, 2024 (Alex R.)',
    ],
  };
  if (l.includes('user') || l.includes('job')) return {
    noun: 'User',
    plural: 'Users',
    samples: [
      'John D. — Warehouse Associate',
      'Sarah M. — Shift Lead',
      'Alex R. — Driver',
    ],
  };
  return shiftDefaults;
}

interface TestChatMessage {
  id: string;
  sender: 'specialist' | 'user';
  text: string;
}

/** Builds a mock specialist response referencing the configured name + role. */
function buildSpecialistReply(
  userText: string,
  specialistName: string,
  specialistRole: string,
  messageIndex: number,
): string {
  const t = userText.trim().toLowerCase();
  if (messageIndex === 0) {
    return `Hi, I'm ${specialistName}, your ${specialistRole}. I've loaded the selected record — ask me anything about it or tell me what you'd like to test.`;
  }
  if (t.includes('hello') || t.includes('hi ') || t === 'hi') {
    return `Hey there — ${specialistName} here. What would you like me to do with this record?`;
  }
  if (t.includes('who')) {
    return `I'm ${specialistName}, acting as the ${specialistRole} for this workflow.`;
  }
  if (t.includes('?')) {
    return `Based on the trigger record, here's what I'd do as your ${specialistRole}: reach out to the matched user, confirm intent, and log the outcome. Want me to walk through that?`;
  }
  return `Understood. As your ${specialistRole}, I'll treat that as the next step and update you once I've acted on the record. (This is a simulated response from ${specialistName}.)`;
}

interface AiSpecialistTestProps {
  specialistName: string;
  specialistRole: string;
  /** Voice label (e.g. 'alloy', 'nova') — drives the small voice pill in the
   *  header card so the Test tab matches the Configure tab styling. */
  specialistVoice?: string;
  /** Persona id — drives the 3D geometric robot avatar in the header card. */
  personaId?: string;
  triggerLabel: string | undefined;
}

function AiSpecialistTest({ specialistName, specialistRole, specialistVoice, personaId, triggerLabel }: AiSpecialistTestProps) {
  const record = getTriggerRecordType(triggerLabel);

  // Default to the first sample record so the user can hit "Start Test"
  // immediately without having to make a selection. They can still pick
  // a different record from the dropdown before starting.
  const [selectedRecord, setSelectedRecord] = useState<string>(() => record.samples[0] ?? '');
  const [started, setStarted] = useState<boolean>(false);
  const [messages, setMessages] = useState<TestChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<number | null>(null);
  const userMessageCountRef = useRef<number>(0);

  // Auto-scroll to bottom whenever messages/typing changes
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  // Clear any pending typing timer on unmount
  useEffect(() => () => {
    if (typingTimerRef.current != null) {
      window.clearTimeout(typingTimerRef.current);
    }
  }, []);

  const startTest = () => {
    if (!selectedRecord) return;
    setStarted(true);
    setMessages([]);
    userMessageCountRef.current = 0;

    // Kick off with an opening specialist message (simulated typing delay)
    setIsTyping(true);
    typingTimerRef.current = window.setTimeout(() => {
      setMessages([{
        id: `m-${Date.now()}`,
        sender: 'specialist',
        text: buildSpecialistReply('', specialistName, specialistRole, 0),
      }]);
      setIsTyping(false);
    }, 1200);
  };

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const userMsg: TestChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    const currentIndex = userMessageCountRef.current + 1;
    userMessageCountRef.current = currentIndex;

    setIsTyping(true);
    const delay = 900 + Math.random() * 900;
    typingTimerRef.current = window.setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `m-${Date.now()}`,
        sender: 'specialist',
        text: buildSpecialistReply(text, specialistName, specialistRole, currentIndex),
      }]);
      setIsTyping(false);
    }, delay);
  };

  const resetChat = () => {
    if (typingTimerRef.current != null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setMessages([]);
    setInputText('');
    setIsTyping(false);
    userMessageCountRef.current = 0;

    // Re-open with a fresh opening message — stay in chat view
    setIsTyping(true);
    typingTimerRef.current = window.setTimeout(() => {
      setMessages([{
        id: `m-${Date.now()}`,
        sender: 'specialist',
        text: buildSpecialistReply('', specialistName, specialistRole, 0),
      }]);
      setIsTyping(false);
    }, 1000);
  };

  // Mirrors the Configure-tab persona card (`AiSpecialistMeta`) so both tabs
  // present the chosen specialist with the same chrome — outlined card, small
  // diamond avatar on a brand fill, name + voice pill inline, role below.
  // No Change button here since the Test tab is read-only display.
  const specialistHeaderCard = (
    <div className={styles.aiSpecPersonaCard}>
      <div className={styles.aiSpecPersonaAvatar}>
        <PersonaAvatar personaId={personaId} size={32} />
      </div>
      <div className={styles.aiSpecPersonaInfo}>
        <div className={styles.aiSpecPersonaName}>
          {specialistName}
          {specialistVoice && (
            <div className={styles.aiSpecVoicePill}>
              <div className={styles.aiSpecVoicePillIcon}><VolumeMaxIcon size={12} /></div>
              <span className={styles.aiSpecVoicePillLabel}>{specialistVoice}</span>
            </div>
          )}
        </div>
        <div className={styles.aiSpecPersonaRole}>{specialistRole}</div>
      </div>
    </div>
  );

  // ── Record selection screen ────────────────────────────────────────────────
  if (!started) {
    const options = [
      { value: '', label: `Select a ${record.noun.toLowerCase()}…` },
      ...record.samples.map(s => ({ value: s, label: s })),
    ];
    return (
      <div className={styles.aiTestRoot}>
        {specialistHeaderCard}

        <div className={styles.aiTestRecordSection}>
          <div className={styles.aiTestRecordTitle}>
            Select a {record.plural} record
          </div>
          <p className={styles.aiTestRecordDescription}>
            Choose a record to mimic the automation trigger and test how your
            specialist responds.
          </p>

          <SelectField
            size="sm"
            options={options}
            value={selectedRecord}
            onChange={v => setSelectedRecord(v)}
            placeholder={`Select a ${record.noun.toLowerCase()}…`}
            aria-label={`Select a ${record.noun} record`}
          />

          <button
            type="button"
            className={styles.aiTestStartBtn}
            onClick={startTest}
            disabled={!selectedRecord}
            aria-label="Start Test"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M3.5 2.5L11 7L3.5 11.5V2.5Z" fill="currentColor" />
            </svg>
            <span>Start Test</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Chat view ──────────────────────────────────────────────────────────────
  // Determine when to show specialist avatar + name (start of a specialist sequence)
  const shouldShowSpecialistHeader = (idx: number): boolean => {
    if (messages[idx].sender !== 'specialist') return false;
    if (idx === 0) return true;
    return messages[idx - 1].sender !== 'specialist';
  };

  return (
    <div className={clsx(styles.aiTestRoot, styles.aiTestRootChat)}>
      {specialistHeaderCard}

      <div className={styles.aiTestThread} ref={threadRef}>
        {messages.map((msg, idx) => {
          if (msg.sender === 'specialist') {
            return (
              <div key={msg.id} className={styles.aiTestSpecialistBlock}>
                {shouldShowSpecialistHeader(idx) && (
                  <div className={styles.aiTestSpecialistLabel}>
                    <div className={styles.aiTestSpecialistLabelAvatar} aria-hidden>
                      <PersonaAvatar personaId={personaId} size={16} />
                    </div>
                    <span>{specialistName}</span>
                  </div>
                )}
                <div className={styles.aiTestBubbleSpecialist}>{msg.text}</div>
              </div>
            );
          }
          return (
            <div key={msg.id} className={styles.aiTestUserBlock}>
              <div className={styles.aiTestUserLabel}>You</div>
              <div className={styles.aiTestBubbleUser}>{msg.text}</div>
            </div>
          );
        })}

        {isTyping && (
          <div className={styles.aiTestSpecialistBlock}>
            <div className={styles.aiTestBubbleSpecialist} aria-label={`${specialistName} is typing`}>
              <span className={styles.aiTestTypingDots} aria-hidden>
                <span /><span /><span />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.aiTestComposer}>
        <input
          type="text"
          className={styles.aiTestComposerInput}
          value={inputText}
          placeholder={`Message ${specialistName}…`}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          aria-label={`Message ${specialistName}`}
        />
        <button
          type="button"
          className={styles.aiTestComposerSend}
          onClick={sendMessage}
          disabled={!inputText.trim() || isTyping}
          aria-label="Send message"
        >
          <ArrowNarrowRightIcon size={14} />
        </button>
      </div>

      <button
        type="button"
        className={styles.aiTestResetBtn}
        onClick={resetChat}
      >
        <RefreshCw04Icon size={14} />
        <span>End Chat &amp; Reset</span>
      </button>
    </div>
  );
}

// ─── ActionSelector ─────────────────────────────────────────────────────────
// Searchable, browsable list of available actions, shown in the right panel
// when an Action node has no selected value yet.

interface ActionSelectorProps {
  onSelect: (label: string) => void;
  /** When true, drop the selector's internal section paddings — used when
   *  the picker is rendered inside a Dialog whose `DialogContent` already
   *  contributes the standard 16px padding around its children. */
  bare?: boolean;
}

function ActionSelector({ onSelect, bare = false }: ActionSelectorProps) {
  const [search, setSearch] = useState('');

  const actions = ALL_LIBRARY_ITEMS.filter(i => i.type === 'action');
  const q = search.trim().toLowerCase();
  const filtered = q
    ? actions.filter(a =>
        a.label.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (ACTION_CATEGORY_LABEL[a.category] ?? '').toLowerCase().includes(q) ||
        (ACTION_DESCRIPTION[a.id] ?? '').toLowerCase().includes(q)
      )
    : actions;

  // While searching, flatten results across all categories.
  // With no search, show the default category-grouped view.
  const showFlat = q !== '';

  const flatSorted = [...filtered].sort((a, b) => a.label.localeCompare(b.label));

  const grouped = ACTION_CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      label: ACTION_CATEGORY_LABEL[cat] ?? cat,
      items: filtered.filter(i => i.category === cat),
    }))
    .filter(group => group.items.length > 0);

  const renderRow = (item: LibraryItem) => {
    const baseIcon = ACTION_ITEM_ICON[item.id]
      ?? ACTION_CATEGORY_ICON[item.category]
      ?? STEP_CONFIG.action.icon;
    // Upsize the base 12px icon to 14px for the selector list without
    // duplicating every ACTION_*_ICON record.
    const icon = isValidElement(baseIcon)
      ? cloneElement(baseIcon as React.ReactElement<{ size?: number }>, { size: 14 })
      : baseIcon;
    const description = ACTION_DESCRIPTION[item.id]
      ?? ACTION_CATEGORY_LABEL[item.category]
      ?? item.category.replace(/_/g, ' ');
    return (
      <button
        key={item.id}
        type="button"
        className={styles.actionSelectorRow}
        onClick={() => onSelect(item.label)}
      >
        <span className={clsx(styles.actionSelectorRowIcon, styles.iconAction)} aria-hidden>
          {icon}
        </span>
        <span className={styles.actionSelectorRowText}>
          <span className={styles.actionSelectorRowLabel}>{item.label}</span>
          <span className={styles.actionSelectorRowDesc}>{description}</span>
        </span>
      </button>
    );
  };

  return (
    <div className={clsx(styles.actionSelectorRoot, bare && styles.actionSelectorRootBare)}>
      <div className={clsx(styles.actionSelectorSearch, bare && styles.actionSelectorSearchBare)}>
        <SearchField
          size="sm"
          placeholder="Search actions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          aria-label="Search actions"
        />
      </div>

      <div className={clsx(styles.actionSelectorList, bare && styles.actionSelectorListBare)}>
        {filtered.length === 0 ? (
          <p className={styles.actionSelectorEmpty}>No actions match "{search}"</p>
        ) : showFlat ? (
          flatSorted.map(renderRow)
        ) : (
          grouped.map(group => (
            <div key={group.category} className={styles.actionSelectorGroup}>
              <div className={styles.actionSelectorGroupHeader}>{group.label}</div>
              {group.items.map(renderRow)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── TriggerModifyTiming ─────────────────────────────────────────────────────
// Universal "Modify Timing" affordance shown on every trigger node's right-
// panel config. Lets the user offset the trigger fire moment by an N
// Min/Hour/Day window before or after the underlying event. State piggybacks
// on `step.configValues` via three keys:
//   - modify_timing_amount     ('1', '15', etc — string for input value)
//   - modify_timing_unit       ('Min' | 'Hour' | 'Day')
//   - modify_timing_direction  ('After' | 'Before')
// Active state is derived as "all three present" — partial state shouldn't
// happen during normal flow (the + button seeds defaults atomically and the
// X clears all three together) but the derivation tolerates either case.

const MODIFY_TIMING_KEYS = {
  amount:    'modify_timing_amount',
  unit:      'modify_timing_unit',
  direction: 'modify_timing_direction',
} as const;
const MODIFY_TIMING_UNITS = ['Min', 'Hour', 'Day'];
const MODIFY_TIMING_DIRECTIONS = ['After', 'Before'];

interface TriggerModifyTimingProps {
  vals: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
}

function TriggerModifyTiming({ vals, onUpdate }: TriggerModifyTimingProps) {
  const amount    = vals[MODIFY_TIMING_KEYS.amount]    ?? '';
  const unit      = vals[MODIFY_TIMING_KEYS.unit]      ?? '';
  const direction = vals[MODIFY_TIMING_KEYS.direction] ?? '';
  const isActive  = unit !== '' && direction !== '';

  if (!isActive) {
    return (
      <Button
        variant="ghost"
        size="sm"
        leadingArtwork={<AlloyPlusIcon size={14} />}
        onClick={() => {
          // Seed sensible defaults so the row is immediately usable
          // without forcing the user to pick every value before it
          // makes sense ("1 Min After" is a natural floor).
          onUpdate(MODIFY_TIMING_KEYS.amount,    '1');
          onUpdate(MODIFY_TIMING_KEYS.unit,      'Min');
          onUpdate(MODIFY_TIMING_KEYS.direction, 'After');
        }}
        className={styles.modifyTimingAddBtn}
      >
        Modify Timing
      </Button>
    );
  }

  const clear = () => {
    onUpdate(MODIFY_TIMING_KEYS.amount,    '');
    onUpdate(MODIFY_TIMING_KEYS.unit,      '');
    onUpdate(MODIFY_TIMING_KEYS.direction, '');
  };

  return (
    // Wrap in a popoverFieldRow so the "Modify Timing" label aligns
    // with every other Configuration field's label above its control,
    // and the row stretches edge-to-edge inside the section.
    <div className={styles.popoverFieldRow}>
      <label className={styles.popoverFieldLabel}>Modify Timing</label>
      <div className={styles.modifyTimingRow}>
        <NumberField
          size="md"
          min={0}
          value={amount}
          onChange={e => onUpdate(MODIFY_TIMING_KEYS.amount, e.target.value)}
          aria-label="Timing amount"
          className={styles.modifyTimingNum}
        />
        <SelectField
          size="md"
          value={unit}
          onChange={v => onUpdate(MODIFY_TIMING_KEYS.unit, v)}
          options={MODIFY_TIMING_UNITS.map(u => ({ value: u, label: u }))}
          aria-label="Timing unit"
          className={styles.modifyTimingSelect}
        />
        <SelectField
          size="md"
          value={direction}
          onChange={v => onUpdate(MODIFY_TIMING_KEYS.direction, v)}
          options={MODIFY_TIMING_DIRECTIONS.map(d => ({ value: d, label: d }))}
          aria-label="Timing direction"
          className={styles.modifyTimingSelect}
        />
        <Button
          variant="ghost"
          size="md"
          iconOnly
          onClick={clear}
          aria-label="Remove timing modifier"
          className={styles.modifyTimingClearBtn}
        >
          <XIcon size={14} />
        </Button>
      </div>
    </div>
  );
}

// ─── NodePopover ─────────────────────────────────────────────────────────────────

interface NodePopoverProps {
  step: FlowStep;
  onSelectSuggestion: (value: string) => void;
  onUpdateConditionConfig: (op: string, vals: string[]) => void;
  onUpdateConfigField: (key: string, value: string) => void;
  onClose: () => void;
  /** Fired when the user clicks the footer "Save" button — commits the
   *  current step configuration as a single activity entry in the thread. */
  onSave?: () => void;
  /** Update the full conditions list + logic operator for a condition node. */
  onUpdateConditions?: (conditions: ConditionEntry[], logic: 'AND' | 'OR') => void;
  /** Group-based condition updater — replaces the node's `conditionGroups`. */
  onUpdateConditionGroups?: (groups: ConditionGroup[]) => void;
  /** Branch-based condition updater — replaces the node's `conditionBranches`. */
  onUpdateConditionBranches?: (branches: ConditionBranch[]) => void;
  /** Branch-based policy updater — replaces the node's `policyBranches`. */
  onUpdatePolicyBranches?: (branches: PolicyBranch[]) => void;
  /** Forwarded to the bottom AI input; submits a prompt into the shared thread. */
  onNodeAiSubmit?: (message: string, nodeType: StepType) => void;
  /** The selected label of the workflow's trigger step, used by the AI Specialist Test tab. */
  triggerLabel?: string;
  /** Dropdown menu groups for the header "···" actions (duplicate, delete, etc.). */
  dotsMenuGroups?: DropdownMenuGroup[];
}

// ─── ConditionGroupsEditor ───────────────────────────────────────────────────
// Group-based condition editor. Renders each group as a labeled "AND" frame
// with its own condition rows + per-group "+ Add condition" button. Between
// groups shows an "OR" divider badge. A global "+ Add condition" at the
// bottom prompts the user to pick AND (same last group) or OR (new group)
// when at least one condition exists.

interface ConditionRowProps {
  entry: ConditionEntry;
  showRemove: boolean;
  onRemove: () => void;
  onPatch: (patch: Partial<ConditionEntry>) => void;
  index: number;
}

function ConditionRow({ entry, showRemove, onRemove, onPatch, index }: ConditionRowProps) {
  const def = entry.fieldId
    ? CONDITION_LIBRARY.find(d => d.id === entry.fieldId) ?? null
    : null;
  const ops = def?.operators ?? [];
  const op  = entry.operator || ops[0] || '';
  const vals = entry.values;
  const isNoVal  = ['is_empty', 'is_not_empty', 'missing_required'].includes(op);
  const isIn     = op === 'in' || op === 'not_in' || op === 'contains_one_of';
  const isWithin = op === 'within_next';
  return (
    <div className={styles.conditionRow}>
      <div className={styles.conditionRowHead}>
        <span className={styles.conditionRowIndex}>{index + 1}</span>
        {showRemove && (
          <button
            type="button"
            className={styles.conditionRowRemoveBtn}
            onClick={onRemove}
            aria-label="Remove condition"
          >
            <XIcon size={12} />
          </button>
        )}
      </div>
      <PopoverSelect
        value={entry.fieldId}
        onChange={newId => {
          const newDef = CONDITION_LIBRARY.find(d => d.id === newId);
          onPatch({ fieldId: newId, operator: newDef?.operators[0] ?? '', values: [] });
        }}
        placeholder="Select field…"
        searchable
        searchPlaceholder="Search fields…"
        options={[
          { value: '', label: 'Select field…' },
          ...CONDITION_LIBRARY.map(d => ({ value: d.id, label: d.label })),
        ]}
      />
      {def && (
        <div className={clsx(
          styles.conditionRowOpValue,
          // Multi-value verbs (`is one of`, `is not one of`, `contains
          // one of`) get a stacked layout: verb on top, value field on
          // the row beneath. The Alloy MultiSelectField below grows
          // vertically as chips wrap past the first row, so the value
          // slot needs the full panel width to read comfortably.
          isIn && styles.conditionRowOpValueStacked,
        )}>
          <PopoverSelect
            value={op}
            onChange={newOp => onPatch({ operator: newOp, values: [] })}
            options={ops.map(o => ({ value: o, label: OPERATOR_LABELS[o] ?? o }))}
            className={styles.conditionRowOpSelect}
          />
          {!isNoVal && isIn && def.valueOptions && (
            // All multi-value verbs (in / not_in / contains_one_of)
            // render with Alloy's MultiSelectField so users see one
            // consistent chips-inside-the-shell pattern. The shell
            // grows vertically as chips wrap, so a long selection
            // never overflows the panel.
            <div className={styles.conditionRowValue}>
              <MultiSelectField
                size="md"
                value={vals}
                onChange={next => onPatch({ values: next })}
                options={def.valueOptions.map(o => ({ value: o, label: o }))}
                placeholder="Select values…"
                aria-label="Condition value"
              />
            </div>
          )}
          {!isNoVal && isIn && !def.valueOptions && (
            // Free-text fallback for multi-value verbs when the field
            // doesn't carry a predefined option set. Behaves like the
            // type-and-Enter chip input the legacy condition rows used.
            <div className={styles.conditionRowValue}>
              <ConditionTagInput values={vals} onChange={next => onPatch({ values: next })} />
            </div>
          )}
          {!isNoVal && isWithin && (
            <div className={clsx(styles.conditionWithinNext, styles.conditionRowValue)}>
              <NumberField
                size="md" min={1} placeholder="30"
                value={vals[0] ?? ''}
                onChange={e => onPatch({ values: [e.target.value, vals[1] ?? 'days'] })}
                aria-label="Time amount"
                className={styles.conditionWithinNextNum}
              />
              <PopoverSelect
                value={vals[1] ?? 'days'}
                onChange={unit => onPatch({ values: [vals[0] ?? '', unit] })}
                className={styles.conditionWithinNextUnit}
                options={[
                  { value: 'hours', label: 'hours' },
                  { value: 'days',  label: 'days'  },
                  { value: 'weeks', label: 'weeks' },
                ]}
              />
            </div>
          )}
          {!isNoVal && !isIn && !isWithin && def.valueOptions && (
            <PopoverSelect
              value={vals[0] ?? ''}
              onChange={v => onPatch({ values: [v] })}
              placeholder="Select value…"
              options={[
                { value: '', label: 'Select value…' },
                ...def.valueOptions.map(opt => ({ value: opt, label: opt })),
              ]}
              className={styles.conditionRowValue}
            />
          )}
          {!isNoVal && !isIn && !isWithin && !def.valueOptions && (
            <TextField
              size="md" placeholder="Enter value…"
              value={vals[0] ?? ''}
              onChange={e => onPatch({ values: [e.target.value] })}
              aria-label="Condition value"
              className={styles.conditionRowValue}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface ConditionGroupsEditorProps {
  step: FlowStep;
  onUpdateConditionBranches?: (branches: ConditionBranch[]) => void;
}

function ConditionGroupsEditor({ step, onUpdateConditionBranches }: ConditionGroupsEditorProps) {
  const branches = useMemo(() => deriveConditionBranches(step), [step]);
  const total = countConditionsInBranches(branches);

  // Per-group collapsed state — keyed by group.id. Set membership = collapsed.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleCollapsed = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Per-branch collapsed state — keyed by branch.id. When collapsed, the
  // entire AND/OR body of an IF / ELSE IF branch is hidden, leaving just
  // the keyword + chevron + remove (for ELSE IF) row visible.
  const [collapsedBranches, setCollapsedBranches] = useState<Set<string>>(new Set());
  const toggleBranchCollapsed = (id: string) => {
    setCollapsedBranches(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const commit = (next: ConditionBranch[]) => onUpdateConditionBranches?.(next);

  /** Patch one branch by index, leaving the rest intact. */
  const patchBranch = (bIdx: number, mutate: (b: ConditionBranch) => ConditionBranch) =>
    commit(branches.map((b, i) => i === bIdx ? mutate(b) : b));

  const patchCondition = (bIdx: number, gIdx: number, cIdx: number, patch: Partial<ConditionEntry>) => {
    patchBranch(bIdx, b => ({
      ...b,
      groups: b.groups.map((g, gi) => gi === gIdx
        ? { ...g, conditions: g.conditions.map((c, ci) => ci === cIdx ? { ...c, ...patch } : c) }
        : g),
    }));
  };

  const removeCondition = (bIdx: number, gIdx: number, cIdx: number) => {
    const next = branches
      .map((b, bi) => bi === bIdx
        ? {
            ...b,
            groups: b.groups
              .map((g, gi) => gi === gIdx
                ? { ...g, conditions: g.conditions.filter((_, ci) => ci !== cIdx) }
                : g)
              // Drop any group left with zero conditions.
              .filter(g => g.conditions.length > 0),
          }
        : b)
      // Drop any branch left with zero groups.
      .filter(b => b.groups.length > 0);
    commit(next);
  };

  /** Append an empty AND condition to a specific group inside a branch. */
  const addAndToGroup = (bIdx: number, gIdx: number) => {
    if (total >= MAX_CONDITIONS) return;
    patchBranch(bIdx, b => ({
      ...b,
      groups: b.groups.map((g, gi) => gi === gIdx
        ? { ...g, conditions: [...g.conditions, makeEmptyCondition()] }
        : g),
    }));
  };

  /** Append a new OR group (single-condition) to a branch. */
  const addOrGroupToBranch = (bIdx: number) => {
    if (total >= MAX_CONDITIONS) return;
    patchBranch(bIdx, b => ({
      ...b,
      groups: [...b.groups, { id: makeGroupId(), conditions: [makeEmptyCondition()] }],
    }));
  };

  /** Append a new ELSE IF branch (always opens with one empty condition). */
  const addElseIfBranch = () => {
    if (total >= MAX_CONDITIONS) return;
    commit([
      ...branches,
      { id: makeBranchId(), groups: [{ id: makeGroupId(), conditions: [makeEmptyCondition()] }] },
    ]);
  };

  /** Drop a branch entirely. Every IF branch is removable. */
  const removeBranch = (bIdx: number) => {
    commit(branches.filter((_, i) => i !== bIdx));
  };

  /** Seed the very first IF branch when the node has no conditions yet. */
  const addFirstBranch = () => {
    if (total >= MAX_CONDITIONS) return;
    commit([
      { id: makeBranchId(), groups: [{ id: makeGroupId(), conditions: [makeEmptyCondition()] }] },
    ]);
  };

  return (
    <>
      <div className={styles.popoverDivider} />
      <div className={styles.popoverSection}>
        <p className={styles.popoverSectionLabel}>Conditions</p>
        {branches.length === 0 && (
          <p className={styles.popoverConfigPlaceholder}>
            No conditions yet. Add one to check a field.
          </p>
        )}

        {branches.map((branch, bIdx) => {
          const branchLabel = 'IF';
          return (
          <Fragment key={branch.id}>
            {/* IF branch label — outer layer above the AND/OR grouping
                that lives inside this branch. Click the keyword row to
                collapse the branch body; every IF branch is removable
                via the X button on the right edge. */}
            <div className={styles.conditionBranchLabel}>
              <button
                type="button"
                className={styles.conditionBranchToggleBtn}
                onClick={() => toggleBranchCollapsed(branch.id)}
                aria-expanded={!collapsedBranches.has(branch.id)}
                aria-label={collapsedBranches.has(branch.id) ? `Expand ${branchLabel} branch` : `Collapse ${branchLabel} branch`}
              >
                <span className={clsx(styles.conditionBranchChevron, !collapsedBranches.has(branch.id) && styles.conditionBranchChevronOpen)} aria-hidden>
                  <ChevronDownIcon size={12} />
                </span>
                <span className={styles.conditionBranchKeyword}>{branchLabel}</span>
              </button>
              <button
                type="button"
                className={styles.conditionBranchRemoveBtn}
                onClick={() => removeBranch(bIdx)}
                aria-label={`Remove ${branchLabel} branch`}
              >
                <XIcon size={12} />
              </button>
            </div>
            {!collapsedBranches.has(branch.id) && (
            <div className={styles.conditionBranchBody}>
              {branch.groups.map((group, gIdx) => {
                const isCollapsed = collapsedGroups.has(group.id);
                const conditionCount = group.conditions.length;
                return (
                <Fragment key={group.id}>
                  <div className={styles.conditionGroup} data-collapsed={isCollapsed ? 'true' : 'false'}>
                    <button
                      type="button"
                      className={styles.conditionGroupHeader}
                      onClick={() => toggleCollapsed(group.id)}
                      aria-expanded={!isCollapsed}
                      aria-label={isCollapsed ? 'Expand group' : 'Collapse group'}
                    >
                      <span className={clsx(styles.conditionGroupChevron, !isCollapsed && styles.conditionGroupChevronOpen)} aria-hidden>
                        <ChevronDownIcon size={12} />
                      </span>
                      <span className={styles.conditionGroupBadge}>AND</span>
                      <span className={styles.conditionGroupCount}>
                        {conditionCount} {conditionCount === 1 ? 'condition' : 'conditions'}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <>
                        <div className={styles.conditionGroupRows}>
                          {group.conditions.map((c, cIdx) => (
                            <ConditionRow
                              key={cIdx}
                              entry={c}
                              index={cIdx}
                              showRemove={total > 1}
                              onRemove={() => removeCondition(bIdx, gIdx, cIdx)}
                              onPatch={(patch) => patchCondition(bIdx, gIdx, cIdx, patch)}
                            />
                          ))}
                        </div>
                        {/* Per-group AND add — appends another condition to
                            the same group, AND-ed with the existing rows. */}
                        <button
                          type="button"
                          className={styles.addConditionBtn}
                          onClick={() => addAndToGroup(bIdx, gIdx)}
                        >
                          <PlusIcon size={10} />
                          Add condition
                        </button>
                      </>
                    )}
                  </div>
                  {gIdx < branch.groups.length - 1 && (
                    <div className={styles.conditionOrDivider} aria-hidden>
                      <span className={styles.conditionOrBadge}>OR</span>
                    </div>
                  )}
                </Fragment>
                );
              })}
              {/* Per-branch OR add — appends a new AND-group inside this
                  branch (OR-ed with the existing groups). */}
              {total < MAX_CONDITIONS && (
                <button
                  type="button"
                  className={styles.addConditionBtn}
                  onClick={() => addOrGroupToBranch(bIdx)}
                >
                  <PlusIcon size={10} />
                  Add OR group
                </button>
              )}
            </div>
            )}
          </Fragment>
          );
        })}

        {/* "+ Add IF" — placed between the last branch and the ELSE row
            so the affordance reads as "insert another IF clause before
            the catch-all". */}
        {branches.length > 0 && total < MAX_CONDITIONS && (
          <button
            type="button"
            className={clsx(styles.addConditionBtn, styles.addElseIfBtn)}
            onClick={addElseIfBranch}
          >
            <PlusIcon size={10} />
            Add IF
          </button>
        )}

        {/* ELSE branch — catch-all label after the last IF/ELSE IF. */}
        {branches.length > 0 && (
          <div className={styles.conditionBranchLabel} aria-hidden>
            <span className={styles.conditionBranchKeyword}>ELSE</span>
            <span className={styles.conditionBranchHint}>matches everything else</span>
          </div>
        )}

        {/* Empty-state: seed the first IF branch. */}
        {branches.length === 0 && total < MAX_CONDITIONS && (
          <button
            type="button"
            className={styles.addConditionBtn}
            onClick={addFirstBranch}
          >
            <PlusIcon size={10} />
            Add condition
          </button>
        )}
      </div>
    </>
  );
}

/* ─── PolicyBranchesEditor ────────────────────────────────────────────────────
   Mirror of `ConditionGroupsEditor` for policy nodes — each IF branch holds
   its own policy selection + matching threshold, and the editor surfaces
   add / remove affordances + a catch-all ELSE label, identical to the
   condition right-panel chrome. */

interface PolicyBranchesEditorProps {
  step: GraphNode;
  onUpdatePolicyBranches?: (branches: PolicyBranch[]) => void;
  policyModalOpen: boolean;
  setPolicyModalOpen: (v: boolean) => void;
}

function PolicyBranchesEditor({
  step,
  onUpdatePolicyBranches,
  policyModalOpen,
  setPolicyModalOpen,
}: PolicyBranchesEditorProps) {
  const branches = useMemo(() => {
    const derived = derivePolicyBranches(step);
    return derived.length > 0 ? derived : [makeEmptyPolicyBranch()];
  }, [step]);

  const [editingBranchIdx, setEditingBranchIdx] = useState<number | null>(null);

  // Per-branch collapsed state — keyed by branch.id, mirroring
  // ConditionGroupsEditor's `collapsedBranches` so each IF clause can be
  // collapsed via the chevron toggle in the keyword row.
  const [collapsedBranches, setCollapsedBranches] = useState<Set<string>>(new Set());
  const toggleBranchCollapsed = (id: string) => {
    setCollapsedBranches(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const commit = (next: PolicyBranch[]) => onUpdatePolicyBranches?.(next);

  const patchBranch = (bIdx: number, patch: Partial<PolicyBranch>) =>
    commit(branches.map((b, i) => i === bIdx ? { ...b, ...patch } : b));

  const removeBranch = (bIdx: number) => {
    if (branches.length <= 1) {
      commit([makeEmptyPolicyBranch()]);
      return;
    }
    commit(branches.filter((_, i) => i !== bIdx));
  };

  const addBranch = () => {
    commit([...branches, makeEmptyPolicyBranch()]);
  };

  const openConfigure = (bIdx: number) => {
    setEditingBranchIdx(bIdx);
    setPolicyModalOpen(true);
  };

  const editingBranch = editingBranchIdx !== null ? branches[editingBranchIdx] : null;

  return (
    <>
      <div className={styles.popoverDivider} />
      <div className={styles.popoverSection}>
        <p className={styles.popoverSectionLabel}>Policies</p>
        {branches.map((branch, bIdx) => {
          const sel: PolicySelectionSnapshot = {
            folders: branch.folders,
            policies: branch.policies,
            subPolicies: branch.subPolicies,
          };
          const anySelected = sel.folders.length + sel.policies.length + sel.subPolicies.length > 0;
          const summaryText = anySelected
            ? `All selected — ${formatPolicySummary(sel)}`
            : 'All policies selected';
          const thr: PolicyThresholdSnapshot = {
            value: parseInt(branch.thresholdValue, 10) || 0,
            mode: branch.thresholdMode,
          };
          const isCollapsed = collapsedBranches.has(branch.id);
          return (
            <Fragment key={branch.id}>
              {/* IF branch header — chevron toggle + IF keyword + remove
                  X. Mirrors `ConditionGroupsEditor`'s branch label so the
                  policy panel reads with the same chrome. */}
              <div className={styles.conditionBranchLabel}>
                <button
                  type="button"
                  className={styles.conditionBranchToggleBtn}
                  onClick={() => toggleBranchCollapsed(branch.id)}
                  aria-expanded={!isCollapsed}
                  aria-label={isCollapsed ? 'Expand IF branch' : 'Collapse IF branch'}
                >
                  <span className={clsx(styles.conditionBranchChevron, !isCollapsed && styles.conditionBranchChevronOpen)} aria-hidden>
                    <ChevronDownIcon size={12} />
                  </span>
                  <span className={styles.conditionBranchKeyword}>IF</span>
                </button>
                <button
                  type="button"
                  className={styles.conditionBranchRemoveBtn}
                  onClick={() => removeBranch(bIdx)}
                  aria-label="Remove IF branch"
                >
                  <XIcon size={12} />
                </button>
              </div>
              {!isCollapsed && (
                <div className={styles.conditionBranchBody}>
                  <p className={styles.popoverSectionLabel}>SELECTED POLICIES</p>
                  <div className={styles.policySummaryRow}>
                    <span
                      className={clsx(
                        styles.policySummaryText,
                        !anySelected && styles.policySummaryTextEmpty,
                      )}
                    >
                      {summaryText}
                    </span>
                    <Button variant="secondary" size="sm" onClick={() => openConfigure(bIdx)}>
                      Configure
                    </Button>
                  </div>
                  <p className={clsx(styles.popoverSectionLabel, styles.popoverSectionLabelInline)}>MATCHING THRESHOLD</p>
                  <div className={styles.policyThresholdRow}>
                    <label className={styles.policyThresholdLabel} htmlFor={`policy-threshold-${step.id}-${branch.id}`}>
                      Run when above threshold
                    </label>
                    <div className={styles.policyThresholdInputWrap}>
                      <NumberField
                        id={`policy-threshold-${step.id}-${branch.id}`}
                        size="md"
                        min={0}
                        placeholder="0"
                        value={String(thr.value)}
                        onChange={e => {
                          const cleaned = e.target.value.replace(/[^0-9]/g, '');
                          patchBranch(bIdx, { thresholdValue: cleaned });
                        }}
                        aria-label="Matching threshold"
                        className={styles.policyThresholdInput}
                      />
                      <span className={styles.policyThresholdUnit} aria-hidden>
                        {thr.mode === 'percentage' ? '%' : '/100'}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const nextMode: PolicyThresholdMode =
                          thr.mode === 'percentage' ? 'score' : 'percentage';
                        patchBranch(bIdx, { thresholdMode: nextMode });
                      }}
                    >
                      {thr.mode === 'percentage' ? 'Use score' : 'Use %'}
                    </Button>
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}

        {/* "+ Add IF" — placed between the last branch and the ELSE row. */}
        <button
          type="button"
          className={clsx(styles.addConditionBtn, styles.addElseIfBtn)}
          onClick={addBranch}
        >
          <PlusIcon size={10} />
          Add IF
        </button>

        {/* ELSE catch-all label — matches the condition right panel. */}
        <div className={styles.conditionBranchLabel} aria-hidden>
          <span className={styles.conditionBranchKeyword}>ELSE</span>
          <span className={styles.conditionBranchHint}>matches everything else</span>
        </div>
      </div>

      <PolicyMatchingModal
        open={policyModalOpen}
        initialSelection={editingBranch ? {
          folders: editingBranch.folders,
          policies: editingBranch.policies,
          subPolicies: editingBranch.subPolicies,
        } : { folders: [], policies: [], subPolicies: [] }}
        onCancel={() => { setPolicyModalOpen(false); setEditingBranchIdx(null); }}
        onSave={next => {
          if (editingBranchIdx !== null) {
            patchBranch(editingBranchIdx, {
              folders: next.folders,
              policies: next.policies,
              subPolicies: next.subPolicies,
            });
          }
          setPolicyModalOpen(false);
          setEditingBranchIdx(null);
        }}
      />
    </>
  );
}

function NodePopover({ step, onSelectSuggestion, onUpdateConditionConfig, onUpdateConfigField, onClose, onSave, onUpdateConditions, onUpdateConditionGroups, onUpdateConditionBranches, onUpdatePolicyBranches, onNodeAiSubmit, triggerLabel, dotsMenuGroups }: NodePopoverProps) {
  const cfg = STEP_CONFIG[step.type];
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // Policy modal state (policy nodes only)
  const [policyModalOpen, setPolicyModalOpen] = useState(false);

  // Action picker dialog state — opens for both the empty-state "Choose"
  // CTA and the configured-state "Change" button. Mirrors the AI
  // specialist picker dialog pattern so the right panel stays mounted
  // while the user browses / cancels the selection.
  const [actionPickerOpen, setActionPickerOpen] = useState(false);

  // AI Specialist tab state (Configure / Test) — only relevant for AI Specialist nodes.
  const [aiSpecTab, setAiSpecTab] = useState<'configure' | 'test'>('configure');
  const isAiSpecialist = step.type === 'ai' && step.selectedValue === 'AI Specialist';

  // Right-panel info card — overlay triggered by the header ⓘ icon.
  // Two state values so the card can animate on both open AND close:
  //   · `infoOpen`     — the user-driven flag the toggle reads/writes.
  //   · `infoMounted`  — the actual mount flag for the DOM. Lags
  //                       `infoOpen` on close to give the exit animation
  //                       time to play before the card unmounts.
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoMounted, setInfoMounted] = useState(false);
  const [infoCopied, setInfoCopied] = useState(false);
  const infoTriggerRef = useRef<HTMLButtonElement>(null);
  const infoCardRef = useRef<HTMLDivElement>(null);

  // Sync the mount flag with the open flag. Open mounts immediately so
  // the entry animation can run from frame 1; close waits for the
  // CSS exit duration (matches `popoverInfoCardClose` keyframes
  // duration in BuilderPage.module.css) before unmounting.
  useEffect(() => {
    if (infoOpen) {
      setInfoMounted(true);
      return;
    }
    if (!infoMounted) return;
    const t = setTimeout(() => setInfoMounted(false), 180);
    return () => clearTimeout(t);
  }, [infoOpen, infoMounted]);

  // Outside-click: close the info card when the user clicks anywhere that
  // isn't the trigger or the card itself.
  useEffect(() => {
    if (!infoOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (infoTriggerRef.current?.contains(t)) return;
      if (infoCardRef.current?.contains(t)) return;
      setInfoOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [infoOpen]);
  // A specialist is "configured" when the AI Specialist library item is selected.
  const specialistConfigured = isAiSpecialist;
  // Specialist identity — derived from the persona picked on the Configure
  // tab via `ai_persona_id`. Explicit `ai_specialist_name` / `_role` overrides
  // win when set, so future per-node renaming still flows through here.
  // Falls back to the first preset persona for AI nodes that pre-date the
  // picker (no persona id stored yet).
  const selectedPersona =
    getPersonaById(step.configValues?.ai_persona_id) ?? AI_PERSONAS[0];
  const specialistName =
    step.configValues?.ai_specialist_name ?? selectedPersona.name;
  const specialistRole =
    step.configValues?.ai_specialist_role ?? selectedPersona.role;

  const handleAiSend = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const libItems = ALL_LIBRARY_ITEMS.filter(i => i.type === step.type);
      const configItem = ALL_LIBRARY_ITEMS.find(i => i.label === step.selectedValue);
      const rawFields: NodeConfigField[] = configItem ? (NODE_CONFIG[configItem.id] ?? []) : [];
      const configFields = rawFields.map(f => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        options: f.options ?? (f.optionsByDependency ? Object.values(f.optionsByDependency).flat() : undefined),
      }));
      const systemPrompt = buildStepSystemPrompt({
        step: {
          id: step.id, type: step.type, selectedValue: step.selectedValue,
          conditions: step.conditions, conditionLogic: step.conditionLogic,
          configValues: step.configValues, configured: step.configured,
        },
        libraryItemsForType: libItems.map(i => ({ id: i.id, label: i.label, type: i.type, category: i.category })),
        configFields,
      });
      const result = await callFlowAgent({ systemPrompt, userMessage: aiPrompt, tools: STEP_TOOLS });
      for (const call of result.toolCalls) {
        const inp = call.toolInput;
        if (call.toolName === 'select_step_value') {
          onSelectSuggestion(inp.value as string);
        } else if (call.toolName === 'set_condition_config') {
          onUpdateConditionConfig(inp.operator as string, inp.values as string[]);
        } else if (call.toolName === 'set_step_config_field') {
          onUpdateConfigField(inp.field_key as string, inp.value as string);
        }
      }
      const text = result.textBlocks.join(' ').trim();
      setAiResult(text || 'Done.');
      setAiPrompt('');
    } catch (err) {
      setAiResult(`Error: ${err instanceof Error ? err.message : 'Something went wrong'}`);
    } finally {
      setAiLoading(false);
    }
  };

  const isEmpty = !step.selectedValue;

  return (
    <div
      className={styles.nodePopover}
      data-popover="true"
      role="dialog"
      aria-label={POPOVER_TITLES[step.type]}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ── 1. Header — type badge + label + info toggle + close ── */}
      <div className={styles.popoverHeader}>
        <div className={styles.popoverHeaderLeft}>
          <span className={clsx(styles.popoverTypeBadge, cfg.bgClass)} aria-hidden>
            {SEARCH_RESULT_BASE_ICON[step.type]}
          </span>
          <span className={styles.popoverTitle}>{POPOVER_TITLES[step.type]}</span>
        </div>
        <div className={styles.popoverHeaderActions}>
          {!(isAiSpecialist && aiSpecTab === 'test') && (
            <Button
              variant="primary"
              size="xs"
              onClick={() => { onSave?.(); onClose(); }}
            >
              Save
            </Button>
          )}
          <Button
            ref={infoTriggerRef}
            variant="ghost"
            size="xs"
            iconOnly
            className={styles.popoverInfoBtn}
            onClick={() => setInfoOpen(v => !v)}
            aria-label="Node info"
            aria-expanded={infoOpen}
            aria-controls="node-info-card"
            data-active={infoOpen ? 'true' : undefined}
          >
            <InfoCircleIcon size={16} />
          </Button>
          {dotsMenuGroups && dotsMenuGroups.length > 0 && (
            <DropdownMenu
              trigger={
                <Button
                  variant="ghost"
                  size="xs"
                  iconOnly
                  aria-label="Node actions"
                >
                  <DotsHorizontalIcon />
                </Button>
              }
              groups={dotsMenuGroups}
              placement="bottom-end"
              width="max-content"
            />
          )}
          <Button
            variant="ghost"
            size="xs"
            iconOnly
            onClick={onClose}
            aria-label="Close popover"
          >
            <XIcon />
          </Button>
        </div>
      </div>

      {/* Info overlay card — opens below the header when the info icon
          is clicked. Stays mounted briefly after `infoOpen` flips false
          so the close animation has time to play; `data-open` reflects
          the live `infoOpen` state and the CSS animations key off it. */}
      {infoMounted && (
        <div className={styles.popoverInfoCardWrap} data-open={infoOpen || undefined}>
          <div
            id="node-info-card"
            ref={infoCardRef}
            className={styles.popoverInfoCard}
            data-open={infoOpen || undefined}
            role="dialog"
            aria-label="Node info"
          >
            {/* Title + close-info button row removed — closing the Info
                card is now handled by the existing ⓘ toggle in the
                popover header (which already drives `infoOpen`), so
                the redundant in-card header was just noise. */}
            <div className={styles.popoverInfoRows}>
              <div className={styles.popoverInfoRow}>
                <span className={styles.popoverInfoLabel}>Node ID</span>
                <span className={styles.popoverInfoValueGroup}>
                  {infoCopied && (
                    <span
                      className={styles.popoverInfoCopiedFlag}
                      role="status"
                      aria-live="polite"
                    >
                      Copied
                    </span>
                  )}
                  {step.nodeId && (
                    <button
                      type="button"
                      className={styles.popoverInfoCopyBtn}
                      aria-label="Copy node ID"
                      data-copied={infoCopied ? 'true' : undefined}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(step.nodeId!);
                          setInfoCopied(true);
                          window.setTimeout(() => setInfoCopied(false), 1200);
                        } catch { /* clipboard unavailable — ignore */ }
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <rect x="9" y="9" width="11" height="11" rx="2"
                          stroke="currentColor" strokeWidth="1.75" />
                        <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"
                          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  <code className={styles.popoverInfoValueMono}>
                    {step.nodeId ?? '—'}
                  </code>
                </span>
              </div>
              <div className={styles.popoverInfoDivider} aria-hidden />
              <div className={styles.popoverInfoRow}>
                <span className={styles.popoverInfoLabel}>Created</span>
                <span className={styles.popoverInfoValue}>
                  {formatInfoTimestamp(step.createdAt)}
                </span>
              </div>
              <div className={styles.popoverInfoDivider} aria-hidden />
              <div className={styles.popoverInfoRow}>
                <span className={styles.popoverInfoLabel}>Last updated</span>
                <span className={styles.popoverInfoValue}>
                  {formatInfoTimestamp(step.updatedAt)}
                </span>
              </div>
              <div className={styles.popoverInfoDivider} aria-hidden />
              <div className={styles.popoverInfoRow}>
                <span className={styles.popoverInfoLabel}>Updated by</span>
                <span className={styles.popoverInfoValue}>
                  {step.updatedBy ?? 'System'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── scrollable body ── */}
      <div className={styles.popoverBody}>

      {/* Node configuration sections render flat below — name-select, action
          selector, policy sections, condition rows, configuration fields, and
          AI specialist UI. No Settings accordion wrapper. */}

      {/* ── 2a. Name + Suggested ── (skipped for action — handled by ActionSelector / action header below;
            also skipped for condition — condition body has per-row field dropdowns) */}
      {step.type !== 'ai' && step.type !== 'delay' && step.type !== 'policy' && step.type !== 'action' && step.type !== 'condition' && (
        <div className={styles.popoverSection}>
          <NodeNameSelect step={step} onSelect={onSelectSuggestion} />
          {isEmpty && (
            <div className={styles.popoverTags}>
              {POPOVER_SUGGESTIONS[step.type].map(s => (
                <button
                  key={s}
                  type="button"
                  className={styles.popoverSuggestBtn}
                  onClick={() => onSelectSuggestion(s)}
                >
                  <Tag variant="subtle" size="sm" color={NODE_TYPE_TAG_COLOR[step.type]}>
                    {s}
                  </Tag>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI SPECIALIST NODE — the inline empty-state picker has been
          replaced by the always-mounted Specialist Persona section
          (see AiSpecialistMeta below). `Choose` opens the picker in a
          modal dialog instead of swapping the popover body, so the
          Specialist Persona section persists across both empty and
          configured states. */}

      {/* ══════════════════════════════════════════════════════════════════
          ACTION NODE — Empty state shows the inline picker (search +
          grouped list) covering the popover body, matching the original
          first-add UX. Once an action is configured, the persona-style
          header reappears with a "Change" button that opens a modal
          dialog so the user can swap actions without losing the rest of
          the right-panel content.
          ══════════════════════════════════════════════════════════════════ */}
      {step.type === 'action' && isEmpty && (
        <ActionSelector onSelect={onSelectSuggestion} />
      )}
      {step.type === 'action' && !isEmpty && (() => {
        const libItem = ALL_LIBRARY_ITEMS.find(
          i => i.label === step.selectedValue && i.type === 'action',
        );
        const icon = libItem
          ? (ACTION_ITEM_ICON[libItem.id]
              ?? ACTION_CATEGORY_ICON[libItem.category]
              ?? STEP_CONFIG.action.icon)
          : STEP_CONFIG.action.icon;
        return (
          <div className={styles.popoverSection}>
            <div className={styles.aiSpecRows}>
              <div className={styles.aiSpecRow}>
                <Eyebrow>Action</Eyebrow>
                <div className={styles.aiSpecPersonaCard}>
                  <div className={clsx(styles.aiSpecPersonaAvatar, styles.iconAction)} aria-hidden>
                    {icon}
                  </div>
                  <div className={styles.aiSpecPersonaInfo}>
                    <div className={styles.aiSpecPersonaName}>{step.selectedValue}</div>
                    {libItem?.category && (
                      <div className={styles.aiSpecPersonaRole}>{libItem.category}</div>
                    )}
                  </div>
                  {/* Change opens the picker in a dialog so the user can
                      cancel without losing the currently-configured
                      action — see ActionSelectorDialog. */}
                  <Button variant="ghost" size="xs" onClick={() => setActionPickerOpen(true)}>
                    Change
                  </Button>
                </div>
              </div>
            </div>

            <ActionSelectorDialog
              open={actionPickerOpen}
              onClose={() => setActionPickerOpen(false)}
              onSelect={label => {
                onSelectSuggestion(label);
                setActionPickerOpen(false);
              }}
            />
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════
          POLICY NODE — Selected policies + Matching threshold
          ══════════════════════════════════════════════════════════════════ */}
      {step.type === 'policy' && (
        <PolicyBranchesEditor
          step={step}
          onUpdatePolicyBranches={onUpdatePolicyBranches}
          policyModalOpen={policyModalOpen}
          setPolicyModalOpen={setPolicyModalOpen}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          DELAY NODE — Duration configuration (amount + unit + custom unit)
          ══════════════════════════════════════════════════════════════════ */}
      {step.type === 'delay' && (
        <div className={styles.popoverSection}>
          <p className={styles.popoverSectionLabel}>Duration</p>
          <div className={styles.delayDurationRow}>
            <NumberField
              size="md"
              min={1}
              placeholder="1"
              value={step.configValues?.amount ?? ''}
              onChange={e => {
                // Accept only positive integers
                const raw = e.target.value;
                const cleaned = raw.replace(/[^0-9]/g, '');
                onUpdateConfigField('amount', cleaned);
              }}
              aria-label="Delay amount"
              className={styles.delayAmountInput}
            />
            <PopoverSelect
              value={step.configValues?.unit ?? 'minutes'}
              onChange={v => onUpdateConfigField('unit', v)}
              className={styles.delayUnitSelect}
              options={[
                { value: 'minutes', label: 'Minutes' },
                { value: 'hours',   label: 'Hours'   },
                { value: 'days',    label: 'Days'    },
                { value: 'weeks',   label: 'Weeks'   },
                { value: 'custom',  label: 'Custom'  },
              ]}
            />
          </div>
          {step.configValues?.unit === 'custom' && (
            <div className={styles.delayCustomUnitRow}>
              <TextField
                size="md"
                placeholder="Custom unit (e.g. months)"
                value={step.configValues?.customUnit ?? ''}
                onChange={e => onUpdateConfigField('customUnit', e.target.value)}
                aria-label="Custom unit"
              />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CONDITION NODE — group-based logic model.
          Within-group = AND, between-groups = OR. Up to 5 conditions total.
          ══════════════════════════════════════════════════════════════════ */}
      {step.type === 'condition' && (
        <ConditionGroupsEditor
          step={step}
          onUpdateConditionBranches={onUpdateConditionBranches}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          AI SPECIALIST — tabs (Configure | Test) at the top of the panel
          ══════════════════════════════════════════════════════════════════ */}
      {isAiSpecialist && (
        <div className={styles.aiSpecTabsWrap}>
          <Tabs
            variant="underline"
            size="md"
            value={aiSpecTab}
            onChange={(v) => setAiSpecTab(v as 'configure' | 'test')}
          >
            <Tabs.Tab value="configure">Configure</Tabs.Tab>
            {specialistConfigured ? (
              <Tabs.Tab value="test">Test</Tabs.Tab>
            ) : (
              <Tooltip content="Configure a specialist first" placement="bottom">
                <Tabs.Tab value="test" disabled>Test</Tabs.Tab>
              </Tooltip>
            )}
          </Tabs>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          AI SPECIALIST · TEST TAB — mounts only while the Test tab is active
          so chat state resets on every tab switch.
          ══════════════════════════════════════════════════════════════════ */}
      {isAiSpecialist && aiSpecTab === 'test' && (
        <AiSpecialistTest
          specialistName={specialistName}
          specialistRole={specialistRole}
          specialistVoice={selectedPersona.voice}
          personaId={selectedPersona.id}
          triggerLabel={triggerLabel}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TRIGGER / ACTION / AI NODE — existing configuration structure
          ══════════════════════════════════════════════════════════════════ */}
      {(!isAiSpecialist || aiSpecTab === 'configure')
        && step.type !== 'condition'
        && step.type !== 'delay'
        // AI nodes always render their Specialist Persona row (even when
        // empty) so non-AI nodes still gate on the existing `!isEmpty`
        // check that hides the configuration UI before a node type is
        // chosen.
        && (step.type === 'ai' || !isEmpty)
        && (
        <>
          {/* AI Specialist Persona row — always shown for AI nodes,
              regardless of whether a persona has been picked yet. The
              empty-state branch inside AiSpecialistMeta surfaces a
              "Choose" button that opens the picker in a modal dialog. */}
          {step.type === 'ai' && (
            <div className={styles.popoverSection}>
              <AiSpecialistMeta
                step={step}
                onUpdateConfigField={onUpdateConfigField}
                onPickPersona={persona => {
                  // Two writes per pick: persist the persona id first so
                  // the configured branch can read it on the same render
                  // that flips selectedValue to the configured sentinel.
                  onUpdateConfigField('ai_persona_id', persona.id);
                  onSelectSuggestion('AI Specialist');
                }}
              />
            </div>
          )}
          {/* The Configuration divider + section only render once the
              user has actually picked a specialist — there's nothing to
              configure on an empty AI node. */}
          {!(step.type === 'ai' && step.selectedValue !== 'AI Specialist') && <>
          <div className={styles.popoverDivider} />
          <div className={styles.popoverSection}>
            <p className={styles.popoverSectionLabel}>
              {step.type === 'ai' && step.selectedValue === 'AI Specialist'
                ? 'Agent has access to'
                : 'Configuration'}
            </p>

            {/* ── Trigger config fields ─────────────────────────────────── */}
            {step.type === 'trigger' && (() => {
              const libItem = ALL_LIBRARY_ITEMS.find(i => i.label === step.selectedValue);
              const fields  = libItem ? (NODE_CONFIG[libItem.id] ?? []) : [];
              const vals    = step.configValues ?? {};
              return (
                <>
                  {fields.length === 0 ? null : (
                    <div className={styles.popoverFields}>
                      {fields.map(field => {
                    if (field.hideWhenDependsOnIs && field.dependsOn) {
                      if (vals[field.dependsOn] === field.hideWhenDependsOnIs) return null;
                    }
                    const opts: string[] = field.dependsOn
                      ? (field.optionsByDependency?.[vals[field.dependsOn] ?? ''] ?? [])
                      : (field.options ?? []);
                    // Dependent fields stay enabled even when their
                    // parent dependency hasn't been resolved — opening
                    // the dropdown surfaces an empty list (with the
                    // "No matches" empty state) instead of a muted
                    // trigger. The placeholder copy hints at the
                    // dependency so the user still understands why
                    // the list is empty.
                    const hasUnresolvedDep =
                      !!field.dependsOn && !vals[field.dependsOn];
                    const currentVal = vals[field.key] ?? '';
                    if (field.type === 'select') {
                      const placeholderCopy = hasUnresolvedDep
                        ? `Select ${field.dependsOn} first…`
                        : `Select ${field.label.toLowerCase()}…`;
                      return (
                        <div key={field.key} className={styles.popoverFieldRow}>
                          <label className={styles.popoverFieldLabel}>{field.label}</label>
                          <PopoverSelect
                            value={currentVal}
                            onChange={v => onUpdateConfigField(field.key, v)}
                            placeholder={placeholderCopy}
                            options={opts.map(o => ({ value: o, label: o }))}
                          />
                        </div>
                      );
                    }
                    if (field.type === 'time') {
                      return (
                        <div key={field.key} className={styles.popoverFieldRow}>
                          <label className={styles.popoverFieldLabel}>{field.label}</label>
                          <input type="time" className={styles.popoverTimeInput}
                            value={currentVal}
                            onChange={e => onUpdateConfigField(field.key, e.target.value)}
                            aria-label={field.label}
                          />
                        </div>
                      );
                    }
                    return (
                      <TextField key={field.key} size="md" label={field.label}
                        value={currentVal}
                        onChange={e => onUpdateConfigField(field.key, e.target.value)}
                        aria-label={field.label}
                      />
                    );
                  })}
                    </div>
                  )}
                  {/* Modify Timing — universal across every trigger type.
                      Lets the user offset the trigger fire moment by N
                      Min/Hour/Day After/Before the underlying event.
                      Always rendered (regardless of whether the trigger
                      has its own config fields), with a "+ Modify
                      Timing" affordance when none is set yet. */}
                  <TriggerModifyTiming vals={vals} onUpdate={onUpdateConfigField} />
                </>
              );
            })()}

            {/* ── Action config fields ──────────────────────────────────── */}
            {step.type === 'action' && (() => {
              const libItem = ALL_LIBRARY_ITEMS.find(i => i.label === step.selectedValue);
              const fields  = libItem ? (NODE_CONFIG[libItem.id] ?? []) : [];
              const vals    = step.configValues ?? {};
              if (fields.length === 0) return (
                <p className={styles.popoverConfigPlaceholder}>No additional configuration for this action.</p>
              );
              return (
                <div className={styles.popoverFields}>
                  {fields.map(field => {
                    if (field.hideWhenDependsOnIs && field.dependsOn) {
                      if (vals[field.dependsOn] === field.hideWhenDependsOnIs) return null;
                    }
                    // Hide a dependent field whose dependency value has no
                    // entry in optionsByDependency — keeps the form clean
                    // for columns that don't drive a value picker (e.g.
                    // Modify's Value selector only renders when Column
                    // resolves to a key in optionsByDependency).
                    if (field.dependsOn && field.optionsByDependency
                        && !field.optionsByDependency[vals[field.dependsOn] ?? '']) {
                      return null;
                    }
                    const currentVal = vals[field.key] ?? '';
                    if (field.type === 'select') {
                      const opts = field.dependsOn
                        ? (field.optionsByDependency?.[vals[field.dependsOn] ?? ''] ?? [])
                        : (field.options ?? []);
                      return (
                        <div key={field.key} className={styles.popoverFieldRow}>
                          {field.label && <label className={styles.popoverFieldLabel}>{field.label}</label>}
                          <PopoverSelect
                            value={currentVal}
                            onChange={v => onUpdateConfigField(field.key, v)}
                            placeholder={`Select ${field.label.toLowerCase() || 'option'}…`}
                            options={[{ value: '', label: `Select ${field.label.toLowerCase() || 'option'}…` }, ...opts.map(o => ({ value: o, label: o }))]}
                          />
                        </div>
                      );
                    }
                    if (field.type === 'textarea') {
                      return (
                        <div key={field.key} className={styles.popoverFieldRow}>
                          {field.label && <label className={styles.popoverFieldLabel}>{field.label}</label>}
                          <TextArea size="md"
                            placeholder={`Enter ${field.label.toLowerCase()}…`}
                            value={currentVal}
                            onChange={e => onUpdateConfigField(field.key, e.target.value)}
                            aria-label={field.label}
                          />
                        </div>
                      );
                    }
                    if (field.type === 'boolean') {
                      return (
                        <div key={field.key} className={styles.popoverFieldRowInline}>
                          <input type="checkbox" id={`acfg-${field.key}`}
                            className={styles.popoverCheckbox}
                            checked={currentVal === 'true'}
                            onChange={e => onUpdateConfigField(field.key, String(e.target.checked))}
                          />
                          <label htmlFor={`acfg-${field.key}`} className={styles.popoverCheckboxLabel}>{field.label}</label>
                        </div>
                      );
                    }
                    if (field.type === 'multi_add') {
                      const tagVals = currentVal ? currentVal.split(',').map(v => v.trim()).filter(Boolean) : [];
                      return (
                        <div key={field.key} className={styles.popoverFieldRow}>
                          {field.label && <label className={styles.popoverFieldLabel}>{field.label}</label>}
                          <ConditionTagInput values={tagVals} onChange={next => onUpdateConfigField(field.key, next.join(', '))} />
                        </div>
                      );
                    }
                    if (field.type === 'multi_select') {
                      // Searchable multi-select — Alloy SearchField on top
                      // surfaces matching unselected options, picking adds
                      // them to a ListItem stack below where each row
                      // carries a Trash trailing button for removal. The
                      // raw value persists as a comma-separated string so
                      // the on-disk shape stays consistent with multi_add.
                      const opts = field.options ?? [];
                      const selectedVals = currentVal
                        ? currentVal.split(',').map(v => v.trim()).filter(Boolean)
                        : [];
                      return (
                        <div key={field.key} className={styles.popoverFieldRow}>
                          {field.label && <label className={styles.popoverFieldLabel}>{field.label}</label>}
                          <MultiSelectSearchPicker
                            options={opts}
                            values={selectedVals}
                            onChange={next => onUpdateConfigField(field.key, next.join(', '))}
                            placeholder={`Search ${field.label.toLowerCase() || 'options'}…`}
                          />
                        </div>
                      );
                    }
                    return (
                      <TextField key={field.key} size="md"
                        label={field.label || undefined}
                        placeholder={`Enter ${field.label.toLowerCase() || 'value'}…`}
                        value={currentVal}
                        onChange={e => onUpdateConfigField(field.key, e.target.value)}
                        aria-label={field.label}
                      />
                    );
                  })}
                </div>
              );
            })()}

            {/* ── AI config ─────────────────────────────────────────────── */}
            {step.type === 'ai' && (
              step.selectedValue === 'AI Specialist'
                ? <AiSpecialistCards step={step} onUpdateConfigField={onUpdateConfigField} triggerLabel={triggerLabel} />
                : <p className={styles.popoverConfigPlaceholder}>No additional configuration for this AI step.</p>
            )}
          </div>

          {/* ── AI specialist Configuration section — separate from the
              "Agent has access to" group above. Hosts settings that
              govern the conversation itself rather than the data /
              channels the agent can use (currently just Timeout). ── */}
          {step.type === 'ai' && step.selectedValue === 'AI Specialist' && (
            <>
              <div className={styles.popoverDivider} />
              <div className={styles.popoverSection}>
                <p className={styles.popoverSectionLabel}>Configuration</p>
                <AiSpecialistTimeoutCard step={step} onUpdateConfigField={onUpdateConfigField} />
              </div>
            </>
          )}
          </>}{/* end conditional Configuration block */}
        </>
      )}

      </div>{/* end popoverBody */}

      {/* ── AI input drawer — relocated from the canvas float into the
            popover's bottom slot. Submits into the left-panel thread via
            the onNodeAiSubmit callback; mirrors the NodeAiFloatingInput
            markup so the composer styling / keyboard handling is shared.
            Hidden on the AI Specialist Test tab — that tab has its own
            "Message {persona}…" composer wired to the chat thread. */}
      {onNodeAiSubmit && !(isAiSpecialist && aiSpecTab === 'test') && (
        <NodePopoverAiDrawer step={step} onSubmit={onNodeAiSubmit} />
      )}
    </div>
  );
}

// ─── NodePopoverAiDrawer ─────────────────────────────────────────────────────
// Inline copy of the old floating AI input, stripped of canvas-coordinate
// positioning. Lives at the bottom of NodePopover.

interface NodePopoverAiDrawerProps {
  step: FlowStep;
  onSubmit: (message: string, nodeType: StepType) => void;
}

function NodePopoverAiDrawer({ step, onSubmit }: NodePopoverAiDrawerProps) {
  const [aiPrompt, setAiPrompt] = useState('');
  const handleSend = useCallback(() => {
    const text = aiPrompt.trim();
    if (!text) return;
    onSubmit(text, step.type);
    setAiPrompt('');
  }, [aiPrompt, step.type, onSubmit]);
  return (
    <div className={styles.popoverAiDrawer}>
      <div className={styles.popoverAiCard}>
        <textarea
          className={styles.aiComposerTextarea}
          placeholder="Tell AI what you want to build..."
          rows={1}
          value={aiPrompt}
          onChange={e => {
            setAiPrompt(e.target.value);
            const t = e.target;
            t.style.height = 'auto';
            t.style.height = t.scrollHeight + 'px';
          }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <div className={styles.popoverAiActionBar}>
          <button type="button" className={styles.aiComposerMicBtn} aria-label="Voice input">
            <Microphone02Icon size={14} />
          </button>
          {aiPrompt.trim().length > 0 && (
            <button
              className={styles.aiComposerSendBtn}
              onClick={handleSend}
              aria-label="Send to AI"
            >
              <ArrowNarrowUpIcon size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── TopBar ─────────────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved';

const STATUS_TAG_MAP: Record<AutomationStatus, StatusTagStatus> = {
  draft:    'neutral',
  live:     'success',
  archived: 'warning',
};

const STATUS_LABEL: Record<AutomationStatus, string> = {
  draft:    'Draft',
  live:     'Live',
  archived: 'Archived',
};

interface TopBarProps {
  onBack: () => void;
  onTest: () => void;
  onPublish: () => void;
  saveState: SaveState;
  name: string;
  onNameChange: (v: string) => void;
  status: AutomationStatus;
  onSettingsOpen: () => void;
  /** True when this builder was opened from the Templates library (the
   *  workflow doesn't exist in the user's manage list yet). In template
   *  mode the right side shows a single "Use this template" CTA, the
   *  Run test button is hidden, and the status tag next to the name is
   *  suppressed since the workflow has no real status yet. */
  isTemplate?: boolean;
  /** Toggle the AI panel — fired by the layout-left button at the very
   *  start of the topbar. Replaces the old separate LeftPanel header
   *  collapse button + the floating diamond expand button. */
  onToggleAiPanel: () => void;
  /** Drives the layout-left button's `aria-pressed` state so screen
   *  readers can tell whether the AI panel is currently collapsed. */
  aiPanelCollapsed: boolean;
}

function TopBar({
  onBack,
  onTest,
  onPublish,
  saveState,
  name,
  onNameChange,
  status,
  onSettingsOpen,
  isTemplate = false,
  onToggleAiPanel,
  aiPanelCollapsed,
}: TopBarProps) {
  const nameRef = useRef<HTMLSpanElement>(null);
  const focused = useRef(false);

  // Sync external name changes to DOM only when not actively editing
  useEffect(() => {
    const el = nameRef.current;
    if (el && !focused.current && el.textContent !== name) {
      el.textContent = name;
    }
  }, [name]);

  // Set initial content on mount
  useEffect(() => {
    if (nameRef.current) nameRef.current.textContent = name;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header className={styles.topBar}>
      <div className={styles.topBarLeft}>
        {/* contenteditable span: width = text content width, so border-bottom
            is always exactly as wide as the visible text — no measurement needed */}
        <span
          ref={nameRef}
          className={styles.topBarName}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Workflow name"
          data-placeholder="Workflow Name"
          spellCheck={false}
          onFocus={() => { focused.current = true; }}
          onBlur={(e) => {
            focused.current = false;
            const text = (e.currentTarget.textContent ?? '').replace(/\n/g, '').trim();
            if (!text) {
              const fallback = 'Untitled workflow';
              e.currentTarget.textContent = fallback;
              onNameChange(fallback);
            } else {
              onNameChange(text);
            }
          }}
          onInput={(e) => {
            onNameChange((e.currentTarget.textContent ?? '').replace(/\n/g, ''));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
          }}
        />
        {/* Workflow menu — sits between the name and status tag. The
            chevron now reads as a "more options" dropdown trigger
            instead of a single back action: it opens a menu with the
            back-to-list affordance + workflow Settings (which used to
            live as its own gear button on the right of the top nav). */}
        <DropdownMenu
          trigger={
            <Button
              variant="ghost"
              size="xs"
              iconOnly
              aria-label="Workflow menu"
            >
              <ChevronDownIcon size={12} />
            </Button>
          }
          groups={[
            {
              id: 'workflow',
              options: [
                {
                  id: 'back',
                  label: 'Back to manage workflows',
                  leadingSlot: <ChevronLeft />,
                  onClick: onBack,
                },
                {
                  id: 'settings',
                  label: 'Settings',
                  leadingSlot: <SettingsGearIcon />,
                  onClick: onSettingsOpen,
                },
              ],
            },
          ]}
          placement="bottom-start"
          width="max-content"
        />
        {/* AI panel toggle — layout-left glyph slotted between the
            workflow chevron menu and the status tag. Replaces the
            standalone LeftPanel header (which used to carry the
            wordmark + collapse button) and the floating diamond
            expand button when the panel was collapsed. One
            affordance, two states: collapsed → expand on click;
            expanded → collapse on click. */}
        <Button
          variant="ghost"
          size="xs"
          iconOnly
          onClick={onToggleAiPanel}
          aria-label={aiPanelCollapsed ? 'Expand AI panel' : 'Collapse AI panel'}
          aria-pressed={aiPanelCollapsed}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M9 3V21M7.8 3H16.2C17.8802 3 18.7202 3 19.362 3.32698C19.9265 3.6146 20.3854 4.07354 20.673 4.63803C21 5.27976 21 6.11984 21 7.8V16.2C21 17.8802 21 18.7202 20.673 19.362C20.3854 19.9265 19.9265 20.3854 19.362 20.673C18.7202 21 17.8802 21 16.2 21H7.8C6.11984 21 5.27976 21 4.63803 20.673C4.07354 20.3854 3.6146 19.9265 3.32698 19.362C3 18.7202 3 17.8802 3 16.2V7.8C3 6.11984 3 5.27976 3.32698 4.63803C3.6146 4.07354 4.07354 3.6146 4.63803 3.32698C5.27976 3 6.11984 3 7.8 3Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
        {/* Status tag — suppressed in template mode because templates
            haven't been added to the workflow list yet, so a status
            chip would be misleading. */}
        {!isTemplate && (
          <StatusTag status={STATUS_TAG_MAP[status]} size="sm" className={styles.topBarStatusTag}>
            {STATUS_LABEL[status]}
          </StatusTag>
        )}
      </div>
      <div className={styles.topBarActions}>
        {saveState !== 'idle' && (
          <span className={styles.autoSaveText} aria-live="polite">
            {saveState === 'saving' ? 'Saving…' : 'All changes saved'}
          </span>
        )}
        {/* Settings gear was here — moved into the workflow chevron
            menu next to the workflow name (see DropdownMenu above). */}
        {isTemplate ? (
          /* Template mode — single primary CTA that adopts the template
              into the user's workflow list. Run test is hidden because
              the workflow has no live state to test yet. */
          <Button variant="primary" size="sm" onClick={onPublish}>
            Use this template
          </Button>
        ) : (
          <>
            <Button variant="tertiary" size="sm" onClick={onTest}>Run test</Button>
            <Button variant="primary"   size="sm" onClick={onPublish}>Publish</Button>
          </>
        )}
      </div>
    </header>
  );
}


// ─── DialogTagInput ──────────────────────────────────────────────────────────────

function DialogTagInput({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');
  return (
    <div className={styles.settingsTagInput} onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}>
      {values.map((v, i) => (
        <Tag
          key={i}
          variant="subtle"
          color="neutral"
          size="sm"
          dismissible
          onDismiss={() => onChange(values.filter((_, j) => j !== i))}
        >
          {v}
        </Tag>
      ))}
      <input
        className={styles.settingsTagInputField}
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={values.length === 0 ? 'Type and press Enter…' : 'Add another…'}
        onKeyDown={e => {
          if (e.key === 'Enter' && input.trim()) {
            e.preventDefault();
            onChange([...values, input.trim()]);
            setInput('');
          }
          if (e.key === 'Backspace' && !input && values.length > 0) {
            onChange(values.slice(0, -1));
          }
        }}
      />
    </div>
  );
}


// ─── WorkflowSettingsDialog ──────────────────────────────────────────────────────

interface WorkflowSettingsDialogProps {
  open: boolean;
  name: string;
  description: string;
  tags: string[];
  onClose: () => void;
  onSave: (name: string, description: string, tags: string[]) => void;
}

function WorkflowSettingsDialog({ open, name, description, tags, onClose, onSave }: WorkflowSettingsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [draftName, setDraftName]               = useState(name);
  const [draftDescription, setDraftDescription] = useState(description);
  const [draftTags, setDraftTags]               = useState<string[]>(tags);

  // Sync draft state whenever dialog opens
  useEffect(() => {
    if (open) {
      setDraftName(name);
      setDraftDescription(description);
      setDraftTags(tags);
    }
  }, [open, name, description, tags]);

  // Escape → close without saving
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Outside mousedown → close without saving
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!dialogRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.settingsOverlay} role="dialog" aria-modal="true" aria-label="Workflow settings">
      <div ref={dialogRef} className={styles.settingsDialog} onMouseDown={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.settingsHeader}>
          <span className={styles.settingsTitle}>Workflow details</span>
          <button className={styles.settingsCloseBtn} onClick={onClose} aria-label="Close settings" type="button">
            <XIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.settingsBody}>
          <div className={styles.settingsFieldGroup}>
            <label className={styles.settingsLabel} htmlFor="settings-name">Name</label>
            <TextField
              id="settings-name"
              size="md"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              placeholder="Workflow name"
            />
          </div>

          <div className={styles.settingsFieldGroup}>
            <label className={styles.settingsLabel} htmlFor="settings-description">Description</label>
            <TextArea
              id="settings-description"
              size="md"
              value={draftDescription}
              onChange={e => setDraftDescription(e.target.value)}
              placeholder="Describe what this workflow does…"
            />
          </div>

          <div className={styles.settingsFieldGroup}>
            <label className={styles.settingsLabel}>Tags</label>
            <DialogTagInput values={draftTags} onChange={setDraftTags} />
            <p className={styles.settingsHint}>Used for filtering and searching on the automations list.</p>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.settingsFooter}>
          <Button variant="primary" size="md" onClick={() => onSave(draftName, draftDescription, draftTags)}>
            Save
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}


// ─── NodePaletteCard ─────────────────────────────────────────────────────────────

interface NodePaletteCardProps {
  onDragStart: (item: LibraryItem) => void;
  onDragEnd: () => void;
  onNodeSelect: (item: LibraryItem) => void;
}

// New order per design — search comes first, AI and delay swap positions.
const TOOLBAR_NODE_ORDER: StepType[] = ['trigger', 'condition', 'action', 'delay', 'ai', 'policy'];

// Standalone toolbar icons (20px artwork inside a 36×36 button).
const TOOLBAR_NODE_ICON: Record<StepType, React.ReactNode> = {
  trigger:   <PlayIcon          size={20} />,
  condition: <FilterLinesIcon   size={20} />,
  action:    <CircularArrowIcon size={20} />,
  delay:     <ClockIcon         size={20} />,
  ai:        <TeambridgeAIIcon  size={20} />,
  policy:    <TriangleUpIcon    size={20} />,
};

// Smaller variant used inside the search popup's 36×36 icon wrappers. Falls
// back to the base-type icon for anything without a per-item/category mapping.
const SEARCH_RESULT_BASE_ICON: Record<StepType, React.ReactNode> = {
  trigger:   <PlayIcon          size={16} />,
  condition: <FilterLinesIcon   size={16} />,
  action:    <CircularArrowIcon size={16} />,
  delay:     <ClockIcon         size={16} />,
  ai:        <TeambridgeAIIcon  size={16} />,
  policy:    <TriangleUpIcon    size={16} />,
};

// 16px action icons — mirrors ACTION_ITEM_ICON (which is sized for 12px badges
// used elsewhere in the flow card), at the size the search popup expects.
const SEARCH_ACTION_ITEM_ICON: Record<string, React.ReactNode> = {
  user_actions_clock_in:              <ClockIcon size={16} />,
  user_actions_clock_out:             <ClockIcon size={16} />,
  update_data_modify:                 <Edit03Icon size={16} />,
  notifications_send_email:           <Mail01Icon size={16} />,
  notifications_webhook_notification: <Bell01Icon size={16} />,
  notifications_send_one_way_sms:     <Announcement02Icon size={16} />,
  notifications_send_feed_message:    <Announcement02Icon size={16} />,
  notifications_send_chat_message:    <Announcement02Icon size={16} />,
  notifications_send_report:          <Announcement02Icon size={16} />,
};

const SEARCH_ACTION_CATEGORY_ICON: Record<string, React.ReactNode> = {
  shift_actions:    <CheckCircleIcon size={16} />,
  geofence_actions: <Home02Icon size={16} />,
  user_actions:     <Users03Icon size={16} />,
  update_data:      <File04Icon size={16} />,
  notifications:    <Bell01Icon size={16} />,
};

function getSearchResultIcon(item: { id: string; type: StepType; category: string }): React.ReactNode {
  if (item.type === 'action') {
    return SEARCH_ACTION_ITEM_ICON[item.id]
      ?? SEARCH_ACTION_CATEGORY_ICON[item.category]
      ?? SEARCH_RESULT_BASE_ICON.action;
  }
  return SEARCH_RESULT_BASE_ICON[item.type];
}

// Order used by the filter tabs (and the grouped results list).
type SearchTabValue = 'all' | StepType;
const SEARCH_TAB_ORDER: SearchTabValue[] = ['all', 'trigger', 'condition', 'action', 'delay', 'ai', 'policy'];
const SEARCH_TAB_LABEL: Record<SearchTabValue, string> = {
  all:       'All',
  trigger:   'Trigger',
  condition: 'Condition',
  action:    'Action',
  delay:     'Delay',
  ai:        'AI Specialist',
  policy:    'Policy',
};

// Human-readable plural headers for grouped result sections.
const STEP_GROUP_HEADING: Record<StepType, string> = {
  trigger:   'Triggers',
  condition: 'Conditions',
  action:    'Actions',
  delay:     'Delays',
  ai:        'AI Specialists',
  policy:    'Policies',
};

const RECENTS_STORAGE_KEY = 'automation.nodePaletteRecents';
const RECENTS_LIMIT = 5;

// Persist a minimal LibraryItem shape — enough to rehydrate an add-to-canvas
// payload without relying on ALL_LIBRARY_ITEMS being stable across builds.
type StoredRecent = Pick<LibraryItem, 'id' | 'type' | 'label' | 'category'>;

function loadRecents(): StoredRecent[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is StoredRecent =>
      r && typeof r.id === 'string' && typeof r.type === 'string' && typeof r.label === 'string' && typeof r.category === 'string'
    ).slice(0, RECENTS_LIMIT);
  } catch {
    return [];
  }
}

function saveRecents(items: StoredRecent[]) {
  try { window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(items)); } catch { /* noop */ }
}

// The palette toolbar is always rendered as the floating bottom-center bar;
// the previous "collapsed → + button" affordance has been removed because
// the bar no longer lives inside the collapsible left panel.
function NodePaletteCard({ onDragStart, onDragEnd, onNodeSelect }: NodePaletteCardProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<SearchTabValue>('all');
  const [recents, setRecents] = useState<StoredRecent[]>(() => loadRecents());
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Delayed-unmount machinery so the popover can play an exit animation
  // before being removed from the tree:
  //   · `panelMounted`  — controls whether the panel exists in the DOM at all.
  //   · `panelVisible`  — drives the `data-open` attribute used by CSS to
  //                       transition opacity + translateY.
  // On open: mount immediately, then flip visible on the next frame so the
  // browser commits the off-state styles before transitioning.
  // On close: flip visible off (CSS animates out), then unmount after the
  // transition duration.
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  useEffect(() => {
    if (searchOpen) {
      setPanelMounted(true);
      const raf = requestAnimationFrame(() => setPanelVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setPanelVisible(false);
    const id = window.setTimeout(() => setPanelMounted(false), 200);
    return () => window.clearTimeout(id);
  }, [searchOpen]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSelectedTab('all');
    setHighlightedIdx(0);
  }, []);

  const recordRecent = useCallback((item: LibraryItem) => {
    // Only items that represent a real selection (base toolbar nodes or
    // library entries) are recorded — matches "last 5 items the user added".
    const entry: StoredRecent = { id: item.id, type: item.type, label: item.label || STEP_TOOLTIP_LABEL[item.type], category: item.category };
    setRecents(prev => {
      const next = [entry, ...prev.filter(r => !(r.id === entry.id && r.type === entry.type))].slice(0, RECENTS_LIMIT);
      saveRecents(next);
      return next;
    });
  }, []);

  // Outside click + Escape close the popup.
  useEffect(() => {
    if (!searchOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeSearch();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    // Autofocus the input when the popup opens
    searchInputRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [searchOpen, closeSearch]);

  const handleToolbarNodeClick = (type: StepType) => {
    const item: LibraryItem = { id: type, type, label: '', category: type };
    onNodeSelect(item);
    recordRecent(item);
    // Clicking any toolbar node while the popup is open also closes it.
    if (searchOpen) closeSearch();
  };

  const handleToolbarNodeDragStart = (e: React.DragEvent, type: StepType) => {
    const item: LibraryItem = { id: type, type, label: '', category: type };
    const ghost = document.createElement('div');
    ghost.style.cssText = 'width:1px;height:1px;position:fixed;top:-9999px;opacity:0;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(item);
  };

  // Render the horizontal pill of node icons. `searchActive` controls the
  // search button styling (dark fill vs grey). The toolbar is rendered twice:
  // once standalone, and once at the bottom of the search popup.
  const renderToolbar = (searchActive: boolean) => (
    <div className={styles.toolbar} role="toolbar" aria-label="Node toolbar">
      <Tooltip content="Search nodes" offset={4}>
        <button
          type="button"
          className={clsx(styles.toolbarBtn, styles.toolbarSearchBtn, searchActive && styles.toolbarSearchBtnActive)}
          onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          aria-label="Search nodes"
          aria-pressed={searchActive}
        >
          <SearchSmIcon size={20} />
        </button>
      </Tooltip>
      {TOOLBAR_NODE_ORDER.map(type => (
        <Tooltip key={type} content={STEP_TOOLTIP_LABEL[type]} offset={4}>
          <button
            type="button"
            className={styles.toolbarBtn}
            data-step-type={type}
            draggable
            onDragStart={e => handleToolbarNodeDragStart(e, type)}
            onDragEnd={onDragEnd}
            onClick={() => handleToolbarNodeClick(type)}
            aria-label={STEP_TOOLTIP_LABEL[type]}
          >
            {TOOLBAR_NODE_ICON[type]}
          </button>
        </Tooltip>
      ))}
    </div>
  );

  // Filter across the full library (triggers, conditions, actions, plus the
  // 6 base node types so an empty or generic query still surfaces the primary
  // building blocks). Delay/AI/Policy have no per-item library entries, so
  // they're represented by their base type row.
  const q = searchQuery.trim().toLowerCase();
  const baseRows: LibraryItem[] = TOOLBAR_NODE_ORDER.map(type => ({
    id: type, type, label: STEP_TOOLTIP_LABEL[type], category: type,
  }));
  const allRows: LibraryItem[] = [...baseRows, ...ALL_LIBRARY_ITEMS];

  const typeFiltered = selectedTab === 'all'
    ? allRows
    : allRows.filter(item => item.type === selectedTab);

  const queryFiltered = !q
    ? typeFiltered
    : typeFiltered.filter(item =>
        item.label.toLowerCase().includes(q)
        || STEP_TOOLTIP_LABEL[item.type].toLowerCase().includes(q)
      );

  // Group rows by step type for the results view. Preserve the tab order so
  // sections always appear in the same sequence regardless of query.
  const groupedResults: { type: StepType; rows: LibraryItem[] }[] = TOOLBAR_NODE_ORDER
    .map(type => ({ type, rows: queryFiltered.filter(r => r.type === type) }))
    .filter(g => g.rows.length > 0);

  // Recents show at the top when there's no query and any recents pass the
  // active tab filter. While typing we hide recents and only show matches.
  const recentRows: LibraryItem[] = !q
    ? recents
        .filter(r => selectedTab === 'all' || r.type === selectedTab)
        .map(r => ({ id: r.id, type: r.type, label: r.label, category: r.category }))
    : [];
  const showingRecents = recentRows.length > 0;

  // Flat order used for keyboard navigation. Matches the rendered row order —
  // recents first (when visible), then the grouped results below.
  const flatVisibleRows: LibraryItem[] = [
    ...recentRows,
    ...groupedResults.flatMap(g => g.rows),
  ];

  // Clamp the highlighted index whenever the visible list changes.
  useEffect(() => {
    setHighlightedIdx(i => Math.min(Math.max(0, i), Math.max(0, flatVisibleRows.length - 1)));
  }, [flatVisibleRows.length]);

  const handleSearchResultClick = (item: LibraryItem) => {
    onNodeSelect(item);
    recordRecent(item);
    closeSearch();
  };

  // Keyboard navigation within the popup: ↑/↓ between rows, Enter to select.
  const onPopupKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!searchOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatVisibleRows.length) setHighlightedIdx(i => (i + 1) % flatVisibleRows.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatVisibleRows.length) setHighlightedIdx(i => (i - 1 + flatVisibleRows.length) % flatVisibleRows.length);
    } else if (e.key === 'Enter') {
      const row = flatVisibleRows[highlightedIdx];
      if (row) {
        e.preventDefault();
        handleSearchResultClick(row);
      }
    }
  };

  // Running counter for keyboard-highlighted row index across grouped sections.
  let keyboardRowCursor = -1;

  return (
    <div ref={rootRef} className={styles.paletteRoot}>
      {panelMounted && (
        <div
          className={styles.searchResultsPanel}
          data-open={panelVisible || undefined}
          role="dialog"
          aria-label="Search nodes"
          onKeyDown={onPopupKeyDown}
        >
            <div className={styles.searchInputRow}>
              <SearchSmIcon size={16} />
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder="Search..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setHighlightedIdx(0); }}
              />
            </div>

            <FilterPillGroup className={styles.searchTabsRow} aria-label="Filter by node type">
              {SEARCH_TAB_ORDER.map(tab => (
                <FilterPill
                  key={tab}
                  active={selectedTab === tab}
                  onClick={() => { setSelectedTab(tab); setHighlightedIdx(0); }}
                >
                  {SEARCH_TAB_LABEL[tab]}
                </FilterPill>
              ))}
            </FilterPillGroup>

            <div className={styles.searchResults}>
              {showingRecents && (
                <div className={styles.searchSection}>
                  <div className={styles.searchSectionHeader}>Recents</div>
                  {recentRows.map(r => {
                    keyboardRowCursor += 1;
                    const idx = keyboardRowCursor;
                    return (
                      <button
                        key={`recent:${r.type}:${r.id}`}
                        type="button"
                        className={clsx(styles.searchResultRow, idx === highlightedIdx && styles.searchResultRowActive)}
                        onMouseEnter={() => setHighlightedIdx(idx)}
                        onClick={() => handleSearchResultClick(r)}
                      >
                        <span className={styles.searchResultIcon}>{getSearchResultIcon(r)}</span>
                        <span className={styles.searchResultLabel}>{r.label}</span>
                        <Tag variant="outline" size="sm" className={styles.searchResultTypeTag}>
                          {STEP_TOOLTIP_LABEL[r.type]}
                        </Tag>
                      </button>
                    );
                  })}
                </div>
              )}

              {groupedResults.length === 0 && !showingRecents ? (
                <div className={styles.searchEmpty}>No results</div>
              ) : (
                groupedResults.map(group => (
                  <div key={`group:${group.type}`} className={styles.searchSection}>
                    <div className={styles.searchSectionHeader}>{STEP_GROUP_HEADING[group.type]}</div>
                    {group.rows.map(item => {
                      keyboardRowCursor += 1;
                      const idx = keyboardRowCursor;
                      return (
                        <button
                          key={`${item.type}:${item.id}`}
                          type="button"
                          className={clsx(styles.searchResultRow, idx === highlightedIdx && styles.searchResultRowActive)}
                          onMouseEnter={() => setHighlightedIdx(idx)}
                          onClick={() => handleSearchResultClick(item)}
                        >
                          <span className={styles.searchResultIcon}>{getSearchResultIcon(item)}</span>
                          <span className={styles.searchResultLabel}>{item.label}</span>
                          <Tag variant="outline" size="sm" className={styles.searchResultTypeTag}>
                            {STEP_TOOLTIP_LABEL[item.type]}
                          </Tag>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
        </div>
      )}
      {renderToolbar(searchOpen)}
    </div>
  );
}

// ─── Activity feed + AI conversation thread ──────────────────────────────────

type ThreadEntryKind = 'activity' | 'ai' | 'user' | 'context' | 'node_change';

/** Payload attached to a `node_change` thread entry — drives the inline
 *  NodeChangeCard render. */
interface NodeChangePayload {
  nodes: Array<{ id: string; type: StepType; name: string }>;
  /** Human-readable change kind — added / edited / deleted / connected. */
  changeType: string;
  /** Dot-separated counts shown in the footer (e.g. `[1, 0, 3, 0]`). */
  stats?: number[];
  /** Which side of the thread this card anchors to. Defaults to 'outbound'. */
  side?: 'inbound' | 'outbound';
  /** Optional override for the small header label above the card.
   *  Defaults to `changeType`. */
  headerLabel?: string;
}

interface ThreadEntry {
  id: string;
  kind: ThreadEntryKind;
  content: string;
  timestamp: number;
  nodeChange?: NodeChangePayload;
  /** AI entries only — true while the activity trail is still running and
   *  the message text has not yet arrived. The render hides the text body
   *  until this flips to false; the trail itself renders in `live` state. */
  pending?: boolean;
  /** AI entries only — set on the seeded welcome bubble so the renderer can
   *  skip the activity-trail summary (the greeting isn't a response to a
   *  request, so "Thought for Ns" reads as misleading there). */
  seeded?: boolean;
}

/** Mock AI reaction banks — one line at a time, rotated per-bank to avoid repeats. */
const AI_RESPONSES: Record<string, string[]> = {
  add_trigger: [
    "Nice — you've added a trigger. Now connect it to a condition or action to continue the flow.",
    'Trigger in place. What should happen when it fires?',
    'Great, the trigger is set. Add the next step from here.',
  ],
  add_condition: [
    'A condition lets you branch the flow. Configure what to check on the right.',
    'Condition added — set an operator and value, then connect downstream paths.',
  ],
  add_action: [
    'Action dropped in. Pick an action type on the right to define what it does.',
    'Good — choose an action and the relevant fields will show up.',
  ],
  add_ai: [
    'AI Specialist added. Connect it downstream so it has a record to act on.',
    'Specialist added — configure its persona and engagement options on the right.',
  ],
  add_delay: [
    'A pause between steps — tell me how long to wait.',
    'Delay dropped in. Set the duration on the right.',
  ],
  add_policy: [
    'Policy node added — pick which folders or policies to match against.',
    'Policy check added. Configure which ones apply.',
  ],
  delete: [
    'Got it — removed. Let me know if you want to add something else here.',
    'Noted, that step is gone. Keep going whenever you\u2019re ready.',
  ],
  configure: [
    'Config saved. Ready to connect this to the next step?',
    'Got it — updated. Nice.',
    'Noted. Keep going when you\u2019re ready.',
  ],
  connect: [
    'Wired up. Looking good.',
    'Connection made — the flow continues from there.',
    'Nice chain. What comes next?',
  ],
  disconnect: [
    'Edge removed. You can reconnect or route this differently.',
    'Disconnected — let me know what to wire up next.',
  ],
  chat: [
    'I\u2019m just a mock for now — but I\u2019m listening.',
    'Got it. Once I\u2019m wired up to the real model, I\u2019ll be able to help more directly.',
    'Noted. What else would you like to try?',
    'Heard. Keep going — I\u2019ll follow along.',
  ],
};

const WELCOME_AI_MESSAGE = [
  "Hi! I'm your **workflow assistant**. I'll help you build and track changes to this workflow.",
  '',
  '**Try this to get started:**',
  '- Add a **trigger** to kick things off',
  '- Layer a **condition** to gate the flow',
  '- Wire an **action** for the outcome',
  '',
  'Or just ask me anything — I can scaffold the whole thing for you.',
].join('\n');

/* ─── Lightweight markdown rendering ──────────────────────────────────────────
   The AI summaries use a small subset of markdown so the welcome bubble can
   actually look structured (bold callouts, bullet lists, "next steps"
   sections) instead of one wall of text. Rather than pull in `react-markdown`
   we parse here — the supported subset is intentionally tiny:

     **bold**          → <strong>
     ### heading       → <h4>
     - item            → <ul><li>...</li></ul>   (consecutive lines group)
     blank line        → block separator
     anything else     → <p>

   The parser is plain string scanning so it composes safely with the
   `TypingText` slice — when only `**Foo` is visible the parser leaves the
   stray `**` as literal text until the closing pair arrives. */

function MarkdownInline({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
    parts.push(<strong key={key++}>{match[1]}</strong>);
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return <>{parts}</>;
}

function MarkdownText({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let blockKey = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={`list-${blockKey++}`} className={styles.aiMessageList}>
        {listBuffer.map((item, i) => (
          <li key={i}><MarkdownInline text={item} /></li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trimStart();
    // Bullet — accept `- ` or `• `; flexible enough to survive partial
    // typing where a leading space hasn't arrived yet.
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      listBuffer.push(trimmed.slice(2));
      continue;
    }
    flushList();
    if (trimmed === '') continue; // blank line — block separator handled by p margins
    if (trimmed.startsWith('### ')) {
      blocks.push(
        <h4 key={`h-${blockKey++}`} className={styles.aiMessageHeading}>
          <MarkdownInline text={trimmed.slice(4)} />
        </h4>,
      );
      continue;
    }
    blocks.push(
      <p key={`p-${blockKey++}`} className={styles.aiMessagePara}>
        <MarkdownInline text={trimmed} />
      </p>,
    );
  }
  flushList();
  return <>{blocks}</>;
}

// Streams the AI response one chunk at a time to mimic live typing. Effect
// re-runs only when `content` changes, so an already-finished bubble isn't
// re-animated on incidental re-renders. The visible substring is fed back
// through MarkdownText so structure (bold / bullets / "next steps" headings)
// progressively reveals as the typewriter advances.
function TypingText({ content, onProgress }: { content: string; onProgress?: () => void }) {
  const [len, setLen] = useState(0);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  useEffect(() => {
    setLen(0);
    let i = 0;
    let timerId: number;
    const tick = () => {
      i = Math.min(i + 2, content.length);
      setLen(i);
      onProgressRef.current?.();
      if (i < content.length) {
        timerId = window.setTimeout(tick, 18);
      }
    };
    timerId = window.setTimeout(tick, 18);
    return () => window.clearTimeout(timerId);
  }, [content]);
  return <MarkdownText content={content.slice(0, len)} />;
}

// ─── NodeChangeCard / UserChangeGroup ────────────────────────────────────────
// Inline card rendered in the AI thread whenever a canvas node change is
// logged. Display-only: three label-value rows (Node ID, Last updated,
// Change made) for the affected node(s).
//
// `UserChangeGroup` aggregates several canvas changes that happen within
// the same wall-clock minute into a single thread block — each change
// type (Added / Deleted / Connected / Disconnected / Modified) becomes
// its own collapsible sub-row, with a paginated NodeChangeCard inside
// when expanded. Mirrors the AI activity-trail visual language.

interface NodeChangeCardProps {
  payload: NodeChangePayload;
  timestamp: number;
}

function NodeChangeCard({ payload, timestamp }: NodeChangeCardProps) {
  const headerLabel = payload.headerLabel ?? payload.changeType;

  const nodeIds = payload.nodes.length > 0
    ? payload.nodes.map(n => n.id).join(', ')
    : '—';

  const lastUpdated = formatInfoTimestamp(new Date(timestamp).toISOString());

  const nodeNames = payload.nodes.map(n => n.name).filter(Boolean).join(', ');
  const changeDesc = nodeNames ? `${headerLabel} — ${nodeNames}` : headerLabel;

  return (
    <div className={styles.nodeChangeCard}>
      <div className={styles.nodeChangeMetaRow}>
        <span className={styles.nodeChangeMetaLabel}>Node ID</span>
        <code className={styles.nodeChangeMetaValueMono}>{nodeIds}</code>
      </div>
      <div className={styles.nodeChangeMetaRow}>
        <span className={styles.nodeChangeMetaLabel}>Last updated</span>
        <time
          className={styles.nodeChangeMetaValue}
          dateTime={new Date(timestamp).toISOString()}
        >
          {lastUpdated}
        </time>
      </div>
      <div className={styles.nodeChangeMetaRow}>
        <span className={styles.nodeChangeMetaLabel}>Change made</span>
        <span className={styles.nodeChangeMetaValue}>{changeDesc}</span>
      </div>
    </div>
  );
}

// ── User change group ───────────────────────────────────────────────────────

/** One change-type subgroup within a UserChangeGroup. Carries every
 *  individual NodeChangePayload that fell into the same minute window AND
 *  shares a `changeType` (e.g. all the "Added" events for that minute).
 *  Each entry remembers its own timestamp so the paginated card inside can
 *  show the correct relative time per page. */
interface UserChangeSubgroup {
  changeType: string;
  entries: Array<{ payload: NodeChangePayload; timestamp: number; id: string }>;
}

/** Icon resolver for the change-type sub-row pill. Each `changeType` emitted
 *  by `emitNodeChange` maps to one of these. Falls back to a neutral edit
 *  glyph for anything unmapped. */
function getChangeTypeIcon(changeType: string): React.ReactNode {
  switch (changeType) {
    case 'Added':        return <PlusIcon size={14} />;
    case 'Deleted':      return <Trash03Icon size={14} />;
    case 'Connected':    return <Link01Icon size={14} />;
    case 'Disconnected': return <LinkBroken01Icon size={14} />;
    case 'Modified':     return <Edit03Icon size={14} />;
    case 'Configured':   return <Edit03Icon size={14} />;
    default:             return <Edit03Icon size={14} />;
  }
}

/** A single sub-row inside a UserChangeGroup. Reads as one of the AI
 *  activity trail's steps — icon + single-line label, with a "N steps"
 *  sub-toggle pill that expands to reveal each change's NodeChangeCard
 *  beneath. Same visual language as the AssistantActivityTrail above so
 *  user-driven changes and AI activity carry consistent treatment. */
function UserChangeSubgroupRow({ subgroup }: { subgroup: UserChangeSubgroup }) {
  // Each individual change becomes one sub-activity entry under the step.
  // Alloy's AIActivityStep renders these in a typewriter list when its
  // parent trail is `live`; in `done` state they appear statically inside
  // the step's collapsible region, shown/hidden by the auto-rendered
  // "N steps" sub-toggle pill.
  const subActivities = subgroup.entries.map((e) => (
    <NodeChangeCard
      key={e.id}
      payload={e.payload}
      timestamp={e.timestamp}
    />
  ));
  return (
    <AIActivityStep
      type="tool"
      status="done"
      icon={getChangeTypeIcon(subgroup.changeType)}
      subActivities={subActivities}
    >
      {subgroup.changeType}
    </AIActivityStep>
  );
}

interface UserChangeGroupProps {
  /** Thread entries that share a wall-clock minute window. Already filtered
   *  by the caller to `kind: 'node_change'` — the component renders nothing
   *  for non-change kinds. */
  entries: ThreadEntry[];
}

/** Grouped block rendered in place of consecutive `node_change` thread
 *  entries that fall within the same minute window. Sub-groups by
 *  `changeType` and renders each as its own collapsible sub-row. The outer
 *  AIActivityTrail surfaces a top-level summary like "Modified · 4 changes"
 *  using the most recent change as the verb (mirrors the design where the
 *  group header reads from the latest action). */
function UserChangeGroup({ entries }: UserChangeGroupProps) {
  // Pre-compute the sub-groups bucketed by changeType, preserving the
  // first-seen order of each bucket so the row order in the UI matches
  // the order the changes happened.
  const subgroups: UserChangeSubgroup[] = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, UserChangeSubgroup>();
    entries.forEach(e => {
      if (!e.nodeChange) return;
      const key = e.nodeChange.changeType;
      if (!map.has(key)) {
        order.push(key);
        map.set(key, { changeType: key, entries: [] });
      }
      map.get(key)!.entries.push({ payload: e.nodeChange, timestamp: e.timestamp, id: e.id });
    });
    return order.map(k => map.get(k)!);
  }, [entries]);

  if (subgroups.length === 0) return null;

  // Total change count drives the outer summary. The verb comes from the
  // most recently-emitted change so the header reads as a live "what
  // just happened" summary rather than an arbitrary pick. Reads as
  // "1 node added" / "4 nodes modified".
  const total = entries.length;
  const lastType = entries[entries.length - 1]?.nodeChange?.changeType ?? 'changed';
  const summaryText = `${total} ${total === 1 ? 'node' : 'nodes'} ${lastType.toLowerCase()}`;

  // Side comes from the first entry's payload; all entries in a group share
  // the same side because we only group consecutive same-side mutations.
  const side = entries[0]?.nodeChange?.side ?? 'outbound';

  // Latest timestamp drives the hover-revealed stamp beneath the trail —
  // the group reads as "this is when the most recent change in this batch
  // landed", same convention AIUserMessage uses for its `time` prop.
  const latestTimestamp = entries[entries.length - 1]?.timestamp;

  return (
    <div
      className={clsx(
        styles.nodeChangeBlock,
        side === 'inbound' ? styles.nodeChangeBlockInbound : styles.nodeChangeBlockOutbound,
      )}
    >
      {/* "You" label above the activity trail — mirrors the AIUserMessage
          label so the change group reads as something the user did, with
          the same typographic treatment as a plain text user message. The
          inbound (AI) side keeps no label here because the AI's activity
          context is already conveyed by the surrounding AIAssistantMessage
          chain. */}
      {side === 'outbound' && <AILabel align="user">You</AILabel>}
      <AIActivityTrail
        state="done"
        summary={
          <span className={styles.activityTrailSummary}>
            <Edit05Icon size={14} />
            <span>{summaryText}</span>
          </span>
        }
        className={styles.nodeChangeTrail}
      >
        <div className={styles.userChangeGroupBody}>
          {subgroups.map(sg => (
            <UserChangeSubgroupRow key={sg.changeType} subgroup={sg} />
          ))}
        </div>
      </AIActivityTrail>
      {/* Always-on timestamp beneath the trail. We use the `inline`
          variant rather than the default absolute hover-reveal so the
          stamp is always visible AND takes real layout space — that
          way the AI loader (which renders directly after the last
          thread entry) sits cleanly below the timestamp instead of
          overlapping it via its negative margin-top. */}
      {side === 'outbound' && latestTimestamp != null && (
        <AITimestamp inline align="user" value={latestTimestamp} className={styles.nodeChangeTimestamp} />
      )}
    </div>
  );
}

// ─── AssistantActivityTrail ──────────────────────────────────────────────────────
// Rich activity timeline rendered above every AI response. Mirrors what an
// agent would actually surface — a sequence of thinking, search, file-read,
// code-gen, and content-drafting steps, each with sub-activity log lines.
//
// While the AI is still streaming a response (`isLive` true), the trail walks
// through steps one at a time (`active` → `done`) on a fixed cadence so the
// surface feels alive. When the response ends, the trail snaps to a collapsed
// "Thought for Ns · 5 steps" summary line; the user can click to expand and
// inspect what was done.

type AssistantTrailStepType =
  | 'thinking' | 'tool' | 'search' | 'file' | 'web' | 'code' | 'content';

interface AssistantTrailStep {
  type: AssistantTrailStepType;
  label: string;
  detail?: string;
  subActivities?: string[];
}

const ASSISTANT_TRAIL_STEPS: AssistantTrailStep[] = [
  {
    type: 'thinking',
    label: 'Analyzing request',
    subActivities: [
      'Parsing user intent…',
      'Detected: workflow modification request',
      'Mapping to available tools…',
    ],
  },
  {
    type: 'search',
    label: 'Searching workflows',
    detail: '12 results',
    subActivities: [
      'query: workflows.where(owner_id = current_user)',
      'matched 12 active workflows',
      'ranking by recent edits…',
    ],
  },
  {
    type: 'file',
    label: 'Reading BuilderPage.tsx',
    detail: '234 lines',
    subActivities: [
      'opened src/pages/BuilderPage.tsx',
      'located <FlowCanvas /> render path',
      'extracted current node graph',
    ],
  },
  {
    type: 'code',
    label: 'Generating step configuration',
    subActivities: [
      'building trigger: schedule.daily(09:00)',
      'adding 3 conditions (owner, status, priority)',
      'wiring action: notify(#team-ops)',
      'validating connections…',
    ],
  },
  {
    type: 'content',
    label: 'Drafting response',
  },
];

// Each step holds for ~1.2s before the next becomes active — long enough
// that you can actually read the label and watch the sub-activity log
// lines reveal before it advances.
const ASSISTANT_TRAIL_TICK_MS = 1200;
const ASSISTANT_TRAIL_TOTAL_MS =
  ASSISTANT_TRAIL_TICK_MS * ASSISTANT_TRAIL_STEPS.length;

function AssistantActivityTrail({ isLive }: { isLive: boolean }) {
  const totalSteps = ASSISTANT_TRAIL_STEPS.length;
  // `activeIdx` is the index of the step currently `active`. Steps before
  // it are `done`; steps after it are `pending`. When activeIdx >= total,
  // every step is done and the trail flips to its `done` summary.
  const [activeIdx, setActiveIdx] = useState(isLive ? 0 : totalSteps);

  useEffect(() => {
    if (!isLive) {
      setActiveIdx(totalSteps);
      return;
    }
    setActiveIdx(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setActiveIdx(i);
      if (i >= totalSteps) window.clearInterval(id);
    }, ASSISTANT_TRAIL_TICK_MS);
    return () => window.clearInterval(id);
  }, [isLive, totalSteps]);

  const allDone = activeIdx >= totalSteps;
  const trailState: 'live' | 'done' = isLive && !allDone ? 'live' : 'done';

  // Defer entirely to the trail's own summary now that Alloy renders a
  // typewriter-shimmered current-step label while `live` and expands to
  // the full activity sequence on `done`. The previous AILoader prefix is
  // redundant — the shimmer is the canonical in-flight signal.

  return (
    <AIActivityTrail state={trailState} duration="6s">
      {ASSISTANT_TRAIL_STEPS.map((step, i) => {
        const status: 'pending' | 'active' | 'done' =
          allDone || i < activeIdx
            ? 'done'
            : i === activeIdx
            ? 'active'
            : 'pending';
        return (
          <AIActivityStep
            key={i}
            type={step.type}
            status={status}
            detail={step.detail}
            subActivities={step.subActivities}
          >
            {step.label}
          </AIActivityStep>
        );
      })}
    </AIActivityTrail>
  );
}

// ─── LeftPanel ───────────────────────────────────────────────────────────────────

interface LeftPanelProps {
  onLibNodeDragStart: (item: LibraryItem) => void;
  onLibNodeDragEnd: () => void;
  onLibNodeSelect: (item: LibraryItem) => void;
  aiPrompt: string;
  onAiPromptChange: (v: string) => void;
  aiTyping: boolean;
  entries: ThreadEntry[];
  onAiSend: () => void;
  /** Hoisted from BuilderPage so the surrounding layout can react to the
   *  collapsed state — when collapsed, BuilderPage hides this panel + the
   *  body divider entirely and surfaces a re-open button beneath the top
   *  bar in the right column. */
  onCollapse: () => void;
  /** Navigate back to the workflow list. The back chevron now lives at
   *  the far left of the LeftPanel header (before the Teambridge AI
   *  wordmark) instead of in the right-column TopBar. */
  onBack: () => void;
  /** Current panel width in px — owned by `BuilderPage` so the body grid
   *  column can track it (drag-resize would otherwise only affect this
   *  panel's inline width while the surrounding grid cell stayed locked
   *  at its original 360px). */
  panelWidth: number;
  onPanelWidthChange: (w: number) => void;
}

function LeftPanel({
  onLibNodeDragStart, onLibNodeDragEnd, onLibNodeSelect,
  aiPrompt, onAiPromptChange, aiTyping, entries, onAiSend,
  onCollapse, onBack,
  panelWidth, onPanelWidthChange,
}: LeftPanelProps) {
  // Collapsed is hoisted to BuilderPage — and now so is `panelWidth` so
  // the parent's body grid can track the live width and the right column
  // reclaims space as the user drags.
  const panelWidthRef = useRef(panelWidth);
  useEffect(() => { panelWidthRef.current = panelWidth; }, [panelWidth]);
  const leftHandleRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRootRef = useRef<HTMLDivElement>(null);
  // Hide the scroll-to-bottom button when the thread is already pinned to
  // the bottom — the button only fires when there's content out of view.
  const [isChatAtBottom, setIsChatAtBottom] = useState(true);

  useEffect(() => {
    const root = chatScrollRootRef.current;
    if (!root) return;
    const viewport = root.querySelector('[class*="_viewport_"]') as HTMLElement | null;
    if (!viewport) return;

    const update = (): void => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      // 4px threshold absorbs sub-pixel rounding so the button still hides
      // when the user has visually reached the bottom.
      setIsChatAtBottom(scrollHeight - scrollTop - clientHeight < 4);
    };

    update();
    viewport.addEventListener('scroll', update, { passive: true });
    // Recompute when content grows (new messages) or the viewport resizes
    // (panel drag) — both can flip the at-bottom state without a scroll.
    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    if (viewport.firstElementChild) ro.observe(viewport.firstElementChild);

    return () => {
      viewport.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  // Keep the prompt textarea's height in sync with its content up to the
  // CSS-defined max-height (5 lines via --line-height-loose). Runs on every
  // aiPrompt change — including external clears — so the textarea shrinks
  // back to a single line when the value is reset.
  useEffect(() => {
    const t = promptTextareaRef.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 'px';
  }, [aiPrompt]);

  // Drag-to-resize. Width is owned by the parent (so the body grid column
  // can track the live value); local ref mirrors it during a drag to avoid
  // re-running the effect on every pixel of movement. No click-to-collapse
  // fallback — the handle is now a dedicated resize affordance, not a
  // dual-purpose button.
  useEffect(() => {
    const handle = leftHandleRef.current;
    if (!handle) return;
    const onDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = panelWidthRef.current;
      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const w = Math.min(600, Math.max(280, startWidth + dx));
        panelWidthRef.current = w;
        onPanelWidthChange(w);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    handle.addEventListener('mousedown', onDown);
    return () => handle.removeEventListener('mousedown', onDown);
  }, [onPanelWidthChange]);

  // Entries present at mount render without the typing animation; anything
  // added later is treated as a fresh AI response and types in.
  const initialEntryIdsRef = useRef<Set<string>>(new Set(entries.map(e => e.id)));

  // Auto-scroll on any new entry (or while the AI is typing, to keep the
  // indicator in view).
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, aiTyping]);

  // Group consecutive AI bubbles so the avatar + name header only shows once
  // per run (matches the way humans read threaded chat).
  const isFirstInAiSequence = (idx: number): boolean => {
    if (entries[idx].kind !== 'ai') return false;
    if (idx === 0) return true;
    return entries[idx - 1].kind !== 'ai';
  };

  const formatTime = (ms: number): string => {
    try {
      return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <aside className={styles.leftPanel}>
      {/* Header removed — the AI panel collapse button + wordmark have
          been merged into the unified TopBar that spans the top of the
          builder. The panel itself starts directly with the resize
          handle + composer body. `onCollapse` is no longer used here
          (the toggle lives in TopBar instead) but the prop is kept for
          API symmetry with the resize-handle's click-to-collapse
          fallback below. */}
      {/* ── Handle — drag to resize, click to collapse ── */}
      <div
        ref={leftHandleRef}
        className={styles.leftPanelHandle}
        role="button"
        tabIndex={0}
        aria-label="Collapse or drag to resize panel"
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onCollapse(); }}
      />
      <div className={styles.leftPanelInner}>

        {/* Node palette moved to FlowCanvas — it now lives as an absolute
            child of the canvas card so it floats along the canvas bottom
            edge rather than the viewport bottom. */}

        {/* ── AI Composer ── */}
        {(
        <div className={styles.aiComposer}>

          {/* ── Shell: Alloy AIComposer wraps the thread + input card ── */}
          <AIComposer className={styles.aiComposerShell}>

            {/* Activity feed + AI conversation thread — Alloy ScrollArea
                gives us the styled overlay scrollbar; the inner div carries
                the chat-window flex/gap/padding rules previously applied
                to AIThread. Auto-scroll-to-bottom is driven by the
                `chatBottomRef.scrollIntoView()` effect in this component
                (a ScrollArea ancestor scrolls naturally). The wrapper
                gives the scroll-to-bottom button a positioning context
                that matches the scroll viewport's bounds. */}
            <div className={styles.aiChatBox}>
            <ScrollArea ref={chatScrollRootRef} className={styles.aiChatScroller}>
              <div className={styles.aiChatWindow}>
              {(() => {
                // Identify the most recent AI entry so only it can run the
                // live trail animation; older AI responses always render
                // their trail in the static `done` state.
                const latestAiId = [...entries].reverse().find(e => e.kind === 'ai')?.id;

                // ── Render-time grouping ──
                // Consecutive `node_change` entries with timestamps in the
                // same wall-clock minute fold into a single virtual item so
                // the renderer below can replace them with a UserChangeGroup
                // block. Non-change entries pass through unchanged. We bucket
                // by `Math.floor(ts / 60000)` (UTC-minute index) to keep the
                // grouping deterministic regardless of locale.
                type RenderItem =
                  | { kind: 'entry'; entry: ThreadEntry }
                  | { kind: 'changes'; key: string; entries: ThreadEntry[] };
                const items: RenderItem[] = [];
                entries.forEach((entry) => {
                  if (entry.kind !== 'node_change' || !entry.nodeChange) {
                    items.push({ kind: 'entry', entry });
                    return;
                  }
                  const minuteKey = Math.floor(entry.timestamp / 60000);
                  const last = items[items.length - 1];
                  // Append to the previous group when (a) it's a changes
                  // group, (b) it falls in the same minute, and (c) it
                  // shares the same side. Otherwise start a new group.
                  if (
                    last &&
                    last.kind === 'changes' &&
                    last.key === `${minuteKey}-${entry.nodeChange.side ?? 'outbound'}`
                  ) {
                    last.entries.push(entry);
                  } else {
                    items.push({
                      kind: 'changes',
                      key: `${minuteKey}-${entry.nodeChange.side ?? 'outbound'}`,
                      entries: [entry],
                    });
                  }
                });

                return items.map((item) => {
                  if (item.kind === 'changes') {
                    // Use the first entry's id as the React key — stable
                    // across re-renders because thread entries never
                    // mutate their ids.
                    return (
                      <Fragment key={`changes-${item.entries[0].id}`}>
                        <UserChangeGroup entries={item.entries} />
                      </Fragment>
                    );
                  }
                  const entry = item.entry;
                  const isInitial = initialEntryIdsRef.current.has(entry.id);
                  const isLatestAi = entry.id === latestAiId;
                  // Trail is live whenever the entry is still pending —
                  // intrinsic to the entry, so the trail keeps animating
                  // even if more activity is appended below it.
                  const trailIsLive =
                    entry.kind === 'ai' && !isInitial && isLatestAi && entry.pending === true;
                  return (
                <Fragment key={entry.id}>
                  {entry.kind === 'activity' && (
                    <AIUserMessage time={entry.timestamp}>
                      {entry.content}
                    </AIUserMessage>
                  )}
                  {entry.kind === 'context' && (
                    <div className={styles.threadContextRow}>{entry.content}</div>
                  )}
                  {entry.kind === 'user' && (
                    <AIUserMessage label="You" time={entry.timestamp}>
                      {entry.content}
                    </AIUserMessage>
                  )}
                  {entry.kind === 'ai' && (
                    <>
                      {/* Message body — no `time` prop here so the timestamp
                          isn't rendered above the action group. Instead the
                          timestamp is delegated to the AIMessageActions
                          sibling below via its `time` prop. */}
                      <AIAssistantMessage>
                        {/* Skip the activity trail on the seeded greeting —
                            the first message is a static welcome, not a
                            response to a request, so the "Thought for Ns"
                            summary is misleading there. `seeded` covers the
                            welcome bubble (added via useEffect after mount,
                            so `initialEntryIdsRef` would have missed it). */}
                        {!isInitial && !entry.seeded && (
                          <AssistantActivityTrail isLive={trailIsLive} />
                        )}
                        {/* Hold the message body until the trail has finished
                            its run. While `pending`, only the live trail
                            renders so the user can actually watch it work.
                            Seeded greetings render statically (no typing). */}
                        {entry.pending
                          ? null
                          : (isInitial || entry.seeded)
                          ? <MarkdownText content={entry.content} />
                          : <TypingText content={entry.content} onProgress={() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })} />}
                      </AIAssistantMessage>
                      {/* Action group — rendered as a SIBLING of the message
                          block (not nested inside) so the AIMessageActions
                          CSS lands correctly: its negative margin-top pulls
                          flush against the message above, padding-top
                          recreates an 8px gap as part of the action's hit
                          area, and `[data-author]:hover + .hover` chains
                          the reveal off the message above. The `time` prop
                          renders the timestamp INSIDE the action row,
                          immediately after the buttons. */}
                      {!entry.pending && (
                        <AIMessageActions
                          visibility="always"
                          align="start"
                          time={entry.timestamp}
                        >
                          <Button
                            variant="ghost"
                            size="xs"
                            iconOnly
                            aria-label="Copy"
                            onClick={() => { void navigator.clipboard?.writeText(entry.content); }}
                          >
                            <Copy01Icon size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            iconOnly
                            aria-label="Good response"
                          >
                            <ThumbsUpIcon size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            iconOnly
                            aria-label="Bad response"
                          >
                            <ThumbsDownIcon size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            iconOnly
                            aria-label="Regenerate"
                          >
                            <RefreshCw04Icon size={14} />
                          </Button>
                        </AIMessageActions>
                      )}
                    </>
                  )}
                  {/* `node_change` entries are absorbed into UserChangeGroup
                      via the render-time grouping pass above and never reach
                      this branch. */}
                </Fragment>
                  );
                });
              })()}

              {/* Idle-state AILoader pinned at the end of the conversation —
                  shows only while the AI is NOT actively responding. When
                  `aiTyping` is true, the AssistantActivityTrail's own
                  in-header loader carries the "working" signal, so this
                  bottom loader is suppressed to avoid two simultaneous
                  spinners. The `aiChatLoaderRow` style still pulls the
                  ready-state indicator close under the action row above. */}
              {!aiTyping && (
                <AIAssistantMessage className={styles.aiChatLoaderRow}>
                  <AILoader variant="gradient-fill" size="xs" state="ready" />
                </AIAssistantMessage>
              )}

              <div ref={chatBottomRef} aria-hidden="true" />
              </div>
            </ScrollArea>

            {/* Scroll-to-bottom — square 24px secondary button anchored
                center-bottom of the chat thread. Stays put while the
                thread scrolls and jumps the viewport to the latest
                message on click. */}
            <Button
              variant="secondary"
              size="xs"
              iconOnly
              className={styles.aiChatScrollToBottom}
              data-visible={isChatAtBottom ? undefined : 'true'}
              aria-label="Scroll to latest message"
              aria-hidden={isChatAtBottom ? 'true' : undefined}
              tabIndex={isChatAtBottom ? -1 : 0}
              onClick={() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              <ChevronDownIcon size={12} />
            </Button>
            </div>

            <AIComposerInput
              ref={promptTextareaRef}
              className={styles.aiComposerInputWrapper}
              value={aiPrompt}
              onChange={onAiPromptChange}
              onSubmit={onAiSend}
              placeholder="Ask AI anything…"
              aria-label="Ask AI"
            >
              <ComposerActions size="sm">
                <ComposerAttachment state="idle" aria-label="Attach" />
                <ComposerVoiceButton state="idle" aria-label="Voice input" />
                <ComposerSendButton
                  state={
                    aiTyping
                      ? 'streaming'
                      : aiPrompt.trim().length === 0
                      ? 'hidden'
                      : 'ready'
                  }
                  onSend={onAiSend}
                  aria-label="Send to AI"
                />
              </ComposerActions>
            </AIComposerInput>
          </AIComposer>{/* end aiComposerShell */}
        </div>
        )}
      </div>{/* end leftPanelInner */}
    </aside>
  );
}

// ─── FlowNode ─────────────────────────────────────────────────────────────────

interface FlowNodeProps {
  step: FlowStep;
  isSelected: boolean;
  /** True when the node is part of a marquee / Cmd-click multi-selection.
   *  Drives the same focused visual treatment as `isSelected` (filled
   *  card chrome, accent border) but does NOT open the right-panel
   *  popover — multi-selection is for spatial / batch operations only. */
  isMultiSelected?: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  /** True only when the previous step is the same type — enforces trigger→condition→action order */
  canMoveUp: boolean;
  /** True only when the next step is the same type */
  canMoveDown: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onUpdateStep: (value: string) => void;
  onUpdateConditionConfig: (op: string, vals: string[]) => void;
  onUpdateConfigField: (key: string, value: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  /** When true, clicking this node toggles edit-selection instead of normal select */
  editNodeMode?: boolean;
  /** Whether this node is currently edit-selected (shows AI purple ring) */
  isEditSelected?: boolean;
  /** Update the full conditions list + logic operator for a condition node. */
  onUpdateConditions?: (conditions: ConditionEntry[], logic: 'AND' | 'OR') => void;
  /** Group-based condition updater — forwarded to NodePopover. */
  onUpdateConditionGroups?: (groups: ConditionGroup[]) => void;
  /** Branch-based condition updater — forwarded to NodePopover. */
  onUpdateConditionBranches?: (branches: ConditionBranch[]) => void;
  /** Branch-based policy updater — same shape as `onUpdateConditionBranches`
   *  but for the policy node's `policyBranches` field. */
  onUpdatePolicyBranches?: (branches: PolicyBranch[]) => void;
  hasOutgoingConnections?: boolean;
  /** Edge id for the incoming connection (if any) — used by condition
   *  nodes to mark their per-row LEFT anchor as connected so it can be
   *  click-disconnected just like the legacy wrapper-level anchor. */
  incomingEdgeId?: string;
  /** Map of `branchId → outgoing edge id` for condition source nodes.
   *  Drives the per-row RIGHT anchor's `data-connected` state so each
   *  branch handle behaves like the wrapper-level anchor: `+` when the
   *  branch has no outgoing edge, `−` when one is connected (click to
   *  disconnect). One edge per branch is enforced upstream in the drop
   *  handler. */
  outgoingEdgeByBranch?: Record<string, string>;
  /** Label of the workflow's trigger step — forwarded to NodePopover for the AI Specialist Test tab. */
  triggerLabel?: string;
  /** Forwarded to NodePopover's bottom AI drawer. */
  onNodeAiSubmit?: (message: string, nodeType: StepType) => void;
  /** Fired when the right-panel Save button is clicked — used to commit a
   *  single activity entry summarizing the node's saved configuration. */
  onSaveNodePopover?: (nodeId: string) => void;
}

function FlowNode({
  step,
  isSelected,
  isMultiSelected = false,
  isDragging,
  isDragOver,
  canMoveUp,
  canMoveDown,
  onSelect,
  onDeselect,
  onUpdateStep,
  onUpdateConditionConfig,
  onUpdateConfigField,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  editNodeMode = false,
  isEditSelected = false,
  onUpdateConditions,
  onUpdateConditionGroups,
  onUpdateConditionBranches,
  onUpdatePolicyBranches,
  triggerLabel,
  onNodeAiSubmit,
  onSaveNodePopover,
  incomingEdgeId,
  outgoingEdgeByBranch,
}: FlowNodeProps) {
  const cfg = STEP_CONFIG[step.type];
  const outerRef = useRef<HTMLDivElement>(null);
  // Popover visibility is independent from selection — closing popover keeps node selected.
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(360);
  const panelWidthRef = useRef(360);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = resizeHandleRef.current;
    if (!handle) return;
    const onDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = panelWidthRef.current;
      const onMove = (ev: MouseEvent) => {
        const w = Math.min(600, Math.max(360, startWidth + (startX - ev.clientX)));
        panelWidthRef.current = w;
        setPanelWidth(w);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    handle.addEventListener('mousedown', onDown);
    return () => handle.removeEventListener('mousedown', onDown);
  // Re-attach when the panel opens/closes so the ref is always current
  }, [popoverOpen, isSelected, isDragging, editNodeMode]);

  // ── Dots menu groups for Alloy DropdownMenu ──
  const dotsMenuGroups: DropdownMenuGroup[] = [
    {
      id: 'actions',
      options: [
        {
          id: 'duplicate',
          label: 'Duplicate',
          leadingSlot: <Copy01Icon size={14} />,
          onClick: onDuplicate,
        },
        ...(canMoveUp ? [{
          id: 'move-up',
          label: 'Move up',
          leadingSlot: <MoveUpSmallIcon />,
          onClick: onMoveUp,
        }] : []),
        ...(canMoveDown ? [{
          id: 'move-down',
          label: 'Move down',
          leadingSlot: <MoveDownSmallIcon />,
          onClick: onMoveDown,
        }] : []),
      ],
    },
    {
      id: 'danger',
      options: [
        {
          id: 'delete',
          label: 'Delete',
          leadingSlot: <Trash03Icon size={14} />,
          destructive: true,
          onClick: onDelete,
        },
      ],
    },
  ];

  // Open popover whenever node becomes selected; close when deselected.
  useEffect(() => {
    if (isSelected) {
      setPopoverOpen(true);
    } else {
      setPopoverOpen(false);
    }
  }, [isSelected]);

  // Popover is suppressed while editNodeMode is active (click = edit-select, not config).
  // It's also gated strictly on `isSelected` (not multi-select) so a marquee
  // sweep doesn't pop the right-panel for every node it touches.
  const showPopover = isSelected && popoverOpen && !isDragging && !editNodeMode;

  // `focused` is the union of single-select + multi-select for VISUAL
  // purposes — both states get the filled active card chrome. The
  // popover keeps its strict `isSelected`-only gate above.
  const focused = isSelected || isMultiSelected;
  const isDelay = step.type === 'delay';
  const isTrigger = step.type === 'trigger';
  const isAction = step.type === 'action';
  const isCondition = step.type === 'condition';
  const isPolicy = step.type === 'policy';
  const isAi = step.type === 'ai';
  const isPill = isDelay || isTrigger;
  const pillFocused = isPill && focused && !editNodeMode;
  const actionFocused = isAction && focused && !editNodeMode;
  const conditionActive = isCondition && focused && !editNodeMode;
  const policyActive = isPolicy && focused && !editNodeMode;
  const aiFocused = isAi && focused && !editNodeMode;

  return (
    <div
      ref={outerRef}
      className={clsx(
        styles.flowNodeOuter,
        isDelay && styles.flowNodeOuterDelay,
        isTrigger && styles.flowNodeOuterTrigger,
        isAction && styles.flowNodeOuterAction,
        isCondition && styles.flowNodeOuterCondition,
        isPolicy && styles.flowNodeOuterPolicy,
        isAi && styles.flowNodeOuterAi,
        focused && !editNodeMode && !isPill && !isAction && !isCondition && !isPolicy && !isAi && styles.flowNodeOuterSelected,
        isDragging && styles.flowNodeOuterDragging,
        isDragOver && styles.flowNodeOuterDragOver,
        isEditSelected && styles.flowNodeOuterEditSelected,
      )}
      onClick={() => {
        // In edit mode, selection is handled by FlowCanvas mousedown — suppress here
        if (editNodeMode) return;
        onSelect();
        if (isSelected) setPopoverOpen(true);
      }}
      role="button"
      tabIndex={0}
      aria-pressed={editNodeMode ? isEditSelected : isSelected}
      onKeyDown={(e) => { if (e.key === 'Enter' && !editNodeMode) { onSelect(); if (isSelected) setPopoverOpen(true); } }}
    >
      {isDelay ? (
        <div
          className={clsx(
            styles.delayPill,
            step.configured && step.selectedValue && styles.delayPillFilled,
            pillFocused && styles.delayPillFocused,
          )}
        >
          <ClockIcon size={14} />
          <span>{step.configured && step.selectedValue ? step.selectedValue : 'Add Delay'}</span>
        </div>
      ) : isTrigger ? (() => {
        // Prefer the contextual snippet (e.g. "Google Link completed") when
        // the trigger has enough config to build one; fall back to the raw
        // selected label, then to the empty-state placeholder.
        let triggerText = 'Select trigger...';
        if (step.configured && step.selectedValue) {
          const segs = buildNodeSnippet(step);
          triggerText = segs
            ? segs.map(s => s.text).join('').trim()
            : step.selectedValue;
        }
        // Surface the right-panel "Modify Timing" config inline on the
        // pill (e.g. "1 Min After") once all three timing keys are set.
        // Absent → no caption rendered. Stored on `step.configValues`
        // under `modify_timing_amount / _unit / _direction` (see
        // MODIFY_TIMING_KEYS).
        const tAmount    = step.configValues?.[MODIFY_TIMING_KEYS.amount]    ?? '';
        const tUnit      = step.configValues?.[MODIFY_TIMING_KEYS.unit]      ?? '';
        const tDirection = step.configValues?.[MODIFY_TIMING_KEYS.direction] ?? '';
        const timingActive = tUnit !== '' && tDirection !== '';
        const timingText = timingActive ? `${tAmount || '1'} ${tUnit} ${tDirection}` : null;
        return (
          <div
            className={clsx(
              styles.triggerPill,
              step.configured && step.selectedValue && styles.triggerPillFilled,
              pillFocused && styles.triggerPillFocused,
            )}
          >
            <PlayIcon size={14} aria-hidden />
            <span>{triggerText}</span>
            {timingText && (
              <span className={styles.triggerPillTiming} aria-label="Modify timing">
                {timingText}
              </span>
            )}
          </div>
        );
      })() : isCondition ? (() => {
        let branches = deriveConditionBranches(step);
        // Legacy / synthetic fallback — when a condition has no branches at
        // all (older persisted state), synthesize a single empty IF branch
        // so the canvas card always renders the multi-row layout instead
        // of collapsing to nothing.
        if (branches.length === 0) {
          branches = [{ id: 'b-empty', groups: [{ id: 'g-empty', conditions: [makeEmptyCondition()] }] }];
        }
        const total = countConditionsInBranches(branches);
        const filled = total > 0;
        const isActive = conditionActive;

        // Always render the multi-row layout — each IF branch as its own
        // sub-card row with a right-edge anchor, plus the catch-all ELSE
        // row at the bottom. The outer node-edge anchor is suppressed for
        // filled conditions (see the `!isCondition || !filled` guard
        // around the anchor div) so each row's anchor becomes the
        // canonical outgoing handle for that branch.
        return (
          <div
            className={styles.conditionNodeCard}
            data-active={isActive ? 'true' : 'false'}
            data-filled="true"
            data-branches="true"
          >
            {/* Card-level filter icon + node-type label — single leading
                strip sits above the row list instead of repeating on
                every IF/ELSE row, so the node reads as one container
                with stacked branches rather than independent cards.
                Mirrors the policy card's "icon + type label" header,
                with the label kept in the slate scale to match the
                condition card's neutral palette. */}
            <div className={styles.conditionNodeHeader}>
              <span className={styles.conditionNodeIconBox} aria-label={cfg.label}>
                <FilterLinesIcon size={14} />
              </span>
              <span className={styles.nodeHeaderLabel}>Condition</span>
            </div>
            <div className={styles.conditionBranchRowList}>
              {branches.map(branch => (
                <Fragment key={branch.id}>
                <div className={styles.conditionBranchRow}>
                  <div className={styles.conditionBranchRowInner}>
                    <span className={styles.conditionBranchKeyword}>IF</span>
                    <span className={styles.conditionBranchExpr}>
                      {branch.groups.map((g, gi) => (
                        <Fragment key={g.id}>
                          {g.conditions.map((c, ci) => {
                            const def = CONDITION_LIBRARY.find(d => d.id === c.fieldId) ?? null;
                            const opLabel = OPERATOR_LABELS[c.operator] ?? c.operator;
                            const isLastInGroup = ci === g.conditions.length - 1;
                            const isLastGroup = gi === branch.groups.length - 1;
                            const trailingPill = !isLastInGroup
                              ? 'AND'
                              : !isLastGroup
                                ? 'OR'
                                : null;
                            return (
                              <span key={`${g.id}-${ci}`} className={styles.conditionBranchExprLine}>
                                <span className={clsx(
                                  styles.conditionBranchExprLabel,
                                  !def && styles.conditionBranchExprPlaceholder,
                                )}>
                                  {def?.label ?? 'Add condition'}
                                </span>
                                {/* Suppress operator + values when the row has
                                    no field yet — the placeholder label stands
                                    on its own without a trailing "is". */}
                                {def && opLabel && (
                                  <span className={styles.conditionExprMuted}> {opLabel}</span>
                                )}
                                {def && c.values.length > 0 && (
                                  <span className={styles.conditionBranchExprValue}>
                                    {' '}
                                    {c.values.join(', ')}
                                  </span>
                                )}
                                {trailingPill === 'AND' && (
                                  <Tag
                                    size="sm"
                                    variant="subtle"
                                    color="neutral"
                                    className={styles.conditionBranchPill}
                                  >
                                    {trailingPill}
                                  </Tag>
                                )}
                                {trailingPill === 'OR' && (
                                  // OR separates groups — drop it onto its own
                                  // line so the visual hierarchy reads as
                                  // grouped conditions stacked under each
                                  // OR break, instead of an inline trailing
                                  // pill that hides the boundary.
                                  <span className={styles.conditionBranchOrBreak}>
                                    <Tag
                                      size="sm"
                                      variant="subtle"
                                      color="neutral"
                                      className={styles.conditionBranchPill}
                                    >
                                      {trailingPill}
                                    </Tag>
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </Fragment>
                      ))}
                    </span>
                  </div>
                  {(() => {
                    const branchEdgeId = outgoingEdgeByBranch?.[branch.id];
                    return (
                      <div
                        className={clsx(styles.anchor, styles.anchorRight, styles.conditionBranchAnchor)}
                        data-anchor="right"
                        data-anchor-node-id={step.id}
                        data-anchor-branch-id={branch.id}
                        data-connected={branchEdgeId ? 'true' : undefined}
                        data-anchor-edge-id={branchEdgeId}
                      />
                    );
                  })()}
                </div>
                </Fragment>
              ))}
              {/* ELSE catch-all row — renders after the last IF branch and
                  carries its own outgoing anchor so the "matches everything
                  else" path can fan out independently. */}
              <div className={clsx(styles.conditionBranchRow, styles.conditionElseRow)}>
                <div className={styles.conditionBranchRowInner}>
                  <span className={styles.conditionBranchKeyword}>ELSE</span>
                </div>
                {(() => {
                  const elseEdgeId = outgoingEdgeByBranch?.['else'];
                  return (
                    <div
                      className={clsx(styles.anchor, styles.anchorRight, styles.conditionBranchAnchor)}
                      data-anchor="right"
                      data-anchor-node-id={step.id}
                      data-anchor-branch-id="else"
                      data-connected={elseEdgeId ? 'true' : undefined}
                      data-anchor-edge-id={elseEdgeId}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })() : isAction ? (() => {
        const actionFilled = step.configured && !!step.selectedValue;
        return (
          <div
            className={clsx(
              styles.actionNodeCard,
              actionFocused && styles.actionNodeCardFocused,
            )}
            data-active={actionFocused ? 'true' : 'false'}
            data-filled={actionFilled ? 'true' : 'false'}
          >
            {/* Card-level leading icon + node-type label — mirrors the
                condition / policy card layout (header above a single
                body row). The label keeps the slate scale to match the
                action card's neutral chrome (only policy uses the
                rose-tinted variant). */}
            <div className={styles.conditionNodeHeader}>
              <span
                className={clsx(
                  styles.actionNodeIconBox,
                  actionFilled && styles.actionNodeIconBoxFilled,
                )}
                aria-label={cfg.label}
              >
                {(() => {
                  const icon = getStepIcon(step);
                  return isValidElement(icon)
                    ? cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 14 })
                    : <ArrowCircleBrokenRightIcon size={14} />;
                })()}
              </span>
              <span className={styles.nodeHeaderLabel}>Action</span>
            </div>
            <div className={styles.conditionBranchRowList}>
              <div className={styles.conditionBranchRow}>
                <div className={styles.conditionBranchRowInner}>
                  <span className={styles.conditionBranchExpr}>
                    <span className={styles.conditionBranchExprLine}>
                      {actionFilled ? (
                        (() => {
                          const segs = buildNodeSnippet(step);
                          if (segs) {
                            return segs.map((seg, i) => (
                              <span
                                key={i}
                                className={
                                  seg.role === 'val'
                                    ? styles.conditionBranchExprValue
                                    : seg.role === 'op'
                                    ? styles.conditionExprMuted
                                    : styles.conditionBranchExprLabel
                                }
                              >
                                {i > 0 ? ' ' : ''}{seg.text}
                              </span>
                            ));
                          }
                          return <span className={styles.conditionBranchExprLabel}>{step.selectedValue}</span>;
                        })()
                      ) : (
                        <span className={clsx(
                          styles.conditionBranchExprLabel,
                          styles.conditionBranchExprPlaceholder,
                        )}>
                          {step.placeholder}
                        </span>
                      )}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })() : isAi ? (() => {
        // Resolve the configured persona (if any) so the canvas card can
        // surface the picked specialist's avatar + name instead of the
        // generic Teambridge AI diamond. Mirrors the right-panel
        // AiSpecialistMeta resolution: literal `selectedValue: 'AI Specialist'`
        // gates the configured branch, and `configValues.ai_persona_id`
        // points at the AI_PERSONAS row.
        const personaId = step.configValues?.ai_persona_id;
        const personaConfigured =
          step.selectedValue === 'AI Specialist' && !!personaId;
        const persona = personaConfigured ? getPersonaById(personaId) : null;
        const aiFilled = step.configured && !!step.selectedValue;
        return (
          <div
            className={clsx(
              styles.aiNodeCard,
              aiFocused && styles.aiNodeCardFocused,
            )}
            data-active={aiFocused ? 'true' : 'false'}
            data-filled={aiFilled ? 'true' : 'false'}
          >
            {/* Centered layout — translucent sparkle circle on top, two
                stacked text lines beneath. Matches the AI specialist card
                Figma design. */}
            <div className={styles.aiNodeCardBody}>
              <span
                className={styles.aiNodeSparkleCircle}
                aria-label={persona ? `${persona.name} — ${persona.role}` : cfg.label}
              >
                <TeambridgeAIIcon size={20} />
              </span>
              <div className={styles.aiNodeText}>
                <span className={styles.aiNodeEyebrow}>AI Specialist</span>
                {aiFilled ? (
                  <span className={styles.aiNodeName}>
                    {persona?.name ?? step.selectedValue}
                  </span>
                ) : (
                  <span className={styles.aiNodePlaceholder}>Add a Specialist</span>
                )}
              </div>
            </div>
          </div>
        );
      })() : isPolicy ? (() => {
        let branches = derivePolicyBranches(step);
        // Synthesize an empty placeholder branch when none configured so
        // the multi-row layout always renders (mirrors the condition node
        // empty-state behavior).
        if (branches.length === 0) branches = [makeEmptyPolicyBranch()];
        const isActive = policyActive;

        return (
          <div
            className={styles.policyNodeCard}
            data-active={isActive ? 'true' : 'false'}
            data-filled="true"
            data-branches="true"
          >
            {/* Card header — leading triangle/warning icon followed by
                the node-type label so the policy card identifies its
                type at a glance, mirroring the condition card layout. */}
            <div className={styles.conditionNodeHeader}>
              <span className={styles.policyNodeIconBox} aria-label={cfg.label}>
                <TriangleUpIcon size={14} />
              </span>
              <span className={styles.nodeHeaderLabel}>Policy</span>
            </div>
            <div className={styles.conditionBranchRowList}>
              {branches.map(branch => {
                const sel: PolicySelectionSnapshot = {
                  folders: branch.folders,
                  policies: branch.policies,
                  subPolicies: branch.subPolicies,
                };
                const anySelected = sel.folders.length + sel.policies.length + sel.subPolicies.length > 0;
                const summary = anySelected ? formatPolicyShortSummary(sel) : null;
                const thresholdLabel = anySelected
                  ? (branch.thresholdMode === 'percentage'
                      ? `${branch.thresholdValue || '0'}%`
                      : `${branch.thresholdValue || '0'}/100`)
                  : null;
                return (
                  <div key={branch.id} className={styles.conditionBranchRow}>
                    <div className={styles.conditionBranchRowInner}>
                      <span className={styles.conditionBranchKeyword}>IF</span>
                      <span className={styles.conditionBranchExpr}>
                        <span className={styles.conditionBranchExprLine}>
                          {anySelected ? (
                            <span className={styles.conditionBranchExprLabel}>{summary}</span>
                          ) : (
                            <span className={clsx(
                              styles.conditionBranchExprLabel,
                              styles.conditionBranchExprPlaceholder,
                            )}>
                              All policies selected
                            </span>
                          )}
                        </span>
                      </span>
                      {anySelected && thresholdLabel && (
                        <span className={styles.conditionBranchExprThresholdTag}>{thresholdLabel}</span>
                      )}
                    </div>
                    {(() => {
                      const branchEdgeId = outgoingEdgeByBranch?.[branch.id];
                      return (
                        <div
                          className={clsx(styles.anchor, styles.anchorRight, styles.conditionBranchAnchor)}
                          data-anchor="right"
                          data-anchor-node-id={step.id}
                          data-anchor-branch-id={branch.id}
                          data-connected={branchEdgeId ? 'true' : undefined}
                          data-anchor-edge-id={branchEdgeId}
                        />
                      );
                    })()}
                  </div>
                );
              })}
              {/* ELSE catch-all row — same as the condition node. */}
              <div className={clsx(styles.conditionBranchRow, styles.conditionElseRow)}>
                <div className={styles.conditionBranchRowInner}>
                  <span className={styles.conditionBranchKeyword}>ELSE</span>
                </div>
                {(() => {
                  const elseEdgeId = outgoingEdgeByBranch?.['else'];
                  return (
                    <div
                      className={clsx(styles.anchor, styles.anchorRight, styles.conditionBranchAnchor)}
                      data-anchor="right"
                      data-anchor-node-id={step.id}
                      data-anchor-branch-id="else"
                      data-connected={elseEdgeId ? 'true' : undefined}
                      data-anchor-edge-id={elseEdgeId}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })() : (
      <div className={styles.flowNode}>
        <div className={styles.nodeHeading}>
          {/* Type badge */}
          <span className={clsx(styles.nodeTypeBadge, cfg.bgClass)} aria-label={cfg.label}>
            {getStepIcon(step)}
          </span>
          {/* Spacer to balance absolutely-positioned dots button */}
          <div style={{ width: 24 }} aria-hidden />
        </div>
        <div className={styles.nodeBody}>
          <div className={styles.nodeSelectBox}>
            {step.configured && step.selectedValue ? (
              <div className={styles.nodeConfigSummary} data-type={step.type}>
                {(() => {
                  const segs = buildNodeSnippet(step);
                  if (segs) {
                    return segs.map((seg, i) => (
                      <span key={i} className={
                        seg.role === 'val' ? styles.nodeConfigVal :
                        seg.role === 'op'  ? styles.nodeConfigOp  :
                        styles.nodeConfigLabel
                      }>{seg.text}</span>
                    ));
                  }
                  // Fallback: plain label (no config filled yet)
                  return <span className={styles.nodeConfigLabel}>{step.selectedValue}</span>;
                })()}
              </div>
            ) : (
              <span className={styles.nodeSelectPlaceholder}>{step.placeholder}</span>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Config popover — fixed to right side of screen */}
      {showPopover && createPortal(
        <div className={styles.rightPanel} style={{ width: panelWidth }}>
          <div ref={resizeHandleRef} className={styles.rightPanelResizeHandle} />
          <NodePopover
            step={step}
            onSelectSuggestion={(value) => onUpdateStep(value)}
            onUpdateConditionConfig={onUpdateConditionConfig}
            onUpdateConfigField={onUpdateConfigField}
            onClose={() => setPopoverOpen(false)}
            onUpdateConditions={onUpdateConditions}
            onUpdateConditionGroups={onUpdateConditionGroups}
            onUpdateConditionBranches={onUpdateConditionBranches}
            onUpdatePolicyBranches={onUpdatePolicyBranches}
            onNodeAiSubmit={onNodeAiSubmit}
            triggerLabel={triggerLabel}
            onSave={onSaveNodePopover ? () => onSaveNodePopover(step.id) : undefined}
            dotsMenuGroups={dotsMenuGroups}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── InsertPopover ─────────────────────────────────────────────────────────────

interface InsertPopoverProps {
  parentId: string | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  anchorRect: DOMRect;
  onInsert: (type: StepType, value?: string) => void;
  onClose: () => void;
}

function InsertPopover({ parentId, nodes, edges, anchorRect, onInsert, onClose }: InsertPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<SearchTabValue>('all');

  const PANEL_W = 360;
  const leftPanel = document.querySelector('[class*="leftPanel"]');
  const canvasLeft = leftPanel ? leftPanel.getBoundingClientRect().right + 12 : 12;
  const left = anchorRect.right + 12 + PANEL_W <= window.innerWidth
    ? anchorRect.right + 12
    : Math.max(canvasLeft, anchorRect.left - 12 - PANEL_W);
  const pos = { top: anchorRect.top - 10, left };

  // Items valid at this insertion point — filtered by tab + search query.
  const allValid = ALL_LIBRARY_ITEMS.filter(item =>
    canAddNodeAfter(parentId, item.type, nodes, edges)
  );
  const validTypes = Array.from(new Set(allValid.map(i => i.type)));
  const tabOrder: SearchTabValue[] = ['all', ...SEARCH_TAB_ORDER.filter(
    (t): t is StepType => t !== 'all' && validTypes.includes(t as StepType)
  )];
  const q = search.trim().toLowerCase();
  const filtered = allValid.filter(item => {
    if (selectedTab !== 'all' && item.type !== selectedTab) return false;
    if (q === '') return true;
    return item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });
  const grouped = SEARCH_TAB_ORDER
    .filter((t): t is StepType => t !== 'all')
    .map(type => ({ type, rows: filtered.filter(i => i.type === type) }))
    .filter(g => g.rows.length > 0);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000 }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className={styles.searchResultsPanel} role="dialog" aria-label="Insert node">
        <div className={styles.searchInputRow}>
          <SearchSmIcon size={16} />
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search nodes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <FilterPillGroup className={styles.searchTabsRow} aria-label="Filter by node type">
          {tabOrder.map(tab => (
            <FilterPill
              key={tab}
              active={selectedTab === tab}
              onClick={() => setSelectedTab(tab)}
            >
              {SEARCH_TAB_LABEL[tab]}
            </FilterPill>
          ))}
        </FilterPillGroup>

        <div className={styles.searchResults}>
          {grouped.length === 0 ? (
            <div className={styles.searchEmpty}>No results</div>
          ) : (
            grouped.map(group => (
              <div key={`group:${group.type}`} className={styles.searchSection}>
                <div className={styles.searchSectionHeader}>{STEP_GROUP_HEADING[group.type]}</div>
                {group.rows.map(item => (
                  <button
                    key={`${item.type}:${item.id}`}
                    type="button"
                    className={styles.searchResultRow}
                    onClick={() => { onInsert(item.type, item.label); onClose(); }}
                  >
                    <span className={styles.searchResultIcon}>{getSearchResultIcon(item)}</span>
                    <span className={styles.searchResultLabel}>{item.label}</span>
                    <Tag variant="outline" size="sm" className={styles.searchResultTypeTag}>
                      {STEP_TOOLTIP_LABEL[item.type]}
                    </Tag>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}


// ─── EmptyCanvasState ─────────────────────────────────────────────────────────

function EmptyCanvasState({ onAddTrigger }: { onAddTrigger: () => void }) {
  return (
    <div className={styles.emptyState}>
      <div className={clsx(styles.emptyStateIcon, styles.iconTrigger)}>
        <Target04Icon size={20} />
      </div>
      <p className={styles.emptyStateTitle}>Start with a trigger</p>
      <p className={styles.emptyStateDesc}>
        Choose the event that kicks off this automation
      </p>
      <Button variant="primary" size="md" leadingArtwork={<PlusIcon />} onClick={onAddTrigger} className={styles.emptyStateCta}>
        Add trigger
      </Button>
    </div>
  );
}

// ─── ZoomControls ──────────────────────────────────────────────────────────────

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onTidyUp: () => void;
}

function ZoomControls({ zoom, onZoomIn, onZoomOut, onFit, onTidyUp }: ZoomControlsProps) {
  const pct = Math.round(zoom * 100);
  return (
    <div className={styles.zoomControls}>
      <button className={styles.zoomBtn} onClick={onZoomIn} aria-label={`Zoom in (${pct}%)`}><ZoomInIcon /></button>
      <span className={styles.zoomLevel}>{pct}%</span>
      <button className={styles.zoomBtn} onClick={onZoomOut} aria-label={`Zoom out (${pct}%)`}><ZoomOutIcon /></button>
      <button className={styles.zoomBtn} onClick={onFit} aria-label="Reset view"><FitIcon /></button>
      <span className={styles.zoomDivider} aria-hidden />
      <button className={clsx(styles.zoomBtn, styles.tidyBtn)} onClick={onTidyUp} aria-label="Tidy up layout">
        <Grid01Icon size={12} />
        <span>Tidy up</span>
      </button>
    </div>
  );
}

// ─── FlowCanvas ───────────────────────────────────────────────────────────────

interface PendingEdge {
  fromNodeId: string;
  fromCase?: string | null;
  /** When the drag originated from a per-branch anchor on a condition node,
   *  carries the branch id so the resulting edge can be tagged with
   *  `fromBranchId` and routed from the correct anchor. */
  fromBranchId?: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  screenX?: number;
  screenY?: number;
}

interface TypePickerPos {
  screenX: number;
  screenY: number;
  canvasX: number;
  canvasY: number;
}

interface EdgeDragDrop {
  fromNodeId: string;
  fromNodeType: StepType;
  fromCase?: string | null;
  anchorX: number;
  anchorY: number;
  canvasX: number;
  canvasY: number;
  screenX: number;
  screenY: number;
}

// ─── NodeAiFloatingInput ──────────────────────────────────────────────────────

interface NodeAiFloatingInputProps {
  step: FlowStep;
  /** Canvas-space position: center-x of node, just below node bottom */
  left: number;
  top: number;
  /** Current canvas zoom — used to counter-scale so the input stays a
   *  constant visual size regardless of zoom level. */
  zoom: number;
  /** Submits the prompt to the shared left-panel thread. */
  onSubmit: (message: string, nodeType: StepType) => void;
}

function NodeAiFloatingInput({ step, left, top, zoom, onSubmit }: NodeAiFloatingInputProps) {
  const [aiPrompt, setAiPrompt] = useState('');

  const handleSend = useCallback(() => {
    const text = aiPrompt.trim();
    if (!text) return;
    onSubmit(text, step.type);
    setAiPrompt('');
  }, [aiPrompt, step.type, onSubmit]);

  return (
    <div
      className={styles.nodeAiFloat}
      style={{
        left,
        top,
        // Counter-scale the canvas zoom so this floating input keeps a
        // constant on-screen size. Origin 'top center' anchors the
        // horizontally-centered top edge to (left, top).
        transform: `translateX(-50%) scale(${1 / zoom})`,
        transformOrigin: 'top center',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className={styles.popoverAiWrap}>
        <div className={styles.popoverAiCard}>
          <textarea
            className={styles.aiComposerTextarea}
            placeholder="Tell AI what you want to build..."
            rows={1}
            value={aiPrompt}
            onChange={e => {
              setAiPrompt(e.target.value);
              const t = e.target;
              t.style.height = 'auto';
              t.style.height = t.scrollHeight + 'px';
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <div className={styles.popoverAiActionBar}>
            <button type="button" className={styles.aiComposerMicBtn} aria-label="Voice input">
              <Microphone02Icon size={14} />
            </button>
            <button
              className={styles.aiComposerSendBtn}
              onClick={handleSend}
              disabled={!aiPrompt.trim()}
              aria-label="Send to AI"
            >
              <ArrowNarrowUpIcon size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Connection validation ────────────────────────────────────────────────────

/**
 * Determines whether connecting `fromId` → `toId` is valid given the graph rules.
 * Returns null when valid, or a short human-readable error string when invalid.
 *
 * Rules:
 *  - Actions are terminal — no outputs allowed
 *  - Triggers are source-only — no inputs allowed
 *  - Nodes inside a formal condition group cannot receive direct connections
 *    (the group owns its input via the group-level anchor)
 */
/** Connections that should be rejected without surfacing any error toast to
 *  the user. Currently just the spec-blocked Delay→Delay and Policy→Policy
 *  pairs; conditions can fan out to any number of downstream nodes. */
function isConnectionSilentlyBlocked(
  fromId: string,
  toId: string,
  nodes: GraphNode[],
  _edges: GraphEdge[] = [],
): boolean {
  const fromNode = nodes.find(n => n.id === fromId);
  const toNode   = nodes.find(n => n.id === toId);
  if (!fromNode || !toNode) return false;
  // Delay → Delay is blocked silently per spec
  if (fromNode.type === 'delay' && toNode.type === 'delay') return true;
  // Policy → Policy is blocked silently per spec — policies can't stack
  if (fromNode.type === 'policy' && toNode.type === 'policy') return true;
  return false;
}

function getConnectionError(
  fromId: string,
  toId: string,
  nodes: GraphNode[],
): string | null {
  if (fromId === toId) return "Can't connect to self";

  const fromNode = nodes.find(n => n.id === fromId);
  const toNode   = nodes.find(n => n.id === toId);
  if (!fromNode || !toNode) return 'Node not found';

  // Delay → Delay is silently rejected upstream; callers should use
  // isConnectionSilentlyBlocked first to avoid surfacing this error toast.
  if (fromNode.type === 'delay' && toNode.type === 'delay') {
    return 'Delay cannot connect to another Delay';
  }

  // Policy → Policy is silently rejected upstream (like delay → delay)
  if (fromNode.type === 'policy' && toNode.type === 'policy') {
    return 'Policy cannot connect to another Policy';
  }

  // AI nodes can only chain to another action or AI specialist.
  // Actions are unrestricted (any non-trigger target — the trigger
  // guard below catches `toNode.type === 'trigger'`).
  if (fromNode.type === 'ai') {
    if (toNode.type !== 'action' && toNode.type !== 'ai') {
      return "AI nodes can only connect to another Action or AI node";
    }
  }

  // Triggers accept no incoming edges (they're always graph roots).
  // Note: any non-trigger target accepts MULTIPLE incoming edges,
  // which means several triggers can fan into the same node — the
  // duplicate guard in `appendEdgeIfMissing` only rejects exact
  // (from, to) repeats, so distinct sources to the same target stay
  // valid. This is what powers multi-trigger workflows: drop a second
  // (or third) trigger and drag-connect each to a shared downstream
  // condition / action / AI / delay / policy node.
  if (toNode.type === 'trigger') {
    return "Can't connect to a trigger";
  }

  return null; // valid
}

// ─── FlowCanvas ───────────────────────────────────────────────────────────────

interface FlowCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodePositions: Record<string, { x: number; y: number }>;
  selectedId: string | null;
  draggingLibNode: LibraryItem | null;
  onSelectNode: (id: string) => void;
  onDeselectNode: () => void;
  onUpdateNode: (id: string, value: string) => void;
  onUpdateNodeCondition: (id: string, op: string, vals: string[]) => void;
  onUpdateNodeConfigField: (id: string, key: string, value: string) => void;
  onDuplicateNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onAddNodeAfter: (parentId: string | null, type: StepType, selectedValue?: string) => void;
  onAddRootTrigger: () => void;
  onInsertOnEdge: (edge: GraphEdge, type: StepType, value?: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onSetAllPositions: (positions: Record<string, { x: number; y: number }>) => void;
  onAddEdge: (fromNodeId: string, toNodeId: string, fromBranchId?: string | null) => void;
  onDeleteEdge: (edgeId: string) => void;
  onCreateNodeAt: (type: StepType, x: number, y: number) => void;
  onCreateNodeAndConnect: (fromId: string, type: StepType, x: number, y: number) => void;
  onCanvasDropAtPos: (item: LibraryItem, x: number, y: number) => void;
  editNodeMode: boolean;
  editingNodeIds: Set<string>;
  onEditNodeToggle: (id: string, multi: boolean) => void;
  /** Update the full conditions list and logic operator for a condition node. */
  onUpdateConditions?: (nodeId: string, conditions: ConditionEntry[], logic: 'AND' | 'OR') => void;
  /** Group-based condition updater — forwards `(nodeId, groups)`. */
  onUpdateConditionGroups?: (nodeId: string, groups: ConditionGroup[]) => void;
  /** Branch-based condition updater — forwards `(nodeId, branches)`. */
  onUpdateConditionBranches?: (nodeId: string, branches: ConditionBranch[]) => void;
  onUpdatePolicyBranches?: (nodeId: string, branches: PolicyBranch[]) => void;
  autoTidyToken?: number;
  fitToken?: number;
  /** Submits a prompt from the floating node-level AI input into the main
   *  left-panel thread. Receives the raw message + the originating node type. */
  onNodeAiSubmit?: (message: string, nodeType: StepType) => void;
  /** Commits the right-panel Save for a given node — emits a single activity
   *  entry summarizing the node's saved configuration. */
  onSaveNodePopover?: (nodeId: string) => void;
  /** Library palette handlers — wired through so the floating palette can
   *  live inside the canvas card while still emitting drag/select events
   *  back to BuilderPage's draggingLibNode state. */
  onLibNodeDragStart: (item: LibraryItem) => void;
  onLibNodeDragEnd: () => void;
  onLibNodeSelect: (item: LibraryItem) => void;
}

function FlowCanvas({
  nodes, edges, nodePositions, selectedId, draggingLibNode,
  onSelectNode, onDeselectNode, onUpdateNode, onUpdateNodeCondition, onUpdateNodeConfigField,
  onDuplicateNode, onDeleteNode, onAddRootTrigger,
  onInsertOnEdge, onPositionChange, onSetAllPositions, onAddEdge, onDeleteEdge, onCreateNodeAt, onCreateNodeAndConnect, onCanvasDropAtPos,
  editNodeMode, editingNodeIds, onEditNodeToggle,
  onUpdateConditions,
  onUpdateConditionGroups,
  onUpdateConditionBranches,
  onUpdatePolicyBranches,
  autoTidyToken,
  fitToken,
  onNodeAiSubmit,
  onSaveNodePopover,
  onLibNodeDragStart,
  onLibNodeDragEnd,
  onLibNodeSelect,
}: FlowCanvasProps) {

  const canvasRef      = useRef<HTMLDivElement>(null);
  const graphContentRef = useRef<HTMLDivElement>(null);
  const [pan,  setPan]  = useState({ x: INIT_PAN_X, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [selectedNodeH, setSelectedNodeH] = useState(NODE_H);
  const [, setCanvasDragOver] = useState(false);
  const [isTidying, setIsTidying] = useState(false);
  const [edgeInsert, setEdgeInsert] = useState<{ edge: GraphEdge; anchorRect: DOMRect } | null>(null);
  const [pendingEdge, setPendingEdge] = useState<PendingEdge | null>(null);
  const [typePickerPos, setTypePickerPos] = useState<TypePickerPos | null>(null);
  const [edgeDragDrop, setEdgeDragDrop] = useState<EdgeDragDrop | null>(null);
  const [paletteDragPos, setPaletteDragPos] = useState<{ x: number; y: number } | null>(null);
  // Inline error shown when a connection attempt is blocked
  const [invalidConnection, setInvalidConnection] = useState<{ x: number; y: number; msg: string } | null>(null);
  const invalidConnectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Post-commit measurement tick ─────────────────────────────────────────
  // Edges are SVG paths whose endpoints are computed at render time by
  // `getAnchorCenter`, which queries the DOM for the actual anchor element
  // positions (the only way to get correct coordinates for cards whose
  // height varies by type — condition / policy cards are roughly half the
  // height of action / trigger cards). On the FIRST render after a node
  // is added, the new node's anchor isn't in the DOM yet, so the lookup
  // falls back to a generic NODE_H rectangle that's wrong for the
  // shorter card types. The path then renders with a noticeable visual
  // gap below the actual anchor on the new node's neighbour edges.
  //
  // To self-heal, we run a layout effect that bumps a tick counter whenever
  // the graph topology changes. The tick threads into the edges' rendering
  // (it's read into the closure via `measureTick`) so the next render
  // forces a re-measure after React has committed the new DOM, snapping
  // every edge endpoint to its real anchor position.
  const [measureTick, setMeasureTick] = useState(0);
  useLayoutEffect(() => {
    setMeasureTick(t => t + 1);
  }, [nodes, edges, nodePositions]);
  // Read in render so the closure captures the value — without this the
  // bundler may strip the dep and the tick wouldn't actually trigger a
  // re-measure of `getAnchorCenter` calls in the JSX below.
  void measureTick;

  // Refs so mousemove/mouseup callbacks don't go stale
  const isPanning      = useRef(false);
  const panStart       = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const nodeDragRef    = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    /** Cursor's canvas coords at drag start. Only set when this drag is a
     *  multi-drag (`> 1` nodes selected and the dragged node is one of
     *  them). Used to compute a uniform delta for every selected node. */
    multiAnchorX?: number;
    multiAnchorY?: number;
  } | null>(null);
  const pendingEdgeRef         = useRef<PendingEdge | null>(null);
  const draggingOverNodeIdRef  = useRef<string | null>(null);
  const reconnectingEdgeIdRef  = useRef<string | null>(null);
  const [draggingOverNodeId, setDraggingOverNodeId] = useState<string | null>(null);
  /** Edge id currently under the pointer — set when the user hovers
   *  either the SVG path's hit-stroke OR the midpoint minus button.
   *  Drives the visual path's slate-300 → slate-800 hover swap so both
   *  affordances share a unified hover state. */
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const zoomRef        = useRef(zoom);

  // ── Marquee multi-selection ─────────────────────────────────────────────
  // Shift-drag on empty canvas paints a selection rectangle; nodes whose
  // wrapper bbox intersects the box are added to the multi-select set on
  // mousemove (live preview) and committed on mouseup. While > 1 nodes are
  // multi-selected, dragging any one of them moves the whole group, and
  // pressing Delete / Backspace removes them all in one undo step.
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const marqueeRef = useRef<typeof marquee>(null);
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());
  const multiSelectedIdsRef = useRef(multiSelectedIds);
  multiSelectedIdsRef.current = multiSelectedIds;
  /** Per-node initial position captured at the start of a multi-drag so we
   *  can apply a uniform delta to every selected node without compounding
   *  rounding errors over a long drag. */
  const multiDragOriginsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  zoomRef.current      = zoom;

  // Close type picker when clicking outside
  useEffect(() => {
    if (!typePickerPos) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[class*="typePicker"]')) {
        setTypePickerPos(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [typePickerPos]);

  // ── Selection keyboard shortcuts ────────────────────────────────────────
  // Esc clears any active marquee selection (and deselects the single node
  // when there's no marquee). Delete / Backspace removes every selected
  // node in one batch — multi-selected ids first, falling back to the
  // single `selectedId` so the same keystroke works whether the user
  // has one or many nodes picked.
  //
  // Each `onDeleteNode` call lands on the undo stack as a separate
  // snapshot, but they're contiguous, so a single Cmd+Z restores the
  // most-recently-deleted node and a run of Cmd+Z restores the full
  // set. The shortcuts are suppressed while the user is typing into a
  // form control so we don't eat their text-edit Backspace.
  //
  // Refs (rather than the closed-over props) drive both the
  // `multiSelectedIds` AND `selectedId` reads at firing time so the
  // handler always sees the latest selection without re-attaching on
  // every render.
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // Suppress when focus is on a text-editing surface — but Esc still
      // gets to clear the canvas selection so a "stuck" focus state
      // can't trap the user (Esc is a safe no-op in form fields anyway).
      const inText = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === 'Escape') {
        if (multiSelectedIdsRef.current.size > 0) {
          e.preventDefault();
          setMultiSelectedIds(new Set());
          return;
        }
        if (selectedIdRef.current && !inText) {
          e.preventDefault();
          onDeselectNode();
        }
        return;
      }
      if (inText) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (multiSelectedIdsRef.current.size > 0) {
          e.preventDefault();
          // Snapshot the ids before mutation — `onDeleteNode` will
          // trigger setState cascades that update `multiSelectedIdsRef`
          // too.
          const ids = [...multiSelectedIdsRef.current];
          ids.forEach(id => onDeleteNode(id));
          setMultiSelectedIds(new Set());
          return;
        }
        if (selectedIdRef.current) {
          e.preventDefault();
          onDeleteNode(selectedIdRef.current);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDeleteNode, onDeselectNode]);

  // Close edge drag-drop picker when clicking outside
  useEffect(() => {
    if (!edgeDragDrop) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[class*="typePicker"]')) {
        setEdgeDragDrop(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [edgeDragDrop]);

  // ── Measure actual selected-node height for consistent AI input gap ──
  useEffect(() => {
    if (!selectedId || !graphContentRef.current) { setSelectedNodeH(NODE_H); return; }
    const el = graphContentRef.current.querySelector<HTMLElement>(`[data-node-id="${selectedId}"]`);
    setSelectedNodeH(el ? el.offsetHeight : NODE_H);
  }, [selectedId, nodes]);

  // ── Wheel: scroll = pan, ctrl/cmd+scroll = zoom ──
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = 1 - e.deltaY * 0.004;
        setZoom((z) => Math.max(0.3, Math.min(2.5, z * factor)));
      } else {
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── MouseDown: start anchor-edge draw OR node drag OR canvas pan ──
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    /** Drop focus from text-editing surfaces (the contenteditable workflow
     *  name in TopBar, popover form fields, AI composer, etc.) before
     *  we transition into a canvas interaction. Without this, the
     *  Backspace / Delete / Escape multi-select handler bails because
     *  `e.target.isContentEditable` is true on the focused TopBar field
     *  even though the user is now operating on the canvas. We only
     *  blur on canvas-empty interactions (marquee / pan / deselect) —
     *  if the target is a node interior or a button, leave focus alone
     *  so per-node a11y / typing flows aren't disrupted. */
    const blurTextFocus = () => {
      const ae = document.activeElement as HTMLElement | null;
      if (!ae) return;
      if (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable) {
        ae.blur();
      }
    };

    // If the click is on an interactive control inside a node, still select the node
    // (so the right panel opens) but skip drag/pan setup.
    const isInteractive = !!target.closest('button, input, textarea, select, [data-popover]');
    if (isInteractive) {
      const nodeEl = target.closest('[data-node-id]') as HTMLElement | null;
      if (nodeEl && !editNodeMode) onSelectNode(nodeEl.dataset.nodeId!);
      return;
    }

    // Check for edge drag FIRST (drag anywhere on a line to reconnect / disconnect)
    const edgeHandleEl = (target as Element).closest('[data-edge-endpoint]') as Element | null;
    if (edgeHandleEl && graphContentRef.current) {
      const edgeId     = edgeHandleEl.getAttribute('data-edge-endpoint')!;
      const fromNodeId = edgeHandleEl.getAttribute('data-edge-from')!;
      const fromBranchId = edgeHandleEl.getAttribute('data-edge-from-branch') || null;
      const gc = graphContentRef.current.getBoundingClientRect();
      // Anchor the pending line at the source node's right anchor (or the
      // specific per-branch anchor if the edge originated from one) so the
      // reconnect rubber-band stays visually rooted at the same point the
      // edge currently leaves the source.
      const anchorSel = fromBranchId
        ? `[data-anchor-node-id="${fromNodeId}"][data-anchor="right"][data-anchor-branch-id="${fromBranchId}"]`
        : `[data-anchor-node-id="${fromNodeId}"][data-anchor="right"]`;
      const fromAnchorEl = (graphContentRef.current.querySelector(anchorSel)
        ?? graphContentRef.current.querySelector(`[data-anchor-node-id="${fromNodeId}"][data-anchor="right"]`)) as HTMLElement | null;
      let startX: number, startY: number;
      if (fromAnchorEl) {
        const r = fromAnchorEl.getBoundingClientRect();
        startX = (r.left + r.width  / 2 - gc.left) / zoomRef.current;
        startY = (r.top  + r.height / 2 - gc.top)  / zoomRef.current;
      } else {
        const fp = nodePositions[fromNodeId] ?? { x: 0, y: 0 };
        startX = fp.x + NODE_W;
        startY = fp.y + NODE_H / 2;
      }
      const currentX = (e.clientX - gc.left) / zoomRef.current;
      const currentY = (e.clientY - gc.top)  / zoomRef.current;
      reconnectingEdgeIdRef.current = edgeId;
      pendingEdgeRef.current = { fromNodeId, startX, startY, currentX, currentY };
      setPendingEdge({ ...pendingEdgeRef.current });
      return;
    }

    // Check for anchor drag FIRST
    const anchorEl = target.closest('[data-anchor]') as HTMLElement | null;
    if (anchorEl && graphContentRef.current) {
      const anchorNodeId = anchorEl.dataset.anchorNodeId;
      if (!anchorNodeId) return;

      // Connected handle → no longer disconnects on click. The disconnect
      // affordance now lives as a hover-revealed minus button at the
      // path's midpoint (see edge-midpoint overlays below). Mousedown on
      // a connected anchor just no-ops so the user can't accidentally
      // remove an edge by clicking the handle.
      if (anchorEl.dataset.connected === 'true') {
        return;
      }

      const anchorRect   = anchorEl.getBoundingClientRect();
      const gc           = graphContentRef.current.getBoundingClientRect();
      const startX       = (anchorRect.left + anchorRect.width  / 2 - gc.left) / zoomRef.current;
      const startY       = (anchorRect.top  + anchorRect.height / 2 - gc.top)  / zoomRef.current;
      const branchId     = anchorEl.dataset.anchorBranchId ?? null;
      pendingEdgeRef.current = { fromNodeId: anchorNodeId, fromCase: null, fromBranchId: branchId, startX, startY, currentX: startX, currentY: startY };
      setPendingEdge(pendingEdgeRef.current);
      return;
    }

    // Check if clicking inside a node wrapper
    const nodeEl = target.closest('[data-node-id]') as HTMLElement | null;
    if (nodeEl && graphContentRef.current) {
      const nodeId = nodeEl.dataset.nodeId!;
      // Edit-node mode: toggle edit-selection (no drag, no regular select)
      if (editNodeMode) {
        onEditNodeToggle(nodeId, e.metaKey || e.ctrlKey);
        return;
      }
      const pos = nodePositions[nodeId];
      if (!pos) return;
      const gc = graphContentRef.current.getBoundingClientRect();
      const mx = (e.clientX - gc.left) / zoomRef.current;
      const my = (e.clientY - gc.top)  / zoomRef.current;

      // Cmd/Ctrl+click → toggle this node into the multi-select set
      // additively, without starting a drag. Useful for picking a few
      // non-adjacent nodes after an initial marquee.
      if (e.metaKey || e.ctrlKey) {
        // Drop focus from any text-editing surface so the next Backspace
        // / Delete / Escape lands on the canvas multi-select handler
        // instead of the focused input or contenteditable.
        blurTextFocus();
        // Clear any single-node selection so the popover closes — the
        // user is composing a multi-selection now, not configuring one
        // node.
        onDeselectNode();
        setMultiSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(nodeId)) next.delete(nodeId);
          else next.add(nodeId);
          return next;
        });
        return;
      }

      // Multi-drag: if this node is part of a > 1 multi-selection, capture
      // every selected node's start position so mousemove can apply a
      // uniform delta. The dragged node itself still drives the cursor
      // tracking via `nodeDragRef.current.id`.
      const isMultiDrag =
        multiSelectedIdsRef.current.has(nodeId) &&
        multiSelectedIdsRef.current.size > 1;
      if (isMultiDrag) {
        multiDragOriginsRef.current = new Map();
        multiSelectedIdsRef.current.forEach(id => {
          const p = nodePositions[id];
          if (p) multiDragOriginsRef.current.set(id, { x: p.x, y: p.y });
        });
        nodeDragRef.current = {
          id: nodeId,
          offsetX: mx - pos.x,
          offsetY: my - pos.y,
          multiAnchorX: mx,
          multiAnchorY: my,
        };
      } else {
        // Plain single-node drag clears any prior multi-selection so the
        // user doesn't get stuck dragging a phantom group after picking a
        // new node solo.
        if (multiSelectedIdsRef.current.size > 0) setMultiSelectedIds(new Set());
        multiDragOriginsRef.current = new Map();
        nodeDragRef.current = { id: nodeId, offsetX: mx - pos.x, offsetY: my - pos.y };
      }
      setDraggingNodeId(nodeId);
      onSelectNode(nodeId);
      return;
    }

    // Empty canvas — plain drag paints a marquee (Figma-style multi-select);
    // hold Shift to pan instead. (skip if the target is a button-like role)
    if (target.closest('[role="button"]')) return;

    if (!e.shiftKey && graphContentRef.current) {
      const gc = graphContentRef.current.getBoundingClientRect();
      const cx = (e.clientX - gc.left) / zoomRef.current;
      const cy = (e.clientY - gc.top)  / zoomRef.current;
      marqueeRef.current = { x1: cx, y1: cy, x2: cx, y2: cy };
      setMarquee(marqueeRef.current);
      // Marquee starts a fresh selection — clearer than trying to merge
      // the previous set, since the user already has Cmd-click for
      // additive picking after the marquee is committed.
      setMultiSelectedIds(new Set());
      // Also clear any single-node selection so the marquee is the only
      // active selection while it's being drawn.
      onDeselectNode();
      // Drop focus off any text-editing surface (TopBar workflow name,
      // popover form fields, AI composer) so the subsequent Backspace
      // / Delete / Escape goes to the canvas multi-select handler.
      blurTextFocus();
      return;
    }

    // Shift+drag → pan. Single-node selection is cleared so the empty-
    // canvas drag doesn't carry stale selection state through the pan.
    onDeselectNode();
    if (multiSelectedIdsRef.current.size > 0) setMultiSelectedIds(new Set());
    blurTextFocus();
    isPanning.current = true;
    panStart.current  = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    (e.currentTarget as HTMLElement).dataset.panning = 'true';
  }, [pan, onDeselectNode, nodes, nodePositions, onSelectNode, editNodeMode, onEditNodeToggle, onDeleteEdge]);

  // ── MouseMove: draw pending edge OR drag node OR pan canvas ──
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (pendingEdgeRef.current && graphContentRef.current) {
      const gc = graphContentRef.current.getBoundingClientRect();
      const currentX = (e.clientX - gc.left) / zoomRef.current;
      const currentY = (e.clientY - gc.top) / zoomRef.current;
      pendingEdgeRef.current = { ...pendingEdgeRef.current, currentX, currentY, screenX: e.clientX, screenY: e.clientY };
      setPendingEdge({ ...pendingEdgeRef.current });

      // Track which node the cursor is over so we can show its anchors and
      // use it as the target. An exact-bbox hit wins; otherwise snap to the
      // nearest candidate whose bbox is within SNAP_RADIUS of the cursor so
      // connecting doesn't require pixel-perfect placement on the handle.
      const SNAP_RADIUS = 60;
      const fromId    = pendingEdgeRef.current.fromNodeId;
      const candidates = nodes.filter(n => n.id !== fromId && nodePositions[n.id]);
      let hitNode = candidates.find(n => {
        const pos = nodePositions[n.id];
        return currentX >= pos.x && currentX <= pos.x + NODE_W &&
               currentY >= pos.y && currentY <= pos.y + NODE_H;
      });
      if (!hitNode) {
        let bestDist = SNAP_RADIUS;
        for (const n of candidates) {
          const pos = nodePositions[n.id];
          const dx = Math.max(pos.x - currentX, 0, currentX - (pos.x + NODE_W));
          const dy = Math.max(pos.y - currentY, 0, currentY - (pos.y + NODE_H));
          const dist = Math.hypot(dx, dy);
          if (dist < bestDist) {
            bestDist = dist;
            hitNode = n;
          }
        }
      }
      const hoverId = hitNode ? hitNode.id : null;
      if (draggingOverNodeIdRef.current !== hoverId) {
        draggingOverNodeIdRef.current = hoverId;
        setDraggingOverNodeId(hoverId);
      }
      return;
    }
    if (nodeDragRef.current && graphContentRef.current) {
      const gc = graphContentRef.current.getBoundingClientRect();
      const mx = (e.clientX - gc.left) / zoomRef.current;
      const my = (e.clientY - gc.top)  / zoomRef.current;
      // Multi-drag: every selected node moves by the same (dx, dy) the
      // cursor has travelled since drag start. Computing the delta from
      // the captured origins (rather than from the current positions)
      // avoids rounding drift over a long drag.
      if (
        nodeDragRef.current.multiAnchorX != null &&
        nodeDragRef.current.multiAnchorY != null &&
        multiDragOriginsRef.current.size > 1
      ) {
        const dx = mx - nodeDragRef.current.multiAnchorX;
        const dy = my - nodeDragRef.current.multiAnchorY;
        const merged: Record<string, { x: number; y: number }> = { ...nodePositions };
        multiDragOriginsRef.current.forEach((origin, id) => {
          merged[id] = { x: origin.x + dx, y: origin.y + dy };
        });
        onSetAllPositions(merged);
        return;
      }
      onPositionChange(
        nodeDragRef.current.id,
        mx - nodeDragRef.current.offsetX,
        my - nodeDragRef.current.offsetY,
      );
      return;
    }
    if (marqueeRef.current && graphContentRef.current) {
      const gc = graphContentRef.current.getBoundingClientRect();
      const cx = (e.clientX - gc.left) / zoomRef.current;
      const cy = (e.clientY - gc.top)  / zoomRef.current;
      const next = { ...marqueeRef.current, x2: cx, y2: cy };
      marqueeRef.current = next;
      setMarquee(next);
      // Live preview of the hit set. Treat each node as a NODE_W × NODE_H
      // rectangle for hit-testing — close enough for marquee semantics
      // (it's an inclusive intersection test, not a precise card-shape
      // hit). Condition / policy cards are slightly wider than NODE_W
      // but their wrapper still uses NODE_W as its layout footprint, so
      // the hit-test stays consistent with what the user sees.
      const xMin = Math.min(next.x1, next.x2);
      const xMax = Math.max(next.x1, next.x2);
      const yMin = Math.min(next.y1, next.y2);
      const yMax = Math.max(next.y1, next.y2);
      const hits = new Set<string>();
      nodes.forEach(n => {
        const p = nodePositions[n.id];
        if (!p) return;
        const ax = p.x;
        const bx = p.x + NODE_W;
        const ay = p.y;
        const by = p.y + NODE_H;
        if (ax < xMax && bx > xMin && ay < yMax && by > yMin) {
          hits.add(n.id);
        }
      });
      // Cheap reference-equality short-circuit so the live preview doesn't
      // schedule a render every mousemove tick when the hit set hasn't
      // changed (e.g. while the box is sweeping over empty space).
      const cur = multiSelectedIdsRef.current;
      if (hits.size !== cur.size || [...hits].some(id => !cur.has(id))) {
        setMultiSelectedIds(hits);
      }
      return;
    }
    if (isPanning.current) {
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.mx),
        y: panStart.current.py + (e.clientY - panStart.current.my),
      });
    }
  }, [onPositionChange, nodes, nodePositions]);

  // ── MouseUp: end pending edge OR node drag OR pan ──
  const handleMouseUp = useCallback((_e: React.MouseEvent<HTMLDivElement>) => {
    if (pendingEdgeRef.current) {
      const fromNodeId  = pendingEdgeRef.current.fromNodeId;
      const isReconnect = reconnectingEdgeIdRef.current !== null;
      let   connectedSuccessfully = false;

      const targetId = draggingOverNodeIdRef.current;

      if (targetId && targetId !== fromNodeId) {
        // Silent rejection for cases like delay→delay or policy→policy —
        // no toast, no edge, no snapback state.
        if (isConnectionSilentlyBlocked(fromNodeId, targetId, nodes, edges)) {
          if (isReconnect) reconnectingEdgeIdRef.current = null;
          pendingEdgeRef.current        = null;
          draggingOverNodeIdRef.current = null;
          setPendingEdge(null);
          setDraggingOverNodeId(null);
          return;
        }
        // Per-branch cap on condition source nodes — each branch (IF row
        // or ELSE) accepts only one outgoing edge. Skipped during reconnect
        // because the original edge is being moved, not duplicated.
        const fromBranchId = pendingEdgeRef.current?.fromBranchId ?? null;
        const branchAlreadyConnected = !isReconnect
          && !!fromBranchId
          && edges.some(e => e.from === fromNodeId && e.fromBranchId === fromBranchId);
        const connectionError = branchAlreadyConnected
          ? 'Branch already has an outgoing connection'
          : getConnectionError(fromNodeId, targetId, nodes);

        if (!connectionError) {
          if (isReconnect) onDeleteEdge(reconnectingEdgeIdRef.current!);
          onAddEdge(fromNodeId, targetId, fromBranchId);
          connectedSuccessfully = true;
        } else {
          // Show inline error near the drop point, then clear after 1.8s
          const sx = pendingEdgeRef.current?.screenX;
          const sy = pendingEdgeRef.current?.screenY;
          if (sx != null && sy != null) {
            if (invalidConnectionTimer.current) clearTimeout(invalidConnectionTimer.current);
            setInvalidConnection({ x: sx, y: sy, msg: connectionError });
            invalidConnectionTimer.current = setTimeout(() => setInvalidConnection(null), 1800);
          }
          // Snap back: if reconnecting, restore original edge
          if (isReconnect) {
            reconnectingEdgeIdRef.current = null;
          }
        }
      }

      // Released on empty canvas during reconnect → just delete the original edge
      if (isReconnect && !connectedSuccessfully && reconnectingEdgeIdRef.current) {
        onDeleteEdge(reconnectingEdgeIdRef.current);
      }

      // Released on empty canvas while drawing a new edge → show static type picker
      if (!connectedSuccessfully && !isReconnect && pendingEdgeRef.current?.screenX != null) {
        const { fromNodeId: dropFromId, fromCase, startX, startY, currentX, currentY, screenX, screenY } = pendingEdgeRef.current;
        const fromNodeType = nodes.find(n => n.id === dropFromId)?.type ?? 'action';
        setEdgeDragDrop({ fromNodeId: dropFromId, fromNodeType, fromCase, anchorX: startX, anchorY: startY, canvasX: currentX, canvasY: currentY, screenX: screenX!, screenY: screenY! });
      }

      pendingEdgeRef.current        = null;
      draggingOverNodeIdRef.current = null;
      reconnectingEdgeIdRef.current = null;
      setPendingEdge(null);
      setDraggingOverNodeId(null);
      return;
    }
    if (marqueeRef.current) {
      // Tiny drag → treat as a click → wipe selection. Real drags leave
      // multiSelectedIds populated by the live-preview pass in mousemove.
      const m = marqueeRef.current;
      const dx = Math.abs(m.x2 - m.x1);
      const dy = Math.abs(m.y2 - m.y1);
      if (dx < 4 && dy < 4) setMultiSelectedIds(new Set());
      marqueeRef.current = null;
      setMarquee(null);
      return;
    }
    nodeDragRef.current = null;
    multiDragOriginsRef.current = new Map();
    setDraggingNodeId(null);
    isPanning.current   = false;
    delete (_e.currentTarget as HTMLElement).dataset.panning;
  }, [onAddEdge, onDeleteEdge, nodes, edges]);

  // ── Palette drag-over handlers — accept all types, track cursor position ──
  const handleCanvasDragOver = (e: React.DragEvent) => {
    if (!draggingLibNode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setCanvasDragOver(true);
    if (graphContentRef.current) {
      const gc = graphContentRef.current.getBoundingClientRect();
      const x = (e.clientX - gc.left) / zoomRef.current - NODE_W / 2;
      const y = (e.clientY - gc.top) / zoomRef.current - NODE_H / 2;
      setPaletteDragPos({ x, y });
    }
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    if (!canvasRef.current?.contains(e.relatedTarget as Node)) {
      setCanvasDragOver(false);
      setPaletteDragPos(null);
    }
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingLibNode && paletteDragPos) {
      onCanvasDropAtPos(draggingLibNode, paletteDragPos.x, paletteDragPos.y);
    }
    setCanvasDragOver(false);
    setPaletteDragPos(null);
  };

  // ── Double-click on empty canvas: show type picker ──
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-node-id], button, input, textarea, [data-anchor]')) return;
    if (graphContentRef.current) {
      const gc = graphContentRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - gc.left) / zoomRef.current;
      const canvasY = (e.clientY - gc.top) / zoomRef.current;
      setTypePickerPos({ screenX: e.clientX, screenY: e.clientY, canvasX, canvasY });
    }
  };

  // ── Zoom controls ──
  const handleZoomIn  = () => setZoom((z) => Math.min(z + 0.1, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.3));
  const handleFit = () => {
    const canvasEl = canvasRef.current;
    const gcEl     = graphContentRef.current;
    if (!canvasEl || !gcEl) { setZoom(1); setPan({ x: INIT_PAN_X, y: 0 }); return; }

    const { width: vw, height: vh } = canvasEl.getBoundingClientRect();
    const gcW = gcEl.offsetWidth; // unscaled graphContent width

    // Account for the left panel so we centre in the visible canvas strip
    const leftPanelEl = document.querySelector('[class*="leftPanel"]') as HTMLElement | null;
    const leftOffset  = leftPanelEl ? leftPanelEl.offsetWidth : 0;
    // Effective canvas area: from leftOffset to vw
    const effectiveW = vw - leftOffset;
    const effectiveCx = leftOffset + effectiveW / 2; // screen x of effective centre

    // Collect all content bounding boxes in canvas space
    const xs: number[] = [];
    const ys: number[] = [];

    nodes.forEach(n => {
      const p = nodePositions[n.id];
      if (p) { xs.push(p.x, p.x + NODE_W); ys.push(p.y, p.y + NODE_H); }
    });

    if (xs.length === 0) { setZoom(1); setPan({ x: INIT_PAN_X, y: 0 }); return; }

    const PAD = 40;
    const minX = Math.min(...xs) - PAD;
    const maxX = Math.max(...xs) + PAD;
    const minY = Math.min(...ys) - PAD;
    const maxY = Math.max(...ys) + PAD;

    const newZoom = Math.min(1, effectiveW / (maxX - minX), vh / (maxY - minY));

    // Centre content within the visible canvas strip.
    // Screen formula: screen_x = vw/2 + (panX - gcW/2) + cx * zoom
    // We want: effectiveCx = vw/2 + (panX - gcW/2) + cxMid * zoom
    // → panX = effectiveCx - vw/2 + gcW/2 - cxMid * zoom
    const cxMid = (minX + maxX) / 2;
    const cyMid = (minY + maxY) / 2;
    setZoom(newZoom);
    setPan({
      x: effectiveCx - vw / 2 + gcW / 2 - cxMid * newZoom,
      y: vh / 2 - cyMid * newZoom,
    });
  };

  // ── Tidy up: re-run layout algorithm, animate cards to their computed positions ──
  const handleTidyUp = () => {
    // Measure each node's actual anchor-y offset (distance from the wrapper
    // top to the anchor's visual centre) so the layout can place every card
    // such that all anchors land on the same row, regardless of content
    // variability or node-type-specific anchor positioning (e.g. ai/action
    // anchors sit on the circle centre, not the wrapper centre). The layout
    // sets `top = centreY - heightOf/2`, so we translate each node's actual
    // anchor offset into a synthetic "height" that yields the right top.
    const heightOverrides = new Map<string, number>();
    const anchorOffsets   = new Map<string, { left: number; right: number }>();
    if (graphContentRef.current) {
      const z = zoomRef.current || 1;
      nodes.forEach(n => {
        const wrap = graphContentRef.current!.querySelector(
          `[data-node-id="${n.id}"]`,
        ) as HTMLElement | null;
        if (!wrap) return;
        const wrapRect = wrap.getBoundingClientRect();
        const anyAnchor = wrap.querySelector(
          '[data-anchor="left"], [data-anchor="right"]',
        ) as HTMLElement | null;
        if (anyAnchor) {
          const ar = anyAnchor.getBoundingClientRect();
          const yOff = ((ar.y + ar.height / 2) - wrapRect.y) / z;
          // `heightOf` is divided by 2 in `place()` to derive the top, so
          // store 2x the actual anchor offset.
          if (yOff > 0) heightOverrides.set(n.id, yOff * 2);
        }
        const lEl = wrap.querySelector('[data-anchor="left"]')  as HTMLElement | null;
        const rEl = wrap.querySelector('[data-anchor="right"]') as HTMLElement | null;
        const fallbackR = (n.type === 'condition' || n.type === 'policy') ? wrapRect.width / z + 30 : wrapRect.width / z;
        const fallbackL = (n.type === 'condition' || n.type === 'policy') ? -30 : 0;
        const lr = lEl ? lEl.getBoundingClientRect() : null;
        const rr = rEl ? rEl.getBoundingClientRect() : null;
        const left  = lr ? ((lr.x + lr.width  / 2) - wrapRect.x) / z : fallbackL;
        const right = rr ? ((rr.x + rr.width  / 2) - wrapRect.x) / z : fallbackR;
        anchorOffsets.set(n.id, { left, right });
      });
    }
    const layout = computeLayout(nodes, edges, undefined, heightOverrides, anchorOffsets);

    const next: Record<string, { x: number; y: number }> = {};
    layout.forEach((pos, id) => { next[id] = pos; });
    setIsTidying(true);
    onSetAllPositions(next);

    if (canvasRef.current && layout.size > 0) {
      const positions = [...layout.values()];
      const minX = Math.min(...positions.map(p => p.x));
      const maxX = Math.max(...positions.map(p => p.x + NODE_W));
      const contentW = maxX - minX;
      const contentCentreX = (minX + maxX) / 2;
      const canvasW = canvasRef.current.clientWidth;
      const PADDING = 48;
      // Account for overlay panels so we centre within the visible viewport slice
      const rightPanelEl = document.querySelector('[class*="rightPanel"]');
      const rightPanelW  = rightPanelEl ? (rightPanelEl as HTMLElement).offsetWidth : 0;
      const visibleLeft  = LEFT_PANEL_W;
      const visibleRight = canvasW - rightPanelW;
      const visibleW     = Math.max(visibleRight - visibleLeft, PADDING * 2 + 1);
      const visibleCentreX = visibleLeft + visibleW / 2;
      // Scale zoom down if content is wider than the visible area (with padding)
      const fitZoom = Math.min(1, (visibleW - PADDING * 2) / contentW);
      const clampedZoom = Math.max(0.3, fitZoom);
      setZoom(clampedZoom);
      // Centre horizontally within the visible strip.
      // graphContent has left:50% and width:(maxX+H_SPACING), transform-origin:top center.
      // Screen formula: screen_x = canvasW/2 + pan.x + (layout_x - gcHalfW) * zoom
      // Solving for pan.x so contentCentreX maps to visibleCentreX:
      const gcHalfW = (maxX + H_SPACING) / 2;
      setPan({ x: Math.round(visibleCentreX - canvasW / 2 + (gcHalfW - contentCentreX) * clampedZoom), y: 40 });
    } else {
      setZoom(1);
      setPan({ x: INIT_PAN_X, y: 0 });
    }
    // Remove the tidying flag after the CSS transition completes
    setTimeout(() => setIsTidying(false), 380);
  };

  // ── Initial mount: centre the workflow horizontally inside the canvas
  //    column. The static INIT_PAN_X default was tuned for one viewport
  //    width and leaves the workflow pushed to the right on wider screens,
  //    so we re-pan once after refs + positions are wired up.
  //    Coordinates here are canvas-local — the left assistant panel sits
  //    in a sibling grid column, so visible area starts at 0 within the
  //    canvas div. The right popover, when open, IS overlaid inside the
  //    canvas and narrows the visible strip from the right. */
  const didInitialCentre = useRef(false);
  useEffect(() => {
    if (didInitialCentre.current) return;
    const canvasEl = canvasRef.current;
    const gcEl     = graphContentRef.current;
    if (!canvasEl || !gcEl) return;
    if (!nodes.length) return;
    const xs: number[] = [];
    nodes.forEach(n => {
      const p = nodePositions[n.id];
      if (p) { xs.push(p.x, p.x + NODE_W); }
    });
    if (xs.length === 0) return;
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const contentCentreX = (minX + maxX) / 2;
    const canvasW = canvasEl.clientWidth;
    const gcW     = gcEl.offsetWidth;
    // Only count the right popover when it's actually visible — when
    // closed it stays in the DOM with offsetWidth set but offsetParent
    // null, which would otherwise bias the centre rightward.
    const rightPanelEl = document.querySelector('[class*="rightPanel"]') as HTMLElement | null;
    const rightPanelVisible = !!(rightPanelEl && rightPanelEl.offsetParent !== null);
    const rightPanelW  = rightPanelVisible ? rightPanelEl!.offsetWidth : 0;
    const visibleCentreX = (canvasW - rightPanelW) / 2;
    // graphContent has left:50% + transform translateX(calc(-50% + pan.x)),
    // so screen_x_in_canvas = canvasW/2 + pan.x - gcW/2 + contentX
    setPan({ x: Math.round(visibleCentreX - canvasW / 2 + gcW / 2 - contentCentreX), y: 0 });
    didInitialCentre.current = true;
  }, [nodes, nodePositions]);

  // ── Auto-tidy when a branch sibling is added ─────────────────────────────────
  const prevTidyToken = useRef(autoTidyToken ?? 0);
  useEffect(() => {
    if ((autoTidyToken ?? 0) !== prevTidyToken.current) {
      prevTidyToken.current = autoTidyToken ?? 0;
      handleTidyUp();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTidyToken]);

  const prevFitToken = useRef(fitToken ?? 0);
  useEffect(() => {
    if ((fitToken ?? 0) !== prevFitToken.current) {
      prevFitToken.current = fitToken ?? 0;
      // No-op: group fit behavior was tied to condition groups, which are removed.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToken]);

  /** Resolve which branch anchor a given edge should originate from on a
   *  condition source node. Honors an explicit `edge.fromBranchId` first;
   *  legacy edges without a branchId fall back to insertion-order
   *  distribution across the *unclaimed* branch anchors so two edges from
   *  the same source don't collide on the same anchor (legacy edges that
   *  predate the per-branch model used to share a single anchor — this
   *  rule reattaches them onto whichever branches the explicit edges
   *  haven't already taken). Returns `null` for non-condition sources or
   *  when there's nothing to distribute. */
  const resolveBranchIdForEdge = (edge: GraphEdge): string | null => {
    if (edge.fromBranchId) return edge.fromBranchId;
    const src = nodes.find(n => n.id === edge.from);
    if (!src) return null;
    // Both condition and policy nodes render per-branch right anchors —
    // resolve the edge against whichever branch model the source uses.
    let branchIds: string[] | null = null;
    if (src.type === 'condition') {
      const branches = deriveConditionBranches(src);
      if (countConditionsInBranches(branches) === 0) return null;
      branchIds = [...branches.map(b => b.id), 'else'];
    } else if (src.type === 'policy') {
      const branches = derivePolicyBranches(src);
      if (branches.length === 0) return null;
      branchIds = [...branches.map(b => b.id), 'else'];
    } else {
      return null;
    }
    const outgoing = edges.filter(e => e.from === edge.from);
    // Branches already pinned by explicit fromBranchId edges — these are
    // unavailable for the unbranded distribution below.
    const claimed = new Set(
      outgoing.map(e => e.fromBranchId).filter(Boolean) as string[],
    );
    // Unbranded edges, in the order they appear in the edges array.
    const unbranded = outgoing.filter(e => !e.fromBranchId);
    const idx = unbranded.findIndex(e => e.id === edge.id);
    if (idx < 0) return null;
    // Walk branchIds in order, picking the Nth unclaimed slot for the
    // Nth unbranded edge. If unbranded edges outnumber unclaimed slots,
    // the surplus pile up on the last branch (typically ELSE) — same
    // behavior as the previous fallback.
    const available = branchIds.filter(b => !claimed.has(b));
    if (available.length === 0) return branchIds[branchIds.length - 1] ?? null;
    return available[Math.min(idx, available.length - 1)] ?? null;
  };

  // ── Anchor position helper — reads DOM for pixel-accurate coordinates ──────────
  // For source nodes that expose multiple anchors on the same side (condition
  // nodes in branches mode — one anchor per IF branch + ELSE), pass
  // `branchId` to target the specific row anchor; otherwise the first anchor
  // matching `(nodeId, side)` is used.
  const getAnchorCenter = (
    nodeId: string,
    side: 'top' | 'bottom' | 'left' | 'right',
    branchId?: string | null,
  ): { x: number; y: number } | null => {
    if (graphContentRef.current) {
      const sel = branchId
        ? `[data-anchor-node-id="${nodeId}"][data-anchor="${side}"][data-anchor-branch-id="${branchId}"]`
        : `[data-anchor-node-id="${nodeId}"][data-anchor="${side}"]`;
      let el = graphContentRef.current.querySelector(sel) as HTMLElement | null;
      // Fall back to a non-branch anchor when the requested branch's row no
      // longer exists (e.g. branch was removed from the right panel but its
      // edge wasn't yet pruned). Keeps edges visually attached to the node
      // until they're explicitly cleaned up.
      if (!el && branchId) {
        el = graphContentRef.current.querySelector(
          `[data-anchor-node-id="${nodeId}"][data-anchor="${side}"]`
        ) as HTMLElement | null;
      }
      if (el) {
        const gc = graphContentRef.current.getBoundingClientRect();
        const r  = el.getBoundingClientRect();
        return {
          x: (r.left + r.width  / 2 - gc.left) / zoom,
          y: (r.top  + r.height / 2 - gc.top)  / zoom,
        };
      }
    }
    // Fallback (first render before ref attaches, or missing anchor)
    const pos = nodePositions[nodeId];
    if (!pos) return null;
    if (side === 'bottom') return { x: pos.x + NODE_W / 2, y: pos.y + NODE_H };
    if (side === 'top')    return { x: pos.x + NODE_W / 2, y: pos.y };
    if (side === 'left')   return { x: pos.x,              y: pos.y + NODE_H / 2 };
    /* right */            return { x: pos.x + NODE_W,     y: pos.y + NODE_H / 2 };
  };

  // Compute content bounds from current node positions
  let maxX = NODE_W + H_SPACING;
  let maxY = NODE_H + V_SPACING;
  Object.values(nodePositions).forEach(({ x, y }) => {
    maxX = Math.max(maxX, x + NODE_W + H_SPACING);
    maxY = Math.max(maxY, y + NODE_H + V_SPACING);
  });

  return (
    <div
      ref={canvasRef}
      className={styles.canvas}
      data-drawing={pendingEdge ? 'true' : undefined}
      data-tidying={isTidying ? 'true' : undefined}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
    >
      <div className={styles.canvasViewport}>
        {nodes.length === 0 ? (
          <div
            style={{
              transform: `translate(calc(-50% + ${pan.x}px), ${pan.y + 80}px) scale(${zoom})`,
              transformOrigin: 'top center',
              position: 'absolute',
              left: '50%',
            }}
          >
            <EmptyCanvasState onAddTrigger={onAddRootTrigger} />
          </div>
        ) : (
          <div
            ref={graphContentRef}
            className={styles.graphContent}
            style={{
              width: maxX,
              height: maxY,
              transform: `translate(calc(-50% + ${pan.x}px), ${pan.y + CANVAS_TOP}px) scale(${zoom})`,
              transformOrigin: 'top center',
              // Inverse zoom — used by descendants (anchors, etc.) that need to
              // hold a constant on-screen size regardless of canvas zoom.
              ['--inv-zoom' as string]: String(1 / zoom),
            }}
          >
            {/* SVG edge overlay — bezier curves + pending edge.
                The SVG has no pointer-events on visual paths; wide transparent
                hit paths are added per-edge so users can drag to reconnect/disconnect. */}
            <svg
              style={{ position: 'absolute', inset: 0, width: maxX, height: maxY, overflow: 'visible', pointerEvents: 'none' }}
              aria-hidden
            >
              {/* Chevron arrowhead marker — drawn at the end of every edge path.
                  Shape matches the Vector 1.svg spec: downward V chevron,
                  rounded joins, stroked in the same slate-border-secondary as
                  the path line. `orient="auto"` aligns the tip with the curve
                  tangent, `markerUnits="userSpaceOnUse"` keeps the size
                  independent of strokeWidth. */}
              <defs>
                <marker
                  id="edge-arrow"
                  viewBox="0 0 8 8"
                  refX="6.8"
                  refY="3.7"
                  markerUnits="userSpaceOnUse"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  {/* Chevron pointing along the marker's +x axis (orient=auto
                      rotates +x to match the path tangent at the endpoint).
                      Tip at (6.8, 3.7); wings at (3.5, 0.5) and (3.5, 6.9). */}
                  <path
                    d="M3.5 0.5 L6.8 3.7 L3.5 6.9"
                    /* `context-stroke` makes the marker pick up the
                       referencing path's stroke colour so the chevron
                       tracks the path's default / hover swap below. */
                    stroke="context-stroke"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </marker>
              </defs>
              {edges.map(edge => {
                // ── Normal (horizontal) edge ─────────────────────────────────────────────
                // Anchors are offset 20px away from each node edge (see
                // .anchorLeft / .anchorRight in CSS), so the path endpoints
                // already float with a visual gap from the node surfaces.
                const fromBranch = resolveBranchIdForEdge(edge);
                const from = getAnchorCenter(edge.from, 'right', fromBranch);
                const to   = getAnchorCenter(edge.to,   'left');
                if (!from || !to) return null;

                const { x: x1, y: y1 } = from;
                const { x: x2, y: y2 } = to;
                const dx = Math.abs(x2 - x1) * 0.5;
                const d  = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                return (
                  <g
                    key={edge.id}
                    className={clsx(
                      styles.edgeGroup,
                      hoveredEdgeId === edge.id && styles.edgeGroupHovered,
                    )}
                    onMouseEnter={() => setHoveredEdgeId(edge.id)}
                    onMouseLeave={() => setHoveredEdgeId(prev => prev === edge.id ? null : prev)}
                  >
                    {/* Per-edge fade gradient — slate-300 at the path's
                        start point fades from 0% → 100% opacity along
                        the path's tangent. `userSpaceOnUse` ties the
                        gradient axis to the actual (x1,y1) → (x2,y2)
                        endpoints so the fade tracks the path's direction
                        even on diagonal connectors. The hover state's
                        solid slate-800 stroke (set in CSS) overrides
                        this gradient. */}
                    <defs>
                      <linearGradient
                        id={`edge-fade-${edge.id}`}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0%"   stopColor="var(--Alloy-slate-300)" stopOpacity="0" />
                        <stop offset="100%" stopColor="var(--Alloy-slate-300)" stopOpacity="1" />
                      </linearGradient>
                    </defs>
                    {/* Visual path — chevron arrowhead attached at the end
                        via <marker id="edge-arrow"> defined in <defs> above.
                        At rest the stroke uses the per-edge fade gradient;
                        on hover, CSS swaps the stroke to a solid slate-800. */}
                    <path d={d}
                      className={styles.edgePath}
                      stroke={`url(#edge-fade-${edge.id})`}
                      strokeWidth="2"
                      fill="none" strokeLinecap="round"
                      markerEnd="url(#edge-arrow)"
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* Boolean branch edge — no inline SVG pill; badge is in HTML layer below */}
                    {/* Wide transparent hit path — drag here to reconnect or disconnect */}
                    <path d={d} stroke="transparent" strokeWidth="12" fill="none"
                      data-edge-endpoint={edge.id}
                      data-edge-from={edge.from}
                      data-edge-from-branch={edge.fromBranchId}
                      style={{ pointerEvents: 'stroke', cursor: 'grab' }} />
                  </g>
                );
              })}


              {/* Pending edge while drawing or reconnecting */}
              {pendingEdge && (() => {
                const dx = Math.abs(pendingEdge.currentX - pendingEdge.startX) * 0.5;
                const d  = `M ${pendingEdge.startX} ${pendingEdge.startY} C ${pendingEdge.startX + dx} ${pendingEdge.startY}, ${pendingEdge.currentX - dx} ${pendingEdge.currentY}, ${pendingEdge.currentX} ${pendingEdge.currentY}`;
                return (
                  <path d={d} stroke="var(--color-border-selected)" strokeWidth="2" fill="none"
                    strokeLinecap="round" style={{ pointerEvents: 'none' }} />
                );
              })()}

              {/* Dotted connector from source node anchor to edge drag-drop picker */}
              {edgeDragDrop && (() => {
                const x1 = edgeDragDrop.anchorX;
                const y1 = edgeDragDrop.anchorY;
                const x2 = edgeDragDrop.canvasX;
                const y2 = edgeDragDrop.canvasY;
                const dx = Math.abs(x2 - x1) * 0.5;
                const d  = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                return (
                  <path d={d} stroke="var(--color-content-disabled)" strokeWidth="1.5" fill="none"
                    strokeDasharray="5 4" strokeLinecap="round" style={{ pointerEvents: 'none' }} />
                );
              })()}
            </svg>

            {/* ── Drop placeholder — ghost at cursor position while dragging from palette ── */}
            {draggingLibNode && paletteDragPos && (
              <div
                className={clsx(styles.dropPlaceholder,
                  draggingLibNode.type === 'trigger'   ? styles.dropPlaceholderTrigger   :
                  draggingLibNode.type === 'condition' ? styles.dropPlaceholderCondition  :
                  draggingLibNode.type === 'action'    ? styles.dropPlaceholderAction     :
                  draggingLibNode.type === 'policy'    ? styles.dropPlaceholderPolicy     :
                                                         styles.dropPlaceholderAi
                )}
                style={{ left: paletteDragPos.x, top: paletteDragPos.y, width: NODE_W, height: NODE_H }}
                aria-hidden
              />
            )}

            {/* Edge midpoint delete button — hover-revealed minus glyph
                at the centre of each path. The canonical disconnect
                surface, paired with hidden node anchors when an edge is
                attached so there's only one minus affordance per edge. */}
            {edges.map(edge => {
              const fromBranch = resolveBranchIdForEdge(edge);
              const from = getAnchorCenter(edge.from, 'right', fromBranch);
              const to   = getAnchorCenter(edge.to,   'left');
              if (!from || !to) return null;
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;
              return (
                <div
                  key={`mid-del-${edge.id}`}
                  className={styles.edgeMidpointArea}
                  style={{ left: midX - 60, top: midY - 25, width: 120, height: 50 }}
                  onMouseDown={e => e.stopPropagation()}
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(prev => prev === edge.id ? null : prev)}
                >
                  <button
                    type="button"
                    className={styles.edgeMidDeleteBtn}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteEdge(edge.id);
                    }}
                    aria-label="Remove path"
                  >
                    <span aria-hidden className={styles.edgeMidDeleteGlyph} />
                  </button>
                </div>
              );
            })}

            {/* Marquee selection rectangle — rendered in canvas space so
                it pans / zooms naturally with the rest of the content. */}
            {marquee && (
              <div
                className={styles.marqueeBox}
                style={{
                  left: Math.min(marquee.x1, marquee.x2),
                  top:  Math.min(marquee.y1, marquee.y2),
                  width:  Math.abs(marquee.x2 - marquee.x1),
                  height: Math.abs(marquee.y2 - marquee.y1),
                }}
              />
            )}

            {/* Nodes + connector anchors */}
            {nodes.map(node => {
              const pos = nodePositions[node.id] ?? { x: 0, y: 0 };
              const isNodeDragging = draggingNodeId === node.id;

              return (
                <div
                  key={node.id}
                  className={clsx(styles.nodeWrapper, isNodeDragging && styles.nodeWrapperDragging)}
                  style={{ left: pos.x, top: pos.y }}
                  data-node-id={node.id}
                  data-selected={selectedId === node.id ? 'true' : undefined}
                  data-multi-selected={multiSelectedIds.has(node.id) ? 'true' : undefined}
                  data-drag-target={draggingOverNodeId === node.id ? 'true' : undefined}
                >
                  {/* Left anchor — input handle for all non-trigger nodes.
                      Sits at the outer card's left edge for every node type
                      (including condition nodes) so the incoming path
                      terminates on the node card itself, not on the
                      per-branch sub-card rows. */}
                  {node.type !== 'trigger' && (() => {
                    const inEdgeId = edges.find(e => e.to === node.id)?.id;
                    return (
                      <div
                        className={clsx(styles.anchor, styles.anchorLeft)}
                        data-anchor="left"
                        data-anchor-node-id={node.id}
                        data-connected={inEdgeId ? 'true' : undefined}
                        data-anchor-edge-id={inEdgeId}
                      />
                    );
                  })()}


                  <FlowNode
                    step={node}
                    isSelected={node.id === selectedId}
                    isMultiSelected={multiSelectedIds.has(node.id)}
                    isDragging={isNodeDragging}
                    isDragOver={false}
                    canMoveUp={false}
                    canMoveDown={false}
                    onSelect={() => onSelectNode(node.id)}
                    onDeselect={onDeselectNode}
                    onUpdateStep={value => onUpdateNode(node.id, value)}
                    onUpdateConditionConfig={(op, vals) => onUpdateNodeCondition(node.id, op, vals)}
                    onUpdateConfigField={(key, val) => onUpdateNodeConfigField(node.id, key, val)}
                    onDuplicate={() => onDuplicateNode(node.id)}
                    onDelete={() => onDeleteNode(node.id)}
                    onMoveUp={() => {}}
                    onMoveDown={() => {}}
                    editNodeMode={editNodeMode}
                    isEditSelected={editingNodeIds.has(node.id)}
                    onUpdateConditions={onUpdateConditions ? (conds, logic) => onUpdateConditions(node.id, conds, logic) : undefined}
                    onUpdateConditionGroups={onUpdateConditionGroups ? (groups) => onUpdateConditionGroups(node.id, groups) : undefined}
                    onUpdateConditionBranches={onUpdateConditionBranches ? (branches) => onUpdateConditionBranches(node.id, branches) : undefined}
                    onUpdatePolicyBranches={onUpdatePolicyBranches ? (branches) => onUpdatePolicyBranches(node.id, branches) : undefined}
                    hasOutgoingConnections={edges.some(e => e.from === node.id)}
                    incomingEdgeId={edges.find(e => e.to === node.id)?.id}
                    outgoingEdgeByBranch={node.type === 'condition'
                      ? edges.reduce<Record<string, string>>((acc, e) => {
                          if (e.from === node.id && e.fromBranchId) acc[e.fromBranchId] = e.id;
                          return acc;
                        }, {})
                      : undefined}
                    triggerLabel={nodes.find(n => n.type === 'trigger')?.selectedValue}
                    onNodeAiSubmit={onNodeAiSubmit}
                    onSaveNodePopover={onSaveNodePopover}
                  />

                  {/* Right anchor — output handle. Always shows + and
                      allows drawing a new connection. Multiple outgoing
                      edges are permitted on every node type (conditions
                      can fan out to any number of downstream nodes; the
                      old 2-edge Yes/No cap was removed).

                      Suppressed for condition nodes that already render
                      per-branch anchors inside the card body — those
                      per-row anchors replace the single node-edge anchor
                      so each IF branch (and the catch-all ELSE) can fan
                      out to its own downstream chain. */}
                  {node.type !== 'condition' && node.type !== 'policy' && (
                    <div
                      className={clsx(styles.anchor, styles.anchorRight)}
                      data-anchor="right"
                      data-anchor-node-id={node.id}
                    />
                  )}
                </div>
              );
            })}

            {/* Floating per-node AI input relocated into NodePopover's
                bottom drawer — see `popoverAiDrawer` in NodePopover below. */}

            {/* Edge insert popover — opened when clicking a midpoint + button */}
            {edgeInsert && (
              <InsertPopover
                parentId={edgeInsert.edge.from}
                nodes={nodes}
                edges={edges.filter(e => e.id !== edgeInsert.edge.id)}
                anchorRect={edgeInsert.anchorRect}
                onInsert={(type, value) => {
                  onInsertOnEdge(edgeInsert.edge, type, value);
                  setEdgeInsert(null);
                }}
                onClose={() => setEdgeInsert(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Invalid connection error toast ── */}
      {invalidConnection && (
        <div
          className={styles.invalidConnectionError}
          style={{ left: invalidConnection.x, top: invalidConnection.y }}
        >
          {invalidConnection.msg}
        </div>
      )}

      {/* ── Node palette — centered along the canvas's bottom edge with
            12px padding. Lives inside the canvas card so it tracks the
            card's bounds rather than the viewport. */}
      <NodePaletteCard
        onDragStart={onLibNodeDragStart}
        onDragEnd={onLibNodeDragEnd}
        onNodeSelect={onLibNodeSelect}
      />

      {/* ── Bottom controls ── */}
      <div className={styles.canvasBottomBar}>
        <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onFit={handleFit} onTidyUp={handleTidyUp} />
      </div>

      {/* Type picker — rendered via portal at double-click position */}
      {typePickerPos && createPortal(
        <div
          className={styles.typePicker}
          style={{ position: 'fixed', left: typePickerPos.screenX, top: typePickerPos.screenY, zIndex: 900 }}
          onMouseDown={e => e.stopPropagation()}
        >
          {(['trigger', 'condition', 'action', 'delay', 'ai', 'policy'] as StepType[]).map(type => {
            const cfg = STEP_CONFIG[type];
            return (
              <Tooltip key={type} content={STEP_TOOLTIP_LABEL[type]} offset={4}>
                <button
                  className={clsx(styles.typePickerBtn, cfg.bgClass)}
                  data-step-type={type}
                  onClick={() => {
                    onCreateNodeAt(type, typePickerPos.canvasX, typePickerPos.canvasY);
                    setTypePickerPos(null);
                  }}
                  aria-label={cfg.label}
                >
                  {TOOLBAR_NODE_ICON[type]}
                </button>
              </Tooltip>
            );
          })}
        </div>,
        document.body,
      )}

      {/* Drag tooltip — follows arrow tip while dragging, hides when over a node */}
      {pendingEdge?.screenX != null && createPortal(
        <span
          className={tooltipStyles.tooltip}
          data-visible={!draggingOverNodeId || undefined}
          style={{
            position: 'fixed',
            left: (pendingEdge.screenX ?? 0) - 12,
            top: (pendingEdge.screenY ?? 0) - 10,
            transform: 'translateX(-100%)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Drag and drop anywhere to add a node
        </span>,
        document.body,
      )}

      {/* Edge drag-drop type picker — appears at release point after dragging an edge to empty canvas */}
      {edgeDragDrop && createPortal(
        <div
          className={styles.typePicker}
          style={{ position: 'fixed', left: edgeDragDrop.screenX, top: edgeDragDrop.screenY, zIndex: 1000 }}
          onMouseDown={e => e.stopPropagation()}
        >
          {(edgeDragDrop.fromNodeType === 'ai'
            ? ['action', 'ai'] as StepType[]  // AI nodes still constrained to action/AI
            : edgeDragDrop.fromNodeType === 'delay'
              ? ['condition', 'action', 'ai', 'policy'] as StepType[]  // Delay→Delay is disallowed
              : edgeDragDrop.fromNodeType === 'policy'
                ? ['condition', 'action', 'delay', 'ai'] as StepType[]  // Policy→Policy is disallowed
                : ['condition', 'action', 'delay', 'ai', 'policy'] as StepType[]
          ).map(type => {
            const cfg = STEP_CONFIG[type];
            return (
              <button
                key={type}
                className={clsx(styles.typePickerBtn, cfg.bgClass)}
                data-step-type={type}
                onClick={() => {
                  onCreateNodeAndConnect(edgeDragDrop.fromNodeId, type, edgeDragDrop.canvasX, edgeDragDrop.canvasY);
                  setEdgeDragDrop(null);
                }}
                title={cfg.label}
              >
                {TOOLBAR_NODE_ICON[type]}
              </button>
            );
          })}
        </div>,
        document.body,
      )}

    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

let _nextId = 100;

/** Short human-readable node identifier, e.g. "node_a1b2c3".
 *  Collision-resistant enough for a single workflow; stable for the lifetime
 *  of the node and persisted with its state. */
function generateShortNodeId(): string {
  const slug = Math.random().toString(36).slice(2, 8);
  return `node_${slug}`;
}

/** Resolve the display name of the current editor — used for updatedBy.
 *  Falls back to "System" when no user context is available. */
function currentUserDisplayName(): string {
  if (typeof window === 'undefined') return 'System';
  // Prefer an explicit global if the shell sets one; otherwise derive from
  // the email local-part surfaced in the build's CLAUDE context.
  const globalName = (window as unknown as { __TB_USER__?: string }).__TB_USER__;
  if (globalName) return globalName;
  return 'Yizzy';
}

/** Format an ISO timestamp for the Info section.
 *  Within 3 days → relative ("Just now", "N minutes ago", "N hours ago",
 *  "N days ago"). Older than 3 days → absolute ("Apr 23, 2026 at 10:30 AM"). */
function formatInfoTimestamp(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const nowMs = Date.now();
  const diffMs = nowMs - d.getTime();
  // Future timestamps fall through to the absolute format below.
  if (diffMs >= 0) {
    const sec = Math.floor(diffMs / 1000);
    if (sec < 5) return 'Just now';
    if (sec < 60) return `${sec} seconds ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
    const day = Math.floor(hr / 24);
    if (day < 3) return `${day} day${day === 1 ? '' : 's'} ago`;
  }
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} at ${time}`;
}

const INIT_NODES_NEW: GraphNode[] = [
  { id: 'trigger-1', type: 'trigger', label: 'Choose a trigger', placeholder: 'Search events', configured: false },
];

const INIT_NODES_EDIT: GraphNode[] = [
  { id: 'trigger-1',   type: 'trigger',   label: 'Choose a trigger', placeholder: 'Search events',    configured: false },
  { id: 'condition-1', type: 'condition', label: 'Add a condition',  placeholder: 'Search condition', configured: false },
];

const INIT_EDGES_EDIT: GraphEdge[] = [
  { id: 'edge-1', from: 'trigger-1', to: 'condition-1' },
];

// ─── Workflow templates ──────────────────────────────────────────────────────
// Each entry matches a mock workflow on the Automations list. The builder
// loads the matching template (nodes + edges + name) when opened via the
// workflow's id route. Workflows not found here fall back to INIT_NODES_EDIT.

interface WorkflowTemplate {
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Assistant-voiced opening summary shown as the seeded AI bubble in the
   *  thread. Reads as a friendly hand-off from the assistant: what's been
   *  built, what changed last, and an offer to keep iterating. Falls back
   *  to the generic welcome when omitted. */
  summary?: string;
  /** Workflow lifecycle status — mirrors the value the workflow list
   *  shows for this id so the builder's TopBar status tag matches the
   *  card chip the user clicked through from. Defaults to `'draft'`. */
  status?: AutomationStatus;
}

/** Helper — build a trigger node that's already configured. */
function mkTrigger(id: string, label: string): GraphNode {
  return {
    id, type: 'trigger',
    label: 'Choose a trigger',
    placeholder: 'Search events',
    configured: true,
    selectedValue: label,
  };
}

/** Helper — build an action node with a preselected action label. */
function mkAction(id: string, label: string): GraphNode {
  return {
    id, type: 'action',
    label: 'Add an action',
    placeholder: 'Search actions',
    configured: true,
    selectedValue: label,
  };
}

/** Helper — build a single-condition node (AND, one entry). */
function mkCondition(
  id: string,
  fieldId: string,
  operator: string,
  values: string[],
): GraphNode {
  const cond: ConditionEntry = { fieldId, operator, values };
  const def = CONDITION_LIBRARY.find(d => d.id === fieldId);
  return {
    id, type: 'condition',
    label: 'Add a condition',
    placeholder: 'Search condition',
    configured: true,
    selectedValue: def?.label ?? fieldId,
    conditions: [cond],
    conditionLogic: 'AND',
    conditionGroups: [{ id: 'g1', conditions: [cond] }],
  };
}

/** Helper — build a delay node with a simple hours duration. */
function mkDelay(id: string, amount: string, unit: string, summary: string): GraphNode {
  return {
    id, type: 'delay',
    label: 'Add a delay',
    placeholder: 'Set delay...',
    configured: true,
    selectedValue: summary,
    configValues: { amount, unit },
  };
}

/** Helper — build an AI Specialist node bound to a persona ID. The popover
 *  flips into its configured branch when `selectedValue === 'AI Specialist'`
 *  (literal sentinel), then resolves the chosen persona via
 *  `configValues.ai_persona_id`. The canvas card surfaces the literal label
 *  too — that matches every other already-configured AI node in the app. */
function mkAi(id: string, personaId: string): GraphNode {
  return {
    id, type: 'ai',
    label: 'AI Specialist',
    placeholder: 'Choose an AI specialist',
    configured: true,
    selectedValue: 'AI Specialist',
    configValues: { ai_persona_id: personaId },
  };
}

/** Helper — build a Policy node with a snapshot of folder / policy / sub-
 *  policy IDs. The canvas card reads these via `parsePolicySelection` to
 *  render a "N folders, N policies, N sub-policies selected." summary. */
function mkPolicy(
  id: string,
  selectedFolders: string[],
  selectedPolicies: string[],
  selectedSubPolicies: string[],
  thresholdValue = '80',
  thresholdMode: PolicyThresholdMode = 'score',
): GraphNode {
  return {
    id, type: 'policy',
    label: 'Policy',
    placeholder: 'Choose a policy',
    configured: true,
    // Filled-state primary line on the card — surfaces the configured count.
    selectedValue: 'Premium Shift Compliance',
    configValues: {
      selectedFolders:     JSON.stringify(selectedFolders),
      selectedPolicies:    JSON.stringify(selectedPolicies),
      selectedSubPolicies: JSON.stringify(selectedSubPolicies),
      thresholdValue,
      thresholdMode,
    },
  };
}

/** Helper — build a multi-group condition node. Each entry in
 *  `groupSpecs` is a list of `(fieldId, operator, values)` tuples that
 *  AND together inside the group; the groups themselves are OR-ed.
 *  Mirrors `mkCondition` but emits the new group-based model directly. */
function mkConditionGroups(
  id: string,
  groupSpecs: { fieldId: string; operator: string; values: string[] }[][],
): GraphNode {
  const groups: ConditionGroup[] = groupSpecs.map((conds, i) => ({
    id: `${id}-g${i + 1}`,
    conditions: conds.map(c => ({ fieldId: c.fieldId, operator: c.operator, values: c.values })),
  }));
  // Flatten all conditions for the legacy `conditions` field so older
  // compat paths still see the data.
  const flat: ConditionEntry[] = groups.flatMap(g => g.conditions);
  // Primary line uses the first condition's library label.
  const first = flat[0];
  const def = first ? CONDITION_LIBRARY.find(d => d.id === first.fieldId) : null;
  return {
    id, type: 'condition',
    label: 'Add a condition',
    placeholder: 'Search condition',
    configured: true,
    selectedValue: def?.label ?? 'Condition',
    conditions: flat,
    conditionLogic: 'AND',
    conditionGroups: groups,
  };
}

/** Router-state payload passed by TemplatesPage when opening a library
 *  template — consumed below to synthesize the initial graph. */
interface RouterTemplateState {
  templateId: string;
  templateName: string;
  templateSteps: string[];
  triggerCategory: string;
}

/** Trigger copy per TemplatesPage `triggerCategory`. Falls back to the
 *  template's own name when a category isn't mapped. */
const TRIGGER_LABEL_BY_CATEGORY: Record<string, string> = {
  scheduling:         'Shift scheduled',
  shift_request:      'Shift request received',
  shift_release:      'Shift released',
  clock_in_clock_out: 'Clock-in / clock-out',
  geofence:           'Geofence entered/exited',
  data_workflows:     'Record created',
  breaks:             'Break started',
};

/** Assistant-voiced opening message for templates scaffolded from
 *  TemplatesPage. Mirrors the 3-section structure used by the
 *  hand-authored `summary` strings on the catalog workflows above
 *  (welcome paragraph → "What this flow does" bullets → "Recent activity"
 *  bullets → "Suggested next steps" bullets) so the entry point reads
 *  consistently regardless of where the user came from. */
function buildRouterTemplateSummary(state: RouterTemplateState): string {
  const triggerLabel = TRIGGER_LABEL_BY_CATEGORY[state.triggerCategory] ?? state.templateName;
  // Per-step type → bullet copy for the "What this flow does" section.
  // Trigger always leads. Other steps render in the order they appear in
  // the template definition so the bullets match the on-canvas chain.
  const STEP_BULLET: Record<string, string> = {
    trigger:   `Fires on **${triggerLabel.toLowerCase()}**`,
    condition: 'Checks a **condition** before continuing',
    action:    'Runs an **action**',
    delay:     'Waits for a **delay**',
    ai:        'Hands off to an **AI specialist**',
    policy:    'Applies a **policy** filter',
  };
  // Dedupe consecutive identical step types — "Runs an action / Runs an
  // action" reads worse than "Runs 2 actions back-to-back". For the 1st-
  // pass we keep the simpler 1-bullet-per-step form which is easier to
  // scan. Trigger is force-positioned first.
  const sortedSteps = [...state.templateSteps].sort((a, b) => {
    if (a === 'trigger') return -1;
    if (b === 'trigger') return 1;
    return 0;
  });
  const flowBullets = sortedSteps
    .map(s => STEP_BULLET[s] ? `- ${STEP_BULLET[s]}` : `- Adds a **${s}** step`)
    .join('\n');
  return [
    `Just scaffolded the **${state.templateName}** template for you.`,
    '',
    '**What this flow does:**',
    flowBullets,
    '',
    '**Recent activity:**',
    '- Scaffolded **just now** from the templates library',
    '- Each node is preset with **sensible defaults**',
    '',
    '**Suggested next steps:**',
    '- Open any node on the canvas to **tune its configuration**',
    "- Tell me what you'd like to change and I'll **adjust it for you**",
    "- **Save** the workflow when you're happy with the wiring",
  ].join('\n');
}

/** Synthesize a linear node chain from a TemplatesPage template spec. Reuses
 *  the mk* factories so conditions / delays / actions render with the same
 *  chrome + Info metadata as any other node on the canvas. Also handles AI
 *  and policy steps so library templates can showcase the full node set. */
function buildTemplateGraph(state: RouterTemplateState): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let prevId: string | null = null;
  // Per-type indices so each repeated step can pick a different config —
  // makes a [trigger, action, action, action] template render with three
  // distinct action labels rather than three "Send email" copies.
  let actionIdx    = 0;
  let conditionIdx = 0;
  let delayIdx     = 0;
  let aiIdx        = 0;
  let policyIdx    = 0;

  // Action labels rotate through a notification-heavy spread, since most
  // templates are notification flows.
  const ACTION_LABELS = [
    'Send feed message',
    'Send email',
    'Send chat message',
    'Send one-way SMS',
    'Send report',
    'Webhook notification',
  ] as const;

  // Condition library entries that exist in CONDITION_LIBRARY. Each one
  // varies the field/operator/value so consecutive condition steps don't
  // render identically.
  const CONDITION_VARIANTS: { fieldId: string; operator: string; values: string[] }[] = [
    { fieldId: 'shift_policy_main_credential', operator: 'is',              values: ['Enabled'] },
    { fieldId: 'shift_policy_status',          operator: 'is',              values: ['Active'] },
    { fieldId: 'shift_policy_published',       operator: 'is',              values: ['true'] },
    { fieldId: 'shift_policy_regular_hours',   operator: 'is greater than', values: ['8'] },
  ];

  const DELAY_VARIANTS: { amount: string; unit: string; summary: string }[] = [
    { amount: '5',  unit: 'minutes', summary: '5 minutes' },
    { amount: '30', unit: 'minutes', summary: '30 minutes' },
    { amount: '1',  unit: 'hours',   summary: '1 hour' },
    { amount: '24', unit: 'hours',   summary: '24 hours' },
  ];

  // Personas in display order — match the AI_PERSONAS catalog.
  const PERSONA_IDS = ['persona-001', 'persona-002', 'persona-003', 'persona-004', 'persona-005'] as const;

  state.templateSteps.forEach((step, i) => {
    const id = `tmpl-${state.templateId}-${step}-${i}`;
    let node: GraphNode;
    if (step === 'trigger') {
      const label = TRIGGER_LABEL_BY_CATEGORY[state.triggerCategory] ?? state.templateName;
      node = mkTrigger(id, label);
    } else if (step === 'action') {
      const label = ACTION_LABELS[actionIdx % ACTION_LABELS.length];
      actionIdx++;
      node = mkAction(id, label);
    } else if (step === 'condition') {
      const v = CONDITION_VARIANTS[conditionIdx % CONDITION_VARIANTS.length];
      conditionIdx++;
      node = mkCondition(id, v.fieldId, v.operator, v.values);
    } else if (step === 'delay') {
      const v = DELAY_VARIANTS[delayIdx % DELAY_VARIANTS.length];
      delayIdx++;
      node = mkDelay(id, v.amount, v.unit, v.summary);
    } else if (step === 'ai') {
      const personaId = PERSONA_IDS[aiIdx % PERSONA_IDS.length];
      aiIdx++;
      node = mkAi(id, personaId);
    } else if (step === 'policy') {
      // A believable, lightly-configured policy. Each one rotates through a
      // different threshold so repeated policy steps look distinct.
      const thresholds = ['70', '80', '85', '90'] as const;
      const threshold = thresholds[policyIdx % thresholds.length];
      policyIdx++;
      node = mkPolicy(
        id,
        ['folder-default-compliance'],
        ['policy-default-fill'],
        [],
        threshold,
        'percentage',
      );
    } else {
      node = mkAction(id, state.templateName);
    }
    nodes.push(node);
    if (prevId) edges.push({ id: `tmpl-e-${i}`, from: prevId, to: id });
    prevId = id;
  });
  return { nodes, edges };
}

const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
  // 1 · New hire onboarding — fan-out flow with onboarding policy, multi-group
  // condition, AI handoff to Onbi, and parallel comms + task-assignment branches.
  wf_01HGXZ7K3QN4A2MB: {
    name: 'New hire onboarding',
    status: 'live',
    summary: [
      'Welcome back to **New hire onboarding** — the full-fat onboarding flow.',
      '',
      '**What this flow does:**',
      '- Fires when an **Employee** record is created',
      '- Applies the **New Hire Compliance** policy (3 folders · 4 policies · **90% threshold**)',
      '- Filters to **full-time** OR **contract starting within 7 days**',
      '- Hands off to **Onbi** (onboarding specialist)',
      '- **Branch A** — welcome email → 1 hr delay → assign onboarding task group → chat ping the team',
      '- **Branch B** — create HR record entry → send welcome packet report',
      '',
      '**Recent activity:**',
      '- **Mar 28** — pre-shift email template was refreshed',
      '- **62 of last 65 runs** completed cleanly',
      '',
      '**Suggested next steps:**',
      '- Add a **manager handoff** before the welcome packet sends',
      '- Wire a **fallback** if the credential check fails',
    ].join('\n'),
    nodes: [
      mkTrigger('nh-trigger-1', 'Something is created'),
      mkPolicy(
        'nh-policy-1',
        ['folder-hr-onboarding', 'folder-compliance-newhire', 'folder-credentials-core'],
        ['policy-newhire-i9', 'policy-newhire-w4', 'policy-newhire-handbook', 'policy-newhire-direct-deposit'],
        ['subpolicy-remote-onboarding'],
        '90',
        'percentage',
      ),
      mkConditionGroups('nh-cond-1', [
        [
          { fieldId: 'shift_user_link_employment_type', operator: 'is',  values: ['Full-time'] },
        ],
        [
          { fieldId: 'shift_user_link_employment_type', operator: 'is',  values: ['Contract'] },
          { fieldId: 'shift_user_link_start_date',      operator: 'within next', values: ['7 days'] },
        ],
      ]),
      mkAi('nh-ai-1', 'persona-003'),
      // Branch A
      {
        ...mkAction('nh-actionA-1', 'Send email'),
        configValues: {
          subject: 'Welcome to the team!',
          reply_to_address: 'onboarding@teambridge.app',
          send_to_type: 'Specific Group of Users',
          send_to_value: 'New Hire',
          message:
            'Welcome aboard — your onboarding specialist will reach out shortly with next steps. Reply to this email if anything is unclear.',
        },
      },
      mkDelay('nh-delayA-1', '1', 'hours', '1 hour'),
      {
        ...mkAction('nh-actionA-2', 'Assign task group'),
        configValues: { task_group: 'Driver License' },
      },
      {
        ...mkAction('nh-actionA-3', 'Send chat message'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Onboarding Team',
          message: 'A new hire has been onboarded — please prep their first-week schedule.',
        },
      },
      // Branch B
      {
        ...mkAction('nh-actionB-1', 'Create new entry'),
        configValues: { collection: 'Employee Resources' },
      },
      {
        ...mkAction('nh-actionB-2', 'Send report'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'HR Operations',
          message: 'New hire report — credentials, role, location, and assigned manager included.',
        },
      },
    ],
    edges: [
      { id: 'nh-e1',  from: 'nh-trigger-1',  to: 'nh-policy-1'   },
      { id: 'nh-e2',  from: 'nh-policy-1',   to: 'nh-cond-1'     },
      { id: 'nh-e3',  from: 'nh-cond-1',     to: 'nh-ai-1'       },
      // Fan-out
      { id: 'nh-e4a', from: 'nh-ai-1',       to: 'nh-actionA-1'  },
      { id: 'nh-e4b', from: 'nh-ai-1',       to: 'nh-actionB-1'  },
      // Branch A chain
      { id: 'nh-e5',  from: 'nh-actionA-1',  to: 'nh-delayA-1'   },
      { id: 'nh-e6',  from: 'nh-delayA-1',   to: 'nh-actionA-2'  },
      { id: 'nh-e7',  from: 'nh-actionA-2',  to: 'nh-actionA-3'  },
      // Branch B chain
      { id: 'nh-e8',  from: 'nh-actionB-1',  to: 'nh-actionB-2'  },
    ],
  },

  // 2 · Timesheet approval reminder — recurring schedule, multi-group condition,
  // DataOps AI audit, parallel email-escalation + payroll-webhook branches.
  wf_01HGY2F9PW4VRJ8N: {
    name: 'Timesheet approval reminder',
    status: 'live',
    summary: [
      "You're back on **Timesheet approval reminder** — the weekly payroll-prep sweep.",
      '',
      '**What this flow does:**',
      '- Runs on a schedule — **every Friday at 3pm**',
      '- Filters to **timesheet pending** AND **hours worked > 0**, OR **overtime hours > 0**',
      '- Hands off to **DataOps** for an audit pass',
      '- **Branch A** — manager email → **24 hr delay** → re-check pending → SMS escalation if still open',
      '- **Branch B** — webhook to payroll → audit report to finance',
      '',
      '**Recent activity:**',
      '- **Apr 24** — last run **errored** (one manager address bounced)',
      '- **115 of last 120 runs** completed cleanly',
      '',
      '**Suggested next steps:**',
      '- Re-check the **recipient list** on the Send email step',
      '- Add a **fallback** for invalid addresses',
    ].join('\n'),
    nodes: [
      mkTrigger('ts-trigger-1', 'Recurring at time interval'),
      mkConditionGroups('ts-cond-1', [
        [
          { fieldId: 'shift_policy_upload_timesheet', operator: 'is',           values: ['false'] },
          { fieldId: 'shift_policy_hours_worked',     operator: 'is greater than', values: ['0'] },
        ],
        [
          { fieldId: 'shift_policy_overtime_hours',   operator: 'is greater than', values: ['0'] },
        ],
      ]),
      mkAi('ts-ai-1', 'persona-005'),
      // Branch A — manager email + escalation
      {
        ...mkAction('ts-actionA-1', 'Send email'),
        configValues: {
          subject: 'Action required — pending timesheets',
          reply_to_address: 'no-reply@teambridge.app',
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Site Managers',
          message:
            'You have unsigned timesheets for this pay period. Please review and approve before EOD Sunday so payroll can run on Monday.',
        },
      },
      mkDelay('ts-delayA-1', '24', 'hours', '24 hours'),
      mkCondition('ts-condA-2', 'shift_policy_upload_timesheet', 'is', ['false']),
      {
        ...mkAction('ts-actionA-2', 'Send one-way SMS'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Site Managers — On Call',
          message:
            'Reminder: timesheet approvals still pending past the 24-hr window. Payroll cutoff is in 12 hours.',
        },
      },
      // Branch B — payroll webhook + audit report
      {
        ...mkAction('ts-actionB-1', 'Webhook notification'),
        configValues: {
          message: 'POST /payroll/timesheet-summary — pending review queue',
        },
      },
      {
        ...mkAction('ts-actionB-2', 'Send report'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Finance Operations',
          message: 'Weekly timesheet audit — outstanding approvals + overtime exceptions attached.',
        },
      },
    ],
    edges: [
      { id: 'ts-e1',  from: 'ts-trigger-1', to: 'ts-cond-1'    },
      { id: 'ts-e2',  from: 'ts-cond-1',    to: 'ts-ai-1'      },
      // Fan-out
      { id: 'ts-e3a', from: 'ts-ai-1',      to: 'ts-actionA-1' },
      { id: 'ts-e3b', from: 'ts-ai-1',      to: 'ts-actionB-1' },
      // Branch A chain
      { id: 'ts-e4',  from: 'ts-actionA-1', to: 'ts-delayA-1'  },
      { id: 'ts-e5',  from: 'ts-delayA-1',  to: 'ts-condA-2'   },
      { id: 'ts-e6',  from: 'ts-condA-2',   to: 'ts-actionA-2' },
      // Branch B chain
      { id: 'ts-e7',  from: 'ts-actionB-1', to: 'ts-actionB-2' },
    ],
  },

  // 3 · Shift swap notification — full dispatch flow with shift policy, multi-
  // group condition (urgent or high-priority), Sched AI handoff, and parallel
  // worker-outreach + manager-status branches.
  wf_01HGYH6CXD3TZ5QK: {
    name: 'Shift swap notification',
    status: 'archived',
    summary: [
      'Hey — this is **Shift swap notification**.',
      '',
      '**What this flow does:**',
      '- Fires when a **Shift** record is updated',
      '- Applies the **Shift Dispatch** policy (2 folders · 2 policies · **75% threshold**)',
      '- Filters to **open shifts starting within 24 hours** OR **published high-priority shifts**',
      '- Hands off to **Sched** to rank candidates',
      '- **Branch A** — feed message → 15 min delay → re-check open → SMS escalation to qualified RNs',
      '- **Branch B** — modify shift (mark notified) → chat ping the regional manager',
      '',
      '**Recent activity:**',
      "- **Apr 2** — last successful run (the flow has been **paused** for ~1 week since)",
      '',
      '**Suggested next steps:**',
      '- **Flip the flow back on** if the original use case still applies',
      '- Or **rework the targeting** before re-enabling',
    ].join('\n'),
    nodes: [
      mkTrigger('ss-trigger-1', 'Something is updated'),
      mkPolicy(
        'ss-policy-1',
        ['folder-clinical-shifts', 'folder-dispatch-priority'],
        ['policy-shift-fill-priority', 'policy-rn-credentials'],
        [],
        '75',
        'percentage',
      ),
      mkConditionGroups('ss-cond-1', [
        [
          { fieldId: 'shift_policy_status',     operator: 'is',           values: ['Open'] },
          { fieldId: 'shift_policy_start_time', operator: 'within next',  values: ['24 hours'] },
        ],
        [
          { fieldId: 'shift_policy_published', operator: 'is', values: ['true'] },
          { fieldId: 'shift_policy_rating',    operator: 'is greater than', values: ['4'] },
        ],
      ]),
      mkAi('ss-ai-1', 'persona-002'),
      // Branch A — feed → delay → re-check → SMS
      {
        ...mkAction('ss-actionA-1', 'Send feed message'),
        configValues: {
          send_to_type: 'All Qualified Users',
          send_to_value: 'Open shift candidates',
          message:
            'A shift just opened in your role. Tap to claim if you’re available — first-come, first-served.',
        },
      },
      mkDelay('ss-delayA-1', '15', 'minutes', '15 minutes'),
      mkCondition('ss-condA-2', 'shift_policy_status', 'is', ['Open']),
      {
        ...mkAction('ss-actionA-2', 'Send one-way SMS'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'On-call RN pool',
          message:
            'Open shift still unclaimed after 15 min — review and claim now to avoid coverage gaps.',
        },
      },
      // Branch B — modify shift status → ping manager
      {
        ...mkAction('ss-actionB-1', 'Modify'),
        configValues: { column: 'Status', modifier: 'Set' },
      },
      {
        ...mkAction('ss-actionB-2', 'Send chat message'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Regional Manager',
          message: 'A shift swap notification went out — see dispatch dashboard for status.',
        },
      },
    ],
    edges: [
      { id: 'ss-e1',  from: 'ss-trigger-1',  to: 'ss-policy-1'  },
      { id: 'ss-e2',  from: 'ss-policy-1',   to: 'ss-cond-1'    },
      { id: 'ss-e3',  from: 'ss-cond-1',     to: 'ss-ai-1'      },
      // Fan-out
      { id: 'ss-e4a', from: 'ss-ai-1',       to: 'ss-actionA-1' },
      { id: 'ss-e4b', from: 'ss-ai-1',       to: 'ss-actionB-1' },
      // Branch A chain
      { id: 'ss-e5',  from: 'ss-actionA-1',  to: 'ss-delayA-1'  },
      { id: 'ss-e6',  from: 'ss-delayA-1',   to: 'ss-condA-2'   },
      { id: 'ss-e7',  from: 'ss-condA-2',    to: 'ss-actionA-2' },
      // Branch B chain
      { id: 'ss-e8',  from: 'ss-actionB-1',  to: 'ss-actionB-2' },
    ],
  },

  // 4 · Overtime alert (draft) — clock-out trigger, multi-tier overtime check,
  // DataOps audit, parallel employee-warning + manager-review branches.
  wf_01HGZM4P8BKFYTR7: {
    name: 'Overtime alert',
    status: 'draft',
    summary: [
      'This is the **Overtime alert** draft.',
      '',
      '**What this flow does:**',
      '- Fires when a **user clocks out** of a shift',
      '- Filters to **regular hours > 35** OR **single-overtime hours > 0**',
      '- Hands off to **DataOps** for an audit pass',
      '- **Branch A** — employee warning email → 2 hr delay → re-check overtime → webhook to payroll',
      '- **Branch B** — manager chat alert → modify shift (flag for review)',
      '',
      '**Recent activity:**',
      "- Still a **draft** — **no runs yet**",
      "- Webhook target **isn't wired up** yet",
      '',
      '**Suggested next steps:**',
      '- Finish **wiring the webhook URL** on the action step',
      '- Add a **manager email** alongside the webhook for visibility',
    ].join('\n'),
    nodes: [
      mkTrigger('ot-trigger-1', 'User clocks out of shift'),
      mkConditionGroups('ot-cond-1', [
        [
          { fieldId: 'shift_policy_regular_hours',         operator: 'is greater than', values: ['35'] },
        ],
        [
          { fieldId: 'shift_policy_single_overtime_bill_hours', operator: 'is greater than', values: ['0'] },
        ],
        [
          { fieldId: 'shift_policy_double_overtime_hours', operator: 'is greater than', values: ['0'] },
        ],
      ]),
      mkAi('ot-ai-1', 'persona-005'),
      // Branch A — employee comms + payroll webhook
      {
        ...mkAction('ot-actionA-1', 'Send email'),
        configValues: {
          subject: 'You are approaching the overtime threshold',
          reply_to_address: 'payroll@teambridge.app',
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Initiating User',
          message:
            'Heads up — you’re close to the weekly overtime threshold. Confirm coverage with your manager before logging additional hours.',
        },
      },
      mkDelay('ot-delayA-1', '2', 'hours', '2 hours'),
      mkCondition('ot-condA-2', 'shift_policy_overtime_hours', 'is greater than', ['0']),
      {
        ...mkAction('ot-actionA-2', 'Webhook notification'),
        configValues: { message: 'POST /payroll/overtime — flagged user with hours payload' },
      },
      // Branch B — manager review
      {
        ...mkAction('ot-actionB-1', 'Send chat message'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Direct Manager',
          message: 'One of your team members crossed the overtime threshold this period.',
        },
      },
      {
        ...mkAction('ot-actionB-2', 'Modify'),
        configValues: { column: 'Payroll Status', modifier: 'Set' },
      },
    ],
    edges: [
      { id: 'ot-e1',  from: 'ot-trigger-1', to: 'ot-cond-1'    },
      { id: 'ot-e2',  from: 'ot-cond-1',    to: 'ot-ai-1'      },
      { id: 'ot-e3a', from: 'ot-ai-1',      to: 'ot-actionA-1' },
      { id: 'ot-e3b', from: 'ot-ai-1',      to: 'ot-actionB-1' },
      { id: 'ot-e4',  from: 'ot-actionA-1', to: 'ot-delayA-1'  },
      { id: 'ot-e5',  from: 'ot-delayA-1',  to: 'ot-condA-2'   },
      { id: 'ot-e6',  from: 'ot-condA-2',   to: 'ot-actionA-2' },
      { id: 'ot-e7',  from: 'ot-actionB-1', to: 'ot-actionB-2' },
    ],
  },

  // 5 · Contractor offboarding — full offboarding flow with policy guard, AI
  // checklist (Onbi), 1-hour grace delay, and parallel access-revocation +
  // equipment-recovery branches.
  wf_01HH01VQY7JN4E5M: {
    name: 'Contractor offboarding',
    status: 'live',
    summary: [
      "Here's **Contractor offboarding**.",
      '',
      '**What this flow does:**',
      '- Fires when a **Contract** record is updated',
      '- Applies the **Offboarding Compliance** policy (2 folders · 3 policies)',
      '- Filters to **employment_type = Contract** AND **archived = false**',
      '- Waits **1 hour** for any in-flight work to settle',
      '- Hands off to **Onbi** to run the offboarding checklist',
      '- **Branch A** — modify access record → finance summary email → lock the record',
      '- **Branch B** — assign equipment-return task → audit report → chat to people-ops',
      '',
      '**Recent activity:**',
      "- **~5 hours ago** — last run **exited early** (the email step didn't reach)",
      '',
      '**Suggested next steps:**',
      '- Check the **Modify column mapping** for the failure cause',
      '- Add a **retry** policy on the Modify step',
    ].join('\n'),
    nodes: [
      mkTrigger('co-trigger-1', 'Something is updated'),
      mkPolicy(
        'co-policy-1',
        ['folder-hr-offboarding', 'folder-it-deprovision'],
        ['policy-access-revoke', 'policy-final-pay', 'policy-equipment-return'],
        [],
        '80',
        'percentage',
      ),
      mkConditionGroups('co-cond-1', [
        [
          { fieldId: 'shift_user_link_employment_type', operator: 'is', values: ['Contract'] },
          { fieldId: 'shift_user_link_archived',        operator: 'is', values: ['false'] },
        ],
      ]),
      mkDelay('co-delay-1', '1', 'hours', '1 hour'),
      mkAi('co-ai-1', 'persona-003'),
      // Branch A — access revocation + finance comms
      {
        ...mkAction('co-actionA-1', 'Modify'),
        configValues: { column: 'User Link / Access Group', modifier: 'Set' },
      },
      {
        ...mkAction('co-actionA-2', 'Send email'),
        configValues: {
          subject: 'Contractor offboarding — finance summary',
          reply_to_address: 'no-reply@teambridge.app',
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Finance Operations',
          message:
            'Final timesheet, accrued PTO, and last paycheck details attached. Please confirm before payroll runs Monday.',
        },
      },
      {
        ...mkAction('co-actionA-3', 'Lock record'),
        configValues: {},
      },
      // Branch B — equipment return + audit
      {
        ...mkAction('co-actionB-1', 'Assign task'),
        configValues: { task: 'Driver License' },
      },
      {
        ...mkAction('co-actionB-2', 'Send report'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'IT Helpdesk',
          message: 'Equipment-return audit — laptop, badge, and access-token IDs attached.',
        },
      },
      {
        ...mkAction('co-actionB-3', 'Send chat message'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'People Ops',
          message: 'Contractor offboarded — exit interview window has been opened.',
        },
      },
    ],
    edges: [
      { id: 'co-e1',  from: 'co-trigger-1', to: 'co-policy-1'  },
      { id: 'co-e2',  from: 'co-policy-1',  to: 'co-cond-1'    },
      { id: 'co-e3',  from: 'co-cond-1',    to: 'co-delay-1'   },
      { id: 'co-e4',  from: 'co-delay-1',   to: 'co-ai-1'      },
      { id: 'co-e5a', from: 'co-ai-1',      to: 'co-actionA-1' },
      { id: 'co-e5b', from: 'co-ai-1',      to: 'co-actionB-1' },
      { id: 'co-e6',  from: 'co-actionA-1', to: 'co-actionA-2' },
      { id: 'co-e7',  from: 'co-actionA-2', to: 'co-actionA-3' },
      { id: 'co-e8',  from: 'co-actionB-1', to: 'co-actionB-2' },
      { id: 'co-e9',  from: 'co-actionB-2', to: 'co-actionB-3' },
    ],
  },

  // 6 · Premium shift dispatch & compliance — full-fat showcase workflow
  // exercising the trigger → policy → multi-group condition → AI specialist
  // → fan-out (two parallel branches with their own action chains, delay,
  // and follow-up condition) layout. Demonstrates every node type the
  // canvas knows how to render (trigger, policy, condition, ai, action,
  // delay) and the layout engine's branch placement (one root, two
  // descendant subtrees pinned to a shared AI parent).
  //
  // Each node carries realistic `configValues` so the right-panel selectors
  // are pre-filled (entity/recipients/message/threshold/persona/condition
  // groups, etc.) — the workflow looks like a fully-tuned production flow
  // when opened, not a fresh scaffold. Info-card metadata (nodeId,
  // createdAt, updatedAt, updatedBy) is set per-node so the right-panel
  // ⓘ overlay shows real-looking values too.
  //
  //  trigger ─ policy ─ cond ─ ai ──┬── action(feed) ─ delay ─ cond ─ action(SMS escalation)
  //                                 └── action(modify) ─ action(email)
  wf_01HK_PREMIUM_DISPATCH: (() => {
    // Shared Info-card timestamps so all nodes share a believable "this
    // workflow was authored Feb-04, last touched Apr-26" provenance.
    const CREATED  = '2026-02-04T13:42:00Z';
    const UPDATED  = '2026-04-26T22:18:00Z';
    const AUTHOR   = 'Tessa Moreno';
    const withInfo = <T extends GraphNode>(n: T, nodeId: string, updatedAt = UPDATED): T => ({
      ...n,
      nodeId,
      createdAt: CREATED,
      updatedAt,
      updatedBy: AUTHOR,
    });

    return {
      name: 'Premium shift dispatch & compliance',
      status: 'live' as AutomationStatus,
      summary: [
        "You're back on **Premium shift dispatch & compliance** — the showcase routing flow.",
        '',
        '**What this flow does:**',
        '- Fires when a **Shift is created**',
        '- Applies the **Premium Shift Compliance** policy (2 folders · 3 policies · 1 sub-policy override · **85% threshold**)',
        '- Checks **two condition groups**: RN with bill rate **>$75** **or** California with manager signature',
        '- The **Sched** specialist analyzes the candidate pool',
        '- **Branch A** — posts a feed message to qualified workers; escalates to regional managers via **SMS after 30 min** if still open',
        '- **Branch B** — marks the shift **premium-dispatch** and emails facility supervisors',
        '',
        '**Recent activity:**',
        '- **Today at 22:18** — SMS escalation copy was tightened',
        '- **59 of last 64 runs** completed cleanly',
        '',
        '**Suggested next steps:**',
        '- **Dial in the policy threshold** if matches are too tight or loose',
        '- **Swap the persona** to a different specialist',
        '- Add a **fallback branch** for when no candidates match',
      ].join('\n'),
      nodes: [
        // ── 1) Trigger ──────────────────────────────────────────────
        // "Something is created" → entity = Shifts. The right-panel
        // Configuration form reads `entity` from configValues and the
        // canvas card snippet renders "Shifts is created".
        withInfo(
          {
            ...mkTrigger('pd-trigger-1', 'Something is created'),
            configValues: { entity: 'Shifts', record_field: 'Status' },
          },
          'node_pd_trg_1',
          '2026-04-26T22:10:00Z',
        ),

        // ── 2) Policy ───────────────────────────────────────────────
        // Premium Shift Compliance bundle: 2 folders, 3 policies, 1
        // sub-policy override — see PolicyMatchingModal for how these
        // arrays are surfaced in the picker.
        withInfo(
          mkPolicy(
            'pd-policy-1',
            // Folders
            ['folder-clinical-premium', 'folder-compliance-bill'],
            // Policies
            [
              'policy-rn-billrate-tier-a',
              'policy-ca-state-overtime',
              'policy-manager-attestation',
            ],
            // Sub-policy override
            ['subpolicy-night-shift-bonus'],
            // Threshold: 85% match required
            '85',
            'percentage',
          ),
          'node_pd_pol_1',
          '2026-04-26T22:11:00Z',
        ),

        // ── 3) Condition (multi-group) ──────────────────────────────
        // Group 1 (AND): Main Credential is RN  AND  Regular Bill Rate > 75
        // Group 2 (AND): State is CA          AND  Manager Signature is true
        // Between groups: OR
        withInfo(
          mkConditionGroups('pd-cond-1', [
            [
              { fieldId: 'shift_policy_main_credential',   operator: 'is',              values: ['RN'] },
              { fieldId: 'shift_policy_regular_bill_rate', operator: 'is greater than', values: ['75'] },
            ],
            [
              { fieldId: 'shift_policy_state',             operator: 'is',  values: ['CA'] },
              { fieldId: 'shift_policy_manager_signature', operator: 'is',  values: ['true'] },
            ],
          ]),
          'node_pd_cnd_1',
          '2026-04-26T22:12:00Z',
        ),

        // ── 4) AI Specialist (Sched persona) ────────────────────────
        // mkAi pins selectedValue: 'AI Specialist' (literal) so the
        // popover flips into the configured branch and resolves the
        // persona row from configValues.ai_persona_id.
        withInfo(
          mkAi('pd-ai-1', 'persona-002'),
          'node_pd_ai_1',
          '2026-04-26T22:13:00Z',
        ),

        // ── 5a) Branch A · Send feed message ────────────────────────
        // Realistic outreach copy targeting all qualified workers.
        // Right-panel renders Send To / Recipients / Message fields.
        withInfo(
          {
            ...mkAction('pd-actionA-1', 'Send feed message'),
            configValues: {
              send_to_type: 'All Qualified Users',
              send_to_value: 'RN, premium-eligible',
              message:
                'A premium-rate shift just opened in your role. Tap to claim if you’re available — first-come, first-served.',
            },
          },
          'node_pd_actA_1',
          '2026-04-26T22:14:00Z',
        ),

        // ── 5b) Branch A · Delay 30 minutes ─────────────────────────
        withInfo(
          mkDelay('pd-delayA-1', '30', 'minutes', '30 Minutes'),
          'node_pd_dly_a',
          '2026-04-26T22:15:00Z',
        ),

        // ── 5c) Branch A · Re-check (Manager Signature is false) ───
        // Single-condition follow-up: stand-in semantic for "shift is
        // still open after 30 minutes — escalate."
        withInfo(
          mkCondition('pd-condA-2', 'shift_policy_manager_signature', 'is', ['false']),
          'node_pd_cnd_a2',
          '2026-04-26T22:16:00Z',
        ),

        // ── 5d) Branch A · Escalate via SMS ─────────────────────────
        // 'Send one-way SMS' has a NODE_CONFIG entry, so the right
        // panel renders Send To / Recipients / Message fields.
        withInfo(
          {
            ...mkAction('pd-actionA-2', 'Send one-way SMS'),
            configValues: {
              send_to_type: 'Specific Group of Users',
              send_to_value: 'Regional Managers — West',
              message:
                'Heads up: a premium shift has been open >30 min with no claims. Please review and dispatch.',
            },
          },
          'node_pd_actA_2',
          '2026-04-26T22:17:00Z',
        ),

        // ── 6a) Branch B · Modify (mark "premium dispatch") ────────
        // 'update_data_modify' renders Column / Modifier selects.
        withInfo(
          {
            ...mkAction('pd-actionB-1', 'Modify'),
            configValues: {
              column: 'Status',
              modifier: 'Set',
            },
          },
          'node_pd_actB_1',
          '2026-04-26T22:14:00Z',
        ),

        // ── 6b) Branch B · Send email (facility supervisor brief) ──
        withInfo(
          {
            ...mkAction('pd-actionB-2', 'Send email'),
            configValues: {
              subject: 'Premium dispatch initiated — review required',
              reply_to_address: 'no-reply@teambridge.app',
              send_to_type: 'Specific Group of Users',
              send_to_value: 'Facility Supervisors — Region 4',
              message:
                'A premium-rate shift has been routed to qualified workers. Compliance policy: Premium Shift Compliance (85% match). Please confirm coverage by EOD.',
              attach_log: 'true',
            },
          },
          'node_pd_actB_2',
          '2026-04-26T22:15:00Z',
        ),
      ],
      edges: [
        // Linear stem
        { id: 'pd-e1',  from: 'pd-trigger-1', to: 'pd-policy-1'  },
        { id: 'pd-e2',  from: 'pd-policy-1',  to: 'pd-cond-1'    },
        { id: 'pd-e3',  from: 'pd-cond-1',    to: 'pd-ai-1'      },
        // Fan-out from AI specialist into two parallel branches
        { id: 'pd-e4a', from: 'pd-ai-1',      to: 'pd-actionA-1' },
        { id: 'pd-e4b', from: 'pd-ai-1',      to: 'pd-actionB-1' },
        // Branch A chain
        { id: 'pd-e5',  from: 'pd-actionA-1', to: 'pd-delayA-1'  },
        { id: 'pd-e6',  from: 'pd-delayA-1',  to: 'pd-condA-2'   },
        { id: 'pd-e7',  from: 'pd-condA-2',   to: 'pd-actionA-2' },
        // Branch B chain
        { id: 'pd-e8',  from: 'pd-actionB-1', to: 'pd-actionB-2' },
      ],
    };
  })(),

  // 7 · Credential expiry monitor — recurring scan, multi-tier check on
  // credential expiry windows, DataOps audit, parallel renewal-reminder +
  // scheduling-block branches with delayed re-check + escalation.
  wf_01HK_CREDENTIAL_EXPIRY: {
    name: 'Credential expiry monitor',
    status: 'live',
    summary: [
      'Welcome to **Credential expiry monitor** — the daily compliance sweep.',
      '',
      '**What this flow does:**',
      '- Runs **every weekday at 8am**',
      '- Filters to **credentials expiring within 30 days** AND **user not archived**',
      '- Hands off to **DataOps** for an audit pass',
      '- **Branch A** — renewal email → 7 day delay → re-check → SMS escalation → lock record if still expired',
      '- **Branch B** — modify user (block from new shifts) → assign credential-renewal task → manager chat ping',
      '',
      '**Recent activity:**',
      '- **Yesterday at 08:00** — flagged 14 users for renewal',
      '- **142 of last 145 runs** completed cleanly',
      '',
      '**Suggested next steps:**',
      '- Tighten the **30-day window** if too many users get flagged at once',
      '- Add a **fallback** for users without an email on file',
    ].join('\n'),
    nodes: [
      mkTrigger('ce-trigger-1', 'Recurring at time interval'),
      mkConditionGroups('ce-cond-1', [
        [
          { fieldId: 'shift_credentials_main_credential_expiry_date', operator: 'within next', values: ['30 days'] },
          { fieldId: 'shift_user_link_archived',                       operator: 'is',          values: ['false'] },
        ],
      ]),
      mkAi('ce-ai-1', 'persona-005'),
      // Branch A — renewal reminder cascade
      {
        ...mkAction('ce-actionA-1', 'Send email'),
        configValues: {
          subject: 'Action required — credential expires soon',
          reply_to_address: 'compliance@teambridge.app',
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Credential Holder',
          message:
            'Your credential expires within 30 days. Please upload a renewed copy to keep your scheduling eligibility active.',
        },
      },
      mkDelay('ce-delayA-1', '7', 'days', '7 days'),
      mkCondition('ce-condA-2', 'shift_credentials_main_credential_expiry_date', 'within next', ['7 days']),
      {
        ...mkAction('ce-actionA-2', 'Send one-way SMS'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Credential Holder',
          message:
            'Final reminder: your credential expires within a week. Upload renewal to avoid being blocked from upcoming shifts.',
        },
      },
      {
        ...mkAction('ce-actionA-3', 'Lock record'),
        configValues: {},
      },
      // Branch B — operations side
      {
        ...mkAction('ce-actionB-1', 'Modify'),
        configValues: { column: 'User Link / Access Group', modifier: 'Set' },
      },
      {
        ...mkAction('ce-actionB-2', 'Assign task'),
        configValues: { task: 'Driver License' },
      },
      {
        ...mkAction('ce-actionB-3', 'Send chat message'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Credentialing Team',
          message: 'Credential expiry queue refreshed — see today’s flagged users.',
        },
      },
    ],
    edges: [
      { id: 'ce-e1',  from: 'ce-trigger-1', to: 'ce-cond-1'    },
      { id: 'ce-e2',  from: 'ce-cond-1',    to: 'ce-ai-1'      },
      { id: 'ce-e3a', from: 'ce-ai-1',      to: 'ce-actionA-1' },
      { id: 'ce-e3b', from: 'ce-ai-1',      to: 'ce-actionB-1' },
      // Branch A chain
      { id: 'ce-e4',  from: 'ce-actionA-1', to: 'ce-delayA-1'  },
      { id: 'ce-e5',  from: 'ce-delayA-1',  to: 'ce-condA-2'   },
      { id: 'ce-e6',  from: 'ce-condA-2',   to: 'ce-actionA-2' },
      { id: 'ce-e7',  from: 'ce-actionA-2', to: 'ce-actionA-3' },
      // Branch B chain
      { id: 'ce-e8',  from: 'ce-actionB-1', to: 'ce-actionB-2' },
      { id: 'ce-e9',  from: 'ce-actionB-2', to: 'ce-actionB-3' },
    ],
  },

  // 8 · Pay period close — bi-weekly trigger, 3-way fan-out (audit, comms,
  // payroll) showing how the canvas handles wider branching.
  wf_01HK_PAY_PERIOD_CLOSE: {
    name: 'Pay period close & payroll prep',
    status: 'live',
    summary: [
      'Welcome to **Pay period close & payroll prep** — the bi-weekly close-out.',
      '',
      '**What this flow does:**',
      '- Runs **every other Friday at 5pm**',
      '- Applies the **Pay Period Compliance** policy (3 folders · 4 policies · **95% threshold**)',
      '- Filters to **timesheets unsigned** OR **rate change pending** OR **bonus exception**',
      '- Hands off to **DataOps** for the close-out audit',
      '- **Branch A — audit** — send report → lock pay period record',
      '- **Branch B — comms** — chat managers → 4 hr delay → re-check signed → email escalation',
      '- **Branch C — payroll** — webhook to ADP → modify status to "submitted"',
      '',
      '**Recent activity:**',
      '- **Apr 18** — last close ran cleanly with 0 exceptions',
      '',
      '**Suggested next steps:**',
      '- Add a **chat ping to finance** at the start of the audit branch',
      '- Wire a **retry policy** on the payroll webhook',
    ].join('\n'),
    nodes: [
      mkTrigger('pp-trigger-1', 'Recurring at time interval'),
      mkPolicy(
        'pp-policy-1',
        ['folder-pay-policy', 'folder-payroll-rates', 'folder-bonus-overrides'],
        ['policy-pay-cutoff', 'policy-rate-changes', 'policy-bonus-eligibility', 'policy-statutory-holidays'],
        ['subpolicy-statutory-stat-pay'],
        '95',
        'percentage',
      ),
      mkConditionGroups('pp-cond-1', [
        [
          { fieldId: 'shift_policy_upload_timesheet', operator: 'is', values: ['false'] },
        ],
        [
          { fieldId: 'shift_policy_pay_rate', operator: 'is greater than', values: ['0'] },
        ],
        [
          { fieldId: 'shift_policy_bill_bonus', operator: 'is greater than', values: ['0'] },
        ],
      ]),
      mkAi('pp-ai-1', 'persona-005'),
      // Branch A — audit
      {
        ...mkAction('pp-actionA-1', 'Send report'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Finance Operations',
          message: 'Pay period close audit — exceptions, rate changes, and bonus eligibility attached.',
        },
      },
      {
        ...mkAction('pp-actionA-2', 'Lock record'),
        configValues: {},
      },
      // Branch B — manager comms + escalation
      {
        ...mkAction('pp-actionB-1', 'Send chat message'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Site Managers',
          message: 'Pay period close window opens — please sign off on outstanding timesheets.',
        },
      },
      mkDelay('pp-delayB-1', '4', 'hours', '4 hours'),
      mkCondition('pp-condB-2', 'shift_policy_upload_timesheet', 'is', ['false']),
      {
        ...mkAction('pp-actionB-2', 'Send email'),
        configValues: {
          subject: 'Pay period close — outstanding sign-offs',
          reply_to_address: 'payroll@teambridge.app',
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Site Managers',
          message: 'Outstanding timesheet sign-offs are blocking payroll close. Please review and approve before EOD.',
        },
      },
      // Branch C — payroll
      {
        ...mkAction('pp-actionC-1', 'Webhook notification'),
        configValues: { message: 'POST /payroll/run — close-out trigger' },
      },
      {
        ...mkAction('pp-actionC-2', 'Modify'),
        configValues: { column: 'Payroll Status', modifier: 'Set' },
      },
    ],
    edges: [
      { id: 'pp-e1',  from: 'pp-trigger-1', to: 'pp-policy-1'  },
      { id: 'pp-e2',  from: 'pp-policy-1',  to: 'pp-cond-1'    },
      { id: 'pp-e3',  from: 'pp-cond-1',    to: 'pp-ai-1'      },
      // 3-way fan-out
      { id: 'pp-e4a', from: 'pp-ai-1',      to: 'pp-actionA-1' },
      { id: 'pp-e4b', from: 'pp-ai-1',      to: 'pp-actionB-1' },
      { id: 'pp-e4c', from: 'pp-ai-1',      to: 'pp-actionC-1' },
      // Branch A
      { id: 'pp-e5',  from: 'pp-actionA-1', to: 'pp-actionA-2' },
      // Branch B
      { id: 'pp-e6',  from: 'pp-actionB-1', to: 'pp-delayB-1'  },
      { id: 'pp-e7',  from: 'pp-delayB-1',  to: 'pp-condB-2'   },
      { id: 'pp-e8',  from: 'pp-condB-2',   to: 'pp-actionB-2' },
      // Branch C
      { id: 'pp-e9',  from: 'pp-actionC-1', to: 'pp-actionC-2' },
    ],
  },

  // 9 · Document e-sign workflow — focused on document/notification node mix.
  wf_01HK_DOC_ESIGN: {
    name: 'Document e-sign reminder',
    status: 'live',
    summary: [
      'Welcome to **Document e-sign reminder**.',
      '',
      '**What this flow does:**',
      '- Fires when a **Document** is completed',
      '- Filters to **document type = Contract** OR **type = Compliance**',
      '- Hands off to **Cassie** to manage the signer follow-up',
      '- **Branch A** — send e-sign packet → 48 hr delay → still unsigned? → SMS reminder',
      '- **Branch B** — webhook to records → chat archive team',
      '',
      '**Recent activity:**',
      '- **Apr 22** — collected 29 signatures during the last sweep',
      '',
      '**Suggested next steps:**',
      '- Add a **second escalation** at 96 hours',
      '- Wire a **fallback** for unsigned documents past the deadline',
    ].join('\n'),
    nodes: [
      mkTrigger('de-trigger-1', 'Document completed'),
      mkConditionGroups('de-cond-1', [
        [
          { fieldId: 'shift_credentials_main_credential_type', operator: 'is', values: ['Contract'] },
        ],
        [
          { fieldId: 'shift_credentials_main_credential_type', operator: 'is', values: ['Compliance'] },
        ],
      ]),
      mkAi('de-ai-1', 'persona-004'),
      // Branch A — signer cascade
      {
        ...mkAction('de-actionA-1', 'Send e-sign document'),
        configValues: {},
      },
      mkDelay('de-delayA-1', '48', 'hours', '48 hours'),
      mkCondition('de-condA-2', 'shift_credentials_main_credential_file', 'is empty', []),
      {
        ...mkAction('de-actionA-2', 'Send one-way SMS'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Document Signer',
          message: 'You have an outstanding document awaiting your signature. Tap the link in your email to complete.',
        },
      },
      // Branch B — records + archive
      {
        ...mkAction('de-actionB-1', 'Webhook notification'),
        configValues: { message: 'POST /records/document-status — signing initiated' },
      },
      {
        ...mkAction('de-actionB-2', 'Send chat message'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Records Team',
          message: 'New e-sign packet sent — see records dashboard for status.',
        },
      },
    ],
    edges: [
      { id: 'de-e1',  from: 'de-trigger-1', to: 'de-cond-1'    },
      { id: 'de-e2',  from: 'de-cond-1',    to: 'de-ai-1'      },
      { id: 'de-e3a', from: 'de-ai-1',      to: 'de-actionA-1' },
      { id: 'de-e3b', from: 'de-ai-1',      to: 'de-actionB-1' },
      { id: 'de-e4',  from: 'de-actionA-1', to: 'de-delayA-1'  },
      { id: 'de-e5',  from: 'de-delayA-1',  to: 'de-condA-2'   },
      { id: 'de-e6',  from: 'de-condA-2',   to: 'de-actionA-2' },
      { id: 'de-e7',  from: 'de-actionB-1', to: 'de-actionB-2' },
    ],
  },

  // 10 · Branch decision demo — small flow whose only purpose is to exercise
  // a condition node that splits into two parallel downstream paths. The
  // condition has 2 outgoing edges seeded so the canvas renders the fan-out
  // on first load — useful as a stress-test case for condition fan-out and
  // node-card interactions.
  wf_01HK_BRANCH_DEMO: {
    name: 'Eligibility branch demo',
    status: 'live',
    summary: [
      'Welcome to **Eligibility branch demo** — a focused flow that splits a single condition into two parallel downstream paths.',
      '',
      '**What this flow does:**',
      '- Fires when a **shift request** is received',
      '- Checks whether the requester **meets the eligibility bar**',
      '- **Match** path — sends an instant approval feed message',
      '- **No match** path — emails the manager for manual review with a 30 min escalation if no response',
      '',
      '**Recent activity:**',
      '- Authored to exercise condition fan-out into multiple downstream paths',
      '',
      '**Suggested next steps:**',
      '- **Drag** a connection from the condition to add a third downstream path',
      '- **Delete** one of the outgoing edges to prune that path',
      '- **Reword** the condition criteria to tighten which requests qualify',
    ].join('\n'),
    nodes: [
      mkTrigger('br-trigger-1', 'User claims a shift'),
      mkConditionGroups('br-cond-1', [
        [
          { fieldId: 'shift_policy_main_credential',   operator: 'is',              values: ['RN'] },
          { fieldId: 'shift_policy_rating',            operator: 'is greater than', values: ['4'] },
        ],
      ]),
      // Yes branch — auto-approve
      {
        ...mkAction('br-yes-1', 'Send feed message'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Initiating User',
          message: 'Your shift claim has been approved automatically — see your schedule for details.',
        },
      },
      // No branch — manager review with escalation
      {
        ...mkAction('br-no-1', 'Send email'),
        configValues: {
          subject: 'Manual review required — shift claim',
          reply_to_address: 'scheduling@teambridge.app',
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Site Managers',
          message: 'A shift claim is awaiting manual review — eligibility criteria were not met automatically.',
        },
      },
      mkDelay('br-no-delay-1', '30', 'minutes', '30 minutes'),
      {
        ...mkAction('br-no-2', 'Send chat message'),
        configValues: {
          send_to_type: 'Specific Group of Users',
          send_to_value: 'Regional Manager',
          message: 'Manual review still pending after 30 minutes — please action.',
        },
      },
    ],
    edges: [
      { id: 'br-e1',     from: 'br-trigger-1', to: 'br-cond-1'      },
      // Condition fan-out — two parallel downstream paths from the same
      // condition. No labels; both edges render identically.
      { id: 'br-e-yes',  from: 'br-cond-1',    to: 'br-yes-1' },
      { id: 'br-e-no',   from: 'br-cond-1',    to: 'br-no-1'  },
      { id: 'br-e2',     from: 'br-no-1',      to: 'br-no-delay-1'  },
      { id: 'br-e3',     from: 'br-no-delay-1', to: 'br-no-2'       },
    ],
  },
};

export function BuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = !id;
  // Resolve the workflow template by id. A known id with no template still
  // falls back to the generic edit initial state (trigger + condition stubs).
  const template = id ? WORKFLOW_TEMPLATES[id] : undefined;

  // If we arrived here from TemplatesPage, router-state carries the template
  // spec to materialize on the canvas. Consumed during initial state setup.
  const routerTemplate = (location.state as RouterTemplateState | null) ?? null;
  const routerTemplateGraph = routerTemplate && routerTemplate.templateSteps?.length
    ? buildTemplateGraph(routerTemplate)
    : null;

  const [name, setName] = useState(
    routerTemplate?.templateName
      ?? (isNew ? 'Untitled workflow' : (template?.name ?? 'Candidate Onboarding')),
  );
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  // Initial status mirrors the workflow list's status chip — every catalog
  // entry seeds this via the matching `WORKFLOW_TEMPLATES[id].status`. New
  // workflows + unknown ids fall back to `'draft'` so the TopBar tag still
  // renders correctly.
  const [status] = useState<AutomationStatus>(
    template?.status ?? (isNew ? 'draft' : 'draft'),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Backfill Info metadata on every node — covers INIT_NODES (hardcoded
   // without Info fields) and guarantees every node on the canvas exposes a
   // stable nodeId in the right-panel Info section. Runs once at mount.
  const seedInfoMetadata = (list: GraphNode[]): GraphNode[] => {
    const now = new Date().toISOString();
    const who = currentUserDisplayName();
    return list.map(n => ({
      ...n,
      nodeId: n.nodeId ?? generateShortNodeId(),
      createdAt: n.createdAt ?? now,
      updatedAt: n.updatedAt ?? now,
      updatedBy: n.updatedBy ?? who,
    }));
  };
  // Pick the initial node/edge shape in priority order:
  //   1. Persisted graph blob from localStorage (set by previous edit
  //      session — only when the user navigates back to a workflow they
  //      already touched).
  //   2. Library-template spec from router state (TemplatesPage → builder)
  //   3. Prebuilt per-workflow template matched by id
  //   4. New (blank) trigger stub
  //   5. Generic two-node edit shape for unmatched existing workflows
  const persistedGraph: WorkflowGraphEntry | undefined =
    id ? loadWorkflowGraphs()[id] : undefined;
  const initialNodes: GraphNode[] = (persistedGraph?.nodes as GraphNode[] | undefined)
    ?? routerTemplateGraph?.nodes
    ?? (isNew ? INIT_NODES_NEW : (template?.nodes ?? INIT_NODES_EDIT));
  const initialEdges: GraphEdge[] = (persistedGraph?.edges as GraphEdge[] | undefined)
    ?? routerTemplateGraph?.edges
    ?? (isNew ? [] : (template?.edges ?? INIT_EDGES_EDIT));

  const [nodes, setNodes] = useState<GraphNode[]>(() => seedInfoMetadata(initialNodes));
  const [edges, setEdges] = useState<GraphEdge[]>(() => initialEdges);

  // ── Free-positioning: store each node's canvas coordinates ──
  // When restoring a persisted graph, prefer the saved coordinates so the
  // user sees the exact layout they last had (including any manual nudges).
  // Otherwise fall back to the auto-layout for the seed/template shape.
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(() => {
    if (persistedGraph?.nodePositions) {
      return { ...persistedGraph.nodePositions };
    }
    const layout = computeLayout(initialNodes, initialEdges);
    const result: Record<string, { x: number; y: number }> = {};
    layout.forEach((pos, id) => { result[id] = pos; });
    return result;
  });

  const [selectedId,      setSelectedId]      = useState<string | null>(isNew ? 'trigger-1' : null);
  const [draggingLibNode, setDraggingLibNode] = useState<LibraryItem | null>(null);
  const [autoTidyToken,   setAutoTidyToken]   = useState(0);

  // ── Initial auto-tidy ──────────────────────────────────────────────────────
  // The seed/template layout uses static `NODE_HEIGHTS` estimates, which can
  // be off by tens of pixels for content-heavy policy/condition cards or for
  // ai/action nodes whose anchor sits on the icon (not the wrapper centre).
  // After the first paint the DOM has the real heights and anchor offsets, so
  // bump `autoTidyToken` once to re-run layout with measured values — every
  // node lands with its anchor centred on the chain's row, producing a clean
  // horizontal flow. Skip when restoring a persisted graph (the user's
  // manual nudges should win) and when the workflow is brand new (no nodes
  // beyond the trigger stub means nothing to tidy). */
  const didInitialAutoTidy = useRef(false);
  useEffect(() => {
    if (didInitialAutoTidy.current) return;
    if (persistedGraph?.nodePositions) return;
    if (initialNodes.length < 2) return;
    didInitialAutoTidy.current = true;
    // Defer one frame so refs + measured DOM are wired before tidy runs.
    requestAnimationFrame(() => setAutoTidyToken(t => t + 1));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [fitToken,        setFitToken]        = useState(0);
  const [editNodeMode,    setEditNodeMode]    = useState(false);
  const [editingNodeIds,  setEditingNodeIds]  = useState<Set<string>>(new Set());
  const [saveState,       setSaveState]       = useState<SaveState>('idle');
  const [globalAiPrompt,  setGlobalAiPrompt]  = useState('');
  const [threadEntries, setThreadEntries] = useState<ThreadEntry[]>([]);
  const [aiTyping, setAiTyping] = useState(false);
  // AI panel collapse — when true, the LeftPanel + body divider unmount
  // entirely and a small re-open button surfaces beneath the top bar in
  // the right column.
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);
  // AI panel width — drag-to-resize from the LeftPanel's right edge. Owned
  // here so the surrounding `.body` grid can size its first column to the
  // live value (CSS grid `grid-template-columns` is set inline against
  // `aiPanelWidth`); the LeftPanel just reports new widths via callback.
  const [aiPanelWidth, setAiPanelWidth] = useState(360);

  // ── Undo history (Cmd/Ctrl+Z) ─────────────────────────────────────────────
  // Snapshots `{ nodes, edges, name, nodePositions }` before each mutation;
  // Cmd/Ctrl+Z pops the most recent snapshot and restores it.
  //
  // Why this shape, not a per-mutation wrapper:
  // - Mutation surface is wide (8+ setNodes / setEdges call sites for add,
  //   delete, configure, connect, edit, drop-onto-edge, drag-to-move, etc).
  //   Wrapping each one would mean threading the history capture through
  //   every helper.
  // - A useEffect that watches the canvas state runs after every commit,
  //   so capturing the *previous* render's snapshot from a ref gives us a
  //   single source of truth for "what was on the canvas before this
  //   commit?" — covers every existing setter and any new ones added later.
  // - `nodePositions` is included so drag-to-move is undoable too. Without
  //   it the user would feel undo is "not working" any time they nudge a
  //   node and expect Cmd+Z to put it back.
  type Snapshot = {
    nodes:         GraphNode[];
    edges:         GraphEdge[];
    name:          string;
    nodePositions: Record<string, { x: number; y: number }>;
  };
  const undoStackRef = useRef<Snapshot[]>([]);
  // Most-recently-rendered snapshot. Updated synchronously inside the watcher
  // useEffect so the next mutation can read it as the "from" half of the pair.
  const prevSnapshotRef = useRef<Snapshot>({ nodes, edges, name, nodePositions });
  // Set to `true` immediately before applying an undo, then cleared inside
  // the watcher effect. Skips re-pushing the undo result onto the stack
  // (which would defeat redo intent and trap the user in a no-op loop).
  const isApplyingUndoRef = useRef(false);
  const UNDO_STACK_MAX = 50;

  useEffect(() => {
    if (isApplyingUndoRef.current) {
      isApplyingUndoRef.current = false;
      prevSnapshotRef.current = { nodes, edges, name, nodePositions };
      return;
    }
    const prev = prevSnapshotRef.current;
    if (
      prev.nodes === nodes &&
      prev.edges === edges &&
      prev.name === name &&
      prev.nodePositions === nodePositions
    ) return;
    undoStackRef.current.push(prev);
    if (undoStackRef.current.length > UNDO_STACK_MAX) undoStackRef.current.shift();
    prevSnapshotRef.current = { nodes, edges, name, nodePositions };
  }, [nodes, edges, name, nodePositions]);

  const undo = useCallback(() => {
    const last = undoStackRef.current.pop();
    if (!last) return;
    isApplyingUndoRef.current = true;
    setNodes(last.nodes);
    setEdges(last.edges);
    setName(last.name);
    setNodePositions(last.nodePositions);
  }, []);

  // Global Cmd/Ctrl+Z handler. Suppresses the shortcut when the user is
  // typing into a form control (otherwise we'd undo the canvas while they
  // expect text-field undo to handle their typing). Uses `keydown` capture
  // so we win against any inner handler that might call stopPropagation
  // (the Alloy contenteditable workflow-name field does this on Enter).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const meta = isMac ? e.metaKey : e.ctrlKey;
      if (!meta) return;
      if (e.key.toLowerCase() !== 'z') return;
      if (e.shiftKey) return; // leave Shift+Cmd+Z available for future redo
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable) return;
      }
      e.preventDefault();
      undo();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [undo]);

  // Rolling index per response bank so consecutive AI reactions don't repeat.
  const aiReactionIdxRef = useRef<Record<string, number>>({});
  const aiTypingTimerRef = useRef<number | null>(null);
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Activity feed helpers ────────────────────────────────────────────────
  // Consuming mutations call logActivity + (optionally) scheduleAiReaction.
  // Both always append to the same thread — activity entries interleave with
  // AI bubbles chronologically.

  const appendThreadEntry = useCallback((entry: Omit<ThreadEntry, 'id' | 'timestamp'>) => {
    setThreadEntries(prev => [...prev, {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...entry,
    }]);
  }, []);

  const scheduleAiReaction = useCallback((bank: string[], bankKey: string) => {
    if (!bank || bank.length === 0) return;
    if (aiTypingTimerRef.current != null) {
      window.clearTimeout(aiTypingTimerRef.current);
    }
    setAiTyping(true);

    // Immediately append a `pending` AI entry so the activity trail can
    // start rendering its live progression *before* the message text
    // arrives. The entry's content is filled in once the simulated
    // thinking phase completes (matches the trail's total runtime + a
    // small buffer so the last step settles before the text streams in).
    const pendingId = crypto.randomUUID();
    setThreadEntries(prev => [...prev, {
      id: pendingId,
      kind: 'ai',
      content: '',
      pending: true,
      timestamp: Date.now(),
    }]);

    const delay = ASSISTANT_TRAIL_TOTAL_MS + 400;
    aiTypingTimerRef.current = window.setTimeout(() => {
      // Pick the next line in the bank, skipping the same index as last time
      // so two reactions for the same event type never repeat verbatim.
      const prevIdx = aiReactionIdxRef.current[bankKey] ?? -1;
      const idx = bank.length > 1
        ? (prevIdx + 1) % bank.length
        : 0;
      aiReactionIdxRef.current[bankKey] = idx;
      setThreadEntries(prev => prev.map(e =>
        e.id === pendingId
          ? { ...e, content: bank[idx], pending: false, timestamp: Date.now() }
          : e
      ));
      setAiTyping(false);
    }, delay);
  }, []);

  // Canvas-triggered activity entry. The second `bankKey` argument is kept
  // for call-site compatibility but no longer triggers an AI reaction — AI
  // only responds to explicit user messages from the chat composer or the
  // per-node prompt input.
  const logActivity = useCallback((content: string, _bankKey?: string) => {
    appendThreadEntry({ kind: 'activity', content });
  }, [appendThreadEntry]);

  /**
   * Emit a `node_change` thread entry for any user-driven canvas mutation.
   * The thread render groups consecutive `node_change` entries that fall in
   * the same wall-clock minute into a single UserChangeGroup block, where
   * each change type (Added / Deleted / Connected / Modified) is its own
   * collapsible sub-row showing the affected nodes via a paginated card.
   *
   * `changeType` drives the row icon + label; `headerLabel` overrides the
   * sub-row title (defaults to `changeType`); `nodes` carries one entry per
   * node touched (both endpoints for connect/disconnect, the deleted node
   * for delete, etc.).
   */
  const emitNodeChange = useCallback((payload: NodeChangePayload, content: string) => {
    appendThreadEntry({ kind: 'node_change', content, nodeChange: payload });
  }, [appendThreadEntry]);

  // Welcome message — appended once when the thread is empty on mount.
  // `seeded: true` so the renderer skips the activity-trail summary on
  // this bubble (it's a static greeting, not a response).
  //
  // Three routing branches for the bubble copy:
  //   1) Known workflow id with a hand-authored `summary` → use it verbatim.
  //   2) Arrived from TemplatesPage with router state → synthesize a
  //      template-aware summary describing what was scaffolded.
  //   3) Anything else (new blank workflow, unknown id) → generic welcome.
  const welcomeContent = useMemo(() => {
    if (template?.summary) return template.summary;
    if (routerTemplate) return buildRouterTemplateSummary(routerTemplate);
    return WELCOME_AI_MESSAGE;
    // Resolved once at mount — workflow id / router state don't change after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setThreadEntries(prev => prev.length === 0
      ? [{ id: crypto.randomUUID(), kind: 'ai', content: welcomeContent, timestamp: Date.now(), seeded: true }]
      : prev);
    // Clean up any pending typing timer on unmount
    return () => {
      if (aiTypingTimerRef.current != null) {
        window.clearTimeout(aiTypingTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Debounced auto-save ──
  // Persists the current canvas state (nodes / edges / positions) to
  // localStorage so the user can navigate away and return to the same
  // workflow with all of their edits intact. The "saving…" → "saved"
  // chrome the top bar already renders is driven off the same effect,
  // so the visual feedback now reflects an actual write rather than a
  // metadata-only ping.
  const isMount = useRef(true);
  useEffect(() => {
    if (isMount.current) { isMount.current = false; return; }
    if (saveTimer.current)  clearTimeout(saveTimer.current);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(() => {
      if (id) {
        saveWorkflowGraphEntry(id, {
          nodes,
          edges,
          nodePositions,
          savedAt: new Date().toISOString(),
        });
      }
      setSaveState('saved');
      savedTimer.current = setTimeout(() => setSaveState('idle'), 2500);
    }, 1200);
    return () => {
      if (saveTimer.current)  clearTimeout(saveTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, [id, name, description, status, nodes, edges, nodePositions, tags]);

  // ── Load saved workflow settings from localStorage on mount ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!id) return;
    const entry = loadWorkflowSettings()[id];
    if (entry) {
      setName(entry.name);
      setDescription(entry.description);
      setTags(entry.tags);
    }
  }, []);

  const makeNode = (type: StepType): GraphNode => {
    const now = new Date().toISOString();
    return {
      id: `${type}-${++_nextId}`,
      type,
      label: `Add a ${type}`,
      placeholder: {
        trigger:   'Search events',
        condition: 'Search condition',
        action:    'Search actions',
        ai:        'Add a Specialist',
        delay:     'Set delay...',
        policy:    'Select policies...',
      }[type],
      configured: false,
      // Short, human-readable, stable node identifier — surfaced in the
      // right-panel Info section and used in prompt/activity references.
      nodeId: generateShortNodeId(),
      createdAt: now,
      updatedAt: now,
      updatedBy: currentUserDisplayName(),
      ...(type === 'delay' ? { configValues: { unit: 'minutes' } } : {}),
      ...(type === 'policy' ? {
        configValues: { thresholdValue: '50', thresholdMode: 'score' },
        // Seed one empty IF branch so the canvas card immediately
        // renders the multi-row layout (mirrors condition nodes).
        policyBranches: [makeEmptyPolicyBranch()],
      } : {}),
      // Condition nodes start with one empty IF branch so the canvas card
      // and right panel both render the multi-row layout immediately —
      // no separate "empty pill" placeholder. The branch contains a
      // single placeholder ConditionEntry the user fills in.
      ...(type === 'condition' ? {
        conditionBranches: [
          { id: makeBranchId(), groups: [{ id: makeGroupId(), conditions: [makeEmptyCondition()] }] },
        ],
      } : {}),
    };
  };

  /** Add a new node connected after parentId (null = new root/workflow). */
  const addNodeAfter = (
    parentId: string | null,
    type: StepType,
    selectedValue?: string,
  ) => {
    if (!canAddNodeAfter(parentId, type, nodes, edges)) return;
    const n = makeNode(type);
    if (selectedValue) { n.selectedValue = selectedValue; n.configured = true; }

    // Compute initial canvas position for the new node
    const parentPos = parentId ? nodePositions[parentId] : null;
    let initX: number, initY: number;
    if (parentId === null) {
      // Independent flow — stack new roots vertically beneath the existing ones
      const ys = Object.values(nodePositions).map(p => p.y);
      initX = 0;
      initY = ys.length > 0 ? Math.max(...ys) + V_SPACING : CANVAS_TOP;
    } else if (parentPos) {
      initX = parentPos.x + H_SPACING;
      initY = parentPos.y;
    } else {
      initX = 0; initY = CANVAS_TOP;
    }
    setNodePositions(prev => ({ ...prev, [n.id]: { x: initX, y: initY } }));

    setNodes(prev => [...prev, n]);
    if (parentId !== null) {
      const e: GraphEdge = { id: `edge-${++_nextId}`, from: parentId, to: n.id };
      setEdges(prev => [...prev, e]);
    }
    setSelectedId(n.id);
    const label = STEP_CONFIG[type].label;
    const nodeName = selectedValue || label;
    emitNodeChange(
      {
        nodes: [{ id: n.id, type, name: nodeName }],
        changeType: 'Added',
        headerLabel: `${label} added`,
        side: 'outbound',
      },
      `${label} added`,
    );
  };

  /** Toggle edit-node selection mode. Exiting mode clears the selection. */
  const toggleEditMode = () => {
    setEditNodeMode(prev => {
      if (prev) setEditingNodeIds(new Set());
      return !prev;
    });
  };

  const handleSettingsSave = useCallback((newName: string, newDesc: string, newTags: string[]) => {
    setName(newName);
    setDescription(newDesc);
    setTags(newTags);
    if (id) {
      const stored = loadWorkflowSettings();
      stored[id] = { name: newName, description: newDesc, tags: newTags };
      saveWorkflowSettings(stored);
    }
    setSettingsOpen(false);
  }, [id]);

  /** Toggle a single node in/out of the edit-node selection set. */
  const handleEditNodeToggle = (id: string, multi: boolean) => {
    setEditingNodeIds(prev => {
      const next = new Set(prev);
      if (multi) {
        if (next.has(id)) next.delete(id); else next.add(id);
      } else {
        if (next.size === 1 && next.has(id)) next.delete(id);
        else { next.clear(); next.add(id); }
      }
      return next;
    });
  };

  /** Add a fresh disconnected trigger — starts a new independent workflow. */
  const addRootTrigger = () => addNodeAfter(null, 'trigger');

  // ── Info metadata — updatedAt / updatedBy bump on every node mutation ──
  // Centralised so callers can thread a node through this helper instead of
  // each setter remembering to update timestamps.
  const touchNode = <T extends GraphNode>(node: T): T => ({
    ...node,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUserDisplayName(),
  });
  /** Touch every node whose id is in `ids`. Used by edge mutations that
   *  affect both endpoints of a connection change. */
  const touchNodesById = (ids: string[]) =>
    setNodes(prev => prev.map(n => (ids.includes(n.id) ? touchNode(n) : n)));

  // Each condition node owns its own conditions[] list + conditionLogic operator.
  // NOTE: activity logging for config changes is deferred until the user
  // clicks Save in the right panel (see handleSaveNodePopover). This keeps
  // the state mutation silent while the popover is open.
  const updateNode = (id: string, selectedValue: string) =>
    setNodes(prev => prev.map(n => {
      if (n.id !== id) return n;
      // Clearing an Action (selectedValue === '') also resets its configValues so
      // stale fields from the previous action don't bleed into the next selection.
      const clearing = selectedValue === '';
      return touchNode({
        ...n,
        selectedValue,
        configured: !clearing,
        configValues: clearing && n.type === 'action' ? {} : n.configValues,
      });
    }));

  /** Legacy single-op/value setter — still used by the AI tool handler for condition
   *  steps. Persists into the first condition entry, creating one if needed. */
  const updateConditionConfig = (id: string, op: string, vals: string[]) =>
    setNodes(prev => prev.map(n => {
      if (n.id !== id || n.type !== 'condition') return n;
      const conds = n.conditions ?? [];
      // The AI tool writes the legacy flat list. Clear `conditionGroups` so
      // the editor re-derives from this fresh legacy list the next time it
      // reads; otherwise a stale group snapshot would hide the new values.
      if (conds.length === 0) {
        return touchNode({
          ...n,
          conditions: [{ fieldId: '', operator: op, values: vals }],
          conditionLogic: n.conditionLogic ?? 'AND',
          conditionGroups: undefined,
        });
      }
      const next = conds.map((c, i) => i === 0 ? { ...c, operator: op, values: vals } : c);
      return touchNode({ ...n, conditions: next, conditionGroups: undefined });
    }));

  /** Replace the full conditions list + logic operator for a condition node. Also syncs
   *  `selectedValue` and `configured` so legacy display paths (node icon, canvas
   *  summary fallback) continue to work. */
  const updateConditions = (nodeId: string, conditions: ConditionEntry[], logic: 'AND' | 'OR') => {
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      const first = conditions[0];
      const firstDef = first ? CONDITION_LIBRARY.find(d => d.id === first.fieldId) ?? null : null;
      return touchNode({
        ...n,
        conditions,
        conditionLogic: logic,
        selectedValue: firstDef?.label ?? (conditions.length > 0 ? n.selectedValue : undefined),
        configured: conditions.length > 0,
      });
    }));
  };

  /** Group-based updater — replaces the full `conditionGroups` list on a
   *  condition node, and projects the flat `conditions + conditionLogic`
   *  legacy fields so existing readers still work. */
  const updateConditionGroups = (nodeId: string, groups: ConditionGroup[]) => {
    const flat = flattenConditionGroups(groups);
    const firstCond = flat.conditions[0];
    const firstDef = firstCond
      ? CONDITION_LIBRARY.find(d => d.id === firstCond.fieldId) ?? null
      : null;
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      return touchNode({
        ...n,
        conditionGroups: groups,
        conditions: flat.conditions,
        conditionLogic: flat.conditionLogic,
        selectedValue: firstDef?.label ?? (flat.conditions.length > 0 ? n.selectedValue : undefined),
        configured: flat.conditions.length > 0,
      });
    }));
  };

  /** Branch-based updater — replaces the node's `conditionBranches` list and
   *  projects flat `conditionGroups`, `conditions`, and `conditionLogic`
   *  legacy fields (using the *first* branch's groups) so existing readers
   *  keep working. */
  const updateConditionBranches = (nodeId: string, branches: ConditionBranch[]) => {
    const firstBranchGroups = branches[0]?.groups ?? [];
    const flat = flattenConditionGroups(firstBranchGroups);
    const firstCond = flat.conditions[0];
    const firstDef = firstCond
      ? CONDITION_LIBRARY.find(d => d.id === firstCond.fieldId) ?? null
      : null;
    const totalCount = countConditionsInBranches(branches);
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      return touchNode({
        ...n,
        conditionBranches: branches,
        conditionGroups: firstBranchGroups,
        conditions: flat.conditions,
        conditionLogic: flat.conditionLogic,
        selectedValue: firstDef?.label ?? (totalCount > 0 ? n.selectedValue : undefined),
        configured: totalCount > 0,
      });
    }));
  };


  /** Replace a policy node's `policyBranches` list and project the FIRST
   *  branch's selection + threshold back onto the legacy `configValues`
   *  fields so existing readers (canvas summary, modal, downstream code)
   *  keep working without a full migration. */
  const updatePolicyBranches = (nodeId: string, branches: PolicyBranch[]) => {
    const first = branches[0];
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      const baseVals = { ...(n.configValues ?? {}) };
      if (first) {
        baseVals.selectedFolders     = JSON.stringify(first.folders);
        baseVals.selectedPolicies    = JSON.stringify(first.policies);
        baseVals.selectedSubPolicies = JSON.stringify(first.subPolicies);
        baseVals.thresholdValue      = first.thresholdValue;
        baseVals.thresholdMode       = first.thresholdMode;
      }
      const totalSelected = branches.reduce(
        (n, b) => n + b.folders.length + b.policies.length + b.subPolicies.length,
        0,
      );
      return touchNode({
        ...n,
        policyBranches: branches,
        configValues: baseVals,
        configured: totalSelected > 0,
      });
    }));
  };

  // Silent state mutation — the thread gets a single summary activity when
  // the user clicks Save in the right panel (see handleSaveNodePopover).
  const updateConfigField = (id: string, key: string, value: string) =>
    setNodes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const nextVals = { ...(n.configValues ?? {}), [key]: value };
      if (n.type === 'delay') {
        // Keep the node's selectedValue/configured in sync with its live config
        // so the canvas card renders the duration summary or the placeholder.
        const summary = formatDelaySummary(nextVals);
        return touchNode({
          ...n,
          configValues: nextVals,
          selectedValue: summary ?? undefined,
          configured:    summary !== null,
        });
      }
      return touchNode({ ...n, configValues: nextVals });
    }));

  const duplicateNode = (id: string) => {
    const src = nodes.find(n => n.id === id);
    if (!src) return;
    const now = new Date().toISOString();
    const copy: GraphNode = {
      ...src,
      id: `${src.type}-${++_nextId}`,
      // Duplicates get their own Info identity — fresh nodeId + createdAt,
      // same-time updatedAt, and ownership assigned to the current user.
      nodeId: generateShortNodeId(),
      createdAt: now,
      updatedAt: now,
      updatedBy: currentUserDisplayName(),
    };
    setNodes(prev => [...prev, copy]);
    const srcPos = nodePositions[id] ?? { x: 20, y: 20 };
    setNodePositions(prev => ({ ...prev, [copy.id]: { x: srcPos.x + 24, y: srcPos.y + 24 } }));
    setSelectedId(copy.id);
  };

  const deleteNode = (id: string) => {
    const target = nodes.find(n => n.id === id);
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id));
    setNodePositions(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedId(prev => prev === id ? null : prev);
    if (target) {
      const label = STEP_CONFIG[target.type].label;
      const nodeName = target.selectedValue || label;
      emitNodeChange(
        {
          nodes: [{ id: target.id, type: target.type, name: nodeName }],
          changeType: 'Deleted',
          headerLabel: `${label} deleted`,
          side: 'outbound',
        },
        `${label} deleted`,
      );
    }
  };

  /** Insert a new node on an existing edge, splitting it into two edges. */
  const insertOnEdge = (edge: GraphEdge, type: StepType, value?: string) => {
    const n = makeNode(type);
    if (value) { n.selectedValue = value; n.configured = true; }

    // Position new node at midpoint between the two connected nodes
    const fromPos = nodePositions[edge.from];
    const toPos   = nodePositions[edge.to];
    const initX   = fromPos && toPos ? (fromPos.x + NODE_W + toPos.x) / 2 : 0;
    const initY   = fromPos && toPos ? (fromPos.y + toPos.y) / 2 : CANVAS_TOP;
    setNodePositions(prev => ({ ...prev, [n.id]: { x: initX, y: initY } }));

    // Replace old edge with two new edges: from→new, new→to. Plain edge
    // splicing — no branch label to carry forward, no special handling
    // for condition fan-out (a condition can have any number of outgoing
    // edges and they're all rendered the same).
    const e1: GraphEdge = { id: `edge-${++_nextId}`, from: edge.from, to: n.id };
    const e2: GraphEdge = { id: `edge-${++_nextId}`, from: n.id,     to: edge.to };
    setEdges(prev => [...prev.filter(e => e.id !== edge.id), e1, e2]);
    setNodes(prev => [...prev, n]);
    setSelectedId(n.id);
  };

  // ── Add edge between two existing nodes ──
  // Validation (getConnectionError) is performed by the sole caller in the
  // drag-drop MouseUp handler. Duplicates are silently rejected; conditions
  // can fan out to any number of downstream nodes.
  const addEdge = (fromNodeId: string, toNodeId: string, fromBranchId?: string | null) => {
    if (isConnectionSilentlyBlocked(fromNodeId, toNodeId, nodes, edges)) return;
    const fromNode = nodes.find(n => n.id === fromNodeId);
    const newEdgeId = `edge-${++_nextId}`;
    let didAdd = false;
    setEdges(prev => {
      const next = appendEdgeIfMissing(prev, fromNodeId, toNodeId, newEdgeId, fromBranchId ?? undefined);
      if (next === null) return prev;
      didAdd = true;
      return next;
    });
    if (!didAdd) return;
    // Connection changes count as mutations on both endpoint nodes for Info.
    touchNodesById([fromNodeId, toNodeId]);
    const toNode = nodes.find(n => n.id === toNodeId);
    if (fromNode && toNode) {
      const fromLabel = STEP_CONFIG[fromNode.type].label;
      const toLabel   = STEP_CONFIG[toNode.type].label;
      emitNodeChange(
        {
          nodes: [
            { id: fromNode.id, type: fromNode.type, name: fromNode.selectedValue || fromLabel },
            { id: toNode.id,   type: toNode.type,   name: toNode.selectedValue   || toLabel },
          ],
          changeType: 'Connected',
          headerLabel: `${fromLabel} → ${toLabel}`,
          side: 'outbound',
        },
        `${fromLabel} connected to ${toLabel}`,
      );
    }
  };

  // ── Remove an existing edge ──
  // Plain edge filter — conditions can have any number of outgoing edges,
  // so removing one needs no special "collapse a binary branch" handling.
  const deleteEdge = (edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    const fromNode = edge ? nodes.find(n => n.id === edge.from) : undefined;
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    if (edge) {
      touchNodesById([edge.from, edge.to]);
      const toNode = nodes.find(n => n.id === edge.to);
      if (fromNode && toNode) {
        const fromLabel = STEP_CONFIG[fromNode.type].label;
        const toLabel   = STEP_CONFIG[toNode.type].label;
        emitNodeChange(
          {
            nodes: [
              { id: fromNode.id, type: fromNode.type, name: fromNode.selectedValue || fromLabel },
              { id: toNode.id,   type: toNode.type,   name: toNode.selectedValue   || toLabel },
            ],
            changeType: 'Disconnected',
            headerLabel: `${fromLabel} ⇸ ${toLabel}`,
            side: 'outbound',
          },
          `${fromLabel} disconnected from ${toLabel}`,
        );
      }
    }
  };

  // Mock AI composer — per spec, replies are canned rather than hitting the
  // real model. The user message appends immediately; the assistant reply
  // appears after a short typing delay via scheduleAiReaction.
  const handleGlobalAiSend = useCallback(() => {
    const text = globalAiPrompt.trim();
    if (!text || aiTyping) return;
    setThreadEntries(prev => [...prev, {
      id: crypto.randomUUID(),
      kind: 'user',
      content: text,
      timestamp: Date.now(),
    }]);
    setGlobalAiPrompt('');
    scheduleAiReaction(AI_RESPONSES.chat, 'chat');
  }, [globalAiPrompt, aiTyping, scheduleAiReaction]);

  /**
   * Fired when the user commits a node's configuration via the right-panel
   * Save button. Emits a `node_change` thread entry so the inline
   * NodeChangeCard renders in the AI thread. No AI reaction is scheduled —
   * canvas-triggered activity is silent; AI only responds to explicit user
   * messages from the chat composer or the per-node prompt input.
   * Fields-in-flight don't log until the user explicitly hits Save.
   */
  const handleSaveNodePopover = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const label = STEP_CONFIG[node.type].label;
    const segs = buildNodeSnippet(node);
    const summary = segs ? segs.map(s => s.text).join('').trim() : node.selectedValue;
    const content = summary ? `${label} configured \u2014 ${summary}` : `${label} saved`;
    emitNodeChange(
      {
        nodes: [{ id: node.id, type: node.type, name: summary || label }],
        changeType: 'Modified',
        headerLabel: `${label} configured`,
        stats: [1],
        side: 'outbound',
      },
      content,
    );
  }, [nodes, emitNodeChange]);

  /**
   * Shared entry point for the node-level floating AI input. Pipes the message
   * into the same thread the left-panel composer writes to, with a small
   * preceding "context" row explaining which node the prompt originated from.
   */
  const handleNodeAiSubmit = useCallback((message: string, nodeType: StepType) => {
    const text = message.trim();
    if (!text || aiTyping) return;
    const now = Date.now();
    setThreadEntries(prev => [
      ...prev,
      { id: crypto.randomUUID(), kind: 'context', content: `From ${STEP_CONFIG[nodeType].label} node —`, timestamp: now },
      { id: crypto.randomUUID(), kind: 'user',    content: text,                                        timestamp: now },
    ]);
    scheduleAiReaction(AI_RESPONSES.chat, 'chat');
  }, [aiTyping, scheduleAiReaction]);

  // ── Create a new disconnected node at canvas position ──
  const createNodeAt = (type: StepType, x: number, y: number) => {
    const n = makeNode(type);
    setNodePositions(prev => ({ ...prev, [n.id]: { x: x - NODE_W / 2, y: y - NODE_H / 2 } }));
    setNodes(prev => [...prev, n]);
    setSelectedId(n.id);
    const label = STEP_CONFIG[type].label;
    emitNodeChange(
      {
        nodes: [{ id: n.id, type, name: label }],
        changeType: 'Added',
        headerLabel: `${label} added`,
        side: 'outbound',
      },
      `${label} added`,
    );
  };

  const createNodeAndConnect = (fromId: string, type: StepType, x: number, y: number) => {
    const n = makeNode(type);
    const newEdgeId = `edge-${++_nextId}`;
    setNodePositions(prev => ({ ...prev, [n.id]: { x: x - NODE_W / 2, y: y - NODE_H / 2 } }));
    setNodes(prev => [...prev, n]);
    setEdges(prev => {
      const next = appendEdgeIfMissing(prev, fromId, n.id, newEdgeId);
      // Returns null on exact duplicate; for a brand-new node target that
      // can't happen, so this fallback is defensive only.
      return next ?? prev;
    });
    setSelectedId(n.id);
    const label = STEP_CONFIG[type].label;
    emitNodeChange(
      {
        nodes: [{ id: n.id, type, name: label }],
        changeType: 'Added',
        headerLabel: `${label} added`,
        side: 'outbound',
      },
      `${label} added`,
    );
  };

  // ── Canvas drop: lib item dropped at cursor position → new disconnected node ──
  const handleCanvasDropAtPos = (item: LibraryItem, x: number, y: number) => {
    const n = makeNode(item.type);
    if (item.label) {
      n.selectedValue = item.label;
      n.configured = true;
    }
    setNodePositions(prev => ({ ...prev, [n.id]: { x, y } }));
    setNodes(prev => [...prev, n]);
    setSelectedId(n.id);
    const label = STEP_CONFIG[item.type].label;
    const nodeName = item.label || label;
    emitNodeChange(
      {
        nodes: [{ id: n.id, type: item.type, name: nodeName }],
        changeType: 'Added',
        headerLabel: `${label} added`,
        side: 'outbound',
      },
      `${label} added`,
    );
  };

  const updateNodePosition = (id: string, x: number, y: number) => {
    setNodePositions(prev => ({ ...prev, [id]: { x, y } }));
    touchNodesById([id]);
  };

  return (
    <div className={styles.page}>
      <WorkflowSettingsDialog
        open={settingsOpen}
        name={name}
        description={description}
        tags={tags}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSettingsSave}
      />

      {/* When the AI panel is collapsed the LeftPanel column unmounts, so
          we render the TopBar at the page level to keep Run test/Publish
          accessible. When expanded the TopBar moves into the leftColumn
          card below so it reads as the header of the chat panel. */}
      {aiPanelCollapsed && (
        <TopBar
          onBack={() => navigate('/automations')}
          onTest={() => {}}
          onPublish={() => {}}
          saveState={saveState}
          name={name}
          onNameChange={setName}
          status={status}
          onSettingsOpen={() => setSettingsOpen(true)}
          isTemplate={!!routerTemplate}
          aiPanelCollapsed={aiPanelCollapsed}
          onToggleAiPanel={() => setAiPanelCollapsed(c => !c)}
        />
      )}

      <div
        className={styles.body}
        data-ai-collapsed={aiPanelCollapsed}
        style={!aiPanelCollapsed ? { gridTemplateColumns: `${aiPanelWidth}px 1fr` } : undefined}
      >
        {/* LeftPanel column unmounts entirely when the AI panel is
            collapsed. The re-open affordance lives in the right column
            (see `expandAiBtn` below the top bar). */}
        {!aiPanelCollapsed && (
          <div className={styles.leftColumn}>
            <TopBar
              onBack={() => navigate('/automations')}
              onTest={() => {}}
              onPublish={() => {}}
              saveState={saveState}
              name={name}
              onNameChange={setName}
              status={status}
              onSettingsOpen={() => setSettingsOpen(true)}
              isTemplate={!!routerTemplate}
              aiPanelCollapsed={aiPanelCollapsed}
              onToggleAiPanel={() => setAiPanelCollapsed(c => !c)}
            />
            <LeftPanel
              onLibNodeDragStart={(item) => setDraggingLibNode(item)}
              onLibNodeDragEnd={() => setDraggingLibNode(null)}
              onLibNodeSelect={(item) => { handleCanvasDropAtPos(item, 0, CANVAS_TOP); setSelectedId(null); }}
              aiPrompt={globalAiPrompt}
              onAiPromptChange={setGlobalAiPrompt}
              aiTyping={aiTyping}
              entries={threadEntries}
              onAiSend={handleGlobalAiSend}
              onCollapse={() => setAiPanelCollapsed(true)}
              onBack={() => navigate('/automations')}
              panelWidth={aiPanelWidth}
              onPanelWidthChange={setAiPanelWidth}
            />
          </div>
        )}

        <div className={styles.rightColumn}>
          {/* TopBar moved up to .page level so the unified topbar spans
              the full screen width above both columns. */}
          <FlowCanvas
          nodes={nodes}
          edges={edges}
          nodePositions={nodePositions}
          selectedId={selectedId}
          draggingLibNode={draggingLibNode}
          onSelectNode={setSelectedId}
          onDeselectNode={() => setSelectedId(null)}
          onUpdateNode={updateNode}
          onUpdateNodeCondition={updateConditionConfig}
          onUpdateNodeConfigField={updateConfigField}
          onDuplicateNode={duplicateNode}
          onDeleteNode={deleteNode}
          onAddNodeAfter={addNodeAfter}
          onAddRootTrigger={addRootTrigger}
          onInsertOnEdge={insertOnEdge}
          onPositionChange={updateNodePosition}
          onSetAllPositions={setNodePositions}
          onAddEdge={addEdge}
          onDeleteEdge={deleteEdge}
          onCreateNodeAt={createNodeAt}
          onCreateNodeAndConnect={createNodeAndConnect}
          onCanvasDropAtPos={handleCanvasDropAtPos}
          onLibNodeDragStart={(item) => setDraggingLibNode(item)}
          onLibNodeDragEnd={() => setDraggingLibNode(null)}
          onLibNodeSelect={(item) => { handleCanvasDropAtPos(item, 0, CANVAS_TOP); setSelectedId(null); }}
          editNodeMode={editNodeMode}
          editingNodeIds={editingNodeIds}
          onEditNodeToggle={handleEditNodeToggle}
          onUpdateConditions={updateConditions}
          onUpdateConditionGroups={updateConditionGroups}
          onUpdateConditionBranches={updateConditionBranches}
          onUpdatePolicyBranches={updatePolicyBranches}
          autoTidyToken={autoTidyToken}
          fitToken={fitToken}
          onNodeAiSubmit={handleNodeAiSubmit}
          onSaveNodePopover={handleSaveNodePopover}
          />
        </div>
      </div>
    </div>
  );
}
