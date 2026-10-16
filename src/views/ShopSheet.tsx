'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import gsap from 'gsap';
import { Sheet } from '@/components/Sheet';
import { Avatar } from '@/components/Avatar';
import { HatAvatar } from '@/components/HatAvatar';
import { CategoryIcon, WalkIcon } from '@/components/CategoryIcon';
import { Icon } from '@/components/Icon';
import { Loading } from '@/components/Loading';
import { LoveButton } from '@/components/LoveButton';
import { MapLink } from '@/components/MapLink';
import { NoteCard } from '@/components/NoteCard';
import { useToast } from '@/components/Toast';
import { useAppData } from '@/lib/appData';
import { useTheme } from '@/themes';
import { addNote, deleteNote, lastVisit, setPref, useNotes, type Pref } from '@/lib/store';
import { decided, type Meal } from '@/lib/meal';
import { paper, stamp } from '@/lib/sound';
import { reducedMotion, sleep } from '@/lib/motion';
import { ago } from '@/lib/format';
import { categoryOf, priceOf, walkOf, type Restaurant } from '@/lib/types';
import './ShopSheet.css';

/** 拆下菜牌（收起魔法書）的儀式多長，播完才真的刪掉 */
const REMOVE_MS = 1650;

/** 店家詳情：蓋愛店章、貼封條、看誰愛這家、貼紙條 */
export function ShopSheet({
  restaurant,
  onClose,
  onEdit,
  onRemove,
}: {
  restaurant: Restaurant | null;
  onClose: () => void;
  onEdit: () => void;
  onRemove: (id: string) => void;
}) {
  // 關閉動畫期間保留最後一家的內容
  const [shown, setShown] = useState<Restaurant | null>(restaurant);
  if (restaurant && restaurant !== shown) setShown(restaurant);
  return (
    <Sheet
      open={!!restaurant}
      onClose={onClose}
      eyebrow={shown ? categoryOf(shown.category).label : ''}
      title={shown?.name ?? ''}
      icon={shown ? <CategoryIcon id={shown.category} size={34} /> : undefined}
      aside={shown ? <EditAside r={shown} onEdit={onEdit} /> : null}
    >
      {shown && <Detail key={shown.id} r={shown} onRemove={onRemove} />}
    </Sheet>
  );
}

/** 標題右上角：可以改就是「修改」，建立者沒開放就是一行鎖住的小字 */
function EditAside({ r, onEdit }: { r: Restaurant; onEdit: () => void }) {
  const { me, memberMap } = useAppData();
  const { theme } = useTheme();
  if (r.open || r.createdBy === me.id)
    return (
      <button type="button" className="btn btn--line shop__edit" onClick={onEdit}>
        <Icon name="edit" size={16} />
        修改
      </button>
    );
  return <p className="shop__locked">{theme.copy.shops.locked(memberMap.get(r.createdBy)?.name ?? '建立的人')}</p>;
}

function Detail({ r, onRemove }: { r: Restaurant; onRemove: (id: string) => void }) {
  const { me, members, memberMap } = useAppData();
  const { theme } = useTheme();
  const toast = useToast();
  const notes = useNotes(r.id);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const preview = useRef<HTMLDivElement>(null);

  const liked = me.likes.includes(r.id);
  const blocked = me.blocks.includes(r.id);
  // 是誰張貼（放上來）的：頭像戴一頂小帽子
  const poster = memberMap.get(r.createdBy) ?? { id: r.createdBy, name: '同事', photoURL: '' };
  const fans = members.filter((m) => m.likes.includes(r.id));
  // 只有建立者能拆（修改的按鈕在標題右上角）
  const canRemove = r.createdBy === me.id;

  // 確定拆掉：上面的菜牌演完整段拆下來的儀式（魔法書化成星塵），再交給店家頁真的刪掉
  const removeNow = async () => {
    if (removing) return;
    setRemoving(true);
    await sleep(reducedMotion() ? 0 : REMOVE_MS);
    onRemove(r.id);
  };

  // 愛店、不吃：結果直接蓋在左邊的卡片上，不另外跳提示。
  // 本機一改就會更新畫面，所以在狀態變的那一刻（畫面更新前）接手動畫，不等伺服器回應
  const prevPrefs = useRef({ liked, blocked });
  useLayoutEffect(() => {
    const was = prevPrefs.current;
    prevPrefs.current = { liked, blocked };
    const el = preview.current;
    if (!el || reducedMotion()) return;
    // 愛店章等按鈕上的石章（或咒語）落下的那一刻才蓋到卡片上
    if (liked && !was.liked)
      gsap.fromTo(
        el.querySelector('[data-part="love"]'),
        { scale: 2.4, rotate: 30, opacity: 0 },
        {
          scale: 1,
          rotate: 0,
          opacity: 1,
          duration: 0.32,
          delay: 0.26,
          ease: 'back.out(2.4)',
          clearProps: 'opacity,transform',
        },
      );
    // 封條（封印）一條一條貼上去，最後蓋上官印（火漆）
    if (blocked && !was.blocked) {
      const q = gsap.utils.selector(el);
      gsap
        .timeline()
        .fromTo(
          q('[data-part="ban"] .ban__strip--a'),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.26, ease: 'power3.out', transformOrigin: '0% 50%', clearProps: 'transform' },
        )
        .fromTo(
          q('[data-part="ban"] .ban__strip--b'),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.26, ease: 'power3.out', transformOrigin: '100% 50%', clearProps: 'transform' },
          '-=0.08',
        )
        .fromTo(
          q('[data-part="ban"] .ban__stamp'),
          { scale: 2.4, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.26, ease: 'back.out(2.6)', clearProps: 'transform,opacity' },
        )
        .add(() => stamp(), '-=0.12');
    }
  }, [liked, blocked]);

  const choose = (pref: Pref) => {
    const next = (pref === 'like' && liked) || (pref === 'block' && blocked) ? null : pref;
    if (next === 'block') paper(0.3);
    setPref(me.id, r.id, next).catch(() => toast('沒有存到，等一下再試', '咦'));
  };

  const post = async (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await addNote(me.id, r.id, t);
      setText('');
      paper(0.25);
    } catch {
      toast('紙條沒有貼上去，等一下再試', '咦');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`shop${confirm ? ' is-asking' : ''}${removing ? ' is-removing' : ''}`}>
      <div className="shop__top">
        <div className="shop__preview" ref={preview}>
          <theme.ShopCard
            r={r}
            liked={liked}
            blocked={blocked}
            likes={fans.length}
            mine={r.createdBy === me.id}
            big
            state={removing ? 'removing' : undefined}
          />
        </div>
        <div className="shop__info">
          <ul className="shop__meta">
            <li>
              <b>價位</b>
              <span className="shop__price">
                <theme.PriceMark n={r.price} size={15} />
                {priceOf(r.price).label}
              </span>
            </li>
            <li>
              <b>步行</b>
              <span className="shop__walk">
                <WalkIcon v={r.walk} size={16} />
                {walkOf(r.walk).label}
              </span>
            </li>
            <li>
              <b>揪團</b>
              {r.group ? '適合多人' : '比較適合一兩個人'}
            </li>
            <li className="shop__by">
              <b>張貼</b>
              <span className="shop__poster">
                <HatAvatar member={poster} size={28} />
                <span className="shop__poster-name">{poster.name}</span>
              </span>
              {r.createdAt && (
                <theme.DateStamp
                  date={r.createdAt}
                  size={60}
                  className="shop__posted is-pressed"
                  label={`張貼於 ${r.createdAt.getFullYear()} 年 ${r.createdAt.getMonth() + 1} 月 ${r.createdAt.getDate()} 日`}
                />
              )}
            </li>
            <LastVisit rid={r.id} />
          </ul>
        </div>
        {/* 動作區：愛店和不吃並排一樣高，地圖連結整條 */}
        <div className="shop__acts">
          <LoveButton liked={liked} onToggle={() => choose('like')} />
          <div className="shop__block">
            <button
              type="button"
              className={`btn ${blocked ? 'is-on' : 'btn--line'}`}
              aria-pressed={blocked}
              onClick={() => choose('block')}
            >
              <Icon name="ban" size={20} />
              {blocked ? theme.copy.blockedLabel : theme.copy.blockCta}
            </button>
          </div>
          {blocked && <p className="shop__block-hint">{theme.copy.blockedHint}</p>}
          <MapLink r={r} className="shop__map" />
        </div>
      </div>

      <section className="shop__fans" aria-label="誰愛這家">
        <h3>誰愛這家</h3>
        {fans.length === 0 ? (
          <theme.Vignette kind="fans-empty" />
        ) : (
          <ul>
            {fans.map((m) => (
              <li key={m.id}>
                <Avatar member={m} size={30} />
                <span>{m.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="shop__notes" aria-label="紙條">
        <h3>紙條</h3>
        <form className="shop__write" onSubmit={post}>
          <label htmlFor="note-text" className="sr-only">
            寫一張紙條
          </label>
          <input
            id="note-text"
            className="input"
            value={text}
            maxLength={200}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：週五人很多，早點去"
            enterKeyHint="send"
          />
          <button type="submit" className="btn btn--zhu" aria-disabled={!text.trim() || sending}>
            貼上
          </button>
        </form>
        {notes.data === undefined && !notes.error ? (
          <Loading size={38} label="紙條讀取中" />
        ) : !notes.data?.length ? (
          <theme.Vignette kind={notes.error ? 'notes-error' : 'notes-empty'} />
        ) : (
          <ul className="notes">
            {notes.data.map((n, i) => (
              <NoteCard
                key={n.id}
                text={n.text}
                author={memberMap.get(n.uid) ?? { id: n.uid, name: '同事', photoURL: '' }}
                when={ago(n.createdAt)}
                tilt={i % 2 ? 0.8 : -0.8}
                onDelete={
                  n.uid === me.id || me.role === 'admin'
                    ? () =>
                        deleteNote(r.id, n.id).catch((err) => {
                          toast('拿不下來，等一下再試', '咦');
                          throw err;
                        })
                    : undefined
                }
              />
            ))}
          </ul>
        )}
      </section>

      {canRemove && !confirm && (
        <footer className="shop__foot">
          <button type="button" className="btn btn--quiet shop__remove" onClick={() => setConfirm(true)}>
            <theme.Glyph name="remove" size={24} />
            {theme.copy.shops.remove}
          </button>
        </footer>
      )}
      {/* 要拆掉嗎：說清楚紙條會一起清掉；上面的菜牌（魔法書）同時晃起來 */}
      {canRemove && confirm && (
        <div className="shop__ask" role="group" aria-label={theme.copy.shops.removeConfirm}>
          <p>{theme.copy.shops.removeAsk}</p>
          <div className="shop__ask-actions">
            <button
              type="button"
              className="btn btn--zhu shop__remove-yes"
              onClick={removeNow}
              aria-disabled={removing}
            >
              <theme.Glyph name="remove" size={22} />
              {theme.copy.shops.removeYes}
            </button>
            <button type="button" className="btn btn--line" onClick={() => setConfirm(false)} disabled={removing}>
              {theme.copy.notes.keep}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const WEEK = '日一二三四五六';

/**
 * 你上次在這家起駕是哪一餐：日期、哪一餐、跟誰去。
 * 這個月的直接從即時資料找，找不到再去歷史裡查一次。
 */
function LastVisit({ rid }: { rid: string }) {
  const { me, meals, memberMap } = useAppData();
  const { theme } = useTheme();
  const { copy } = theme;
  const local = useMemo(
    () =>
      decided(meals)
        .filter((m) => m.decision!.rid === rid && m.going.includes(me.id))
        .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))[0] ?? null,
    [meals, rid, me.id],
  );
  const [remote, setRemote] = useState<{ rid: string; meal: Meal | null } | null>(null);
  useEffect(() => {
    if (local) return;
    let off = false;
    lastVisit(me.id, rid)
      .then((m) => !off && setRemote({ rid, meal: m }))
      .catch(() => !off && setRemote({ rid, meal: null }));
    return () => {
      off = true;
    };
  }, [local, me.id, rid]);
  const last = local ?? (remote?.rid === rid ? remote.meal : undefined);
  const at = last?.createdAt;
  const mates = last ? last.going.filter((u) => u !== me.id).flatMap((u) => memberMap.get(u) ?? []) : [];
  return (
    <li className="shop__last">
      <b>上次</b>
      <span className={`shop__last-line${last ? '' : ' is-none'}`}>
        <theme.Glyph name={last === null ? 'empty' : 'ledger'} size={last === null ? 26 : 20} />
        {last === undefined ? (
          '翻簿子中…'
        ) : last && at ? (
          <>
            <span>
              {at.getMonth() + 1}/{at.getDate()}（週{WEEK[at.getDay()]}）{last.slot.label}
            </span>
            {mates.length ? (
              <span
                className="shop__last-mates"
                aria-label={`${copy.history.with}：${mates.map((m) => m.name).join('、')}`}
              >
                {mates.slice(0, 4).map((m) => (
                  <Avatar key={m.id} member={m} size={22} />
                ))}
                {mates.length > 4 && <i>+{mates.length - 4}</i>}
              </span>
            ) : (
              <span className="shop__last-alone">
                <theme.Glyph name="alone" size={20} />
                {copy.history.alone}
              </span>
            )}
          </>
        ) : (
          '還沒在這家起駕過'
        )}
      </span>
    </li>
  );
}
