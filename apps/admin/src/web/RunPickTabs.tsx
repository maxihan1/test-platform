// 실행 창의 PC · 모바일 탭 — 「모두 실행」처럼 두 디바이스가 섞여 열렸을 때만 선다 (도메인/실행 §8.10 · 시안 ② ③)
// 탭은 보이는 줄과 실행 기기 칸만 가른다. 거는 것은 늘 창에 담긴 전부다 — 「모두 실행」은 PC · 모바일을 RUN 하나로 돌린다

import { useState } from 'react';

import type { CaseRow, Platform } from './api.js';
import { use말 } from './i18n.js';
import { PLATFORM_LABEL } from './ui.js';

const 탭디바이스: Platform[] = ['desktop', 'mobile'];

/**
 * 한 건 창은 탭이 없다 — 디바이스를 칸으로 고른다. 목록의 「PC ▶」 · 「PC N건 실행」으로 열면
 * 케이스가 이미 한 디바이스로 좁혀져 와서 섞이지 않으니 탭도 없다
 */
export function use디바이스탭(케이스들: CaseRow[], 한건: boolean) {
  const 섞였나 = !한건 && 탭디바이스.every((d) => 케이스들.some((c) => c.platforms.includes(d)));
  const [지금, set지금] = useState<Platform>('desktop');
  return {
    섞였나,
    지금,
    set지금,
    /** 지금 탭에 보일 케이스. 탭이 없으면 전부다 */
    보일것: 섞였나 ? 케이스들.filter((c) => c.platforms.includes(지금)) : 케이스들,
    /** 실행 기기 칸을 세울 탭인가. 탭이 없으면 케이스에 모바일이 있는지만 본다 (RunPickModal) */
    모바일탭: !섞였나 || 지금 === 'mobile',
    수: (d: Platform) => 케이스들.filter((c) => c.platforms.includes(d)).length,
  };
}

export function 디바이스탭({ 탭 }: { 탭: ReturnType<typeof use디바이스탭> }) {
  const t = use말();
  if (!탭.섞였나) return null;
  return (
    <div role="tablist" className="scn-tabs" aria-label={t('실행할 디바이스')}>
      {탭디바이스.map((d) => (
        <button
          key={d}
          type="button"
          role="tab"
          className="scn-tab"
          aria-selected={탭.지금 === d}
          onClick={() => 탭.set지금(d)}
        >
          {t(PLATFORM_LABEL[d])} <span className="hint">{탭.수(d)}</span>
        </button>
      ))}
    </div>
  );
}
