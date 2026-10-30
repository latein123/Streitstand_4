// Strich-Icons (currentColor) statt Emoji
const PATHS = {
  scales: <><path d="M8 2.5v11M5 13.5h6M3 4.5h10" /><path d="M3 4.5 1.5 8.5a1.6 1.6 0 0 0 3 0L3 4.5ZM13 4.5l-1.5 4a1.6 1.6 0 0 0 3 0L13 4.5Z" /></>,
  pin: <><path d="M9.5 2.5 13.5 6.5 11 7.5 8.5 10l.5 2.5L3.5 7l2.5.5L8.5 5l1-2.5Z" /><path d="M6 10 2.5 13.5" /></>,
  spark: <path d="M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3M4.2 4.2l1.6 1.6M10.2 10.2l1.6 1.6M11.8 4.2l-1.6 1.6M5.8 10.2l-1.6 1.6" />,
  info: <><circle cx="8" cy="8" r="6" /><path d="M8 7.3v3.5M8 5.2v.01" /></>,
  flag: <path d="M3.5 14V2.5M3.5 3h8l-1.5 3 1.5 3h-8" />,
  warn: <><path d="M8 2.5 14 13H2L8 2.5Z" /><path d="M8 6.5v3M8 11.3v.01" /></>,
  check: <path d="M3 8.5 6.5 12 13 4.5" />,
  chev: <path d="M6 3.5 10.5 8 6 12.5" />,
  list: <><path d="M7 4h6.5M7 8h6.5M7 12h6.5" /><path d="M2.5 4l1 1 1.5-1.8M2.5 8l1 1 1.5-1.8M2.5 12l1 1 1.5-1.8" /></>
};
export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return <svg className="ic" viewBox="0 0 16 16" aria-hidden="true">{PATHS[name]}</svg>;
}

// Hinweis „vom Team zu verifizieren“ und Quellenangabe – an vielen Stellen gleich
export const Verify = ({ on }: { on?: boolean }) => on ? <span className="verify"><Icon name="flag" /> vom Team zu verifizieren</span> : null;
export const Src = ({ q }: { q?: string }) => q ? <span className="pf-src">{q}</span> : null;
export const Spinner = () => <div className="spin" />;
