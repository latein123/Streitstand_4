export function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <mask id="lgBite" maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">
          <rect width="40" height="40" fill="#fff" /><circle cx="33.5" cy="16" r="6" fill="#000" />
        </mask>
      </defs>
      <g mask="url(#lgBite)" style={{ fill: 'var(--ink)', stroke: 'var(--ink)' }} strokeWidth="1.2" strokeLinejoin="round"
        fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="31" textAnchor="middle">
        <text x="15" y="28">§</text><text x="25" y="34.5">§</text>
      </g>
    </svg>
  );
}
