/** 版畫用的共用 SVG 定義：線刻網紋 */
export function PrintDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {/* 直線刻：暗面 */}
        <pattern id="hatch-v" width="4.2" height="10" patternUnits="userSpaceOnUse">
          <line x1="0.6" y1="0" x2="0.6" y2="10" stroke="#26211d" strokeWidth="0.9" />
        </pattern>
        {/* 斜線刻：投影 */}
        <pattern id="hatch-d" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-32)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#26211d" strokeWidth="1.1" />
        </pattern>
        <pattern id="hatch-fine" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-32)">
          <line x1="0" y1="0" x2="0" y2="3" stroke="#26211d" strokeWidth="0.55" />
        </pattern>
      </defs>
    </svg>
  );
}
