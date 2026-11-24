// 반영 때 겹침의 프로시저 몫 — 프로시저 파일 케이스마다 견주기 · 프로시저 번호 겹침 · 절 칸 바꾸기 (작성 §3.6 「★ 테스트 프로시저 작성」 「반영 때 겹침」)
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { 겹침 } from '../apps/admin/src/authoring/conflicts.js';
import { 겹침쓸것, 겹침판읽기 } from './authoring-conflicts-io.js';

// GIT_* 를 전부 뺀다 — pre-push 훅 안에서는 git 이 GIT_DIR 을 넣어 두어 이 저장소에 커밋한다 (HOOKS.md)
const 깨끗한환경 = Object.fromEntries(Object.entries(process.env).filter(([키]) => !키.startsWith('GIT_')));
const 자리들: string[] = [];

function 판() {
  const 트리 = mkdtempSync(join(tmpdir(), 'conflicts-io-'));
  자리들.push(트리);
  const 깃 = (인자: string[]) => {
    const r = spawnSync('git', ['-c', 'user.name=검사', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...인자], {
      cwd: 트리,
      encoding: 'utf8',
      env: 깨끗한환경,
    });
    return { ok: r.status === 0, 낸것: r.stdout, 까닭: r.stderr };
  };
  깃(['init', '-q', '-b', 'main']);
  const 쓰기 = (경로: string, 글: string) => {
    mkdirSync(dirname(join(트리, 경로)), { recursive: true });
    writeFileSync(join(트리, 경로), 글);
  };
  const 커밋 = (제목: string, 둘째?: string) => {
    깃(['add', '-A']);
    깃(['commit', '-q', '-m', 제목, ...(둘째 === undefined ? [] : ['-m', 둘째])]);
    return 깃(['rev-parse', 'HEAD']).낸것.trim();
  };
  return { 트리, 깃, 쓰기, 커밋 };
}

const 케이스 = (tcId: string, 이름: string) =>
  `import { defineCase } from '@platform/kit';\n\nexport const spec = defineCase({\n  tcId: '${tcId}',\n  name: '${이름}',\n  platforms: ['desktop'],\n});\n`;
const 머리 = '| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |\n|------|----|------|------|------|------|------|----------|';
const 줄 = (번호: number, 출처: string, tcId: string) => `| ${String(번호)} | 정상 | 전제 | 조작 | 결과 | ${출처} | ${tcId} | 2026-10-01 |`;
const 표 = (줄들: string[]) => ['# PAY', '', '## 요구사항', '', 머리, ...줄들, ''].join('\n');

const 프로시저 = (procId: string, 케이스들: [string, string][]) =>
  [
    "import { defineCase, defineProcedure, test, verify } from '@platform/kit';",
    '',
    ...케이스들.map(([id, 이름], i) => `const c${String(i)} = defineCase({ tcId: '${id}', name: '${이름}', platforms: ['android'] });`),
    `export const procedure = defineProcedure({ procId: '${procId}', name: '흐름', platforms: ['android'], cases: [${케이스들.map((_, i) => `c${String(i)}`).join(', ')}] });`,
    'test(procedure, async () => {',
    ...케이스들.map((_, i) => `  await test.case(c${String(i)}, async () => { await verify('본다 ${String(i)}', () => true); });`),
    '});',
    '',
  ].join('\n');
const 절 = (줄들: [string, string][]) => ['## 테스트 프로시저', '', '| 프로시저 | 흐름 | 케이스 |', '|---|---|---|', ...줄들.map(([번호, 케이스]) => `| ${번호} | 흐름 | ${케이스} |`), ''].join('\n');

afterEach(() => {
  for (const 자리 of 자리들.splice(0)) rmSync(자리, { recursive: true, force: true });
});

describe('겹침판 읽기 — 프로시저', () => {
  it('프로시저 파일은 케이스마다 견주고, 새로 더한 프로시저 번호가 main 에도 있으면 프로시저 겹침으로 낸다', () => {
    const g = 판();
    g.쓰기('tests/pay/PAY-001.spec.ts', 케이스('PAY-001', '첫 케이스'));
    g.쓰기('docs/cases/PAY.md', 표([줄(1, '9 REQ-1', 'PAY-001')]));
    g.커밋('바탕');
    g.깃(['checkout', '-q', '-b', 'req']);
    g.쓰기('tests/pay/PAY-TP-001.spec.ts', 프로시저('PAY-TP-001', [['PAY-FN-101', '글쓰기'], ['PAY-FN-102', '사진 붙이기']]));
    g.쓰기('docs/cases/PAY.md', `${표([줄(1, '9 REQ-1', 'PAY-001'), 줄(2, '9 REQ-2', 'PAY-FN-101'), 줄(3, '9 REQ-3', 'PAY-FN-102')])}\n${절([['PAY-TP-001', 'PAY-FN-101 → PAY-FN-102']])}`);
    const 머리커밋 = g.커밋('[WS-작성] PAY 작성 요청 7번 케이스');
    g.깃(['checkout', '-q', 'main']);
    g.쓰기('tests/pay/PAY-TP-001.spec.ts', 프로시저('PAY-TP-001', [['PAY-FN-102', '먼저 들어온 결제']]));
    g.쓰기('docs/cases/PAY.md', `${표([줄(1, '9 REQ-1', 'PAY-001'), 줄(2, '8 REQ-8', 'PAY-FN-102')])}\n${절([['PAY-TP-001', 'PAY-FN-102']])}`);
    const mainSha = g.커밋('main');
    const 결과 = 겹침판읽기(g.깃, { 머리: 머리커밋, mainSha, 폴더: 'pay', 표경로: 'docs/cases/PAY.md', 뺀것: new Set() });
    if ('사유' in 결과) throw new Error(결과.사유);
    expect(결과.겹침.map((c: 겹침) => [c.tcId, c.name, c.file, c.kinds])).toEqual([['PAY-FN-102', '사진 붙이기', 'tests/pay/PAY-TP-001.spec.ts', ['TCID']]]);
    expect(결과.프로시저겹침).toEqual(['tests/pay/PAY-TP-001.spec.ts']);
    expect([...결과.쓴프로시저]).toEqual(['PAY-TP-001']);
    expect([...결과.쓴번호].sort()).toEqual(['PAY-001', 'PAY-FN-101', 'PAY-FN-102']);
    const 다뺌 = 겹침판읽기(g.깃, { 머리: 머리커밋, mainSha, 폴더: 'pay', 표경로: 'docs/cases/PAY.md', 뺀것: new Set(['PAY-FN-101', 'PAY-FN-102']) });
    if ('사유' in 다뺌) throw new Error(다뺌.사유);
    expect(다뺌.프로시저겹침).toEqual([]);
  });
});

describe('고른 대로 바꿀 것 — 프로시저', () => {
  it('케이스 번호는 그 선언 · 표 · 절 칸에서, 프로시저 번호는 파일 이름 · procId · 절에서 바꾸고 처리줄에 둘 다 적는다', () => {
    const { 트리, 쓰기 } = 판();
    쓰기('tests/pay/PAY-TP-001.spec.ts', 프로시저('PAY-TP-001', [['PAY-FN-101', '글쓰기'], ['PAY-FN-102', '사진 붙이기']]));
    쓰기('docs/cases/PAY.md', `${표([줄(1, 'REQ-2', 'PAY-FN-101'), 줄(2, 'REQ-3', 'PAY-FN-102')])}\n${절([['PAY-TP-001', 'PAY-FN-101 → PAY-FN-102']])}`);
    const r = 겹침쓸것(
      트리,
      'PAY',
      {
        자식커밋: 'a',
        mainSha: 'b',
        합칠까: true,
        겹침: [{ tcId: 'PAY-FN-102', name: '사진 붙이기', file: 'tests/pay/PAY-TP-001.spec.ts', kinds: ['TCID'], with: [] }],
        쓴번호: new Set(['PAY-FN-101', 'PAY-FN-102']),
        프로시저겹침: ['tests/pay/PAY-TP-001.spec.ts'],
        쓴프로시저: new Set(['PAY-TP-001', 'PAY-TP-004']),
      },
      [{ tcId: 'PAY-FN-102', action: 'KEEP' }],
    );
    if ('사유' in r) throw new Error(r.사유);
    expect(r.바뀐것).toEqual([{ 옛: 'PAY-FN-102', 새: 'PAY-FN-103' }]);
    expect(r.처리줄).toBe('겹침 처리: PAY-FN-102 → PAY-FN-103 · PAY-TP-001 → PAY-TP-005');
    expect(r.지우기).toEqual(['tests/pay/PAY-TP-001.spec.ts']);
    const 새글 = r.쓰기.get('tests/pay/PAY-TP-005.spec.ts') ?? '';
    expect(새글).toContain("procId: 'PAY-TP-005'");
    expect(새글).toContain("tcId: 'PAY-FN-101'");
    expect(새글).toContain("tcId: 'PAY-FN-103'");
    expect(r.쓰기.get('docs/cases/PAY.md')).toContain('| PAY-TP-005 | 흐름 | PAY-FN-101 → PAY-FN-103 |');
  });
});
