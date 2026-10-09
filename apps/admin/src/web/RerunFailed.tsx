// 실행 결과 머리의 「실패 N건 다시 실행」 — 실패한 케이스만 같은 대상 서버로 실행 창에 담는다 (도메인/실행 §8.3 · §8.10)
// 실행 결과 화면이 300줄에 닿아 여기로 뺐다

import { useState } from 'react';

import type { RunItemSummary } from './api.js';
import { use말 } from './i18n.js';
import { RunWindow } from './RunWindow.js';

/**
 * 같은 케이스가 디바이스 · 회차마다 여러 줄이다. **한 번이라도 실패한 케이스를 한 번씩** 담는다 —
 * PC 는 통과 · 모바일은 실패여도 다시 돌릴 때는 케이스가 선언한 디바이스를 전부 쓴다(§8.10 「여러 건」)
 */
export function 실패케이스들(items: RunItemSummary[]): string[] {
  return [...new Set(items.filter((it) => it.status === 'FAIL').map((it) => it.tcId))];
}

/**
 * 값은 지금의 저장값 · 코드 기본값으로 연다. 그 실행에서 쓴 값으로 한 건을 다시 돌리려면
 * 항목 상세의 「값 바꿔 재실행」이 그 값을 채워 연다 — 목록의 응답에는 기대결과 값이 없어 여러 건을 그 값으로 못 채운다
 */
export function 실패다시실행({ items, env, 된다 }: { items: RunItemSummary[]; env: string; 된다: boolean }) {
  const t = use말();
  const [열림, set열림] = useState(false);
  const 실패 = 실패케이스들(items);
  if (!된다 || 실패.length === 0) return null;

  return (
    <>
      <button className="btn" onClick={() => set열림(true)}>
        {t('실패 {건수}건 다시 실행', { 건수: 실패.length })}
      </button>
      {!열림 ? null : <RunWindow tcIds={실패} 서버={env} onClose={() => set열림(false)} />}
    </>
  );
}
