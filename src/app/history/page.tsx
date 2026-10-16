import type { Metadata } from 'next';
import { History } from '@/views/History';

export const metadata: Metadata = { title: '食籤簿' };

export default function Page() {
  return <History />;
}
