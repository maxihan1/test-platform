// 올리기 판정의 기법 줄 검사 — 케이스 파일 techniques 가 칸의 기대 기법과 다르면 PR 머리에 센다 (작성 §3.6 「기법 어긋남」)
import { describe, expect, it } from 'vitest';

import type { 설계 } from './authoring-design.js';
import { type 칸재료, 기준줄열쇠 } from './authoring-slots.js';
import { tcId별글, 원장판정 } from './authoring-ledger-verdict.js';

const 경계만: 설계 = { 경계: [{ 근거: '4~12자', 값: ['3자', '4자', '12자', '13자'] }], 예외: [] };
const 항목 = [
  { 번호: 'REQ-A-1', 자료: 'a', 지문: '0000000000000000', 설계: 경계만 },
  { 번호: 'REQ-A-2', 자료: 'a', 지문: '0000000000000000' },
];
const 값 = { 항목, 가족: {}, 모드: {}, 경고: [], 빠진자료: [], 꼴: {} };
const 기준 = (칸재료: 칸재료 | null) => ({ 사람이뺌: new Set<string>(), 다음요청: new Set<string>(), 칸재료 });
const 빈재료: 칸재료 = { 접두사: 'X', 기준줄: [], 칸: {}, 쓰인: [] };
const 표 = (요구줄: string[]) =>
  ['## 요구사항', '', '| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |', '|---|---|---|---|---|---|---|---|', ...요구줄, ''].join('\n');
const 칸줄 = (축: string, 출처: string, tcId: string) => `| 1 | ${축} | 전 | 조 | 결 | ${출처} | ${tcId} | 2026-10-05 |`;
const 글 = 표([칸줄('경계', 'a REQ-A-1', 'X-FN-001'), 칸줄('정상', 'a REQ-A-1', 'X-FN-002'), 칸줄('정상', 'a REQ-A-2', 'X-FN-004')]);
const 케이스 = (tcId: string, 기법줄 = '') => `export const spec = defineCase({\n  tcId: '${tcId}',\n  name: 'n',\n${기법줄}});\n`;
const 케이스들 = [케이스('X-FN-001'), 케이스('X-FN-002', "  techniques: ['동등 분할'],\n"), 케이스('X-FN-004')];
const 있음 = new Set(['X-FN-001', 'X-FN-002', 'X-FN-004']);

describe('tcId별글', () => {
  it('defineCase 의 tcId 로 묶고 tcId 를 못 읽은 글은 뺀다', () => {
    const 표글 = tcId별글([케이스('X-FN-001'), 'const a = 1;\n']);
    expect([...표글.keys()]).toEqual(['X-FN-001']);
  });
});

describe('원장판정 — 기법 줄 (작성 §3.6 「기법 어긋남」)', () => {
  it('케이스 글을 주면 설계 줄 뒤에 기법 어긋남을 앞 3개까지 싣는다', () => {
    const 머리 = 원장판정(값, 글, 있음, 기준(빈재료), tcId별글(케이스들)).머리글;
    expect(머리.split('\n').at(-1)).toBe(
      '⚠️ 기법 어긋남 2 — X-FN-001 — 「경계값 분석」이어야 한다(지금 「없음」) · X-FN-002 — 「없음」이어야 한다(지금 「동등 분할」)',
    );
  });

  it('케이스 글을 안 주면(옛 호출) 기법을 안 본다', () => {
    expect(원장판정(값, 글, 있음, 기준(빈재료)).머리글).not.toContain('기법 어긋남');
  });

  it('칸 재료가 없으면 기법도 건너뛰고 못 봄 줄 하나로 말한다', () => {
    const 머리 = 원장판정(값, 글, 있음, 기준(null), tcId별글(케이스들)).머리글;
    expect(머리).toContain('칸 번호 · 설계 칸 · 기법 — 기준 표를 못 읽어 안 봤다');
    expect(머리).not.toContain('기법 어긋남');
  });

  it('기준 줄의 케이스는 기법이 없어도 어긋남이 아니다', () => {
    const 재료: 칸재료 = { ...빈재료, 기준줄: [기준줄열쇠({ tcId: 'X-FN-001', 축: '경계', 출처: 'a REQ-A-1' })] };
    const 머리 = 원장판정(값, 표([칸줄('경계', 'a REQ-A-1', 'X-FN-001')]), new Set(['X-FN-001']), 기준(재료), tcId별글(케이스들)).머리글;
    expect(머리).not.toContain('기법 어긋남');
  });
});
