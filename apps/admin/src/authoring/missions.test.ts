// 미션 목록 모양 검사 · 지문 — DB 없이 (도메인/게임 §3.10 결정 24 · 도메인/작성 §7 「미션 목록 통로」)

import { describe, expect, it } from 'vitest';

import { 목록지문, 미션검사, 미션지문, type 미션 } from './missions.js';

const 임프: 미션 = {
  id: 'M01',
  title: '레벨 1 탱커가 임프 3마리를 잡는다',
  start: '탱커 · 레벨 1 · 전투 망치 · 사슬 갑옷 · 혼자',
  todo: '전투 망치로 임프 3마리 처치',
  success: '처치 줄 3줄',
  logs: [
    { text: '받은 피해 줄: 전부 6 (최소 1줄)', reqId: 'ARG-REQ-041' },
    { text: '처치 줄 경험치: 전부 12 (최소 3줄)', reqId: 'ARG-REQ-052' },
  ],
};

describe('미션검사', () => {
  it('맞는 본문은 그대로 읽고 모르는 칸은 버린다', () => {
    const 읽음 = 미션검사({
      items: [{ ...임프, extra: 1 }],
      uncovered: [{ reqId: 'ARG-REQ-058', text: '레벨이 오르면 최대 체력이 10 오른다' }],
      gaps: [{ reqId: 'ARG-REQ-047', note: '치명타 배율 값이 기획서에 없다' }],
    });
    expect(읽음).toEqual({
      items: [임프],
      uncovered: [{ reqId: 'ARG-REQ-058', text: '레벨이 오르면 최대 체력이 10 오른다' }],
      gaps: [{ reqId: 'ARG-REQ-047', note: '치명타 배율 값이 기획서에 없다' }],
    });
  });

  it.each([
    ['미션 번호 꼴', { items: [{ ...임프, id: 'M1' }], uncovered: [], gaps: [] }, 'items[0].id'],
    ['미션 번호 겹침', { items: [임프, 임프], uncovered: [], gaps: [] }, 'items[1].id'],
    ['빈 양식 칸', { items: [{ ...임프, start: ' ' }], uncovered: [], gaps: [] }, 'items[0].start'],
    ['확인할 로그 없음', { items: [{ ...임프, logs: [] }], uncovered: [], gaps: [] }, 'items[0].logs'],
    ['로그 줄 규칙 번호 없음', { items: [{ ...임프, logs: [{ text: '받은 피해 6', reqId: '' }] }], uncovered: [], gaps: [] }, 'items[0].logs[0]'],
    ['규칙 줄 문장 없음', { items: [], uncovered: [{ reqId: 'ARG-REQ-058' }], gaps: [] }, 'uncovered[0]'],
    ['빈칸 칸이 배열 아님', { items: [], uncovered: [], gaps: {} }, 'gaps'],
  ])('%s 은 INVALID_MISSIONS 로 자리를 짚는다', (_, 몸, detail) => {
    expect(미션검사(몸)).toEqual({ error: 'INVALID_MISSIONS', detail });
  });
});

describe('미션지문', () => {
  it('양식 칸이 바뀌면 같은 번호라도 다른 지문이다 — 이어 작성이 고친 미션은 다시 고를 미션이다', () => {
    const 고친 = { ...임프, logs: [{ text: '받은 피해 줄: 전부 7 (최소 1줄)', reqId: 'ARG-REQ-041' }] };
    expect(미션지문(고친)).not.toBe(미션지문(임프));
    expect(미션지문({ ...임프 })).toBe(미션지문(임프));
    expect(목록지문([임프])).not.toBe(목록지문([]));
  });
});
