// 남은 보류를 갈래로 세는 순수 함수 검사 (도메인/작성 §3.6 「★ 보류 케이스」 「애초에 안 나오게」)
import { describe, expect, it } from 'vitest';

import { 보류갈래, 보류경고 } from './authoring-held-kinds.js';

const 케이스 = (tcId: string, held?: string) => (held === undefined ? { tcId } : { tcId, held });

describe('보류갈래', () => {
  it('판정 불가 · 값 다름 · 그 밖으로 가르고, 서버 탓 · 자료 어긋남은 세지 않는다', () => {
    expect(보류갈래('판정 불가 — 토스트가 사라지는 시간이 기획서에 없다')).toBe('판정 불가');
    expect(보류갈래('보류 — 검증 실패: 상품 상세 응답에 이미지 칸이 있다')).toBe('값 다름');
    expect(보류갈래('보류 — Error: 검증 실패: 금액이 49,999원이다')).toBe('값 다름');
    expect(보류갈래('보류 — 후보가 정확히 5개인 검색어가 상품 데이터에 없다')).toBe('그 밖');
    expect(보류갈래('보류 — 서버 오류(5xx): POST /api/cart 500')).toBeNull();
    expect(보류갈래('보류 — 끊김: GET /api/products')).toBeNull();
    expect(보류갈래('판정 불가 — 자료 어긋남: 기획서 6초 · 메일 4초')).toBeNull();
    expect(보류갈래('판정 불가(자료 어긋남: 기획서 6초 · 메일 4초)')).toBeNull();
  });
});

describe('보류경고', () => {
  it('갈래마다 한 줄에 tcId 를 모으고, 보류가 없으면 빈 목록이다', () => {
    const 글들 = [
      케이스('MKA-FN-337', '판정 불가 — 토스트가 사라지는 시간이 기획서에 없다'),
      케이스('MKT-FN-457', '보류 — 검증 실패: 상품 상세 응답에 이미지 칸이 있다'),
      케이스('MKT-FN-464', '보류 — 맞는 상품이 정확히 5개인 검색어가 대상 서버 자료에 없다'),
      케이스('MKT-FN-465', '보류 — 앱 응답을 늦출 길이 없다'),
      케이스('MKT-FN-466', '보류 — 끊김: GET /api/products'),
      케이스('MKT-FN-467'),
    ];
    const 줄들 = 보류경고(글들);
    expect(줄들).toHaveLength(3);
    expect(줄들[0]).toMatch(/^판정 불가 1건 — .*: MKA-FN-337$/);
    expect(줄들[1]).toMatch(/^값 다름 1건 — .*: MKT-FN-457$/);
    expect(줄들[2]).toMatch(/^그 밖 2건 — .*: MKT-FN-464 · MKT-FN-465$/);
    expect(보류경고([케이스('MKT-FN-467')])).toEqual([]);
  });

  it('볼 tcId 를 주면 그 케이스만 센다', () => {
    const 글들 = [케이스('MKT-FN-001', '판정 불가 — 기준 없음'), 케이스('MKT-FN-002', '판정 불가 — 기준 없음')];
    expect(보류경고(글들, new Set(['MKT-FN-002']))).toEqual([expect.stringMatching(/^판정 불가 1건 — .*: MKT-FN-002$/)]);
  });
});
