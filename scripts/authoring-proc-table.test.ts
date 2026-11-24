// 케이스 목록 문서의 프로시저 절 검사 — 읽기 · 프로시저 번호 채우기 · 절 검사 ①~⑤ · 꺼진 스위치 (작성 §3.6 「프로시저 절 · 프로시저 번호」)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { 구간, 선언, 프로시저글 } from '../apps/admin/src/catalog/procedure-fixture.js';
import { 절결과 } from './authoring-check.js';
import { 절검사, 절줄들, 절번호들, 프로시저번호채우기 } from './authoring-proc-table.js';

const 요구표 = (줄들: [string, string][]) =>
  ['## 요구사항', '', '| 요구 | 출처 | 축 | tcId |', '|---|---|---|---|', ...줄들.map(([출처, tcId], i) => `| ${String(i + 1)} | ${출처} | 정상 | ${tcId} |`)].join('\n');
const 절 = (줄들: [string, string][]) =>
  ['## 테스트 프로시저', '', '| 프로시저 | 흐름 | 케이스 |', '|---|---|---|', ...줄들.map(([번호, 케이스]) => `| ${번호} | 글쓰기 | ${케이스} |`)].join('\n');

describe('절줄들 · 프로시저번호채우기', () => {
  const 글 = `${요구표([])}\n\n${절([['', 'XQ-FN-101 → XQ-FN-102'], ['`XQ-TP-004`', 'XQ-FN-103'], ['', 'XQ-UI-104']])}\n`;

  it('케이스 칸의 번호를 차례대로 읽고 프로시저 번호의 꼬리는 케이스로 안 읽는다', () => {
    expect(절줄들(글).map((줄) => [줄.프로시저, 줄.케이스])).toEqual([
      ['', ['XQ-FN-101', 'XQ-FN-102']],
      ['XQ-TP-004', ['XQ-FN-103']],
      ['', ['XQ-UI-104']],
    ]);
    expect(절줄들('| 프로시저 | 흐름 | 케이스 |').length).toBe(0);
    expect(절줄들(절([['', 'XQ-TP-001 · XQ-FN-101']]))[0]!.케이스).toEqual(['XQ-FN-101']);
  });

  it('빈 칸에만 기준 · 지금 절에 쓰인 가장 큰 번호 다음부터 매기고 적힌 칸은 그대로 둔다', () => {
    const r = 프로시저번호채우기(글, 'XQ', ['XQ-TP-007', 'MTA-TP-050']);
    expect(r.매김).toEqual(['XQ-TP-008', 'XQ-TP-009']);
    expect(절번호들(r.글)).toEqual(['XQ-TP-008', 'XQ-TP-004', 'XQ-TP-009']);
    expect(r.글).toContain('| `XQ-TP-004` |');
    expect(프로시저번호채우기(글, 'XQ', []).매김).toEqual(['XQ-TP-005', 'XQ-TP-006']);
  });

  it('세 자리를 넘으면 그 줄은 비워 두고 어긋남이다', () => {
    const r = 프로시저번호채우기(글, 'XQ', ['XQ-TP-998']);
    expect(r.매김).toEqual(['XQ-TP-999']);
    expect(r.어긋남).toEqual(['프로시저 절 3번째 줄 — 프로시저 번호가 세 자리(999)를 넘는다']);
  });
});

describe('절검사', () => {
  const 경로 = 'tests/xq/XQ-TP-001.spec.ts';
  const 파일 = (글: string, 기준에있었나: boolean | null = false, 길 = 경로) => ({ 경로: 길, 글, 기준에있었나 });
  const 정상 = 프로시저글(구간('본문없음', '비운다') + 구간('글자수초과', '넘긴다') + 구간('게시확인', '누른다'));
  const 요구 = 요구표([['XQ-REQ-001', 'XQ-FN-101'], ['XQ-REQ-002', 'XQ-FN-102'], ['XQ-REQ-003', 'XQ-FN-103']]);
  const 옛꼴 = (tcId: string) => `import { defineCase, test, verify } from '@platform/kit';
export const spec = defineCase({ tcId: '${tcId}', name: '옛', platforms: ['android'], precondition: [], params: null, expected: null });
test(spec, async () => { await verify('옛', true, true); });
`;

  it('절과 파일이 맞으면 어긋남이 없다', () => {
    expect(절검사(`${요구}\n\n${절([['XQ-TP-001', 'XQ-FN-101 → XQ-FN-102 → XQ-FN-103']])}`, [파일(정상)], true)).toEqual([]);
  });

  it('스위치가 꺼졌으면 프로시저 파일을 쓴 것만 짚는다', () => {
    expect(절검사(요구, [파일(정상), 파일(옛꼴('XQ-FN-201'), false, 'tests/xq/XQ-FN-201.spec.ts')], false)).toEqual([
      `${경로} — 「프로시저 작성」이 꺼진 애플리케이션인데 프로시저 파일을 썼다. 케이스 하나를 파일 하나로 쓴다`,
    ]);
  });

  it('스위치를 끈 뒤에도 기준에 있던 프로시저 파일을 고친 것은 짚지 않는다', () => {
    expect(절검사(요구, [파일(정상, true)], false)).toEqual([]);
  });

  it('보류 표시가 같이 적힌 버튼 반응 줄도 같은 화면이면 한 줄에 둔다', () => {
    const 버튼 = 요구표([['XQ-REQ-001 · 버튼 반응 — 로그인', 'XQ-FN-101'], ['XQ-REQ-002 · 보류 — 값 없음 · 버튼 반응 — 로그인', 'XQ-FN-102'], ['XQ-REQ-003 · 버튼 반응 — 로그인', 'XQ-FN-103']]);
    expect(절검사(`${버튼}\n\n${절([['XQ-TP-001', 'XQ-FN-101 → XQ-FN-102 → XQ-FN-103']])}`, [파일(정상)], true).filter((l) => l.includes('버튼 반응'))).toEqual([]);
  });

  it('① 절에 없거나 두 줄에 든 케이스 · 새로 쓴 옛 꼴 케이스를 짚는다 — 기준에 있던 옛 꼴 · 게임 미션 · 모르는 기준은 뺀다', () => {
    const 틀림 = 절검사(
      `${요구}\n\n${절([['XQ-TP-001', 'XQ-FN-101 → XQ-FN-102'], ['XQ-TP-002', 'XQ-FN-102']])}`,
      [파일(정상), 파일(옛꼴('XQ-FN-201'), false, 'a.spec.ts'), 파일(옛꼴('XQ-FN-202'), true, 'b.spec.ts'), 파일(옛꼴('XQ-GS-001'), false, 'c.spec.ts'), 파일(옛꼴('XQ-FN-203'), null, 'd.spec.ts')],
      true,
    );
    expect(틀림).toContain('XQ-FN-201 — 새로 쓴 케이스를 옛 꼴 파일(a.spec.ts)로 썼다. 프로시저 파일에 넣고 절에 적는다');
    expect(틀림).toContain('XQ-FN-102 — 프로시저 절의 2줄에 든다. 케이스 하나는 절의 한 줄에만 적는다');
    expect(틀림).toContain('XQ-FN-103 — 프로시저 절의 어느 줄에도 없다. 케이스 하나는 절의 한 줄에만 적는다');
    expect(틀림.join('\n')).not.toMatch(/XQ-FN-202|XQ-GS-001|XQ-FN-203/);
  });

  it('③ 번호가 없거나 다르고 차례가 cases 와 다르면 짚는다', () => {
    expect(절검사(`${요구}\n\n${절([['', 'XQ-FN-101 → XQ-FN-102 → XQ-FN-103']])}`, [파일(정상)], true)).toEqual([
      `${경로} — 프로시저 절 1번째 줄에 프로시저 번호가 없다. npm run ledger:number 로 매긴다 — 칸 재료가 없다며 멈추면 절과 tests 폴더에 쓰인 가장 큰 번호 다음을 적는다`,
    ]);
    expect(절검사(`${요구}\n\n${절([['XQ-TP-009', 'XQ-FN-101 → XQ-FN-103 → XQ-FN-102']])}`, [파일(정상)], true)).toEqual([
      `${경로} — procId 가 XQ-TP-001 인데 절의 줄은 XQ-TP-009 다`,
      'XQ-TP-009 — 절의 차례(XQ-FN-101 → XQ-FN-103 → XQ-FN-102)가 파일의 cases 차례(XQ-FN-101 → XQ-FN-102 → XQ-FN-103)와 다르다',
    ]);
  });

  it('② 케이스가 10개를 넘는 줄을 짚는다', () => {
    const 열하나 = Array.from({ length: 11 }, (_, i) => `XQ-FN-${String(101 + i)}`);
    const 틀림 = 절검사(`${요구}\n\n${절([['XQ-TP-001', 열하나.join(' → ')]])}`, [파일(정상)], true);
    expect(틀림).toContain('XQ-TP-001 — 케이스가 11개다. 한 프로시저는 1개 이상 10개 이하다');
  });

  it('④ 버튼 반응은 같은 화면끼리만 · ⑤ 정식 케이스는 미확정 · 오류 추정 · 보류 뒤에 안 온다', () => {
    const 섞인 = 요구표([['XQ-REQ-001 · 버튼 반응 — 글쓰기', 'XQ-FN-101'], ['XQ-REQ-002 · 버튼 반응 — 설정', 'XQ-FN-102'], ['XQ-REQ-003', 'XQ-FN-103']]);
    expect(절검사(`${섞인}\n\n${절([['XQ-TP-001', 'XQ-FN-101 → XQ-FN-102 → XQ-FN-103']])}`, [파일(정상)], true)).toEqual([
      'XQ-TP-001 — 버튼 반응 케이스는 화면마다 따로 프로시저다. 한 줄에 섞였다 — 「글쓰기」 화면 · 「설정」 화면 · 버튼 반응이 아닌 케이스',
    ]);
    const 미확정앞 = 요구표([['XQ-REQ-001', 'XQ-FN-101'], ['XQ-REQ-002 · 화면 검사 — 글자 수', 'XQ-FN-102'], ['XQ-REQ-003', 'XQ-FN-103']]);
    expect(절검사(`${미확정앞}\n\n${절([['XQ-TP-001', 'XQ-FN-101 → XQ-FN-102 → XQ-FN-103']])}`, [파일(정상)], true)).toEqual([
      'XQ-TP-001 — 정식 케이스 XQ-FN-103 가 미확정 · 오류 추정 · 보류 케이스 XQ-FN-102 뒤에 온다. 정식 케이스를 앞으로 옮긴다',
    ]);
    // 보류는 케이스 선언의 held 로도 안다
    const 보류 = 프로시저글(구간('본문없음', '비운다') + 구간('글자수초과', '넘긴다') + 구간('게시확인', '누른다'), {
      선언들: 선언('본문없음', 'XQ-FN-101', `\n  held: '값이 없다',`) + 선언('글자수초과', 'XQ-FN-102') + 선언('게시확인', 'XQ-FN-103'),
    });
    expect(절검사(`${요구}\n\n${절([['XQ-TP-001', 'XQ-FN-101 → XQ-FN-102 → XQ-FN-103']])}`, [파일(보류)], true)).toEqual([
      'XQ-TP-001 — 정식 케이스 XQ-FN-102 · XQ-FN-103 가 미확정 · 오류 추정 · 보류 케이스 XQ-FN-101 뒤에 온다. 정식 케이스를 앞으로 옮긴다',
    ]);
  });
});

describe('절결과 — 빠른 검사 마지막 모드의 연결', () => {
  it('스위치(AUTHORING_PROCEDURE)를 켜면 바뀐 프로시저 파일을 절과 맞대고, 바뀐 파일을 모르면 경고만 · 끄고 걸린 것이 없으면 줄을 안 낸다', () => {
    const 트리 = mkdtempSync(join(tmpdir(), 'proc-table-'));
    try {
      mkdirSync(join(트리, 'tests', 'xq'), { recursive: true });
      mkdirSync(join(트리, 'docs', 'cases'), { recursive: true });
      writeFileSync(join(트리, 'tests', 'xq', 'XQ-TP-001.spec.ts'), 프로시저글(구간('본문없음', '비운다') + 구간('글자수초과', '넘긴다') + 구간('게시확인', '누른다')));
      writeFileSync(join(트리, 'docs', 'cases', 'XQ.md'), '## 테스트 프로시저\n\n| 프로시저 | 흐름 | 케이스 |\n|---|---|---|\n| XQ-TP-001 | 글쓰기 | XQ-FN-101 → XQ-FN-102 |\n');
      const 표 = join('docs', 'cases', 'XQ.md');
      const 바뀐 = ['tests/xq/XQ-TP-001.spec.ts'];
      const 켬 = 절결과(트리, 표, 'xq', 바뀐, { AUTHORING_PROCEDURE: '1' });
      expect(켬).toEqual([{ 이름: '프로시저 절', ok: false, 줄들: expect.arrayContaining(['XQ-FN-103 — 프로시저 절의 어느 줄에도 없다. 케이스 하나는 절의 한 줄에만 적는다']) as unknown }]);
      expect(절결과(트리, 표, 'xq', null, { AUTHORING_PROCEDURE: '1' })[0]).toMatchObject({ ok: true, 경고: true });
      expect(절결과(트리, 표, 'xq', null, {})).toEqual([]);
      expect(절결과(트리, 표, 'xq', [], {})).toEqual([]);
      expect(절결과(트리, 표, 'xq', 바뀐, {})[0]?.ok).toBe(false);
    } finally {
      rmSync(트리, { recursive: true, force: true });
    }
  });
});
