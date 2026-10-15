'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Loading } from '@/components/Loading';
import { useAppData } from '@/lib/appData';
import { useUi } from '@/lib/uiContext';
import { useTheme } from '@/themes';
import { deleteRestaurant } from '@/lib/store';
import { useToast } from '@/components/Toast';
import { CategoryFilter, FilterRow, ROW_ICONS, WalkFilter } from '@/components/CategoryFilter';
import { type CategoryId, type Walk } from '@/lib/types';
import { ShopSheet } from './ShopSheet';
import { ShopForm } from './ShopForm';
import './Shops.css';

export function Shops() {
  const { me, members, restaurants, ready } = useAppData();
  const { theme } = useTheme();
  const { ShopCard, copy } = theme;
  const toast = useToast();
  const { addOpen, setAddOpen } = useUi();
  const [q, setQ] = useState('');
  const [cats, setCats] = useState<CategoryId[]>([]);
  const [walks, setWalks] = useState<Walk[]>([]);
  // 只看我的愛店、只看我掛（放）上去的；再按一次回到全部
  const [scope, setScope] = useState<'all' | 'liked' | 'mine'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [gone, setGone] = useState<string | null>(null);

  const likeCount = useMemo(() => {
    const m = new Map<string, number>();
    members.forEach((x) => x.likes.forEach((id) => m.set(id, (m.get(id) ?? 0) + 1)));
    return m;
  }, [members]);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return restaurants
      .filter((r) => !k || r.name.toLowerCase().includes(k))
      .filter((r) => cats.length === 0 || cats.includes(r.category))
      .filter((r) => walks.length === 0 || walks.includes(r.walk))
      .filter((r) => scope !== 'liked' || me.likes.includes(r.id))
      .filter((r) => scope !== 'mine' || r.createdBy === me.id);
  }, [restaurants, q, cats, walks, scope, me.likes, me.id]);

  const filtered = !!q.trim() || cats.length > 0 || walks.length > 0 || scope !== 'all';
  const toggleScope = (s: 'liked' | 'mine') => setScope((v) => (v === s ? 'all' : s));
  const toggleCat = (id: CategoryId) => setCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const toggleWalk = (v: Walk) => setWalks((w) => (w.includes(v) ? w.filter((x) => x !== v) : [...w, v]));
  const showAll = () => {
    setQ('');
    setCats([]);
    setWalks([]);
    setScope('all');
  };

  // 篩完一家都沒有：說清楚是哪個條件
  const noneText = () => {
    const only = !q.trim() && cats.length === 0 && walks.length === 0;
    if (q.trim()) return { title: `找不到「${q.trim()}」`, hint: '換個字找找看，或乾脆把它新增上來。' };
    if (only && scope === 'liked')
      return { title: '還沒有愛店', hint: `打開任何一家店${copy.likeStamp}，就會出現在這裡。` };
    if (only && scope === 'mine') return { title: copy.shops.mineNone, hint: copy.shops.mineNoneHint };
    return { title: '沒有符合條件的店', hint: '換個條件看看，或乾脆把它新增上來。' };
  };

  const open = restaurants.find((r) => r.id === openId) ?? null;
  const editing = restaurants.find((r) => r.id === editId) ?? null;

  return (
    <div className="shops">
      <header className="shops__head">
        <div>
          <p className="eyebrow">{copy.shops.eyebrow}</p>
          <h1 className="shops__title">店家</h1>
          <p className="shops__sub">
            全公司一起維護的午餐地圖
            {ready && (
              <>
                <i className="sub-sep" aria-hidden="true" />共 <b>{restaurants.length}</b> 家
              </>
            )}
          </p>
        </div>
        <button type="button" className="btn btn--zhu shops__add" onClick={() => setAddOpen(true)}>
          <Icon name="plus" />
          新增店家
        </button>
      </header>

      <div className="shops__tools">
        <div className="shops__find">
          <label className="shops__search">
            <Icon name="search" />
            <span className="sr-only">找店名</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="找店名…"
              enterKeyHint="search"
            />
          </label>
          <button
            type="button"
            className="chip shops__scope shops__scope--liked"
            aria-pressed={scope === 'liked'}
            onClick={() => toggleScope('liked')}
          >
            <Icon name="heart" size={17} />
            愛店
          </button>
          <button
            type="button"
            className="chip shops__scope shops__scope--mine"
            aria-pressed={scope === 'mine'}
            onClick={() => toggleScope('mine')}
          >
            <theme.Glyph name="mine" size={20} />
            {copy.shops.mine}
          </button>
        </div>
        <FilterRow icon={ROW_ICONS.category} title="類型" hint="可多選">
          <CategoryFilter selected={cats} onToggle={toggleCat} />
        </FilterRow>
        <FilterRow icon={ROW_ICONS.walk} title="步行" hint="從公司走過去">
          <WalkFilter selected={walks} onToggle={toggleWalk} />
        </FilterRow>
        {filtered && ready && (
          <div className="shops__status" role="status">
            <span className="shops__count" key={list.length}>
              {copy.shops.count(list.length)}
            </span>
            <span className="shops__matched">{copy.shops.matched}</span>
            <button type="button" className="clear-chip" onClick={showAll}>
              {copy.shops.clear}
            </button>
          </div>
        )}
      </div>

      {!ready ? (
        <Loading size={56} label="店家讀取中" className="shops__loading" />
      ) : restaurants.length === 0 ? (
        <div className="shops__empty">
          <theme.Vignette kind="shops-empty" />
          <button type="button" className="btn btn--zhu" onClick={() => setAddOpen(true)}>
            <Icon name="plus" />
            {copy.shops.emptyCta}
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="shops__empty">
          <theme.Vignette kind="shops-none" {...noneText()} />
          <div className="shops__empty-actions">
            <button type="button" className="btn btn--zhu" onClick={showAll}>
              看全部 {restaurants.length} 家
            </button>
            <button type="button" className="btn btn--line" onClick={() => setAddOpen(true)}>
              新增店家
            </button>
          </div>
        </div>
      ) : (
        <ul className="wall" aria-label={`店家${copy.shops.item}`}>
          {list.map((r, i) => (
            <li key={r.id} className="wall__item" style={{ animationDelay: `${Math.min(i, 24) * 30}ms` }}>
              <ShopCard
                r={r}
                liked={me.likes.includes(r.id)}
                blocked={me.blocks.includes(r.id)}
                likes={likeCount.get(r.id) ?? 0}
                mine={r.createdBy === me.id}
                state={fresh === r.id ? 'new' : gone === r.id ? 'gone' : undefined}
                onOpen={() => setOpenId(r.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <ShopSheet
        restaurant={open}
        onClose={() => setOpenId(null)}
        onEdit={() => {
          setEditId(openId);
          setOpenId(null);
        }}
        onRemove={(id) => {
          setOpenId(null);
          setGone(id);
          // 店家詳情裡已經演過整段；回到牆上再快轉一次（菜牌掉下、魔法書化成星塵），播完才真的刪掉。
          // 動畫本身就是結果，成功不另外跳提示
          setTimeout(() => {
            deleteRestaurant(id)
              .catch(() => toast(copy.shops.removeFailed, '咦'))
              .finally(() => setGone(null));
          }, 720);
        }}
      />
      <ShopForm
        open={addOpen || !!editing}
        editing={editing}
        onClose={() => {
          setAddOpen(false);
          setEditId(null);
        }}
        onSaved={(id) => {
          setFresh(id);
          setTimeout(() => setFresh(null), 1600);
        }}
      />
    </div>
  );
}
