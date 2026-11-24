// 실행 차례 표(`흐름표`) 검사들이 나눠 쓰는 도우미 — 항목 줄 만들기와 보기 상태를 든 채 그리기

import { useState } from 'react';
import { render } from '@testing-library/react';

import type { ItemStatus, Platform, RunInsights, RunItemSummary } from './api.js';
import { 줄 } from './RunFailCard.fixture.js';
import type { 판정 as 권한판정 } from './role.js';
import { 흐름표 } from './RunFlowTable.js';
import { 바꾼보기, 처음보기, type 결과보기 } from './runResultView.js';
import { 돈디바이스들 } from './ui.js';
import type { 다시돌린결과 } from './useRerunResults.js';

export { RUN_ID } from './RunFailCard.fixture.js';

const 모두: 권한판정 = () => true;

/** 이름은 `이름-<번호>` 다. 프로시저에 넣으려면 덮을것에 procId · procName · execSeq 를 준다 */
export function 항목(historyId: number, tcId: string, platform: Platform, status: ItemStatus, 덮을것: Partial<RunItemSummary> = {}): RunItemSummary {
  return 줄(historyId, tcId, platform, status, { tcName: `이름-${tcId}`, ...덮을것 });
}

export const 절차 = (procId: string, execSeq: number) => ({ procId, procName: `프로시저 ${procId}`, execId: 1, execSeq });

interface 옵션 {
  columns?: Platform[];
  device?: Platform | 'ALL';
  끝났나?: boolean;
  자동수정?: string[];
  다시돌림?: ReadonlyMap<string, 다시돌린결과>;
  열카드?: string;
  처음?: Partial<결과보기>;
  insights?: RunInsights | null;
}

/** 보기 상태를 안에 들고 그린다 — 줄을 누르면 펼침이 보기에 쌓이고 `마지막보기()` 로 읽는다 */
export function 흐름그리기(items: RunItemSummary[], 옵션: 옵션 = {}) {
  const 본 = { 보기: 처음보기 };
  function 틀() {
    const [보기, set보기] = useState<결과보기>({ ...처음보기, ...옵션.처음 });
    본.보기 = 보기;
    return (
      <흐름표
        runId={5011}
        env="qa"
        items={items}
        columns={옵션.columns ?? 돈디바이스들(items)}
        device={옵션.device ?? 'ALL'}
        권한={모두}
        끝났나={옵션.끝났나 ?? true}
        자동수정={옵션.자동수정 ?? []}
        다시돌림={옵션.다시돌림}
        insights={옵션.insights ?? null}
        보기={보기}
        바꾸기={(바꿀) => set보기((앞) => 바꾼보기(앞, 바꿀))}
        열카드={옵션.열카드}
      />
    );
  }
  return { ...render(<틀 />), 마지막보기: () => 본.보기 };
}

export const 줄들 = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.rf-row')];
export const 줄안 = (tcId: string): HTMLElement => 줄들().find((el) => el.querySelector('.rf-id')?.textContent === tcId)!;
