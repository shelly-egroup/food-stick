'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { AltarTable } from '@/art/AltarTable';
import { Say } from '@/art/Say';
import { Beam, Bracket, Cat, Censer, Lantern, Oranges, Sparks, Sun } from './parts';
import { BaguaLight, playBagua, stopBagua } from './Bagua';
import { Tube, type TubeHandle } from './Tube';
import { useTempleCat } from './useCat';
import type { StageFloorProps, StageHandle } from '../types';
import './Stage.css';

/** 上層：大樑、雀替、燈籠，貼齊畫面頂部 */
export function StageTop() {
  return (
    <svg className="stage__top" viewBox="0 0 390 214" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <Lantern x={78} top={48} cord={52} />
      <Lantern x={304} top={48} cord={30} delay={-1.7} />
      <Bracket x={0} y={48} />
      <Bracket x={390} y={48} flip />
      <Beam />
    </svg>
  );
}

/**
 * 下層：太陽、香爐、柑橘、供桌、廟貓與籤筒，貼齊畫面底部。
 * 籤筒直接放在同一張 SVG 裡，任何比例都會穩穩站在供桌上。
 */
export const StageFloor = forwardRef<StageHandle, StageFloorProps>(function StageFloor(
  { count, busy, onTap, label },
  ref,
) {
  const svg = useRef<SVGSVGElement>(null);
  const tube = useRef<TubeHandle>(null);
  useImperativeHandle(ref, () => ({
    draw: async () => {
      playBagua(svg.current);
      await tube.current?.draw();
      return undefined;
    },
    settle: async () => {
      stopBagua(svg.current);
      await tube.current?.settle();
    },
  }));
  const cat = useTempleCat(svg);
  return (
    <svg ref={svg} className="stage__art" viewBox="0 0 390 330" overflow="visible" aria-hidden="true">
      <Sun cx={195} cy={96} />
      <Sparks
        points={[
          [62, 70, 0],
          [330, 44, 0.8],
          [306, 164, 1.6],
          [84, 160, 2.3],
        ]}
      />
      <Censer x={34} base={218} />
      <Oranges x={318} base={218} />
      <AltarTable x0={10} x1={380} top={218} label={label} />
      <rect x="54" y="292" width="282" height="38" fill="url(#hatch-d)" opacity="0.3" />
      <BaguaLight cx={195} cy={214} />
      <Tube ref={tube} count={count} busy={busy} onTap={() => onTap()} x={55} y={-151} width={280} height={407} />
      {/* 廟貓畫在最上層：跳上供桌時會在籤筒前面 */}
      <g className="cat-run" transform={`translate(${cat.start} 308)`}>
        <Cat onPoke={cat.poke} />
        {cat.line && <Say key={cat.line.n} text={cat.line.text} angry={cat.line.angry} y={-30} />}
      </g>
    </svg>
  );
});
