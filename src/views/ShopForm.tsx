'use client';

import { useState, type FormEvent } from 'react';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { useAppData } from '@/lib/appData';
import { addRestaurant, updateRestaurant, type RestaurantInput } from '@/lib/store';
import { clack } from '@/lib/sound';
import { PRICES, WALKS, type Restaurant } from '@/lib/types';
import { CategoryFilter } from '@/components/CategoryFilter';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/themes';
import './ShopForm.css';

const EMPTY: RestaurantInput = {
  name: '',
  category: 'rice',
  price: 1,
  walk: 5,
  group: true,
  mapUrl: '',
  open: true,
};

/** 新增或修改店家：只問必要的五件事 */
export function ShopForm({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: Restaurant | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { me, restaurants } = useAppData();
  const { copy, PriceMark, tabIcons } = useTheme().theme;
  const toast = useToast();
  const [v, setV] = useState<RestaurantInput>(EMPTY);
  const [err, setErr] = useState<{ name?: string; mapUrl?: string }>({});
  const [busy, setBusy] = useState(false);

  // 每次打開（或換一家編輯）就重設內容
  const session = open ? (editing?.id ?? 'new') : null;
  const [lastSession, setLastSession] = useState<string | null>(null);
  if (session !== lastSession) {
    setLastSession(session);
    if (session) {
      setErr({});
      setV(
        editing
          ? {
              name: editing.name,
              category: editing.category,
              price: editing.price,
              walk: editing.walk,
              group: editing.group,
              mapUrl: editing.mapUrl,
              open: editing.open,
            }
          : EMPTY,
      );
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = v.name.trim();
    const mapUrl = v.mapUrl.trim();
    const next: typeof err = {};
    if (!name) next.name = '先寫店名。';
    else if (restaurants.some((r) => r.name === name && r.id !== editing?.id))
      next.name = `已經有「${name}」這家店了。`;
    if (mapUrl && !/^https:\/\/\S+$/.test(mapUrl))
      next.mapUrl = '連結要是 https:// 開頭，可以從 Google 地圖按「分享」複製。';
    setErr(next);
    if (next.name || next.mapUrl) return;
    setBusy(true);
    try {
      const data = { ...v, name, mapUrl };
      if (editing) {
        await updateRestaurant(editing.id, data);
        toast(copy.shops.updated, '新');
        onSaved(editing.id);
      } else {
        const id = await addRestaurant(me.id, data);
        clack();
        toast(copy.shops.added, copy.shops.addedSeal);
        onSaved(id);
      }
      onClose();
    } catch {
      toast('沒有存到，等一下再試', '咦');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={editing ? 'Edit' : 'New shop'}
      title={editing ? '修改店家' : '新增店家'}
      icon={<Icon name={editing ? 'edit' : tabIcons.shops} size={34} />}
      footer={
        <>
          <button type="button" className="btn btn--quiet" onClick={onClose}>
            取消
          </button>
          <button type="submit" form="shop-form" className="btn btn--zhu" aria-disabled={busy}>
            {editing ? `更新${copy.shops.item}` : copy.shops.add}
          </button>
        </>
      }
    >
      <form id="shop-form" className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="f-name">店名</label>
          <input
            id="f-name"
            className="input"
            value={v.name}
            maxLength={40}
            placeholder="例如：巷口牛肉麵"
            onChange={(e) => {
              setV({ ...v, name: e.target.value });
              setErr({ ...err, name: undefined });
            }}
            aria-invalid={!!err.name}
            aria-describedby={err.name ? 'f-name-err' : undefined}
          />
          {err.name && (
            <p id="f-name-err" className="error-text">
              {err.name}
            </p>
          )}
        </div>

        <div className="field">
          <span className="label">類型</span>
          <CategoryFilter single label="類型" selected={[v.category]} onToggle={(id) => setV({ ...v, category: id })} />
        </div>

        <fieldset className="field">
          <legend className="label">價位</legend>
          <div className="form__chips">
            {PRICES.map((p) => (
              <button
                key={p.v}
                type="button"
                className="chip"
                aria-pressed={v.price === p.v}
                onClick={() => setV({ ...v, price: p.v })}
              >
                <PriceMark n={p.v} size={13} />
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="label">從公司走過去</legend>
          <div className="form__chips">
            {WALKS.map((w) => (
              <button
                key={w.v}
                type="button"
                className="chip"
                aria-pressed={v.walk === w.v}
                onClick={() => setV({ ...v, walk: w.v })}
              >
                {w.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="form__toggle">
          <span>
            <b>適合揪團</b>
            <i>位子夠多、可以三五個人一起坐</i>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={v.group}
            aria-label="適合揪團"
            className="switch"
            onClick={() => setV({ ...v, group: !v.group })}
          />
        </div>

        {/* 只有建立者決定要不要開放大家修改（新增時預設開） */}
        {(!editing || editing.createdBy === me.id) && (
          <div className="form__toggle">
            <span>
              <b>開放大家一起修改</b>
              <i>關掉的話，只有你能改這家的資訊</i>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={v.open}
              aria-label="開放大家一起修改"
              className="switch"
              onClick={() => setV({ ...v, open: !v.open })}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="f-map">Google 地圖連結（可以不填）</label>
          <input
            id="f-map"
            className="input"
            type="url"
            inputMode="url"
            value={v.mapUrl}
            placeholder="https://maps.app.goo.gl/…"
            onChange={(e) => {
              setV({ ...v, mapUrl: e.target.value });
              setErr({ ...err, mapUrl: undefined });
            }}
            aria-invalid={!!err.mapUrl}
            aria-describedby={err.mapUrl ? 'f-map-err' : 'f-map-hint'}
          />
          {err.mapUrl ? (
            <p id="f-map-err" className="error-text">
              {err.mapUrl}
            </p>
          ) : (
            <p id="f-map-hint" className="hint">
              在 Google 地圖找到店，按「分享」→「複製連結」貼上。抽到時可以一鍵出發。
            </p>
          )}
        </div>
      </form>
    </Sheet>
  );
}
