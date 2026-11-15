// Small stroke icons, drawn in currentColor, 24×24 grid.
type P = { className?: string; size?: number };
function Svg({
  className,
  size = 20,
  children,
}: P & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}
export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const IconGrid = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
  </Svg>
);
export const IconCards = (p: P) => (
  <Svg {...p}>
    <rect x="6" y="3" width="12" height="18" rx="3" />
    <path d="M9 17h6" />
  </Svg>
);
export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Svg>
);
export const IconRecap = (p: P) => (
  <Svg {...p}>
    <path d="M5 20V10M12 20V4M19 20v-7" />
  </Svg>
);
export const IconX = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IconHeart = (p: P) => (
  <svg
    aria-hidden="true"
    focusable="false"
    width={p.size ?? 20}
    height={p.size ?? 20}
    viewBox="0 0 24 24"
    className={p.className}
  >
    <path
      fill="currentColor"
      d="M12 20.5s-7.5-4.4-9.3-9.2C1.6 8.2 3.6 4.8 7 4.6c2-.1 3.5.9 5 2.7 1.5-1.8 3-2.8 5-2.7 3.4.2 5.4 3.6 4.3 6.7-1.8 4.8-9.3 9.2-9.3 9.2z"
    />
  </svg>
);
export const IconUndo = (p: P) => (
  <Svg {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 010 11H11" />
  </Svg>
);
export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconCopy = (p: P) => (
  <Svg {...p}>
    <rect x="8" y="8" width="12" height="12" rx="3" />
    <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
  </Svg>
);
export const IconShare = (p: P) => (
  <Svg {...p}>
    <path d="M12 15V3M7 8l5-5 5 5" />
    <path d="M5 13v5a2 2 0 002 2h10a2 2 0 002-2v-5" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IconMail = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M4 7l8 6 8-6" />
  </Svg>
);
export const IconArrow = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
