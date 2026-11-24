// 반영 껍데기의 판단 두 곳 검사 — 적을 것 계산의 비밀번호 거절 · 지울 파일의 모양 검사 (도메인/작성 §3.6 「★ 보류 케이스」 반영)
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { 구간, 선언, 절차, 프로시저글 } from '../apps/admin/src/catalog/procedure-fixture.js';

import type { 사본 } from './authoring-copy.js';
import { 계산, 관문환경, 적용 } from './authoring-held-merge.js';

const 케이스 = `import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'XHM-001',
  name: '쿠폰 코드를 넣으면 적용된다',
  platforms: ['desktop'],
  held: '판정 불가 — 쿠폰 코드가 기획서에 없다',
  precondition: ['쿠폰이 있다'],
  params: z.object({ coupon: z.string().describe('쿠폰 코드') }),
  expected: z.object({}),
});

test(spec, async ({ params }) => {
  await test.step('쿠폰을 넣는다', async () => {
    await verify('코드가 비지 않았다', params.coupon.length > 0, true);
  });
});
`;

const 뿌리 = mkdtempSync(join(tmpdir(), 'held-merge-'));
afterAll(() => rmSync(뿌리, { recursive: true, force: true }));

function 트리(이름: string): string {
  const 트리 = join(뿌리, 이름);
  mkdirSync(join(트리, 'tests', 'xhm'), { recursive: true });
  writeFileSync(join(트리, 'tests', 'xhm', 'coupon.spec.ts'), 케이스);
  return 트리;
}

describe('계산 — 적을 글에 테스트 계정 비밀번호가 있으면 올리지 않는다', () => {
  it('넣은 값에 비밀번호 원문이 있으면 까닭만 내고 값은 싣지 않는다', () => {
    const r = 계산(트리('a'), 'XHM', { 'XHM-001': { params: { coupon: 'x-pw-secret-1-x' } } }, ['pw-secret-1']);
    expect(r).toEqual({ 사유: '넣은 값에 테스트 계정 비밀번호가 들어 있어 올리지 않았다' });
  });

  it('역할 계정 비밀번호도 같이 본다', () => {
    const r = 계산(트리('a2'), 'XHM', { 'XHM-001': { params: { coupon: 'admin-pw-77' } } }, ['admin-pw-77', 'pw-secret-1']);
    expect(r).toEqual({ 사유: '넣은 값에 테스트 계정 비밀번호가 들어 있어 올리지 않았다' });
  });

  it('비밀번호가 없으면 적을 글을 낸다', () => {
    const r = 계산(트리('b'), 'XHM', { 'XHM-001': { params: { coupon: 'WELCOME' } } }, ['pw-secret-1']);
    expect('쓰기' in r && [...r.쓰기.keys()]).toEqual(['tests/xhm/coupon.spec.ts']);
  });
});

describe('적용 — 지울 파일도 모양을 본다', () => {
  it('링크 폴더를 거쳐 트리 밖을 가리키면 지우지 않는다', () => {
    const 트리 = join(뿌리, 'c');
    const 밖 = join(뿌리, 'outside');
    mkdirSync(join(트리, 'tests'), { recursive: true });
    mkdirSync(밖, { recursive: true });
    writeFileSync(join(밖, 'a.spec.ts'), 'x');
    symlinkSync(밖, join(트리, 'tests', 'xhm'));
    const 거부 = 적용({ 트리 } as 사본, { 쓰기: new Map(), 지우기: ['tests/xhm/a.spec.ts'] });
    expect(거부).toMatch(/작업 트리 밖/);
    expect(existsSync(join(밖, 'a.spec.ts'))).toBe(true);
  });
});

describe('관문환경 — 보류 머지의 3회는 느린 망으로 돈다 (PRD-F9-35)', () => {
  it('PLATFORM_SLOW_API 를 1 로 싣는다', () => {
    const 자리 = { 집: '/집', 임시: '/임시' } as unknown as 사본;
    const 준비 = { 것: {} } as unknown as Parameters<typeof 관문환경>[2];
    expect(관문환경(자리, null, 준비).PLATFORM_SLOW_API).toBe('1');
  });
});

describe('계산 — 프로시저 파일 안 보류 케이스 (TP-F5-27)', () => {
  const 보류줄 = (사유: string) => `\n  held: '판정 불가 — ${사유}',`;
  const 칸 = `params: z.object({ 수: z.number().describe('수') }),`;
  const 선언들 =
    선언('가', 'XQ-FN-101') +
    선언('나', 'XQ-FN-102', 보류줄('기준 없음')).replace('params: null', 칸) +
    선언('다', 'XQ-FN-103', 보류줄('다른 기준 없음')).replace('params: null', 칸);
  const 본문 = 구간('가', '가를 한다') + 절차('나 준비') + 구간('나', '나를 한다') + 절차('다 준비') + 구간('다', '다를 한다');
  const 프로시저 = 프로시저글(본문, { 선언들, 가져오기: "import { z } from 'zod';", cases: '[가, 나, 다]' });
  const 표 = ['## 요구사항', '', '| 요구 | tcId |', '|---|---|', '| 1 | XQ-FN-102 |', '| 2 | XQ-FN-103 |', '', '## 테스트 프로시저', '', '| 프로시저 | 흐름 | 케이스 |', '|---|---|---|', '| `XQ-TP-001` | 흐름 | XQ-FN-101 → XQ-FN-102 → XQ-FN-103 |', ''].join('\n');
  const 경로 = 'tests/xq/XQ-TP-001.spec.ts';

  function 프로트리(이름: string, 글 = 프로시저): string {
    const 트리 = join(뿌리, 이름);
    mkdirSync(join(트리, 'tests', 'xq'), { recursive: true });
    mkdirSync(join(트리, 'docs', 'cases'), { recursive: true });
    writeFileSync(join(트리, 경로), 글);
    writeFileSync(join(트리, 'docs', 'cases', 'XQ.md'), 표);
    return 트리;
  }

  it('같은 파일 보류 둘을 채우면 앞 고침 위에 차례로 적어 둘 다 남는다', () => {
    const r = 계산(프로트리('p1'), 'XQ', { 'XQ-FN-102': { params: { 수: 2 } }, 'XQ-FN-103': { params: { 수: 3 } } }, []);
    if ('사유' in r) throw new Error(r.사유);
    const 글 = r.쓰기.get(경로) ?? '';
    expect(글).toContain('default(2)');
    expect(글).toContain('default(3)');
    expect(글).not.toContain('held:');
  });

  it('한 케이스만 채우면 다른 보류가 남아 병합하지 않는다 — 남은 번호를 말한다', () => {
    const r = 계산(프로트리('p2'), 'XQ', { 'XQ-FN-102': { params: { 수: 2 } } }, []);
    expect(r).toEqual({ 사유: '보류 표시가 남아 병합하지 않는다: XQ-FN-103' });
  });

  it('제거는 파일을 지우지 않고 그 케이스를 걷고, 절과 표가 한 번에 바뀐다', () => {
    const r = 계산(프로트리('p3'), 'XQ', { 'XQ-FN-102': { removed: true }, 'XQ-FN-103': { params: { 수: 3 } } }, []);
    if ('사유' in r) throw new Error(r.사유);
    expect(r.지우기).toEqual([]);
    expect(r.쓰기.get(경로)).not.toContain("tcId: 'XQ-FN-102'");
    expect(r.쓰기.get(경로)).toContain('cases: [가, 다]');
    const 문서 = r.쓰기.get('docs/cases/XQ.md') ?? '';
    expect(문서).toContain('| XQ-FN-101 → XQ-FN-103 |');
    expect(문서).toContain('| 1 | 제거함(XQ-FN-102) |');
    expect(readFileSync(join(뿌리, 'p3', 'docs', 'cases', 'XQ.md'), 'utf8')).toBe(표);
  });

  it('케이스를 다 제거하면 파일을 지우고 절의 줄도 지운다', () => {
    const 하나 = 프로시저글(구간('나', '나를 한다'), { 선언들: 선언('나', 'XQ-FN-102', 보류줄('기준 없음')), cases: '[나]' });
    const 트리 = 프로트리('p4', 하나);
    writeFileSync(join(트리, 'docs', 'cases', 'XQ.md'), 표.replace(' → XQ-FN-102 → XQ-FN-103', '').replace('XQ-FN-101', 'XQ-FN-102'));
    const r = 계산(트리, 'XQ', { 'XQ-FN-102': { removed: true } }, []);
    if ('사유' in r) throw new Error(r.사유);
    expect(r.지우기).toEqual([경로]);
    expect(r.쓰기.has(경로)).toBe(false);
    expect(r.쓰기.get('docs/cases/XQ.md')).not.toContain('XQ-TP-001');
  });
});
