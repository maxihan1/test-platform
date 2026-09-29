// 반영 껍데기의 판단 두 곳 검사 — 적을 것 계산의 비밀번호 거절 · 지울 파일의 모양 검사 (도메인/작성 §3.6 「★ 보류 케이스」 반영)
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import type { 사본 } from './authoring-copy.js';
import { 계산, 적용 } from './authoring-held-merge.js';

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
    const r = 계산(트리('a'), 'XHM', { 'XHM-001': { params: { coupon: 'x-pw-secret-1-x' } } }, 'pw-secret-1');
    expect(r).toEqual({ 사유: '넣은 값에 테스트 계정 비밀번호가 들어 있어 올리지 않았다' });
  });

  it('비밀번호가 없으면 적을 글을 낸다', () => {
    const r = 계산(트리('b'), 'XHM', { 'XHM-001': { params: { coupon: 'WELCOME' } } }, 'pw-secret-1');
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
