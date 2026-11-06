// 실행 창 준비 화면의 디바이스 체크칸 — 고른 케이스가 가진 디바이스마다 하나씩 (도메인/실행 §8.16 ① · 시안 A)
// 끈 디바이스는 이번 실행에서 빠진다. 「조건에 맞는 N건 실행」 · 「실패 N건 다시 실행」으로 열어도 여기서 좁힌다

import { useMemo, useState } from 'react';

import type { CaseRow, Platform } from './api.js';
import { use말 } from './i18n.js';
import { PLATFORM_LABEL } from './ui.js';

const 차례: Platform[] = ['desktop', 'mobile', 'android'];

/**
 * 한 건 · 여러 건이 같은 체크칸을 쓴다 — 앞 판은 한 건만 창 안 다른 칸에서 골라 줄이 둘이었다.
 * 고를 디바이스가 하나뿐이면 체크칸은 서되 잠근다 — 줄이 늘 같은 자리에 있어야 옆 칸이 밀리지 않는다 (점검표 B8)
 */
export function use디바이스고르기(케이스들: CaseRow[]) {
  const [끈것, set끈것] = useState<ReadonlySet<Platform>>(new Set());
  const 있는것 = 차례.filter((d) => 케이스들.some((c) => c.platforms.includes(d)));
  // 그릴 때마다 새 배열이면 값 칸에 한 글자 칠 때마다 시험 큐 · 건수 계산이 다시 돈다
  const 돌릴것 = useMemo(
    () => 케이스들.map((c) => ({ ...c, platforms: c.platforms.filter((p) => !끈것.has(p)) })).filter((c) => c.platforms.length > 0),
    [케이스들, 끈것],
  );
  return {
    있는것,
    켰나: (d: Platform) => !끈것.has(d),
    뒤집기: (d: Platform) => set끈것((전) => new Set(전.has(d) ? [...전].filter((it) => it !== d) : [...전, d])),
    수: (d: Platform) => 케이스들.filter((c) => c.platforms.includes(d)).length,
    /** 켠 디바이스만 남긴 케이스. 켠 디바이스가 하나도 없는 케이스는 빠진다 — 거는 것 · 세는 것 · 보이는 줄이 모두 이것이다 */
    돌릴것,
  };
}

export function 디바이스칸({ 고르기 }: { 고르기: ReturnType<typeof use디바이스고르기> }) {
  const t = use말();
  const 하나뿐 = 고르기.있는것.length < 2;
  return (
    <fieldset className="dev-pick">
      <legend>{t('디바이스')}</legend>
      {고르기.있는것.map((d) => (
        <label key={d} className={고르기.켰나(d) ? 'on' : undefined}>
          <input type="checkbox" checked={고르기.켰나(d)} disabled={하나뿐} onChange={() => 고르기.뒤집기(d)} />
          {t('{디바이스} {수}건', { 디바이스: t(PLATFORM_LABEL[d]), 수: 고르기.수(d) })}
        </label>
      ))}
    </fieldset>
  );
}
