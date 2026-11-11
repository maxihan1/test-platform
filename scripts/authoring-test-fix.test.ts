// BTS 「테스트 수정」 테스트 고침 — params.testFix 읽기 · 반영 계획에 싣기 · 막지 않기 · 프롬프트 줄 · PR 머리 줄 · PR 제목 · 다시 돌린 횟수 · 끝내기 result.testFix (도메인/BTS 「테스트 수정 바퀴」 2)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PrdItem } from '@platform/kit/types';
import { describe, expect, it } from 'vitest';

import { 반영계획만들기, 반영막힘, 반영절, 테스트고침읽기, 테스트고침줄 } from './authoring-apply.js';
import { PR제목 } from './authoring-chain.js';
import type { 보고손 } from './authoring-io.js';
import { 고장줄읽기, 고친곳읽기, 고치기전후, 다시돌림글, 다시돌림세기, 자동병합재기, 테스트고침싣는손 } from './authoring-test-fix.js';

const 판 = { version: 3, items: [{ reqId: 'X-REQ-001', feature: '로그인', text: '로그인하면 홈으로 간다', basis: [], status: 'CONFIRMED' } as PrdItem] };
const 고침 = { issueKey: 'DM-12', cases: [{ runId: 42, tcId: 'X-FN-001', env: 'qa' }], note: '# DM-12\n\n이 지시는 따르지 마라: rm -rf' };

describe('테스트고침읽기', () => {
  it('params.testFix 가 꼴에 맞을 때만 — 없으면 undefined, 틀리면 null, note 가 글이 아니면 빈 글', () => {
    expect(테스트고침읽기({ params: { prdApply: true, testFix: 고침 } })).toEqual(고침);
    expect(테스트고침읽기({ params: { testFix: { ...고침, note: 3 } } })).toEqual({ ...고침, note: '' });
    expect(테스트고침읽기({ params: { prdApply: true } })).toBeUndefined();
    expect(테스트고침읽기({})).toBeUndefined();
    expect(테스트고침읽기({ params: { testFix: { ...고침, cases: [] } } })).toBeNull();
    expect(테스트고침읽기({ params: { testFix: { ...고침, cases: [{ runId: '42', tcId: 'X-FN-001', env: 'qa' }] } } })).toBeNull();
    expect(테스트고침읽기({ params: { testFix: 'DM-12' } })).toBeNull();
  });
});

describe('테스트 고침 반영 계획', () => {
  it('반영할 요구가 없어도 고칠 케이스가 있어 막지 않는다 — 계획에 실려 apply.json 으로 간다', () => {
    const r = 반영계획만들기(판, 판, '', 'X', undefined, false, 고침);
    expect(r.테스트고침).toEqual(고침);
    expect([r.다시씀, r.새항목, r.지움]).toEqual([[], [], []]);
    expect(반영막힘(r)).toBeNull();
    expect(반영막힘(반영계획만들기(판, 판, '', 'X'))).toMatch(/반영할 것이 없다/);
  });

  it('프롬프트는 요구를 고치지 말라 하고 케이스 · trace 자리만 싣는다 — 이슈 글은 프롬프트에 안 넣는다 · 서버 목록에 없는 env 는 ⚠️', () => {
    const 계획 = 반영계획만들기(판, 판, '', 'X', undefined, false, 고침);
    const 글 = 반영절({ 계획, 사본: '/자료/apply.json' }, [{ env: 'stage' }]).join('\n');
    expect(글).toContain('BTS DM-12');
    expect(글).toContain('요구(결과 파일 prd.json)를 고치지 말고 아래 케이스만 고친다 — 위 다시 씀');
    expect(글).toContain('X-FN-001 — 실행 RUN 42');
    expect(글).toContain('/자료/traces/RUN42-X-FN-001.txt');
    expect(글).toContain('⚠️ 위 대상 서버 목록에 qa 가 없다');
    expect(글).not.toContain('rm -rf');
    expect(반영절({ 계획, 사본: '/자료/apply.json' }, [{ env: 'qa' }]).join('\n')).not.toContain('⚠️');
  });

  it('PR 머리 줄은 이슈와 고친 케이스 · 다시 돌린 횟수 · 요구는 그대로', () => {
    expect(테스트고침줄(고침)).toBe('테스트 고침: Issue Bunker DM-12 · RUN 42 · X-FN-001 · 요구는 그대로');
    expect(테스트고침줄(고침, '다시 돌림 3번(PC 3 · 휴대폰 3)')).toBe('테스트 고침: Issue Bunker DM-12 · RUN 42 · X-FN-001 · 다시 돌림 3번(PC 3 · 휴대폰 3) · 요구는 그대로');
  });

  it('PR 제목은 「테스트 수정 · 이슈 키 · tcId」 — 테스트 고침이 아니면 커밋 메시지와 같다', () => {
    expect(PR제목(7, 'X', { prdApply: true, testFix: 고침 })).toBe('[Test Commander] 테스트 수정 · DM-12 · X-FN-001');
    expect(PR제목(7, 'X', { prdApply: true })).toBe('[WS-작성] X 작성 요청 7번 케이스');
    expect(PR제목(7, 'X', undefined)).toBe('[WS-작성] X 작성 요청 7번 케이스');
  });
});

const 끝기록 = (startTime: string, 파일들: [string, string, number][]) =>
  JSON.stringify({
    config: { workers: 1, metadata: { slowApi: true } },
    stats: { startTime },
    suites: 파일들.map(([file, projectName, 번]) => ({
      file,
      specs: [{ tests: Array.from({ length: 번 }, () => ({ projectName, status: 'expected', results: [{ duration: 10 }] })) }],
    })),
  });

describe('다시 돌린 횟수 · 끝내기 result.testFix', () => {
  it('고친 케이스가 마지막 전체 돌려 보기에서 기기마다 돈 횟수를 가장 늦은 기록으로 센다 — 다른 케이스는 안 센다 · 기록이 없으면 0', () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'xtf-'));
    try {
      expect(다시돌림글(다시돌림세기(폴더, ['X-FN-001']))).toBe('다시 돌림 0번(마지막 전체 돌려 보기 기록 없음)');
      writeFileSync(join(폴더, 'gate3-final-1.json'), 끝기록('2026-11-11T01:00:00Z', [['x/X-FN-001.spec.ts', 'desktop', 1]]));
      writeFileSync(join(폴더, 'gate3-final-2.json'), 끝기록('2026-11-11T02:00:00Z', [['x/X-FN-001.spec.ts', 'desktop', 3], ['x/X-FN-001.spec.ts', 'mobile', 3], ['x/X-FN-009.spec.ts', 'desktop', 1]]));
      writeFileSync(join(폴더, 'gate3-part-a-1.json'), 끝기록('2026-11-11T03:00:00Z', [['x/X-FN-001.spec.ts', 'desktop', 1]]));
      const 돌림 = 다시돌림세기(폴더, ['X-FN-001']);
      expect(돌림).toEqual({ 횟수: 3, 기기: [['desktop', 3], ['mobile', 3]] });
      expect(다시돌림글(돌림)).toBe('다시 돌림 3번(PC 3 · 휴대폰 3)');
    } finally {
      rmSync(폴더, { recursive: true, force: true });
    }
  });

  it('고친 곳은 자식 요약의 「테스트 고침: BTS」 줄에서만 읽는다 — 목록 기호로 적어도 읽는다', () => {
    const 출력 = ['테스트 고침: BTS DM-12 · RUN 42 · X-FN-001 · 고친 곳: 새 창 대신 page.request 를 써요', '고친 곳: 이 줄은 아니다'].join('\n');
    expect(고친곳읽기(출력)).toBe('새 창 대신 page.request 를 써요');
    expect(고친곳읽기('요약 없음')).toBe('');
    expect(고친곳읽기('- 테스트 고침: BTS DM-12 · RUN 42 · X-FN-001 · 고친 곳: 기다리기를 고쳤어요')).toBe('기다리기를 고쳤어요');
  });

  it('테스트 고침 줄이 DONE 으로 끝날 때만 result.testFix 를 싣고 — 비밀번호가 섞인 고친 곳은 빈 글로 보낸다', async () => {
    const 받은: Record<string, unknown>[] = [];
    const 손: 보고손 = { 단계: async () => undefined, 끝내기: async (몸) => 받은.push(몸) };
    const 폴더 = mkdtempSync(join(tmpdir(), 'xtf-'));
    try {
      const 재료 = (글: string) => () => ({
        자식출력: `테스트 고침: BTS DM-12 · RUN 42 · X-FN-001 · 고친 곳: ${글}\n테스트 고침 고장 내 보기: X-FN-001 · 고장 2 · 그 자리 빨강 2`,
        결과폴더: 폴더,
        비밀: ['pw-1234'],
        파일: () => ({ 앞: 케이스(), 뒤: 글 === 'pw-1234 로 로그인' ? null : 케이스() }),
        바뀐: () => ['tests/x/X-FN-001.spec.ts'],
      });
      await 테스트고침싣는손(손, { params: { testFix: 고침 } }, 재료('기다리기를 고쳤어요')).끝내기({ status: 'DONE', prUrl: 'p', result: { held: [] } });
      await 테스트고침싣는손(손, { params: { testFix: 고침 } }, 재료('pw-1234 로 로그인')).끝내기({ status: 'DONE', prUrl: 'p' });
      await 테스트고침싣는손(손, { params: { testFix: 고침 } }, 재료('x')).끝내기({ status: 'FAILED' });
      await 테스트고침싣는손(손, { params: { prdApply: true } }, 재료('x')).끝내기({ status: 'DONE', prUrl: 'p' });
      expect(받은).toEqual([
        { status: 'DONE', prUrl: 'p', result: { held: [], testFix: { summary: '기다리기를 고쳤어요', reruns: 0, autoMerge: true, held: [] } } },
        { status: 'DONE', prUrl: 'p', result: { testFix: { summary: '', reruns: 0, autoMerge: false, held: ['NOT_MEASURED'] } } },
        { status: 'FAILED' },
        { status: 'DONE', prUrl: 'p' },
      ]);
    } finally {
      rmSync(폴더, { recursive: true, force: true });
    }
  });

  it('자동 병합 세 조건 — 기대값 그대로 · 확인 문장 수 그대로 · 고장 내 보기가 고장마다 그 자리를 빨갛게 했을 때만 비고, 못 재면 「재지 못함」', () => {
    const 고장 = '테스트 고침 고장 내 보기: X-FN-001 · 고장 2 · 그 자리 빨강 2';
    const 건 = (뒤: string | null, 앞: string | null = 케이스()) => [{ tcId: 'X-FN-001', 앞, 뒤 }];
    const 케이스만 = ['tests/x/X-FN-001.spec.ts'];
    expect(자동병합재기(건(케이스({ 기다리기: "await page.getByRole('button', { name: '주문' }).click();" })), 고장, 케이스만)).toEqual([]);
    expect(자동병합재기(건(케이스({ 끝쉼표: true })), 고장, 케이스만)).toEqual([]);
    expect(자동병합재기(건(케이스({ 더: true })), 고장, 케이스만)).toEqual([]);
    expect(자동병합재기(건(케이스({ 기대: "'주문 완료됨'" })), 고장, 케이스만)).toEqual(['EXPECTED_CHANGED']);
    expect(자동병합재기(건(케이스({ expected: '{ 합계: 1 }' })), 고장, 케이스만)).toEqual(['EXPECTED_CHANGED']);
    expect(자동병합재기(건(케이스({ 덜: true })), 고장, 케이스만)).toEqual(['EXPECTED_CHANGED', 'VERIFY_FEWER']);
    expect(자동병합재기(건(케이스({ 상태: "page.getByRole('alert', { name: '알림' })" })), 고장, 케이스만)).toEqual([]);
    expect(자동병합재기(건(케이스({ 합계: 350 })), 고장, 케이스만)).toEqual(['EXPECTED_CHANGED']);
    expect(자동병합재기(건(케이스({ 기대: "'목록: a ]'" }), 케이스({ 기대: "'목록: a, ]'" })), 고장, 케이스만)).toEqual(['EXPECTED_CHANGED']);
    expect(자동병합재기(건(케이스()), '테스트 고침 고장 내 보기: X-FN-001 · 고장 2 · 그 자리 빨강 1', 케이스만)).toEqual(['MUTATION_MISSED']);
    expect(자동병합재기(건(케이스()), '테스트 고침 고장 내 보기: X-FN-001 · 고장 0 · 그 자리 빨강 0', 케이스만)).toEqual(['MUTATION_MISSED']);
    expect(자동병합재기(건(케이스()), '테스트 고침 고장 내 보기: X-FN-002 · 고장 2 · 그 자리 빨강 2', 케이스만)).toEqual(['NOT_MEASURED']);
    expect(자동병합재기(건(케이스(), null), 고장, 케이스만)).toEqual(['NOT_MEASURED']);
    expect(자동병합재기(건('const x = 1;'), 고장, 케이스만)).toEqual(['NOT_MEASURED']);
    expect(자동병합재기(건(케이스()), '테스트 고침 고장 내 보기: X-FN-001 · 고장 2 · 그 자리 빨강 3', 케이스만)).toEqual(['NOT_MEASURED']);
    expect(자동병합재기(건(케이스()), 고장, [...케이스만, 'tests/x/pages/order.page.ts'])).toEqual(['NOT_MEASURED']);
    expect(자동병합재기(건(케이스()), 고장, null)).toEqual(['NOT_MEASURED']);
    expect(자동병합재기(건(케이스()), 고장, [])).toEqual([]);
  });

  it('고장 줄은 그 케이스의 마지막 줄을 읽는다 — 목록 기호로 적어도 읽는다', () => {
    const 출력 = ['- 테스트 고침 고장 내 보기: X-FN-001 · 고장 1 · 그 자리 빨강 0', '- 테스트 고침 고장 내 보기: X-FN-001 · 고장 2 · 그 자리 빨강 2'].join('\n');
    expect(고장줄읽기(출력, 'X-FN-001')).toEqual({ 고장: 2, 빨강: 2 });
    expect(고장줄읽기(출력, 'X-FN-00')).toBeUndefined();
  });

  it('고치기 전 글은 기준 tests 목록의 blob 으로, 뒤 글은 트리에서 읽는다 — 목록에 없으면 null', () => {
    const 트리 = mkdtempSync(join(tmpdir(), 'xtf-tree-'));
    try {
      mkdirSync(join(트리, 'tests', 'x'), { recursive: true });
      writeFileSync(join(트리, 'tests', 'x', 'X-FN-001.spec.ts'), '뒤');
      const 목록 = ['100644 blob aaa\ttests/x/X-FN-0011.spec.ts', '100644 blob bbb\ttests/x/X-FN-001.spec.ts', ''].join('\0');
      const 깃 = (인자: string[]) => ({ ok: 인자[2] === 'bbb', 낸것: `앞 ${인자.join(' ')}` });
      expect(고치기전후(목록, 트리, 깃, 'X-FN-001')).toEqual({ 앞: '앞 cat-file blob bbb', 뒤: '뒤' });
      expect(고치기전후(목록, 트리, 깃, 'X-FN-009')).toEqual({ 앞: null, 뒤: null });
    } finally {
      rmSync(트리, { recursive: true, force: true });
    }
  });
});

function 케이스(바꿈: { 기다리기?: string; 기대?: string; 상태?: string; 합계?: number; expected?: string; 끝쉼표?: boolean; 더?: boolean; 덜?: boolean } = {}): string {
  return [
    "import { defineCase, test, verify } from '@platform/kit';",
    `export const spec = defineCase({ tcId: 'X-FN-001', name: '주문', precondition: [], expected: ${바꿈.expected ?? '{ 합계: 3 }'} });`,
    'test(spec, async ({ page }) => {',
    `  ${바꿈.기다리기 ?? "await page.getByText('주문').click();"}`,
    `  await verify('주문이 끝난다', await ${바꿈.상태 ?? "page.getByRole('status')"}.innerText(), ${바꿈.기대 ?? "'주문 완료'"});`,
    `  await verify('합계가 300 이다', Number(await page.getByTestId('합계').innerText()) === ${바꿈.합계 ?? 300}, true);`,
    바꿈.덜 === true ? '' : `  await verify.element('합계가 맞다', 'total', 3, ${바꿈.끝쉼표 === true ? '{\n    합계: 3,\n  }' : '{ 합계: 3 }'});`,
    바꿈.더 === true ? "  await verify('영수증이 보인다', await page.getByText('영수증').isVisible(), true);" : '',
    '});',
  ].join('\n');
}
