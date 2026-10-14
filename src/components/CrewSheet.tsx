'use client';

import { useState } from 'react';
import { useTheme } from '@/themes';
import type { CrewPhase } from '@/themes/types';
import { saveCrews } from '@/lib/store';
import { sleep, reducedMotion } from '@/lib/motion';
import type { Crew, Member } from '@/lib/types';
import { Avatar } from './Avatar';
import { Sheet } from './Sheet';
import { useToast } from './Toast';
import './CrewSheet.css';

/** 每一段動畫播多久才關掉彈窗（主題的 CrewBanner 照這個長度設計） */
const WAIT: Partial<Record<CrewPhase, number>> = { forming: 1150, cheering: 650, parting: 1150 };

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * 進香團（魔法：冒險小隊）的彈窗：點揪團卡片上的團旗打開，或按「組成進香團」新組一團。
 * 上面是主題的小場景（團旗、徽章），下面改團名、點頭像加人減人。
 * 可以就揪這團、存下來、解散（按兩次才算數）；組團、改團、解散都有動畫，播完才關掉。
 */
export function CrewSheet({
  open,
  me,
  others,
  index,
  draft,
  onClose,
  onApply,
}: {
  open: boolean;
  me: Member;
  others: Member[];
  /** 打開第幾團；null 是新組一團 */
  index: number | null;
  /** 新組一團時，先帶入現在選的人 */
  draft: string[];
  onClose: () => void;
  onApply: (ids: string[]) => void;
}) {
  const { theme } = useTheme();
  const { copy } = theme;
  const toast = useToast();
  const byId = new Map(others.map((m) => [m.id, m]));

  const [crew, setCrew] = useState<Crew | null>(null);
  const [name, setName] = useState('');
  const [ids, setIds] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [phase, setPhase] = useState<CrewPhase>('idle');
  // 每次打開（或換一團）就重設；關的時候內容留著，關閉動畫才不會閃
  const session = open ? `${index ?? 'new'}` : null;
  const [last, setLast] = useState<string | null>(null);
  if (session !== last) {
    setLast(session);
    if (session) {
      const c = index === null ? null : (me.crews[index] ?? null);
      setCrew(c);
      setName(c?.name ?? '');
      setIds((c?.ids ?? draft).filter((id) => byId.has(id)));
      setAsking(false);
      setPhase('idle');
    }
  }

  const members = ids.map((id) => byId.get(id)).filter((m): m is Member => !!m);
  const busy = phase !== 'idle';
  const changed =
    !!crew &&
    (name.trim() !== crew.name ||
      !sameSet(
        ids,
        crew.ids.filter((id) => byId.has(id)),
      ));
  const scene: CrewPhase = phase === 'idle' && asking ? 'asking' : phase;

  const toggle = (id: string) => {
    if (busy) return;
    setAsking(false);
    setIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  };

  const write = async (next: (crews: Crew[]) => Crew[]) => {
    try {
      await saveCrews(me.id, next(me.crews));
      return true;
    } catch {
      toast('沒有存到，等一下再試', '咦');
      return false;
    }
  };
  /** 演一段動畫，演完才往下走（使用者關掉動畫就不等） */
  const play = async (p: CrewPhase) => {
    setPhase(p);
    if (!reducedMotion()) await sleep(WAIT[p] ?? 0);
  };
  /** 這一團在現在名單裡的位置（別的裝置可能動過名單） */
  const at = (crews: Crew[]) => {
    if (!crew) return -1;
    const i = crews.findIndex((c) => c.name === crew.name && sameSet(c.ids, crew.ids));
    return i >= 0 ? i : (index ?? -1);
  };

  /** 新組一團：升旗（徽章成形），順便把這些人選起來 */
  const create = async () => {
    const n = name.trim();
    if (!n || !ids.length || busy) return;
    const [ok] = await Promise.all([write((crews) => [...crews, { name: n, ids }]), play('forming')]);
    if (!ok) return setPhase('idle');
    onApply(ids);
    onClose();
  };

  /** 改名、換人就存下來（旗子揮一下）；apply 是順便揪這團 */
  const update = async (apply: boolean) => {
    if (!crew || busy || !ids.length) return;
    if (changed) {
      const n = name.trim() || crew.name;
      const saving = write((crews) => {
        const i = at(crews);
        return i < 0 ? crews : crews.map((c, j) => (j === i ? { name: n, ids } : c));
      });
      const [ok] = await Promise.all([saving, play('cheering')]);
      if (!ok) return setPhase('idle');
    }
    if (apply) onApply(ids);
    onClose();
  };

  /** 解散：第一次只是問，第二次才收旗（徽章碎掉），大家散開 */
  const disband = async () => {
    if (!crew || busy) return;
    if (!asking) return setAsking(true);
    const removing = write((crews) => {
      const i = at(crews);
      return crews.filter((_, j) => j !== i);
    });
    const [ok] = await Promise.all([removing, play('parting')]);
    if (!ok) {
      setAsking(false);
      return setPhase('idle');
    }
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={busy ? () => undefined : onClose}
      eyebrow={copy.crew.preset}
      title={crew ? crew.name : copy.crew.save}
      icon={<theme.Glyph name="invite" size={44} />}
      footer={
        crew ? (
          <>
            <button
              type="button"
              className={`btn ${asking ? 'btn--zhu' : 'btn--quiet'} crew-sheet__btn crew-sheet__disband`}
              onClick={disband}
              aria-disabled={busy}
            >
              <theme.Glyph name="disband" size={20} />
              {asking ? copy.crew.disbandAsk : copy.crew.disband}
            </button>
            {asking ? (
              <button
                type="button"
                className="btn btn--line crew-sheet__btn"
                onClick={() => setAsking(false)}
                aria-disabled={busy}
              >
                先不要
              </button>
            ) : (
              <>
                {changed && (
                  <button
                    type="button"
                    className="btn btn--line crew-sheet__btn"
                    onClick={() => update(false)}
                    aria-disabled={busy || !ids.length}
                  >
                    存下來
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--zhu crew-sheet__btn"
                  onClick={() => update(true)}
                  aria-disabled={busy || !ids.length}
                >
                  {copy.crew.apply}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button type="button" className="btn btn--quiet crew-sheet__btn" onClick={onClose} aria-disabled={busy}>
              取消
            </button>
            <button
              type="button"
              className="btn btn--zhu crew-sheet__btn"
              onClick={create}
              aria-disabled={busy || !name.trim() || !ids.length}
            >
              {copy.crew.save}
            </button>
          </>
        )
      }
    >
      <div className="crew-sheet">
        <theme.CrewBanner name={name.trim()} members={[me, ...members]} phase={scene} fresh={!crew} />
        <p className={`crew-sheet__note${asking ? ' is-warn' : ''}`} role={asking ? 'alert' : undefined}>
          {asking ? copy.crew.disbandHint : copy.crew.hint}
        </p>

        <div className="field">
          <label htmlFor="crew-name">{copy.crew.name}</label>
          <input
            id="crew-name"
            className="input"
            value={name}
            maxLength={12}
            placeholder={copy.crew.namePlaceholder}
            disabled={busy}
            enterKeyHint="done"
            onChange={(e) => {
              setAsking(false);
              setName(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
        </div>

        <div className="field">
          <span className="label">
            {copy.crew.members}
            <small>{ids.length + 1} 人</small>
          </span>
          <div className="crew__grid">
            <span className="crew__pick is-me is-on">
              <span className="crew__face">
                <Avatar member={me} size={42} />
                <i className="crew__mark" aria-hidden="true" />
              </span>
              <span className="crew__name">我</span>
            </span>
            {others.map((m) => {
              const on = ids.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`crew__pick${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => toggle(m.id)}
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
        </div>
      </div>
    </Sheet>
  );
}
