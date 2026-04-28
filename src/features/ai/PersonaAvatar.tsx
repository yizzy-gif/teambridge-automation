import type { CSSProperties } from 'react';

/* ─── PersonaAvatar ──────────────────────────────────────────────────────────
   3D-feel geometric robot avatars rendered per-persona for the AI Specialist
   picker, configuration card, and Test tab header. Each persona gets a
   distinct silhouette + palette so the user can recognise them at a glance:

     · persona-001  Erin     — coral chassis, antenna bulb, wide LED visor (HR)
     · persona-002  Sched    — teal hex chassis, clock-face screen (Scheduling)
     · persona-003  Onbi     — amber pyramid chassis, dot eyes + smile arc
     · persona-004  Cassie   — violet chip chassis, speech-bubble antenna
     · persona-005  DataOps  — slate cube chassis, scanner-bar eye

   Avatars are pure SVG with linear gradients for the 3D feel — no images, no
   external assets. Gradient `<defs>` IDs are persona-scoped so the same
   avatar can co-exist with the picker (which renders all five) without ID
   collisions in the DOM. */

interface PersonaAvatarProps {
  personaId?: string;
  /** Rendered pixel size (square). Defaults to 32. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function PersonaAvatar({ personaId, size = 32, className, style }: PersonaAvatarProps) {
  const Renderer = AVATARS[personaId ?? ''] ?? AVATARS['persona-001'];
  return (
    <Renderer size={size} className={className} style={style} />
  );
}

interface RendererProps {
  size: number;
  className?: string;
  style?: CSSProperties;
}

function ErinAvatar({ size, className, style }: RendererProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <defs>
        <linearGradient id="pa-erin-body" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFB59A" />
          <stop offset="1" stopColor="#E96678" />
        </linearGradient>
        <linearGradient id="pa-erin-screen" x1="16" y1="11" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2A1320" />
          <stop offset="1" stopColor="#4A1D2E" />
        </linearGradient>
      </defs>
      {/* Antenna */}
      <rect x="15.1" y="2" width="1.8" height="3.2" rx="0.9" fill="#C24A5E" />
      <circle cx="16" cy="2.2" r="1.6" fill="#FFE2D0" stroke="#C24A5E" strokeWidth="0.6" />
      {/* Chassis */}
      <rect x="3" y="5" width="26" height="24" rx="6" fill="url(#pa-erin-body)" />
      {/* Top bevel highlight */}
      <path d="M9 5h14a6 6 0 0 1 6 6v0.5H3V11a6 6 0 0 1 6-6z" fill="white" fillOpacity="0.22" />
      {/* Visor screen */}
      <rect x="6.5" y="11" width="19" height="11" rx="3" fill="url(#pa-erin-screen)" />
      <rect x="6.5" y="11" width="19" height="3.2" rx="3" fill="white" fillOpacity="0.08" />
      {/* Eyes */}
      <rect x="10" y="14.2" width="4" height="4.6" rx="1.4" fill="#FFE2D0" />
      <rect x="18" y="14.2" width="4" height="4.6" rx="1.4" fill="#FFE2D0" />
      {/* Cheeks */}
      <circle cx="9" cy="24" r="1.3" fill="#F8C2BB" fillOpacity="0.7" />
      <circle cx="23" cy="24" r="1.3" fill="#F8C2BB" fillOpacity="0.7" />
    </svg>
  );
}

function SchedAvatar({ size, className, style }: RendererProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <defs>
        <linearGradient id="pa-sched-body" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5BE2D0" />
          <stop offset="1" stopColor="#1F8B9A" />
        </linearGradient>
        <radialGradient id="pa-sched-face" cx="16" cy="16" r="9" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0E323A" />
          <stop offset="1" stopColor="#062028" />
        </radialGradient>
      </defs>
      {/* Hexagon chassis */}
      <path
        d="M16 2.2L28 9v14L16 29.8 4 23V9l12-6.8z"
        fill="url(#pa-sched-body)"
      />
      {/* Top bevel */}
      <path d="M16 2.2L28 9 16 15.8 4 9l12-6.8z" fill="white" fillOpacity="0.18" />
      {/* Edge stroke */}
      <path
        d="M16 2.2L28 9v14L16 29.8 4 23V9l12-6.8z"
        stroke="#0E575F"
        strokeOpacity="0.35"
        strokeWidth="0.8"
      />
      {/* Clock face */}
      <circle cx="16" cy="17" r="7.2" fill="url(#pa-sched-face)" />
      <circle cx="16" cy="17" r="7.2" stroke="#5BE2D0" strokeOpacity="0.45" strokeWidth="0.6" />
      {/* Tick marks */}
      <rect x="15.6" y="10.6" width="0.8" height="1.6" rx="0.4" fill="#5BE2D0" />
      <rect x="15.6" y="21.8" width="0.8" height="1.6" rx="0.4" fill="#5BE2D0" />
      <rect x="9.6" y="16.6" width="1.6" height="0.8" rx="0.4" fill="#5BE2D0" />
      <rect x="20.8" y="16.6" width="1.6" height="0.8" rx="0.4" fill="#5BE2D0" />
      {/* Hands */}
      <rect x="15.5" y="13.2" width="1" height="4.2" rx="0.5" fill="#5BE2D0" />
      <rect x="16" y="16.6" width="4" height="1" rx="0.5" fill="#5BE2D0" />
      <circle cx="16" cy="17" r="0.9" fill="#A6F2E5" />
    </svg>
  );
}

function OnbiAvatar({ size, className, style }: RendererProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <defs>
        <linearGradient id="pa-onbi-body" x1="16" y1="6" x2="16" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFD479" />
          <stop offset="1" stopColor="#D87A1F" />
        </linearGradient>
        <linearGradient id="pa-onbi-screen" x1="16" y1="12" x2="16" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2E1808" />
          <stop offset="1" stopColor="#5A3210" />
        </linearGradient>
      </defs>
      {/* Sparkle antenna — welcoming signal above the head */}
      <line x1="16" y1="3.4" x2="16" y2="6" stroke="#A85812" strokeWidth="1.3" strokeLinecap="round" />
      <path
        d="M16 1.4l0.65 1.55 1.55 0.45-1.55 0.45L16 5.4l-0.65-1.55-1.55-0.45 1.55-0.45z"
        fill="#FFE89A"
        stroke="#A85812"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      {/* Side headphone ear-cups */}
      <rect x="2.5" y="14" width="3.6" height="6.5" rx="1.6" fill="#A85812" />
      <rect x="2.5" y="14" width="3.6" height="2" rx="1.6" fill="white" fillOpacity="0.18" />
      <rect x="25.9" y="14" width="3.6" height="6.5" rx="1.6" fill="#A85812" />
      <rect x="25.9" y="14" width="3.6" height="2" rx="1.6" fill="white" fillOpacity="0.18" />
      {/* Chassis — rounded capsule */}
      <rect x="6" y="6" width="20" height="22" rx="6" fill="url(#pa-onbi-body)" />
      {/* Top bevel */}
      <path
        d="M12 6h8a6 6 0 0 1 6 6v0.5H6V12a6 6 0 0 1 6-6z"
        fill="white"
        fillOpacity="0.22"
      />
      {/* Edge stroke */}
      <rect
        x="6"
        y="6"
        width="20"
        height="22"
        rx="6"
        stroke="#A85812"
        strokeOpacity="0.35"
        strokeWidth="0.8"
      />
      {/* Visor screen */}
      <rect x="8.5" y="13" width="15" height="10" rx="2.8" fill="url(#pa-onbi-screen)" />
      <rect x="8.5" y="13" width="15" height="2.6" rx="2.8" fill="white" fillOpacity="0.08" />
      {/* Eyes */}
      <circle cx="12.8" cy="18" r="1.7" fill="#FFE89A" />
      <circle cx="19.2" cy="18" r="1.7" fill="#FFE89A" />
      <circle cx="13.3" cy="17.5" r="0.55" fill="white" fillOpacity="0.95" />
      <circle cx="19.7" cy="17.5" r="0.55" fill="white" fillOpacity="0.95" />
      {/* Mouth bar */}
      <rect x="13" y="25" width="6" height="1.4" rx="0.7" fill="#FFE89A" fillOpacity="0.85" />
    </svg>
  );
}

function CassieAvatar({ size, className, style }: RendererProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <defs>
        <linearGradient id="pa-cassie-body" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#C9A6FF" />
          <stop offset="1" stopColor="#6B3CC6" />
        </linearGradient>
        <linearGradient id="pa-cassie-screen" x1="16" y1="12" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1B0E33" />
          <stop offset="1" stopColor="#321855" />
        </linearGradient>
      </defs>
      {/* Speech-bubble antenna */}
      <path
        d="M21 3.5h5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-2.4l-1.6 1.8 0.2-1.8H21A1.5 1.5 0 0 1 19.5 8V5A1.5 1.5 0 0 1 21 3.5z"
        fill="#9D6BFF"
        stroke="#5C2DAB"
        strokeOpacity="0.5"
        strokeWidth="0.6"
      />
      <circle cx="22" cy="6.5" r="0.7" fill="#FFFFFF" />
      <circle cx="24" cy="6.5" r="0.7" fill="#FFFFFF" />
      <circle cx="26" cy="6.5" r="0.7" fill="#FFFFFF" />
      {/* Chassis */}
      <rect x="3" y="8" width="26" height="21" rx="6" fill="url(#pa-cassie-body)" />
      <path d="M9 8h14a6 6 0 0 1 6 6v0.5H3V14a6 6 0 0 1 6-6z" fill="white" fillOpacity="0.18" />
      {/* Visor */}
      <rect x="6" y="13.5" width="20" height="9" rx="3" fill="url(#pa-cassie-screen)" />
      {/* Scan line */}
      <rect x="8.5" y="17.5" width="15" height="1.2" rx="0.6" fill="#C9A6FF" />
      <rect x="8.5" y="17.5" width="15" height="1.2" rx="0.6" fill="white" fillOpacity="0.35" />
      {/* Side dots */}
      <circle cx="6.5" cy="26" r="1" fill="#FFFFFF" fillOpacity="0.7" />
      <circle cx="25.5" cy="26" r="1" fill="#FFFFFF" fillOpacity="0.7" />
    </svg>
  );
}

function DataOpsAvatar({ size, className, style }: RendererProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <defs>
        <linearGradient id="pa-data-body" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7AA0E8" />
          <stop offset="1" stopColor="#2A4A8E" />
        </linearGradient>
        <linearGradient id="pa-data-face" x1="16" y1="13" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0A1530" />
          <stop offset="1" stopColor="#152852" />
        </linearGradient>
      </defs>
      {/* Cube chassis with chamfered corners */}
      <path
        d="M7 3h18l4 4v18l-4 4H7l-4-4V7l4-4z"
        fill="url(#pa-data-body)"
      />
      {/* Top bevel */}
      <path d="M7 3h18l4 4-4 0.6H7L3 7l4-4z" fill="white" fillOpacity="0.22" />
      {/* Grid pattern overlay */}
      <g stroke="white" strokeOpacity="0.16" strokeWidth="0.6">
        <line x1="3" y1="11" x2="29" y2="11" />
        <line x1="3" y1="21" x2="29" y2="21" />
        <line x1="11" y1="3" x2="11" y2="29" />
        <line x1="21" y1="3" x2="21" y2="29" />
      </g>
      {/* Edge stroke */}
      <path
        d="M7 3h18l4 4v18l-4 4H7l-4-4V7l4-4z"
        stroke="#1A2F5C"
        strokeOpacity="0.5"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Scanner face */}
      <rect x="6" y="13" width="20" height="8" rx="2" fill="url(#pa-data-face)" />
      {/* Scanner glow bar */}
      <rect x="8" y="16.4" width="16" height="1.6" rx="0.8" fill="#7AC8FF" />
      <rect x="8" y="16.4" width="16" height="0.6" rx="0.3" fill="white" fillOpacity="0.5" />
      {/* Indicator LEDs */}
      <circle cx="9" cy="25" r="0.9" fill="#7AC8FF" />
      <circle cx="12" cy="25" r="0.9" fill="#FFFFFF" fillOpacity="0.4" />
      <circle cx="23" cy="25" r="0.9" fill="#FFFFFF" fillOpacity="0.4" />
    </svg>
  );
}

const AVATARS: Record<string, (props: RendererProps) => JSX.Element> = {
  'persona-001': ErinAvatar,
  'persona-002': SchedAvatar,
  'persona-003': OnbiAvatar,
  'persona-004': CassieAvatar,
  'persona-005': DataOpsAvatar,
};
