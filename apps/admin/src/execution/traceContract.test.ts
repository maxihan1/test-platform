// 진짜 Playwright 로 trace 가 이어지는지 지킨다 — 러너 실행 → kit 리포터가 옮김 → 파서가 푼다 (SPEC 도메인/실행 §3.2 「trace」)
// trace 형식은 Playwright 가 약속한 것이 아니다. 올렸을 때 표가 조용히 비지 않게 여기서 빨개진다.
// 두 실행을 나란히 돌려 출력 폴더가 서로를 지우지 않는지도 본다

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { ExecuteRequest } from '@platform/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { traceDest } from '../../../../packages/kit/src/runtime/reporter.js';
import { execute } from '../../../runner/src/execute.js';
import { trace를푼다, type 풀린trace } from './traceParse.js';

const 고정폴더 = resolve(import.meta.dirname, 'traceFixture');
const 원래 = { ...process.env };
let 임시: string;

const 요청 = (historyId: number): ExecuteRequest => ({
  runId: 9,
  historyId,
  tcId: 'TRACE-001',
  platform: 'desktop',
  filePath: 'TRACE-001.spec.ts',
  baseUrl: '',
  params: {},
  expected: {},
  timeoutMs: 90_000,
});

describe('정식 실행의 trace', () => {
  let 응답들: Awaited<ReturnType<typeof execute>>[];
  let 풀림: 풀린trace;

  beforeAll(async () => {
    임시 = mkdtempSync(join(tmpdir(), 'trace-contract-'));
    process.env.PLATFORM_TESTS_DIR = 고정폴더;
    process.env.PLATFORM_ARTIFACTS_DIR = 임시;
    응답들 = await Promise.all([1, 2].map((h) => execute(요청(h), join(고정폴더, 'TRACE-001.spec.ts'))));
    풀림 = await trace를푼다(readFileSync(traceDest('9', '1')), { 본문: true });
  }, 120_000);

  afterAll(() => {
    process.env = { ...원래 };
    rmSync(임시, { recursive: true, force: true });
  });

  it('나란히 돈 두 실행 모두 결과 줄이 그대로이고 trace.zip 이 스크린샷 자리에 남는다', () => {
    for (const 응답 of 응답들) expect(응답).toMatchObject({ status: 'PASS', steps: [{ seq: 1 }, { seq: 2 }] });
    expect(existsSync(traceDest('9', '1'))).toBe(true);
    expect(existsSync(traceDest('9', '2'))).toBe(true);
  });

  it('실행이 끝나면 출력 폴더가 남지 않는다', () => {
    const 출력 = join(임시, 'playwright');
    expect(existsSync(출력) ? readdirSync(출력) : []).toEqual([]);
  });

  it('네트워크는 페이지 이동 · API · 실패만 남기고 단계 번호를 붙인다', () => {
    const 줄 = 풀림.network.map((n) => [n.seq, n.resourceType, n.method, new URL(n.url).pathname, n.status]);
    expect(줄).toEqual([
      [1, 'document', 'GET', '/', 200],
      [2, 'fetch', 'POST', '/api/login', 200],
      [2, 'fetch', 'GET', '/api/fail', 500],
    ]);
    const 로그인 = 풀림.network[1]!;
    expect(로그인.requestBody).toContain('pa55word');
    expect(로그인.responseBody).toContain('s3cret-tok');
    expect(풀림.network[2]!.responseBody).toContain('boom');
    expect(풀림.network[0]!.responseBody).toBeNull();
  });

  it('조작은 케이스가 부른 것만 단계별로 남기고 비밀번호 칸을 알아본다', () => {
    expect(풀림.actions.map((a) => [a.seq, a.title.split(' ')[0]])).toEqual([
      [1, 'Navigate'],
      [2, 'Fill'],
      [2, 'Wait'],
      [2, 'Click'],
      [2, 'Is'],
    ]);
    expect(풀림.actions[1]).toMatchObject({ target: "getByLabel('비밀번호')", value: 'pa55word', secretField: true });
    expect(풀림.actions[3]!.secretField).toBe(false);
  });

  it('콘솔은 오류 · 경고 · 잡히지 않은 오류만 남긴다', () => {
    expect(풀림.console.map((c) => [c.seq, c.level])).toEqual([
      [2, 'error'],
      [2, 'error'],
      [2, 'pageerror'],
    ]);
    expect(풀림.console[1]!.text).toBe('주문 실패 pa55word');
    expect(풀림.console[2]!.text).toContain('잡히지 않은 오류');
  });
});
