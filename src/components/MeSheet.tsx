'use client';

import { useState, useSyncExternalStore } from 'react';
import { Sheet } from './Sheet';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { useAppData } from '@/lib/appData';
import { ThemeSwitch, useTheme } from '@/themes';
import { isSoundOn, onSoundChange, setSoundOn, chime, stamp } from '@/lib/sound';
import { renameMe } from '@/lib/store';
import { useInstall } from '@/lib/useInstall';
import { askMotion, useMotionPermission, useShakePref, useShakeSupported } from '@/lib/useShake';
import './MeSheet.css';

export function MeSheet({ open, onClose, onSignOut }: { open: boolean; onClose: () => void; onSignOut: () => void }) {
  const { me, restaurants } = useAppData();
  const { theme } = useTheme();
  const toast = useToast();
  const install = useInstall();
  const sound = useSyncExternalStore(onSoundChange, isSoundOn, () => true);
  const canShake = useShakeSupported();
  const [shakeOn, setShakeOn] = useShakePref();
  const motion = useMotionPermission();
  // 正在打的名字；沒在編輯時顯示目前的名字
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? me.name;

  const likes = me.likes.filter((id) => restaurants.some((r) => r.id === id)).length;
  const blocks = me.blocks.filter((id) => restaurants.some((r) => r.id === id)).length;

  // 改了但還沒按確定：關掉設定就當沒改
  const dirty = !!name.trim() && name.trim() !== me.name;
  if (!open && draft !== null) setDraft(null);

  /** 改完按「蓋章」（魔法是「署名」）才生效，不會打一個字就改 */
  const saveName = () => {
    const n = name.trim();
    setDraft(null);
    if (!n || n === me.name) return;
    stamp();
    renameMe(me.id, n)
      .then(() => toast('名字改好了', '名'))
      .catch(() => toast('沒有存到，等一下再試', '咦'));
  };

  return (
    <Sheet open={open} onClose={onClose} eyebrow="My settings" title="我的設定" icon={<Icon name="gear" size={36} />}>
      <div className="me">
        <div className="me__card">
          <Avatar member={me} size={60} ring />
          <div className="me__who">
            <b>{me.name}</b>
            <span>
              <em>{likes}</em> 家愛店・<em>{blocks}</em> 家不吃
            </span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="me-name">大家看到的名字</label>
          <div className={`me__name${dirty ? ' is-dirty' : ''}`}>
            <input
              id="me-name"
              className="input"
              value={name}
              maxLength={40}
              enterKeyHint="done"
              onChange={(e) => setDraft(e.target.value)}
              // 中文輸入法選字時按的 Enter 不算
              onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && saveName()}
            />
            {dirty && (
              <button type="button" className="btn btn--zhu me__rename" onClick={saveName} aria-label="確定改名">
                <theme.Glyph name="rename" size={24} />
                {theme.copy.rename}
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <span className="label">風格</span>
          {/* 選好就關起來，讓換風格的那一圈直接在畫面上展開 */}
          <ThemeSwitch onPick={() => window.setTimeout(onClose, 160)} />
        </div>

        <div className="me__toggle">
          <span>
            <Icon name={sound ? 'bell' : 'bellOff'} />
            音效與震動
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={sound}
            aria-label="音效與震動"
            className="switch"
            onClick={() => {
              setSoundOn(!sound);
              if (!sound) setTimeout(chime, 30);
            }}
          />
        </div>

        {/* 搖手機抽籤：預設開；iOS 打開時要當場同意「動作與方向」 */}
        {canShake && (
          <div className="me__toggle-wrap">
            <div className="me__toggle">
              <span>
                <theme.Glyph name="shake" size={24} />
                {theme.copy.shake.setting}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={shakeOn}
                aria-label={theme.copy.shake.setting}
                className="switch"
                onClick={() => {
                  setShakeOn(!shakeOn);
                  if (!shakeOn) void askMotion();
                }}
              />
            </div>
            <p className="me__toggle-hint">
              {shakeOn && motion === 'denied'
                ? '瀏覽器沒有允許「動作與方向」：到 Safari 的網站設定裡打開，再回來試一次。'
                : theme.copy.shake.settingHint}
            </p>
          </div>
        )}

        {install.canPrompt && (
          <button type="button" className="btn btn--line" onClick={() => void install.prompt()}>
            <Icon name="phone" />
            加到手機主畫面
          </button>
        )}
        {install.iosHint && (
          <p className="me__tip">想像 App 一樣打開？在 Safari 按下方的「分享」，再選「加入主畫面」。</p>
        )}

        <button
          type="button"
          className="btn btn--line me__out"
          onClick={() => {
            onClose();
            setTimeout(onSignOut, 260);
          }}
        >
          <theme.Glyph name="leave" size={28} />
          {theme.copy.signOut}
        </button>
      </div>
    </Sheet>
  );
}
