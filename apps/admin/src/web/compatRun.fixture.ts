// 호환성 실행 결과 가짜 응답 — 실행 중 창 · 결과 · 실행 기록 검사가 같이 쓴다

import type { CompatCard, CompatRunDevice, CompatRunResult } from './compatApi.js';

export const 상태 = (seq: number, 덮: Partial<CompatRunDevice> = {}): CompatRunDevice => ({
  seq,
  serial: `S${String(seq)}`,
  model: `SM-A${String(100 + seq)}N`,
  name: `Galaxy A${String(seq)}`,
  os: '14',
  fold: null,
  state: 'DONE',
  cases: { done: 3, total: 3 },
  checks: { done: 5, total: 5 },
  skipReason: null,
  now: null,
  vision: null,
  ...덮,
});

export const 카드 = (key: string, seq: number, screenId: number, 덮: Partial<CompatCard> = {}): CompatCard => ({
  key,
  seq,
  screenId,
  tcId: 'DMA-UI-031',
  step: 4,
  before: 'element/click',
  issues: [{ kind: 'text-overflow', box: [0, 76, 1080, 94], note: '「주문하기」 버튼 텍스트 하단 잘림' }],
  verdict: null,
  judgedBy: null,
  judgedAt: null,
  ...덮,
});

export const 결과 = (덮: Partial<CompatRunResult> = {}): CompatRunResult => ({
  run: { runId: 21107, setId: 3, title: '출시 전 점검', env: 'stage', buildNo: '1.4.2', startedAt: '2026-11-06T05:20:00Z', finishedAt: '2026-11-06T06:20:00Z', state: 'DONE', startedBy: 'maxi' },
  devices: [상태(1), 상태(2), 상태(3)],
  counts: { screens: 4, devices: 3, states: 3, confirmed: 1, pending: 1, notDefect: 0, unchecked: 1 },
  rows: [
    {
      key: '/cart',
      name: '장바구니',
      cells: [
        { seq: 1, value: 'PENDING' },
        { seq: 2, value: 'CONFIRMED' },
        { seq: 3, value: 'UNCHECKED', reason: 'DMA-UI-031 이 3단계에서 실패' },
      ],
    },
  ],
  hiddenOk: 3,
  cards: [카드('/cart', 1, 11), 카드('/cart', 2, 12, { verdict: 'CONFIRMED', judgedBy: 'maxi', judgedAt: '2026-11-06T06:02:00Z' })],
  uncovered: [{ key: '/review', name: '리뷰 작성' }],
  ...덮,
});
