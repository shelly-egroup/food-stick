import Link from 'next/link';

export default function NotFound() {
  return (
    <section style={{ display: 'grid', placeItems: 'center', gap: 16, padding: '80px 16px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem' }}>這一頁被神明收走了</h1>
      <p style={{ color: 'var(--ink-2)' }}>找不到這個頁面。回廟裡重新求一支籤吧。</p>
      <Link className="btn btn--zhu" href="/">
        回首頁
      </Link>
    </section>
  );
}
