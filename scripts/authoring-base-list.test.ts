// 바뀐 파일 고르기 검사 — 사본 트리에는 .git 이 없고 자식은 bare git 을 못 읽는다 (리뷰 M19 · 작성 §3.6 「돌려 보기 명령」)
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 기준목록이름, 바뀐것 } from './authoring-base-list.js';

let 뿌리 = '';
beforeEach(() => {
  뿌리 = mkdtempSync(join(tmpdir(), 'base-list-'));
});
afterEach(() => rmSync(뿌리, { recursive: true, force: true }));

describe('바뀐것 — 에이전트가 둔 기준 tests 목록과 견준다', () => {
  it('git 이 세는 것과 같은 파일을 고른다 — 고친 · 지운 · 새 파일 · 실행 권한만 바꾼 파일, 같은 글로 다시 쓴 파일과 tests 밖은 뺀다', () => {
    const git = join(뿌리, 'git');
    const 트리 = join(뿌리, 'tree');
    const 깃 = (...인자: string[]) =>
      execFileSync('git', [`--git-dir=${git}`, `--work-tree=${트리}`, '-c', 'core.hooksPath=/dev/null', '-c', 'core.quotePath=false', ...인자], { encoding: 'utf8' });
    execFileSync('git', ['init', '-q', '--bare', git]);
    mkdirSync(join(트리, 'tests', 'shop'), { recursive: true });
    for (const [f, 글] of [['tests/shop/고침.spec.ts', 'a'], ['tests/shop/지움.spec.ts', 'b'], ['tests/shop/그대로.ts', 'c'], ['tests/shop/권한.ts', 'x'], ['README.md', 'r']]) writeFileSync(join(트리, f), 글);
    symlinkSync('그대로.ts', join(트리, 'tests', 'shop', '링크.ts'));
    깃('add', '-A');
    깃('-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', '기준');
    const 목록 = join(뿌리, 기준목록이름);
    writeFileSync(목록, 깃('ls-tree', '-r', '-z', 'HEAD', '--', 'tests'));

    writeFileSync(join(트리, 'tests', 'shop', '고침.spec.ts'), 'a2');
    writeFileSync(join(트리, 'tests', 'shop', '그대로.ts'), 'c');
    chmodSync(join(트리, 'tests', 'shop', '권한.ts'), 0o755);
    rmSync(join(트리, 'tests', 'shop', '지움.spec.ts'));
    writeFileSync(join(트리, 'tests', 'shop', '새것.spec.ts'), 'n');
    writeFileSync(join(트리, 'README.md'), 'r2');
    const git이센것 = [...깃('diff', '--name-only', 'HEAD').split('\n'), ...깃('ls-files', '--others', '--exclude-standard').split('\n')]
      .filter((f) => f.startsWith('tests/'))
      .sort();

    expect(git이센것).toEqual(['tests/shop/고침.spec.ts', 'tests/shop/권한.ts', 'tests/shop/새것.spec.ts', 'tests/shop/지움.spec.ts']);
    expect(바뀐것(트리, 목록)).toEqual(git이센것);
  });

  it('기준 목록을 못 읽으면 까닭을 낸다 — 바뀐 것이 없다고 넘어가지 않게', () => {
    expect(바뀐것(뿌리, join(뿌리, 기준목록이름))).toHaveProperty('까닭');
  });
});
