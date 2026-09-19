// JSX 단위 검사가 jsdom 지시자를 들고 있는지 글자로 본다. 빠뜨리면 죽는 자리가 node_modules 안이라 원인을 못 짚는다 (SPEC §9.1)

import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const 지시자 = '// @vitest-environment jsdom';
const 루트 = process.cwd();

function 훑기(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : 훑기(p);
    return e.name.endsWith('.test.tsx') ? [p] : [];
  });
}

// vitest include 가 apps·packages 두 뿌리를 집으므로 훑는 뿌리도 둘이어야 한다.
// 한쪽만 보면 반대쪽 .test.tsx 가 지시자 없이 들어와도 초록이다
const 검사파일 = ['apps', 'packages']
  .flatMap((뿌리) => 훑기(resolve(루트, 뿌리)))
  .map((p) => relative(루트, p))
  .sort();

describe('JSX 단위 검사의 실행 터', () => {
  // 한 건도 못 찾았는데 초록이면 이 검사 자체가 사각지대가 된다.
  // 글로브가 틀어지거나 폴더가 옮겨지면 여기서 먼저 걸린다
  it('.test.tsx 를 하나 이상 찾는다', () => {
    expect(검사파일.length).toBeGreaterThan(0);
  });

  it.each(검사파일)('%s 의 첫 줄이 jsdom 지시자다', (파일) => {
    expect(readFileSync(resolve(루트, 파일), 'utf8').split('\n')[0]).toBe(지시자);
  });
});
