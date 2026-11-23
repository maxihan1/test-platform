// 새 꼴 요청(파일 하나 + 케이스 목록)을 자식 프로세스로 돌려 케이스마다 답하는지, 끊겨도 끝난 판정이 남는지 검사한다 (SPEC 도메인/러너 §5.2 「프로시저 실행」)
// playwright 대신 짧은 셸 스크립트를 띄운다 (execute.test.ts 와 같은 방식). 채우기 표의 갈래는 response.test.ts 에 있다

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CaseResult, CasesExecuteRequest, ExecuteRequest } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { abort, execute, running } from './execute.js';
import { killTree } from './kill.js';
import { executeRequest } from './schema.js';

const 스크립트 = vi.hoisted(() => ({ 지금: 'exit 0' }));

vi.mock('node:child_process', async (원본) => {
  const 실제 = await 원본<typeof import('node:child_process')>();
  return {
    ...실제,
    spawn: (_cmd: string, _args: readonly string[], opts: import('node:child_process').SpawnOptions) =>
      실제.spawn('sh', ['-c', 스크립트.지금], opts),
  };
});

vi.mock('./appSession.js', () => ({ 앱연결을닫는다: vi.fn() }));

const 케이스들 = [
  { tcId: 'MTA-FN-101', params: { loginId: 'qa1' }, expected: {} },
  { tcId: 'MTA-FN-102', params: { 본문: '가나다' }, expected: { 남은글자: '497' } },
  { tcId: 'MTA-FN-103', params: {}, expected: {} },
];
const 요청 = (덧: Partial<CasesExecuteRequest> = {}): CasesExecuteRequest => ({
  runId: 5, historyId: 8, platform: 'desktop', filePath: 'mta/MTA-TP-012.spec.ts', baseUrl: '', procId: 'MTA-TP-012', cases: 케이스들, timeoutMs: 10_000, ...덧,
});

// 셸의 printf 가 그대로 찍게 작은따옴표로 싼다 — 판정 줄에는 작은따옴표가 없다
const 판정줄 = (r: Partial<CaseResult> & { tcId: string }): string => `printf '%s\\n' '@@CASE@@${JSON.stringify({ status: 'PASS', durationMs: 10, steps: [], ...r })}'`;
/** 케이스마다 [번호, 판정, 사유, 막은 케이스] — 없는 칸은 뺀다 */
const 요약 = (results: CaseResult[]): unknown[][] => results.map((r) => [r.tcId, r.status, r.error?.message, r.blockedBy].filter((v) => v !== undefined));

afterEach(() => {
  for (const { child } of running.values()) killTree(child);
  running.clear();
});

describe('execute — 새 꼴 요청', () => {
  it('자식이 케이스마다 흘린 판정 줄을 요청의 케이스 차례대로 답한다', async () => {
    스크립트.지금 = [판정줄({ tcId: 'MTA-FN-101' }), 판정줄({ tcId: 'MTA-FN-102', status: 'FAIL' }), 판정줄({ tcId: 'MTA-FN-103' }), 'exit 1'].join('; ');

    const 답 = await execute(요청(), 'a.spec.ts');

    expect(요약(답.results)).toEqual([['MTA-FN-101', 'PASS'], ['MTA-FN-102', 'FAIL'], ['MTA-FN-103', 'PASS']]);
    expect(답.historyId).toBe(8);
    expect(답).not.toHaveProperty('status');
    expect(답.error).toBeUndefined();
  });

  it('사람이 중단하면 끝난 케이스의 판정은 남기고 돌던 케이스와 못 간 케이스만 NA + ABORTED 로 채운다', async () => {
    스크립트.지금 = [판정줄({ tcId: 'MTA-FN-101' }), 판정줄({ tcId: 'MTA-FN-102', status: 'FAIL' }), 'sleep 30'].join('; ');

    const 응답 = execute(요청(), 'a.spec.ts');
    // 줄이 러너에 닿은 뒤에 끊는다
    await new Promise((done) => setTimeout(done, 300));
    abort(8);
    const 답 = await 응답;

    expect(요약(답.results)).toEqual([['MTA-FN-101', 'PASS'], ['MTA-FN-102', 'FAIL'], ['MTA-FN-103', 'NA', 'ABORTED']]);
    expect(답.error).toEqual({ message: 'ABORTED' });
  });

  it('러너 한도에 끊겨도 끝난 케이스의 판정은 남는다 — 나머지는 NA + TIMEOUT 이다', async () => {
    스크립트.지금 = [판정줄({ tcId: 'MTA-FN-101' }), 'sleep 30'].join('; ');

    const 답 = await execute(요청({ timeoutMs: 400 }), 'a.spec.ts');

    expect(요약(답.results)).toEqual([['MTA-FN-101', 'PASS'], ['MTA-FN-102', 'NA', 'TIMEOUT'], ['MTA-FN-103', 'NA', 'TIMEOUT']]);
    expect(답.error).toEqual({ message: 'TIMEOUT' });
  });

  it('파일을 못 읽어 줄 없이 끝나면 케이스마다 FAIL + 오류 글이다', async () => {
    스크립트.지금 = 'echo "SyntaxError: Unexpected token" >&2; exit 1';

    const 답 = await execute(요청(), 'a.spec.ts');

    expect(요약(답.results)).toEqual(케이스들.map((c) => [c.tcId, 'FAIL', 'SyntaxError: Unexpected token']));
  });

  it('옛 꼴 파일은 케이스 1건짜리 목록으로 같은 길을 탄다 — 리포터 결과 줄이 그 케이스의 결과다', async () => {
    const 결과 = { status: 'FAIL', durationMs: 77, steps: [{ seq: 1, title: '로그인', status: 'FAIL', durationMs: 3, assertions: [] }], error: { message: '요소를 찾지 못했다' } };
    스크립트.지금 = `printf '%s\\n' '@@RESULT@@${JSON.stringify(결과)}'; exit 1`;
    const 한건 = [{ tcId: 'TODO-001', params: {}, expected: {} }];

    const 답 = await execute(요청({ procId: undefined, cases: 한건, filePath: 'todo/TODO-001.spec.ts' }), 'a.spec.ts');
    // 같은 자식을 앞 꼴 요청으로 돌린 답과 케이스 결과가 같다
    const 앞요청: ExecuteRequest = { runId: 5, historyId: 8, tcId: 'TODO-001', platform: 'desktop', filePath: 'todo/TODO-001.spec.ts', baseUrl: '', params: {}, expected: {}, timeoutMs: 10_000 };
    const { historyId: _번호, ...앞답 } = await execute(앞요청, 'a.spec.ts');

    expect(답.results).toEqual([{ tcId: 'TODO-001', ...앞답 }]);
  });
});

describe('execute 가 자식에게 넘기는 케이스 입력', () => {
  let 폴더: string;
  const 받은 = (이름: string): string => readFileSync(join(폴더, 이름), 'utf8');

  beforeEach(() => {
    폴더 = mkdtempSync(join(tmpdir(), 'runner-cases-'));
    process.env.PLATFORM_CASES = '[{"tcId":"셸에-남은-값"}]';
    스크립트.지금 = `printf %s "$PLATFORM_CASES" > '${join(폴더, 'cases.txt')}'; printf %s "$PLATFORM_PARAMS" > '${join(폴더, 'params.txt')}'`;
  });

  afterEach(() => {
    delete process.env.PLATFORM_CASES;
    rmSync(폴더, { recursive: true, force: true });
  });

  it('새 꼴은 케이스 목록을 도는 차례 그대로 넘긴다 — 프로시저가 케이스마다 자기 값을 꺼낸다', async () => {
    await execute(요청(), 'a.spec.ts');

    expect(JSON.parse(받은('cases.txt'))).toEqual(케이스들);
    // 옛 꼴 파일이 읽는 칸에는 첫 케이스 값이 간다
    expect(JSON.parse(받은('params.txt'))).toEqual({ params: { loginId: 'qa1' }, expected: {} });
  });

  it('앞 꼴은 지금처럼 그 케이스 값만 넘기고 케이스 목록 칸은 비운다 — 러너를 켠 셸의 값을 물려받지 않게', async () => {
    await execute({ runId: 5, historyId: 8, tcId: 'TODO-001', platform: 'desktop', filePath: 'a.spec.ts', baseUrl: '', params: { title: '장보기' }, expected: { statusCode: 201 }, timeoutMs: 10_000 }, 'a.spec.ts');

    expect(받은('cases.txt')).toBe('');
    expect(JSON.parse(받은('params.txt'))).toEqual({ params: { title: '장보기' }, expected: { statusCode: 201 } });
  });
});

describe('executeRequest — 두 요청 꼴', () => {
  const 공통 = { runId: 5, historyId: 8, platform: 'android', filePath: 'mta/MTA-TP-012.spec.ts', baseUrl: '' };

  it('새 꼴은 케이스 목록과 프로시저 번호를 버리지 않고 받는다', () => {
    const 받은 = executeRequest.parse({ ...공통, procId: 'MTA-TP-012', cases: 케이스들, timeoutMs: 900_000 });

    expect(받은).toMatchObject({ procId: 'MTA-TP-012', cases: 케이스들, timeoutMs: 900_000 });
    expect(받은).not.toHaveProperty('tcId');
  });

  it('앞 꼴도 그대로 받는다', () => {
    expect(executeRequest.parse({ ...공통, tcId: 'AND-001', params: {}, expected: {} })).toMatchObject({ tcId: 'AND-001', timeoutMs: 300_000 });
  });

  it.each([
    ['케이스가 비었다', []],
    ['같은 tcId 가 둘이다', [케이스들[0], 케이스들[0]]],
    ['케이스에 번호가 없다', [{ params: {}, expected: {} }]],
  ])('%s — 거절한다', (_무엇, cases) => {
    expect(executeRequest.safeParse({ ...공통, cases }).success).toBe(false);
  });

  it('틀린 케이스 목록이 온 요청은 앞 꼴 칸이 같이 있어도 앞 꼴로 돌리지 않는다', () => {
    expect(executeRequest.safeParse({ ...공통, tcId: 'AND-001', params: {}, expected: {}, cases: [] }).success).toBe(false);
  });
});
