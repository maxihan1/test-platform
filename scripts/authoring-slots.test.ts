// 칸 번호 검사 — 요구사항 표 줄마다 칸(요구 · 갈래 · 축 · 상태)과 tcId 를 코드가 같은 규칙으로 정하는지
import { describe, expect, it } from 'vitest';

import { type 칸재료, type 표줄, 칸번호 } from './authoring-slots.js';

const 원장 = ['REQ-X-001', 'REQ-X-002', 'REQ-X-003'];
const 빈재료: 칸재료 = { 접두사: 'P', 기준줄: [], 칸: {}, 쓰인: [] };
const 줄 = (차례: number, 출처: string, 축: string, tcId = ''): 표줄 => ({ 차례, 출처, 축, tcId });
const 번호 = (줄들: 표줄[], 재료: 칸재료 = 빈재료, 원장번호들: string[] = 원장) =>
  칸번호(원장번호들, 줄들, 재료);

describe('칸번호 — 칸 열쇠와 고정 번호', () => {
  it('UI 칸은 원장 차례 i 를 번호로 쓴다', () => {
    expect(번호([줄(0, 'a §2 REQ-X-002', 'UI', 'P-UI-001')]).기대.get(0)).toBe('P-UI-002');
  });

  it('기능 칸은 (i−1)×3 + 정상 1 · 경계 2 · 예외 3', () => {
    const r = 번호([줄(0, 'REQ-X-002', '정상'), 줄(1, 'REQ-X-002', '경계'), 줄(2, 'REQ-X-003', '예외')]);
    expect([...r.기대]).toEqual([
      [0, 'P-FN-004'],
      [1, 'P-FN-005'],
      [2, 'P-FN-009'],
    ]);
    expect(r.어긋남).toEqual([]);
  });

  it('출처에 번호가 여럿이면 원장 차례가 가장 앞인 번호가 칸이다', () => {
    expect(번호([줄(0, 'REQ-X-003 · REQ-X-001', '정상')]).기대.get(0)).toBe('P-FN-001');
  });

  it('같은 칸 줄은 같은 번호다', () => {
    const r = 번호([줄(0, 'REQ-X-002', '정상'), 줄(1, '기획서 REQ-X-002 둘째 문장', ' 정상 ')]);
    expect(r.기대.get(0)).toBe('P-FN-004');
    expect(r.기대.get(1)).toBe('P-FN-004');
  });

  it('축이 넷 밖이면 번호를 안 매기고 어긋남에 싣는다', () => {
    const r = 번호([줄(0, 'REQ-X-001', '기타'), 줄(1, 'REQ-X-001', 'UI')]);
    expect(r.기대.has(0)).toBe(false);
    expect(r.기대.get(1)).toBe('P-UI-001');
    expect(r.어긋남).toEqual(['요구 줄 1 축 「기타」 — UI · 정상 · 경계 · 예외 중 하나가 아니다']);
  });

  it('상태 표시가 다르면 다른 칸 — 상태 칸은 고정 범위 끝 다음부터 정식 · 미확정 · 보류 · 모킹 차례', () => {
    const r = 번호([
      줄(0, '모킹 — REQ-X-002', '정상'),
      줄(1, '보류 — 관리자 비밀번호 없음 REQ-X-002', '정상'),
      줄(2, '차이 D5 REQ-X-002', '정상'),
      줄(3, '화면 검사 — REQ-X-002', '정상'),
      줄(4, 'REQ-X-002', '정상'),
    ]);
    expect(r.기대.get(4)).toBe('P-FN-004');
    expect(r.기대.get(3)).toBe('P-FN-010');
    expect(r.기대.get(2)).toBe('P-FN-010');
    expect(r.기대.get(1)).toBe('P-FN-011');
    expect(r.기대.get(0)).toBe('P-FN-012');
  });

  it('「제거함(…)」 줄은 건너뛴다', () => {
    const r = 번호([줄(0, 'REQ-X-001', '기타', '제거함(P-FN-001)'), 줄(1, 'REQ-X-001', '정상')]);
    expect(r.기대.has(0)).toBe(false);
    expect(r.기대.get(1)).toBe('P-FN-001');
    expect(r.어긋남).toEqual([]);
  });
});
