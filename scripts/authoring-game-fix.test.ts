// 게임 실패 자동 수정의 에이전트 쪽 — 이슈 없는 testFix 읽기 · 프롬프트 · PR 머리 줄 · 제목 · 케이스 끝 · 기다리는 값 재기 · 게임 돌려 보기 횟수 · 실패 자료 파일 · 맵 행 빌드 (도메인/게임 §3.10 「실패 자동 수정」)
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 반영계획만들기, 반영절, 테스트고침읽기, 테스트고침줄 } from './authoring-apply.js';
import { PR제목 } from './authoring-chain.js';
import { 맵올리기 } from './authoring-explore.js';
import type { 보고손 } from './authoring-io.js';
import { 고칠케이스더하기 } from './authoring-run3-env.js';
import { 실패trace받기 } from './authoring-screen-right.js';
import { 고친곳읽기, 다시돌림글, 다시돌림세기, 되묻기인자, 요약되받기, 자동병합재기, 케이스끝들읽기, 테스트고침싣는손 } from './authoring-test-fix.js';

const 고침 = { auto: true as const, cases: [{ runId: 21154, tcId: 'ARG-FN-031', env: 'qa', failure: 'notFound' as const }, { runId: 21154, tcId: 'ARG-FN-040', env: 'qa', failure: 'timeout' as const }], note: '' };
const 판 = { version: 3, items: [] };

let 폴더 = '';
beforeEach(() => {
  폴더 = mkdtempSync(join(tmpdir(), 'xgfa-'));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rmSync(폴더, { recursive: true, force: true });
});

describe('이슈 없는 testFix', () => {
  it('auto 요청을 읽고 꼴이 틀리면 null 이다 — 실패 유형은 둘뿐이다', () => {
    expect(테스트고침읽기({ params: { prdApply: true, testFix: 고침 } })).toEqual(고침);
    expect(테스트고침읽기({ params: { testFix: { ...고침, cases: [{ ...고침.cases[0], failure: 'assert' }] } } })).toBeNull();
    expect(테스트고침읽기({ params: { testFix: { ...고침, cases: [] } } })).toBeNull();
  });

  it('반영 계획에 싣고 프롬프트는 사람 판정이 아니라고 말하고 실패 자료 파일 셋을 짚는다 — 이슈 키는 없다', () => {
    const 계획 = 반영계획만들기(판, 판, '', 'ARG', undefined, true, 고침);
    const 글 = 반영절({ 계획, 사본: join(폴더, 'apply.json') }, [{ env: 'qa' }]).join('\n');
    expect(글).toContain('게임 실패 자동 수정');
    expect(글).toContain('사람이 판정한 것이 아니다');
    expect(글).toContain(`ARG-FN-031 — 실행 RUN 21154 에서 요소를 찾지 못함`);
    expect(글).toContain(join(폴더, 'traces', 'RUN21154-ARG-FN-040.game-tree.txt'));
    expect(글).toContain(join(폴더, 'traces', 'RUN21154-ARG-FN-040.game-errors.txt'));
    expect(글).not.toContain('BTS');
    expect(반영절({ 계획, 사본: join(폴더, 'apply.json') }, []).join('\n')).toContain('`테스트 고침 끝: ARG-FN-031 · NOT_FOUND · 대상 서버 줄 없음`');
  });

  it('PR 머리 줄과 제목은 실행 번호 · 실패 유형을 보인다', () => {
    expect(테스트고침줄(고침, '다시 돌림 2번(폰 2)')).toBe('테스트 고침: 게임 조작 실패 자동 수정 · RUN 21154 · ARG-FN-031(요소를 찾지 못함), RUN 21154 · ARG-FN-040(타임아웃) · 다시 돌림 2번(폰 2) · 요구는 그대로');
    expect(PR제목(7, 'ARG', { prdApply: true, testFix: 고침 })).toBe('[Test Commander] 게임 자동 수정 · RUN 21154 · ARG-FN-031, ARG-FN-040');
  });
});

const 끝줄 = (tcId: string, 끝: string, 본것 = '') => `테스트 고침 끝: ${tcId} · ${끝}${본것 === '' ? '' : ` · ${본것}`}`;

describe('케이스 끝', () => {
  it('맡은 케이스의 마지막 줄만 읽고 모르는 끝 · 비밀번호가 섞인 본 것은 버린다', () => {
    expect(케이스끝들읽기('테스트 고침 끝: `ARG-FN-031` · FIXED', ['ARG-FN-031'])).toEqual([{ tcId: 'ARG-FN-031', outcome: 'FIXED' }]);
    const 출력 = [끝줄('ARG-FN-031', 'NOT_FOUND', '상점 버튼이 없음'), 끝줄('ARG-FN-031', 'FIXED'), '- ' + 끝줄('ARG-FN-040', 'FLAKY', 'pw-1234 로 들어감'), 끝줄('ARG-FN-099', 'FIXED'), 끝줄('ARG-FN-040', 'DONE')].join('\n');
    expect(케이스끝들읽기(출력, ['ARG-FN-031', 'ARG-FN-040'], ['pw-1234'])).toEqual([{ tcId: 'ARG-FN-031', outcome: 'FIXED' }, { tcId: 'ARG-FN-040', outcome: 'FLAKY' }]);
    expect(고친곳읽기('테스트 고침: 게임 · RUN 21154 · ARG-FN-031 · 고친 곳: 상점 버튼 주소를 바꿨어요')).toBe('상점 버튼 주소를 바꿨어요');
  });

  it('끝내기 result.testFix 에 케이스 끝을 싣고 고친 케이스만 잰다 — 다시 돌리니 통과한 케이스는 고장 줄이 없어도 걸리지 않는다', async () => {
    const 받은: Record<string, unknown>[] = [];
    const 손: 보고손 = { 단계: async () => undefined, 끝내기: async (몸) => 받은.push(몸) };
    const 출력 = [끝줄('ARG-FN-031', 'FIXED'), '테스트 고침 고장 내 보기: ARG-FN-031 · 고장 2 · 그 자리 빨강 2', 끝줄('ARG-FN-040', 'FLAKY', '그대로 통과')].join('\n');
    const 재료 = () => ({ 자식출력: 출력, 결과폴더: 폴더, 비밀: [], 파일: () => ({ 앞: 게임케이스(), 뒤: 게임케이스() }), 바뀐: () => ['tests/arg/ARG-FN-031.spec.ts'] });
    await 테스트고침싣는손(손, { params: { testFix: 고침 } }, 재료).끝내기({ status: 'DONE', prUrl: 'p' });
    expect(받은).toEqual([{ status: 'DONE', prUrl: 'p', result: { testFix: { summary: '', reruns: 0, autoMerge: true, held: [], cases: [{ tcId: 'ARG-FN-031', outcome: 'FIXED' }, { tcId: 'ARG-FN-040', outcome: 'FLAKY', note: '그대로 통과' }] } } }]);
  });

  it('끝 줄이 하나도 없으면 칸을 안 싣고 다 고친 것으로 잰다 · 고친 케이스가 없으면 자동 반영하지 않는다', async () => {
    const 받은: Record<string, unknown>[] = [];
    const 손: 보고손 = { 단계: async () => undefined, 끝내기: async (몸) => 받은.push(몸) };
    const 재료 = (출력: string) => () => ({ 자식출력: 출력, 결과폴더: 폴더, 비밀: [], 파일: () => ({ 앞: 게임케이스(), 뒤: 게임케이스() }), 바뀐: () => [] });
    await 테스트고침싣는손(손, { params: { testFix: 고침 } }, 재료('요약 없음')).끝내기({ status: 'DONE', prUrl: 'p' });
    await 테스트고침싣는손(손, { params: { testFix: 고침 } }, 재료([끝줄('ARG-FN-031', 'FLAKY'), 끝줄('ARG-FN-040', 'NOT_FOUND', '창이 안 열림')].join('\n'))).끝내기({ status: 'DONE', prUrl: 'p' });
    expect((받은[0]!.result as { testFix: Record<string, unknown> }).testFix).toEqual({ summary: '', reruns: 0, autoMerge: false, held: ['NOT_MEASURED'] });
    expect((받은[1]!.result as { testFix: Record<string, unknown> }).testFix).toMatchObject({ autoMerge: false, held: ['NOT_MEASURED'], cases: [{ tcId: 'ARG-FN-031', outcome: 'FLAKY' }, { tcId: 'ARG-FN-040', outcome: 'NOT_FOUND', note: '창이 안 열림' }] });
  });

  it('끝 줄이 없는 케이스와 고쳤는데 고장 줄이 없는 케이스만 되묻는다', async () => {
    const 부름 = vi.fn(async () => '');
    const 다있음 = [끝줄('ARG-FN-031', 'NOT_FOUND', '창이 안 열림'), 끝줄('ARG-FN-040', 'FLAKY')].join('\n');
    expect(await 요약되받기({ params: { testFix: 고침 } }, 다있음, 's1', true, 부름)).toBe('');
    expect(부름).not.toHaveBeenCalled();
    await 요약되받기({ params: { testFix: 고침 } }, [끝줄('ARG-FN-031', 'FIXED'), 끝줄('ARG-FN-040', 'FLAKY')].join('\n'), 's1', true, 부름);
    await 요약되받기({ params: { testFix: 고침 } }, 끝줄('ARG-FN-040', 'FLAKY'), 's1', true, 부름);
    const 글들 = 부름.mock.calls.map((c) => (c as unknown as [unknown, string])[1]);
    expect(글들[0]).toContain('빠진 케이스: ARG-FN-031)');
    expect(글들[1]).toContain('`테스트 고침 끝: <tcId> · FIXED|FLAKY|NOT_FOUND · <본 것 한 줄>`');
    expect(되묻기인자(['--disallowedTools', 'X'], 's1')).toContain('--resume');
    // 고장 내 보기에 안 들어갔으면 끝 줄만 되묻고 지어 적은 고장 줄은 버린다
    const 흐름 = (글: string) => JSON.stringify({ type: 'result', result: 글, session_id: 's1' });
    const 지어냄 = vi.fn(async () => 흐름([끝줄('ARG-FN-031', 'FIXED'), '테스트 고침 고장 내 보기: ARG-FN-031 · 고장 2 · 그 자리 빨강 2', 끝줄('ARG-FN-040', 'FLAKY')].join('\n')));
    expect(await 요약되받기({ params: { testFix: 고침 } }, 끝줄('ARG-FN-040', 'FLAKY'), 's1', false, 지어냄)).toBe([끝줄('ARG-FN-031', 'FIXED'), 끝줄('ARG-FN-040', 'FLAKY')].join('\n'));
    expect(await 요약되받기({ params: { testFix: 고침 } }, 끝줄('ARG-FN-031', 'FIXED') + '\n' + 끝줄('ARG-FN-040', 'FLAKY'), 's1', false, 지어냄)).toBe('');
    expect(지어냄).toHaveBeenCalledTimes(1);
  });
});

describe('기다리는 값 재기', () => {
  const 고장 = '테스트 고침 고장 내 보기: ARG-FN-031 · 고장 2 · 그 자리 빨강 2';
  const 잼 = (뒤: string) => 자동병합재기([{ tcId: 'ARG-FN-031', 앞: 게임케이스(), 뒤 }], 고장, ['tests/arg/ARG-FN-031.spec.ts']);

  it('주소 · 얼마나 기다리나 · 조작을 고친 고침은 걸리지 않는다', () => {
    expect(잼(게임케이스({ 주소: "'/Canvas/ShopV2/Title'", 시간: 30_000, 멈춤: 90_000 }))).toEqual([]);
  });

  it('waitFor 의 글자 · waitForValue 의 값 · repeatUntil 의 목표를 바꾸면 기대값이 바뀐 것이다', () => {
    expect(잼(게임케이스({ 글자: "'상점 닫힘'" }))).toEqual(['EXPECTED_CHANGED']);
    expect(잼(게임케이스({ 값: 'false' }))).toEqual(['EXPECTED_CHANGED']);
    expect(잼(게임케이스({ 목표: 3 }))).toEqual(['EXPECTED_CHANGED']);
  });
});

describe('게임 돌려 보기 횟수', () => {
  it('게임 기록은 다 더하고 웹 마지막 전체 돌려 보기는 가장 늦은 것만 센다', () => {
    const 기록 = (startTime: string, file: string, projectName: string) =>
      JSON.stringify({ config: { workers: 1 }, stats: { startTime }, suites: [{ file, specs: [{ tests: [{ projectName, status: 'expected', results: [{ duration: 10 }] }] }] }] });
    writeFileSync(join(폴더, 'gate3-game-1~폰1~1.json'), 기록('2026-11-20T01:00:00Z', 'arg/ARG-FN-031.spec.ts', 'android'));
    writeFileSync(join(폴더, 'gate3-game-2~폰1~1.json'), 기록('2026-11-20T02:00:00Z', 'arg/ARG-FN-031.spec.ts', 'android'));
    writeFileSync(join(폴더, 'gate3-game-3~폰1~1.json'), 기록('2026-11-20T03:00:00Z', 'arg/ARG-FN-040.spec.ts', 'android'));
    expect(다시돌림글(다시돌림세기(폴더, ['ARG-FN-031']))).toBe('다시 돌림 2번(폰 2)');
    // 케이스를 1시 반에 고쳤으면 그 앞(고치기 전 그대로 한 번 · 고장 내 보기) 기록은 안 센다
    const 트리 = join(폴더, '트리');
    mkdirSync(join(트리, 'tests', 'arg'), { recursive: true });
    writeFileSync(join(트리, 'tests', 'arg', 'ARG-FN-031.spec.ts'), '');
    const 고친때 = new Date('2026-11-20T01:30:00Z');
    utimesSync(join(트리, 'tests', 'arg', 'ARG-FN-031.spec.ts'), 고친때, 고친때);
    expect(다시돌림글(다시돌림세기(폴더, ['ARG-FN-031'], 트리))).toBe('다시 돌림 1번(폰 1)');
  });
});

describe('맡긴 케이스를 그대로 한 번', () => {
  it('바뀐 파일 목록에 맡긴 케이스 파일을 더해 폰 돌려 보기가 고치기 전에도 돌린다 — 값이 없으면 케이스 파일을 안 읽는다', () => {
    const 경로들 = vi.fn(() => ['arg/ARG-FN-031.spec.ts', 'arg/sub/ARG-FN-040.spec.ts', 'arg/ARG-FN-0310.spec.ts', 'arg/pages/상점.page.ts']);
    expect(고칠케이스더하기(['tests/arg/pages/던전.page.ts'], 'ARG-FN-031, ARG-FN-040', 경로들)).toEqual(['tests/arg/pages/던전.page.ts', 'tests/arg/ARG-FN-031.spec.ts', 'tests/arg/sub/ARG-FN-040.spec.ts']);
    expect(고칠케이스더하기(['tests/arg/ARG-FN-031.spec.ts'], 'ARG-FN-031', 경로들)).toEqual(['tests/arg/ARG-FN-031.spec.ts']);
    경로들.mockClear();
    expect(고칠케이스더하기(['a'], undefined, 경로들)).toEqual(['a']);
    expect(경로들).not.toHaveBeenCalled();
  });
});

describe('실패 자료 · 맵 행 빌드', () => {
  it('게임 항목은 오브젝트 목록 · 게임 오류 로그를 요약 옆 파일로 둔다 — 없는 것은 안 쓴다', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ summary: ['실패한 절차: 상점을 연다', '오류: 요소를 찾지 못했습니다'], game: { step: '상점을 연다', error: 'x', tree: '/Canvas/Shop', errors: null } }), { status: 200 }));
    expect(await 실패trace받기({ 주소기지: 'http://s', 토큰: 't' }, { id: 7, params: { testFix: { ...고침, cases: [고침.cases[0]] } } }, 폴더)).toBe(1);
    expect(readFileSync(join(폴더, 'traces', 'RUN21154-ARG-FN-031.txt'), 'utf8')).toBe('실패한 절차: 상점을 연다\n오류: 요소를 찾지 못했습니다\n');
    expect(readFileSync(join(폴더, 'traces', 'RUN21154-ARG-FN-031.game-tree.txt'), 'utf8')).toBe('/Canvas/Shop');
    expect(existsSync(join(폴더, 'traces', 'RUN21154-ARG-FN-031.game-errors.txt'))).toBe(false);
  });

  it('빌드를 주면 빌드 칸이 빈 확인 · 진행 불가 행에만 단다 — 재확인 필요가 풀리게', async () => {
    const 몸들: unknown[] = [];
    vi.stubGlobal('fetch', async (_: string, 옵션: RequestInit) => (몸들.push(JSON.parse(옵션.body as string)), new Response(null, { status: 204 })));
    const 행 = (action: string, 덧: Record<string, unknown>) => ({ kind: 'MOVE', fromKey: 'game:Main', action, toKey: 'game:Main/Shop', ...덧 });
    writeFileSync(join(폴더, 'game-route.json'), JSON.stringify({ rows: [행('상점 누르기', { status: 'OK' }), 행('상점2 누르기', { status: 'BLOCKED', reason: '창을 못 엶' }), 행('옛 빌드', { status: 'OK', buildNo: '22' })] }));
    const 통로 = { 주소기지: 'http://s', 토큰: 't', 번호: 7 };
    expect((await 맵올리기(통로, 폴더, [], '23')).줄).toBe('조작 맵: 행 3개 올림 · 행 2개에 빌드 23');
    expect((await 맵올리기(통로, 폴더, [])).줄).toBe('조작 맵: 행 3개 올림');
    expect((몸들[0] as { rows: { buildNo?: string }[] }).rows.map((r) => r.buildNo)).toEqual(['23', '23', '22']);
    expect((몸들[1] as { rows: { buildNo?: string }[] }).rows.map((r) => r.buildNo)).toEqual([undefined, undefined, '22']);
  });
});

function 게임케이스(바꿈: { 주소?: string; 시간?: number; 멈춤?: number; 글자?: string; 값?: string; 목표?: number } = {}): string {
  return [
    "import { defineCase, repeatUntil, test, verify } from '@platform/kit';",
    "export const spec = defineCase({ tcId: 'ARG-FN-031', name: '상점', precondition: [], expected: null });",
    'test(spec, async ({ game }) => {',
    `  await game.click(${바꿈.주소 ?? "'/Canvas/Shop/Title'"});`,
    `  await game.waitFor('/Canvas/Shop/Title', { text: ${바꿈.글자 ?? "'상점'"}, timeoutMs: ${String(바꿈.시간 ?? 10_000)} });`,
    `  await game.waitForValue('/Canvas/Shop', 'CanvasGroup.alpha', ${바꿈.값 ?? '1'}, { timeoutMs: 10_000 });`,
    `  await repeatUntil(() => game.click('/Canvas/Imp'), { progress: async () => 1, goal: ${String(바꿈.목표 ?? 1)}, stallMs: ${String(바꿈.멈춤 ?? 60_000)} });`,
    "  await verify('상점이 열린다', await game.text('/Canvas/Shop/Title'), '상점');",
    '});',
  ].join('\n');
}
