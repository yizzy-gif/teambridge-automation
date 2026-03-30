import React, { useState, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Button } from '@alloy/components/Button';
import { Tag } from '@alloy/components/Tag';
import type { TagColor } from '@alloy/components/Tag';
import { Tabs } from '@alloy/components/Tabs';
import { SearchField, SelectField } from '@alloy/components/Input';
import { FilterPill } from '@alloy/components/FilterPill';
import { BookmarkIcon } from '@alloy/components/icons/BookmarkIcon';
import { Divider } from '@alloy/components/Divider';
import { Target04Icon } from '@alloy/components/icons/Target04Icon';
import styles from './TemplatesPage.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type StepType = 'trigger' | 'condition' | 'action';

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
  workflows: TemplateWorkflow[];
}

// ─── Mini Workflow Preview SVG ────────────────────────────────────────────────

const NODE_COLORS: Record<StepType, string> = {
  trigger:   '#b45309',
  condition: '#1454cb',
  action:    '#15803d',
};

const NODE_BG: Record<StepType, string> = {
  trigger:   '#fae1c0',
  condition: '#d1e1ff',
  action:    '#bbf7d0',
};

function WorkflowPreview({ steps, saved, onSave }: {
  steps: StepType[];
  saved: boolean;
  onSave: () => void;
}) {
  const display = steps.slice(0, 3);
  const nodeW = 78;
  const nodeH = 42;
  const gap   = 18;
  const svgW  = 300;
  const svgH  = 96;
  const totalW = display.length * nodeW + (display.length - 1) * gap;
  const startX = (svgW - totalW) / 2;
  const y      = (svgH - nodeH) / 2;

  return (
    <div className={styles.previewArea}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className={styles.previewSvg}
        aria-hidden
      >
        {display.map((type, i) => {
          const x = startX + i * (nodeW + gap);
          const mx = x - gap;
          const my = y + nodeH / 2;
          return (
            <g key={i}>
              {i > 0 && (
                <>
                  <line x1={mx} y1={my} x2={x} y2={my} stroke="#e2e8f0" strokeWidth="1.5"/>
                  <polygon
                    points={`${x - 4},${my - 3} ${x},${my} ${x - 4},${my + 3}`}
                    fill="#cbd5e1"
                  />
                </>
              )}
              <rect
                x={x} y={y} width={nodeW} height={nodeH}
                rx="6" ry="6"
                fill="white"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <circle cx={x + 13} cy={y + nodeH / 2} r="5" fill={NODE_BG[type]}/>
              <circle cx={x + 13} cy={y + nodeH / 2} r="3" fill={NODE_COLORS[type]}/>
              <rect x={x + 24} y={y + 11} width={nodeW - 30} height={5} rx="2.5" fill="#e2e8f0"/>
              <rect x={x + 24} y={y + 22} width={nodeW - 38} height={5} rx="2.5" fill="#f1f5f9"/>
            </g>
          );
        })}
      </svg>

      {/* Save / Bookmark button */}
      <button
        className={clsx(styles.saveBtn, saved && styles.saveBtnActive)}
        onClick={e => { e.stopPropagation(); onSave(); }}
        aria-label={saved ? 'Unsave template' : 'Save template'}
      >
        <BookmarkIcon size={14} />
      </button>
    </div>
  );
}

// ─── Template Data ────────────────────────────────────────────────────────────

const CATEGORIES: TemplateCategory[] = [
  {
    id: 'pay', name: 'Pay', suggestedFor: 'Pay Management',
    workflows: [
      { id: 'pay-1', name: 'Next day pay reminder on clock-out',           steps: ['trigger', 'action', 'action'], triggerCategory: 'clock_in_clock_out', tags: [{ label: 'Pay', color: 'purple' }, { label: 'Notification', color: 'orange' }] },
      { id: 'pay-2', name: 'Signature reminder on clock-out',              steps: ['trigger', 'action', 'action'], triggerCategory: 'clock_in_clock_out', tags: [{ label: 'Pay', color: 'purple' }, { label: 'Notification', color: 'orange' }] },
      { id: 'pay-3', name: 'Pay period attestation reminder on clock-out', steps: ['trigger', 'action', 'action'], triggerCategory: 'clock_in_clock_out', tags: [{ label: 'Pay', color: 'purple' }, { label: 'Notification', color: 'orange' }] },
      { id: 'pay-4', name: 'Apply bonus to claimed shift',                 steps: ['trigger', 'action'],           triggerCategory: 'shift_request',      tags: [{ label: 'Pay', color: 'purple' }, { label: 'Shift', color: 'orange' }] },
    ],
  },
  {
    id: 'performance', name: 'Performance', suggestedFor: 'Performance Monitoring',
    workflows: [
      { id: 'perf-1', name: 'No show notification',                 steps: ['trigger', 'action', 'action'], triggerCategory: 'scheduling',    tags: [{ label: 'Performance', color: 'blue' }, { label: 'Notification', color: 'orange' }] },
      { id: 'perf-2', name: 'Release shift warning',                steps: ['trigger', 'action', 'action'], triggerCategory: 'shift_release', tags: [{ label: 'Performance', color: 'blue' }, { label: 'Shift', color: 'green' }] },
      { id: 'perf-3', name: 'Thank you message for claiming shift', steps: ['trigger', 'action', 'action'], triggerCategory: 'shift_request', tags: [{ label: 'Performance', color: 'blue' }, { label: 'Shift', color: 'green' }] },
    ],
  },
  {
    id: 'time-tracking', name: 'Time Tracking', suggestedFor: 'Time & Attendance',
    workflows: [
      { id: 'tt-1', name: '30 minutes shift reminder',                    steps: ['trigger', 'action', 'action'], triggerCategory: 'scheduling',        tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Reminder', color: 'orange' }] },
      { id: 'tt-2', name: '1 hour shift reminder',                        steps: ['trigger', 'action', 'action'], triggerCategory: 'scheduling',        tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Reminder', color: 'orange' }] },
      { id: 'tt-3', name: '12 hour shift reminder',                       steps: ['trigger', 'action', 'action'], triggerCategory: 'scheduling',        tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Reminder', color: 'orange' }] },
      { id: 'tt-4', name: 'Notify users if they are late to a shift',     steps: ['trigger', 'action', 'action'], triggerCategory: 'scheduling',        tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Notification', color: 'orange' }] },
      { id: 'tt-5', name: 'Clock in when user enters geofence',           steps: ['trigger', 'action'],           triggerCategory: 'geofence',          tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Geofence', color: 'blue' }] },
      { id: 'tt-6', name: 'Clock out when user leaves geofence',          steps: ['trigger', 'action'],           triggerCategory: 'geofence',          tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Geofence', color: 'blue' }] },
      { id: 'tt-7', name: 'Auto clock in',                                steps: ['trigger', 'action'],           triggerCategory: 'clock_in_clock_out', tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Clock In', color: 'blue' }] },
      { id: 'tt-8', name: 'Auto clock out',                               steps: ['trigger', 'action'],           triggerCategory: 'clock_in_clock_out', tags: [{ label: 'Time Tracking', color: 'green' }, { label: 'Clock Out', color: 'blue' }] },
    ],
  },
  {
    id: 'scheduling', name: 'Scheduling', suggestedFor: 'Shift Scheduling',
    workflows: [
      { id: 'sched-1', name: 'Notify managers when shift is claimed',     steps: ['trigger', 'action', 'action'], triggerCategory: 'shift_request',      tags: [{ label: 'Scheduling', color: 'orange' }, { label: 'Notification', color: 'blue' }] },
      { id: 'sched-2', name: 'Notify employee when shift claim approved', steps: ['trigger', 'action', 'action'], triggerCategory: 'shift_request',      tags: [{ label: 'Scheduling', color: 'orange' }, { label: 'Notification', color: 'blue' }] },
      { id: 'sched-3', name: 'Notify employee when shift claim rejected', steps: ['trigger', 'action', 'action'], triggerCategory: 'shift_request',      tags: [{ label: 'Scheduling', color: 'orange' }, { label: 'Notification', color: 'blue' }] },
      { id: 'sched-4', name: 'New timeoff requested',                     steps: ['trigger', 'action', 'action'], triggerCategory: 'data_workflows',     tags: [{ label: 'Scheduling', color: 'orange' }, { label: 'Time Off', color: 'purple' }] },
      { id: 'sched-5', name: 'Timeoff approved',                          steps: ['trigger', 'action'],           triggerCategory: 'data_workflows',     tags: [{ label: 'Scheduling', color: 'orange' }, { label: 'Time Off', color: 'purple' }] },
      { id: 'sched-6', name: 'Timeoff rejected',                          steps: ['trigger', 'action'],           triggerCategory: 'data_workflows',     tags: [{ label: 'Scheduling', color: 'orange' }, { label: 'Time Off', color: 'purple' }] },
    ],
  },
  {
    id: 'training', name: 'Training', suggestedFor: 'Employee Training',
    workflows: [
      { id: 'train-1', name: 'Extra clock-in reminder',           steps: ['trigger', 'action'], triggerCategory: 'scheduling',        tags: [{ label: 'Training', color: 'orange' }, { label: 'Reminder', color: 'blue' }] },
      { id: 'train-2', name: 'Extra clock-out reminder',          steps: ['trigger', 'action'], triggerCategory: 'scheduling',        tags: [{ label: 'Training', color: 'orange' }, { label: 'Reminder', color: 'blue' }] },
      { id: 'train-3', name: 'Extra break start reminder',        steps: ['trigger', 'action'], triggerCategory: 'breaks',            tags: [{ label: 'Training', color: 'orange' }, { label: 'Reminder', color: 'blue' }] },
      { id: 'train-4', name: 'Extra break end reminder',          steps: ['trigger', 'action'], triggerCategory: 'breaks',            tags: [{ label: 'Training', color: 'orange' }, { label: 'Reminder', color: 'blue' }] },
      { id: 'train-5', name: 'Send training packet to new users', steps: ['trigger', 'action', 'action'], triggerCategory: 'data_workflows', tags: [{ label: 'Training', color: 'orange' }, { label: 'Onboarding', color: 'green' }] },
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

// ─── Workflow Card ────────────────────────────────────────────────────────────

function WorkflowCard({
  workflow,
  saved,
  onSave,
}: {
  workflow: TemplateWorkflow;
  saved: boolean;
  onSave: () => void;
}) {
  const navigate = useNavigate();
  const stepCount = workflow.steps.length;

  return (
    <div className={styles.card}>
      <WorkflowPreview steps={workflow.steps} saved={saved} onSave={onSave} />

      <div className={styles.cardBody}>
        <p className={`heading-sm ${styles.cardName}`}>{workflow.name}</p>

        <div className={styles.cardMeta}>
          <span className={styles.cardMetaItem}>
            {TRIGGER_CATEGORY_META[workflow.triggerCategory].Icon()}
            {TRIGGER_CATEGORY_META[workflow.triggerCategory].label}
          </span>
          <span className={styles.cardMetaDot} />
          <span className={styles.cardMetaItem}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <circle cx="3" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="11" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M4.5 7h1M8.5 7h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {stepCount} {stepCount === 1 ? 'step' : 'steps'}
          </span>
        </div>

        <div className={styles.cardTags}>
          {workflow.tags.map(t => (
            <Tag key={t.label} variant="subtle" size="sm" color={t.color}>
              {t.label}
            </Tag>
          ))}
        </div>

        <Button
          variant="primary"
          size="sm"
          className={styles.previewBtn}
          onClick={() => navigate('/automations/new')}
        >
          Use Template
        </Button>
      </div>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  savedIds,
  onSave,
}: {
  category: TemplateCategory;
  savedIds: Set<string>;
  onSave: (id: string) => void;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        Suggested for <strong>{category.suggestedFor}</strong>
      </h2>
      <div className={styles.grid}>
        {category.workflows.map(w => (
          <WorkflowCard
            key={w.id}
            workflow={w}
            saved={savedIds.has(w.id)}
            onSave={() => onSave(w.id)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Hero pills ───────────────────────────────────────────────────────────────

const HERO_PILLS = ['Pay', 'Scheduling', 'Time Tracking', 'Performance', 'Training'] as const;

const HERO_PILL_ICONS: Record<typeof HERO_PILLS[number], React.ReactNode> = {
  Pay:             <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="3.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6h12" stroke="currentColor" strokeWidth="1.3"/><circle cx="4.5" cy="9" r="1" fill="currentColor"/></svg>,
  Scheduling:      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 6h11M5 1.5v2M9 1.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  'Time Tracking': <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v3l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Performance:     <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2l1.5 3 3.5.5-2.5 2.5.5 3.5L7 10l-3 1.5.5-3.5L2 5.5l3.5-.5L7 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
  Training:        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 5.5h5M4.5 7.5h3M2 12l2.5-2h5l2.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
};

// ─── Hero banner ──────────────────────────────────────────────────────────────

function HeroBanner({ search, onSearch, onClear, activeTags, onToggleTag }: {
  search: string;
  onSearch: (v: string) => void;
  onClear: () => void;
  activeTags: Set<string>;
  onToggleTag: (tag: string) => void;
}) {
  return (
    <div className={styles.hero}>
      {/* Hero.svg artwork — split into left/right so each anchors to its edge */}
      <div className={styles.heroDecos} aria-hidden>

        {/* Left interlocked circles — viewBox crops to the left artwork region */}
        <svg className={styles.heroDecoLeft} viewBox="-30 60 420 380" preserveAspectRatio="xMinYMid slice" fill="none">
          <defs>
            <filter id="hl-f1" x="4" y="107" width="306.598" height="265" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
              <feGaussianBlur stdDeviation="8.5" result="effect1_foregroundBlur"/>
            </filter>
            <linearGradient id="hl-g1" x1="21" y1="239.5" x2="293.598" y2="239.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F5E5E1"/>
              <stop offset="0.375" stopColor="#3CB6D1"/>
              <stop offset="0.658654" stopColor="#2ABF84"/>
              <stop offset="1" stopColor="#EDD678"/>
            </linearGradient>
          </defs>
          <g filter="url(#hl-f1)">
            <path d="M105.08 124C145.253 124 178.844 152.174 187.176 189.841C194.29 187.885 201.781 186.839 209.517 186.839C255.953 186.839 293.597 224.483 293.598 270.919L293.591 272.006C293.009 317.941 255.59 355 209.517 355L208.431 354.993C168.74 354.49 135.678 326.485 127.422 289.158C120.307 291.114 112.816 292.161 105.08 292.161L103.994 292.154C58.0584 291.573 21 254.154 21 208.08C21.0002 161.644 58.644 124 105.08 124ZM209.517 198.839C202.363 198.839 195.453 199.881 188.93 201.821C189.082 203.888 189.161 205.975 189.161 208.08L189.154 209.167C188.724 243.133 168.152 272.244 138.834 285.109C145.425 318.123 174.565 343 209.517 343C249.326 343 281.598 310.728 281.598 270.919C281.597 231.11 249.325 198.839 209.517 198.839ZM105.08 136C65.2714 136 33.0002 168.271 33 208.08C33 247.889 65.2713 280.161 105.08 280.161C112.233 280.161 119.143 279.118 125.666 277.178C125.514 275.111 125.437 273.024 125.437 270.919C125.437 236.488 146.133 206.891 175.763 193.889C169.171 160.876 140.031 136 105.08 136ZM177.143 206.502C153.593 218.361 137.437 242.753 137.437 270.919C137.437 271.446 137.443 271.972 137.454 272.497C161.004 260.638 177.161 236.246 177.161 208.08C177.161 207.553 177.154 207.027 177.143 206.502Z" fill="url(#hl-g1)"/>
          </g>
        </svg>

        {/* Spiral + right interlocked circles — viewBox crops to right artwork region */}
        <svg className={styles.heroDecoRight} viewBox="880 -28 450 440" preserveAspectRatio="xMaxYMid slice" fill="none">
          <defs>
            <filter id="hr-f0" x="926.762" y="-47.8187" width="308.827" height="261.214" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
              <feGaussianBlur stdDeviation="8.5" result="effect1_foregroundBlur"/>
            </filter>
            <filter id="hr-f2" x="1201" y="167" width="306.598" height="265" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
              <feGaussianBlur stdDeviation="8.5" result="effect1_foregroundBlur"/>
            </filter>
            <linearGradient id="hr-g0" x1="1013.03" y1="200.827" x2="1149.32" y2="-35.25" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EDD678"/>
              <stop offset="0.341346" stopColor="#2ABF84"/>
              <stop offset="0.625" stopColor="#3CB6D1"/>
              <stop offset="1" stopColor="#F5E5E1"/>
            </linearGradient>
            <linearGradient id="hr-g2" x1="1218" y1="299.5" x2="1490.6" y2="299.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F5E5E1"/>
              <stop offset="0.375" stopColor="#3CB6D1"/>
              <stop offset="0.658654" stopColor="#2ABF84"/>
              <stop offset="1" stopColor="#EDD678"/>
            </linearGradient>
          </defs>
          <g filter="url(#hr-f0)">
            <path d="M955.04 70.2611C975.127 35.4706 1016.32 20.4664 1053.11 32.0845C1054.97 24.9455 1057.81 17.9349 1061.68 11.2358C1084.9 -28.979 1136.32 -42.7583 1176.53 -19.5405L1177.47 -18.9911C1216.96 4.48045 1230.35 55.4154 1207.31 95.3163L1206.76 96.2534C1186.48 130.376 1145.7 145.006 1109.24 133.492C1107.38 140.632 1104.54 147.642 1100.67 154.342L1100.12 155.279C1076.65 194.769 1025.72 208.153 985.816 185.117C945.601 161.898 931.822 110.476 955.04 70.2611ZM1072.07 17.2358C1068.49 23.4309 1065.94 29.9363 1064.36 36.5558C1066.23 37.4573 1068.07 38.4321 1069.9 39.4847L1070.83 40.0341C1100.03 57.3897 1114.96 89.761 1111.44 121.584C1143.33 132.383 1179.44 119.585 1196.92 89.3163C1216.82 54.8408 1205.01 10.7562 1170.53 -9.1482C1136.06 -29.0522 1091.98 -17.2395 1072.07 17.2358ZM965.433 76.261C945.528 110.736 957.34 154.82 991.816 174.724C1026.29 194.629 1070.38 182.817 1090.28 148.342C1093.86 142.147 1096.41 135.641 1097.99 129.022C1096.12 128.12 1094.28 127.144 1092.45 126.091C1062.64 108.876 1047.35 76.1541 1050.91 43.9924C1019.02 33.1949 982.908 45.9928 965.433 76.261ZM1062.52 49.1041C1061.02 75.4284 1074.06 101.616 1098.45 115.699C1098.91 115.963 1099.37 116.22 1099.83 116.473C1101.33 90.1483 1088.29 63.9602 1063.9 49.8771C1063.44 49.6134 1062.98 49.3566 1062.52 49.1041Z" fill="url(#hr-g0)"/>
          </g>
          <g filter="url(#hr-f2)">
            <path d="M1302.08 184C1342.25 184 1375.84 212.174 1384.18 249.841C1391.29 247.885 1398.78 246.839 1406.52 246.839C1452.95 246.839 1490.6 284.483 1490.6 330.919L1490.59 332.006C1490.01 377.941 1452.59 415 1406.52 415L1405.43 414.993C1365.74 414.49 1332.68 386.485 1324.42 349.158C1317.31 351.114 1309.82 352.161 1302.08 352.161L1300.99 352.154C1255.06 351.573 1218 314.154 1218 268.08C1218 221.644 1255.64 184 1302.08 184ZM1406.52 258.839C1399.36 258.839 1392.45 259.881 1385.93 261.821C1386.08 263.888 1386.16 265.975 1386.16 268.08L1386.15 269.167C1385.72 303.133 1365.15 332.244 1335.83 345.109C1342.42 378.123 1371.57 403 1406.52 403C1446.33 403 1478.6 370.728 1478.6 330.919C1478.6 291.11 1446.33 258.839 1406.52 258.839ZM1302.08 196C1262.27 196 1230 228.271 1230 268.08C1230 307.889 1262.27 340.161 1302.08 340.161C1309.23 340.161 1316.14 339.118 1322.67 337.178C1322.51 335.111 1322.44 333.024 1322.44 330.919C1322.44 296.488 1343.13 266.891 1372.76 253.889C1366.17 220.876 1337.03 196 1302.08 196ZM1374.14 266.502C1350.59 278.361 1334.44 302.753 1334.44 330.919C1334.44 331.446 1334.44 331.972 1334.45 332.497C1358 320.638 1374.16 296.246 1374.16 268.08C1374.16 267.553 1374.15 267.027 1374.14 266.502Z" fill="url(#hr-g2)"/>
          </g>
        </svg>
      </div>

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
        <SearchField
          placeholder="Search"
          value={search}
          onChange={e => onSearch(e.target.value)}
          onClear={onClear}
          size="lg"
          className={styles.heroSearch}
        />
        <div className={styles.heroPills}>
          {HERO_PILLS.map(tag => (
            <FilterPill
              key={tag}
              size="md"
              icon={HERO_PILL_ICONS[tag]}
              active={activeTags.has(tag)}
              onClick={() => onToggleTag(tag)}
              onRemove={activeTags.has(tag) ? () => onToggleTag(tag) : undefined}
              className={styles.heroPill}
            >
              {tag}
            </FilterPill>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TemplatesPage() {
  const [search,         setSearch]         = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [triggerFilter,  setTriggerFilter]  = useState('all');
  const [activeTags,     setActiveTags]     = useState<Set<string>>(new Set());
  const [savedIds,       setSavedIds]       = useState<Set<string>>(new Set());
  const [activeTopTab,   setActiveTopTab]   = useState('all');

  const toggleTag = (tag: string) =>
    setActiveTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });

  const toggleSave = (id: string) =>
    setSavedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CATEGORIES
      .map(c => ({
        ...c,
        workflows: c.workflows.filter(w => {
          if (activeTopTab === 'saved' && !savedIds.has(w.id)) return false;
          if (q && !w.name.toLowerCase().includes(q)) return false;
          if (categoryFilter !== 'all' && c.id !== categoryFilter) return false;
          if (triggerFilter !== 'all' && w.triggerCategory !== triggerFilter) return false;
          if (activeTags.size > 0 && ![...activeTags].every(t => w.tags.some(wt => wt.label === t))) return false;
          return true;
        }),
      }))
      .filter(c => c.workflows.length > 0);
  }, [activeTopTab, search, categoryFilter, triggerFilter, activeTags, savedIds]);

  return (
    <div className={styles.page}>

      {/* ── Top nav: All Templates / Saved Templates ── */}
      <div className={styles.topNav}>
        <Tabs value={activeTopTab} onChange={setActiveTopTab} variant="background">
          <Tabs.Tab value="all">All Templates</Tabs.Tab>
          <Tabs.Tab value="saved">Saved Templates</Tabs.Tab>
        </Tabs>
      </div>

      {/* ── Hero banner with search + quick-filter pills ── */}
      <HeroBanner
        search={search}
        onSearch={setSearch}
        onClear={() => setSearch('')}
        activeTags={activeTags}
        onToggleTag={toggleTag}
      />

      <Divider />

      {/* ── Filter selects only ── */}
      <div className={styles.filterRows}>
        <div className={styles.filterSelects}>
          <SelectField
            options={CATEGORY_OPTIONS}
            value={categoryFilter}
            onChange={setCategoryFilter}
            size="sm"
            className={styles.filterSelect}
            leadingIcon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>}
          />
          <SelectField
            options={TRIGGER_OPTIONS}
            value={triggerFilter}
            onChange={setTriggerFilter}
            size="sm"
            className={styles.filterSelect}
            leadingIcon={<Target04Icon size={13} />}
          />
        </div>
      </div>

      {/* ── Sections ── */}
      {visible.length === 0 ? (
        <p className={styles.emptyState}>No templates match your filters.</p>
      ) : (
        visible.map(cat => (
          <CategorySection
            key={cat.id}
            category={cat}
            savedIds={savedIds}
            onSave={toggleSave}
          />
        ))
      )}
    </div>
  );
}
