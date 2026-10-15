'use client';

import { useTheme } from '@/themes';
import { paper, twinkle } from '@/lib/sound';
import './Pager.css';

export function Pager({
  page,
  pages,
  onPage,
  prev,
  next,
  label,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
  prev: string;
  next: string;
  label: string;
}) {
  const { theme } = useTheme();
  if (pages <= 1) return null;
  const go = (p: number) => {
    if (p < 0 || p >= pages || p === page) return;
    if (theme.id === 'magic') twinkle(p * 2);
    else paper(0.14);
    onPage(p);
  };
  return (
    <nav className="pager" aria-label={label}>
      <button type="button" className="pager__btn" onClick={() => go(page - 1)} aria-disabled={page === 0}>
        <i aria-hidden="true">‹</i>
        {prev}
      </button>
      <ol className="pager__dots">
        {Array.from({ length: pages }, (_, i) => (
          <li key={i}>
            <button
              type="button"
              className={i === page ? 'is-on' : undefined}
              aria-current={i === page ? 'page' : undefined}
              aria-label={`第 ${i + 1} 頁，共 ${pages} 頁`}
              onClick={() => go(i)}
            />
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="pager__btn pager__btn--next"
        onClick={() => go(page + 1)}
        aria-disabled={page === pages - 1}
      >
        {next}
        <i aria-hidden="true">›</i>
      </button>
    </nav>
  );
}
