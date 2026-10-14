import { Seal } from '@/components/Seal';

/** 籤詩右上角的朱紅籤等章：上上、大吉… */
export function CardSeal({ text, label }: { text: string; label: string }) {
  return <Seal text={text} size={66} className="card__seal" label={label} />;
}
