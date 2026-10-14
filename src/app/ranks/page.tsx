import type { Metadata } from 'next';
import { Ranks } from '@/views/Ranks';

export const metadata: Metadata = { title: '人氣排行' };

export default function Page() {
  return <Ranks />;
}
