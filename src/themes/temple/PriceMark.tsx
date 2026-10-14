import { INK } from '@/art/ink';

/** 價位：幾枚古錢（圓形方孔的銅錢） */
export function PriceMark({ n, size = 12 }: { n: number; size?: number }) {
  return (
    <span className="price-mark" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8.7" fill="var(--marigold)" stroke={INK} strokeWidth="1.6" />
          <circle cx="10" cy="10" r="6.1" fill="none" stroke="#b98a2c" strokeWidth="1.1" />
          <rect x="7.3" y="7.3" width="5.4" height="5.4" fill="var(--paper-hi)" stroke={INK} strokeWidth="1.3" />
        </svg>
      ))}
    </span>
  );
}
