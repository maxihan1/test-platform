// 실행 창의 디바이스 체크칸 — PC · 모바일이 섞여 열렸을 때만 선다 (도메인/실행 §8.10 · 시안 8판 ② ③)
// 끈 디바이스는 이번 실행에서 빠진다. 「조건에 맞는 N건 실행」 · 「실패 N건 다시 실행」으로 열어도 여기서 한 디바이스로 좁힌다

import { useState } from 'react';

import type { CaseRow, Platform } from './api.js';
import { use말 } from './i18n.js';
import { PLATFORM_LABEL } from './ui.js';

const 웹디바이스: Platform[] = ['desktop', 'mobile'];

/**
 * 한 건 창은 체크칸이 없다 — 디바이스를 그 창의 칸으로 고른다. 목록의 「PC ▶」 · 「PC N건 실행」으로 열면
 * 케이스가 이미 한 디바이스로 좁혀져 와서 섞이지 않으니 체크칸도 없다
 */
export function use디바이스고르기(케이스들: CaseRow[], 한건: boolean) {
  const 섞였나 = !한건 && 웹디바이스.every((d) => 케이스들.some((c) => c.platforms.includes(d)));
  const [끈것, set끈것] = useState<ReadonlySet<Platform>>(new Set());
  const 수 = (d: Platform) => 케이스들.filter((c) => c.platforms.includes(d)).length;
  return {
    섞였나,
    켰나: (d: Platform) => !끈것.has(d),
    뒤집기: (d: Platform) => set끈것((전) => new Set(전.has(d) ? [...전].filter((it) => it !== d) : [...전, d])),
    수,
    /** 켠 디바이스만 남긴 케이스. 켠 디바이스가 하나도 없는 케이스는 빠진다 — 거는 것 · 세는 것 · 보이는 줄이 모두 이것이다 */
    돌릴것: 섞였나
      ? 케이스들.map((c) => ({ ...c, platforms: c.platforms.filter((p) => !끈것.has(p)) })).filter((c) => c.platforms.length > 0)
      : 케이스들,
  };
}

export function 디바이스칸({ 고르기 }: { 고르기: ReturnType<typeof use디바이스고르기> }) {
  const t = use말();
  if (!고르기.섞였나) return null;
  return (
    <fieldset className="dev-pick">
      <legend>{t('실행할 디바이스')}</legend>
      {웹디바이스.map((d) => (
        <label key={d} className={고르기.켰나(d) ? undefined : 'off'}>
          <input type="checkbox" checked={고르기.켰나(d)} onChange={() => 고르기.뒤집기(d)} />
          {t('{디바이스} {수}건', { 디바이스: t(PLATFORM_LABEL[d]), 수: 고르기.수(d) })}
        </label>
      ))}
    </fieldset>
  );
}
