import { INK } from '@/art/ink';
import { BookStack, Candle, Constellation, Owl, Star } from './parts';
import { LiveMoon } from './LiveMoon';
import { CrystalBall } from './CrystalBall';
import './Facade.css';

/** 封面水晶球的位置（gate__orb 這張 SVG 的座標），入口動畫以球心為原點 */
export const COVER = { cx: 200, cy: 250, r: 110 };

/** 夜空：彎月、星座、閃爍的星星 */
function MagicSky() {
  return (
    <svg className="gate-sky" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <Constellation
        pts={[
          [90, 120],
          [150, 80],
          [210, 110],
          [260, 60],
        ]}
      />
      <Constellation
        pts={[
          [760, 90],
          [820, 130],
          [880, 100],
          [920, 160],
        ]}
        delay={1.2}
      />
      <g className="twinkle">
        <Star x={330} y={70} r={10} delay={0} className="tw" />
        <Star x={690} y={200} r={8} fill="var(--cobalt)" delay={0.7} className="tw" />
        <Star x={140} y={260} r={7} delay={1.4} className="tw" />
        <Star x={870} y={300} r={9} delay={2.1} className="tw" />
        <Star x={600} y={40} r={6} fill="var(--vermilion)" delay={1} className="tw" />
      </g>
    </svg>
  );
}

/** 拱門：鈷藍拱帶與星星，頂端一顆大星 */
function Arch() {
  const stars = [140, 230, 330, 420, 580, 670, 770, 860];
  const archY = (x: number) => {
    const t = (x - 500) / 440;
    return 30 + 200 * t * t;
  };
  return (
    <svg className="gate-roof" viewBox="0 -30 1000 240" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <path
        d="M40 210 C 40 100, 280 14, 500 6 C 720 14, 960 100, 960 210 L 912 210 C 912 124, 700 54, 500 48 C 300 54, 88 124, 88 210 Z"
        fill="var(--cobalt)"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M64 210 C 64 112, 290 34, 500 27 C 710 34, 936 112, 936 210"
        fill="none"
        stroke="var(--marigold)"
        strokeWidth="2.4"
        strokeDasharray="2 9"
        strokeLinecap="round"
      />
      {stars.map((x, i) => (
        <Star key={x} x={x} y={archY(x) + 4} r={i % 2 ? 6 : 8} className="tw" delay={i * 0.35} />
      ))}
      <LiveMoon cx={500} cy={128} r={44} />
      <g className="pearl">
        <Star x={500} y={4} r={26} />
        <circle cx="500" cy="4" r="5" fill="var(--vermilion)" stroke={INK} strokeWidth="1.4" />
      </g>
    </svg>
  );
}

function Stack({ side }: { side: 'l' | 'r' }) {
  return (
    <div className={`magic-stack magic-stack--${side}`} aria-hidden="true">
      <svg viewBox="0 0 90 260" preserveAspectRatio="xMidYMax meet">
        <BookStack x={45} base={260} w={86} />
        <BookStack x={45} base={209} w={76} />
        <Candle x={side === 'l' ? 36 : 54} base={158} h={52} delay={side === 'r' ? -0.6 : 0} />
      </svg>
    </div>
  );
}

/** 占卜桌：木頭桌面＋垂到地上的星星桌巾，讓水晶球穩穩落地 */
function FortuneTable() {
  const scallops = Array.from({ length: 12 }, (_, i) => 20 + i * 30);
  return (
    <g className="fortune-table">
      <path
        d={`M40 392 C 30 500, 22 600, 18 690 ${scallops.map((x) => `Q ${x + 15} 708 ${x + 30} 690`).join(' ')} C 378 600, 370 500, 360 392 Z`}
        fill="var(--cobalt)"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M40 410 C 140 432, 260 432, 360 410" fill="none" stroke="var(--marigold)" strokeWidth="3" />
      <path
        d="M26 672 C 140 690, 260 690, 374 672"
        fill="none"
        stroke="var(--marigold)"
        strokeWidth="2.4"
        strokeDasharray="2 8"
        strokeLinecap="round"
      />
      {[
        [90, 480],
        [200, 520],
        [310, 470],
        [130, 600],
        [270, 610],
      ].map(([x, y], i) => (
        <Star key={i} x={x} y={y} r={i % 2 ? 9 : 12} className="tw" delay={i * 0.5} />
      ))}
      <ellipse cx="200" cy="392" rx="160" ry="22" fill="var(--wood)" stroke={INK} strokeWidth="2" />
      <ellipse cx="200" cy="388" rx="148" ry="16" fill="none" stroke="var(--wood-lo)" strokeWidth="1.4" />
    </g>
  );
}

/** 魔法版的門面：占卜桌上一顆巨大的水晶球，喚醒它就進去 */
export function Facade() {
  return (
    <>
      <MagicSky />
      <div className="gate__facade">
        <Arch />
        <div className="gate__lintel">
          <svg className="gate__beam gate__ribbon" viewBox="0 0 1000 56" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 8 H1000 L980 28 L1000 48 H0 L20 28 Z" fill="var(--cobalt)" stroke={INK} strokeWidth="2" />
            <line x1="30" y1="14" x2="970" y2="14" stroke="var(--marigold)" strokeWidth="1.4" />
            <line x1="30" y1="42" x2="970" y2="42" stroke="var(--marigold)" strokeWidth="1.4" />
          </svg>
          <h1 className="gate__plaque" aria-label="食在難選">
            {['食', '在', '難', '選'].map((c) => (
              <span key={c} aria-hidden="true">
                {c}
              </span>
            ))}
          </h1>
        </div>
        <div className="gate__body gate__body--magic">
          <Stack side="l" />
          <div className="gate__orb">
            <svg viewBox="0 0 400 700" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
              <FortuneTable />
              <CrystalBall id="cover" cx={COVER.cx} cy={COVER.cy} r={COVER.r} />
              <Owl x={86} y={390} s={1.25} />
            </svg>
          </div>
          <Stack side="r" />
        </div>
        <div className="gate__step gate__step--desk" aria-hidden="true" />
      </div>
      <div className="gate__flash" aria-hidden="true" />
    </>
  );
}
