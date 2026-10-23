// E2E 실패 기록 떼기 검사 — zip 이 없거나 깨져도 던지지 않고 실패 부품마다 사유를 단다. 브라우저 없이 돈다 (SPEC 도메인/시나리오 §7 「실패 기록」)

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioPartResult } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { trace없는까닭 } from '../execution/traceReason.js';
import { 부품비밀, 실패부품trace, trace를지운다 } from './runTrace.js';

const 부품 = (seq: number, status: ScenarioPartResult['status'], 단계: number[] = []): ScenarioPartResult => ({
  seq, status, durationMs: 1, mocks: [],
  steps: 단계.map((s) => ({ seq: s, title: `단계 ${s}`, status, durationMs: 1, assertions: [] })),
});

let 폴더 = '';
// trace 는 artifacts 볼륨 안 일반 파일만 읽는다 (리뷰 M4)
beforeEach(() => {
  폴더 = mkdtempSync(join(tmpdir(), 'run-trace-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 폴더;
});
afterEach(() => {
  delete process.env.PLATFORM_ARTIFACTS_DIR;
  rmSync(폴더, { recursive: true, force: true });
});

describe('실패부품trace', () => {
  it('zip 이 없으면 절차가 있는 실패 부품에만 「파일 없음」 — 통과 · 절차 없는 실패 부품은 빈다', async () => {
    const 기록 = await 실패부품trace(join(폴더, 'trace.zip'), { parts: [부품(1, 'PASS', [1]), 부품(2, 'FAIL'), 부품(3, 'FAIL', [2, 3])] }, []);

    expect([...기록.keys()]).toEqual([3]);
    expect(기록.get(3)).toEqual({ status: 'NONE', reason: trace없는까닭.파일없음, network: [], actions: [], console: [] });
  });

  it('깨진 zip 은 FAILED 다', async () => {
    const 경로 = join(폴더, 'trace.zip');
    writeFileSync(경로, 'zip 아님');

    const 기록 = await 실패부품trace(경로, { parts: [부품(1, 'FAIL', [1])] }, []);

    expect(기록.get(1)?.status).toBe('FAILED');
    expect(기록.get(1)?.reason).toMatch(/^trace 를 읽지 못했다/);
    expect(existsSync(경로)).toBe(true);
  });

  it('제한 시간에 끊긴 실행은 「끊김」 사유다', async () => {
    const 기록 = await 실패부품trace(join(폴더, 'trace.zip'), { parts: [부품(1, 'FAIL', [1])], error: { message: 'TIMEOUT' } }, []);

    expect(기록.get(1)?.reason).toBe(trace없는까닭.끊김);
  });

  it('실패 부품이 없으면 zip 을 읽지 않는다', async () => {
    const 경로 = join(폴더, 'trace.zip');
    writeFileSync(경로, 'zip 아님');

    expect((await 실패부품trace(경로, { parts: [부품(1, 'PASS', [1])] }, [])).size).toBe(0);
    expect(existsSync(경로)).toBe(true);
  });
});

describe('trace를지운다', () => {
  it('못 읽은 기록이 있으면 남기고 그 밖은 지운다', async () => {
    const 경로 = join(폴더, 'trace.zip');
    writeFileSync(경로, 'zip');
    const 실패 = { status: 'FAILED' as const, reason: 'x', network: [], actions: [], console: [] };

    await trace를지운다(경로, new Map([[1, 실패]]));
    expect(existsSync(경로)).toBe(true);
    await trace를지운다(경로, new Map());
    expect(existsSync(경로)).toBe(false);
    await trace를지운다(경로, new Map());
  });
});

describe('부품비밀', () => {
  it('비밀 칸 입력값 · 비밀 칸에 꽂은 값(숫자 포함)을 모은다', () => {
    const 명세 = { type: 'object', properties: { password: { type: 'string', format: 'password' } } };
    const 비밀 = 부품비밀([
      { part: { kind: 'case', tcId: 'X-1', params: { password: 'hunter2' }, expected: {}, skipSteps: [] }, param_schema: 명세, expected_schema: null, bound: { password: 1234 } },
      { part: { kind: 'wait', ms: 1 }, param_schema: null, expected_schema: null, bound: {} },
    ]);

    expect(비밀.sort()).toEqual(['1234', 'hunter2']);
  });
});
