import React, { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Button } from '@alloy/components/Button';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@alloy/components/Dialog';
import { Tag } from '@alloy/components/Tag';
import type { TagColor } from '@alloy/components/Tag';
import { SearchField, SelectField } from '@alloy/components/Input';
import { Target04Icon } from '@alloy/components/icons/Target04Icon';
import { Grid01Icon } from '@alloy/components/icons/Grid01Icon';
import { ListItem } from '@alloy/components/ListItem';
import { ChevronDownIcon } from '@alloy/components/icons/ChevronDownIcon';
import { ArrowNarrowRightIcon } from '@alloy/components/icons/ArrowNarrowRightIcon';
import { ClockIcon } from '@alloy/components/icons/ClockIcon';
import { Bell01Icon } from '@alloy/components/icons/Bell01Icon';
import { CheckCircleIcon } from '@alloy/components/icons/CheckCircleIcon';
import { Home02Icon } from '@alloy/components/icons/Home02Icon';
import { Users03Icon } from '@alloy/components/icons/Users03Icon';
import { File04Icon } from '@alloy/components/icons/File04Icon';
import { ClipboardCheckIcon } from '@alloy/components/icons/ClipboardCheckIcon';
import { ListBulletIcon } from '@alloy/components/icons/ListBulletIcon';
import { Edit03Icon } from '@alloy/components/icons/Edit03Icon';
import { Mail01Icon } from '@alloy/components/icons/Mail01Icon';
import { Announcement02Icon } from '@alloy/components/icons/Announcement02Icon';
// Same icon set the bottom toolbar uses on the live builder canvas. Used
// by the preview node renderers below so the diagram exactly mirrors the
// real node treatment.
import { FilterLinesIcon } from '@alloy/components/icons/FilterLinesIcon';
import { CircularArrowIcon } from '@alloy/components/icons/CircularArrowIcon';
import { TeambridgeAIIcon } from '@alloy/components/icons/TeambridgeAIIcon';
import { TriangleUpIcon } from '@alloy/components/icons/TriangleUpIcon';
import styles from './TemplatesPage.module.css';
// Re-use the live builder's node CSS modules so the preview chrome (pill,
// circle, condition card, policy gradient, AI gradient) is byte-for-byte
// identical to the real canvas — no duplicated style values.
import builderStyles from './BuilderPage.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type StepType = 'trigger' | 'condition' | 'action' | 'delay' | 'ai' | 'policy';

// Matches the `category` field on trigger items in ALL_LIBRARY_ITEMS (BuilderPage)
type TriggerCategory =
  | 'data_workflows'
  | 'scheduling'
  | 'geofence'
  | 'shift_request'
  | 'shift_group_request'
  | 'shift_release'
  | 'clock_in_clock_out'
  | 'breaks'
  | 'tasks'
  | 'documents'
  | 'recurring_interval'
  | 'button'
  | 'comments'
  | 'jobs'
  | 'recommended_shifts';

interface TemplateWorkflow {
  id: string;
  name: string;
  steps: StepType[];
  triggerCategory: TriggerCategory;
  tags: { label: string; color: TagColor }[];
}

interface TemplateCategory {
  id: string;
  name: string;
  suggestedFor: string;
  /**
   * Section subtitle — sits beneath the section title in the
   * marketplace-style header (e.g. "Curated picks across categories").
   * Optional: falls back to a generic synthesized line if missing.
   */
  caption?: string;
  workflows: TemplateWorkflow[];
}

// ─── Mini flow diagram — re-uses the live builder's node chrome ─────────────
// Renders each step using the actual `BuilderPage.module.css` classes
// (`triggerPill`, `delayPill`, `conditionNodeCard`, `actionNodeIconBox`,
// `aiNodeIconBox`, `policyNodeCard`) so the preview is byte-for-byte
// identical to what the canvas paints. A scale-to-fit wrapper measures the
// natural row width via ResizeObserver and applies `transform: scale(s)`
// so longer flows shrink to fit the preview card width without scrolling.

/** Generic short-form labels for the non-trigger steps. We don't carry per-
 *  template configuration, so these stand in as believable filled-state
 *  text on the preview cards. The trigger uses the real category label. */
const STEP_PREVIEW_LABEL: Record<Exclude<StepType, 'trigger'>, string> = {
  action:    'Send notification',
  condition: 'Match criteria',
  delay:     'Wait',
  ai:        'AI Specialist',
  policy:    'Apply policy',
};

/* ── Action icon resolution ─────────────────────────────────────────────────
   Mirrors the live builder's `buildTemplateGraph` logic (BuilderPage.tsx) —
   when a template is opened, the builder synthesizes the action chain by
   selecting "Send feed message" for the 1st action and "Send email" for
   every action after that. The canvas resolves their icons via
   `ACTION_ITEM_ICON`:
     · notifications_send_feed_message → Announcement02Icon
     · notifications_send_email        → Mail01Icon
   The preview maps the same way so the icon you see in the diagram is the
   exact icon the canvas paints once you click "Use Template". Index is
   the 0-based action index within the steps array (skipping non-action
   steps in the count). */
function getTemplateActionIcon(actionIndex: number): ReactNode {
  if (actionIndex === 0) return <Announcement02Icon size={20} />;
  return <Mail01Icon size={20} />;
}

/** Render a single preview node using the builder's actual CSS module
 *  classes so all chrome (border, gradient, icon-box, typography) carries
 *  over from the live canvas. Filled state is pinned to `true` so the
 *  preview reads as a configured workflow, not an empty scaffold.
 *
 *  `actionIcon` overrides the default action glyph so each preview row can
 *  show the icon the live canvas would paint for the configured action. */
function PreviewNode({
  type,
  label,
  actionIcon,
}: {
  type: StepType;
  label: string;
  actionIcon?: ReactNode;
}) {
  if (type === 'trigger') {
    return (
      <div className={clsx(builderStyles.triggerPill, builderStyles.triggerPillFilled)}>
        {/* Same Play glyph the live trigger pill draws inline */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M4 2.75L10.5 7L4 11.25V2.75Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <span>{label}</span>
      </div>
    );
  }
  if (type === 'delay') {
    return (
      <div className={clsx(builderStyles.delayPill, builderStyles.delayPillFilled)}>
        <ClockIcon size={14} />
        <span>{label}</span>
      </div>
    );
  }
  if (type === 'action') {
    return (
      <span
        className={clsx(builderStyles.actionNodeIconBox, builderStyles.actionNodeIconBoxFilled)}
        aria-label="Action"
      >
        {actionIcon ?? <CircularArrowIcon size={20} />}
      </span>
    );
  }
  if (type === 'ai') {
    return (
      <span
        className={clsx(builderStyles.aiNodeIconBox, builderStyles.aiNodeIconBoxFilled)}
        aria-label="AI"
      >
        <TeambridgeAIIcon size={26} />
      </span>
    );
  }
  if (type === 'condition') {
    return (
      <div
        className={builderStyles.conditionNodeCard}
        data-active="false"
        data-filled="true"
        // Builder uses 260px for condition cards; pin width here so the card
        // doesn't collapse to its content. Layout otherwise comes from the
        // CSS module — we don't override font, padding, etc.
        style={{ width: 260 }}
      >
        <div className={builderStyles.conditionNodeTopRow}>
          <span className={builderStyles.conditionNodeIconBox} aria-label="Condition">
            <FilterLinesIcon size={14} />
          </span>
          <span className={builderStyles.conditionNodeTopText}>
            <span className={builderStyles.conditionNodeTopPrimary}>{label}</span>
          </span>
        </div>
      </div>
    );
  }
  if (type === 'policy') {
    return (
      <div
        className={builderStyles.policyNodeCard}
        data-active="false"
        data-filled="true"
        style={{ width: 260 }}
      >
        <div className={builderStyles.policyNodeTopRow}>
          <span className={builderStyles.policyNodeIconBox} aria-label="Policy">
            <TriangleUpIcon size={14} />
          </span>
          <span className={builderStyles.policyNodeTopText}>
            <span className={builderStyles.policyNodeTopPrimary}>{label}</span>
          </span>
        </div>
      </div>
    );
  }
  return null;
}

/** Inline horizontal connector with the same chevron marker geometry the
 *  builder canvas paints (see `<marker id="edge-arrow">` in BuilderPage).
 *  Each connector embeds its own marker so we don't depend on a shared
 *  page-level <defs> block. */
function PreviewConnector() {
  return (
    <svg
      width={40}
      height={12}
      viewBox="0 0 40 12"
      aria-hidden
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        <marker
          id="tplPreviewArrow"
          viewBox="0 0 8 8"
          refX="6.8"
          refY="3.7"
          markerUnits="userSpaceOnUse"
          markerWidth="8"
          markerHeight="8"
          orient="auto"
        >
          <path
            d="M3.5 0.5 L6.8 3.7 L3.5 6.9"
            stroke="var(--color-slate-border-secondary)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>
      <line
        x1="0"
        y1="6"
        x2="36"
        y2="6"
        stroke="var(--color-slate-border-secondary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        markerEnd="url(#tplPreviewArrow)"
      />
    </svg>
  );
}

/** Preview diagram — horizontal node row + scale-to-fit container. */
function TemplatePreviewDiagram({
  steps,
  triggerLabel,
}: {
  steps: StepType[];
  triggerLabel: string;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [naturalH, setNaturalH] = useState(60);

  // Re-measure on mount, on step-count change, and on container resize.
  // `transform` doesn't affect layout, so contentRef's offsetWidth/Height
  // always report natural (un-scaled) size — perfect for computing scale.
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;
    const compute = () => {
      // Wrapper has 24px padding on each side, so usable width = clientW − 48.
      const containerW = wrapper.clientWidth - 48;
      const w = content.offsetWidth;
      const h = content.offsetHeight;
      if (w <= 0 || containerW <= 0) return;
      setScale(Math.min(1, containerW / w));
      setNaturalH(h);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(wrapper);
    ro.observe(content);
    return () => ro.disconnect();
  }, [steps.length]);

  const scaledH = naturalH * scale;

  return (
    <div className={styles.expandedDiagram} ref={wrapperRef}>
      {/* Inner block reserves the scaled height; absolutely-positioned scaler
          paints the natural-size row and shrinks visually around its left-top
          origin so any flow longer than the card width fits without scroll. */}
      <div
        className={styles.expandedDiagramFrame}
        style={{ height: scaledH }}
      >
        <div
          className={styles.expandedDiagramScaler}
          style={{ transform: `scale(${scale})` }}
        >
          <div className={styles.expandedDiagramRow} ref={contentRef}>
            {(() => {
              // Walk the steps and assign each action its own index so the
              // 1st action gets the Announcement icon and 2nd+ actions
              // get the Mail icon — exactly matching how the builder
              // canvas selects action library items in `buildTemplateGraph`.
              let actionIdx = 0;
              return steps.map((type, i) => {
                const label =
                  type === 'trigger' ? triggerLabel : STEP_PREVIEW_LABEL[type];
                const actionIcon =
                  type === 'action' ? getTemplateActionIcon(actionIdx++) : undefined;
                return (
                  <Fragment key={i}>
                    {i > 0 && <PreviewConnector />}
                    <PreviewNode type={type} label={label} actionIcon={actionIcon} />
                  </Fragment>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Template Data ────────────────────────────────────────────────────────────

const CATEGORIES: TemplateCategory[] = [
  {
    id: 'pay', name: 'Pay', suggestedFor: 'Pay Management',
    caption: 'Reminders and policy nudges that keep payroll attestations on time',
    workflows: [
      // Mixes condition gating + AI specialist + delayed reminder.
      { id: 'pay-1', name: 'Next day pay reminder on clock-out',           steps: ['trigger', 'condition', 'ai', 'action', 'delay', 'action'], triggerCategory: 'clock_in_clock_out', tags: [{ label: 'Pay', color: 'purple' }, { label: 'Notification', color: 'orange' }] },
      { id: 'pay-2', name: 'Signature reminder on clock-out',              steps: ['trigger', 'condition', 'action', 'delay', 'condition', 'action'], triggerCategory: 'clock_in_clock_out', tags: [{ label: 'Pay', color: 'purple' }, { label: 'Notification', color: 'orange' }] },
      { id: 'pay-3', name: 'Pay period attestation reminder on clock-out', steps: ['trigger', 'policy', 'condition', 'ai', 'action', 'action'], triggerCategory: 'clock_in_clock_out', tags: [{ label: 'Pay', color: 'purple' }, { label: 'Notification', color: 'orange' }] },
      { id: 'pay-4', name: 'Apply bonus to claimed shift',                 steps: ['trigger', 'condition', 'policy', 'action', 'action'], triggerCategory: 'shift_request',      tags: [{ label: 'Pay', color: 'purple' }, { label: 'Shift', color: 'orange' }] },
    ],
  },
  {
    id: 'performance', name: 'Performance', suggestedFor: 'Performance Monitoring',
    caption: 'No-shows, releases, and recognition flows that keep your team accountable',
    workflows: [
      { id: 'perf-1', name: 'No show notification',                 steps: ['trigger', 'delay', 'condition', 'ai', 'action', 'action'], triggerCategory: 'scheduling',    tags: [{ label: 'Performance', color: 'blue' }, { label: 'Notification', color: 'orange' }] },
      { id: 'perf-2', name: 'Release shift warning',                steps: ['trigger', 'condition', 'condition', 'action', 'delay', 'action'], triggerCategory: 'shift_release', tags: [{ label: 'Performance', color: 'blue' }, { label: 'Shift', color: 'green' }] },
      { id: 'perf-3', name: 'Thank you message for claiming shift', steps: ['trigger', 'condition', 'ai', 'action', 'action'], triggerCategory: 'shift_request', tags: [{ label: 'Performance', color: 'blue' }, { label: 'Shift', color: 'green' }] },
    ],
  },
  {
    id: 'time-tracking', name: 'Time Tracking', suggestedFor: 'Time & Attendance',
    caption: 'Geofence triggers, shift reminders, and auto-clock flows for the floor',
    workflows: [
      { id: 'tt-1', name: '30 minutes shift reminder',                    steps: ['trigger', 'delay', 'condition', 'action', 'action'], triggerCategory: 'scheduling',        tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Reminder', color: 'orange' }] },
      { id: 'tt-2', name: '1 hour shift reminder',                        steps: ['trigger', 'delay', 'condition', 'ai', 'action', 'action'], triggerCategory: 'scheduling',        tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Reminder', color: 'orange' }] },
      { id: 'tt-3', name: '12 hour shift reminder',                       steps: ['trigger', 'delay', 'condition', 'action', 'action', 'action'], triggerCategory: 'scheduling',        tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Reminder', color: 'orange' }] },
      { id: 'tt-4', name: 'Notify users if they are late to a shift',     steps: ['trigger', 'condition', 'ai', 'action', 'delay', 'condition', 'action'], triggerCategory: 'scheduling',        tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Notification', color: 'orange' }] },
      { id: 'tt-5', name: 'Clock in when user enters geofence',           steps: ['trigger', 'condition', 'action'], triggerCategory: 'geofence',          tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Geofence', color: 'blue' }] },
      { id: 'tt-6', name: 'Clock out when user leaves geofence',          steps: ['trigger', 'condition', 'action', 'action'], triggerCategory: 'geofence',          tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Geofence', color: 'blue' }] },
      { id: 'tt-7', name: 'Auto clock in',                                steps: ['trigger', 'condition', 'action', 'action'], triggerCategory: 'clock_in_clock_out', tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Clock In', color: 'blue' }] },
      { id: 'tt-8', name: 'Auto clock out',                               steps: ['trigger', 'condition', 'action', 'action'], triggerCategory: 'clock_in_clock_out', tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Clock Out', color: 'blue' }] },
    ],
  },
  {
    id: 'scheduling', name: 'Scheduling', suggestedFor: 'Shift Scheduling',
    caption: 'Claim approvals, time-off routing, and premium dispatch flows',
    workflows: [
      { id: 'sched-1', name: 'Notify managers when shift is claimed',     steps: ['trigger', 'policy', 'condition', 'ai', 'action', 'action'], triggerCategory: 'shift_request',      tags: [{ label: 'Scheduling', color: 'orange' }, { label: 'Notification', color: 'blue' }] },
      { id: 'sched-2', name: 'Notify employee when shift claim approved', steps: ['trigger', 'condition', 'action', 'delay', 'action'], triggerCategory: 'shift_request',      tags: [{ label: 'Scheduling', color: 'orange' }, { label: 'Notification', color: 'blue' }] },
      { id: 'sched-3', name: 'Notify employee when shift claim rejected', steps: ['trigger', 'condition', 'ai', 'action', 'action'], triggerCategory: 'shift_request',      tags: [{ label: 'Scheduling', color: 'orange' }, { label: 'Notification', color: 'blue' }] },
      { id: 'sched-4', name: 'New timeoff requested',                     steps: ['trigger', 'policy', 'condition', 'ai', 'action', 'action', 'action'], triggerCategory: 'data_workflows',     tags: [{ label: 'Scheduling', color: 'orange' }, { label: 'Time Off', color: 'purple' }] },
      { id: 'sched-5', name: 'Timeoff approved',                          steps: ['trigger', 'condition', 'action', 'action'], triggerCategory: 'data_workflows',     tags: [{ label: 'Scheduling', color: 'orange' }, { label: 'Time Off', color: 'purple' }] },
      { id: 'sched-6', name: 'Timeoff rejected',                          steps: ['trigger', 'condition', 'action', 'action'], triggerCategory: 'data_workflows',     tags: [{ label: 'Scheduling', color: 'orange' }, { label: 'Time Off', color: 'purple' }] },
      // Showcase: a long flow that exercises every node type plus repeats —
      // useful for confirming the canvas handles tall stacks gracefully.
      { id: 'sched-7', name: 'Premium shift dispatch & escalation',       steps: ['trigger', 'policy', 'condition', 'condition', 'ai', 'action', 'delay', 'condition', 'action', 'action'], triggerCategory: 'shift_request', tags: [{ label: 'Scheduling', color: 'orange' }, { label: 'AI', color: 'purple' }, { label: 'Premium', color: 'blue' }] },
    ],
  },
  {
    id: 'training', name: 'Training', suggestedFor: 'Employee Training',
    caption: 'Onboarding packets and reinforcement reminders that lock in new habits',
    workflows: [
      { id: 'train-1', name: 'Extra clock-in reminder',           steps: ['trigger', 'delay', 'condition', 'action'], triggerCategory: 'scheduling',        tags: [{ label: 'Training', color: 'orange' }, { label: 'Reminder', color: 'blue' }] },
      { id: 'train-2', name: 'Extra clock-out reminder',          steps: ['trigger', 'condition', 'action', 'action'], triggerCategory: 'scheduling',        tags: [{ label: 'Training', color: 'orange' }, { label: 'Reminder', color: 'blue' }] },
      { id: 'train-3', name: 'Extra break start reminder',        steps: ['trigger', 'condition', 'action'], triggerCategory: 'breaks',            tags: [{ label: 'Training', color: 'orange' }, { label: 'Reminder', color: 'blue' }] },
      { id: 'train-4', name: 'Extra break end reminder',          steps: ['trigger', 'condition', 'action'], triggerCategory: 'breaks',            tags: [{ label: 'Training', color: 'orange' }, { label: 'Reminder', color: 'blue' }] },
      { id: 'train-5', name: 'Send training packet to new users', steps: ['trigger', 'policy', 'condition', 'ai', 'action', 'delay', 'action', 'action'], triggerCategory: 'data_workflows', tags: [{ label: 'Training', color: 'orange' }, { label: 'Onboarding', color: 'green' }] },
    ],
  },
];

// ─── Derived options ──────────────────────────────────────────────────────────

const ALL_TAGS = Array.from(
  new Set(CATEGORIES.flatMap(c => c.workflows.flatMap(w => w.tags.map(t => t.label))))
).sort();

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  ...CATEGORIES.map(c => ({ value: c.id, label: c.name })),
];

// Maps trigger categories from ALL_LIBRARY_ITEMS to display labels + icon render functions
const TRIGGER_CATEGORY_META: Record<TriggerCategory, { label: string; Icon: () => ReactNode }> = {
  clock_in_clock_out:  { label: 'Clock In / Out',     Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v3l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  scheduling:          { label: 'Scheduling',          Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 6h11M5 1.5v2M9 1.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  geofence:            { label: 'Geofence',            Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1.5A4.5 4.5 0 0 1 11.5 6c0 2.5-4.5 6.5-4.5 6.5S2.5 8.5 2.5 6A4.5 4.5 0 0 1 7 1.5Z" stroke="currentColor" strokeWidth="1.3"/></svg> },
  shift_request:       { label: 'Shift Request',       Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 3.5V2.5a2 2 0 0 1 4 0v1M7 7v2M6 8h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  shift_group_request: { label: 'Shift Group',         Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 3.5V2.5a2 2 0 0 1 4 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="5" cy="8.5" r="1" fill="currentColor"/><circle cx="9" cy="8.5" r="1" fill="currentColor"/></svg> },
  shift_release:       { label: 'Shift Release',       Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 3.5V2.5a2 2 0 0 1 4 0v1M5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  data_workflows:      { label: 'Data Workflow',       Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="7.5" y="7.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M4 6.5V9a1.5 1.5 0 0 0 1.5 1.5H7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  breaks:              { label: 'Breaks',              Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M3 3.5h6.5v4.5a3 3 0 0 1-3 3H3V3.5Z" stroke="currentColor" strokeWidth="1.3"/><path d="M9.5 5.5c1.5 0 2.5.8 2.5 2s-1 2-2.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  tasks:               { label: 'Tasks',               Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  documents:           { label: 'Documents',           Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><rect x="2" y="1.5" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  recurring_interval:  { label: 'Recurring',           Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 7a5 5 0 1 0 1-3M2 4V1.5M2 4H4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  button:              { label: 'Button Click',         Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="4" width="11" height="6" rx="3" stroke="currentColor" strokeWidth="1.3"/><path d="M5 7h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  comments:            { label: 'Comment Added',        Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 2.5h10v7H5L2 12V2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> },
  jobs:                { label: 'Job Interest',         Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="4" width="11" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 4V3a2 2 0 0 1 4 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M1.5 7.5h11" stroke="currentColor" strokeWidth="1.3"/></svg> },
  recommended_shifts:  { label: 'Recommended Shift',   Icon: () => <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M7 2l1.5 3 3.5.5-2.5 2.5.5 3.5L7 10l-3 1.5.5-3.5L2 5.5l3.5-.5L7 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> },
};

// Filter options derived from the actual categories used in the templates — no hardcoding
const TRIGGER_OPTIONS = (() => {
  const used = new Map<TriggerCategory, string>();
  CATEGORIES.forEach(c => c.workflows.forEach(w => {
    if (!used.has(w.triggerCategory)) used.set(w.triggerCategory, TRIGGER_CATEGORY_META[w.triggerCategory].label);
  }));
  return [
    { value: 'all', label: 'All trigger types' },
    ...Array.from(used.entries()).map(([value, label]) => ({ value, label })),
  ];
})();

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  workflow,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  saved,
  onToggleSave,
  onUseTemplate,
  onEditTemplate,
}: {
  workflow: TemplateWorkflow;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  saved: boolean;
  onToggleSave: () => void;
  onUseTemplate: () => void;
  onEditTemplate: () => void;
}) {
  const stepCount = workflow.steps.length;
  const triggerMeta = TRIGGER_CATEGORY_META[workflow.triggerCategory];

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Let nested interactive elements (checkbox, chevron, buttons) handle
    // their own clicks without toggling the expansion.
    if ((e.target as HTMLElement).closest('[data-card-action]')) return;
    onToggleExpand();
  };
  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleExpand();
    }
  };

  // Synthetic short description — backs the body copy on the card now
  // that templates don't carry a real description field. Mirrors the
  // dialog's preview line in shorter form.
  const description = `${triggerMeta.label} flow with ${stepCount} step${stepCount === 1 ? '' : 's'} that ${workflow.name.toLowerCase()}.`;
  const accent = TRIGGER_ACCENT[workflow.triggerCategory];

  return (
    <div
      className={clsx(
        styles.card,
        isSelected && styles.cardSelected,
        isExpanded && styles.cardActive,
      )}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-pressed={isSelected}
      onClick={handleCardClick}
      onKeyDown={handleKey}
    >
      {/* ── Top row: trigger thumb + Save/Saved button ── */}
      <div className={styles.cardTop}>
        <div
          className={styles.cardThumb}
          data-accent={accent}
          data-role="featured-icon"
          aria-hidden
        >
          <span className={styles.cardThumbIcon}>
            <triggerMeta.Icon />
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={saved}
          data-card-action
          onClick={e => { e.stopPropagation(); if (!saved) onToggleSave(); }}
        >
          {saved ? 'Saved' : 'Save'}
        </Button>
      </div>

      {/* ── Body: category eyebrow → name → paragraph-sm description →
            outline tags → step-count footer pinned to the bottom. ── */}
      <div className={styles.cardBody}>
        <div className={styles.cardEyebrow}>
          <strong>{triggerMeta.label}</strong>
        </div>
        <h3 className={styles.cardName}>{workflow.name}</h3>
        <p className={styles.cardDescription}>{description}</p>
        {workflow.tags.length > 0 && (
          <div className={styles.cardTags}>
            {workflow.tags.map(t => (
              <Tag key={t.label} variant="outline" size="sm" color="neutral">
                {t.label}
              </Tag>
            ))}
          </div>
        )}
        <div className={styles.cardFooter}>
          <ListBulletIcon size={14} />
          {stepCount} {stepCount === 1 ? 'step' : 'steps'}
        </div>
      </div>

      {/* The expanded About / Tags / Try-Template view used to render
          inline below the card row. It has moved to a page-level
          Dialog (see TemplatePreviewDialog at the bottom of the page)
          so opening a template no longer reflows the surrounding grid. */}
    </div>
  );
}

// ─── TemplatePreviewDialog ──────────────────────────────────────────────────
// Page-level modal that replaces the inline expansion. Mirrors the
// Marketplace > Community Apps card layout from TeambridgeCode (shape +
// uppercase eyebrow, bold name, relaxed description, chip cluster, CTA).
// Template data is normalized into that shape:
//   shape glyph     → tinted square containing the trigger-category icon
//   eyebrow         → trigger category label, uppercase
//   name            → workflow.name
//   description     → existing About line
//   install chip    → step count chip (replaces install count)
//   tag chips       → workflow.tags rendered as neutral subtle tags
//   "Use App →"     → "Try Template →"

interface TemplatePreviewDialogProps {
  workflow: TemplateWorkflow | null;
  /** Parent category short name (e.g. "Pay") — surfaced as a curation
   *  pill on the header's trailing edge, mirroring the "Recommended"
   *  badge in the Marketplace pattern. */
  categoryName: string | null;
  onClose: () => void;
  onUseTemplate: () => void;
}

/** Trigger-category → semantic accent for the shape glyph + step chip.
 *  Keeps the dialog's accent stable per category, mirroring how the
 *  Marketplace card carries one categoryColor across its install chip
 *  and shape gradient. */
const TRIGGER_ACCENT: Record<TriggerCategory, TagColor> = {
  clock_in_clock_out:  'green',
  scheduling:          'blue',
  geofence:            'azure',
  shift_request:       'purple',
  shift_group_request: 'purple',
  shift_release:       'matcha',
  data_workflows:      'orange',
  breaks:              'yellow',
  tasks:               'green',
  documents:           'blue',
  recurring_interval:  'azure',
  button:              'neutral',
  comments:            'pink',
  jobs:                'red',
  recommended_shifts:  'matcha',
};

// ─── Action-node category inference ──────────────────────────────────────────
//
// The dialog's "Action types" section used to list the generic step
// types in the workflow ("Trigger / Condition / AI Specialist / Action").
// That doesn't actually tell the user *what kinds of actions* the
// template performs — every template has an Action step, every chip
// just said "Action". Instead we surface the concrete action-node
// categories the live builder offers (see `ACTION_CATEGORY_LABEL` in
// BuilderPage.tsx): Shift Actions, Geofence Actions, User Actions,
// Update Data, Notifications. Templates don't carry per-step
// `selectedValue`, so we infer plausible categories from the
// (triggerCategory, tags) pair — same logic any user would apply when
// configuring the action node from this template.

type ActionCategoryId =
  | 'shift_actions'
  | 'geofence_actions'
  | 'user_actions'
  | 'update_data'
  | 'notifications';

/** Icon glyph per action category. Mirrors the live builder's
 *  `ACTION_CATEGORY_ICON` map so the preview list shows the same
 *  symbols the user will see when configuring the action node. */
const ACTION_CATEGORY_ICON: Record<ActionCategoryId, () => ReactNode> = {
  shift_actions:    () => <CheckCircleIcon size={16} />,
  geofence_actions: () => <Home02Icon       size={16} />,
  user_actions:     () => <Users03Icon      size={16} />,
  update_data:      () => <File04Icon       size={16} />,
  notifications:    () => <Bell01Icon       size={16} />,
};

/** Plain-language description of what each action category does inside
 *  a workflow. Used in the preview dialog so a user evaluating a
 *  template can understand what the action node will do without
 *  opening the builder. */
const ACTION_CATEGORY_DESCRIPTION: Record<ActionCategoryId, string> = {
  shift_actions:
    'Approve, deny, or release shift requests on behalf of the team.',
  geofence_actions:
    'Auto clock-in or end shifts as users enter or leave a defined area.',
  user_actions:
    'Run user-side actions like clocking in, ending breaks, or approving requests.',
  update_data:
    'Update workflow records — time-off, claim status, or attestation flags.',
  notifications:
    'Send targeted reminders and alerts at the right moment in the flow.',
};

/** Render order — mirrors the live builder's action library so chips
 *  read in the same sequence the user would scan when configuring
 *  the action node. */
const ACTION_CATEGORY_ORDER: ActionCategoryId[] = [
  'shift_actions',
  'geofence_actions',
  'user_actions',
  'update_data',
  'notifications',
];

/** Tag color per action category. Aligned with the trigger accent
 *  palette so a single template's chips read as a coherent cluster
 *  of related Tag colors rather than arbitrary rainbow assignments. */
const ACTION_CATEGORY_COLOR: Record<ActionCategoryId, TagColor> = {
  shift_actions:    'orange',
  geofence_actions: 'green',
  user_actions:     'blue',
  update_data:      'purple',
  notifications:    'matcha',
};

/** Trigger-category → default action-category. The action node sits
 *  downstream of the trigger, so the trigger usually narrows the set
 *  of actions a workflow needs (e.g. a `shift_request` trigger most
 *  often drives a Shift Action; a `geofence` trigger drives a
 *  Geofence Action). */
const TRIGGER_TO_ACTION_CATEGORY: Record<TriggerCategory, ActionCategoryId> = {
  clock_in_clock_out:  'user_actions',
  shift_request:       'shift_actions',
  shift_group_request: 'shift_actions',
  scheduling:          'user_actions',
  shift_release:       'shift_actions',
  geofence:            'geofence_actions',
  data_workflows:      'update_data',
  breaks:              'user_actions',
  tasks:               'update_data',
  documents:           'update_data',
  recurring_interval:  'notifications',
  button:              'user_actions',
  comments:            'notifications',
  jobs:                'update_data',
  recommended_shifts:  'shift_actions',
};

/** Returns the set of action-node categories that an action step in
 *  this template would plausibly resolve to. Always includes the
 *  trigger's natural action category, then adds tag-driven hints
 *  (e.g. "Notification" tag → Notifications category). Returns an
 *  empty list when the workflow has no `action` step at all. */
function inferActionCategories(workflow: TemplateWorkflow): ActionCategoryId[] {
  // No action steps in the flow → nothing to surface in this section.
  if (!workflow.steps.includes('action')) return [];

  const found = new Set<ActionCategoryId>();

  // Trigger-driven baseline.
  found.add(TRIGGER_TO_ACTION_CATEGORY[workflow.triggerCategory]);

  // Tag-driven hints — match against lowercase tag labels so casing
  // tweaks in the data don't silently break the inference.
  const tagLabels = new Set(workflow.tags.map(t => t.label.toLowerCase()));
  if (tagLabels.has('notification') || tagLabels.has('reminder')) found.add('notifications');
  if (tagLabels.has('time off')     || tagLabels.has('onboarding')) found.add('update_data');
  if (tagLabels.has('pay'))                                         found.add('update_data');
  if (tagLabels.has('shift')        || tagLabels.has('premium'))    found.add('shift_actions');
  if (tagLabels.has('geofence'))                                    found.add('geofence_actions');
  if (tagLabels.has('clock in')     || tagLabels.has('clock out'))  found.add('user_actions');

  // Render in the canonical builder order.
  return ACTION_CATEGORY_ORDER.filter(c => found.has(c));
}

// ─── Used-count synthesis ────────────────────────────────────────────────────
//
// Templates don't carry adoption metrics in the mock data, but the
// preview header reads better with a "12 used" line than "6 steps"
// because the user is evaluating *whether to adopt* this template,
// not measuring its complexity. We hash the workflow id into a stable
// 4–250 range so each template renders the same number across reloads
// and the spread feels believable (a few popular templates with
// triple-digit installs, most in the dozens).
function synthesizeUsedCount(id: string): number {
  // FNV-1a-style fold; produces a deterministic non-negative integer.
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  // Map into [4, 250]. Adding the unsigned 0 → 246 modulus skews
  // toward the lower half naturally (bigger numbers get hit by fewer
  // hashes), which matches a real long-tail adoption distribution.
  return 4 + (h % 247);
}

// ─── Recommended-for inference ───────────────────────────────────────────────
//
// "Recommended for" describes who should adopt this template and when
// it earns its keep. Each template gets up to three bullet rows:
//
//   1. WHO    — derived from the template's category tag (Pay /
//               Performance / Scheduling / etc.)
//   2. WHEN   — derived from the trigger category (e.g.
//               clock_in_clock_out → "Every time a worker clocks in
//               or out")
//   3. WHY    — derived from the tag mix (premium pay, geofencing,
//               onboarding, …) so the row reflects the operational
//               situation the template was built for.
//
// Templates don't carry per-template audience metadata, so we
// synthesize from the same (category, trigger, tags) signals already
// used by `inferActionCategories`. The rows are presented as a single
// line each, mirroring the Action types section.

interface RecommendedRow {
  /** Stable key for React. */
  id:   string;
  /** Identifies which icon to render in the leading slot. */
  kind: 'who' | 'when' | 'why';
  /** The bullet copy. */
  text: string;
}

/** Audience hints keyed off the template's category tag (the first
 *  tag in each workflow happens to mirror the category name). Used
 *  only when no tag-driven match is found. */
const AUDIENCE_BY_CATEGORY_TAG: Record<string, string> = {
  pay:           'Payroll administrators and operations managers',
  performance:   'Operations managers tracking team accountability',
  'time tracking': 'Floor supervisors and shift schedulers',
  scheduling:    'Shift schedulers and operations leaders',
  training:      'HR teams running onboarding cohorts',
};

const TIMING_BY_TRIGGER: Record<TriggerCategory, string> = {
  clock_in_clock_out:  'Every time a worker clocks in or out',
  shift_request:       'When workers submit shift requests',
  shift_group_request: 'When users request to join a shift group',
  scheduling:          'Around scheduled shift start times',
  shift_release:       'When shifts open up unexpectedly',
  geofence:            'When workers enter or leave a job site',
  data_workflows:      'When time-off or onboarding records change',
  breaks:              'Around scheduled break windows',
  tasks:               'When task records are created or updated',
  documents:           'When documents are submitted or signed',
  recurring_interval:  'On a recurring schedule',
  button:              'When users tap an in-app action button',
  comments:            'When users post comments on records',
  jobs:                'When jobs are created or updated',
  recommended_shifts:  'When shifts surface as recommendations',
};

/** Returns 1-3 bullet rows describing who this template is for and
 *  when it is most useful. Always emits at least one row. */
function inferRecommendedFor(workflow: TemplateWorkflow): RecommendedRow[] {
  const rows: RecommendedRow[] = [];
  const tagLabels = new Set(workflow.tags.map(t => t.label.toLowerCase()));

  // ── WHO ── prefer the category tag (first tag carries the category
  //  identity for every template in the data set); otherwise fall
  //  back to a generic operations audience.
  let audience: string | null = null;
  for (const t of tagLabels) {
    if (AUDIENCE_BY_CATEGORY_TAG[t]) {
      audience = AUDIENCE_BY_CATEGORY_TAG[t];
      break;
    }
  }
  rows.push({
    id:   'who',
    kind: 'who',
    text: audience ?? 'Operations leaders and team admins',
  });

  // ── WHEN ── purely trigger-driven; the table covers every
  //  TriggerCategory so the lookup is always defined.
  rows.push({
    id:   'when',
    kind: 'when',
    text: TIMING_BY_TRIGGER[workflow.triggerCategory],
  });

  // ── WHY ── pick the strongest tag-driven outcome hint. The order
  //  matters: the more specific tags (premium, geofence, time off)
  //  win before falling through to the generic notification message.
  let outcome: string | null = null;
  if (tagLabels.has('premium')) {
    outcome = 'Programs with premium-pay or escalation rules';
  } else if (tagLabels.has('geofence')) {
    outcome = 'Distributed sites where location-based automation matters';
  } else if (tagLabels.has('time off')) {
    outcome = 'HR teams managing time-off approvals at scale';
  } else if (tagLabels.has('onboarding')) {
    outcome = 'Workforces with regular onboarding cohorts';
  } else if (tagLabels.has('pay')) {
    outcome = 'Sites with strict payroll attestation deadlines';
  } else if (tagLabels.has('notification') || tagLabels.has('reminder')) {
    outcome = 'Teams that need timely nudges to stay on policy';
  } else if (tagLabels.has('shift')) {
    outcome = 'Shift-heavy operations with frequent schedule changes';
  }
  if (outcome) {
    rows.push({ id: 'why', kind: 'why', text: outcome });
  }

  return rows;
}


// Duration of the close animation — kept in JS so the unmount
// timeout matches the CSS keyframes that play it. Bumping this needs
// the matching change in TemplatesPage.module.css (see
// `templateDialogOverlayOut` / `templateDialogPanelOut`).
const TEMPLATE_DIALOG_CLOSE_MS = 180;

function TemplatePreviewDialog({
  workflow,
  categoryName,
  onClose,
  onUseTemplate,
}: TemplatePreviewDialogProps) {
  // Hold a local copy of `workflow` so the dialog can stay mounted
  // through its exit animation after the parent has already cleared
  // its `expandedId`. When the parent sets workflow=null we set
  // `closing=true` (which the CSS reads to play the exit keyframes)
  // and then drop the rendered workflow once the animation ends.
  const [renderedWorkflow, setRenderedWorkflow] = useState<TemplateWorkflow | null>(workflow);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (workflow) {
      // Opening (or switching templates): mount the new content
      // immediately and clear any in-flight closing state so the
      // enter animation plays cleanly.
      setRenderedWorkflow(workflow);
      setClosing(false);
      return;
    }
    // Closing: only kick off the exit animation if something is
    // currently rendered. If we never had a workflow there's nothing
    // to animate out.
    if (!renderedWorkflow) return;
    setClosing(true);
    const t = window.setTimeout(() => {
      setRenderedWorkflow(null);
      setClosing(false);
    }, TEMPLATE_DIALOG_CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [workflow, renderedWorkflow]);

  // Toggle a body data attribute while the dialog is in its closing
  // phase so the CSS in TemplatesPage.module.css can swap from the
  // enter keyframes to the exit ones (the Alloy Dialog renders into
  // a portal so we can't put a class on the dialog element itself
  // from this scope).
  useEffect(() => {
    if (closing) {
      document.body.dataset.templateDialogClosing = 'true';
      return () => { delete document.body.dataset.templateDialogClosing; };
    }
  }, [closing]);

  const open = renderedWorkflow !== null;
  return (
    <Dialog open={open} onClose={onClose} size="md" aria-labelledby="template-preview-title">
      {renderedWorkflow && (() => {
        const workflow = renderedWorkflow;
        const triggerMeta = TRIGGER_CATEGORY_META[workflow.triggerCategory];
        const accent = TRIGGER_ACCENT[workflow.triggerCategory];
        const stepCount = workflow.steps.length;
        return (
          <>
            {/* Header — Marketplace-style identity row: shape glyph on
                the leading edge, then a stacked (name + meta) identity
                block, then a curation pill, with the standard Dialog
                close (×) on the trailing edge. */}
            <DialogHeader onClose={onClose}>
              <div className={styles.previewHeaderRow}>
                <div
                  className={styles.previewShape}
                  data-accent={accent}
                  aria-hidden
                >
                  <span className={styles.previewShapeIcon}>
                    <triggerMeta.Icon />
                  </span>
                </div>
                <div className={styles.previewIdentity}>
                  <span id="template-preview-title" className={styles.previewName}>
                    {workflow.name}
                  </span>
                  <span className={styles.previewMeta}>
                    {/* Adoption metric in place of the old step-count
                        readout. Reads as "<trigger> · <N> used" so a
                        user evaluating the template sees how many
                        teams already run it. */}
                    {triggerMeta.label} · {synthesizeUsedCount(workflow.id)} used
                  </span>
                </div>
              </div>
            </DialogHeader>

            <DialogContent>
              {/* Description section — every body block follows the
                  same eyebrow + content rhythm so the dialog reads as
                  a stack of equal-weight sections (Description / Tags
                  / Steps). The standalone "N steps" chip moved up into
                  the header's meta line, so the body no longer needs
                  a hero stats row. */}
              <section className={styles.previewSection}>
                <h3 className={styles.previewSectionHeading}>Description</h3>
                <p className={styles.previewDescription}>
                  {triggerMeta.label} flow: &ldquo;{workflow.name}&rdquo;. Uses{' '}
                  {stepCount} step{stepCount === 1 ? '' : 's'} to accomplish
                  its task.
                </p>
              </section>

              {/* Category section — single value, same eyebrow + content
                  rhythm as the surrounding Description / Tags / Action
                  types sections. */}
              <section className={styles.previewSection}>
                <h3 className={styles.previewSectionHeading}>Category</h3>
                <p className={styles.previewMetaValue}>
                  {categoryName ?? '—'}
                </p>
              </section>

              {/* Tags section — same eyebrow + chip cluster rhythm as
                  Description above and Action types below. */}
              {workflow.tags.length > 0 && (
                <section className={styles.previewSection}>
                  <h3 className={styles.previewSectionHeading}>Tags</h3>
                  <div className={styles.previewTagList}>
                    {workflow.tags.map(t => (
                      <Tag
                        key={t.label}
                        size="sm"
                        variant="subtle"
                        color="neutral"
                      >
                        {t.label}
                      </Tag>
                    ))}
                  </div>
                </section>
              )}

              {/* Recommended for — quick rundown of who should adopt
                  this template (audience role) and when it earns its
                  keep (trigger context + outcome hint). Renders as
                  the same single-line list style used for Action
                  types so the dialog reads as a series of skim-able
                  capability sections. */}
              {(() => {
                const rows = inferRecommendedFor(workflow);
                if (rows.length === 0) return null;
                return (
                  <section className={styles.previewSection}>
                    <h3 className={styles.previewSectionHeading}>Recommended for</h3>
                    <ul className={styles.previewActionList}>
                      {rows.map(row => (
                        <li
                          key={row.id}
                          className={styles.previewActionItem}
                          data-accent={
                            row.kind === 'who'  ? 'blue'   :
                            row.kind === 'when' ? 'orange' :
                                                  'matcha'
                          }
                        >
                          <span className={styles.previewActionIcon} aria-hidden>
                            {row.kind === 'who'  && <Users03Icon size={16} />}
                            {row.kind === 'when' && <ClockIcon   size={16} />}
                            {row.kind === 'why'  && <Target04Icon size={16} />}
                          </span>
                          <span className={styles.previewActionDescription}>
                            {row.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })()}

              {/* Action types — concrete action-node categories the
                  user is likely to pick when configuring this
                  template's action steps. Each row shows the
                  category icon, label, and a short plain-language
                  description so the section reads as a capability
                  list rather than an opaque chip cluster. */}
              {(() => {
                const actionCategories = inferActionCategories(workflow);
                if (actionCategories.length === 0) return null;
                return (
                  <section className={styles.previewSection}>
                    <h3 className={styles.previewSectionHeading}>Action types</h3>
                    <ul className={styles.previewActionList}>
                      {actionCategories.map(cat => {
                        const Icon = ACTION_CATEGORY_ICON[cat];
                        return (
                          <li
                            key={cat}
                            className={styles.previewActionItem}
                            data-accent={ACTION_CATEGORY_COLOR[cat]}
                          >
                            <span className={styles.previewActionIcon} aria-hidden>
                              <Icon />
                            </span>
                            <span className={styles.previewActionDescription}>
                              {ACTION_CATEGORY_DESCRIPTION[cat]}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })()}
            </DialogContent>

            <DialogFooter>
              {/* Alloy Button `md` = 36px tall (per Button.module.css). */}
              <Button variant="tertiary" size="md" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                trailingArtwork={<ArrowNarrowRightIcon size={16} />}
                onClick={onUseTemplate}
              >
                Try Template
              </Button>
            </DialogFooter>
          </>
        );
      })()}
    </Dialog>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  selectedIds,
  onToggleSelect,
  expandedId,
  onToggleExpand,
  savedIds,
  onToggleSave,
  onUseTemplate,
  onEditTemplate,
}: {
  category: TemplateCategory;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  onUseTemplate: (id: string) => void;
  onEditTemplate: (id: string) => void;
}) {
  // Section header mirrors the TeambridgeCode Marketplace pattern —
  // a heavyweight title (`suggestedFor`) and a softer caption beneath
  // it. Falls back to a synthesized caption so untyped categories still
  // get a readable subtitle.
  const caption =
    category.caption ?? `Templates curated for ${category.name.toLowerCase()} teams`;

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{category.suggestedFor}</h2>
        <span className={styles.sectionCaption}>{caption}</span>
      </header>
      <div className={styles.grid}>
        {category.workflows.map(w => (
          <Fragment key={w.id}>
            <TemplateCard
              workflow={w}
              isSelected={selectedIds.has(w.id)}
              onToggleSelect={() => onToggleSelect(w.id)}
              isExpanded={expandedId === w.id}
              onToggleExpand={() => onToggleExpand(w.id)}
              saved={savedIds.has(w.id)}
              onToggleSave={() => onToggleSave(w.id)}
              onUseTemplate={() => onUseTemplate(w.id)}
              onEditTemplate={() => onEditTemplate(w.id)}
            />
          </Fragment>
        ))}
      </div>
    </section>
  );
}


// ─── Hero banner ──────────────────────────────────────────────────────────────

function HeroBanner({
  search,
  onSearch,
  onClear,
  filters,
  searchResults,
  onSelectResult,
}: {
  search: string;
  onSearch: (v: string) => void;
  onClear: () => void;
  /** Optional filter row rendered directly below the search field
   *  inside the centered hero column. */
  filters?: ReactNode;
  /** Templates matching the current search query. The hero owns
   *  the dropdown UI; the parent decides what counts as a match. */
  searchResults: TemplateWorkflow[];
  /** Called when the user clicks a result row. */
  onSelectResult: (id: string) => void;
}) {
  // Dropdown visibility — only show when the field is focused AND the
  // user has typed something, mirroring the Marketplace search.
  const [searchFocused, setSearchFocused] = useState(false);
  const trimmed = search.trim();
  const showDropdown = searchFocused && trimmed.length > 0;

  return (
    <div className={styles.hero}>
      <div className={styles.heroContent}>
        {/* Title + subtitle grouped — matches Figma Group layer */}
        <div className={styles.heroTitleGroup}>
          <h1 className={styles.heroTitle}>
            Start automations Faster with{' '}
            <span className={styles.heroAccent}>Ready-to-use</span> Workflows
          </h1>
          <p className={styles.heroSubtitle}>
            Use one of the most common workflows below or build your own.
          </p>
        </div>

        {/* Search field + dropdown panel. The wrap div is `position:
            relative` so the panel anchors to the search field's
            footprint regardless of where the hero sits. */}
        <div className={styles.heroSearchWrap}>
          <SearchField
            placeholder="Search templates"
            value={search}
            onChange={e => onSearch(e.target.value)}
            onClear={onClear}
            size="md"
            className={styles.heroSearch}
            onFocus={() => setSearchFocused(true)}
            // Defer blur slightly so the click handler on a result row
            // can fire before the dropdown unmounts (mousedown on a
            // result still beats this timeout).
            onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
          />
          {showDropdown && (
            <div
              className={styles.heroSearchDropdown}
              // Keep focus on the field while the user clicks a row;
              // mousedown that bubbles to the document would otherwise
              // blur the input and unmount us before `onClick` runs.
              onMouseDown={e => e.preventDefault()}
              role="listbox"
              aria-label="Template search results"
            >
              {searchResults.length === 0 ? (
                <div className={styles.heroSearchEmpty}>
                  No templates match &ldquo;{trimmed}&rdquo;
                </div>
              ) : (
                searchResults.map(w => {
                  const meta = TRIGGER_CATEGORY_META[w.triggerCategory];
                  const accent = TRIGGER_ACCENT[w.triggerCategory];
                  const tagText = w.tags.map(t => t.label).join(' · ');
                  return (
                    <ListItem
                      key={w.id}
                      size="md"
                      divider={false}
                      interactive
                      label={w.name}
                      description={`${meta.label}${tagText ? ` · ${tagText}` : ''}`}
                      leadingSlot={
                        <span
                          className={styles.heroSearchResultIcon}
                          data-accent={accent}
                          aria-hidden
                        >
                          <meta.Icon />
                        </span>
                      }
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectResult(w.id);
                      }}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>

        {filters}
      </div>
    </div>
  );
}

// ─── Hero artwork (page-level background) ────────────────────────────────────
// The gradient ring SVGs that used to live inside the hero block now sit
// at the page's scroll-area background — anchored to the top edges so the
// rings frame the hero area without containing its content.

function HeroArtwork() {
  return (
    <div className={styles.heroDecos} aria-hidden>
      {/*
        Hero artwork — five blurred gradient shapes lifted directly from
        Hero.svg (1330×847 design canvas). Each shape lives in its own
        `<g>` so it can carry an independent CSS float animation; the
        wrapping classes `.float0` … `.float4` apply different durations
        + delays so the cluster drifts in a quietly random rhythm.
      */}
      <svg
        className={styles.heroDecoSvg}
        viewBox="0 0 1330 847"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="hero-f0" x="926.762" y="-47.8188" width="308.827" height="261.214" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feGaussianBlur stdDeviation="8.5" result="effect1_foregroundBlur"/>
          </filter>
          <filter id="hero-f1" x="4" y="107" width="306.598" height="265" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feGaussianBlur stdDeviation="8.5" result="effect1_foregroundBlur"/>
          </filter>
          <filter id="hero-f2" x="422" y="265" width="202.161" height="202.161" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feGaussianBlur stdDeviation="8.5" result="effect1_foregroundBlur"/>
          </filter>
          <filter id="hero-f3" x="-80" y="491" width="202.161" height="202.161" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feGaussianBlur stdDeviation="8.5" result="effect1_foregroundBlur"/>
          </filter>
          <filter id="hero-f4" x="1174.98" y="269.636" width="222.98" height="192.727" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feGaussianBlur stdDeviation="6.18182" result="effect1_foregroundBlur"/>
          </filter>
          <linearGradient id="hero-g0" x1="1013.03" y1="200.826" x2="1149.32" y2="-35.2501" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EDD678"/>
            <stop offset="0.341346" stopColor="#2ABF84"/>
            <stop offset="0.625" stopColor="#3CB6D1"/>
            <stop offset="1" stopColor="#F5E5E1"/>
          </linearGradient>
          <linearGradient id="hero-g1" x1="21" y1="239.5" x2="293.598" y2="239.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5E5E1"/>
            <stop offset="0.375" stopColor="#3CB6D1"/>
            <stop offset="0.658654" stopColor="#2ABF84"/>
            <stop offset="1" stopColor="#EDD678"/>
          </linearGradient>
          <linearGradient id="hero-g2" x1="439" y1="366.081" x2="607.161" y2="366.081" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5E5E1"/>
            <stop offset="0.375" stopColor="#3CB6D1"/>
            <stop offset="0.658654" stopColor="#2ABF84"/>
            <stop offset="1" stopColor="#EDD678"/>
          </linearGradient>
          <linearGradient id="hero-g3" x1="-63" y1="592.081" x2="105.161" y2="592.081" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5E5E1"/>
            <stop offset="0.375" stopColor="#3CB6D1"/>
            <stop offset="0.658654" stopColor="#2ABF84"/>
            <stop offset="1" stopColor="#EDD678"/>
          </linearGradient>
          <linearGradient id="hero-g4" x1="1187.34" y1="366" x2="1385.6" y2="366" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5E5E1"/>
            <stop offset="0.375" stopColor="#3CB6D1"/>
            <stop offset="0.658654" stopColor="#2ABF84"/>
            <stop offset="1" stopColor="#EDD678"/>
          </linearGradient>
        </defs>

        {/* Spiral + interlocked circles — top right */}
        <g className={styles.float0}>
          <g filter="url(#hero-f0)">
            <path d="M955.04 70.2609C975.127 35.4705 1016.32 20.4662 1053.11 32.0844C1054.97 24.9454 1057.81 17.9348 1061.68 11.2357C1084.9 -28.9792 1136.32 -42.7584 1176.53 -19.5406L1177.47 -18.9913C1216.96 4.48033 1230.35 55.4153 1207.31 95.3162L1206.76 96.2533C1186.48 130.376 1145.7 145.006 1109.24 133.492C1107.38 140.631 1104.54 147.642 1100.67 154.341L1100.12 155.279C1076.65 194.769 1025.72 208.153 985.816 185.116C945.601 161.898 931.822 110.476 955.04 70.2609ZM1072.07 17.2357C1068.49 23.4308 1065.94 29.9361 1064.36 36.5557C1066.23 37.4572 1068.07 38.432 1069.9 39.4846L1070.83 40.034C1100.03 57.3896 1114.96 89.7609 1111.44 121.584C1143.33 132.383 1179.44 119.585 1196.92 89.3162C1216.82 54.8407 1205.01 10.7561 1170.53 -9.14833C1136.06 -29.0524 1091.98 -17.2397 1072.07 17.2357ZM965.433 76.2609C945.528 110.736 957.341 154.82 991.816 174.724C1026.29 194.629 1070.38 182.817 1090.28 148.341C1093.86 142.147 1096.41 135.641 1097.99 129.022C1096.12 128.12 1094.28 127.144 1092.45 126.091C1062.64 108.876 1047.35 76.154 1050.91 43.9923C1019.02 33.1948 982.908 45.9927 965.433 76.2609ZM1062.52 49.1039C1061.02 75.4282 1074.06 101.616 1098.45 115.699C1098.91 115.963 1099.37 116.22 1099.83 116.473C1101.33 90.1481 1088.29 63.9601 1063.9 49.8769C1063.44 49.6132 1062.98 49.3565 1062.52 49.1039Z" fill="url(#hero-g0)"/>
          </g>
        </g>

        {/* Large interlocked circles — left middle */}
        <g className={styles.float1}>
          <g filter="url(#hero-f1)">
            <path d="M105.08 124C145.253 124 178.844 152.174 187.176 189.841C194.29 187.885 201.781 186.839 209.517 186.839C255.953 186.839 293.597 224.483 293.598 270.919L293.591 272.006C293.009 317.941 255.59 355 209.517 355L208.431 354.993C168.74 354.49 135.678 326.485 127.422 289.158C120.307 291.114 112.816 292.161 105.08 292.161L103.994 292.154C58.0584 291.573 21 254.154 21 208.08C21.0002 161.644 58.644 124 105.08 124ZM209.517 198.839C202.363 198.839 195.453 199.881 188.93 201.821C189.082 203.888 189.161 205.975 189.161 208.08L189.154 209.167C188.724 243.133 168.152 272.244 138.834 285.109C145.425 318.123 174.565 343 209.517 343C249.326 343 281.598 310.728 281.598 270.919C281.597 231.11 249.325 198.839 209.517 198.839ZM105.08 136C65.2714 136 33.0002 168.271 33 208.08C33 247.889 65.2713 280.161 105.08 280.161C112.233 280.161 119.143 279.118 125.666 277.178C125.514 275.111 125.437 273.024 125.437 270.919C125.437 236.488 146.133 206.891 175.763 193.889C169.171 160.876 140.031 136 105.08 136ZM177.143 206.502C153.593 218.361 137.437 242.753 137.437 270.919C137.437 271.446 137.443 271.972 137.454 272.497C161.004 260.638 177.161 236.246 177.161 208.08C177.161 207.553 177.154 207.027 177.143 206.502Z" fill="url(#hero-g1)"/>
          </g>
        </g>

        {/* Simple ring — center */}
        <g className={styles.float2}>
          <g filter="url(#hero-f2)">
            <path d="M523.08 282C569.516 282 607.161 319.644 607.161 366.08L607.154 367.167C606.573 413.103 569.154 450.161 523.08 450.161L521.994 450.154C476.058 449.573 439 412.154 439 366.08C439 319.644 476.644 282 523.08 282ZM523.08 294C483.271 294 451 326.271 451 366.08C451 405.889 483.271 438.161 523.08 438.161C562.889 438.161 595.161 405.889 595.161 366.08C595.161 326.271 562.889 294 523.08 294Z" fill="url(#hero-g2)"/>
          </g>
        </g>

        {/* Simple ring — bottom left */}
        <g className={styles.float3}>
          <g filter="url(#hero-f3)">
            <path d="M21.0801 508C67.5163 508 105.161 545.644 105.161 592.08L105.154 593.167C104.573 639.103 67.1537 676.161 21.0801 676.161L19.9941 676.154C-25.9416 675.573 -63 638.154 -63 592.08C-62.9998 545.644 -25.356 508 21.0801 508ZM21.0801 520C-18.7286 520 -50.9998 552.271 -51 592.08C-51 631.889 -18.7287 664.161 21.0801 664.161C60.889 664.161 93.1611 631.889 93.1611 592.08C93.1609 552.271 60.8889 520 21.0801 520Z" fill="url(#hero-g3)"/>
          </g>
        </g>

        {/* Ring + circle pair — right middle */}
        <g className={styles.float4}>
          <g filter="url(#hero-f4)">
            <path d="M1248.49 282C1277.71 282 1302.14 302.49 1308.2 329.884C1313.37 328.461 1318.82 327.701 1324.45 327.701C1358.22 327.701 1385.6 355.079 1385.6 388.851C1385.6 422.622 1358.22 450 1324.45 450C1295.23 450 1270.8 429.51 1264.74 402.115C1259.57 403.538 1254.12 404.299 1248.49 404.299C1214.72 404.299 1187.34 376.921 1187.34 343.149C1187.34 309.378 1214.72 282 1248.49 282ZM1324.45 336.429C1319.25 336.429 1314.22 337.186 1309.48 338.598C1309.59 340.1 1309.64 341.618 1309.64 343.149C1309.64 368.19 1294.59 389.715 1273.04 399.171C1277.84 423.18 1299.03 441.272 1324.45 441.272C1353.4 441.272 1376.87 417.803 1376.87 388.851C1376.87 359.899 1353.4 336.429 1324.45 336.429ZM1248.49 290.728C1219.54 290.728 1196.07 314.197 1196.07 343.149C1196.07 372.101 1219.54 395.571 1248.49 395.571C1253.7 395.571 1258.72 394.813 1263.47 393.401C1263.36 391.899 1263.3 390.381 1263.3 388.851C1263.3 363.81 1278.35 342.285 1299.9 332.828C1295.1 308.819 1273.91 290.728 1248.49 290.728ZM1300.9 342.002C1283.78 350.627 1272.03 368.366 1272.03 388.851C1272.03 389.234 1272.03 389.616 1272.04 389.997C1289.17 381.372 1300.92 363.634 1300.92 343.149C1300.92 342.766 1300.91 342.383 1300.9 342.002Z" fill="url(#hero-g4)"/>
          </g>
        </g>
      </svg>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TemplatesPage() {
  const navigate = useNavigate();
  const [search,         setSearch]         = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [triggerFilter,  setTriggerFilter]  = useState('all');
  // Bulk selection — rendered as a blue border on the card.
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  // Single-expand inline preview.
  const [expandedId,     setExpandedId]     = useState<string | null>(null);
  // Saved templates — toggled via the Save/Saved button on each card.
  const [savedIds,       setSavedIds]       = useState<Set<string>>(new Set());

  const toggleSaved = useCallback((id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId(curr => (curr === id ? null : id));
  }, []);

  // Navigate to the builder with the selected template's metadata attached
   // via router state. BuilderPage reads this and synthesizes the initial
   // graph (trigger + action chain / optional condition / delay) procedurally
   // from `steps` + `triggerCategory`, so every template slot in the library
   // produces a dedicated, prefilled canvas without per-template graph data.
  const findTemplate = useCallback((id: string) => {
    for (const cat of CATEGORIES) {
      for (const w of cat.workflows) if (w.id === id) return w;
    }
    return undefined;
  }, []);
  const openTemplate = useCallback((id: string) => {
    const tpl = findTemplate(id);
    navigate('/automations/new', {
      state: tpl
        ? {
            templateId:       tpl.id,
            templateName:     tpl.name,
            templateSteps:    tpl.steps,
            triggerCategory:  tpl.triggerCategory,
          }
        : undefined,
    });
  }, [navigate, findTemplate]);
  const useTemplate = openTemplate;
  const editTemplate = openTemplate;

  // Section list is filtered ONLY by the category + trigger selects.
  // The search field now drives a separate dropdown of matching
  // templates (rendered inside the hero) and no longer narrows the
  // sections below — so a user can browse the full catalog while a
  // typed query surfaces direct hits in the dropdown.
  const visible = useMemo(() => {
    return CATEGORIES
      .map(c => ({
        ...c,
        workflows: c.workflows.filter(w => {
          if (categoryFilter !== 'all' && c.id !== categoryFilter) return false;
          if (triggerFilter !== 'all' && w.triggerCategory !== triggerFilter) return false;
          return true;
        }),
      }))
      .filter(c => c.workflows.length > 0);
  }, [categoryFilter, triggerFilter]);

  // Live search results — name + tags + trigger label, capped at 8
  // rows so the dropdown stays scannable without forcing internal
  // scrolling on most viewports.
  const searchResults = useMemo<TemplateWorkflow[]>(() => {
    const q = search.toLowerCase().trim();
    if (q.length === 0) return [];
    const matches: TemplateWorkflow[] = [];
    for (const cat of CATEGORIES) {
      for (const w of cat.workflows) {
        const haystack = [
          w.name,
          TRIGGER_CATEGORY_META[w.triggerCategory].label,
          ...w.tags.map(t => t.label),
        ].join(' ').toLowerCase();
        if (haystack.includes(q)) matches.push(w);
        if (matches.length >= 8) break;
      }
      if (matches.length >= 8) break;
    }
    return matches;
  }, [search]);

  return (
    <div className={styles.page}>

      {/* SVG ring artwork — sits behind the page content as a top
          backdrop, anchored to the page surface's left/right edges. */}
      <HeroArtwork />

      {/* ── Marketplace-style hero — centered headline + subtitle + a
            single search field. Quick-filter pills + the trailing
            divider were dropped to mimic the App Marketplace landing. ── */}
      <HeroBanner
        search={search}
        onSearch={setSearch}
        onClear={() => setSearch('')}
        searchResults={searchResults}
        onSelectResult={id => {
          // Selecting a result clears the search field (closing the
          // dropdown) and opens the template's preview dialog.
          setSearch('');
          toggleExpanded(id);
        }}
        filters={
          /* Filter selects sit directly under the search bar inside
             the hero's centered column — Alloy SelectFields with `md`
             size to match the SearchField above, outlined variant
             (default), and Alloy icons in the leading slot. */
          <div className={styles.filterSelects}>
            <SelectField
              options={CATEGORY_OPTIONS}
              value={categoryFilter}
              onChange={setCategoryFilter}
              size="sm"
              className={styles.filterSelect}
              leadingIcon={<Grid01Icon />}
            />
            <SelectField
              options={TRIGGER_OPTIONS}
              value={triggerFilter}
              onChange={setTriggerFilter}
              size="sm"
              className={styles.filterSelect}
              leadingIcon={<Target04Icon />}
            />
          </div>
        }
      />

      {/* ── Sections ── */}
      {visible.length === 0 ? (
        <p className={styles.emptyState}>No templates match your filters.</p>
      ) : (
        visible.map(cat => (
          <CategorySection
            key={cat.id}
            category={cat}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelected}
            expandedId={expandedId}
            onToggleExpand={toggleExpanded}
            savedIds={savedIds}
            onToggleSave={toggleSaved}
            onUseTemplate={useTemplate}
            onEditTemplate={editTemplate}
          />
        ))
      )}

      {/* Page-level template preview dialog. Mounts once and reads from
          `expandedId` so any card in any section can drive it without
          rendering a per-card overlay. The dialog also takes the parent
          category name so its header can render the curation pill on
          the trailing edge (Marketplace-style "Recommended" slot). */}
      <TemplatePreviewDialog
        workflow={expandedId ? findTemplate(expandedId) ?? null : null}
        categoryName={
          expandedId
            ? CATEGORIES.find(c => c.workflows.some(w => w.id === expandedId))?.name ?? null
            : null
        }
        onClose={() => setExpandedId(null)}
        onUseTemplate={() => {
          if (expandedId) {
            const id = expandedId;
            setExpandedId(null);
            openTemplate(id);
          }
        }}
      />
    </div>
  );
}
