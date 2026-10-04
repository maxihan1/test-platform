// 기법 대조 검사 — 칸의 기대 기법을 정하고 케이스 파일 techniques 와 집합으로 견주는지
import { describe, expect, it } from 'vitest';

import type { 설계 } from './authoring-design.js';
import { type 표줄, 기준줄열쇠 } from './authoring-slots.js';
import { 기대기법, 기법대조 } from './authoring-technique-check.js';

const 경계설계: 설계 = { 경계: [{ 근거: '4~12자', 값: ['3자', '4자', '12자', '13자'] }], 예외: [] };
const 형식설계: 설계 = { 경계: [], 예외: [{ 기법: '동등 분할', 근거: '맞지 않으면' }] };
const 잠금설계: 설계 = {
  경계: [],
  예외: [
    { 기법: '상태 전이', 근거: '잠긴' },
    { 기법: '동등 분할', 근거: '없는 아이디' },
  ],
};
const 갈림설계: 설계 = { 경계: [], 예외: [{ 기법: '결정 테이블', 근거: '않거나' }] };

const 줄 = (차례: number, 출처: string, 축: string, tcId: string): 표줄 => ({ 차례, 출처, 축, tcId });

// 작성 에이전트가 만든 실제 케이스 파일 꼴(2차 MKT · MKT-FN-002)에 techniques 줄만 더했다
const 케이스 = (tcId: string, 기법줄 = '') => `import { defineCase, test, verify } from '@platform/kit';
import type { APIRequestContext } from '@playwright/test';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: '${tcId}',
  name: '장바구니가 비면 배지가 없고 서로 다른 상품 두 줄을 담으면 배지에 「2」가 보인다',
  platforms: ['desktop'],
  precondition: ['새로 가입한 회원으로 로그인해 있다', '장바구니가 비어 있다'],
${기법줄}  params: z.object({}),
  expected: z.object({}),
});

async function 장바구니줄수(request: APIRequestContext): Promise<number> {
  const 응답 = await request.get('/api/cart');
  return ((await 응답.json()) as { items: unknown[] }).items.length;
}

test(spec, async ({ page, request }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  try {
    await test.step('머리글의 장바구니 아이콘 옆을 확인한다', async () => {
      await 홈.열고장바구니응답을기다린다();
      await verify('장바구니가 비어 있다', await 장바구니줄수(request), 0, { blocker: true });
      await verify('숫자 배지가 보이지 않는다', await 머리.장바구니배지.isVisible(), false);
    });
  } finally {
    await request.delete('/api/me');
  }
});
`;
const 기법 = (...낱말: string[]) => `  techniques: [${낱말.map((t) => `'${t}'`).join(', ')}],\n`;
const 글들 = (...쌍: [string, string][]) => new Map(쌍);
const 원장 = [
  { 번호: 'MEM-001', 설계: 경계설계 },
  { 번호: 'MEM-002', 설계: 형식설계 },
  { 번호: 'MEM-003', 설계: 잠금설계 },
  { 번호: 'MEM-004' },
  { 번호: 'MEM-005', 설계: 갈림설계 },
];
const 없음 = new Set<string>();

describe('기대기법', () => {
  it('경계 칸은 설계가 없어도(설계 밖 경계 칸) 경계값 분석이다', () => {
    expect(기대기법('경계', [경계설계])).toEqual(['경계값 분석']);
    expect(기대기법('경계', [undefined])).toEqual(['경계값 분석']);
  });

  it('예외 칸은 설계들의 예외 기법 합집합을 목록 차례로, 중복 없이 낸다', () => {
    expect(기대기법('예외', [잠금설계, undefined, 형식설계, 갈림설계])).toEqual(['동등 분할', '결정 테이블', '상태 전이']);
    expect(기대기법('예외', [경계설계, undefined])).toEqual([]);
  });

  it('정상 칸은 설계에 예외가 있어도 없음이다', () => {
    expect(기대기법('정상', [잠금설계])).toEqual([]);
  });

  it('UI 칸은 없음이다', () => {
    expect(기대기법('UI', [경계설계, 잠금설계])).toEqual([]);
  });
});

describe('기법대조', () => {
  it('칸의 기대 기법과 같으면 어긋남이 없다', () => {
    const r = 기법대조(
      원장,
      [줄(0, 'MEM-001', '경계', 'MKT-FN-002'), 줄(1, 'MEM-001', '정상', 'MKT-FN-001')],
      글들(['MKT-FN-002', 케이스('MKT-FN-002', 기법('경계값 분석'))], ['MKT-FN-001', 케이스('MKT-FN-001')]),
      없음,
    );
    expect(r).toEqual([]);
  });

  it('경계 칸 케이스에 기법이 없으면 어긋남이다', () => {
    const r = 기법대조(원장, [줄(0, 'MEM-001', '경계', 'MKT-FN-002')], 글들(['MKT-FN-002', 케이스('MKT-FN-002')]), 없음);
    expect(r).toEqual(['MKT-FN-002 — 「경계값 분석」이어야 한다(지금 「없음」)']);
  });

  it('정상 칸 케이스에 기법을 적으면 어긋남이다', () => {
    const r = 기법대조(
      원장,
      [줄(0, 'MEM-002', '정상', 'MKT-FN-004')],
      글들(['MKT-FN-004', 케이스('MKT-FN-004', 기법('경계값 분석'))]),
      없음,
    );
    expect(r).toEqual(['MKT-FN-004 — 「없음」이어야 한다(지금 「경계값 분석」)']);
  });

  it('예외 칸은 출처에 든 원장 번호 전부의 예외 기법 합집합이고 원장에 없는 번호는 뺀다', () => {
    const r = 기법대조(
      원장,
      [줄(0, 'MEM-003 · MEM-002 · ETC-009', '예외', 'MKT-FN-009')],
      글들(['MKT-FN-009', 케이스('MKT-FN-009', 기법('상태 전이'))]),
      없음,
    );
    expect(r).toEqual(['MKT-FN-009 — 「동등 분할 · 상태 전이」이어야 한다(지금 「상태 전이」)']);
  });

  it('한 tcId 의 줄이 여럿이면 첫 줄의 축을 쓰고 축이 같은 줄의 출처만 모은다', () => {
    const r = 기법대조(
      원장,
      [줄(3, 'MEM-005', '정상', 'MKT-FN-012'), 줄(1, 'MEM-002', '예외', 'MKT-FN-012'), 줄(4, 'MEM-003', '예외', 'MKT-FN-012')],
      글들(['MKT-FN-012', 케이스('MKT-FN-012')]),
      없음,
    );
    expect(r).toEqual(['MKT-FN-012 — 「동등 분할 · 상태 전이」이어야 한다(지금 「없음」)']);
  });

  it('차례 · 중복이 달라도 집합이 같으면 맞다', () => {
    const r = 기법대조(
      원장,
      [줄(0, 'MEM-003', '예외', 'MKT-FN-009')],
      글들(['MKT-FN-009', 케이스('MKT-FN-009', 기법('상태 전이', '동등 분할', '상태 전이'))]),
      없음,
    );
    expect(r).toEqual([]);
  });

  it('기준 줄의 케이스는 안 본다', () => {
    const 기준 = 줄(0, 'MEM-001', '경계', 'MKT-FN-002');
    const r = 기법대조(원장, [기준], 글들(['MKT-FN-002', 케이스('MKT-FN-002')]), new Set([기준줄열쇠(기준)]));
    expect(r).toEqual([]);
  });

  it('tcId 칸이 빈칸 · 「—」 · 「제거함(…)」인 줄은 안 본다', () => {
    const r = 기법대조(
      원장,
      [줄(0, 'MEM-001', '경계', ''), 줄(1, 'MEM-001', '경계', '—'), 줄(2, 'MEM-001', '경계', '제거함(MKT-FN-002)')],
      글들(['', 케이스('')], ['—', 케이스('—')], ['제거함(MKT-FN-002)', 케이스('MKT-FN-002')]),
      없음,
    );
    expect(r).toEqual([]);
  });

  it('UI 케이스는 안 본다(K14 가 본다)', () => {
    const r = 기법대조(
      원장,
      [줄(0, 'MEM-001', 'UI', 'MKT-UI-001')],
      글들(['MKT-UI-001', 케이스('MKT-UI-001', 기법('경계값 분석'))]),
      없음,
    );
    expect(r).toEqual([]);
  });

  it('케이스 글이 없는 tcId 는 안 본다', () => {
    expect(기법대조(원장, [줄(0, 'MEM-001', '경계', 'MKT-FN-002')], 글들(), 없음)).toEqual([]);
  });

  it('techniques 를 글자로 못 읽으면(변수로 적음) 안 본다', () => {
    const r = 기법대조(
      원장,
      [줄(0, 'MEM-001', '경계', 'MKT-FN-002')],
      글들(['MKT-FN-002', 케이스('MKT-FN-002', '  techniques: 기법들,\n')]),
      없음,
    );
    expect(r).toEqual([]);
  });

  it('어긋남은 tcId 가 표에 처음 나온 줄 차례다', () => {
    const r = 기법대조(
      원장,
      [줄(5, 'MEM-002', '예외', 'MKT-FN-006'), 줄(2, 'MEM-001', '경계', 'MKT-FN-002')],
      글들(['MKT-FN-006', 케이스('MKT-FN-006')], ['MKT-FN-002', 케이스('MKT-FN-002')]),
      없음,
    );
    expect(r).toEqual([
      'MKT-FN-002 — 「경계값 분석」이어야 한다(지금 「없음」)',
      'MKT-FN-006 — 「동등 분할」이어야 한다(지금 「없음」)',
    ]);
  });
});
