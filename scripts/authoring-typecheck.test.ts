// 작성 관문 타입 검사 범위 — 앱 폴더만 보는 tsconfig 와 그 tsc 가 실제로 남의 앱을 안 읽는지
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 앱tsc인자 } from './authoring-typecheck.js';

const 치울것: string[] = [];
afterEach(() => {
  for (const d of 치울것.splice(0)) rmSync(d, { recursive: true, force: true });
});

function 트리만들기(): string {
  const 트리 = mkdtempSync(join(tmpdir(), 'tc-tree-'));
  치울것.push(트리);
  writeFileSync(join(트리, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, skipLibCheck: true, types: [] }, include: ['tests/**/*.ts', 'packages/**/*.ts'] }));
  mkdirSync(join(트리, 'tests', 'aaa', 'helpers'), { recursive: true });
  mkdirSync(join(트리, 'tests', 'bbb'), { recursive: true });
  mkdirSync(join(트리, 'tests', 'ccc'), { recursive: true });
  mkdirSync(join(트리, 'packages', 'kit', 'src'), { recursive: true });
  writeFileSync(join(트리, 'packages', 'kit', 'src', 'index.ts'), 'export const 키트: string = "kit";\n');
  writeFileSync(join(트리, 'tests', 'aaa', 'helpers', 'h.ts'), 'export const 하나: number = 1;\n');
  writeFileSync(join(트리, 'tests', 'aaa', 'a.spec.ts'), "import { 하나 } from './helpers/h';\nexport const 둘: number = 하나 + 1;\n");
  // 남의 앱의 타입 오류 — 앱 범위 검사는 이것을 안 읽어야 한다
  writeFileSync(join(트리, 'tests', 'bbb', 'b.spec.ts'), "export const 틀림: number = 'x';\n");
  return 트리;
}

describe('앱tsc인자', () => {
  it('저장소 tsconfig 를 물려받고 그 앱 폴더와 kit 입구만 담는 tsconfig 를 자리 안 새 폴더에 만든다', async () => {
    const 트리 = 트리만들기();
    const 자리 = join(트리, '임시');
    const 인자 = 앱tsc인자(트리, 자리, 'aaa');
    expect(인자.slice(0, 3)).toEqual(['tsc', '--noEmit', '-p']);
    expect(인자[3]?.startsWith(자리)).toBe(true);
    const 설정 = (await import(인자[3] as string, { with: { type: 'json' } })) as { default: unknown };
    expect(설정.default).toEqual({ extends: join(트리, 'tsconfig.json'), include: [join(트리, 'tests', 'aaa'), join(트리, 'packages', 'kit', 'src', 'index.ts')] });
  });

  it('tsconfig 를 담은 폴더는 남도 읽을 수 있다 — 관문은 자식 uid 로 tsc 를 돌린다', () => {
    const 트리 = 트리만들기();
    const 인자 = 앱tsc인자(트리, join(트리, '임시'), 'aaa');
    expect(statSync(dirname(인자[3] as string)).mode & 0o005).toBe(0o005);
    expect(statSync(인자[3] as string).mode & 0o004).toBe(0o004);
  });

  it('그 앱은 통과하고 오류가 있는 남의 앱은 안 읽는다 · 그 앱에 오류가 있으면 잡는다 · 빈 폴더는 통과한다', () => {
    const 트리 = 트리만들기();
    const tsc = (폴더: string) => spawnSync('npx', ['--no-install', ...앱tsc인자(트리, join(트리, '임시'), 폴더)], { cwd: process.cwd(), encoding: 'utf8' });
    expect(tsc('aaa').status).toBe(0);
    const 남 = tsc('bbb');
    expect(남.status).not.toBe(0);
    expect(남.stdout).toContain('bbb/b.spec.ts');
    // 마지막 케이스를 지워 빈 폴더여도 「입력 없음」으로 실패하지 않는다
    expect(tsc('ccc').status).toBe(0);
  }, 60_000);
});
