'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { useTheme } from '@/themes';
import { answerMeal, cancelMeal, inviteMeal } from '@/lib/store';
import { useAppData } from '@/lib/appData';
import { modeOf, tallyOf, type Meal } from '@/lib/meal';
import { reducedMotion } from '@/lib/motion';
import type { Member } from '@/lib/types';
import { Avatar } from './Avatar';
import { CrewSheet } from './CrewSheet';
import { MateMarks } from './MateMarks';
import { useToast } from './Toast';
import './CrewPicker.css';

/** 最多存幾團（規則也是這樣限制） */
const MAX_CREWS = 8;

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** 發邀請的那一刻：一張張紅帖（一封封長了翅膀的信）從按鈕飛到每個被揪的人頭上 */
function flyInvites(from: HTMLElement | null, targets: Element[], art: HTMLElement | null) {
  if (!from || !art || reducedMotion()) return;
  const a = from.getBoundingClientRect();
  const sx = a.left + a.width / 2;
  const sy = a.top + a.height / 2;
  targets.forEach((t, i) => {
    const b = t.getBoundingClientRect();
    const dx = b.left + b.width / 2 - sx;
    const dy = b.top + b.height / 2 - sy;
    const el = document.createElement('span');
    el.className = 'crew-flyer';
    el.innerHTML = art.innerHTML;
    el.style.left = `${sx - 15}px`;
    el.style.top = `${sy - 15}px`;
    document.body.appendChild(el);
    const peak = Math.min(dy, 0) - 70;
    el.animate(
      [
        { transform: 'translate(0, 0) scale(0.4) rotate(0deg)', opacity: 0 },
        { transform: `translate(${dx * 0.45}px, ${peak}px) scale(1.2) rotate(-14deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.8) rotate(10deg)`, opacity: 1, offset: 0.88 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.2) rotate(10deg)`, opacity: 0 },
      ],
      { duration: 860, delay: i * 90, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)', fill: 'both' },
    ).finished.finally(() => el.remove());
  });
}

/**
 * 揪團：挑這一餐跟誰一起吃。常一起吃的人排前面（由外面排好）。
 * 存好的進香團（魔法：冒險小隊）是一面面小團旗（徽章），點了打開彈窗：就揪這團、改團、解散都在裡面；
 * 旁邊一面虛線的空旗子是「組成進香團」。被選到的人會蓋上一顆章（魔法：亮起一顆星）。
 * 這一餐已經開了：揪了人的話看大家即時的回覆（發起人可以再遞紅帖、收回），
 * 還只有自己的話，挑好人直接把紅帖遞過去，這一餐就變成揪團。
 * 還沒有其他同事的時候，換成主題的小插畫和「傳網址給同事」。
 */
export function CrewPicker({
  me,
  others,
  selected,
  onToggle,
  onSet,
  meal,
  onSend,
}: {
  me: Member;
  /** 已經依常一起吃的次數、名字排好 */
  others: Member[];
  selected: string[];
  onToggle: (id: string) => void;
  onSet: (ids: string[]) => void;
  /** 這一餐已經開了（我要去的那一張） */
  meal: Meal | null;
  /** 還沒開：發紅帖揪人（開一張還沒抽的單） */
  onSend: (ids: string[]) => Promise<void>;
}) {
  const { theme } = useTheme();
  const { copy } = theme;
  const toast = useToast();
  const { memberMap } = useAppData();
  const [invited, setInvited] = useState(false);
  const [sending, setSending] = useState(false);
  // 發起人再遞紅帖：打開名單挑還沒被揪的人
  const [adding, setAdding] = useState(false);
  const sendRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLSpanElement>(null);
  // 關的時候 index 留著，關閉動畫期間彈窗內容才不會變
  const [sheet, setSheet] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });

  if (others.length === 0) {
    const invite = async () => {
      const url = location.origin;
      try {
        if (navigator.share) {
          await navigator.share({ title: '食在難選', text: '午餐不知道吃什麼？一起來抽！', url });
          return;
        }
        await navigator.clipboard.writeText(url);
        setInvited(true);
      } catch {
        /* 取消分享就算了 */
      }
    };
    return (
      <div className="crew crew--empty">
        <theme.Vignette kind="crew-empty" />
        <button type="button" className="btn btn--line crew__invite" onClick={invite}>
          {invited ? copy.crew.invited : copy.crew.invite}
        </button>
      </div>
    );
  }

  const byId = new Map(others.map((m) => [m.id, m]));
  // 存的名單裡可能有已經不在的人，只算還在的
  const crews = me.crews.map((c) => ({ ...c, ids: c.ids.filter((id) => byId.has(id)) }));
  const active = crews.findIndex((c) => c.ids.length > 0 && sameSet(c.ids, selected));
  const oops = () => toast('沒有成功，等一下再試', '咦');
  // 已經開好的一餐：只能再揪還沒在名單上的人
  const fresh = meal ? selected.filter((id) => !meal.party.includes(id)) : selected;

  /** 發紅帖：紅帖飛出去（貓頭鷹出發），被揪的人即時收到 */
  const send = async () => {
    if (!fresh.length || sending) return;
    setSending(true);
    theme.heraldSound();
    flyInvites(
      sendRef.current,
      [...(gridRef.current?.querySelectorAll('.crew__pick.is-on:not(.is-me):not(.is-in) .crew__face') ?? [])],
      artRef.current,
    );
    try {
      if (meal) {
        await inviteMeal(meal.id, fresh);
        setAdding(false);
      } else await onSend(selected);
    } catch {
      toast('紅帖沒有送出去，等一下再試', '咦');
    } finally {
      setSending(false);
    }
  };

  // 這一餐已經揪了人：名單即時更新。發起人可以再遞紅帖、收回；被揪的人可以說這次不跟了
  if (meal && modeOf(meal) === 'group' && !adding) {
    const mine = meal.host === me.id;
    const host = memberMap.get(meal.host)?.name ?? '同事';
    // 底下每個人的頭像都標了回覆，這裡只要一行字總結（不再疊一排數字章）
    const t = tallyOf(meal, me.id);
    return (
      <div className={`crew crew--gather${mine ? '' : ' crew--member'}`} role="group" aria-label={copy.crew.title}>
        <div className="crew__gather-head">
          <span className="crew__gather-glyph">
            <theme.Glyph name={mine ? 'invite' : 'herald'} size={30} />
          </span>
          <p>
            <b>{mine ? copy.crew.sent : copy.crew.member(host)}</b>
            <span aria-live="polite">{copy.crew.tally(t.in, t.wait, t.out)}</span>
          </p>
          <span className="crew__gather-acts">
            {mine && (
              <button
                type="button"
                className="crew__recall"
                onClick={() => {
                  onSet([]);
                  setAdding(true);
                }}
              >
                <theme.Glyph name="invite" size={20} />
                {copy.crew.add}
              </button>
            )}
            <button
              type="button"
              className="crew__recall"
              onClick={() => (mine ? cancelMeal(meal.id) : answerMeal(meal.id, me.id, 'out')).catch(oops)}
            >
              <theme.Glyph name={mine ? 'recall' : 'disband'} size={20} />
              {mine ? copy.crew.recall : copy.crew.leave}
            </button>
          </span>
        </div>
        <MateMarks meal={meal} skip={me.id} size={42} />
      </div>
    );
  }

  return (
    <div className="crew" role="group" aria-label={copy.crew.title}>
      <div className="crew__head">
        <span className="crew__title">{copy.crew.title}</span>
      </div>

      <div className="crew__presets">
        {crews.map((c, i) => (
          <button
            key={`${c.name}-${i}`}
            type="button"
            className={`crew__preset${i === active ? ' is-on' : ''}`}
            style={{ '--i': i } as CSSProperties}
            aria-haspopup="dialog"
            aria-label={`${copy.crew.preset}「${c.name}」，${c.ids.length + 1} 人${i === active ? '，這次就揪這團' : ''}`}
            onClick={() => setSheet({ open: true, index: i })}
          >
            <span className="crew__flag">
              <b>{c.name}</b>
            </span>
            <span className="crew__pole" aria-hidden="true" />
            <span className="crew__faces" aria-hidden="true">
              {c.ids.slice(0, 4).map((id) => (
                <Avatar key={id} member={byId.get(id)!} size={20} />
              ))}
              {c.ids.length > 4 && <span className="crew__more">+{c.ids.length - 4}</span>}
            </span>
          </button>
        ))}
        {crews.length < MAX_CREWS && (
          <button
            type="button"
            className="crew__new"
            aria-haspopup="dialog"
            onClick={() => setSheet({ open: true, index: null })}
          >
            <span className="crew__new-flag">
              <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
                <path d="M1 1 H99 V31 H1 L13 16 Z" />
              </svg>
              <b>＋ {copy.crew.save}</b>
            </span>
            <span className="crew__pole" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="crew__grid" ref={gridRef}>
        <span className="crew__pick is-me is-on">
          <span className="crew__face">
            <Avatar member={me} size={42} />
            <i className="crew__mark" aria-hidden="true" />
          </span>
          <span className="crew__name">我</span>
        </span>
        {others.map((m) => {
          // 已經在這一餐的名單上：蓋著章、不能再點
          const inMeal = !!meal?.party.includes(m.id);
          const on = inMeal || selected.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              className={`crew__pick${on ? ' is-on' : ''}${inMeal ? ' is-in' : ''}`}
              aria-pressed={on}
              aria-disabled={inMeal}
              onClick={() => !inMeal && onToggle(m.id)}
            >
              <span className="crew__face">
                <Avatar member={m} size={42} />
                {on && <i className="crew__mark" aria-hidden="true" />}
              </span>
              <span className="crew__name">{m.name}</span>
            </button>
          );
        })}
      </div>

      {/* 發紅帖（放出貓頭鷹）；這一餐已經開了就是把紅帖遞給剛挑的人 */}
      <div className="crew__send">
        {adding && (
          <button type="button" className="crew__recall" onClick={() => setAdding(false)}>
            <theme.Glyph name="skip" size={20} />
            先不揪了
          </button>
        )}
        <button
          ref={sendRef}
          type="button"
          className="btn btn--zhu crew__send-btn"
          onClick={send}
          aria-disabled={!fresh.length || sending}
        >
          <theme.Glyph name="invite" size={24} />
          {meal ? copy.crew.addCta(fresh.length) : copy.crew.send}
        </button>
        <span ref={artRef} hidden>
          <theme.Glyph name="invite" size={30} />
        </span>
      </div>

      <CrewSheet
        open={sheet.open}
        me={me}
        others={others}
        index={sheet.index}
        draft={selected}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onApply={onSet}
      />
    </div>
  );
}
