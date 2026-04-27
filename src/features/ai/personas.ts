// AI Specialist personas — preset library shown in the empty-state picker
// of the AI Specialist node popover. Schema mirrors the production model in
// `~/MyClaudeFolder/TeambridgeCode/src/data/mockPersonas.ts` (subset — only
// the fields the builder picker + configuration cards actually consume).
//
// Swap this static list for a real API call once the personas endpoint is
// available; the picker only needs `id`, `name`, `role`, `description`,
// `voice`, `tags`, and `status`.

export type PersonaVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface AiPersona {
  id: string;
  name: string;
  /** Specialism — e.g. "Scheduling", "Onboarding". Drives the secondary line. */
  role: string;
  /** Short blurb shown beneath the name in the picker rows. */
  description: string;
  voice: PersonaVoice;
  status: 'active' | 'paused';
  tags: string[];
}

export const AI_PERSONAS: AiPersona[] = [
  {
    id: 'persona-001',
    name: 'Erin',
    role: 'Human Resources',
    description:
      'Handles employee profile updates, benefits inquiries, and policy questions across HR workflows.',
    voice: 'nova',
    status: 'active',
    tags: ['HR', 'People Ops', 'Benefits'],
  },
  {
    id: 'persona-002',
    name: 'Sched',
    role: 'Scheduling',
    description:
      'Manages shift swaps, coverage requests, and schedule change notifications via SMS and voice.',
    voice: 'alloy',
    status: 'active',
    tags: ['Scheduling', 'Shift Management', 'Workforce'],
  },
  {
    id: 'persona-003',
    name: 'Onbi',
    role: 'Onboarding',
    description:
      'Guides new hires through onboarding checklists, document collection, and orientation scheduling.',
    voice: 'fable',
    status: 'active',
    tags: ['Onboarding', 'New Hires', 'Compliance'],
  },
  {
    id: 'persona-004',
    name: 'Cassie',
    role: 'Customer Support',
    description:
      'Handles inbound customer inquiries, ticket triage, and FAQ responses across chat and email.',
    voice: 'shimmer',
    status: 'active',
    tags: ['Support', 'Customer Service', 'Tickets'],
  },
  {
    id: 'persona-005',
    name: 'DataOps',
    role: 'Operations',
    description:
      'Runs data audits, record cleanup, compliance checks, and report generation as background work.',
    voice: 'onyx',
    status: 'active',
    tags: ['Data', 'Audit', 'Operations', 'Reporting'],
  },
];

/** Lookup helper — returns undefined for an unknown / unset persona id. */
export function getPersonaById(id: string | undefined): AiPersona | undefined {
  if (!id) return undefined;
  return AI_PERSONAS.find(p => p.id === id);
}
