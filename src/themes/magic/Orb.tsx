import { INK } from '@/art/ink';
import './Orb.css';

/** 載入中的小儀式：一顆四芒星一頓一頓地轉 */
export function Orb({ size = 48, label = '載入中' }: { size?: number; label?: string }) {
  return (
    <span className="orb" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 60 60" width="100%" height="100%" aria-hidden="true">
        <g className="orb__spin">
          <path
            d="M30 6 L33 27 L54 30 L33 33 L30 54 L27 33 L6 30 L27 27 Z"
            fill="var(--marigold)"
            stroke={INK}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </g>
        <circle cx="30" cy="30" r="4" fill="var(--cobalt)" stroke={INK} strokeWidth="1.4" />
      </svg>
    </span>
  );
}
