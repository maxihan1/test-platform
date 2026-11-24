// 폰 돌려 보기의 프로시저 몫 검사 — 케이스 판정 첨부 읽기 · 케이스마다 견주기 · 끊긴 프로시저 · 폰실행 출력과 끝 검사 (작성 §3.6 「★ 테스트 프로시저 작성」 「돌려 보기 — 프로시저 통째로 1번」)
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { 구간, 선언, 절차, 프로시저글 } from '../apps/admin/src/catalog/procedure-fixture.js';
import type { 돌린판 } from './authoring-gate3.js';
import { 끊긴프로시저들, 케이스판읽기, 프로시저판정 } from './authoring-proc-run.js';
import { 폰끝검사, 폰실행 } from './authoring-run3-game.js';

const 첨부 = (판정: object) => ({ name: 'platform-case', contentType: 'application/json', body: Buffer.from(JSON.stringify(판정)).toString('base64') });

/** 폰 · 계정 자리가 든 기록 이름으로 판 하나 */
const 판 = (폰: string, 시작: number, 케이스들: 돌린판['케이스들']): 돌린판 => ({
  기록: `gate3-app-${시작}~${폰}~1.json`, 시작, 느림: false, 끝: false, 상태들: [케이스들?.every((k) => k.상태 === '초록') ? 'expected' : 'unexpected'], 시간들: [1000], 오류: null, ...(케이스들 && { 케이스들 }),
});

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
  vi.restoreAllMocks();
});

describe('케이스판읽기 — kit 이 남긴 판정 첨부', () => {
  it('통과 · 보류는 초록, BLOCKED 는 막힘(막은 케이스), 나머지는 빨강이고 오류 글이 없으면 틀린 확인 문장을 쓴다. 같은 케이스는 뒤 것이다', () => {
    expect(
      케이스판읽기([
        {
          attachments: [
            첨부({ tcId: 'A', status: 'FAIL', steps: [] }),
            첨부({ tcId: 'A', status: 'FAIL', steps: [{ assertions: [{ statement: '맞다', status: 'PASS' }, { statement: '사진은 4장까지다', status: 'FAIL' }] }] }),
            첨부({ tcId: 'B', status: 'NA', error: { message: 'BLOCKED' }, blockedBy: 'A' }),
            첨부({ tcId: 'C', status: 'NA', error: { message: '보류 — 쿠폰 코드를 모른다' } }),
            첨부({ tcId: 'D', status: 'NA', error: { message: 'Test timeout of 300000ms exceeded.\n자세히' } }),
            첨부({ tcId: 'E', status: 'PASS' }),
            { name: 'screenshot', body: 'eA==' },
          ],
        },
      ]),
    ).toEqual([
      { tcId: 'A', 상태: '빨강', 오류: '검증 실패: 사진은 4장까지다' },
      { tcId: 'B', 상태: '막힘', 막은: 'A', 오류: null },
      { tcId: 'C', 상태: '초록', 오류: null },
      { tcId: 'D', 상태: '빨강', 오류: 'Test timeout of 300000ms exceeded.' },
      { tcId: 'E', 상태: '초록', 오류: null },
    ]);
  });

  it('재시도가 있으면 마지막 회차 첨부만 읽는다 — 앞 회차 판정이 남지 않게', () => {
    expect(케이스판읽기([{ attachments: [첨부({ tcId: 'A', status: 'FAIL', steps: [] }), 첨부({ tcId: 'B', status: 'PASS' })] }, { attachments: [첨부({ tcId: 'A', status: 'PASS' })] }])).toEqual([
      { tcId: 'A', 상태: '초록', 오류: null },
    ]);
  });

  it('판정 첨부가 없으면(옛 꼴 · kit 이 판정 전에 죽음) undefined', () => {
    expect(케이스판읽기([{ attachments: [] }])).toBeUndefined();
    expect(케이스판읽기(undefined)).toBeUndefined();
  });
});

describe('프로시저판정 — 통째로 돈 판을 케이스마다 견준다', () => {
  const 빨강A = 판('P1', 100, [{ tcId: 'A', 상태: '빨강', 오류: '검증 실패: 사진' }, { tcId: 'B', 상태: '막힘', 막은: 'A', 오류: null }]);

  it('다른 폰이 있으면 빨간 케이스 때문에 프로시저를 그 폰에서 다시 돌린다 — 막힌 케이스는 막힘으로 남는다', () => {
    expect(프로시저판정(['A', 'B'], [빨강A], 0, ['P1', 'P2'], [1])).toEqual({
      파일: { 상태: '다시', 계정: 1, 뺄폰: 'P1' },
      케이스: [['A', { 상태: '다시', 계정: 1, 뺄폰: 'P1' }], ['B', { 상태: '막힘', 막은: 'A' }]],
    });
  });

  it('다른 폰에서 다 초록이면 빨갛던 케이스만 폰 차이이고 막혔던 케이스는 초록이다', () => {
    const 초록 = 판('P2', 200, [{ tcId: 'A', 상태: '초록', 오류: null }, { tcId: 'B', 상태: '초록', 오류: null }]);
    expect(프로시저판정(['A', 'B'], [빨강A, 초록], 0, [], [1])).toEqual({
      파일: { 상태: '폰차이', 빨간폰들: ['P1'], 오류: 'A: 검증 실패: 사진' },
      케이스: [['A', { 상태: '폰차이', 빨간폰들: ['P1'], 오류: '검증 실패: 사진' }], ['B', { 상태: '초록' }]],
    });
  });

  it('다시 볼 폰이 없으면 빨강 · 막힘으로 끝나고, 고친 뒤 판이 없으면 케이스마다 안돎이다', () => {
    expect(프로시저판정(['A', 'B'], [빨강A], 0, [], [1]).파일).toEqual({ 상태: '빨강', 오류: 'A: 검증 실패: 사진' });
    expect(프로시저판정(['A', 'B'], [빨강A], 500, [], [1])).toEqual({ 파일: { 상태: '안돎' }, 케이스: [['A', { 상태: '안돎' }], ['B', { 상태: '안돎' }]] });
  });

  it('판정 첨부가 없는 판(폰 연결에서 죽음)은 모든 케이스에 그 판의 상태를 쓴다', () => {
    const 죽음 = { ...판('P1', 100, undefined), 상태들: ['unexpected'], 오류: '세션을 못 열었다' };
    expect(프로시저판정(['A', 'B'], [죽음], 0, [], [1]).케이스).toEqual([['A', { 상태: '빨강', 오류: '세션을 못 열었다' }], ['B', { 상태: '빨강', 오류: '세션을 못 열었다' }]]);
  });

  it('보류 케이스 첨부만 남기고 죽었으면 첨부가 빠진 케이스는 그 판의 상태다 — 안 돈 케이스가 초록으로 끝나지 않는다', () => {
    const 반쯤 = { ...판('P1', 100, [{ tcId: 'H', 상태: '초록', 오류: null }]), 상태들: ['unexpected'], 오류: '앱이 꺼졌다' };
    expect(프로시저판정(['H', 'A'], [반쯤], 0, [], [1])).toEqual({
      파일: { 상태: '빨강', 오류: 'A: 앱이 꺼졌다' },
      케이스: [['H', { 상태: '초록' }], ['A', { 상태: '빨강', 오류: '앱이 꺼졌다' }]],
    });
  });
});

describe('끊긴프로시저들 — 한 번 부름의 끝에 끊긴 프로시저', () => {
  it('끊긴 뒤 끝까지 돈 판이 없으면 다음에 먼저, 혼자 돌고도 끊겼으면 못끝냄, 그 뒤 돈 판이 있거나 옛 꼴이면 빼고, 고치기 전 끊김은 안 본다', () => {
    const 끊김 = new Map([
      ['p/A.spec.ts', [{ 기록: 'a', 시작: 100, 혼자: false }]],
      ['p/B.spec.ts', [{ 기록: 'a', 시작: 100, 혼자: false }, { 기록: 'b', 시작: 200, 혼자: true }]],
      ['p/C.spec.ts', [{ 기록: 'a', 시작: 100, 혼자: false }]],
      ['p/D.spec.ts', [{ 기록: 'a', 시작: 100, 혼자: false }]],
      ['p/E.spec.ts', [{ 기록: 'a', 시작: 100, 혼자: false }]],
    ]);
    const 판들 = new Map([['p/C.spec.ts', [판('P1', 150, undefined)]]]);
    const 대상 = { 'p/A.spec.ts': 0, 'p/B.spec.ts': 0, 'p/C.spec.ts': 0, 'p/D.spec.ts': 0, 'p/E.spec.ts': 300 };
    expect(끊긴프로시저들(대상, 판들, 끊김, (f) => f !== 'p/D.spec.ts')).toEqual({ 먼저: new Set(['p/A.spec.ts']), 못끝냄: new Set(['p/B.spec.ts']) });
  });
});

describe('폰실행 · 폰끝검사 — 프로시저는 통째로 돌고 케이스로 센다', () => {
  it('빨간 케이스는 케이스 번호와 오류를, 막힌 케이스는 막은 케이스를 찍고, 끊긴 프로시저는 다음 부름에 혼자 돌아 또 끊기면 「한 번에 못 끝낸」으로 찍는다', async () => {
    const 트리 = mkdtempSync(join(tmpdir(), 'proc-run-'));
    자리들.push(트리);
    mkdirSync(join(트리, 'tests', 'g'), { recursive: true });
    const 본문 = 절차('글쓰기 화면을 연다') + 구간('본문없음', '본문을 비운다') + 구간('글자수초과', '본문에 501자를 넣는다') + 구간('게시확인', '게시를 누른다');
    writeFileSync(join(트리, 'tests', 'g', 'XQ-TP-001.spec.ts'), 프로시저글(본문));
    const 선언들 = 선언('본문없음', 'XQ-FN-201') + 선언('글자수초과', 'XQ-FN-202') + 선언('게시확인', 'XQ-FN-203');
    writeFileSync(join(트리, 'tests', 'g', 'XQ-TP-002.spec.ts'), 프로시저글(본문, { 선언들, procId: 'XQ-TP-002' }));
    const 결과폴더 = join(트리, 'gate3');
    mkdirSync(결과폴더);
    const 기준목록 = join(트리, 'base.z');
    writeFileSync(기준목록, '');
    const 말 = vi.spyOn(console, 'log').mockImplementation(() => {});
    // 가짜 Playwright — 001 은 늘 시간 상한에 끊기고, 002 는 202 가 틀려 203 이 막힌다. 받은 파일을 runs.txt 에 남긴다
    const 가짜 = join(트리, 'bin');
    mkdirSync(가짜);
    writeFileSync(
      join(가짜, 'pw.mjs'),
      `import { appendFileSync, writeFileSync } from 'node:fs';
const 파일들 = process.argv.slice(2).filter((a) => a.startsWith('tests/')).map((a) => a.slice(6));
appendFileSync(process.env.AUTHORING_GATE3_DIR + '/runs.txt', 파일들.join(',') + '\\n');
const 첨부 = (r) => ({ name: 'platform-case', contentType: 'application/json', body: Buffer.from(JSON.stringify(r)).toString('base64') });
const 시험 = (file) => file.endsWith('001.spec.ts')
  ? { projectName: 'android', status: 'skipped', results: [{ duration: 1000, status: 'interrupted' }] }
  : { projectName: 'android', status: 'unexpected', results: [{ duration: 1000, error: { message: '검증 실패: 글자 수 초과 안내가 보인다' }, attachments: [
      첨부({ tcId: 'XQ-FN-201', status: 'PASS', steps: [] }),
      첨부({ tcId: 'XQ-FN-202', status: 'FAIL', steps: [{ assertions: [{ statement: '글자 수 초과 안내가 보인다', status: 'FAIL' }] }] }),
      첨부({ tcId: 'XQ-FN-203', status: 'NA', error: { message: 'BLOCKED' }, blockedBy: 'XQ-FN-202', steps: [] }),
    ] }] };
writeFileSync(process.env.PLAYWRIGHT_JSON_OUTPUT_FILE, JSON.stringify({ config: {}, stats: { startTime: new Date().toISOString() }, suites: 파일들.map((file) => ({ file, specs: [{ tests: [시험(file)] }] })) }));
`,
    );
    writeFileSync(join(가짜, 'npx'), `#!/bin/sh\nshift\nshift\nexec node "${join(가짜, 'pw.mjs')}" "$@"\n`, { mode: 0o755 });
    mkdirSync(join(트리, '.appium-cli'));
    writeFileSync(join(트리, '.appium-cli', 'held'), 'R3CR10TCVCD\n');
    const 팜 = vi.fn(async (주소: string) => new Response(JSON.stringify({ value: { devices: 주소.includes('status=idle') ? [] : [{ serial: 'R3CR10TCVCD', state: 'OCCUPIED' }] } }), { status: 200 }));
    const env = {
      PATH: `${가짜}:${process.env.PATH ?? ''}`, AUTHORING_GATE3_DIR: 결과폴더, AUTHORING_BASE_LIST: 기준목록,
      PLATFORM_APPIUM_URL: 'http://farm.test/wd/hub', PLATFORM_APP: '/apk/g.apk', PLATFORM_BASE_URL: 'http://qa.g.test',
    };
    const 찍힌 = () => 말.mock.calls.map((c) => String(c[0])).join('\n');

    expect(await 폰실행('앱', 'g', 트리, env, 팜 as unknown as typeof fetch)).toBe(3);
    expect(찍힌()).toMatch(/앱 파일 2개\(프로시저 2개 · 케이스 6건\) 가운데 이번 2개/);
    expect(찍힌()).toMatch(/빨강 1건\n- g\/XQ-TP-002\.spec\.ts XQ-FN-202: 검증 실패: 글자 수 초과 안내가 보인다/);
    expect(찍힌()).toMatch(/막힘 1건 — 앞 케이스에 막혀 못 돌았다[^\n]*\n- g\/XQ-TP-002\.spec\.ts XQ-FN-203 \(XQ-FN-202 에 막힘\)/);
    expect(찍힌()).toMatch(/남은 것 1개 파일/);

    말.mockClear();
    expect(await 폰실행('앱', 'g', 트리, env, 팜 as unknown as typeof fetch)).toBe(1);
    expect(readFileSync(join(결과폴더, 'runs.txt'), 'utf8').trim().split('\n')).toEqual(['g/XQ-TP-001.spec.ts,g/XQ-TP-002.spec.ts', 'g/XQ-TP-001.spec.ts']);
    expect(찍힌()).toMatch(/끊긴 프로시저 1개 가운데 1개를 먼저 폰마다 하나씩 혼자 돌린다/);
    expect(찍힌()).toMatch(/한 번에 못 끝낸 프로시저 1개 — [^\n]*: g\/XQ-TP-001\.spec\.ts/);

    // 세 번째 부름은 못 끝낸 프로시저를 다시 안 돌린다
    expect(await 폰실행('앱', 'g', 트리, env, 팜 as unknown as typeof fetch)).toBe(1);
    expect(readFileSync(join(결과폴더, 'runs.txt'), 'utf8').trim().split('\n')).toHaveLength(2);

    expect(폰끝검사(결과폴더, 트리, 'g', ['tests/g/XQ-TP-001.spec.ts', 'tests/g/XQ-TP-002.spec.ts'], '앱')).toEqual([
      '**⚠️ 폰에서 돌려 보지 않은 앱 케이스 4개 / 이번에 닿은 6개(프로시저 2개)** — 정식 실행에서 처음 돈다 · g/XQ-TP-001.spec.ts XQ-FN-101 · g/XQ-TP-001.spec.ts XQ-FN-102 · g/XQ-TP-001.spec.ts XQ-FN-103 · g/XQ-TP-002.spec.ts XQ-FN-203(XQ-FN-202 에 막힘)',
      '⚠️ 앞 케이스에 막혀 폰에서 못 돌려 본 앱 케이스 1개 — g/XQ-TP-002.spec.ts XQ-FN-203(XQ-FN-202 에 막힘)',
      '⚠️ 폰에서 빨간 앱 케이스 1개 — g/XQ-TP-002.spec.ts XQ-FN-202',
    ]);
  });
});
