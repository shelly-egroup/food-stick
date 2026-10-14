import { Seal } from '@/components/Seal';

/** 廟宇版的稱號徽章：朱紅框的陽刻印，兩個字 */
export function Badge({ text, size = 46 }: { text: string; size?: number }) {
  return <Seal text={[...text].slice(0, 2).join('')} size={size} variant="outline" rotate={-4} />;
}
