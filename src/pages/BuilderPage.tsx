import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { Button } from '@alloy/components/Button';
import { Tag } from '@alloy/components/Tag';
import { StatusTag } from '@alloy/components/StatusTag';
import type { StatusTagStatus } from '@alloy/components/StatusTag';
import type { TagColor } from '@alloy/components/Tag';
import { DropdownMenu } from '@alloy/components/DropdownMenu';
import type { DropdownMenuGroup } from '@alloy/components/DropdownMenu';
import { SearchField, TextField, TextArea, NumberField, SelectField } from '@alloy/components/Input';
import inputStyles from '@alloy/components/Input/Input.module.css';
import dropdownStyles from '@alloy/components/DropdownMenu/DropdownMenu.module.css';
import { Tooltip } from '@alloy/components/Tooltip';
import tooltipStyles from '@alloy/components/Tooltip/Tooltip.module.css';
import { Tabs } from '@alloy/components/Tabs';
import { FilterPill, FilterPillGroup } from '@alloy/components/FilterPill';
import { Target04Icon } from '@alloy/components/icons/Target04Icon';
import { GitBranch01Icon } from '@alloy/components/icons/GitBranch01Icon';
import { ArrowCircleBrokenRightIcon } from '@alloy/components/icons/ArrowCircleBrokenRightIcon';
import { ChevronDownIcon } from '@alloy/components/icons/ChevronDownIcon';
import { Grid01Icon } from '@alloy/components/icons/Grid01Icon';
import { XIcon } from '@alloy/components/icons/XIcon';
import { CheckCircleIcon } from '@alloy/components/icons/CheckCircleIcon';
import { Users03Icon } from '@alloy/components/icons/Users03Icon';
import { File04Icon } from '@alloy/components/icons/File04Icon';
import { Home02Icon } from '@alloy/components/icons/Home02Icon';
import { ClockIcon } from '@alloy/components/icons/ClockIcon';
import { ClipboardCheckIcon } from '@alloy/components/icons/ClipboardCheckIcon';
import { Edit03Icon } from '@alloy/components/icons/Edit03Icon';
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
import { AILoader } from '@alloy/components/ai/AILoader';
import { ToggleButton } from '@alloy/components/ToggleButton';
import { Trash03Icon } from '@alloy/components/icons/Trash03Icon';
import { RefreshCw04Icon } from '@alloy/components/icons/RefreshCw04Icon';
import { Eyebrow } from '@alloy/components/Eyebrow';
import { VolumeMaxIcon } from '@alloy/components/icons/VolumeMaxIcon';
import { SearchSmIcon } from '@alloy/components/icons/SearchSmIcon';
import { PlayIcon } from '@alloy/components/icons/PlayIcon';
import { FilterLinesIcon } from '@alloy/components/icons/FilterLinesIcon';
import { CircularArrowIcon } from '@alloy/components/icons/CircularArrowIcon';
import { TriangleUpIcon } from '@alloy/components/icons/TriangleUpIcon';
import { AreaButton } from '@alloy/components/AreaButton';
import styles from './BuilderPage.module.css';
import { callFlowAgent } from '@/features/ai/client';
import { GLOBAL_TOOLS, STEP_TOOLS } from '@/features/ai/tools';
import { buildGlobalSystemPrompt, buildStepSystemPrompt } from '@/features/ai/systemPrompts';
import { PolicyMatchingModal } from '@/components/PolicyMatchingModal';

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
type AutomationStatus = 'draft' | 'active' | 'inactive' | 'archived';

interface GraphNode {
  id: string;
  type: StepType;
  label: string;
  placeholder: string;
  configured: boolean;
  selectedValue?: string;
  conditionOperator?: string;
  conditionValues?: string[];
  configValues?: Record<string, string>;
  /** Links sibling condition nodes that share the same condition config. */
  branchGroupId?: string;
  /** Output branching mode for standalone condition nodes. Undefined = no branches configured. */
  branchMode?: 'yes-no' | 'multi-value';
  /** Branch entries for multi-value mode — each has its own operator and value (= output handle label). */
  conditionBranches?: Array<{ operator: string; value: string }>;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  branch?: string;
}

// Alias kept so FlowNode component compiles without changes
type FlowStep = GraphNode;

/** A standalone condition group created via "Add group" button, tracking its empty slots. */
interface ConditionGroupEntry {
  id: string;
  operator: 'AND' | 'OR';
}

const MAX_GROUP_CONDITIONS = 5;

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
  trigger:   { icon: <Target04Icon size={12} />,                label: 'Trigger',   bgClass: styles.iconTrigger   },
  condition: { icon: <GitBranch01Icon size={12} />,             label: 'Condition', bgClass: styles.iconCondition },
  action:    { icon: <ArrowCircleBrokenRightIcon size={12} />,  label: 'Action',    bgClass: styles.iconAction    },
  ai:        { icon: <TeambridgeAIIcon size={12} />,             label: 'AI',        bgClass: styles.iconAi        },
  delay:     { icon: <ClockIcon size={12} />,                   label: 'Delay',     bgClass: styles.iconDelay     },
  policy:    { icon: <ClipboardCheckIcon size={12} />,          label: 'Policy',    bgClass: styles.iconPolicy    },
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
  trigger:   'orange',
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
  { id: 'shift_policy_roles',                        label: 'Roles',                        operators: [..._OPS.multiselect] },
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
  { id: 'shift_shift_groups_roles',                  label: 'Shift Group / Roles',          operators: [..._OPS.multiselect] },
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
  { id: 'shift_user_link_roles',                     label: 'User Link / Roles',            operators: [..._OPS.multiselect] },
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
];

const OPERATOR_LABELS: Record<string, string> = {
  equals:                'is',
  not_equals:            'is not',
  in:                    'is one of',
  not_in:                'is not one of',
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
  { id: 'shift_policy_roles',                        type: 'condition', label: 'Roles',                        category: 'policy'           },
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
  type: 'select' | 'text' | 'time' | 'textarea' | 'boolean' | 'multi_add';
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
  Users:                  ['Anything', 'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Status'],
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
  data_something_created:  [{ key: 'entity',      label: 'Entity',      type: 'select', required: true, options: _ENTITY_OPTIONS }],
  data_something_updated:  [{ key: 'entity',      label: 'Entity',      type: 'select', required: true, options: _ENTITY_OPTIONS }],
  data_something_deleted:  [{ key: 'entity',      label: 'Entity',      type: 'select', required: true, options: _ENTITY_OPTIONS }],
  comment_added:           [{ key: 'collection',  label: 'Collection',  type: 'select', required: true, options: _ENTITY_OPTIONS }],
  button_clicked: [
    { key: 'collection', label: 'Collection', type: 'select', required: true, options: _ENTITY_OPTIONS },
    { key: 'field',      label: 'Field',      type: 'select', required: true,
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
    { key: 'task', label: 'Task', type: 'select', required: true,
      options: ['Google Link', 'Google Task', 'Driver License'] },
  ],
  update_data_assign_task_group: [
    { key: 'task_group', label: 'Task Group', type: 'select', required: true,
      options: ['Google Link', 'Google Task', 'Driver License'] },
  ],
  update_data_modify: [
    { key: 'column',   label: 'Column',   type: 'select', required: true,
      options: ['Status', 'Assignee', 'Location', 'Pay Rate', 'Start Time', 'End Time', 'Notes', 'Job Role', 'Regular Bill Rate'] },
    { key: 'modifier', label: 'Modifier', type: 'select', required: true,
      options: ['Set', 'Clear', 'Append', 'Add', 'Subtract'] },
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
    { key: 'send_to_value', label: 'Recipients', type: 'text',    required: false },
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
  data_something_created:     (v) => v.entity ? [
    { text: v.entity,       role: 'val'   },
    { text: ' is created',  role: 'label' },
  ] : null,
  data_something_updated:     (v) => v.entity ? [
    { text: v.entity,       role: 'val'   },
    { text: ' is updated',  role: 'label' },
  ] : null,
  data_something_deleted:     (v) => v.entity ? [
    { text: v.entity,       role: 'val'   },
    { text: ' is deleted',  role: 'label' },
  ] : null,
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

  update_data_assign_task: (v) => v.task ? [
    { text: 'Assign ',  role: 'label' },
    { text: v.task,     role: 'val'   },
  ] : null,
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
    return segs;
  },

  notifications_export_document: (v) => v.target_object_record ? [
    { text: 'Export ',                 role: 'label' },
    { text: v.target_object_record,    role: 'val'   },
  ] : null,
  notifications_send_email: (v) => {
    const segs: SnippetSeg[] = [{ text: 'Email', role: 'label' }];
    if (v.send_to_type) { segs.push({ text: ' to ', role: 'op' }); segs.push({ text: v.send_to_type, role: 'val' }); }
    if (v.subject)      { segs.push({ text: ': ',   role: 'op' }); segs.push({ text: v.subject,      role: 'val' }); }
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
  if (step.type === 'condition' && step.conditionOperator) {
    const opLabel = OPERATOR_LABELS[step.conditionOperator] ?? step.conditionOperator;
    const vals    = step.conditionValues ?? [];
    const segs: SnippetSeg[] = [
      { text: step.selectedValue,  role: 'label' },
      { text: ` ${opLabel}`,       role: 'op'    },
    ];
    if (vals.length > 0) segs.push({ text: ` ${vals.join(', ')}`, role: 'val' });
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
  // Can't place a condition after an action or ai step
  if ((parent.type === 'action' || parent.type === 'ai') && type === 'condition') return false;
  // Delay-to-delay is disallowed
  if (parent.type === 'delay' && type === 'delay') return false;
  // Policy-to-policy is disallowed
  if (parent.type === 'policy' && type === 'policy') return false;
  const outCount = edges.filter(e => e.from === parentId).length;
  // All node types support exactly one outgoing edge
  if (outCount >= 1) return false;
  return true;
}

// ─── Layout constants ──────────────────────────────────────────────────────────

const NODE_W        = 200;
const NODE_H        = 130;   // approximate rendered card height (actual ~132px)
const H_SPACING     = 300;   // centre-to-centre column pitch
const V_SPACING     = 210;   // centre-to-centre row pitch (~80px gap between cards)
const CANVAS_TOP    = 48;    // initial top padding
const LEFT_PANEL_W  = 360;   // left panel width — pan offset so content starts in visible area
// Group container padding constants — shared between rendering and drag/anchor logic
const GROUP_PAD_X   = 12;
const GROUP_PAD_TOP = 12;
const GROUP_PAD_BOT = 12;
const GROUP_SLOT_H        = NODE_H;   // height of an empty slot placeholder (matches condition node height)
// Wider pitch for group members — badge needs 39px + 16px clearance each side = 71px min gap
const GROUP_SIBLING_PITCH = NODE_W + 72;
// With graphContent at `left: 50%` of viewport the natural center is at ~50% of viewport.
// We offset pan.x by this value so nodes centre in the area to the right of the panel.
const INIT_PAN_X    = 300;   // empirically: root at centreX=140 → viewport x=505 (visible midpoint)

// ─── Layout engine ────────────────────────────────────────────────────────────

/** Compute absolute { x, y } pixel positions for every node in the graph.
 *  Handles: multiple independent roots, branching, and simple merge nodes. */
function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  /**
   * Optional override for a node's column slot width. When provided for an id,
   * `getW` uses this value as the node's own-width instead of the default
   * H_SPACING. Used by tidy-up to reserve horizontal space for a condition
   * group's full width when only its primary member is in the reduced graph.
   */
  nodeSlotWidthOverrides?: Map<string, number>,
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  const nodeSlotW = (id: string): number =>
    nodeSlotWidthOverrides?.get(id) ?? H_SPACING;

  // Build adjacency lists
  const out = new Map<string, string[]>();
  const inc = new Map<string, string[]>();
  nodes.forEach(n => { out.set(n.id, []); inc.set(n.id, []); });
  edges.forEach(e => {
    out.get(e.from)?.push(e.to);
    inc.get(e.to)?.push(e.from);
  });

  const roots = nodes.filter(n => (inc.get(n.id)?.length ?? 0) === 0);

  // For condition nodes with yes-no or multi-value outputs, reorder children
  // in the adjacency list to match the left-to-right order of their output
  // handles. Otherwise DFS places children in edge-insertion order, which
  // makes the "yes" branch land on the right and connectors cross over the
  // "no" branch (and vice versa for arbitrary multi-value label orders).
  const branchRank = (
    parent: GraphNode,
    edge: GraphEdge | undefined,
  ): number => {
    const b = edge?.branch;
    if (!b) return Number.MAX_SAFE_INTEGER; // non-branched edges sink to the end
    const bLower = b.toLowerCase();
    if (parent.branchMode === 'yes-no') {
      return bLower === 'yes' ? 0 : bLower === 'no' ? 1 : 2;
    }
    if (parent.branchMode === 'multi-value') {
      const cases = (parent.conditionBranches ?? []).map(c => c.value);
      const i = cases.indexOf(b);
      if (i !== -1) return i;
      const iLower = cases.findIndex(v => v.toLowerCase() === bLower);
      return iLower !== -1 ? iLower : cases.length;
    }
    return Number.MAX_SAFE_INTEGER;
  };
  nodes.forEach(n => {
    if (n.type !== 'condition' || !n.branchMode) return;
    const children = out.get(n.id);
    if (!children || children.length < 2) return;
    const sorted = [...children].sort((a, b) => {
      const ea = edges.find(e => e.from === n.id && e.to === a);
      const eb = edges.find(e => e.from === n.id && e.to === b);
      return branchRank(n, ea) - branchRank(n, eb);
    });
    out.set(n.id, sorted);
  });

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

  // Subtree width (used to centre parents above their children)
  const subtreeW = new Map<string, number>();
  const getW = (id: string, seen = new Set<string>()): number => {
    if (subtreeW.has(id)) return subtreeW.get(id)!;
    if (seen.has(id)) return nodeSlotW(id); // cycle guard
    seen.add(id);
    const children = out.get(id) ?? [];
    const total = children.length === 0
      ? nodeSlotW(id)
      : children.reduce((s, c) => s + getW(c, new Set(seen)), 0);
    const w = Math.max(nodeSlotW(id), total);
    subtreeW.set(id, w);
    return w;
  };
  roots.forEach(r => getW(r.id));

  // Place nodes using DFS — merge nodes keep their first-assigned position
  const positions = new Map<string, { x: number; y: number }>();
  const placed    = new Set<string>();

  const place = (id: string, centreX: number) => {
    if (placed.has(id)) return;
    placed.add(id);
    const d = depth.get(id) ?? 0;
    positions.set(id, { x: centreX - NODE_W / 2, y: CANVAS_TOP + d * V_SPACING });
    const children = out.get(id) ?? [];
    const totalW = children.reduce((s, c) => s + (subtreeW.get(c) ?? H_SPACING), 0);
    let childX = centreX - totalW / 2;
    for (const c of children) {
      const w = subtreeW.get(c) ?? H_SPACING;
      place(c, childX + w / 2);
      childX += w;
    }
  };

  // SIBLING_PITCH defined early so both the roots loop and the post-process block can use it
  const SIBLING_PITCH = NODE_W + 8;

  // Partition roots: standalone branch-group nodes (no parent, same branchGroupId) are
  // placed together at SIBLING_PITCH; all other roots use the normal H_SPACING path.
  const standaloneGroupRoots = new Map<string, GraphNode[]>();
  const ungroupedRoots: GraphNode[] = [];
  roots.forEach(root => {
    if (root.branchGroupId) {
      const g = standaloneGroupRoots.get(root.branchGroupId) ?? [];
      g.push(root);
      standaloneGroupRoots.set(root.branchGroupId, g);
    } else {
      ungroupedRoots.push(root);
    }
  });

  let rootCentreX = 0;

  // Place normal (non-grouped) roots
  for (const root of ungroupedRoots) {
    const w = subtreeW.get(root.id) ?? H_SPACING;
    place(root.id, rootCentreX + w / 2);
    rootCentreX += w + H_SPACING;
  }

  // Place standalone branch-group root clusters with group spacing (wider for badge clearance)
  standaloneGroupRoots.forEach(groupRoots => {
    const totalSpan = (groupRoots.length - 1) * GROUP_SIBLING_PITCH;
    const clusterCentreX = rootCentreX + totalSpan / 2 + NODE_W / 2;
    const startX = clusterCentreX - totalSpan / 2 - NODE_W / 2;
    groupRoots.forEach((root, i) => {
      positions.set(root.id, { x: startX + i * GROUP_SIBLING_PITCH, y: CANVAS_TOP });
      placed.add(root.id);
    });
    rootCentreX += totalSpan + NODE_W + H_SPACING;
  });

  // ── Post-process: fix sibling branch groups ──────────────────────────────────
  // Process ALL children of a branch parent together (not per branch group) so
  // that multiple branch groups from the same parent don't overlap each other.

  const branchGroups = new Map<string, GraphNode[]>();
  nodes.forEach(n => {
    if (n.branchGroupId) {
      const g = branchGroups.get(n.branchGroupId) ?? [];
      g.push(n);
      branchGroups.set(n.branchGroupId, g);
    }
  });

  // Build set of all branch-sibling IDs so recentre skips them
  const isBranchSibling = new Set<string>();
  branchGroups.forEach(siblings => {
    if (siblings.length >= 2) siblings.forEach(s => isBranchSibling.add(s.id));
  });

  // Recursively re-centre a subtree rooted at `id` around `centreX`,
  // preserving each node's existing Y (depth row). Skips branch siblings —
  // those are handled by the outer parentsToProcess loop.
  const recentre = (id: string, centreX: number, seen = new Set<string>()) => {
    if (seen.has(id)) return;
    seen.add(id);
    const pos = positions.get(id);
    if (!pos) return;
    positions.set(id, { x: centreX - NODE_W / 2, y: pos.y });
    const children = (out.get(id) ?? []).filter(c => !isBranchSibling.has(c));
    if (children.length === 0) return;
    const totalW = children.reduce((s, c) => s + (subtreeW.get(c) ?? H_SPACING), 0);
    let childX = centreX - totalW / 2;
    for (const c of children) {
      const w = subtreeW.get(c) ?? H_SPACING;
      recentre(c, childX + w / 2, seen);
      childX += w;
    }
  };

  // Find every parent whose child list contains at least one branch sibling,
  // sorted by depth so ancestors are processed before descendants.
  const parentsToProcess = nodes
    .filter(n => (out.get(n.id) ?? []).some(c => isBranchSibling.has(c)))
    .sort((a, b) => (depth.get(a.id) ?? 0) - (depth.get(b.id) ?? 0));

  parentsToProcess.forEach(parent => {
    const parentPos = positions.get(parent.id);
    if (!parentPos) return;
    const parentCentreX = parentPos.x + NODE_W / 2;

    const allChildren = out.get(parent.id) ?? [];
    if (allChildren.length < 2) return;

    // Sort by current DFS X to preserve left-to-right visual order
    const sorted = [...allChildren].sort(
      (a, b) => (positions.get(a)?.x ?? 0) - (positions.get(b)?.x ?? 0),
    );

    const yPos = positions.get(sorted[0])?.y ?? (CANVAS_TOP + V_SPACING);
    // Use group pitch for branch siblings (wider gap for AND/OR badge clearance)
    const pitch = GROUP_SIBLING_PITCH;
    const totalWidth = (sorted.length - 1) * pitch;
    const startX = parentCentreX - totalWidth / 2 - NODE_W / 2;

    sorted.forEach((childId, i) => {
      const childCentreX = startX + i * pitch + NODE_W / 2;
      positions.set(childId, { x: startX + i * pitch, y: yPos });
      // Re-centre this child's own (non-branch) subtree under its new position
      const grandchildren = (out.get(childId) ?? []).filter(c => !isBranchSibling.has(c));
      for (const gc of grandchildren) {
        recentre(gc, childCentreX, new Set([childId]));
      }
    });
  });

  return positions;
}

// ─── Popover data ──────────────────────────────────────────────────────────────

const POPOVER_TITLES: Record<StepType, string> = {
  trigger:   'Choose a trigger',
  condition: 'Add a condition',
  action:    'Choose an action',
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
      <input
        className={styles.conditionTagInputField}
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

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      const panel = document.getElementById('node-name-panel');
      if (panel?.contains(e.target as Node)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
}: {
  value: string;
  options: PopoverSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
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

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const selectedLabel = options.find(o => o.value === value)?.label ?? '';

  return (
    <div className={clsx(styles.psRoot, className)}>
      <button
        ref={triggerRef}
        type="button"
        className={clsx(inputStyles.shell, inputStyles.md, inputStyles.outlined, styles.psTrigger)}
        data-open={open || undefined}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.psValue}>
          {selectedLabel || <span className={styles.psPlaceholder}>{placeholder}</span>}
        </span>
        <span className={clsx(inputStyles.trailingSlot, 'alloy-icon-slot', styles.psChevron)}>
          <ChevronDownIcon size={14} />
        </span>
      </button>

      {open && panelPos && createPortal(
        <div
          ref={panelRef}
          className={clsx(dropdownStyles.panel, styles.psPanel)}
          data-open
          data-placement="bottom-start"
          style={{ position: 'fixed', top: panelPos.top, left: panelPos.left, width: panelPos.width, zIndex: 2000 }}
          role="listbox"
          onMouseDown={e => e.stopPropagation()}
        >
          <div className={dropdownStyles.panelInner}>
            {options.map(opt => (
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
            ))}
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
const AI_SPEC_CHANNELS     = ['SMS', 'Text', 'Voice'] as const;
const AI_ADD_CARD_OPTIONS  = ['Data', 'Analyze files', 'Claim shifts', 'Policy matches', 'Engage'] as const;
type AiAddCardOption = typeof AI_ADD_CARD_OPTIONS[number];
const AI_ENGAGE_TARGETS    = [
  { value: 'Policy Matches (Users for Shift)', label: 'Policy Matches (Users for Shift)' },
  { value: 'All Users',                        label: 'All Users' },
  { value: 'Specific Group',                   label: 'Specific Group' },
];

/** Action + Specialist Persona rows — rendered above the Configuration divider */
function AiSpecialistMeta({
  step,
  onUpdateConfigField,
}: {
  step: FlowStep;
  onUpdateConfigField: (key: string, value: string) => void;
}) {
  void onUpdateConfigField; // persona change not wired yet
  return (
    <div className={styles.aiSpecRows}>
      {/* Specialist Persona row */}
      <div className={styles.aiSpecRow}>
        <Eyebrow>Specialist Persona</Eyebrow>
        <div className={styles.aiSpecPersonaCard}>
          <div className={styles.aiSpecPersonaAvatar}>
            {/* Diamond shape */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 2L13 8L8 14L3 8L8 2Z" fill="white" fillOpacity="0.92" />
            </svg>
          </div>
          <div className={styles.aiSpecPersonaInfo}>
            <div className={styles.aiSpecPersonaName}>
              Corvus
              <div className={styles.aiSpecVoicePill}>
                <div className={styles.aiSpecVoicePillIcon}><VolumeMaxIcon size={12} /></div>
                <span className={styles.aiSpecVoicePillLabel}>Ana</span>
              </div>
            </div>
            <div className={styles.aiSpecPersonaRole}>Scheduler</div>
          </div>
          <Button variant="ghost" size="xs" onClick={() => {}}>
            Change
          </Button>
        </div>
      </div>
    </div>
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
  const fieldCount = AI_SPEC_READ_FIELDS.length + AI_SPEC_WRITE_FIELDS.length;

  const [activeCards, setActiveCards] = useState<AiAddCardOption[]>(['Engage']);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

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
      <div className={styles.aiSpecDataCard}>
        <div className={styles.aiSpecDataCardHeader}>
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
          <div className={styles.aiSpecDataCardActions}>
            <Button variant="ghost" size="xs" iconOnly aria-label="Options">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                <circle cx="3.5" cy="7" r="1.1" />
                <circle cx="7"   cy="7" r="1.1" />
                <circle cx="10.5" cy="7" r="1.1" />
              </svg>
            </Button>
          </div>
        </div>
        <div className={styles.aiSpecDataCardBody}>
          <div className={styles.aiSpecDataFieldRow}>
            <span className={styles.aiSpecDataFieldLabel}>User</span>
            <div className={styles.aiSpecDataFieldContent}>
              <div className={styles.aiSpecFieldPillRow}>
                <Tag variant="subtle" size="sm" color="green">Read ({AI_SPEC_READ_FIELDS.length})</Tag>
                {AI_SPEC_READ_FIELDS.map(f => (
                  <Tag key={f} size="sm" variant="outline" color="neutral">{f}</Tag>
                ))}
              </div>
              <div className={styles.aiSpecFieldPillRow}>
                <Tag variant="subtle" size="sm" color="purple">Write ({AI_SPEC_WRITE_FIELDS.length})</Tag>
                {AI_SPEC_WRITE_FIELDS.map(f => (
                  <Tag key={f} size="sm" variant="outline" color="neutral">{f}</Tag>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Optional active cards ── */}
      {activeCards.map(cardType => {
        if (cardType === 'Engage') return (
          <div key="Engage" className={styles.aiSpecDataCard}>
            <div className={styles.aiSpecDataCardHeader}>
              <div className={styles.aiSpecDataCardHeaderIcon}>
                {AI_CARD_ICON['Engage']}
              </div>
              <div className={styles.aiSpecDataCardHeaderText}>
                <div className={styles.aiSpecDataCardTitle}>Engage</div>
                <div className={styles.aiSpecDataCardSubtitle}>Communication</div>
              </div>
              <div className={styles.aiSpecDataCardActions}>
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
            <div className={styles.aiSpecDataCardBody}>
              <div className={styles.aiSpecDataFieldRow}>
                <span className={styles.aiSpecDataFieldLabel}>Message</span>
                <div className={styles.aiSpecChannelRow}>
                  {AI_SPEC_CHANNELS.map(ch => (
                    <ToggleButton
                      key={ch}
                      size="sm"
                      selected={channels.includes(ch)}
                      selectionStyle="border"
                      defaultVariant="secondary"
                      onSelectedChange={() => toggleChannel(ch)}
                    >
                      {ch}
                    </ToggleButton>
                  ))}
                </div>
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
          </div>
        );

        // Empty placeholder card for other types
        return (
          <div key={cardType} className={styles.aiSpecDataCard}>
            <div className={styles.aiSpecDataCardHeader}>
              <div className={styles.aiSpecDataCardHeaderIcon}>
                {AI_CARD_ICON[cardType]}
              </div>
              <div className={styles.aiSpecDataCardHeaderText}>
                <div className={styles.aiSpecDataCardTitle}>{cardType}</div>
                <div className={styles.aiSpecDataCardSubtitle}>Not configured</div>
              </div>
              <div className={styles.aiSpecDataCardActions}>
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
  triggerLabel: string | undefined;
}

function AiSpecialistTest({ specialistName, specialistRole, triggerLabel }: AiSpecialistTestProps) {
  const record = getTriggerRecordType(triggerLabel);

  const [selectedRecord, setSelectedRecord] = useState<string>('');
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

  const specialistHeaderCard = (
    <div className={styles.aiTestSpecHeaderCard}>
      <div className={styles.aiTestSpecHeaderAvatar} aria-hidden>
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
          <path d="M8 2L13 8L8 14L3 8L8 2Z" fill="white" fillOpacity="0.95" />
        </svg>
      </div>
      <div className={styles.aiTestSpecHeaderText}>
        <div className={styles.aiTestSpecHeaderName}>{specialistName}</div>
        <div className={styles.aiTestSpecHeaderRole}>{specialistRole}</div>
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
            size="md"
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
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2L13 8L8 14L3 8L8 2Z" fill="white" fillOpacity="0.95" />
                      </svg>
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
}

function ActionSelector({ onSelect }: ActionSelectorProps) {
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
    const icon = ACTION_ITEM_ICON[item.id]
      ?? ACTION_CATEGORY_ICON[item.category]
      ?? STEP_CONFIG.action.icon;
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
    <div className={styles.actionSelectorRoot}>
      <div className={styles.actionSelectorSearch}>
        <SearchField
          size="sm"
          placeholder="Search actions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          aria-label="Search actions"
        />
      </div>

      <div className={styles.actionSelectorList}>
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

// ─── NodePopover ─────────────────────────────────────────────────────────────────

interface NodePopoverProps {
  step: FlowStep;
  /** All nodes in the same branch group (including this node), sorted left→right. */
  groupSiblings?: FlowStep[];
  onSelectSuggestion: (value: string) => void;
  onUpdateConditionConfig: (op: string, vals: string[]) => void;
  /** Update a specific branch node's values (does not sync across group). */
  onUpdateBranchValues?: (nodeId: string, vals: string[]) => void;
  /** Update a single branch node's operator+values independently (no group sync). */
  onUpdateBranchConfig?: (nodeId: string, op: string, vals: string[]) => void;
  onUpdateConfigField: (key: string, value: string) => void;
  onClose: () => void;
  /** Fired when the user clicks the footer "Save" button — commits the
   *  current step configuration as a single activity entry in the thread. */
  onSave?: () => void;
  onDeleteBranch?: (nodeId: string) => void;
  /** Update the output branch mode for a standalone condition node */
  onUpdateBranchMode?: (mode: 'yes-no' | 'multi-value' | '') => void;
  /** Add a new empty branch entry to a multi-value condition node */
  onAddBranchValue?: () => void;
  /** Remove a branch entry at the given index from a multi-value condition node */
  onRemoveBranchValue?: (index: number) => void;
  /** Update operator and value for a branch entry at the given index */
  onUpdateConditionBranch?: (index: number, operator: string, value: string) => void;
  /** Whether this node currently has any outgoing edges */
  hasOutgoingConnections?: boolean;
  /** The selected label of the workflow's trigger step, used by the AI Specialist Test tab. */
  triggerLabel?: string;
}

function NodePopover({ step, groupSiblings, onSelectSuggestion, onUpdateConditionConfig, onUpdateBranchValues, onUpdateBranchConfig, onUpdateConfigField, onClose, onSave, onDeleteBranch, onUpdateBranchMode, onAddBranchValue, onRemoveBranchValue, onUpdateConditionBranch, hasOutgoingConnections, triggerLabel }: NodePopoverProps) {
  const cfg = STEP_CONFIG[step.type];
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // Branch config state (standalone condition nodes only)
  const [branchModeConfirmPending, setBranchModeConfirmPending] = useState<'yes-no' | 'multi-value' | '' | null>(null);

  // Policy modal state (policy nodes only)
  const [policyModalOpen, setPolicyModalOpen] = useState(false);

  // AI Specialist tab state (Configure / Test) — only relevant for AI Specialist nodes.
  const [aiSpecTab, setAiSpecTab] = useState<'configure' | 'test'>('configure');
  const isAiSpecialist = step.type === 'ai' && step.selectedValue === 'AI Specialist';
  // A specialist is "configured" when the AI Specialist library item is selected.
  const specialistConfigured = isAiSpecialist;
  // Specialist identity — currently a hardcoded default, overridable via configValues when wired.
  const specialistName = step.configValues?.ai_specialist_name ?? 'Corvus';
  const specialistRole = step.configValues?.ai_specialist_role ?? 'Scheduler';

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
      const condDef = step.type === 'condition' && step.selectedValue
        ? CONDITION_LIBRARY.find(c => c.label === step.selectedValue) ?? null
        : null;
      const systemPrompt = buildStepSystemPrompt({
        step: {
          id: step.id, type: step.type, selectedValue: step.selectedValue,
          conditionOperator: step.conditionOperator, conditionValues: step.conditionValues,
          configValues: step.configValues, configured: step.configured,
        },
        libraryItemsForType: libItems.map(i => ({ id: i.id, label: i.label, type: i.type, category: i.category })),
        configFields,
        conditionOperators: condDef?.operators,
        conditionValueOptions: condDef?.valueOptions,
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

  // Condition config — only relevant when a condition node has a selectedValue
  const condDef = step.type === 'condition' && step.selectedValue
    ? CONDITION_LIBRARY.find(c => c.label === step.selectedValue) ?? null
    : null;
  const condOp   = condDef ? (step.conditionOperator ?? condDef.operators[0]) : '';
  const condVals = step.conditionValues ?? [];
  const isNoValueOp  = ['is_empty', 'is_not_empty', 'missing_required'].includes(condOp);
  const isInOp       = condOp === 'in';
  const isWithinNext = condOp === 'within_next';

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
      {/* ── 1. Header — type badge + label + close ── */}
      <div className={styles.popoverHeader}>
        <div className={styles.popoverHeaderLeft}>
          <span className={clsx(styles.popoverTypeBadge, cfg.bgClass)} aria-hidden>
            {getStepIcon(step)}
          </span>
          <span className={styles.popoverTitle}>{POPOVER_TITLES[step.type]}</span>
        </div>
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

      {/* ── scrollable body ── */}
      <div className={styles.popoverBody}>

      {/* ── 2. Name + Suggested ── (skipped for action — handled by ActionSelector / action header below) */}
      {step.type !== 'ai' && step.type !== 'delay' && step.type !== 'policy' && step.type !== 'action' && (
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

      {/* ══════════════════════════════════════════════════════════════════
          ACTION NODE — searchable/browsable list (empty) OR back-header (selected)
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
          <div className={styles.actionSelectedHeader}>
            <Button
              variant="ghost"
              size="xs"
              iconOnly
              onClick={() => onSelectSuggestion('')}
              aria-label="Back to actions"
            >
              <ChevronLeftIcon />
            </Button>
            <span className={clsx(styles.actionSelectedIcon, styles.iconAction)} aria-hidden>
              {icon}
            </span>
            <span className={styles.actionSelectedTitle}>{step.selectedValue}</span>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════
          POLICY NODE — Selected policies + Matching threshold
          ══════════════════════════════════════════════════════════════════ */}
      {step.type === 'policy' && (() => {
        const selection = parsePolicySelection(step.configValues);
        const threshold = parsePolicyThreshold(step.configValues);
        const anySelected =
          selection.folders.length + selection.policies.length + selection.subPolicies.length > 0;
        const summaryText = anySelected
          ? `All selected — ${formatPolicySummary(selection)}`
          : 'No policies selected';
        return (
          <>
            <div className={styles.popoverSection}>
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
                <Button variant="secondary" size="sm" onClick={() => setPolicyModalOpen(true)}>
                  Configure
                </Button>
              </div>
            </div>

            <div className={styles.popoverDivider} />
            <div className={styles.popoverSection}>
              <p className={styles.popoverSectionLabel}>MATCHING THRESHOLD</p>
              <div className={styles.policyThresholdRow}>
                <label className={styles.policyThresholdLabel} htmlFor={`policy-threshold-${step.id}`}>
                  Run when above threshold
                </label>
                <div className={styles.policyThresholdInputWrap}>
                  <NumberField
                    id={`policy-threshold-${step.id}`}
                    size="md"
                    min={0}
                    placeholder="0"
                    value={String(threshold.value)}
                    onChange={e => {
                      const cleaned = e.target.value.replace(/[^0-9]/g, '');
                      onUpdateConfigField('thresholdValue', cleaned);
                    }}
                    aria-label="Matching threshold"
                    className={styles.policyThresholdInput}
                  />
                  <span className={styles.policyThresholdUnit} aria-hidden>
                    {threshold.mode === 'percentage' ? '%' : '/100'}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const next: PolicyThresholdMode =
                      threshold.mode === 'percentage' ? 'score' : 'percentage';
                    onUpdateConfigField('thresholdMode', next);
                  }}
                >
                  {threshold.mode === 'percentage' ? 'Use score' : 'Use %'}
                </Button>
              </div>
            </div>

            <PolicyMatchingModal
              open={policyModalOpen}
              initialSelection={selection}
              onCancel={() => setPolicyModalOpen(false)}
              onSave={next => {
                onUpdateConfigField('selectedFolders',     JSON.stringify(next.folders));
                onUpdateConfigField('selectedPolicies',    JSON.stringify(next.policies));
                onUpdateConfigField('selectedSubPolicies', JSON.stringify(next.subPolicies));
                setPolicyModalOpen(false);
              }}
            />
          </>
        );
      })()}

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
          STANDALONE CONDITION NODE — new panel structure:
          Field → Output Branches → Configuration
          ══════════════════════════════════════════════════════════════════ */}
      {step.type === 'condition' && !step.branchGroupId && (
        <>
          {/* ── OUTPUT BRANCHES — always visible ── */}
          <div className={styles.popoverDivider} />
          <div className={styles.popoverSection}>
            <p className={styles.popoverSectionLabel}>Output Branches</p>
            <select
              className={styles.branchModeSelect}
              value={step.branchMode ?? ''}
              onChange={e => {
                const next = e.target.value as 'yes-no' | 'multi-value' | '';
                if (hasOutgoingConnections) {
                  setBranchModeConfirmPending(next);
                } else {
                  onUpdateBranchMode?.(next);
                }
              }}
            >
              <option value="">No Branch</option>
              <option value="yes-no">Yes / No</option>
              <option value="multi-value">Multi-value</option>
            </select>

            {/* Inline confirmation when switching with existing connections */}
            {branchModeConfirmPending !== null && (
              <div className={styles.branchConfirmPanel}>
                <p className={styles.branchConfirmText}>
                  Switching branch type will remove existing branch connections. Continue?
                </p>
                <div className={styles.branchConfirmActions}>
                  <button
                    type="button"
                    className={styles.branchConfirmYes}
                    onClick={() => {
                      onUpdateBranchMode?.(branchModeConfirmPending!);
                      setBranchModeConfirmPending(null);
                    }}
                  >Yes, switch</button>
                  <button
                    type="button"
                    className={styles.branchConfirmNo}
                    onClick={() => setBranchModeConfirmPending(null)}
                  >Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* ── CONFIGURATION — only when a condition field is selected ── */}
          {condDef && (
            <>
              <div className={styles.popoverDivider} />
              <div className={styles.popoverSection}>
                <p className={styles.popoverSectionLabel}>Configuration</p>

                {/* ── No Branch or Yes/No: single operator + value input ── */}
                {(step.branchMode === undefined || step.branchMode === 'yes-no') && (() => {
                  const isNoVal  = ['is_empty', 'is_not_empty', 'missing_required'].includes(condOp);
                  const isIn     = condOp === 'in';
                  const isWithin = condOp === 'within_next';
                  return (
                    <div className={styles.popoverFields}>
                      <PopoverSelect
                        value={condOp}
                        onChange={op => onUpdateConditionConfig(op, [])}
                        options={condDef.operators.map(op => ({ value: op, label: OPERATOR_LABELS[op] ?? op }))}
                      />
                      {!isNoVal && isIn && condDef.valueOptions && (
                        <div className={styles.popoverTags}>
                          {condDef.valueOptions.map(opt => {
                            const selected = condVals.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                className={clsx(styles.popoverTag, selected && styles.popoverTagSelected)}
                                onClick={() => onUpdateConditionConfig(condOp, selected ? condVals.filter(v => v !== opt) : [...condVals, opt])}
                              >{opt}</button>
                            );
                          })}
                        </div>
                      )}
                      {!isNoVal && isIn && !condDef.valueOptions && (
                        <ConditionTagInput values={condVals} onChange={next => onUpdateConditionConfig(condOp, next)} />
                      )}
                      {!isNoVal && isWithin && (
                        <div className={styles.conditionWithinNext}>
                          <NumberField size="md" min={1} placeholder="30"
                            value={condVals[0] ?? ''}
                            onChange={e => onUpdateConditionConfig(condOp, [e.target.value, condVals[1] ?? 'days'])}
                            aria-label="Time amount" className={styles.conditionWithinNextNum}
                          />
                          <PopoverSelect
                            value={condVals[1] ?? 'days'}
                            onChange={unit => onUpdateConditionConfig(condOp, [condVals[0] ?? '', unit])}
                            className={styles.conditionWithinNextUnit}
                            options={[{ value: 'hours', label: 'hours' }, { value: 'days', label: 'days' }, { value: 'weeks', label: 'weeks' }]}
                          />
                        </div>
                      )}
                      {!isNoVal && !isIn && !isWithin && condDef.valueOptions && (
                        <PopoverSelect
                          value={condVals[0] ?? ''}
                          onChange={v => onUpdateConditionConfig(condOp, [v])}
                          placeholder="Select value…"
                          options={[{ value: '', label: 'Select value…' }, ...condDef.valueOptions.map(opt => ({ value: opt, label: opt }))]}
                        />
                      )}
                      {!isNoVal && !isIn && !isWithin && !condDef.valueOptions && (
                        <TextField size="md" placeholder="Enter value…"
                          value={condVals[0] ?? ''}
                          onChange={e => onUpdateConditionConfig(condOp, [e.target.value])}
                          aria-label="Condition value"
                        />
                      )}
                    </div>
                  );
                })()}

                {/* ── Multi-value: one branch group per output handle ── */}
                {step.branchMode === 'multi-value' && (
                  <div className={styles.popoverFields}>
                    {(step.conditionBranches ?? []).map((branch, idx) => {
                      const bOp    = branch.operator || condDef.operators[0];
                      const bVal   = branch.value;
                      const bNoVal = ['is_empty', 'is_not_empty', 'missing_required'].includes(bOp);
                      return (
                        <div key={idx} className={styles.branchRow}>
                          <div className={styles.branchRowHead}>
                            <span className={styles.branchRowLabel}>Branch {idx + 1}</span>
                            <button
                              type="button"
                              className={styles.branchRowDeleteBtn}
                              onClick={() => onRemoveBranchValue?.(idx)}
                              aria-label={`Remove branch ${idx + 1}`}
                            >×</button>
                          </div>
                          <PopoverSelect
                            value={bOp}
                            onChange={op => onUpdateConditionBranch?.(idx, op, bVal)}
                            options={condDef.operators.map(op => ({ value: op, label: OPERATOR_LABELS[op] ?? op }))}
                          />
                          {!bNoVal && condDef.valueOptions && (
                            <PopoverSelect
                              value={bVal}
                              onChange={v => onUpdateConditionBranch?.(idx, bOp, v)}
                              placeholder="Select value…"
                              options={[{ value: '', label: 'Select value…' }, ...condDef.valueOptions.map(opt => ({ value: opt, label: opt }))]}
                            />
                          )}
                          {!bNoVal && !condDef.valueOptions && (
                            <TextField
                              size="md"
                              placeholder="Enter value…"
                              value={bVal}
                              onChange={e => onUpdateConditionBranch?.(idx, bOp, e.target.value)}
                              aria-label={`Branch ${idx + 1} value`}
                            />
                          )}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      className={styles.addBranchBtn}
                      onClick={() => onAddBranchValue?.()}
                    >
                      <PlusIcon size={10} />
                      Branch
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          GROUPED CONDITION NODE — inside a formal Condition Group.
          Shows ONLY field/operator/value. No branch selector, no Yes/No,
          no multi-value UI. Branch state never appears for grouped nodes.
          ══════════════════════════════════════════════════════════════════ */}
      {step.type === 'condition' && step.branchGroupId && !isEmpty && condDef && (
        <>
          <div className={styles.popoverDivider} />
          <div className={styles.popoverSection}>
            <p className={styles.popoverSectionLabel}>Configuration</p>
            <div className={styles.popoverFields}>
              <PopoverSelect
                value={condOp}
                onChange={op => onUpdateConditionConfig(op, [])}
                options={condDef.operators.map(op => ({ value: op, label: OPERATOR_LABELS[op] ?? op }))}
              />
              {!isNoValueOp && isInOp && condDef.valueOptions && (
                <div className={styles.popoverTags}>
                  {condDef.valueOptions.map(opt => {
                    const selected = condVals.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={clsx(styles.popoverTag, selected && styles.popoverTagSelected)}
                        onClick={() => onUpdateConditionConfig(condOp, selected ? condVals.filter(v => v !== opt) : [...condVals, opt])}
                      >{opt}</button>
                    );
                  })}
                </div>
              )}
              {!isNoValueOp && isInOp && !condDef.valueOptions && (
                <ConditionTagInput values={condVals} onChange={next => onUpdateConditionConfig(condOp, next)} />
              )}
              {!isNoValueOp && isWithinNext && (
                <div className={styles.conditionWithinNext}>
                  <NumberField size="md" min={1} placeholder="30"
                    value={condVals[0] ?? ''}
                    onChange={e => onUpdateConditionConfig(condOp, [e.target.value, condVals[1] ?? 'days'])}
                    aria-label="Time amount" className={styles.conditionWithinNextNum}
                  />
                  <PopoverSelect
                    value={condVals[1] ?? 'days'}
                    onChange={unit => onUpdateConditionConfig(condOp, [condVals[0] ?? '', unit])}
                    className={styles.conditionWithinNextUnit}
                    options={[{ value: 'hours', label: 'hours' }, { value: 'days', label: 'days' }, { value: 'weeks', label: 'weeks' }]}
                  />
                </div>
              )}
              {!isNoValueOp && !isInOp && !isWithinNext && condDef.valueOptions && (
                <PopoverSelect
                  value={condVals[0] ?? ''}
                  onChange={v => onUpdateConditionConfig(condOp, [v])}
                  placeholder="Select value…"
                  options={[{ value: '', label: 'Select value…' }, ...condDef.valueOptions.map(opt => ({ value: opt, label: opt }))]}
                />
              )}
              {!isNoValueOp && !isInOp && !isWithinNext && !condDef.valueOptions && (
                <TextField size="md" placeholder="Enter value…"
                  value={condVals[0] ?? ''}
                  onChange={e => onUpdateConditionConfig(condOp, [e.target.value])}
                  aria-label="Condition value"
                />
              )}
            </div>
          </div>
        </>
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
          triggerLabel={triggerLabel}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TRIGGER / ACTION / AI NODE — existing configuration structure
          ══════════════════════════════════════════════════════════════════ */}
      {(!isAiSpecialist || aiSpecTab === 'configure') && step.type !== 'condition' && step.type !== 'delay' && !isEmpty && (
        <>
          {/* AI Specialist: Action + Persona rows above the Configuration divider */}
          {step.type === 'ai' && step.selectedValue === 'AI Specialist' && (
            <div className={styles.popoverSection}>
              <AiSpecialistMeta step={step} onUpdateConfigField={onUpdateConfigField} />
            </div>
          )}
          <div className={styles.popoverDivider} />
          <div className={styles.popoverSection}>
            <p className={styles.popoverSectionLabel}>Configuration</p>

            {/* ── Trigger config fields ─────────────────────────────────── */}
            {step.type === 'trigger' && (() => {
              const libItem = ALL_LIBRARY_ITEMS.find(i => i.label === step.selectedValue);
              const fields  = libItem ? (NODE_CONFIG[libItem.id] ?? []) : [];
              const vals    = step.configValues ?? {};
              if (fields.length === 0) return (
                <p className={styles.popoverConfigPlaceholder}>No additional configuration for this trigger.</p>
              );
              return (
                <div className={styles.popoverFields}>
                  {fields.map(field => {
                    if (field.hideWhenDependsOnIs && field.dependsOn) {
                      if (vals[field.dependsOn] === field.hideWhenDependsOnIs) return null;
                    }
                    const opts: string[] = field.dependsOn
                      ? (field.optionsByDependency?.[vals[field.dependsOn] ?? ''] ?? [])
                      : (field.options ?? []);
                    const currentVal = vals[field.key] ?? '';
                    if (field.type === 'select') {
                      return (
                        <div key={field.key} className={styles.popoverFieldRow}>
                          <label className={styles.popoverFieldLabel}>{field.label}</label>
                          <PopoverSelect
                            value={currentVal}
                            onChange={v => onUpdateConfigField(field.key, v)}
                            placeholder={`Select ${field.label.toLowerCase()}…`}
                            options={[{ value: '', label: `Select ${field.label.toLowerCase()}…` }, ...opts.map(o => ({ value: o, label: o }))]}
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
                    const currentVal = vals[field.key] ?? '';
                    if (field.type === 'select') {
                      const opts = field.options ?? [];
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
        </>
      )}

      </div>{/* end popoverBody */}

      {/* ── 6. Footer — Save (hidden on AI Specialist Test tab) ── */}
      {!(isAiSpecialist && aiSpecTab === 'test') && (
        <div className={styles.popoverFooter}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => { onSave?.(); onClose(); }}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}


// ─── TopBar ─────────────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved';

const STATUS_TAG_MAP: Record<AutomationStatus, StatusTagStatus> = {
  active:   'success',
  draft:    'neutral',
  inactive: 'warning',
  archived: 'neutral',
};

const STATUS_LABEL: Record<AutomationStatus, string> = {
  active:   'Active',
  draft:    'Draft',
  inactive: 'Inactive',
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
}

function TopBar({ onBack, onTest, onPublish, saveState, name, onNameChange, status, onSettingsOpen }: TopBarProps) {
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
        <Button
          variant="tertiary"
          size="md"
          iconOnly
          onClick={onBack}
          aria-label="Back to automations"
        >
          <ChevronLeft />
        </Button>
        <Divider orientation="vertical" />
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
        <StatusTag status={STATUS_TAG_MAP[status]} size="sm">
          {STATUS_LABEL[status]}
        </StatusTag>
      </div>
      <div className={styles.topBarActions}>
        {saveState !== 'idle' && (
          <span className={styles.autoSaveText} aria-live="polite">
            {saveState === 'saving' ? 'Saving…' : 'All changes saved'}
          </span>
        )}
        <Button variant="ghost" size="md" iconOnly onClick={onSettingsOpen} aria-label="Workflow settings" className={styles.settingsGearBtn}>
          <SettingsGearIcon />
        </Button>
        <Button variant="tertiary" size="md" onClick={onTest}>Run test</Button>
        <Button variant="primary"   size="md" onClick={onPublish}>Publish</Button>
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
      {searchOpen && (
        <div
          className={styles.searchPopup}
          role="dialog"
          aria-label="Search nodes"
          onKeyDown={onPopupKeyDown}
        >
          <div className={styles.searchResultsPanel}>
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
          {renderToolbar(true)}
        </div>
      )}
      {!searchOpen && renderToolbar(false)}
    </div>
  );
}

// ─── Activity feed + AI conversation thread ──────────────────────────────────

type ThreadEntryKind = 'activity' | 'ai' | 'user' | 'context';

interface ThreadEntry {
  id: string;
  kind: ThreadEntryKind;
  content: string;
  timestamp: number;
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
    'Condition added — set an operator and value to see the yes/no branches appear.',
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

const WELCOME_AI_MESSAGE =
  "Hi! I'm your workflow assistant. I'll help you build and track changes to this workflow. Start by adding a trigger to kick things off \u2014 or ask me anything.";

// Streams the AI response one chunk at a time to mimic live typing. Effect
// re-runs only when `content` changes, so an already-finished bubble isn't
// re-animated on incidental re-renders.
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
  return <>{content.slice(0, len)}</>;
}

// ─── LeftPanel ───────────────────────────────────────────────────────────────────

interface LeftPanelProps {
  onLibNodeDragStart: (item: LibraryItem) => void;
  onLibNodeDragEnd: () => void;
  onLibNodeSelect: (item: LibraryItem) => void;
  editNodeMode: boolean;
  editingCount: number;
  onToggleEditMode: () => void;
  aiPrompt: string;
  onAiPromptChange: (v: string) => void;
  aiTyping: boolean;
  entries: ThreadEntry[];
  onAiSend: () => void;
}

function LeftPanel({
  onLibNodeDragStart, onLibNodeDragEnd, onLibNodeSelect,
  editNodeMode, editingCount, onToggleEditMode,
  aiPrompt, onAiPromptChange, aiTyping, entries, onAiSend,
}: LeftPanelProps) {
  const [showEditTooltip, setShowEditTooltip] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

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
    <aside className={styles.leftPanel} data-collapsed={collapsed}>
      {/* ── Collapse toggle pill — right edge of panel ── */}
      <div
        className={styles.leftPanelHandle}
        onClick={() => setCollapsed(c => !c)}
        role="button"
        tabIndex={0}
        aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setCollapsed(c => !c)}
      />
      <div className={styles.leftPanelInner}>

        {/* ── Node Palette ── (floats at bottom-center, always expanded) */}
        <NodePaletteCard
          onDragStart={onLibNodeDragStart}
          onDragEnd={onLibNodeDragEnd}
          onNodeSelect={onLibNodeSelect}
        />



        {/* ── AI Composer ── */}
        {collapsed ? (
          <Button
            variant="tertiary"
            size="md"
            iconOnly
            className={styles.panelAiIconBtn}
            onClick={() => setCollapsed(false)}
            aria-label="Open AI composer"
          >
            <TeambridgeAIIcon size={16} />
          </Button>
        ) : (
        <div className={styles.aiComposer}>

          {/* Tooltip — rendered outside aiComposerCard so overflow:hidden doesn't clip it */}
          {showEditTooltip && (
            <div className={styles.aiComposerTooltip} role="tooltip">
              Hold ⌘ to select multiple nodes
            </div>
          )}

          {/* ── Shell: unified card wrapping chat thread + input ── */}
          <div className={styles.aiComposerShell}>

            {/* Activity feed + AI conversation thread — pinned input sits below */}
            <div className={styles.aiChatWindow}>
              {entries.map((entry) => (
                <Fragment key={entry.id}>
                  {entry.kind === 'activity' && (
                    <div className={styles.threadUserBlock}>
                      <div className={styles.threadBubbleUser}>{entry.content}</div>
                      <time className={styles.threadBubbleTime} dateTime={new Date(entry.timestamp).toISOString()}>
                        {formatTime(entry.timestamp)}
                      </time>
                    </div>
                  )}
                  {entry.kind === 'context' && (
                    <div className={styles.threadContextRow}>{entry.content}</div>
                  )}
                  {entry.kind === 'user' && (
                    <div className={styles.threadUserBlock}>
                      <div className={styles.threadUserLabel}>You</div>
                      <div className={styles.threadBubbleUser}>{entry.content}</div>
                      <time className={styles.threadBubbleTime} dateTime={new Date(entry.timestamp).toISOString()}>
                        {formatTime(entry.timestamp)}
                      </time>
                    </div>
                  )}
                  {entry.kind === 'ai' && (
                    <div className={styles.threadAiBlock}>
                      <div className={styles.threadBubbleAi}>
                        {initialEntryIdsRef.current.has(entry.id)
                          ? entry.content
                          : <TypingText content={entry.content} onProgress={() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })} />}
                      </div>
                      <time className={styles.threadBubbleTime} dateTime={new Date(entry.timestamp).toISOString()}>
                        {formatTime(entry.timestamp)}
                      </time>
                    </div>
                  )}
                </Fragment>
              ))}

              {aiTyping && (
                <div className={styles.threadAiBlock}>
                  <div className={styles.threadBubbleAi} aria-label="AI is typing">
                    <AILoader variant="gradient-fill" size="sm" />
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} aria-hidden="true" />
            </div>

            <div className={styles.aiComposerCard}>
            <textarea
              className={styles.aiComposerTextarea}
              value={aiPrompt}
              onChange={(e) => onAiPromptChange(e.target.value)}
              placeholder="Ask AI anything..."
              aria-label="Ask AI"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAiSend(); }
              }}
            />
            <div className={styles.aiComposerActionBar}>
              {/* Left group: attach + edit node */}
              <div className={styles.aiComposerLeft}>
                <button
                  type="button"
                  className={styles.aiComposerPlusBtn}
                  aria-label="Attach"
                >
                  <PlusIcon size={10} />
                </button>
                <button
                  type="button"
                  className={clsx(
                    styles.aiComposerEditBtn,
                    (editNodeMode || editingCount > 0) && styles.aiComposerEditBtnActive,
                  )}
                  onClick={onToggleEditMode}
                  onMouseEnter={() => setShowEditTooltip(true)}
                  onMouseLeave={() => setShowEditTooltip(false)}
                  aria-label="Edit node"
                  aria-pressed={editNodeMode}
                >
                  <Grid01Icon size={12} />
                  {editingCount > 0 ? `Edit node (${editingCount})` : 'Edit node'}
                </button>
              </div>
              {/* Right group: mic + send */}
              <div className={styles.aiComposerRight}>
                <button
                  type="button"
                  className={styles.aiComposerMicBtn}
                  aria-label="Voice input"
                >
                  <Microphone02Icon size={14} />
                </button>
                <button
                  className={styles.aiComposerSendBtn}
                  onClick={onAiSend}
                  disabled={!aiPrompt.trim() || aiTyping}
                  aria-label="Send to AI"
                >
                  {aiTyping ? <LoadingDots /> : <ArrowNarrowUpIcon size={12} />}
                </button>
              </div>
            </div>
          </div>
          </div>{/* end aiComposerShell */}
        </div>
        )}
      </div>
    </aside>
  );
}

// ─── FlowNode ─────────────────────────────────────────────────────────────────

interface FlowNodeProps {
  step: FlowStep;
  isSelected: boolean;
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
  groupSiblings?: FlowStep[];
  onUpdateBranchValues?: (nodeId: string, vals: string[]) => void;
  onUpdateBranchConfig?: (nodeId: string, op: string, vals: string[]) => void;
  onDeleteBranch?: (nodeId: string) => void;
  onUpdateBranchMode?: (mode: 'yes-no' | 'multi-value' | '') => void;
  onAddBranchValue?: () => void;
  onRemoveBranchValue?: (index: number) => void;
  onUpdateConditionBranch?: (index: number, operator: string, value: string) => void;
  hasOutgoingConnections?: boolean;
  /** Label of the workflow's trigger step — forwarded to NodePopover for the AI Specialist Test tab. */
  triggerLabel?: string;
  /** Fired when the right-panel Save button is clicked — used to commit a
   *  single activity entry summarizing the node's saved configuration. */
  onSaveNodePopover?: (nodeId: string) => void;
}

function FlowNode({
  step,
  isSelected,
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
  groupSiblings,
  onUpdateBranchValues,
  onUpdateBranchConfig,
  onDeleteBranch,
  onUpdateBranchMode,
  onAddBranchValue,
  onRemoveBranchValue,
  onUpdateConditionBranch,
  hasOutgoingConnections,
  triggerLabel,
  onSaveNodePopover,
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
          leadingSlot: <DuplicateSmallIcon />,
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
          leadingSlot: <TrashIcon />,
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
  const showPopover = isSelected && popoverOpen && !isDragging && !editNodeMode;

  const isDelay = step.type === 'delay';
  const isTrigger = step.type === 'trigger';
  const isAction = step.type === 'action';
  const isPill = isDelay || isTrigger;
  const pillFocused = isPill && isSelected && !editNodeMode;
  const actionFocused = isAction && isSelected && !editNodeMode;

  return (
    <div
      ref={outerRef}
      className={clsx(
        styles.flowNodeOuter,
        isDelay && styles.flowNodeOuterDelay,
        isTrigger && styles.flowNodeOuterTrigger,
        isAction && styles.flowNodeOuterAction,
        isSelected && !editNodeMode && !isPill && !isAction && styles.flowNodeOuterSelected,
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
        return (
          <div
            className={clsx(
              styles.triggerPill,
              step.configured && step.selectedValue && styles.triggerPillFilled,
              pillFocused && styles.triggerPillFocused,
            )}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M4 2.75L10.5 7L4 11.25V2.75Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
            <span>{triggerText}</span>
          </div>
        );
      })() : isAction ? (
        <>
          <div className={styles.actionNodeHeader}>
            <span
              className={clsx(
                styles.actionNodePill,
                actionFocused && styles.actionNodePillFocused,
              )}
            >
              <ArrowCircleBrokenRightIcon size={12} />
              <span>Action</span>
            </span>
            {/* Spacer to balance absolutely-positioned dots button */}
            <div style={{ width: 24 }} aria-hidden />
          </div>
          <div
            className={clsx(
              styles.actionNodeCard,
              actionFocused && styles.actionNodeCardFocused,
            )}
          >
            <span
              className={clsx(
                styles.actionNodeIconBox,
                step.configured && step.selectedValue && styles.actionNodeIconBoxFilled,
              )}
              aria-label={cfg.label}
            >
              {getStepIcon(step)}
            </span>
            <div className={styles.actionNodeContent}>
              {step.configured && step.selectedValue ? (
                <div className={styles.nodeConfigSummary} data-type="action">
                  {(() => {
                    const segs = buildNodeSnippet(step);
                    if (segs) {
                      return segs.map((seg, i) => (
                        <span
                          key={i}
                          className={
                            seg.role === 'val'
                              ? styles.nodeConfigVal
                              : seg.role === 'op'
                              ? styles.nodeConfigOp
                              : styles.nodeConfigLabel
                          }
                        >
                          {seg.text}
                        </span>
                      ));
                    }
                    return <span className={styles.nodeConfigLabel}>{step.selectedValue}</span>;
                  })()}
                </div>
              ) : (
                <span className={styles.actionNodePlaceholder}>{step.placeholder}</span>
              )}
            </div>
          </div>
        </>
      ) : (
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
            {step.type === 'policy' ? (
              (() => {
                const sel = parsePolicySelection(step.configValues);
                const thr = parsePolicyThreshold(step.configValues);
                const anySelected = sel.folders.length + sel.policies.length + sel.subPolicies.length > 0;
                return (
                  <div className={styles.policyNodeSummary}>
                    {anySelected ? (
                      <span className={styles.policyNodeSummaryLine}>
                        {formatPolicySummary(sel)}
                      </span>
                    ) : (
                      <span className={styles.policyNodeSummaryPlaceholder}>{step.placeholder}</span>
                    )}
                    <span className={styles.policyNodeThresholdLine}>
                      {formatThresholdLabel(thr)}
                    </span>
                  </div>
                );
              })()
            ) : step.configured && step.selectedValue ? (
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

      {/* ··· Dots menu — Alloy DropdownMenu, positioned outside flowNode to escape overflow:hidden */}
      <div
        className={styles.nodeDotsDropdown}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <DropdownMenu
          trigger={
            <Button
              variant="ghost"
              size="sm"
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
      </div>

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
            groupSiblings={groupSiblings}
            onUpdateBranchValues={onUpdateBranchValues}
            onUpdateBranchConfig={onUpdateBranchConfig}
            onDeleteBranch={onDeleteBranch}
            onUpdateBranchMode={onUpdateBranchMode}
            onAddBranchValue={onAddBranchValue}
            onRemoveBranchValue={onRemoveBranchValue}
            onUpdateConditionBranch={onUpdateConditionBranch}
            hasOutgoingConnections={hasOutgoingConnections}
            triggerLabel={triggerLabel}
            onSave={onSaveNodePopover ? () => onSaveNodePopover(step.id) : undefined}
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
  const [search, setSearch] = useState('');

  const PANEL_W = 228;
  const leftPanel = document.querySelector('[class*="leftPanel"]');
  const canvasLeft = leftPanel ? leftPanel.getBoundingClientRect().right + 12 : 12;
  const left = anchorRect.right + 12 + PANEL_W <= window.innerWidth
    ? anchorRect.right + 12
    : Math.max(canvasLeft, anchorRect.left - 12 - PANEL_W);
  const pos = { top: anchorRect.top - 10, left };

  const validItems = ALL_LIBRARY_ITEMS.filter(item =>
    canAddNodeAfter(parentId, item.type, nodes, edges) &&
    (search.trim() === '' ||
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()))
  );

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
      <div className={styles.connectorInsertPopover}>
        <div className={styles.connectorInsertSearch}>
          <SearchField
            size="sm"
            placeholder="Search nodes…"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <ScrollArea className={styles.connectorInsertList}>
          <div className={styles.connectorInsertListInner}>
            {validItems.length === 0 ? (
              <p className={styles.connectorInsertEmpty}>No nodes match</p>
            ) : validItems.map(item => {
              const cfg = STEP_CONFIG[item.type];
              return (
                <button
                  key={item.id}
                  className={styles.connectorInsertItem}
                  onClick={() => { onInsert(item.type, item.label); onClose(); }}
                >
                  <span className={clsx(styles.paletteItemIcon, cfg.bgClass)}>{getLibraryItemIcon(item)}</span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </ScrollArea>
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
  /** Submits the prompt to the shared left-panel thread. */
  onSubmit: (message: string, nodeType: StepType) => void;
}

function NodeAiFloatingInput({ step, left, top, onSubmit }: NodeAiFloatingInputProps) {
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
      style={{ left, top }}
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
/** Connections that should be rejected without surfacing any error toast to the user. */
function isConnectionSilentlyBlocked(
  fromId: string,
  toId: string,
  nodes: GraphNode[],
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
  conditionGroups: ConditionGroupEntry[],
  allowGroupChildTarget = false,
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

  // Actions/AI are terminal — no outputs
  if (fromNode.type === 'action' || fromNode.type === 'ai') {
    return "Actions can't have outputs";
  }

  // Triggers accept no incoming edges
  if (toNode.type === 'trigger') {
    return "Can't connect to a trigger";
  }

  // Nodes inside a formal condition group cannot receive direct connections —
  // the group's top anchor owns the input. Skipped when the target was
  // resolved through a drop on the group itself (targetId is the group's
  // first member by design in that path).
  if (!allowGroupChildTarget) {
    const formalGroupIds = new Set(conditionGroups.map(g => g.id));
    if (toNode.branchGroupId && formalGroupIds.has(toNode.branchGroupId)) {
      return "Connect to the group, not its child nodes";
    }
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
  onAddNodeAfter: (parentId: string | null, type: StepType, branch?: 'yes' | 'no', selectedValue?: string) => void;
  onAddRootTrigger: () => void;
  onInsertOnEdge: (edge: GraphEdge, type: StepType, value?: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onSetAllPositions: (positions: Record<string, { x: number; y: number }>) => void;
  onAddEdge: (fromNodeId: string, toNodeId: string, branch?: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onCreateNodeAt: (type: StepType, x: number, y: number) => void;
  onCreateNodeAndConnect: (fromId: string, type: StepType, x: number, y: number, branch?: string | null) => void;
  onCanvasDropAtPos: (item: LibraryItem, x: number, y: number, targetGroupId?: string) => void;
  editNodeMode: boolean;
  editingNodeIds: Set<string>;
  onEditNodeToggle: (id: string, multi: boolean) => void;
  onDetachFromGroup?: (nodeId: string) => void;
  onUpdateBranchValues?: (nodeId: string, vals: string[]) => void;
  onUpdateBranchConfig?: (nodeId: string, op: string, vals: string[]) => void;
  onUpdateBranchMode?: (nodeId: string, mode: 'yes-no' | 'multi-value' | '') => void;
  onAddBranchValue?: (nodeId: string) => void;
  onRemoveBranchValue?: (nodeId: string, index: number) => void;
  onUpdateConditionBranch?: (nodeId: string, index: number, operator: string, value: string) => void;
  autoTidyToken?: number;
  fitToken?: number;
  /** Submits a prompt from the floating node-level AI input into the main
   *  left-panel thread. Receives the raw message + the originating node type. */
  onNodeAiSubmit?: (message: string, nodeType: StepType) => void;
  /** Commits the right-panel Save for a given node — emits a single activity
   *  entry summarizing the node's saved configuration. */
  onSaveNodePopover?: (nodeId: string) => void;
}

function FlowCanvas({
  nodes, edges, nodePositions, selectedId, draggingLibNode,
  onSelectNode, onDeselectNode, onUpdateNode, onUpdateNodeCondition, onUpdateNodeConfigField,
  onDuplicateNode, onDeleteNode, onAddRootTrigger,
  onInsertOnEdge, onPositionChange, onSetAllPositions, onAddEdge, onDeleteEdge, onCreateNodeAt, onCreateNodeAndConnect, onCanvasDropAtPos,
  editNodeMode, editingNodeIds, onEditNodeToggle,
  onUpdateBranchValues,
  onUpdateBranchConfig,
  onUpdateBranchMode,
  onAddBranchValue,
  onRemoveBranchValue,
  onUpdateConditionBranch,
  autoTidyToken,
  fitToken,
  onNodeAiSubmit,
  onSaveNodePopover,
}: FlowCanvasProps) {
  // Condition-group feature has been removed; legacy code paths treat both
  // collections as empty/no-ops. Safe to delete once the related rendering
  // and drag logic is pruned.
  const conditionGroups: ConditionGroupEntry[] = [];
  const groupPositions: Record<string, { x: number; y: number }> = {};
  const onGroupPositionChange: (id: string, x: number, y: number) => void = () => {};
  const onNodeDroppedOnGroup: (nodeId: string, groupId: string) => void = () => {};
  const onConnectToGroup: (fromNodeId: string, groupId: string) => void = () => {};
  const onUpdateGroupOperator: (groupId: string, op: 'AND' | 'OR') => void = () => {};
  const onAddConditionToGroup: (groupId: string) => void = () => {};
  const onDeleteConditionGroup: (groupId: string) => void = () => {};
  const onDetachFromGroup: (nodeId: string) => void = () => {};

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
  const [hoveringGroupId, setHoveringGroupId] = useState<string | null>(null);
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const hoveringGroupIdRef = useRef<string | null>(null);
  const groupDragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [typePickerPos, setTypePickerPos] = useState<TypePickerPos | null>(null);
  const [edgeDragDrop, setEdgeDragDrop] = useState<EdgeDragDrop | null>(null);
  const [paletteDragPos, setPaletteDragPos] = useState<{ x: number; y: number } | null>(null);
  // Inline error shown when a connection attempt is blocked
  const [invalidConnection, setInvalidConnection] = useState<{ x: number; y: number; msg: string } | null>(null);
  const invalidConnectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs so mousemove/mouseup callbacks don't go stale
  const isPanning      = useRef(false);
  const panStart       = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const nodeDragRef    = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    groupOffsets?: { id: string; offsetX: number; offsetY: number }[];
  } | null>(null);
  const pendingEdgeRef         = useRef<PendingEdge | null>(null);
  const draggingOverNodeIdRef  = useRef<string | null>(null);
  const draggingOverGroupIdRef = useRef<string | null>(null);
  const reconnectingEdgeIdRef  = useRef<string | null>(null);
  const groupDragMovedRef      = useRef(false);
  // Tracks a click that started on a populated condition-group frame (not on a child
  // card). If mouseup happens without cursor movement, the group itself is selected;
  // otherwise the click resolves as a group-drag via nodeDragRef.
  const groupFrameClickIdRef   = useRef<string | null>(null);
  const groupFrameMovedRef     = useRef(false);
  const [draggingOverNodeId, setDraggingOverNodeId] = useState<string | null>(null);
  const [draggingOverGroupId, setDraggingOverGroupId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const zoomRef        = useRef(zoom);
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
      const gc = graphContentRef.current.getBoundingClientRect();
      // Anchor the pending line at the source node's bottom anchor for visual continuity
      let fromAnchorEl = graphContentRef.current.querySelector(
        `[data-anchor-node-id="${fromNodeId}"][data-anchor="bottom"]`
      ) as HTMLElement | null;
      if (!fromAnchorEl) {
        const fromNode = nodes.find(n => n.id === fromNodeId);
        const gid = fromNode?.branchGroupId;
        if (gid) {
          fromAnchorEl = graphContentRef.current.querySelector(
            `[data-anchor-group-id="${gid}"][data-anchor="bottom"]`
          ) as HTMLElement | null;
        }
      }
      let startX: number, startY: number;
      if (fromAnchorEl) {
        const r = fromAnchorEl.getBoundingClientRect();
        startX = (r.left + r.width  / 2 - gc.left) / zoomRef.current;
        startY = (r.top  + r.height / 2 - gc.top)  / zoomRef.current;
      } else {
        const fp = nodePositions[fromNodeId] ?? { x: 0, y: 0 };
        startX = fp.x + NODE_W / 2;
        startY = fp.y + NODE_H;
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
      // Resolve node ID — group anchors use data-anchor-group-id instead of data-anchor-node-id
      let anchorNodeId = anchorEl.dataset.anchorNodeId;
      if (!anchorNodeId) {
        const gid = anchorEl.dataset.anchorGroupId;
        if (gid) {
          anchorNodeId = nodes
            .filter(n => n.branchGroupId === gid)
            .sort((a, b) => (nodePositions[a.id]?.x ?? 0) - (nodePositions[b.id]?.x ?? 0))[0]?.id;
        }
      }
      if (!anchorNodeId) return;
      const anchorCase   = anchorEl.dataset.anchorCase ?? null;
      // FIX 1: block drag from a handle that already has an outgoing edge
      if (anchorCase) {
        const alreadyConnected = edges.some(e => e.from === anchorNodeId && e.branch === anchorCase);
        if (alreadyConnected) return;
      }
      const anchorRect   = anchorEl.getBoundingClientRect();
      const gc           = graphContentRef.current.getBoundingClientRect();
      const startX       = (anchorRect.left + anchorRect.width  / 2 - gc.left) / zoomRef.current;
      const startY       = (anchorRect.top  + anchorRect.height / 2 - gc.top)  / zoomRef.current;
      pendingEdgeRef.current = { fromNodeId: anchorNodeId, fromCase: anchorCase, startX, startY, currentX: startX, currentY: startY };
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
      // If the node belongs to a branch group, drag all siblings together
      const draggedNode = nodes.find(n => n.id === nodeId);
      const groupOffsets = draggedNode?.branchGroupId
        ? nodes
            .filter(n => n.branchGroupId === draggedNode.branchGroupId && n.id !== nodeId)
            .map(n => {
              const p = nodePositions[n.id] ?? { x: 0, y: 0 };
              return { id: n.id, offsetX: mx - p.x, offsetY: my - p.y };
            })
        : undefined;
      nodeDragRef.current = { id: nodeId, offsetX: mx - pos.x, offsetY: my - pos.y, groupOffsets };
      setDraggingNodeId(nodeId);
      setSelectedGroupId(null);
      onSelectNode(nodeId);
      return;
    }

    // Group container drag — fires when clicking the group background (not on a node inside it)
    const groupEl = target.closest('[data-group-id]') as HTMLElement | null;
    if (groupEl && graphContentRef.current) {
      const groupId    = groupEl.dataset.groupId!;
      const groupNodes = nodes.filter(n => n.branchGroupId === groupId);
      const gc  = graphContentRef.current.getBoundingClientRect();
      const mx  = (e.clientX - gc.left) / zoomRef.current;
      const my  = (e.clientY - gc.top)  / zoomRef.current;
      if (!groupNodes.length) {
        // Standalone empty group — drag via groupDragRef (moves the groupPositions entry)
        const gPos = groupPositions[groupId];
        if (!gPos) return;
        groupDragRef.current = { id: groupId, offsetX: mx - gPos.x, offsetY: my - gPos.y };
        setDraggingGroupId(groupId);
        return;
      }
      const [primary, ...rest] = groupNodes;
      const pp  = nodePositions[primary.id] ?? { x: 0, y: 0 };
      nodeDragRef.current = {
        id: primary.id,
        offsetX: mx - pp.x,
        offsetY: my - pp.y,
        groupOffsets: rest.map(n => {
          const p = nodePositions[n.id] ?? { x: 0, y: 0 };
          return { id: n.id, offsetX: mx - p.x, offsetY: my - p.y };
        }),
      };
      setDraggingNodeId(primary.id);
      // Track that this was a click on the group's frame (not on a child card),
      // so mouseup can distinguish "click to select the group" from "drag the group".
      groupFrameClickIdRef.current = groupId;
      groupFrameMovedRef.current   = false;
      return;
    }

    // Canvas pan (skip if the target is a button-like focusable role)
    if (target.closest('[role="button"]')) return;
    onDeselectNode();
    setSelectedGroupId(null);
    isPanning.current = true;
    panStart.current  = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    (e.currentTarget as HTMLElement).dataset.panning = 'true';
  }, [pan, onDeselectNode, nodes, nodePositions, onSelectNode, editNodeMode, onEditNodeToggle]);

  // ── MouseMove: draw pending edge OR drag node OR pan canvas ──
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (pendingEdgeRef.current && graphContentRef.current) {
      const gc = graphContentRef.current.getBoundingClientRect();
      const currentX = (e.clientX - gc.left) / zoomRef.current;
      const currentY = (e.clientY - gc.top) / zoomRef.current;
      pendingEdgeRef.current = { ...pendingEdgeRef.current, currentX, currentY, screenX: e.clientX, screenY: e.clientY };
      setPendingEdge({ ...pendingEdgeRef.current });

      // Track which node the cursor is over so we can show its anchors and use it as the target
      const fromId    = pendingEdgeRef.current.fromNodeId;
      const hitNode = nodes.find(n => {
        if (n.id === fromId) return false;
        const pos = nodePositions[n.id];
        if (!pos) return false;
        return currentX >= pos.x && currentX <= pos.x + NODE_W &&
               currentY >= pos.y && currentY <= pos.y + NODE_H;
      });
      const hoverId = hitNode ? hitNode.id : null;
      if (draggingOverNodeIdRef.current !== hoverId) {
        draggingOverNodeIdRef.current = hoverId;
        setDraggingOverNodeId(hoverId);
      }

      // Track which condition group the cursor is over (only when not over a node).
      // Primary detection uses the actual rendered DOM rect of each group frame
      // (plus a small tolerance so the top/bottom anchor dots, which sit ~5px
      // outside the frame, are also valid drop targets). This is more accurate
      // than recomputing geometry from gPos, which can drift once members
      // resize the frame.
      let hoverGroupId: string | null = null;
      if (!hitNode) {
        const ANCHOR_TOLERANCE = 10; // px, covers the 10px anchor dot around the frame edges
        const groupEls = graphContentRef.current.querySelectorAll<HTMLElement>('[data-group-id]');
        for (const el of Array.from(groupEls)) {
          const r = el.getBoundingClientRect();
          if (
            e.clientX >= r.left  - ANCHOR_TOLERANCE &&
            e.clientX <= r.right + ANCHOR_TOLERANCE &&
            e.clientY >= r.top   - ANCHOR_TOLERANCE &&
            e.clientY <= r.bottom + ANCHOR_TOLERANCE
          ) {
            const gid = el.getAttribute('data-group-id');
            if (gid && conditionGroups.some(g => g.id === gid)) {
              hoverGroupId = gid;
              break;
            }
          }
        }
        // Only formal groups (above) trigger group membership — informal
        // "node-derived groups" no longer exist, so no further detection here.
      }
      if (draggingOverGroupIdRef.current !== hoverGroupId) {
        draggingOverGroupIdRef.current = hoverGroupId;
        setDraggingOverGroupId(hoverGroupId);
      }
      return;
    }
    if (groupDragRef.current && graphContentRef.current) {
      const gc = graphContentRef.current.getBoundingClientRect();
      const mx = (e.clientX - gc.left) / zoomRef.current;
      const my = (e.clientY - gc.top)  / zoomRef.current;
      groupDragMovedRef.current = true;
      onGroupPositionChange(groupDragRef.current.id, mx - groupDragRef.current.offsetX, my - groupDragRef.current.offsetY);
      return;
    }
    if (nodeDragRef.current && graphContentRef.current) {
      const gc = graphContentRef.current.getBoundingClientRect();
      const mx = (e.clientX - gc.left) / zoomRef.current;
      const my = (e.clientY - gc.top)  / zoomRef.current;
      onPositionChange(
        nodeDragRef.current.id,
        mx - nodeDragRef.current.offsetX,
        my - nodeDragRef.current.offsetY,
      );
      // Move all branch group siblings together (only for group-background drags)
      if (nodeDragRef.current.groupOffsets) {
        for (const { id, offsetX, offsetY } of nodeDragRef.current.groupOffsets) {
          onPositionChange(id, mx - offsetX, my - offsetY);
        }
      }
      // If this drag originated from a populated group's frame, flag movement so
      // mouseup treats it as a drag (not a click-to-select).
      if (groupFrameClickIdRef.current) {
        groupFrameMovedRef.current = true;
      }
      // Group hover detection for condition nodes being dragged.
      // Uses the group's live rendered rect (not reconstructed geometry from
      // groupPositions + slot math) so membership detection stays accurate as
      // the frame grows/shrinks with its members.
      const draggedNode = nodes.find(n => n.id === nodeDragRef.current!.id);
      if (draggedNode?.type === 'condition' && !nodeDragRef.current.groupOffsets) {
        let hid: string | null = null;

        if (!draggedNode.branchGroupId && graphContentRef.current) {
          const groupEls = graphContentRef.current.querySelectorAll<HTMLElement>('[data-group-id]');
          for (const el of Array.from(groupEls)) {
            const gid = el.dataset.groupId;
            if (!gid) continue;
            if (!conditionGroups.some(g => g.id === gid)) continue;
            const occupied = nodes.filter(n => n.branchGroupId === gid).length;
            if (occupied >= MAX_GROUP_CONDITIONS) continue;
            const r = el.getBoundingClientRect();
            if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
              hid = gid;
              break;
            }
          }
        }

        if (hoveringGroupIdRef.current !== hid) {
          hoveringGroupIdRef.current = hid;
          setHoveringGroupId(hid);
        }
      }
      return;
    }
    if (isPanning.current) {
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.mx),
        y: panStart.current.py + (e.clientY - panStart.current.my),
      });
    }
  }, [onPositionChange, onGroupPositionChange, nodes, nodePositions, conditionGroups, groupPositions, setDraggingOverGroupId]);

  // ── MouseUp: end pending edge OR node drag OR pan ──
  const handleMouseUp = useCallback((_e: React.MouseEvent<HTMLDivElement>) => {
    if (pendingEdgeRef.current) {
      const fromNodeId  = pendingEdgeRef.current.fromNodeId;
      const isReconnect = reconnectingEdgeIdRef.current !== null;
      let   connectedSuccessfully = false;

      // Resolve target: prefer a directly-hovered node, fall back to a hovered condition group
      let targetId = draggingOverNodeIdRef.current;
      const targetGroupId = draggingOverGroupIdRef.current;
      let resolvedViaGroup = false;
      if (!targetId && targetGroupId) {
        const groupMembers = nodes
          .filter(n => n.branchGroupId === targetGroupId)
          .sort((a, b) => (nodePositions[a.id]?.x ?? 0) - (nodePositions[b.id]?.x ?? 0));
        if (groupMembers.length > 0) {
          targetId = groupMembers[0].id;
          resolvedViaGroup = true;
        } else {
          // Empty group — create a condition node inside it and wire the edge
          const sourceNode = nodes.find(n => n.id === fromNodeId);
          if (sourceNode?.type !== 'action' && sourceNode?.type !== 'ai') {
            onConnectToGroup?.(fromNodeId, targetGroupId);
            connectedSuccessfully = true;
          }
        }
      }

      if (targetId && targetId !== fromNodeId) {
        // Silent rejection for cases like delay→delay — no toast, no edge, no snapback state
        if (isConnectionSilentlyBlocked(fromNodeId, targetId, nodes)) {
          if (isReconnect) reconnectingEdgeIdRef.current = null;
          pendingEdgeRef.current        = null;
          draggingOverNodeIdRef.current = null;
          draggingOverGroupIdRef.current = null;
          setPendingEdge(null);
          setDraggingOverNodeId(null);
          setDraggingOverGroupId(null);
          return;
        }
        const connectionError = getConnectionError(fromNodeId, targetId, nodes, conditionGroups, resolvedViaGroup);

        if (!connectionError) {
          if (isReconnect) onDeleteEdge(reconnectingEdgeIdRef.current!);
          onAddEdge(fromNodeId, targetId, pendingEdgeRef.current?.fromCase ?? undefined);
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
            // do NOT call onDeleteEdge — leave original edge intact (snap back)
            reconnectingEdgeIdRef.current = null;
          }
        }
      }

      // Released on empty canvas during reconnect → just delete the original edge
      // (skip if reconnectingEdgeIdRef was cleared due to a blocked/snapped-back connection)
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
      draggingOverGroupIdRef.current = null;
      reconnectingEdgeIdRef.current = null;
      setPendingEdge(null);
      setDraggingOverNodeId(null);
      setDraggingOverGroupId(null);
      return;
    }
    // Drop condition node onto a formal condition group — the only path that
    // establishes group membership. Branch siblings never form an implicit group.
    if (nodeDragRef.current && hoveringGroupIdRef.current) {
      onNodeDroppedOnGroup(nodeDragRef.current.id, hoveringGroupIdRef.current);
      hoveringGroupIdRef.current = null;
      setHoveringGroupId(null);
    } else if (nodeDragRef.current && !nodeDragRef.current.groupOffsets) {
      // Check if a group-member node was dragged outside the group boundary → detach
      const draggedNode = nodes.find(n => n.id === nodeDragRef.current!.id);
      if (draggedNode?.branchGroupId) {
        const otherMembers = nodes.filter(
          n => n.branchGroupId === draggedNode.branchGroupId && n.id !== nodeDragRef.current!.id
        );
        const droppedPos = nodePositions[nodeDragRef.current.id];
        if (otherMembers.length > 0 && droppedPos) {
          const otherPoses = otherMembers.map(n => nodePositions[n.id]).filter(Boolean);
          const gMinX = Math.min(...otherPoses.map(p => p.x)) - GROUP_PAD_X - NODE_W * 0.6;
          const gMaxX = Math.max(...otherPoses.map(p => p.x + NODE_W)) + GROUP_PAD_X + NODE_W * 0.6;
          const gMinY = Math.min(...otherPoses.map(p => p.y)) - GROUP_PAD_TOP - NODE_H * 0.5;
          const gMaxY = Math.max(...otherPoses.map(p => p.y + NODE_H)) + GROUP_PAD_BOT + NODE_H * 0.5;
          const cx = droppedPos.x + NODE_W / 2;
          const cy = droppedPos.y + NODE_H / 2;
          if (cx < gMinX || cx > gMaxX || cy < gMinY || cy > gMaxY) {
            onDetachFromGroup?.(draggedNode.id);
          }
        }
      }
    }
    nodeDragRef.current = null;
    setDraggingNodeId(null);
    // Empty-group frame click (groupDragRef path): no movement → select the group
    if (groupDragRef.current) {
      const wasClick = !groupDragMovedRef.current;
      const gid = groupDragRef.current.id;
      groupDragRef.current = null;
      groupDragMovedRef.current = false;
      if (wasClick) {
        setSelectedGroupId(gid);
        onDeselectNode();
      }
    }
    // Populated-group frame click (nodeDragRef path with groupFrameClickIdRef set):
    // no movement → select the group frame; otherwise it was a group drag.
    if (groupFrameClickIdRef.current) {
      const wasClick = !groupFrameMovedRef.current;
      const gid = groupFrameClickIdRef.current;
      groupFrameClickIdRef.current = null;
      groupFrameMovedRef.current   = false;
      if (wasClick) {
        setSelectedGroupId(gid);
        onDeselectNode();
      }
    }
    setDraggingGroupId(null);
    isPanning.current   = false;
    delete (_e.currentTarget as HTMLElement).dataset.panning;
  }, [onAddEdge, onDeleteEdge, onNodeDroppedOnGroup, nodes, nodePositions, onDeselectNode]);

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

      // For condition nodes: detect overlap with a condition group frame
      if (draggingLibNode.type === 'condition') {
        const nodeLeft   = x;
        const nodeRight  = x + NODE_W;
        const nodeTop    = y;
        const nodeBottom = y + NODE_H;
        const SIBLING_PITCH_G = GROUP_SIBLING_PITCH;

        let hoveredGroupId: string | null = null;

        for (const group of conditionGroups) {
          const gPos = groupPositions[group.id];
          if (!gPos) continue;
          const memberCount = nodes.filter(n => n.branchGroupId === group.id).length;
          if (memberCount >= MAX_GROUP_CONDITIONS) continue;
          const totalCols = Math.max(2, memberCount);
          const gLeft   = gPos.x;
          const gTop    = gPos.y;
          const gRight  = gPos.x + (totalCols - 1) * GROUP_SIBLING_PITCH + NODE_W + 2 * GROUP_PAD_X;
          const gBottom = gPos.y + GROUP_SLOT_H + GROUP_PAD_TOP + GROUP_PAD_BOT;
          // Overlap check (any intersection)
          if (nodeRight > gLeft && nodeLeft < gRight && nodeBottom > gTop && nodeTop < gBottom) {
            hoveredGroupId = group.id;
            break;
          }
        }

        if (hoveringGroupIdRef.current !== hoveredGroupId) {
          hoveringGroupIdRef.current = hoveredGroupId;
          setHoveringGroupId(hoveredGroupId);
        }
      }
    }
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    // Only clear when leaving the canvas itself (not entering a child element)
    if (!canvasRef.current?.contains(e.relatedTarget as Node)) {
      setCanvasDragOver(false);
      setPaletteDragPos(null);
      hoveringGroupIdRef.current = null;
      setHoveringGroupId(null);
    }
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingLibNode && paletteDragPos) {
      const targetGroupId = draggingLibNode.type === 'condition' ? hoveringGroupIdRef.current : null;
      onCanvasDropAtPos(draggingLibNode, paletteDragPos.x, paletteDragPos.y, targetGroupId ?? undefined);
    }
    setCanvasDragOver(false);
    setPaletteDragPos(null);
    hoveringGroupIdRef.current = null;
    setHoveringGroupId(null);
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

    conditionGroups.forEach(g => {
      const p = groupPositions[g.id];
      if (p) {
        const memberCount = nodes.filter(n => n.branchGroupId === g.id).length;
        const totalCols = Math.max(2, memberCount);
        const w = (totalCols - 1) * GROUP_SIBLING_PITCH + NODE_W + 2 * GROUP_PAD_X;
        const h = GROUP_SLOT_H + GROUP_PAD_TOP + GROUP_PAD_BOT;
        xs.push(p.x, p.x + w); ys.push(p.y, p.y + h);
      }
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
    // ─── Treat each formal condition group as a single atomic unit ───
    // Collapse each group to its leftmost member (the "primary" — the node that
    // already receives incoming edges per the connection wiring). Secondary
    // members are removed from the layout graph; their edges rewrite through
    // the primary. After layout, each secondary is shifted by the same delta
    // the primary moved, preserving its relative position inside the group
    // frame (so child-card offsets are never recalculated by the layout pass).
    //
    // The primary's slot width is inflated to the full group width so other
    // subtrees at the same depth don't overlap the expanded frame.
    const groupMembersByGid = new Map<string, GraphNode[]>();
    for (const g of conditionGroups) {
      const members = nodes.filter(n => n.branchGroupId === g.id);
      if (members.length > 0) groupMembersByGid.set(g.id, members);
    }

    const primaryByGid = new Map<string, string>();
    const secondaryToPrimary = new Map<string, string>();
    groupMembersByGid.forEach((members, gid) => {
      const sorted = [...members].sort(
        (a, b) => (nodePositions[a.id]?.x ?? 0) - (nodePositions[b.id]?.x ?? 0)
      );
      const primary = sorted[0];
      primaryByGid.set(gid, primary.id);
      for (let i = 1; i < sorted.length; i++) {
        secondaryToPrimary.set(sorted[i].id, primary.id);
      }
    });

    const reducedNodes = nodes.filter(n => !secondaryToPrimary.has(n.id));
    const seenEdgeKey = new Set<string>();
    const reducedEdges: GraphEdge[] = [];
    for (const e of edges) {
      const from = secondaryToPrimary.get(e.from) ?? e.from;
      const to   = secondaryToPrimary.get(e.to)   ?? e.to;
      if (from === to) continue; // self-loop created by rewiring
      const key = `${from}→${to}|${e.branch ?? ''}`;
      if (seenEdgeKey.has(key)) continue;
      seenEdgeKey.add(key);
      reducedEdges.push({ ...e, from, to });
    }

    // Slot width for a group primary: group width plus the gap the layout
    // normally reserves around a single node (H_SPACING - NODE_W).
    const slotOverrides = new Map<string, number>();
    groupMembersByGid.forEach((members, gid) => {
      const primaryId = primaryByGid.get(gid)!;
      const groupWidth = (members.length - 1) * GROUP_SIBLING_PITCH + NODE_W;
      slotOverrides.set(primaryId, Math.max(H_SPACING, groupWidth + (H_SPACING - NODE_W)));
    });

    const layout = computeLayout(reducedNodes, reducedEdges, slotOverrides);

    // Shift secondary group members by the same delta the primary moved.
    groupMembersByGid.forEach((members, gid) => {
      const primaryId = primaryByGid.get(gid)!;
      const newPrimary = layout.get(primaryId);
      const oldPrimary = nodePositions[primaryId];
      if (!newPrimary || !oldPrimary) return;
      const dx = newPrimary.x - oldPrimary.x;
      const dy = newPrimary.y - oldPrimary.y;
      for (const m of members) {
        if (m.id === primaryId) continue;
        const oldPos = nodePositions[m.id];
        if (!oldPos) continue;
        layout.set(m.id, { x: oldPos.x + dx, y: oldPos.y + dy });
      }
      // Keep the stored group position in sync (used for empty-group frame
      // placement and drag-start offsets).
      const oldGPos = groupPositions[gid];
      if (oldGPos) {
        onGroupPositionChange(gid, oldGPos.x + dx, oldGPos.y + dy);
      }
    });

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
      // Pan to centre the latest group in the visible canvas strip (keep current zoom)
      const latestGroup = conditionGroups[conditionGroups.length - 1];
      if (!latestGroup || !canvasRef.current || !graphContentRef.current) return;
      const gPos = groupPositions[latestGroup.id];
      if (!gPos) return;
      const memberCount = nodes.filter(n => n.branchGroupId === latestGroup.id).length;
      const totalCols   = Math.max(2, memberCount);
      const gW          = (totalCols - 1) * GROUP_SIBLING_PITCH + NODE_W + 2 * GROUP_PAD_X;
      const gcHalfW     = graphContentRef.current.offsetWidth / 2;
      const canvasW     = canvasRef.current.clientWidth;
      const leftPanelEl = document.querySelector('[class*="leftPanel"]') as HTMLElement | null;
      const leftOffset  = leftPanelEl ? leftPanelEl.offsetWidth : 0;
      const effectiveCx = leftOffset + (canvasW - leftOffset) / 2;
      const groupCentreX = gPos.x + gW / 2;
      // screen_x = canvasW/2 + panX + (cx - gcHalfW) * zoom
      // effectiveCx = canvasW/2 + panX + (groupCentreX - gcHalfW) * zoom → solve for panX
      setPan(prev => ({
        ...prev,
        x: Math.round(effectiveCx - canvasW / 2 + (gcHalfW - groupCentreX) * zoomRef.current),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToken]);

  // ── Anchor position helper — reads DOM for pixel-accurate coordinates ──────────
  // (During render, graphContentRef.current holds the DOM from the *previous* commit,
  //  which has up-to-date anchor positions for all existing nodes.)
  // anchorCase: when provided, narrows the query to [data-anchor-case="…"] so each
  // labeled output handle (Yes, No, or multi-value labels) is resolved independently.
  const getAnchorCenter = (nodeId: string, side: 'top' | 'bottom' | 'left' | 'right', anchorCase?: string): { x: number; y: number } | null => {
    // For grouped nodes, route top/bottom edges through the group-level anchor
    const node = nodes.find(n => n.id === nodeId);
    if (node?.branchGroupId && (side === 'top' || side === 'bottom')) {
      const gid = node.branchGroupId;
      if (graphContentRef.current) {
        const el = graphContentRef.current.querySelector(
          `[data-anchor-group-id="${gid}"][data-anchor="${side}"]`
        ) as HTMLElement | null;
        if (el) {
          const gc = graphContentRef.current.getBoundingClientRect();
          const r  = el.getBoundingClientRect();
          return {
            x: (r.left + r.width  / 2 - gc.left) / zoom,
            y: (r.top  + r.height / 2 - gc.top)  / zoom,
          };
        }
      }
      // Fallback: compute group bounding center
      const gNodes = nodes.filter(n => n.branchGroupId === gid);
      const poses  = gNodes.map(n => nodePositions[n.id]).filter(Boolean);
      if (poses.length) {
        const cx = (Math.min(...poses.map(p => p.x)) + Math.max(...poses.map(p => p.x + NODE_W))) / 2;
        return side === 'top'
          ? { x: cx, y: Math.min(...poses.map(p => p.y)) - 28 }
          : { x: cx, y: Math.max(...poses.map(p => p.y + NODE_H)) + 6 };
      }
    }

    if (graphContentRef.current) {
      // When a specific case is requested (e.g. 'Yes' / 'No' / multi-value label),
      // narrow to the exact per-case anchor so each handle resolves independently.
      const caseSelector = anchorCase ? `[data-anchor-case="${anchorCase}"]` : ':not([data-anchor-case])';
      const el = graphContentRef.current.querySelector(
        `[data-anchor-node-id="${nodeId}"][data-anchor="${side}"]${caseSelector}`
      ) as HTMLElement | null;
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
    if (side === 'bottom' && anchorCase && node) {
      // Distribute labeled output handles evenly across the node width
      const cases = node.branchMode === 'yes-no'
        ? ['Yes', 'No']
        : (node.conditionBranches ?? []).map(b => b.value).filter(Boolean);
      const idx = cases.indexOf(anchorCase);
      const count = cases.length;
      if (idx >= 0 && count > 0) {
        return { x: pos.x + (NODE_W / (count + 1)) * (idx + 1), y: pos.y + NODE_H };
      }
    }
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
            }}
          >
            {/* SVG edge overlay — bezier curves + pending edge.
                The SVG has no pointer-events on visual paths; wide transparent
                hit paths are added per-edge so users can drag to reconnect/disconnect. */}
            <svg
              style={{ position: 'absolute', inset: 0, width: maxX, height: maxY, overflow: 'visible' }}
              aria-hidden
            >
              {edges.map(edge => {
                // ── Normal (vertical) edge ───────────────────────────────────────────────
                // Pass edge.branch as anchorCase so per-handle edges resolve independently
                const from = getAnchorCenter(edge.from, 'bottom', edge.branch ?? undefined);
                let   to   = getAnchorCenter(edge.to,   'top');
                if (!from || !to) return null;

                const { x: x1, y: y1 } = from;
                const { x: x2, y: y2 } = to;
                const dy = Math.abs(y2 - y1) * 0.5;
                const d  = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;

                // ── Caret rotation ───────────────────────────────────────────────────────
                // Our bezier always uses cx2=x2, so the mathematical tangent at t=1 is
                // always (0, dy) — straight down — regardless of horizontal offset.
                // We sample the curve at t=0.85 and take the chord to the endpoint; this
                // captures the actual visual approach direction for any node arrangement.
                //   Cubic B(t) = Σ C(3,k) · (1-t)^(3-k) · t^k · P_k
                //   P0=(x1,y1)  P1=(x1,y1+dy)  P2=(x2,y2-dy)  P3=(x2,y2)
                return (
                  <g key={edge.id}>
                    {/* Visual path */}
                    <path d={d}
                      stroke="var(--color-slate-border-secondary)" strokeWidth="1.5"
                      fill="none" strokeLinecap="round"
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* Boolean branch edge — no inline SVG pill; badge is in HTML layer below */}
                    {/* Wide transparent hit path — drag here to reconnect or disconnect */}
                    <path d={d} stroke="transparent" strokeWidth="12" fill="none"
                      data-edge-endpoint={edge.id}
                      data-edge-from={edge.from}
                      style={{ pointerEvents: 'stroke', cursor: 'grab' }} />
                  </g>
                );
              })}


              {/* Pending edge while drawing or reconnecting */}
              {pendingEdge && (() => {
                const dy = Math.abs(pendingEdge.currentY - pendingEdge.startY) * 0.5;
                const d  = `M ${pendingEdge.startX} ${pendingEdge.startY} C ${pendingEdge.startX} ${pendingEdge.startY + dy}, ${pendingEdge.currentX} ${pendingEdge.currentY - dy}, ${pendingEdge.currentX} ${pendingEdge.currentY}`;
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
                const dy = Math.abs(y2 - y1) * 0.5;
                const d  = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
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

            {/* Edge midpoint overlays — branch badge OR insert + button */}
            {edges.map(edge => {
              // Use branch-aware anchor so midpoint tracks the correct handle
              const from = getAnchorCenter(edge.from, 'bottom', edge.branch ?? undefined);
              const to   = getAnchorCenter(edge.to,   'top');
              if (!from || !to) return null;
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;

              // Branch edges (Yes/No or multi-value) get a label badge, not a + button.
              // All branch badges use the solid variant: Yes → solid green, No → solid
              // red, multi-value → solid neutral (dark bg, white text).
              if (edge.branch) {
                const branchLower = edge.branch.toLowerCase();
                const isYesNo = branchLower === 'yes' || branchLower === 'no';
                const tagColor: import('@alloy/components/Tag').TagColor =
                  branchLower === 'yes' ? 'green'
                  : branchLower === 'no' ? 'red'
                  : 'neutral';
                return (
                  <div
                    key={`midbadge-${edge.id}`}
                    className={styles.edgeBranchBadge}
                    style={{ left: midX, top: midY }}
                  >
                    <Tag variant="solid" color={tagColor} size="sm">
                      {isYesNo ? edge.branch.toUpperCase() : edge.branch}
                    </Tag>
                  </div>
                );
              }

              return (
                <div
                  key={`midplus-${edge.id}`}
                  className={styles.edgeMidpointArea}
                  style={{ left: midX - 60, top: midY - 25, width: 120, height: 50 }}
                >
                  <button
                    className={styles.edgeMidplusBtn}
                    onClick={e => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setEdgeInsert({ edge, anchorRect: rect });
                    }}
                    aria-label="Insert node on edge"
                    type="button"
                  >
                    <PlusIcon size={8} />
                  </button>
                </div>
              );
            })}

            {/* ── Condition group containers — rendered behind nodes ── */}
            {(() => {
              const SIBLING_PITCH_G = GROUP_SIBLING_PITCH;
              const rendered: React.ReactNode[] = [];

              // Build map of nodes per group
              const nodeGroupMap = new Map<string, GraphNode[]>();
              nodes.forEach(n => {
                if (n.branchGroupId) {
                  const g = nodeGroupMap.get(n.branchGroupId) ?? [];
                  g.push(n);
                  nodeGroupMap.set(n.branchGroupId, g);
                }
              });

              conditionGroups.forEach(group => {
                const memberNodes = nodeGroupMap.get(group.id) ?? [];
                const isDropTarget = hoveringGroupId === group.id;
                const isDragTarget = draggingOverGroupId === group.id;

                // -- Determine geometry --
                // For groups with a fixed position (groupPositions), use that for layout.
                // For groups whose position derives from member nodes, compute from bounds.
                const gPos = groupPositions[group.id];

                let left: number, top: number, width: number, height: number;

                if (gPos && memberNodes.length === 0) {
                  // Empty group — use stored position with 2-slot size.
                  // Slot height matches actual condition card height (same measurement as filled state).
                  const conditionNode = nodes.find(n => n.type === 'condition');
                  const condEl = conditionNode
                    ? graphContentRef.current?.querySelector(`[data-node-id="${conditionNode.id}"]`) as HTMLElement | null
                    : null;
                  const slotH = condEl ? condEl.getBoundingClientRect().height / zoom : NODE_H;

                  width  = SIBLING_PITCH_G + NODE_W + 2 * GROUP_PAD_X; // always 2 slots
                  height = slotH + GROUP_PAD_TOP + GROUP_PAD_BOT;
                  left   = gPos.x;
                  top    = gPos.y;
                } else if (memberNodes.length > 0) {
                  // Size from member node positions
                  const isGroupDrag = nodeDragRef.current?.groupOffsets != null;
                  const stationaryNodes = (!isGroupDrag && draggingNodeId)
                    ? memberNodes.filter(n => n.id !== draggingNodeId)
                    : memberNodes;
                  const posSource = stationaryNodes.length > 0 ? stationaryNodes : memberNodes;
                  const poses = posSource.map(n => nodePositions[n.id]).filter(Boolean);
                  if (poses.length === 0) return;

                  const rawMinX = Math.min(...poses.map(p => p.x)) - GROUP_PAD_X;
                  const rawMaxX = Math.max(...poses.map(p => p.x + NODE_W)) + GROUP_PAD_X;
                  const rawMinY = Math.min(...poses.map(p => p.y)) - GROUP_PAD_TOP;
                  const rawMaxY = Math.max(...posSource.map(n => {
                    const pos = nodePositions[n.id];
                    if (!pos) return 0;
                    const el = graphContentRef.current?.querySelector(`[data-node-id="${n.id}"]`) as HTMLElement | null;
                    const h = el ? el.getBoundingClientRect().height / zoom : NODE_H;
                    return pos.y + h;
                  })) + GROUP_PAD_BOT;

                  // Extend frame to show remaining placeholder slots (until 2 conditions filled)
                  const occupiedCount = stationaryNodes.length;
                  const remainingSlots = Math.max(0, 2 - occupiedCount);
                  const totalVisualCols = occupiedCount + remainingSlots; // = max(2, occupiedCount)
                  const minWidth = (totalVisualCols - 1) * SIBLING_PITCH_G + NODE_W + 2 * GROUP_PAD_X;

                  left   = rawMinX;
                  top    = rawMinY;
                  width  = Math.max(rawMaxX - rawMinX, minWidth);
                  height = rawMaxY - rawMinY;

                  // Keep groupPositions in sync so group drags start at right position
                  if (gPos && (Math.abs(gPos.x - left) > 1 || Math.abs(gPos.y - top) > 1)) {
                    // Position will be updated via onGroupPositionChange elsewhere; skip here
                  }
                } else {
                  return; // no position and no members — skip
                }

                const bodyHeight = height - GROUP_PAD_TOP - GROUP_PAD_BOT;

                // Sort member nodes by x position for badge placement
                const sortedMembers = [...memberNodes].sort(
                  (a, b) => (nodePositions[a.id]?.x ?? 0) - (nodePositions[b.id]?.x ?? 0)
                );

                // Remaining placeholder slots: show until 2 conditions are filled
                const filledCount = sortedMembers.length;
                const remainingSlots = Math.max(0, 2 - filledCount);
                const isAtLimit = filledCount >= MAX_GROUP_CONDITIONS;

                rendered.push(
                  <div
                    key={group.id}
                    className={clsx(
                      styles.groupContainer,
                      isDropTarget && styles.groupContainerDropTarget,
                      selectedGroupId === group.id && styles.groupContainerSelected,
                      isAtLimit && styles.groupContainerAtLimit,
                    )}
                    data-group-id={group.id}
                    data-drag-target={isDragTarget ? 'true' : undefined}
                    style={{ left, top, width, height }}
                  >
                    {/* Clickable placeholder slots — shown until 2 conditions filled */}
                    {remainingSlots > 0 && Array.from({ length: remainingSlots }, (_, i) => {
                      const slotIndex = filledCount + i;
                      return (
                        <div
                          key={`slot-${slotIndex}`}
                          className={clsx(styles.groupSlot, isDropTarget && styles.groupSlotHover)}
                          style={{ left: GROUP_PAD_X + slotIndex * SIBLING_PITCH_G, top: GROUP_PAD_TOP, width: NODE_W, height: bodyHeight }}
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); onAddConditionToGroup(group.id); }}
                          role="button"
                          aria-label="Add condition"
                        >
                          <PlusIcon size={16} />
                        </div>
                      );
                    })}

                    {/* AND/OR badge — between slot 0 and slot 1 when both are visible (empty state) */}
                    {remainingSlots >= 2 && (
                      <div
                        className={styles.groupAndOrBadge}
                        style={{
                          left: GROUP_PAD_X + NODE_W + (SIBLING_PITCH_G - NODE_W) / 2,
                          top: GROUP_PAD_TOP + bodyHeight / 2,
                        }}
                      >
                        {group.operator === 'AND' ? 'And' : 'Or'}
                      </div>
                    )}

                    {/* AND/OR badges between adjacent member nodes */}
                    {sortedMembers.length > 1 && sortedMembers.slice(0, -1).map((nodeA, i) => {
                      const nodeB = sortedMembers[i + 1];
                      const posA  = nodePositions[nodeA.id];
                      const posB  = nodePositions[nodeB.id];
                      if (!posA || !posB) return null;
                      const badgeX = (posA.x - left) + NODE_W + (posB.x - posA.x - NODE_W) / 2;
                      const badgeY = GROUP_PAD_TOP + bodyHeight / 2;
                      return (
                        <div
                          key={`badge-${nodeA.id}`}
                          className={styles.groupAndOrBadge}
                          style={{ left: badgeX, top: badgeY }}
                        >
                          {group.operator === 'AND' ? 'And' : 'Or'}
                        </div>
                      );
                    })}

                    {/* AND/OR badge between last member and remaining placeholder slot (1 member) */}
                    {filledCount === 1 && remainingSlots === 1 && (() => {
                      const lastPos = nodePositions[sortedMembers[0].id];
                      if (!lastPos) return null;
                      const badgeX = (lastPos.x - left) + NODE_W + (SIBLING_PITCH_G - NODE_W) / 2;
                      const badgeY = GROUP_PAD_TOP + bodyHeight / 2;
                      return (
                        <div
                          className={styles.groupAndOrBadge}
                          style={{ left: badgeX, top: badgeY }}
                        >
                          {group.operator === 'AND' ? 'And' : 'Or'}
                        </div>
                      );
                    })()}

                    <div className={clsx(styles.anchor, styles.anchorTop)} data-anchor="top" data-anchor-group-id={group.id} />
                    <div className={clsx(styles.anchor, styles.anchorBottom)} data-anchor="bottom" data-anchor-group-id={group.id} />
                  </div>
                );
              });

              return rendered;
            })()}

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
                  data-drag-target={draggingOverNodeId === node.id ? 'true' : undefined}
                  data-in-group={node.branchGroupId ? 'true' : undefined}
                >
                  {/* Top anchor — non-trigger, non-grouped nodes only (grouped nodes use group-level anchor) */}
                  {node.type !== 'trigger' && !node.branchGroupId && (
                    <div
                      className={clsx(styles.anchor, styles.anchorTop)}
                      data-anchor="top"
                      data-anchor-node-id={node.id}
                    />
                  )}


                  <FlowNode
                    step={node}
                    isSelected={node.id === selectedId}
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
                    groupSiblings={node.branchGroupId
                      ? nodes
                          .filter(n => n.branchGroupId === node.branchGroupId)
                          .sort((a, b) => (nodePositions[a.id]?.x ?? 0) - (nodePositions[b.id]?.x ?? 0))
                      : undefined}
                    onUpdateBranchValues={onUpdateBranchValues}
                    onUpdateBranchConfig={onUpdateBranchConfig}
                    onDeleteBranch={nodeId => onDeleteNode(nodeId)}
                    onUpdateBranchMode={onUpdateBranchMode ? (mode) => onUpdateBranchMode(node.id, mode) : undefined}
                    onAddBranchValue={onAddBranchValue ? () => onAddBranchValue(node.id) : undefined}
                    onRemoveBranchValue={onRemoveBranchValue ? (idx) => onRemoveBranchValue(node.id, idx) : undefined}
                    onUpdateConditionBranch={onUpdateConditionBranch ? (idx, op, val) => onUpdateConditionBranch(node.id, idx, op, val) : undefined}
                    hasOutgoingConnections={edges.some(e => e.from === node.id)}
                    triggerLabel={nodes.find(n => n.type === 'trigger')?.selectedValue}
                    onSaveNodePopover={onSaveNodePopover}
                  />

                  {/* Bottom anchor / output ports — non-grouped nodes only.
                      Standalone condition nodes show the single default anchor
                      until a branch mode (yes/no or multi-value) is configured,
                      at which point the labeled output ports take over. */}
                  {!node.branchGroupId && (node.type !== 'condition' || !node.branchMode) && (
                    <div
                      className={clsx(styles.anchor, styles.anchorBottom)}
                      data-anchor="bottom"
                      data-anchor-node-id={node.id}
                    />
                  )}
                  {/* Labeled output ports for standalone condition nodes — only when branch mode is configured */}
                  {!node.branchGroupId && node.type === 'condition' && node.branchMode && (() => {
                    const cases = node.branchMode === 'yes-no'
                      ? ['Yes', 'No']
                      : (node.conditionBranches ?? []).map(b => b.value).filter(Boolean);
                    if (cases.length === 0) return null;
                    // FIX 3: track which handles are already connected
                    const connectedCases = new Set(
                      edges.filter(e => e.from === node.id && e.branch).map(e => e.branch!)
                    );
                    return (
                      <div className={styles.nodeOutputPorts}>
                        {cases.map((label, i) => {
                          const isConnected = connectedCases.has(label);
                          return (
                            <div key={i} className={styles.outputPortWrap}>
                              {/* outputPortHandle is intentionally NOT .anchor — avoids CSS cascade conflict */}
                              <div
                                className={styles.outputPortHandle}
                                data-anchor="bottom"
                                data-anchor-node-id={node.id}
                                data-anchor-case={label}
                              />
                              {/* FIX 3: hide label when this handle has a live connection */}
                              {!isConnected && (
                                <span className={styles.outputPortLabel}>{label}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              );
            })}

            {/* ── Floating AI input below selected node ── */}
            {selectedId && !pendingEdge && (() => {
              const pos          = nodePositions[selectedId];
              const selectedNode = nodes.find(n => n.id === selectedId);
              if (!pos || !selectedNode) return null;

              // For branch groups: center the AI prompt below the whole group,
              // not below the individual selected node.
              let aiLeft = pos.x + NODE_W / 2;
              let aiTop  = pos.y + selectedNodeH + 8;
              if (selectedNode.branchGroupId) {
                const groupNodes = nodes.filter(n => n.branchGroupId === selectedNode.branchGroupId);
                if (groupNodes.length >= 2) {
                  const sorted = [...groupNodes].sort(
                    (a, b) => (nodePositions[a.id]?.x ?? 0) - (nodePositions[b.id]?.x ?? 0)
                  );
                  const lPos = nodePositions[sorted[0].id];
                  const rPos = nodePositions[sorted[sorted.length - 1].id];
                  if (lPos && rPos) {
                    aiLeft = (lPos.x + rPos.x + NODE_W) / 2;
                    aiTop  = lPos.y + selectedNodeH + 8; // all siblings at same Y
                  }
                }
              }

              return (
                <NodeAiFloatingInput
                  key={selectedId}
                  step={selectedNode}
                  left={aiLeft}
                  top={aiTop}
                  onSubmit={(message, nodeType) => onNodeAiSubmit?.(message, nodeType)}
                />
              );
            })()}

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
          {(['trigger', 'condition', 'action', 'ai', 'delay', 'policy'] as StepType[]).map(type => {
            const cfg = STEP_CONFIG[type];
            return (
              <button
                key={type}
                className={clsx(styles.typePickerBtn, cfg.bgClass)}
                onClick={() => {
                  onCreateNodeAt(type, typePickerPos.canvasX, typePickerPos.canvasY);
                  setTypePickerPos(null);
                }}
                title={cfg.label}
              >
                {cfg.icon}
              </button>
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
          {(edgeDragDrop.fromNodeType === 'action'
            ? ['action'] as StepType[]
            : edgeDragDrop.fromNodeType === 'delay'
              ? ['condition', 'action', 'ai'] as StepType[]  // Delay→Delay is disallowed
              : ['condition', 'action', 'ai', 'delay'] as StepType[]
          ).map(type => {
            const cfg = STEP_CONFIG[type];
            return (
              <button
                key={type}
                className={clsx(styles.typePickerBtn, cfg.bgClass)}
                onClick={() => {
                  onCreateNodeAndConnect(edgeDragDrop.fromNodeId, type, edgeDragDrop.canvasX, edgeDragDrop.canvasY, edgeDragDrop.fromCase);
                  setEdgeDragDrop(null);
                }}
                title={cfg.label}
              >
                {cfg.icon}
              </button>
            );
          })}
        </div>,
        document.body,
      )}

      {/* Group right panel — shown when a condition group is selected */}
      {selectedGroupId && (() => {
        const selGroup = conditionGroups.find(g => g.id === selectedGroupId);
        if (!selGroup) return null;
        const groupMembers = nodes
          .filter(n => n.branchGroupId === selectedGroupId)
          .sort((a, b) => (nodePositions[a.id]?.x ?? 0) - (nodePositions[b.id]?.x ?? 0));
        const atLimit = groupMembers.length >= MAX_GROUP_CONDITIONS;
        return createPortal(
          <div className={styles.rightPanel} style={{ width: 360 }}>
            <div className={styles.groupPanel}>
              <div className={styles.groupPanelHeader}>
                <span className={styles.groupPanelHeaderTitle}>Condition Group</span>
                <button
                  type="button"
                  className={styles.groupPanelCloseBtn}
                  onClick={() => setSelectedGroupId(null)}
                  aria-label="Close"
                >
                  <XIcon size={14} />
                </button>
              </div>
              <div className={styles.groupPanelBody}>
                <label className={styles.groupPanelLabel} htmlFor={`grp-op-${selectedGroupId}`}>
                  Logic operator
                </label>
                <select
                  id={`grp-op-${selectedGroupId}`}
                  className={styles.groupPanelSelect}
                  value={selGroup.operator}
                  onChange={e => onUpdateGroupOperator(selGroup.id, e.target.value as 'AND' | 'OR')}
                >
                  <option value="AND">AND — all conditions must match</option>
                  <option value="OR">OR — any condition must match</option>
                </select>

                <div className={styles.groupPanelSection}>
                  <span className={styles.groupPanelLabel}>
                    Conditions {groupMembers.length > 0 && `(${groupMembers.length}/${MAX_GROUP_CONDITIONS})`}
                  </span>
                  <div className={styles.groupPanelList}>
                    {groupMembers.length === 0 ? (
                      <div className={styles.groupPanelEmpty}>No conditions added yet</div>
                    ) : (
                      groupMembers.map((member, i) => (
                        <button
                          key={member.id}
                          type="button"
                          className={styles.groupPanelListItem}
                          onClick={() => { onSelectNode(member.id); setSelectedGroupId(null); }}
                        >
                          <span className={styles.groupPanelListIndex}>{i + 1}</span>
                          <span className={styles.groupPanelListLabel}>
                            {member.configured && member.label ? member.label : 'Empty condition'}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  {!atLimit && (
                    <button
                      type="button"
                      className={styles.groupPanelAddBtn}
                      onClick={() => onAddConditionToGroup(selGroup.id)}
                    >
                      <PlusIcon size={14} />
                      Add condition
                    </button>
                  )}
                  {atLimit && (
                    <p className={styles.groupPanelLimitNote}>
                      Maximum {MAX_GROUP_CONDITIONS} conditions reached
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.groupPanelDeleteBtn}
                  onClick={() => { onDeleteConditionGroup(selGroup.id); setSelectedGroupId(null); }}
                >
                  Delete group
                </button>
              </div>
            </div>
          </div>,
          document.body,
        );
      })()}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

let _nextId = 100;

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

export function BuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [name, setName] = useState(isNew ? 'Untitled workflow' : 'Candidate Onboarding');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [status] = useState<AutomationStatus>('draft');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [nodes, setNodes] = useState<GraphNode[]>(isNew ? INIT_NODES_NEW : INIT_NODES_EDIT);
  const [edges, setEdges] = useState<GraphEdge[]>(isNew ? [] : INIT_EDGES_EDIT);

  // ── Free-positioning: store each node's canvas coordinates ──
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const initNodes = isNew ? INIT_NODES_NEW : INIT_NODES_EDIT;
    const initEdges = isNew ? [] : INIT_EDGES_EDIT;
    const layout    = computeLayout(initNodes, initEdges);
    const result: Record<string, { x: number; y: number }> = {};
    layout.forEach((pos, id) => { result[id] = pos; });
    return result;
  });

  const [selectedId,      setSelectedId]      = useState<string | null>(isNew ? 'trigger-1' : null);
  const [draggingLibNode, setDraggingLibNode] = useState<LibraryItem | null>(null);
  const [autoTidyToken,   setAutoTidyToken]   = useState(0);
  const [fitToken,        setFitToken]        = useState(0);
  const [editNodeMode,    setEditNodeMode]    = useState(false);
  const [editingNodeIds,  setEditingNodeIds]  = useState<Set<string>>(new Set());
  const [saveState,       setSaveState]       = useState<SaveState>('idle');
  const [globalAiPrompt,  setGlobalAiPrompt]  = useState('');
  const [threadEntries, setThreadEntries] = useState<ThreadEntry[]>([]);
  const [aiTyping, setAiTyping] = useState(false);

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
    const delay = 900 + Math.random() * 900;
    aiTypingTimerRef.current = window.setTimeout(() => {
      // Pick the next line in the bank, skipping the same index as last time
      // so two reactions for the same event type never repeat verbatim.
      const prevIdx = aiReactionIdxRef.current[bankKey] ?? -1;
      const idx = bank.length > 1
        ? (prevIdx + 1) % bank.length
        : 0;
      aiReactionIdxRef.current[bankKey] = idx;
      setThreadEntries(prev => [...prev, {
        id: crypto.randomUUID(),
        kind: 'ai',
        content: bank[idx],
        timestamp: Date.now(),
      }]);
      setAiTyping(false);
    }, delay);
  }, []);

  const logActivity = useCallback((content: string, bankKey?: string) => {
    appendThreadEntry({ kind: 'activity', content });
    if (bankKey && AI_RESPONSES[bankKey]) {
      scheduleAiReaction(AI_RESPONSES[bankKey], bankKey);
    }
  }, [appendThreadEntry, scheduleAiReaction]);

  // Welcome message — appended once when the thread is empty on mount.
  useEffect(() => {
    setThreadEntries(prev => prev.length === 0
      ? [{ id: crypto.randomUUID(), kind: 'ai', content: WELCOME_AI_MESSAGE, timestamp: Date.now() }]
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
  const isMount = useRef(true);
  useEffect(() => {
    if (isMount.current) { isMount.current = false; return; }
    if (saveTimer.current)  clearTimeout(saveTimer.current);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(() => {
      setSaveState('saved');
      savedTimer.current = setTimeout(() => setSaveState('idle'), 2500);
    }, 1200);
    return () => {
      if (saveTimer.current)  clearTimeout(saveTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, [name, description, status, nodes, edges, tags]);

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

  const makeNode = (type: StepType): GraphNode => ({
    id: `${type}-${++_nextId}`,
    type,
    label: `Add a ${type}`,
    placeholder: {
      trigger:   'Search events',
      condition: 'Search condition',
      action:    'Search actions',
      ai:        'Describe AI task',
      delay:     'Set delay...',
      policy:    'Select policies...',
    }[type],
    configured: false,
    ...(type === 'ai' ? { selectedValue: 'AI Specialist', configured: true } : {}),
    ...(type === 'delay' ? { configValues: { unit: 'minutes' } } : {}),
    ...(type === 'policy' ? {
      configValues: { thresholdValue: '50', thresholdMode: 'score' },
    } : {}),
  });

  /** Add a new node connected after parentId (null = new root/workflow). */
  const addNodeAfter = (
    parentId: string | null,
    type: StepType,
    branch?: 'yes' | 'no',
    selectedValue?: string,
  ) => {
    if (!canAddNodeAfter(parentId, type, nodes, edges)) return;
    const n = makeNode(type);
    if (selectedValue) { n.selectedValue = selectedValue; n.configured = true; }

    // Compute initial canvas position for the new node
    const parentPos = parentId ? nodePositions[parentId] : null;
    let initX: number, initY: number;
    if (parentId === null) {
      // New root trigger — place to the right of all existing nodes
      const xs = Object.values(nodePositions).map(p => p.x);
      initX = xs.length > 0 ? Math.max(...xs) + H_SPACING : 0;
      initY = CANVAS_TOP;
    } else if (parentPos) {
      // Below parent, shifted left/right for yes/no branches
      const branchOffset = branch === 'no' ? NODE_W * 0.8 : branch === 'yes' ? -(NODE_W * 0.8) : 0;
      initX = parentPos.x + branchOffset;
      initY = parentPos.y + V_SPACING;
    } else {
      initX = 0; initY = CANVAS_TOP;
    }
    setNodePositions(prev => ({ ...prev, [n.id]: { x: initX, y: initY } }));

    setNodes(prev => [...prev, n]);
    if (parentId !== null) {
      const e: GraphEdge = { id: `edge-${++_nextId}`, from: parentId, to: n.id, branch };
      setEdges(prev => [...prev, e]);
    }
    setSelectedId(n.id);
    logActivity(
      `${STEP_CONFIG[type].label} added${selectedValue ? ` \u2014 ${selectedValue}` : ''}`,
      `add_${type}`,
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

  // Each condition node — whether grouped or standalone — is its own independent
  // unit. Updates never bleed into sibling group members: two conditions in the
  // same group can check entirely different fields.
  // NOTE: activity logging for config changes is deferred until the user
  // clicks Save in the right panel (see handleSaveNodePopover). This keeps
  // the state mutation silent while the popover is open.
  const updateNode = (id: string, selectedValue: string) =>
    setNodes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const condDef = n.type === 'condition'
        ? CONDITION_LIBRARY.find(c => c.label === selectedValue) ?? null
        : null;
      // Clearing an Action (selectedValue === '') also resets its configValues so
      // stale fields from the previous action don't bleed into the next selection.
      const clearing = selectedValue === '';
      return {
        ...n,
        selectedValue,
        configured: !clearing,
        configValues: clearing && n.type === 'action' ? {} : n.configValues,
        conditionOperator: condDef
          ? (n.conditionOperator ?? condDef.operators[0])
          : n.conditionOperator,
        conditionValues: condDef
          ? (n.conditionValues ?? [])
          : n.conditionValues,
      };
    }));

  const updateConditionConfig = (id: string, op: string, vals: string[]) =>
    setNodes(prev => prev.map(n =>
      n.id === id ? { ...n, conditionOperator: op, conditionValues: vals } : n,
    ));

  /** Update a single branch node's conditionValues without touching any sibling. */
  const updateBranchValues = (nodeId: string, vals: string[]) =>
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, conditionValues: vals } : n));

  /** Update a single branch node's operator+values without syncing across the group. */
  const updateBranchConfig = (nodeId: string, op: string, vals: string[]) =>
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, conditionOperator: op, conditionValues: vals } : n
    ));

  /** Set the output branch mode for a standalone condition node. Pass '' to clear. */
  const updateBranchMode = (nodeId: string, mode: 'yes-no' | 'multi-value' | '') => {
    setEdges(prev => prev.filter(e => e.from !== nodeId));
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      const condDef = CONDITION_LIBRARY.find(c => c.label === n.selectedValue);
      const defaultOp = condDef?.operators[0] ?? 'equals';
      return {
        ...n,
        branchMode: mode === '' ? undefined : mode,
        // Auto-populate first empty branch when switching to multi-value
        conditionBranches: mode === 'multi-value'
          ? (n.conditionBranches?.length ? n.conditionBranches : [{ operator: n.conditionOperator ?? defaultOp, value: '' }])
          : n.conditionBranches,
      };
    }));
  };

  /** Add a new empty branch entry to a multi-value condition node. */
  const addBranchValue = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const condDef = CONDITION_LIBRARY.find(c => c.label === node.selectedValue);
    const defaultOp = condDef?.operators[0] ?? 'equals';
    setNodes(prev => prev.map(n =>
      n.id === nodeId
        ? { ...n, conditionBranches: [...(n.conditionBranches ?? []), { operator: defaultOp, value: '' }] }
        : n
    ));
  };

  /** Remove a branch entry from a multi-value condition node, and disconnect any edge using that branch's value label. */
  const removeBranchValue = (nodeId: string, index: number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const branches = node.conditionBranches ?? [];
    const removedVal = branches[index]?.value;
    if (removedVal) {
      setEdges(prev => prev.filter(e => !(e.from === nodeId && e.branch === removedVal)));
    }
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, conditionBranches: branches.filter((_, i) => i !== index) } : n
    ));
  };

  /** Update a specific branch entry's operator and/or value. Disconnects edge if value label changes. */
  const updateConditionBranch = (nodeId: string, index: number, operator: string, value: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      const branches = [...(n.conditionBranches ?? [])];
      const old = branches[index];
      if (old && old.value && old.value !== value) {
        // Value (= handle label) changed — disconnect edge that was wired to old label
        setEdges(ep => ep.filter(e => !(e.from === nodeId && e.branch === old.value)));
      }
      branches[index] = { operator, value };
      return { ...n, conditionBranches: branches };
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
        return {
          ...n,
          configValues: nextVals,
          selectedValue: summary ?? undefined,
          configured:    summary !== null,
        };
      }
      return { ...n, configValues: nextVals };
    }));

  const duplicateNode = (id: string) => {
    const src = nodes.find(n => n.id === id);
    if (!src) return;
    const copy: GraphNode = { ...src, id: `${src.type}-${++_nextId}` };
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
      logActivity(`${label} deleted${target.selectedValue ? ` \u2014 ${target.selectedValue}` : ''}`, 'delete');
    }
  };

  /** Insert a new node on an existing edge, splitting it into two edges. */
  const insertOnEdge = (edge: GraphEdge, type: StepType, value?: string) => {
    const n = makeNode(type);
    if (value) { n.selectedValue = value; n.configured = true; }

    // Position new node at midpoint between the two connected nodes
    const fromPos = nodePositions[edge.from];
    const toPos   = nodePositions[edge.to];
    const initX   = fromPos && toPos ? (fromPos.x + toPos.x) / 2 : 0;
    const initY   = fromPos && toPos ? (fromPos.y + NODE_H + toPos.y) / 2 : CANVAS_TOP;
    setNodePositions(prev => ({ ...prev, [n.id]: { x: initX, y: initY } }));

    // Replace old edge with two new edges: from→new, new→to
    const e1: GraphEdge = { id: `edge-${++_nextId}`, from: edge.from, to: n.id,   branch: edge.branch };
    const e2: GraphEdge = { id: `edge-${++_nextId}`, from: n.id,     to: edge.to  };
    setEdges(prev => [...prev.filter(e => e.id !== edge.id), e1, e2]);
    setNodes(prev => [...prev, n]);
    setSelectedId(n.id);
  };

  // ── Add edge between two existing nodes ──
  // Validation (getConnectionError) is performed by the sole caller in the
  // drag-drop MouseUp handler, which has the context to know when the target
  // was resolved through a group-drop and should bypass the
  // "can't connect to a group child" rule. Re-running the strict check here
  // would reject legitimate group drops.
  const addEdge = (fromNodeId: string, toNodeId: string, branch?: string) => {
    if (edges.some(e => e.from === fromNodeId && e.to === toNodeId)) return;
    // Silent rejection (e.g. delay → delay): no toast, no edge
    if (isConnectionSilentlyBlocked(fromNodeId, toNodeId, nodes)) return;
    // FIX 1 & 2: each labeled handle (yes/no) may only have one outgoing edge
    if (branch && edges.some(e => e.from === fromNodeId && e.branch === branch)) return;
    setEdges(prev => [...prev, { id: `edge-${++_nextId}`, from: fromNodeId, to: toNodeId, ...(branch ? { branch } : {}) }]);
    const fromNode = nodes.find(n => n.id === fromNodeId);
    const toNode   = nodes.find(n => n.id === toNodeId);
    if (fromNode && toNode) {
      logActivity(
        `${STEP_CONFIG[fromNode.type].label} connected to ${STEP_CONFIG[toNode.type].label}`,
        'connect',
      );
    }
  };

  // ── Remove an existing edge ──
  const deleteEdge = (edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    if (edge) {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode   = nodes.find(n => n.id === edge.to);
      if (fromNode && toNode) {
        logActivity(
          `Connection between ${STEP_CONFIG[fromNode.type].label} and ${STEP_CONFIG[toNode.type].label} removed`,
          'disconnect',
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
   * Save button. Emits a single activity entry summarizing the node's current
   * state (plus an AI reaction) — regardless of how many field edits led up
   * to it. Fields-in-flight don't log until the user explicitly hits Save.
   */
  const handleSaveNodePopover = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const label = STEP_CONFIG[node.type].label;
    const segs = buildNodeSnippet(node);
    const summary = segs ? segs.map(s => s.text).join('').trim() : node.selectedValue;
    const content = summary ? `${label} configured \u2014 ${summary}` : `${label} saved`;
    logActivity(content, 'configure');
  }, [nodes, logActivity]);

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
    logActivity(`${STEP_CONFIG[type].label} added`, `add_${type}`);
  };

  const createNodeAndConnect = (fromId: string, type: StepType, x: number, y: number, branch?: string | null) => {
    const n = makeNode(type);
    setNodePositions(prev => ({ ...prev, [n.id]: { x: x - NODE_W / 2, y: y - NODE_H / 2 } }));
    setNodes(prev => [...prev, n]);
    const edge: GraphEdge = { id: `edge-${++_nextId}`, from: fromId, to: n.id, ...(branch ? { branch } : {}) };
    setEdges(prev => [...prev, edge]);
    setSelectedId(n.id);
    logActivity(`${STEP_CONFIG[type].label} added`, `add_${type}`);
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
    logActivity(
      `${STEP_CONFIG[item.type].label} added${item.label ? ` \u2014 ${item.label}` : ''}`,
      `add_${item.type}`,
    );
  };

  const updateNodePosition = (id: string, x: number, y: number) => {
    setNodePositions(prev => ({ ...prev, [id]: { x, y } }));
  };

  return (
    <div className={styles.page}>
      <TopBar
        onBack={() => navigate('/automations')}
        onTest={() => {}}
        onPublish={() => {}}
        saveState={saveState}
        name={name}
        onNameChange={setName}
        status={status}
        onSettingsOpen={() => setSettingsOpen(true)}
      />

      <WorkflowSettingsDialog
        open={settingsOpen}
        name={name}
        description={description}
        tags={tags}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSettingsSave}
      />

      <div className={styles.body}>
        <LeftPanel
          onLibNodeDragStart={(item) => setDraggingLibNode(item)}
          onLibNodeDragEnd={() => setDraggingLibNode(null)}
          onLibNodeSelect={(item) => { handleCanvasDropAtPos(item, 0, CANVAS_TOP); setSelectedId(null); }}
          editNodeMode={editNodeMode}
          editingCount={editingNodeIds.size}
          onToggleEditMode={toggleEditMode}
          aiPrompt={globalAiPrompt}
          onAiPromptChange={setGlobalAiPrompt}
          aiTyping={aiTyping}
          entries={threadEntries}
          onAiSend={handleGlobalAiSend}
        />

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
          editNodeMode={editNodeMode}
          editingNodeIds={editingNodeIds}
          onEditNodeToggle={handleEditNodeToggle}
          onUpdateBranchValues={updateBranchValues}
          onUpdateBranchConfig={updateBranchConfig}
          onUpdateBranchMode={updateBranchMode}
          onAddBranchValue={addBranchValue}
          onRemoveBranchValue={removeBranchValue}
          onUpdateConditionBranch={updateConditionBranch}
          autoTidyToken={autoTidyToken}
          fitToken={fitToken}
          onNodeAiSubmit={handleNodeAiSubmit}
          onSaveNodePopover={handleSaveNodePopover}
        />
      </div>
    </div>
  );
}
