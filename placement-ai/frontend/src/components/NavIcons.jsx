// Hand-drawn, minimal line icons for the rail nav.
//
// lucide-react was tried first (per the design brief's preference) but its
// icons throw "Invalid hook call" / null useContext under this project's
// Rolldown-based Vite (8.2.2) - a genuine, reproducible bundler
// incompatibility, not a caching artifact (confirmed with a full dev-server
// restart and a from-blank navigation). The brief's own fallback - clean
// inline SVGs - avoids the problem entirely and keeps the rail dependency
// free. All icons share the same stroke-based style: 24x24 viewBox,
// currentColor, round caps/joins, so they inherit the nav item's text
// color (and its active/hover transitions) for free.

const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function ChatIcon(props) {
  return (
    <svg {...commonProps} {...props}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M8 18l-3 3v-3" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <line x1="7" y1="13" x2="14" y2="13" />
    </svg>
  );
}

export function ResumeIcon(props) {
  return (
    <svg {...commonProps} {...props}>
      <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
      <path d="M15 2v5h5" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

export function RoadmapIcon(props) {
  return (
    <svg {...commonProps} {...props}>
      <path d="M3 20Q8 6 12 14T21 6" />
      <circle cx="3" cy="20" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="21" cy="6" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CodeIcon(props) {
  return (
    <svg {...commonProps} {...props}>
      <polyline points="8 6 3 12 8 18" />
      <polyline points="16 6 21 12 16 18" />
    </svg>
  );
}

export function MicIcon(props) {
  return (
    <svg {...commonProps} {...props}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

export function SunIcon(props) {
  return (
    <svg {...commonProps} {...props}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22" />
      <line x1="4.2" y1="4.2" x2="6" y2="6" />
      <line x1="18" y1="18" x2="19.8" y2="19.8" />
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22" y2="12" />
      <line x1="4.2" y1="19.8" x2="6" y2="18" />
      <line x1="18" y1="6" x2="19.8" y2="4.2" />
    </svg>
  );
}

export function MoonIcon(props) {
  return (
    <svg {...commonProps} {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export function ChevronLeftIcon(props) {
  return (
    <svg {...commonProps} {...props}>
      <polyline points="15 4 7 12 15 20" />
    </svg>
  );
}

export function GripIcon(props) {
  return (
    <svg {...commonProps} {...props}>
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
