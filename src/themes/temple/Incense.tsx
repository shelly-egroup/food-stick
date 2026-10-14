import './Incense.css';

/** 載入中的小儀式：三炷香，香煙裊裊、香火一明一滅 */
export function Incense({ size = 48, label = '載入中' }: { size?: number; label?: string }) {
  return (
    <span className="incense" style={{ width: size, height: size * 1.25 }} role="img" aria-label={label}>
      <svg viewBox="0 0 60 75" width="100%" height="100%" aria-hidden="true">
        <g className="incense__smoke" fill="none" stroke="#26211d" strokeWidth="1.3" strokeLinecap="round">
          <path d="M22 30 C 17 22, 27 17, 21 8 S 25 -2, 19 -8" />
          <path d="M30 26 C 35 18, 25 12, 31 4 S 27 -6, 32 -12" />
          <path d="M38 30 C 43 22, 33 17, 39 8 S 36 -2, 41 -8" />
        </g>
        <g stroke="#26211d" strokeWidth="1.6">
          <line x1="22" y1="31" x2="25" y2="56" />
          <line x1="30" y1="27" x2="30" y2="56" />
          <line x1="38" y1="31" x2="35" y2="56" />
        </g>
        <g className="incense__embers" fill="var(--vermilion)">
          <circle cx="22" cy="31" r="2.8" />
          <circle cx="30" cy="27" r="2.8" />
          <circle cx="38" cy="31" r="2.8" />
        </g>
        <path d="M8 55 h44 c0 11 -8 17 -22 17 S 8 66 8 55 Z" fill="var(--gold)" stroke="#26211d" strokeWidth="1.6" />
        <path d="M13 61 q17 6 34 0" fill="none" stroke="#26211d" strokeWidth="1" />
      </svg>
    </span>
  );
}
