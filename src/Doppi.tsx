export function Doppi({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="15" fill="#cce5bb" />
      <path d="M10 24 24 10l14 14-14 8-14-8Z" fill="#173f34" />
      <path d="m12 24 12 7 12-7v9l-12 7-12-7v-9Z" fill="#275d4e" />
      <path d="m18 21 6-5 6 5-6 5-6-5Z" stroke="#e8e6cb" strokeWidth="1.6" />
      <path d="M17 30v5m7-1v5m7-9v5" stroke="#e8e6cb" strokeWidth="1.6" />
    </svg>
  );
}
