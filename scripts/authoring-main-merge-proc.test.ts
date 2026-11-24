// main 합치기의 프로시저 절 몫 — 임시 git 저장소로 실제 합치기를 돌려 본다 (작성 §3.6 「★ 테스트 프로시저 작성」 「프로시저 번호 겹침 · 절 합치기」)
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { main합치기 } from './authoring-main-merge.js';
import type { 부품합치기 } from './authoring-po-merge.js';

// GIT_* 를 전부 뺀다 — pre-push 훅 안에서는 git 이 GIT_DIR 을 넣어 두어 이 저장소에 커밋한다 (HOOKS.md)
const 깨끗한환경 = Object.fromEntries(Object.entries(process.env).filter(([키]) => !키.startsWith('GIT_')));
const 자리들: string[] = [];

function 판(): { 트리: string; 깃: (인자: string[]) => { ok: boolean; 낸것: string; 까닭?: string } } {
  const 트리 = mkdtempSync(join(tmpdir(), 'main-merge-'));
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
  return { 트리, 깃 };
}

function 쓰기(트리: string, 경로: string, 글: string): void {
  mkdirSync(dirname(join(트리, 경로)), { recursive: true });
  writeFileSync(join(트리, 경로), 글);
}

const 케이스 = (tcId: string, 이름: string) =>
  `import { defineCase } from '@platform/kit';\n\nexport const spec = defineCase({\n  tcId: '${tcId}',\n  name: '${이름}',\n  platforms: ['desktop'],\n});\n`;
const 머리 = '| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |\n|------|----|------|------|------|------|------|----------|';
const 줄 = (번호: number, tcId: string) => `| ${String(번호)} | 정상 | 전제 | 조작 | 결과 | 9 REQ-PAY-${tcId.slice(-3)} | ${tcId} | 2026-10-01 |`;
const 표 = (덮는: string, 줄들: string[]) => ['# PAY — 결제', '', `**덮는 범위** — ${덮는}`, '', '## 요구사항', '', 머리, ...줄들, ''].join('\n');

/** 바탕 → 요청 브랜치(req)와 main 을 갈라 놓는다. 끝에 req 를 꺼내 둔다 */
function 갈라놓기(요청: (트리: string) => void, main: (트리: string) => void, 바탕?: (트리: string) => void) {
  const { 트리, 깃 } = 판();
  if (바탕 === undefined) {
    쓰기(트리, 'tests/pay/PAY-001.spec.ts', 케이스('PAY-001', '첫 케이스'));
    쓰기(트리, 'docs/cases/PAY.md', 표('바탕', [줄(1, 'PAY-001')]));
  } else 바탕(트리);
  쓰기(트리, 'README.md', '바탕\n');
  깃(['add', '-A']);
  깃(['commit', '-q', '-m', '바탕']);
  깃(['checkout', '-q', '-b', 'req']);
  요청(트리);
  깃(['add', '-A']);
  깃(['commit', '-q', '-m', '요청']);
  깃(['checkout', '-q', 'main']);
  main(트리);
  깃(['add', '-A']);
  깃(['commit', '-q', '-m', 'main']);
  const mainSha = 깃(['rev-parse', 'HEAD']).낸것.trim();
  깃(['checkout', '-q', 'req']);
  return { 트리, 깃, mainSha };
}

// Page Object 가 안 겹치는 합치기는 AI 를 부르지 않는다 — 부르면 실패로 드러난다
const 안부름: 부품합치기 = async () => ({ 사유: '부르면 안 된다' });
const 판값 = { 표경로: 'docs/cases/PAY.md', 폴더: 'pay', 메시지: '[WS-작성] PAY 작성 요청 7번 케이스', 부품합치기: 안부름 };

afterEach(() => {
  for (const 자리 of 자리들.splice(0)) rmSync(자리, { recursive: true, force: true });
});

describe('프로시저 절', () => {
  const 절 = (줄들: string[]) => ['## 테스트 프로시저', '', '| 프로시저 | 흐름 | 케이스 |', '|---|---|---|', ...줄들, ''].join('\n');
  const 프로시저 = (procId: string, 앞: string, 뒤: string) =>
    [
      `const 가 = defineCase({ tcId: '${앞}', name: '가' });`,
      `const 나 = defineCase({ tcId: '${뒤}', name: '나' });`,
      `export const procedure = defineProcedure({ procId: '${procId}', cases: [가, 나] });`,
      'test(procedure, async () => { await test.case(가, async () => {}); await test.case(나, async () => {}); });',
      '',
    ].join('\n');
  const 바탕줄 = '| PAY-TP-001 | 바탕 흐름 | PAY-001 |';
  const 요청 = (바탕절: string[]) => (t: string) => {
    쓰기(t, 'tests/pay/PAY-TP-002.spec.ts', 프로시저('PAY-TP-002', 'PAY-002', 'PAY-004'));
    쓰기(t, 'docs/cases/PAY.md', `${표('요청 셈', [줄(1, 'PAY-001'), 줄(2, 'PAY-002'), 줄(3, 'PAY-004')])}\n${절([...바탕절, '| PAY-TP-002 | 요청 흐름 | PAY-002 → PAY-004 |'])}`);
  };
  const main = (바탕절: string[]) => (t: string) => {
    쓰기(t, 'tests/pay/PAY-TP-003.spec.ts', 프로시저('PAY-TP-003', 'PAY-003', 'PAY-005'));
    쓰기(t, 'docs/cases/PAY.md', `${표('main 셈', [줄(1, 'PAY-001'), 줄(2, 'PAY-003'), 줄(3, 'PAY-005')])}\n${절([...바탕절, '| PAY-TP-003 | main 흐름 | PAY-003 → PAY-005 |'])}`);
  };

  it('두 요청이 절 끝에 줄을 더하면 main 줄 → 이 요청 줄로 잇고 요구사항 표 줄은 표에 남는다', async () => {
    const { 트리, 깃, mainSha } = 갈라놓기(요청([바탕줄]), main([바탕줄]), (t) => {
      쓰기(t, 'tests/pay/PAY-001.spec.ts', 케이스('PAY-001', '첫 케이스'));
      쓰기(t, 'docs/cases/PAY.md', `${표('바탕', [줄(1, 'PAY-001')])}\n${절([바탕줄])}`);
    });
    expect(await main합치기({ 트리, 깃, mainSha, ...판값 })).toEqual({ 합침: true });
    const 합친 = readFileSync(join(트리, 'docs/cases/PAY.md'), 'utf8');
    expect(합친).toContain(`${바탕줄}\n| PAY-TP-003 | main 흐름 | PAY-003 → PAY-005 |\n| PAY-TP-002 | 요청 흐름 | PAY-002 → PAY-004 |`);
    expect(합친.split('## 테스트 프로시저')[0]).toContain(줄(2, 'PAY-002').replace('| 2 |', '| 4 |'));
  });

  it('두 요청이 절을 각자 처음 만들었으면 합치지 않는다 — 한 덩이로 섞여 요구 줄이 절 밑에 들어간다', async () => {
    const { 트리, 깃, mainSha } = 갈라놓기(요청([]), main([]));
    const 머리전 = 깃(['rev-parse', 'HEAD']).낸것;
    expect(await main합치기({ 트리, 깃, mainSha, ...판값 })).toEqual({ 사유: expect.stringContaining('## 테스트 프로시저') });
    expect(깃(['rev-parse', 'HEAD']).낸것).toBe(머리전);
    expect(readFileSync(join(트리, 'docs/cases/PAY.md'), 'utf8')).not.toContain('main 흐름');
  });
});
