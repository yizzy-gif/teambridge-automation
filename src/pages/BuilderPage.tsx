import { useState, useRef, useEffect, useCallback } from 'react';
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
import { SearchField, TextField, TextArea, NumberField } from '@alloy/components/Input';
import inputStyles from '@alloy/components/Input/Input.module.css';
import dropdownStyles from '@alloy/components/DropdownMenu/DropdownMenu.module.css';
import { Target04Icon } from '@alloy/components/icons/Target04Icon';
import { GitBranch01Icon } from '@alloy/components/icons/GitBranch01Icon';
import { ArrowCircleBrokenRightIcon } from '@alloy/components/icons/ArrowCircleBrokenRightIcon';
import { ChevronDownIcon } from '@alloy/components/icons/ChevronDownIcon';
import { Grid01Icon } from '@alloy/components/icons/Grid01Icon';
import { XIcon } from '@alloy/components/icons/XIcon';
import { ScrollArea } from '@alloy/components/ScrollArea';
import styles from './BuilderPage.module.css';

// ─── Types ─────────────────────────────────────────────────────────────────────

type StepType = 'trigger' | 'condition' | 'action' | 'ai';
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
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  branch?: 'yes' | 'no';
}

// Alias kept so FlowNode component compiles without changes
type FlowStep = GraphNode;

// ─── Icons ──────────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.4"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}



function SparkleIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 1c-.4 1.7-1.7 2.6-3 3 1.3.4 2.6 1.3 3 3 .4-1.7 1.7-2.6 3-3-1.3-.4-2.6-1.3-3-3Z"
        stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
      <path d="M2.5 8.5c-.2.9-1 1.1-1.2 1.2.2 0 1 .3 1.2 1.2.2-.9 1-1.1 1.2-1.2-.2 0-1-.3-1.2-1.2Z"
        stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round"/>
    </svg>
  );
}

function PlusIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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
  ai:        { icon: <SparkleIcon />,                           label: 'AI',        bgClass: styles.iconAi        },
};

const NODE_TYPE_TAG_COLOR: Record<StepType, TagColor> = {
  trigger:   'orange',
  condition: 'blue',
  action:    'green',
  ai:        'purple',
};

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
  const outCount = edges.filter(e => e.from === parentId).length;
  // Condition nodes can have at most 2 branches (yes / no)
  if (parent.type === 'condition' && outCount >= 2) return false;
  // All other node types support exactly one outgoing edge
  if (parent.type !== 'condition' && outCount >= 1) return false;
  return true;
}

// ─── Layout constants ──────────────────────────────────────────────────────────

const NODE_W        = 200;
const NODE_H        = 130;   // approximate rendered card height (actual ~132px)
const H_SPACING     = 300;   // centre-to-centre column pitch
const V_SPACING     = 210;   // centre-to-centre row pitch (~80px gap between cards)
const CANVAS_TOP    = 48;    // initial top padding
const LEFT_PANEL_W  = 360;   // left panel width — pan offset so content starts in visible area
// With graphContent at `left: 50%` of viewport the natural center is at ~50% of viewport.
// We offset pan.x by this value so nodes centre in the area to the right of the panel.
const INIT_PAN_X    = 300;   // empirically: root at centreX=140 → viewport x=505 (visible midpoint)

// ─── Layout engine ────────────────────────────────────────────────────────────

/** Compute absolute { x, y } pixel positions for every node in the graph.
 *  Handles: multiple independent roots, branching, and simple merge nodes. */
function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

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

  // Subtree width (used to centre parents above their children)
  const subtreeW = new Map<string, number>();
  const getW = (id: string, seen = new Set<string>()): number => {
    if (subtreeW.has(id)) return subtreeW.get(id)!;
    if (seen.has(id)) return H_SPACING; // cycle guard
    seen.add(id);
    const children = out.get(id) ?? [];
    const total = children.length === 0
      ? H_SPACING
      : children.reduce((s, c) => s + getW(c, new Set(seen)), 0);
    const w = Math.max(H_SPACING, total);
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

  let rootCentreX = 0;
  for (const root of roots) {
    const w = subtreeW.get(root.id) ?? H_SPACING;
    place(root.id, rootCentreX + w / 2);
    rootCentreX += w + H_SPACING; // extra gap between independent workflows
  }

  return positions;
}

// ─── Popover data ──────────────────────────────────────────────────────────────

const POPOVER_TITLES: Record<StepType, string> = {
  trigger:   'Choose a trigger',
  condition: 'Add a condition',
  action:    'Choose an action',
  ai:        'Configure AI step',
};

const POPOVER_SUGGESTIONS: Record<StepType, string[]> = {
  trigger:   ['Something is created', 'Button clicked', 'Task completed', 'Shift scheduled to start', 'User clocks in to shift'],
  condition: ['Status', 'Assignee', 'Start Time', 'Regular Pay Rate', 'Roles'],
  action:    ['Send email', 'Send one-way SMS', 'Clock in', 'Assign task', 'Modify'],
  ai:        ['AI Specialist'],
};

const AI_PLACEHOLDERS: Record<StepType, string> = {
  trigger:   'Describe what should kick off this automation…',
  condition: 'Describe the condition you want to check…',
  action:    'Describe what you want this step to do…',
  ai:        'Describe what the AI should do with the data…',
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

// ─── NodePopover ─────────────────────────────────────────────────────────────────

interface NodePopoverProps {
  step: FlowStep;
  onSelectSuggestion: (value: string) => void;
  onUpdateConditionConfig: (op: string, vals: string[]) => void;
  onUpdateConfigField: (key: string, value: string) => void;
  onClose: () => void;
}

function NodePopover({ step, onSelectSuggestion, onUpdateConditionConfig, onUpdateConfigField, onClose }: NodePopoverProps) {
  const cfg = STEP_CONFIG[step.type];
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const handleAiSend = () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResult(null);
    setTimeout(() => {
      setAiResult(`Try: "${aiPrompt.trim()}" — add a matching ${step.type} from the suggestions above.`);
      setAiLoading(false);
    }, 1400);
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
            {cfg.icon}
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

      {/* ── 2. Name + Suggested ── */}
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

      {/* ── 4. Configuration — only when node is configured ── */}
      {!isEmpty && (
        <>
          <div className={styles.popoverDivider} />
          <div className={styles.popoverSection}>
            <p className={styles.popoverSectionLabel}>Configuration</p>

            {/* ── Trigger config fields ─────────────────────────────────── */}
            {step.type === 'trigger' && (() => {
              const libItem = ALL_LIBRARY_ITEMS.find(i => i.label === step.selectedValue);
              const fields  = libItem ? (NODE_CONFIG[libItem.id] ?? []) : [];
              const vals    = step.configValues ?? {};
              if (fields.length === 0) return (
                <p className={styles.popoverConfigPlaceholder}>
                  No additional configuration for this trigger.
                </p>
              );
              return (
                <div className={styles.popoverFields}>
                  {fields.map(field => {
                    // Visibility: hide when dependsOn value matches hideWhenDependsOnIs
                    if (field.hideWhenDependsOnIs && field.dependsOn) {
                      if (vals[field.dependsOn] === field.hideWhenDependsOnIs) return null;
                    }
                    // Resolve options: static or dependent
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
                            options={[
                              { value: '', label: `Select ${field.label.toLowerCase()}…` },
                              ...opts.map(o => ({ value: o, label: o })),
                            ]}
                          />
                        </div>
                      );
                    }
                    if (field.type === 'time') {
                      return (
                        <div key={field.key} className={styles.popoverFieldRow}>
                          <label className={styles.popoverFieldLabel}>{field.label}</label>
                          <input
                            type="time"
                            className={styles.popoverTimeInput}
                            value={currentVal}
                            onChange={e => onUpdateConfigField(field.key, e.target.value)}
                            aria-label={field.label}
                          />
                        </div>
                      );
                    }
                    return (
                      <TextField
                        key={field.key}
                        size="md"
                        label={field.label}
                        value={currentVal}
                        onChange={e => onUpdateConfigField(field.key, e.target.value)}
                        aria-label={field.label}
                      />
                    );
                  })}
                </div>
              );
            })()}

            {/* ── Condition config fields ───────────────────────────────── */}
            {step.type === 'condition' && (condDef ? (
              <div className={styles.popoverFields}>
                {/* Operator selector */}
                <PopoverSelect
                  value={condOp}
                  onChange={op => onUpdateConditionConfig(op, condVals)}
                  options={condDef.operators.map(op => ({ value: op, label: OPERATOR_LABELS[op] ?? op }))}
                />

                {!isNoValueOp && isInOp && condDef.valueOptions && (
                  <div className={styles.popoverTags}>
                    {condDef.valueOptions.map(opt => {
                      const selected = condVals.includes(opt);
                      return (
                        <button
                          key={opt}
                          className={clsx(styles.popoverTag, selected && styles.popoverTagSelected)}
                          onClick={() => onUpdateConditionConfig(condOp, selected ? condVals.filter(v => v !== opt) : [...condVals, opt])}
                          type="button"
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {!isNoValueOp && isInOp && !condDef.valueOptions && (
                  <ConditionTagInput values={condVals} onChange={next => onUpdateConditionConfig(condOp, next)} />
                )}

                {!isNoValueOp && isWithinNext && (
                  <div className={styles.conditionWithinNext}>
                    <NumberField
                      size="md"
                      min={1}
                      placeholder="30"
                      value={condVals[0] ?? ''}
                      onChange={e => onUpdateConditionConfig(condOp, [e.target.value, condVals[1] ?? 'days'])}
                      aria-label="Time amount"
                      className={styles.conditionWithinNextNum}
                    />
                    <PopoverSelect
                      value={condVals[1] ?? 'days'}
                      onChange={unit => onUpdateConditionConfig(condOp, [condVals[0] ?? '', unit])}
                      className={styles.conditionWithinNextUnit}
                      options={[
                        { value: 'hours', label: 'hours' },
                        { value: 'days',  label: 'days'  },
                        { value: 'weeks', label: 'weeks' },
                      ]}
                    />
                  </div>
                )}

                {!isNoValueOp && !isInOp && !isWithinNext && condDef.valueOptions && (
                  <PopoverSelect
                    value={condVals[0] ?? ''}
                    onChange={v => onUpdateConditionConfig(condOp, [v])}
                    placeholder="Select value…"
                    options={[
                      { value: '', label: 'Select value…' },
                      ...condDef.valueOptions.map(opt => ({ value: opt, label: opt })),
                    ]}
                  />
                )}

                {!isNoValueOp && !isInOp && !isWithinNext && !condDef.valueOptions && (
                  <TextField
                    size="md"
                    placeholder="Enter value…"
                    value={condVals[0] ?? ''}
                    onChange={e => onUpdateConditionConfig(condOp, [e.target.value])}
                    aria-label="Condition value"
                  />
                )}
              </div>
            ) : (
              <p className={styles.popoverConfigPlaceholder}>
                No additional configuration for this condition.
              </p>
            ))}

            {/* ── Action config fields ──────────────────────────────────── */}
            {step.type === 'action' && (() => {
              const libItem = ALL_LIBRARY_ITEMS.find(i => i.label === step.selectedValue);
              const fields  = libItem ? (NODE_CONFIG[libItem.id] ?? []) : [];
              const vals    = step.configValues ?? {};
              if (fields.length === 0) return (
                <p className={styles.popoverConfigPlaceholder}>
                  No additional configuration for this action.
                </p>
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
                            options={[
                              { value: '', label: `Select ${field.label.toLowerCase() || 'option'}…` },
                              ...opts.map(o => ({ value: o, label: o })),
                            ]}
                          />
                        </div>
                      );
                    }
                    if (field.type === 'textarea') {
                      return (
                        <div key={field.key} className={styles.popoverFieldRow}>
                          {field.label && <label className={styles.popoverFieldLabel}>{field.label}</label>}
                          <TextArea
                            size="md"
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
                          <input
                            type="checkbox"
                            id={`acfg-${field.key}`}
                            className={styles.popoverCheckbox}
                            checked={currentVal === 'true'}
                            onChange={e => onUpdateConfigField(field.key, String(e.target.checked))}
                          />
                          <label htmlFor={`acfg-${field.key}`} className={styles.popoverCheckboxLabel}>
                            {field.label}
                          </label>
                        </div>
                      );
                    }
                    if (field.type === 'multi_add') {
                      const tagVals = currentVal ? currentVal.split(',').map(v => v.trim()).filter(Boolean) : [];
                      return (
                        <div key={field.key} className={styles.popoverFieldRow}>
                          {field.label && <label className={styles.popoverFieldLabel}>{field.label}</label>}
                          <ConditionTagInput
                            values={tagVals}
                            onChange={next => onUpdateConfigField(field.key, next.join(', '))}
                          />
                        </div>
                      );
                    }
                    // text fallback
                    return (
                      <TextField
                        key={field.key}
                        size="md"
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

            {/* ── AI — no config ────────────────────────────────────────── */}
            {step.type === 'ai' && (
              <p className={styles.popoverConfigPlaceholder}>
                No additional configuration for this AI step.
              </p>
            )}
          </div>
        </>
      )}

      {/* ── 5. AI prompt — always ── */}
      <div className={styles.popoverDivider} />
      <div className={styles.popoverSection}>
        <p className={styles.popoverSectionLabel}>AI Suggest</p>
        <div className={styles.popoverAiWrap}>
          <div className={styles.popoverAiInputRow}>
            <TextArea
              size="md"
              placeholder={AI_PLACEHOLDERS[step.type]}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend(); } }}
              className={styles.popoverTextareaField}
            />
            <button
              className={styles.popoverAiSend}
              onClick={handleAiSend}
              disabled={!aiPrompt.trim() || aiLoading}
              aria-label="Send to AI"
            >
              {aiLoading ? <LoadingDots /> : <SparkleIcon size={12} />}
            </button>
          </div>
          {aiResult && <p className={styles.popoverAiResult}>{aiResult}</p>}
        </div>
      </div>

      </div>{/* end popoverBody */}

      {/* ── 6. Footer — Save ── */}
      <div className={styles.popoverFooter}>
        <Button variant="primary" size="sm" onClick={onClose}>
          Save
        </Button>
      </div>
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
}

function TopBar({ onBack, onTest, onPublish, saveState, name, onNameChange, status }: TopBarProps) {
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
        <span className={styles.topBarDivider} aria-hidden="true" />
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
        <Button variant="secondary" size="md" onClick={onTest}>Run test</Button>
        <Button variant="primary"   size="md" onClick={onPublish}>Publish</Button>
      </div>
    </header>
  );
}


// ─── NodePaletteCard ─────────────────────────────────────────────────────────────

type TypeFilter = 'all' | StepType;

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'trigger',   label: 'Trigger'   },
  { value: 'condition', label: 'Condition' },
  { value: 'action',    label: 'Action'    },
  { value: 'ai',        label: 'AI'        },
];

interface NodePaletteCardProps {
  onDragStart: (item: LibraryItem) => void;
  onDragEnd: () => void;
}

function NodePaletteCard({ onDragStart, onDragEnd }: NodePaletteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const isFiltering = search.trim() !== '' || typeFilter !== 'all';

  const filteredItems = ALL_LIBRARY_ITEMS.filter((item) => {
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesSearch = search.trim() === '' ||
      item.label.toLowerCase().includes(search.trim().toLowerCase()) ||
      item.category.toLowerCase().includes(search.trim().toLowerCase());
    return matchesType && matchesSearch;
  });

  const visible = isFiltering ? filteredItems : expanded ? ALL_LIBRARY_ITEMS : PINNED_ITEMS;

  return (
    <div className={styles.paletteCard}>
      <div className={styles.paletteHeader}>
        <SearchField
          size="sm"
          placeholder="Search nodes…"
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          className={styles.paletteSearch}
        />
        <div className={styles.paletteFilters}>
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              className={clsx(
                styles.paletteFilterChip,
                typeFilter === f.value && styles.paletteFilterChipActive,
              )}
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className={styles.paletteList}>
        <div className={styles.paletteListInner}>
          {visible.length === 0 ? (
            <p className={styles.paletteEmpty}>No nodes match</p>
          ) : (
            visible.map((item) => {
              const cfg = STEP_CONFIG[item.type];
              return (
                <div
                  key={item.id}
                  className={styles.paletteItem}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('application/x-lib-node', item.id);
                    onDragStart(item);
                  }}
                  onDragEnd={onDragEnd}
                  title={item.label}
                >
                  <span className={clsx(styles.paletteItemIcon, cfg.bgClass)}>
                    {cfg.icon}
                  </span>
                  <span className={styles.paletteItemContent}>
                    <span className={styles.paletteItemLabel}>{item.label}</span>
                    <span className={styles.paletteItemCategory}>
                      {item.category.replace(/_/g, ' ')}
                    </span>
                  </span>
                  <span className={styles.paletteItemType}>{cfg.label}</span>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
      {!isFiltering && (
        <button className={styles.paletteShowMore} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : `Show ${HIDDEN_ITEMS.length} more`}
        </button>
      )}
    </div>
  );
}

// ─── LeftPanel ───────────────────────────────────────────────────────────────────

interface LeftPanelProps {
  onLibNodeDragStart: (item: LibraryItem) => void;
  onLibNodeDragEnd: () => void;
  editNodeMode: boolean;
  editingCount: number;
  onToggleEditMode: () => void;
}

function LeftPanel({
  onLibNodeDragStart, onLibNodeDragEnd,
  editNodeMode, editingCount, onToggleEditMode,
}: LeftPanelProps) {
  const [aiPrompt,       setAiPrompt]       = useState('');
  const [showEditTooltip, setShowEditTooltip] = useState(false);

  const handleAiSend = () => {
    if (!aiPrompt.trim()) return;
    // TODO: wire to claude-sonnet-4-6
    setAiPrompt('');
  };

  return (
    <aside className={styles.leftPanel}>
      <div className={styles.leftPanelInner}>
        {/* ── Node Palette ── */}
        <NodePaletteCard
          onDragStart={onLibNodeDragStart}
          onDragEnd={onLibNodeDragEnd}
        />

        {/* ── AI Composer ── */}
        <div className={styles.aiComposer}>

          {/* Tooltip — rendered outside aiComposerCard so overflow:hidden doesn't clip it */}
          {showEditTooltip && (
            <div className={styles.aiComposerTooltip} role="tooltip">
              Hold ⌘ to select multiple nodes
            </div>
          )}

          <div className={styles.aiComposerCard}>
            <textarea
              className={styles.aiComposerTextarea}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask AI anything..."
              aria-label="Ask AI"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend(); }
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
              {/* Right group: send */}
              <div className={styles.aiComposerRight}>
                <button
                  className={styles.aiComposerSendBtn}
                  onClick={handleAiSend}
                  disabled={!aiPrompt.trim()}
                  aria-label="Send to AI"
                >
                  <ArrowUpIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
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
}: FlowNodeProps) {
  const cfg = STEP_CONFIG[step.type];
  const outerRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  // Popover visibility is independent from selection — closing popover keeps node selected.
  const [popoverOpen, setPopoverOpen] = useState(false);

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
      setPopoverPos(null);
    }
  }, [isSelected]);

  // Track position via rAF while open — stays aligned during canvas pan/zoom.
  // Popover is suppressed while editNodeMode is active (click = edit-select, not config).
  const showPopover = isSelected && popoverOpen && !isDragging && !editNodeMode;
  useEffect(() => {
    if (!showPopover) { setPopoverPos(null); return; }
    const POPOVER_W = 252;
    const GAP = 12;
    let rafId: number;
    const tick = () => {
      if (outerRef.current) {
        const r = outerRef.current.getBoundingClientRect();
        // Use the left panel's right edge as the canvas's visible left boundary
        const leftPanel = document.querySelector('[class*="leftPanel"]');
        const canvasLeft = leftPanel ? leftPanel.getBoundingClientRect().right + GAP : GAP;
        const fitsRight = r.right + GAP + POPOVER_W <= window.innerWidth;
        const leftIfLeft = r.left - GAP - POPOVER_W;
        const fitsLeft = leftIfLeft >= canvasLeft;
        const nextLeft = fitsRight
          ? r.right + GAP
          : fitsLeft
            ? leftIfLeft
            : canvasLeft;
        const nextTop = Math.min(r.top, window.innerHeight - 420);
        setPopoverPos((prev) => {
          if (prev && prev.top === nextTop && prev.left === nextLeft) return prev;
          return { top: nextTop, left: nextLeft };
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [showPopover]);

  return (
    <div
      ref={outerRef}
      className={clsx(
        styles.flowNodeOuter,
        isSelected && !editNodeMode && styles.flowNodeOuterSelected,
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
      {/* Drag handle — visual grab cursor target; canvas mousedown handler picks up the event */}
      <div className={styles.nodeDragHandle}>
        <GripIcon />
      </div>

      <div className={styles.flowNode}>
        <div className={styles.nodeHeading}>
          {/* Type badge */}
          <span className={clsx(styles.nodeTypeBadge, cfg.bgClass)} aria-label={cfg.label}>
            {cfg.icon}
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

      {/* ··· Dots menu — Alloy DropdownMenu, positioned outside flowNode to escape overflow:hidden */}
      <div
        className={styles.nodeDotsDropdown}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu
          trigger={
            <button
              className={styles.nodeDotsBtn}
              aria-label="Node actions"
            >
              <DotsHorizontalIcon />
            </button>
          }
          groups={dotsMenuGroups}
          placement="bottom-end"
          width={168}
          size="sm"
        />
      </div>

      {/* Config popover — escapes overflow:hidden, tracks node via rAF */}
      {showPopover && popoverPos && createPortal(
        <div
          style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, zIndex: 1000 }}
        >
          <NodePopover
            step={step}
            onSelectSuggestion={(value) => onUpdateStep(value)}
            onUpdateConditionConfig={onUpdateConditionConfig}
            onUpdateConfigField={onUpdateConfigField}
            onClose={() => setPopoverOpen(false)}
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
                  <span className={clsx(styles.paletteItemIcon, cfg.bgClass)}>{cfg.icon}</span>
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
      <button className={styles.emptyStateCta} onClick={onAddTrigger}>
        <PlusIcon />
        Add trigger
      </button>
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
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface TypePickerPos {
  screenX: number;
  screenY: number;
  canvasX: number;
  canvasY: number;
}

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
  onAddEdge: (fromNodeId: string, toNodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onCreateNodeAt: (type: StepType, x: number, y: number) => void;
  onCanvasDropAtPos: (item: LibraryItem, x: number, y: number) => void;
  editNodeMode: boolean;
  editingNodeIds: Set<string>;
  onEditNodeToggle: (id: string, multi: boolean) => void;
}

function FlowCanvas({
  nodes, edges, nodePositions, selectedId, draggingLibNode,
  onSelectNode, onDeselectNode, onUpdateNode, onUpdateNodeCondition, onUpdateNodeConfigField,
  onDuplicateNode, onDeleteNode, onAddRootTrigger,
  onInsertOnEdge, onPositionChange, onSetAllPositions, onAddEdge, onDeleteEdge, onCreateNodeAt, onCanvasDropAtPos,
  editNodeMode, editingNodeIds, onEditNodeToggle,
}: FlowCanvasProps) {
  const canvasRef      = useRef<HTMLDivElement>(null);
  const graphContentRef = useRef<HTMLDivElement>(null);
  const [pan,  setPan]  = useState({ x: INIT_PAN_X, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [, setCanvasDragOver] = useState(false);
  const [isTidying, setIsTidying] = useState(false);
  const [edgeInsert, setEdgeInsert] = useState<{ edge: GraphEdge; anchorRect: DOMRect } | null>(null);
  const [pendingEdge, setPendingEdge] = useState<PendingEdge | null>(null);
  const [typePickerPos, setTypePickerPos] = useState<TypePickerPos | null>(null);
  const [paletteDragPos, setPaletteDragPos] = useState<{ x: number; y: number } | null>(null);

  // Refs so mousemove/mouseup callbacks don't go stale
  const isPanning      = useRef(false);
  const panStart       = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const nodeDragRef    = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const pendingEdgeRef         = useRef<PendingEdge | null>(null);
  const draggingOverNodeIdRef  = useRef<string | null>(null);
  const reconnectingEdgeIdRef  = useRef<string | null>(null);
  const [draggingOverNodeId, setDraggingOverNodeId] = useState<string | null>(null);
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

    // Never start drag/pan from interactive controls or popovers
    if (target.closest('button, input, textarea, select, [data-popover]')) return;

    // Check for edge drag FIRST (drag anywhere on a line to reconnect / disconnect)
    const edgeHandleEl = (target as Element).closest('[data-edge-endpoint]') as Element | null;
    if (edgeHandleEl && graphContentRef.current) {
      const edgeId     = edgeHandleEl.getAttribute('data-edge-endpoint')!;
      const fromNodeId = edgeHandleEl.getAttribute('data-edge-from')!;
      const gc = graphContentRef.current.getBoundingClientRect();
      // Anchor the pending line at the source node's bottom anchor for visual continuity
      const fromAnchorEl = graphContentRef.current.querySelector(
        `[data-anchor-node-id="${fromNodeId}"][data-anchor="bottom"]`
      ) as HTMLElement | null;
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
      const anchorNodeId = anchorEl.dataset.anchorNodeId!;
      const anchorRect = anchorEl.getBoundingClientRect();
      const gc = graphContentRef.current.getBoundingClientRect();
      const startX = (anchorRect.left + anchorRect.width / 2 - gc.left) / zoomRef.current;
      const startY = (anchorRect.top + anchorRect.height / 2 - gc.top) / zoomRef.current;
      pendingEdgeRef.current = { fromNodeId: anchorNodeId, startX, startY, currentX: startX, currentY: startY };
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
      nodeDragRef.current = { id: nodeId, offsetX: mx - pos.x, offsetY: my - pos.y };
      setDraggingNodeId(nodeId);
      onSelectNode(nodeId);
      return;
    }

    // Canvas pan (skip if the target is a button-like focusable role)
    if (target.closest('[role="button"]')) return;
    onDeselectNode();
    isPanning.current = true;
    panStart.current  = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    (e.currentTarget as HTMLElement).dataset.panning = 'true';
  }, [pan, onDeselectNode, nodePositions, onSelectNode, editNodeMode, onEditNodeToggle]);

  // ── MouseMove: draw pending edge OR drag node OR pan canvas ──
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (pendingEdgeRef.current && graphContentRef.current) {
      const gc = graphContentRef.current.getBoundingClientRect();
      const currentX = (e.clientX - gc.left) / zoomRef.current;
      const currentY = (e.clientY - gc.top) / zoomRef.current;
      pendingEdgeRef.current = { ...pendingEdgeRef.current, currentX, currentY };
      setPendingEdge({ ...pendingEdgeRef.current });

      // Track which node the cursor is over so we can show its anchors and use it as the target
      const fromId = pendingEdgeRef.current.fromNodeId;
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
      const fromNodeId       = pendingEdgeRef.current.fromNodeId;
      const targetId         = draggingOverNodeIdRef.current;
      const isReconnect      = reconnectingEdgeIdRef.current !== null;
      let   connectedSuccessfully = false;

      if (targetId && targetId !== fromNodeId) {
        const targetNode = nodes.find(n => n.id === targetId);
        const sourceNode = nodes.find(n => n.id === fromNodeId);
        // Triggers can't be targets; actions/AI can't connect TO conditions
        const blocked =
          !targetNode ||
          targetNode.type === 'trigger' ||
          ((sourceNode?.type === 'action' || sourceNode?.type === 'ai') && targetNode.type === 'condition');

        if (!blocked) {
          if (isReconnect) onDeleteEdge(reconnectingEdgeIdRef.current!);
          onAddEdge(fromNodeId, targetId);
          connectedSuccessfully = true;
        }
      }

      // Released on empty canvas during reconnect → just delete the original edge
      if (isReconnect && !connectedSuccessfully) {
        onDeleteEdge(reconnectingEdgeIdRef.current!);
      }

      pendingEdgeRef.current        = null;
      draggingOverNodeIdRef.current = null;
      reconnectingEdgeIdRef.current = null;
      setPendingEdge(null);
      setDraggingOverNodeId(null);
      return;
    }
    nodeDragRef.current = null;
    setDraggingNodeId(null);
    isPanning.current   = false;
    delete (_e.currentTarget as HTMLElement).dataset.panning;
  }, [onAddEdge, onDeleteEdge, nodes]);

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
    // Only clear when leaving the canvas itself (not entering a child element)
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
  const handleFit     = () => { setZoom(1); setPan({ x: INIT_PAN_X, y: 0 }); };

  // ── Tidy up: re-run layout algorithm, animate cards to their computed positions ──
  const handleTidyUp = () => {
    const layout = computeLayout(nodes, edges);
    const next: Record<string, { x: number; y: number }> = {};
    layout.forEach((pos, id) => { next[id] = pos; });
    setIsTidying(true);
    onSetAllPositions(next);
    setZoom(1);
    setPan({ x: INIT_PAN_X, y: 0 });
    // Remove the tidying flag after the CSS transition completes
    setTimeout(() => setIsTidying(false), 380);
  };

  // ── Anchor position helper — reads DOM for pixel-accurate coordinates ──────────
  // (During render, graphContentRef.current holds the DOM from the *previous* commit,
  //  which has up-to-date anchor positions for all existing nodes.)
  const getAnchorCenter = (nodeId: string, side: 'top' | 'bottom'): { x: number; y: number } | null => {
    if (graphContentRef.current) {
      const el = graphContentRef.current.querySelector(
        `[data-anchor-node-id="${nodeId}"][data-anchor="${side}"]`
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
    return side === 'bottom'
      ? { x: pos.x + NODE_W / 2, y: pos.y + NODE_H }
      : { x: pos.x + NODE_W / 2, y: pos.y };
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
                const from = getAnchorCenter(edge.from, 'bottom');
                const to   = getAnchorCenter(edge.to,   'top');
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
                const ST = 0.85, SM = 1 - ST;
                const bx = SM*SM*SM*x1 + 3*SM*SM*ST*x1 + 3*SM*ST*ST*x2 + ST*ST*ST*x2;
                const by = SM*SM*SM*y1 + 3*SM*SM*ST*(y1+dy) + 3*SM*ST*ST*(y2-dy) + ST*ST*ST*y2;
                // angle of chord B(0.85)→B(1) in degrees; default caret points south (90°)
                const caretRotate = Math.atan2(y2 - by, x2 - bx) * (180 / Math.PI) - 90;
                const dArrow = `M ${x2 - 4} ${y2 - 8} L ${x2} ${y2} L ${x2 + 4} ${y2 - 8}`;

                return (
                  <g key={edge.id}>
                    {/* Visual path */}
                    <path d={d}
                      stroke="var(--color-slate-border-secondary)" strokeWidth="1.5"
                      fill="none" strokeLinecap="round"
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* Caret — tip pinned to anchor (x2,y2), rotated around it */}
                    <path d={dArrow}
                      stroke="var(--color-slate-border-secondary)" strokeWidth="1.5"
                      fill="none" strokeLinecap="round" strokeLinejoin="round"
                      transform={`rotate(${caretRotate}, ${x2}, ${y2})`}
                      style={{ pointerEvents: 'none' }}
                    />
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
            </svg>

            {/* ── Drop placeholder — ghost at cursor position while dragging from palette ── */}
            {draggingLibNode && paletteDragPos && (
              <div
                className={clsx(styles.dropPlaceholder,
                  draggingLibNode.type === 'trigger'   ? styles.dropPlaceholderTrigger   :
                  draggingLibNode.type === 'condition' ? styles.dropPlaceholderCondition  :
                  draggingLibNode.type === 'action'    ? styles.dropPlaceholderAction     :
                                                         styles.dropPlaceholderAi
                )}
                style={{ left: paletteDragPos.x, top: paletteDragPos.y, width: NODE_W, height: NODE_H }}
                aria-hidden
              />
            )}

            {/* Edge midpoint + buttons — rendered above SVG but below nodes */}
            {edges.map(edge => {
              const from = getAnchorCenter(edge.from, 'bottom');
              const to   = getAnchorCenter(edge.to,   'top');
              if (!from || !to) return null;
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;
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
                >
                  {/* Top anchor — all types except trigger */}
                  {node.type !== 'trigger' && (
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
                  />

                  {/* Bottom anchor — all types */}
                  <div
                    className={clsx(styles.anchor, styles.anchorBottom)}
                    data-anchor="bottom"
                    data-anchor-node-id={node.id}
                  />
                </div>
              );
            })}

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
          {(['trigger', 'condition', 'action'] as StepType[]).map(type => {
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
  const [description] = useState('');
  const [status] = useState<AutomationStatus>('draft');

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
  const [editNodeMode,    setEditNodeMode]    = useState(false);
  const [editingNodeIds,  setEditingNodeIds]  = useState<Set<string>>(new Set());
  const [saveState,       setSaveState]       = useState<SaveState>('idle');
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [name, description, status, nodes, edges]);

  const makeNode = (type: StepType): GraphNode => ({
    id: `${type}-${++_nextId}`,
    type,
    label: `Add a ${type}`,
    placeholder: { trigger: 'Search events', condition: 'Search condition', action: 'Search actions', ai: 'Describe AI task' }[type],
    configured: false,
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
  };

  /** Toggle edit-node selection mode. Exiting mode clears the selection. */
  const toggleEditMode = () => {
    setEditNodeMode(prev => {
      if (prev) setEditingNodeIds(new Set());
      return !prev;
    });
  };

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

  const updateNode = (id: string, selectedValue: string) =>
    setNodes(prev => prev.map(n => {
      if (n.id !== id) return n;
      // For condition nodes: if a condition def matches, initialise operator (preserve if already set)
      const condDef = n.type === 'condition'
        ? CONDITION_LIBRARY.find(c => c.label === selectedValue) ?? null
        : null;
      return {
        ...n,
        selectedValue,
        configured: true,
        conditionOperator: condDef
          ? (n.conditionOperator ?? condDef.operators[0])
          : n.conditionOperator,
        conditionValues: condDef
          ? (n.conditionValues ?? [])
          : n.conditionValues,
      };
    }));

  const updateConditionConfig = (id: string, op: string, vals: string[]) =>
    setNodes(prev => prev.map(n => n.id === id ? { ...n, conditionOperator: op, conditionValues: vals } : n));

  const updateConfigField = (id: string, key: string, value: string) =>
    setNodes(prev => prev.map(n => n.id !== id ? n : {
      ...n,
      configValues: { ...(n.configValues ?? {}), [key]: value },
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
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id));
    setNodePositions(prev => { const next = { ...prev }; delete next[id]; return next; });
    setSelectedId(prev => prev === id ? null : prev);
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
  const addEdge = (fromNodeId: string, toNodeId: string) => {
    if (fromNodeId === toNodeId) return;
    if (edges.some(e => e.from === fromNodeId && e.to === toNodeId)) return;
    const fromNode = nodes.find(n => n.id === fromNodeId);
    const toNode   = nodes.find(n => n.id === toNodeId);
    if (!fromNode || !toNode) return;
    if (toNode.type === 'trigger') return;
    // Actions (and AI steps) are terminal — they cannot feed into a condition
    if ((fromNode.type === 'action' || fromNode.type === 'ai') && toNode.type === 'condition') return;
    setEdges(prev => [...prev, { id: `edge-${++_nextId}`, from: fromNodeId, to: toNodeId }]);
  };

  // ── Remove an existing edge ──
  const deleteEdge = (edgeId: string) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
  };

  // ── Create a new disconnected node at canvas position ──
  const createNodeAt = (type: StepType, x: number, y: number) => {
    const n = makeNode(type);
    setNodePositions(prev => ({ ...prev, [n.id]: { x: x - NODE_W / 2, y: y - NODE_H / 2 } }));
    setNodes(prev => [...prev, n]);
    setSelectedId(n.id);
  };

  // ── Canvas drop: lib item dropped at cursor position → new disconnected node ──
  const handleCanvasDropAtPos = (item: LibraryItem, x: number, y: number) => {
    const n = makeNode(item.type);
    n.selectedValue = item.label;
    n.configured = true;
    setNodePositions(prev => ({ ...prev, [n.id]: { x, y } }));
    setNodes(prev => [...prev, n]);
    setSelectedId(n.id);
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
      />

      <div className={styles.body}>
        <LeftPanel
          onLibNodeDragStart={(item) => setDraggingLibNode(item)}
          onLibNodeDragEnd={() => setDraggingLibNode(null)}
          editNodeMode={editNodeMode}
          editingCount={editingNodeIds.size}
          onToggleEditMode={toggleEditMode}
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
          onCanvasDropAtPos={handleCanvasDropAtPos}
          editNodeMode={editNodeMode}
          editingNodeIds={editingNodeIds}
          onEditNodeToggle={handleEditNodeToggle}
        />
      </div>
    </div>
  );
}
