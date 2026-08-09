/** Line icons used by the hero. Decorative — the labels beside them carry the meaning. */

type Props = { className?: string };

/** Three offset cards, the mark that sits after the headline. */
export function StackMark({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="21" y="4" width="18" height="26" rx="2.5" transform="rotate(9 21 4)" />
      <rect x="14" y="7" width="18" height="26" rx="2.5" transform="rotate(5 14 7)" />
      <rect x="5" y="11" width="19" height="28" rx="2.5" />
    </svg>
  );
}

export function PlusIcon({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function GridIcon({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="2.25" y="2.25" width="5" height="5" rx="1" />
      <rect x="8.75" y="2.25" width="5" height="5" rx="1" />
      <rect x="2.25" y="8.75" width="5" height="5" rx="1" />
      <rect x="8.75" y="8.75" width="5" height="5" rx="1" />
    </svg>
  );
}