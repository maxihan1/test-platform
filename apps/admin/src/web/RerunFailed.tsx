// 실행 결과 머리의 「실패 N건 다시 실행」 — 실패한 케이스만 같은 대상 서버로 실행 창에 담는다 (도메인/실행 §8.3 · §8.10)
// 실행 결과 화면이 300줄에 닿아 여기로 뺐다

import { useState } from 'react';

import type { Platform, RunItemSummary } from './api.js';
import { use말 } from './i18n.js';
import { RunWindow } from './RunWindow.js';

/** 같은 케이스가 디바이스 · 회차마다 여러 줄이다. **한 번이라도 실패한 케이스를 한 번씩** 담는다 */
export function 실패케이스들(items: RunItemSummary[]): string[] {
  return [...new Set(items.filter((it) => it.status === 'FAIL').map((it) => it.tcId))];
}

/**
 * 케이스마다 실패한 디바이스만. 통과한 디바이스까지 돌리면 실패 때와 다른 조건이라
 * 「다시 하니 통과」가 디바이스를 더 돌린 탓인지 알 수 없다 (도메인/실행 §8.3 · 점검 2.16)
 */
export function 실패디바이스(items: RunItemSummary[]): Record<string, Platform[]> {
  const 모음: Record<string, Platform[]> = {};
  for (const it of items) {
    if (it.status !== 'FAIL') continue;
    const 칸 = (모음[it.tcId] ??= []);
    if (!칸.includes(it.platform)) 칸.push(it.platform);
  }
  return 모음;
}

/**
 * 값은 지금의 저장값 · 코드 기본값으로 연다. 그 실행에서 쓴 값 그대로 돌리려면 서버가 값을 기억해야 해서 하지 않는다 —
 * 대신 그 실행이 시작된 뒤 저장값이 바뀐 케이스는 창이 알린다(`시작`). 한 건을 그때 값으로 돌리려면
 * 항목 상세의 「입력 값 수정 후 다시 실행」이 그 값을 채워 연다
 */
export function 실패다시실행({
  runId,
  items,
  env,
  시작,
  된다,
  on걸었다,
}: {
  runId: number;
  items: RunItemSummary[];
  env: string;
  /** 그 실행이 시작된 시각 — 이보다 늦게 저장값이 바뀐 케이스를 창이 알린다 */
  시작?: string;
  된다: boolean;
  on걸었다?: (runId: number) => void;
}) {
  const t = use말();
  const [열림, set열림] = useState(false);
  const 실패 = 실패케이스들(items);
  if (!된다 || 실패.length === 0) return null;

  return (
    <>
      {/* 휴대폰에서는 아래 탭 바로 위에 붙는다 — PC 에서는 머리 행동 줄의 버튼 하나다 (화면공통 §8 「휴대폰 화면」 · phone.css) */}
      <div className="rerun-dock">
        <button className="btn" onClick={() => set열림(true)}>
          {t('실패 {건수}건 다시 실행', { 건수: 실패.length })}
        </button>
      </div>
      {/* 원래 실행 번호를 실어 서버가 「RUN N의 실패 M건 다시」로 제목을 짓게 한다 (도메인/실행 §8.3) */}
      {!열림 ? null : (
        <RunWindow
          tcIds={실패}
          서버={env}
          rerunOf={runId}
          디바이스={실패디바이스(items)}
          기준시각={시작}
          on걸었다={on걸었다}
          onClose={() => set열림(false)}
        />
      )}
    </>
  );
}
