import { INK, fx } from '@/art/ink';
import { Beam, Lantern, Sparks, Sun } from './parts';
import './Facade.css';

const eaveY = (x: number) => fx(156 + 26 * Math.sin((Math.PI * x) / 1000));

/** 燕尾脊屋頂：翠綠琉璃瓦、墨色屋脊、雙龍搶珠與剪黏花 */
function Roof() {
  const tiles = Array.from({ length: 41 }, (_, i) => 80 + i * 21);
  const drips = Array.from({ length: 33 }, (_, i) => 20 + i * 30);
  const swallow =
    'M150 72 C 104 70, 66 58, 44 34 C 34 23, 28 10, 24 -4 L 14 -18 L 32 -10 L 36 -24 L 40 -2 C 46 16, 66 40, 124 54 Z';
  return (
    <svg className="gate-roof" viewBox="0 -30 1000 240" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      {/* 屋面 */}
      <path
        d="M70 70 H930 C 948 104, 972 130, 1000 136 L 1000 156 C 820 176, 640 182, 500 182 S 180 176, 0 156 L 0 136 C 28 130, 52 104, 70 70 Z"
        fill="var(--jade)"
        stroke={INK}
        strokeWidth="2"
      />
      <g stroke="#1d6f5c" strokeWidth="3.2" strokeLinecap="round">
        {tiles.map((x) => {
          const xb = fx(x + (x - 500) * 0.14);
          return <line key={x} x1={x} y1="74" x2={xb} y2={fx(eaveY(xb) - 10)} />;
        })}
      </g>
      <path
        d="M0 148 C 180 168, 340 174, 500 174 S 820 168, 1000 148"
        fill="none"
        stroke="var(--marigold)"
        strokeWidth="3.4"
      />
      <g fill={INK}>
        {drips.map((x) => {
          const y = eaveY(x);
          return <path key={x} d={`M${x - 6} ${y} H${x + 6} L${x} ${y + 9} Z`} />;
        })}
      </g>

      {/* 屋脊與燕尾 */}
      <path d="M120 52 C 300 60, 700 60, 880 52 L 880 74 C 700 80, 300 80, 120 74 Z" fill={INK} />
      <path d="M130 63 C 300 70, 700 70, 870 63" fill="none" stroke="var(--vermilion)" strokeWidth="3" />
      <path d={swallow} fill={INK} />
      <path d={swallow} fill={INK} transform="translate(1000 0) scale(-1 1)" />
      <g fill="none" stroke="var(--marigold)" strokeWidth="2.5" strokeLinecap="round">
        <path d="M130 62 C 96 58, 66 46, 50 28 C 42 18, 37 8, 34 -4" />
        <path d="M130 62 C 96 58, 66 46, 50 28 C 42 18, 37 8, 34 -4" transform="translate(1000 0) scale(-1 1)" />
      </g>

      {/* 雙龍搶珠 */}
      {[false, true].map((flip) => (
        <g key={String(flip)} transform={flip ? 'translate(1000 0) scale(-1 1)' : undefined} className="dragon">
          <path
            d="M300 54 C 330 18, 372 54, 408 30 C 428 18, 450 26, 470 36"
            fill="none"
            stroke={INK}
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M300 54 C 330 18, 372 54, 408 30 C 428 18, 450 26, 470 36"
            fill="none"
            stroke="var(--jade)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <g fill="var(--marigold)">
            {[322, 346, 372, 398, 424, 448].map((x, i) => (
              <circle key={x} cx={x} cy={[38, 32, 42, 34, 25, 28][i]} r="2.2" />
            ))}
          </g>
          <circle cx="472" cy="36" r="7" fill="var(--marigold)" stroke={INK} strokeWidth="1.8" />
          <path d="M478 32 q8 -8 14 -2 M478 40 q8 6 14 2" fill="none" stroke={INK} strokeWidth="1.4" />
        </g>
      ))}
      <g className="pearl">
        <path
          d="M500 2 C 511 13, 517 22, 510 31 C 506 26, 504 22, 500 20 C 496 22, 494 26, 490 31 C 483 22, 489 13, 500 2 Z"
          fill="var(--vermilion)"
          stroke={INK}
          strokeWidth="1.6"
        />
        <circle cx="500" cy="38" r="13" fill="var(--marigold)" stroke={INK} strokeWidth="2" />
        <circle cx="496" cy="34" r="3.5" fill="var(--paper-hi)" />
      </g>
      {/* 剪黏花 */}
      {[210, 790].map((x) => (
        <g key={x} stroke={INK} strokeWidth="1.5">
          <circle cx={x - 11} cy="50" r="6.5" fill="var(--vermilion)" />
          <circle cx={x} cy="43" r="6.5" fill="var(--marigold)" />
          <circle cx={x + 11} cy="50" r="6.5" fill="var(--cobalt)" />
        </g>
      ))}
    </svg>
  );
}

/** 天空：金色太陽、祥雲、閃光 */
function Sky() {
  return (
    <svg className="gate-sky" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <Sun cx={500} cy={150} r={150} rays={36} />
      <g className="clouds" fill="var(--paper-hi)" stroke="var(--celadon-lo)" strokeWidth="2.2" strokeLinecap="round">
        <path
          className="cloud cloud--a"
          d="M60 120 c0 -18 24 -24 34 -12 c6 -16 34 -16 40 2 c16 -6 30 8 22 22 h-90 c-8 0 -12 -6 -6 -12 Z"
        />
        <path
          className="cloud cloud--b"
          d="M820 70 c0 -16 22 -22 31 -11 c6 -15 31 -15 37 2 c15 -5 27 7 20 20 h-82 c-8 0 -11 -5 -6 -11 Z"
        />
        <path
          className="cloud cloud--c"
          d="M880 230 c0 -12 16 -16 23 -8 c4 -11 23 -11 27 1 c11 -4 20 5 15 15 h-60 c-6 0 -8 -4 -5 -8 Z"
        />
      </g>
      <Sparks
        points={[
          [230, 90, 0.4],
          [760, 160, 1.2],
          [130, 260, 2],
          [880, 330, 2.6],
        ]}
      />
    </svg>
  );
}

function SideLantern({ side, char }: { side: 'l' | 'r'; char: string }) {
  return (
    <svg className={`gate-lantern gate-lantern--${side}`} viewBox="0 0 90 190" aria-hidden="true">
      <Lantern x={45} top={0} cord={46} char={char} delay={side === 'r' ? -1.4 : 0} />
    </svg>
  );
}

/** 廟宇版的門面：天空、屋頂、匾額、石柱對聯、朱門、台階 */
export function Facade() {
  return (
    <>
      <Sky />
      <div className="gate__facade">
        <Roof />
        <div className="gate__lintel">
          <svg className="gate__beam" viewBox="0 0 1000 56" preserveAspectRatio="none" aria-hidden="true">
            <Beam x0={0} x1={1000} h={56} />
          </svg>
          <h1 className="gate__plaque" aria-label="食在難選">
            {['食', '在', '難', '選'].map((c) => (
              <span key={c} aria-hidden="true">
                {c}
              </span>
            ))}
          </h1>
        </div>
        <div className="gate__body">
          <div className="pillar" aria-hidden="true">
            <span className="pillar__text">一搖一抽吃最香</span>
          </div>
          <div className="gate__doors">
            <div className="gate__inside" aria-hidden="true" />
            <div className="door door--l">
              <span className="door__studs" />
              <span className="knocker" />
            </div>
            <div className="door door--r">
              <span className="door__studs" />
              <span className="knocker" />
            </div>
          </div>
          <div className="pillar" aria-hidden="true">
            <span className="pillar__text">左思右想選不了</span>
          </div>
        </div>
        <div className="gate__step" aria-hidden="true" />
        <SideLantern side="l" char="吃" />
        <SideLantern side="r" char="飽" />
      </div>
    </>
  );
}
