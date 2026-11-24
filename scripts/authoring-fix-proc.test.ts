// 수정 AI 가 프로시저 안 케이스를 고칠 때 — 케이스마다 재기 · 고치기 전 파일 · 다시 돌린 횟수 · 그대로 한 번 · 프롬프트 줄 (작성 §3.6 「★ 테스트 프로시저 작성」 「수정 AI」)
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CASE_ATTACHMENT } from '@platform/kit/protocol';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 구간, 선언, 절차, 프로시저글 } from '../apps/admin/src/catalog/procedure-fixture.js';
import { 반영계획만들기, 반영절 } from './authoring-apply.js';
import { 고침프로시저들 } from './authoring-apply-proc.js';
import { 고치기전후, 자동병합재기 } from './authoring-fix-measure.js';
import { 고칠케이스더하기 } from './authoring-run3-env.js';
import { 다시돌림글, 다시돌림세기 } from './authoring-test-fix.js';

const 파일 = 'tests/xq/XQ-TP-001.spec.ts';
const 대상 = 'XQ-FN-102';
const 고장 = `테스트 고침 고장 내 보기: ${대상} · 고장 2 · 그 자리 빨강 2`;

/** 글쓰기 흐름 — 본문없음(101) → 글자수초과(102 · 고칠 케이스) → 게시확인(103) */
function 프로시저(바꿈: { 준비?: string; 첫?: string; 대상?: string; 끝?: string; cases?: string; 선언들?: string; 정리?: string; 안가름?: boolean } = {}): string {
  return 프로시저글(
    `  await test.cleanup('글을 지운다', async () => { await driver.waitFor('#gone', ${바꿈.정리 ?? "{ text: '삭제됨' }"}); });\n` +
      절차('글쓰기 화면을 연다', ` await driver.waitFor('#title', { text: '글쓰기' }); `) +
      구간('본문없음', '본문을 비운다', 바꿈.첫 ?? ` await verify('게시 버튼이 꺼진다', true, true); `) +
      절차('본문을 채운다', 바꿈.준비 ?? ` await driver.waitFor('#count', { text: '0' }); `) +
      (바꿈.안가름 === true ? '  if (true) { await test.case(글자수초과, async () => {}); }\n' : 구간('글자수초과', '본문에 501자를 넣는다', 바꿈.대상 ?? ` await verify('안내가 보인다', await driver.text('#hint'), '500자까지'); `)) +
      구간('게시확인', '게시를 누른다', 바꿈.끝 ?? ` await verify('타임라인에 글이 보인다', true, true); await verify('글이 하나다', 1, 1); `),
    { ...(바꿈.cases === undefined ? {} : { cases: 바꿈.cases }), ...(바꿈.선언들 === undefined ? {} : { 선언들: 바꿈.선언들 }) },
  );
}

const 잼 = (뒤: string | null, 앞: string | null = 프로시저(), 바뀐: readonly string[] | null = [파일], 줄 = 고장) => 자동병합재기([{ tcId: 대상, 앞, 뒤, 파일 }], 줄, 바뀐);

describe('자동 병합 조건 — 프로시저는 케이스마다 잰다', () => {
  it('대상 케이스의 조작 · 요소 주소만 고쳤으면 걸리지 않는다 — 확인을 더한 것도 괜찮다', () => {
    expect(잼(프로시저())).toEqual([]);
    expect(잼(프로시저({ 대상: ` await driver.click('#more'); await verify('안내가 보인다', await driver.text('#hint-v2'), '500자까지'); ` }))).toEqual([]);
    expect(잼(프로시저({ 끝: ` await verify('타임라인에 글이 보인다', true, true); await verify('글이 하나다', 1, 1); await verify('더한 확인', true, true); ` }))).toEqual([]);
  });

  it('대상 케이스의 기대값 · 준비 구간의 기다리는 값 · 선언의 expected 가 바뀌면 걸린다', () => {
    expect(잼(프로시저({ 대상: ` await verify('안내가 보인다', await driver.text('#hint'), '501자까지'); ` }))).toEqual(['EXPECTED_CHANGED']);
    expect(잼(프로시저({ 준비: ` await driver.waitFor('#count', { text: '1' }); ` }))).toEqual(['EXPECTED_CHANGED']);
    const 선언들 = 선언('본문없음', 'XQ-FN-101') + 선언('글자수초과', 대상).replace('expected: null', 'expected: { 합계: 1 }') + 선언('게시확인', 'XQ-FN-103');
    expect(잼(프로시저({ 선언들 }))).toEqual(['EXPECTED_CHANGED']);
  });

  it('맡지 않은 케이스의 기대값 · 확인 문장이 바뀌어도 걸린다', () => {
    expect(잼(프로시저({ 첫: ` await verify('게시 버튼이 꺼진다', true, false); ` }))).toEqual(['EXPECTED_CHANGED']);
    expect(잼(프로시저({ 끝: ` await verify('타임라인에 글이 보인다', true, true); ` }))).toEqual(['EXPECTED_CHANGED', 'VERIFY_FEWER']);
  });

  it('확인을 다른 케이스 구간으로 옮기면 파일 전체 수가 같아도 걸린다', () => {
    const 옮김 = 프로시저({ 첫: ` await verify('게시 버튼이 꺼진다', true, true); await verify('글이 하나다', 1, 1); `, 끝: ` await verify('타임라인에 글이 보인다', true, true); ` });
    expect(잼(옮김)).toEqual(['EXPECTED_CHANGED', 'VERIFY_FEWER']);
  });

  it('어느 케이스 것도 아닌 자리(정리)의 기다리는 값도 잰다', () => {
    expect(잼(프로시저({ 정리: "{ text: '없음' }" }))).toEqual(['EXPECTED_CHANGED']);
  });

  it('cases 의 케이스나 차례가 바뀌었거나 · 구간을 못 가르거나 · 파일이 없거나 프로시저가 아니면 「재지 못함」', () => {
    expect(잼(프로시저({ cases: '[글자수초과, 본문없음, 게시확인]' }))).toEqual(['NOT_MEASURED']);
    expect(잼(프로시저({ cases: '[본문없음, 글자수초과]' }))).toEqual(['NOT_MEASURED']);
    expect(잼(프로시저({ 안가름: true }))).toEqual(['NOT_MEASURED']);
    expect(잼(null)).toEqual(['NOT_MEASURED']);
    expect(잼(프로시저(), null)).toEqual(['NOT_MEASURED']);
    expect(잼("export const spec = defineCase({ tcId: 'XQ-FN-102', expected: null });")).toEqual(['NOT_MEASURED']);
  });

  it('고장 내 보기는 대상 케이스만 보고, 그 프로시저 말고 다른 테스트 파일이 바뀌었으면 「재지 못함」', () => {
    expect(잼(프로시저(), 프로시저(), [파일], '테스트 고침 고장 내 보기: XQ-FN-101 · 고장 1 · 그 자리 빨강 1')).toEqual(['NOT_MEASURED']);
    expect(잼(프로시저(), 프로시저(), [파일], `테스트 고침 고장 내 보기: ${대상} · 고장 2 · 그 자리 빨강 1`)).toEqual(['MUTATION_MISSED']);
    expect(잼(프로시저(), 프로시저(), [파일, 'tests/xq/XQ-TP-002.spec.ts'])).toEqual(['NOT_MEASURED']);
    expect(잼(프로시저(), 프로시저(), [파일, 'tests/xq/pages/글쓰기.page.ts'])).toEqual(['NOT_MEASURED']);
    expect(잼(프로시저(), 프로시저(), [`tests/xq/${대상}.spec.ts`])).toEqual(['NOT_MEASURED']);
  });

  it('같은 프로시저에서 둘을 맡으면 고장 줄을 케이스마다 본다', () => {
    const 둘 = [대상, 'XQ-FN-103'].map((tcId) => ({ tcId, 앞: 프로시저(), 뒤: 프로시저(), 파일 }));
    expect(자동병합재기(둘, 고장, [파일])).toEqual(['NOT_MEASURED']);
    expect(자동병합재기(둘, `${고장}\n테스트 고침 고장 내 보기: XQ-FN-103 · 고장 1 · 그 자리 빨강 1`, [파일])).toEqual([]);
  });
});

describe('프로시저 파일 찾기', () => {
  let 폴더 = '';
  beforeAll(() => {
    폴더 = mkdtempSync(join(tmpdir(), 'xtfp-'));
    mkdirSync(join(폴더, 'tests', 'xq'), { recursive: true });
    writeFileSync(join(폴더, 파일), 프로시저());
  });
  afterAll(() => rmSync(폴더, { recursive: true, force: true }));

  const 기준 = [{ 파일, procId: 'XQ-TP-001', 케이스: ['XQ-FN-101', 대상, 'XQ-FN-103'] }];

  it('고치기 전 글은 기준 판에서 그 케이스가 든 프로시저 파일이다', () => {
    const 목록 = ['100644 blob aaa\ttests/xq/XQ-FN-201.spec.ts', `100644 blob bbb\t${파일}`, ''].join('\0');
    const 깃 = (인자: string[]) => ({ ok: true, 낸것: `앞 ${인자[2] ?? ''}` });
    expect(고치기전후(목록, 폴더, 깃, 대상, 기준)).toEqual({ 앞: '앞 bbb', 뒤: 프로시저(), 파일 });
    expect(고치기전후(목록, 폴더, 깃, 'XQ-FN-201', 기준)).toEqual({ 앞: '앞 aaa', 뒤: null });
  });

  it('다시 돌린 횟수는 그 케이스가 실제로 돈 판만 센다 — 앞 케이스에 막힌 판 · 고치기 전 판은 안 센다', () => {
    const 판정 = (tcId: string, status: string) => ({ name: CASE_ATTACHMENT, body: Buffer.from(JSON.stringify(status === 'BLOCKED' ? { tcId, status: 'NA', error: { message: 'BLOCKED' }, blockedBy: 'XQ-FN-101' } : { tcId, status })).toString('base64') });
    const 기록 = (startTime: string, 둘째: string) =>
      JSON.stringify({
        stats: { startTime },
        suites: [{ file: 'xq/XQ-TP-001.spec.ts', specs: [{ tests: [{ projectName: 'android', status: 'expected', results: [{ duration: 10, attachments: [판정('XQ-FN-101', 'PASS'), 판정(대상, 둘째)] }] }] }] }],
      });
    const 고친때 = new Date('2026-11-25T01:30:00Z');
    utimesSync(join(폴더, 파일), 고친때, 고친때);
    const 결과 = mkdtempSync(join(tmpdir(), 'xtfp-r-'));
    try {
      writeFileSync(join(결과, 'gate3-app-1~폰1~1.json'), 기록('2026-11-25T01:00:00Z', 'FAIL'));
      writeFileSync(join(결과, 'gate3-app-2~폰1~1.json'), 기록('2026-11-25T02:00:00Z', 'BLOCKED'));
      writeFileSync(join(결과, 'gate3-game-3~폰1~1.json'), 기록('2026-11-25T03:00:00Z', 'PASS'));
      expect(다시돌림글(다시돌림세기(결과, [대상], 폴더))).toBe('다시 돌림 1번(폰 1)');
      expect(다시돌림세기(결과, ['XQ-FN-101', 대상], 폴더).횟수).toBe(1);
      expect(다시돌림세기(결과, ['XQ-FN-101'], 폴더).횟수).toBe(2);
      expect(다시돌림세기(결과, ['XQ-FN-999'], 폴더).기기).toEqual([]);
    } finally {
      rmSync(결과, { recursive: true, force: true });
    }
  });

  it('「그대로 한 번」은 맡긴 케이스가 든 프로시저 파일을 고른다', () => {
    const 파일들 = () => [{ 경로: 'xq/XQ-TP-001.spec.ts', 글: 프로시저() }, { 경로: 'xq/XQ-TP-002.spec.ts', 글: 프로시저글('', { 선언들: 선언('다른것', 'XQ-FN-201'), cases: '[다른것]', procId: 'XQ-TP-002' }) }];
    expect(고칠케이스더하기(['a'], 대상, 파일들)).toEqual(['a', 파일]);
  });

  it('프롬프트에 고칠 케이스가 든 프로시저 파일과 같은 프로시저의 케이스를 짚는다 — 안 맡은 프로시저는 안 적는다', () => {
    const 고침 = { issueKey: 'DM-12', cases: [{ runId: 42, tcId: 대상, env: 'qa' }], note: '' };
    const 판 = { version: 3, items: [] };
    const 기준들 = [...기준, { 파일: 'tests/xq/XQ-TP-002.spec.ts', procId: 'XQ-TP-002', 케이스: ['XQ-FN-201'] }];
    const 계획 = { ...반영계획만들기(판, 판, '', 'XQ', undefined, false, 고침), 고침프로시저: 고침프로시저들(고침, 기준들) };
    const 글 = 반영절({ 계획, 사본: '/자료/apply.json' }, [{ env: 'qa' }]).join('\n');
    expect(글).toContain(`고칠 케이스가 든 테스트 프로시저: ${파일} (케이스 XQ-FN-101 · ${대상} · XQ-FN-103)`);
    expect(글).not.toContain('XQ-TP-002');
    expect(고침프로시저들(undefined, 기준들)).toEqual([]);
  });
});
