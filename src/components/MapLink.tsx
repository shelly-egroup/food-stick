import { walkOf, type Restaurant } from '@/lib/types';
import { LineIcon } from './CategoryIcon';
import { Icon } from './Icon';
import './MapLink.css';

/**
 * 帶我去：一張小小的地圖卡——朱紅（魔法是鈷藍）的地圖標記、大字、底下一行說明、右邊一個箭頭。
 * 店家詳情、籤卡（起駕之後）、報馬仔的帖子、食籤簿都用這一張；只有有地圖連結的店才會出現。
 */
export function MapLink({
  r,
  title = '帶我去這家',
  withName = false,
  className,
}: {
  r: Restaurant;
  title?: string;
  /** 說明那一行前面加上店名（籤卡、帖子上用） */
  withName?: boolean;
  className?: string;
}) {
  if (!r.mapUrl) return null;
  return (
    <a
      className={`map-link${className ? ` ${className}` : ''}`}
      href={r.mapUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="map-link__pin" aria-hidden="true">
        <Icon name="pin" size={20} />
      </span>
      <span className="map-link__text">
        <b>{title}</b>
        <small>
          {withName && <span className="map-link__name">{r.name}</span>}
          <span>
            <Icon name="pin" size={13} />
            Google 地圖
          </span>
          <span>
            <LineIcon d={walkOf(r.walk).icon} size={13} />
            {walkOf(r.walk).label}
          </span>
        </small>
      </span>
      <span className="map-link__go" aria-hidden="true">
        <Icon name="arrow" size={18} />
      </span>
    </a>
  );
}
