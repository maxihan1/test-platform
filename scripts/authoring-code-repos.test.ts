import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { 코드저장소받기 } from './authoring-code-repos.js';

const 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들.splice(0)) rmSync(d, { recursive: true, force: true });
});

function 가짜깃(실패할이름: string): { env: NodeJS.ProcessEnv; 자료: string; 부른기록: string } {
  const 뿌리 = mkdtempSync(join(tmpdir(), 'code-repos-'));
  자리들.push(뿌리);
  const 빈 = join(뿌리, 'bin');
  mkdirSync(빈);
  const 부른기록 = join(뿌리, 'calls');
  writeFileSync(
    join(빈, 'git'),
    `#!/bin/sh\necho "$@" >> "${부른기록}"\nfor a; do last="$a"; done\ncase "$*" in *${실패할이름}*) echo "fatal: repository not found" >&2; exit 128;; esac\nmkdir -p "$last/.git" && echo x > "$last/README.md"\n`,
  );
  chmodSync(join(빈, 'git'), 0o755);
  const 자료 = join(뿌리, '자료');
  mkdirSync(자료);
  return { env: { ...process.env, PATH: `${빈}:${process.env.PATH ?? ''}` }, 자료, 부른기록 };
}

describe('코드저장소받기 — 게임 코드 저장소를 자료 폴더에 얕게 받는다 (도메인/작성 §3.6 「가이드와 게임 코드 맞춰 보기」)', () => {
  it('github 주소만 훅 없이 한 판 받고 .git 을 지운다 · 다른 주소와 못 받은 것은 까닭으로 남기고 계속 간다', async () => {
    const { env, 자료, 부른기록 } = 가짜깃('b/missing');
    const 받은것 = await 코드저장소받기(
      [
        { name: '게임', url: 'https://github.com/a/game' },
        { name: '로컬', url: 'file:///etc' },
        { name: '없음', url: 'https://github.com/b/missing' },
      ],
      자료,
      env,
    );

    const 폴더 = join(자료, 'code', '1-a__game');
    expect(받은것).toEqual([
      { 주소: 'https://github.com/a/game', 폴더 },
      { 주소: 'file:///etc', 까닭: 'github.com 주소가 아니라 받지 않았다' },
      { 주소: 'https://github.com/b/missing', 까닭: '못 받았다 — fatal: repository not found' },
    ]);
    expect(existsSync(join(폴더, 'README.md'))).toBe(true);
    expect(existsSync(join(폴더, '.git'))).toBe(false);
    expect(existsSync(join(자료, 'code', '3-b__missing'))).toBe(false);
    const 부름 = readFileSync(부른기록, 'utf8').trim().split('\n');
    expect(부름).toHaveLength(2);
    expect(부름[0]).toBe(`-c core.hooksPath=/dev/null clone -q --depth 1 --single-branch https://github.com/a/game ${폴더}`);
  });
});
