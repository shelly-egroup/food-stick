import type { Metadata } from 'next';
import { Shops } from '@/views/Shops';

export const metadata: Metadata = { title: '店家' };

export default function Page() {
  return <Shops />;
}
