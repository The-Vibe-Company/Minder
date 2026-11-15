// Objects of the house, drawn flat, for the landing and the empty states.
export function Soupiere({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 240"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="320" height="168" fill="#e6e3dc" />
      <rect y="168" width="320" height="72" fill="#d4cfc4" />
      <ellipse cx="160" cy="196" rx="96" ry="12" fill="#bdb6a8" />
      <path d="M112 186h96l-10-16h-76z" fill="#f3f1ea" stroke="#c9c3b6" />
      <path
        d="M82 120c0 40 34 62 78 62s78-22 78-62z"
        fill="#fbfaf6"
        stroke="#c9c3b6"
        strokeWidth="2"
      />
      <path
        d="M72 122c-16-4-22 14-8 22M248 122c16-4 22 14 8 22"
        fill="none"
        stroke="#c9c3b6"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M86 118c4-34 36-50 74-50s70 16 74 50z"
        fill="#fbfaf6"
        stroke="#c9c3b6"
        strokeWidth="2"
      />
      <path
        d="M96 104c40 8 88 8 128 0"
        stroke="#2343a6"
        strokeWidth="4"
        fill="none"
      />
      <circle
        cx="160"
        cy="62"
        r="9"
        fill="#fbfaf6"
        stroke="#c9c3b6"
        strokeWidth="2"
      />
      <circle cx="160" cy="62" r="4" fill="#2343a6" />
      <g fill="#2343a6">
        <circle cx="160" cy="146" r="7" />
        <circle cx="146" cy="138" r="5" />
        <circle cx="174" cy="138" r="5" />
        <circle cx="146" cy="154" r="5" />
        <circle cx="174" cy="154" r="5" />
        <circle cx="112" cy="136" r="3.5" />
        <circle cx="208" cy="136" r="3.5" />
      </g>
      <path
        d="M160 160c-4 8-12 10-18 10M160 160c4 8 12 10 18 10"
        stroke="#17704a"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
}

export function Lampe({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 240" className={className}>
      <rect width="320" height="168" fill="#e6e3dc" />
      <rect y="168" width="320" height="72" fill="#d4cfc4" />
      <ellipse cx="160" cy="196" rx="60" ry="9" fill="#bdb6a8" />
      <path d="M120 192h80l-6-12h-68z" fill="#b8913c" />
      <path d="M160 180V96" stroke="#b8913c" strokeWidth="6" />
      <path d="M100 100c10-30 110-30 120 0z" fill="#17704a" />
      <path d="M100 100h120" stroke="#0f5636" strokeWidth="4" />
      <circle cx="196" cy="128" r="4" fill="#b8913c" />
      <path d="M196 104v22" stroke="#b8913c" strokeWidth="2" />
    </svg>
  );
}

export function Miroir({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 240" className={className}>
      <rect width="320" height="240" fill="#e6e3dc" />
      <ellipse cx="160" cy="118" rx="58" ry="82" fill="#c9a24a" />
      <ellipse cx="160" cy="118" rx="46" ry="70" fill="#dfe6ea" />
      <path
        d="M134 80c8-16 22-22 32-22"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity=".8"
      />
      <circle cx="160" cy="30" r="8" fill="#c9a24a" />
    </svg>
  );
}
