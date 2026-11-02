// 사이드바 로고 밑줄 CSS 검사 — 잘리지 않고, 움직이는 동안 그어졌다 사라진다 (2026-11-02 사용자 · 시안 「가」)
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const rail = readFileSync(new URL('./rail.css', import.meta.url), 'utf8');

/** 머리 그대로의 첫 규칙 블록. 못 찾으면 실패한다 — 빈 글자로 넘기면 아래 검사가 헛돈다 */
function 블록(머리: string): string {
  const i = rail.indexOf(`\n${머리} {`);
  expect(i, `${머리} 규칙이 rail.css 에 없다`).toBeGreaterThanOrEqual(0);
  return rail.slice(i, rail.indexOf('}', i));
}

function 밑줄움직임(): string {
  const i = rail.indexOf('@keyframes logo-line');
  expect(i).toBeGreaterThanOrEqual(0);
  return rail.slice(i, rail.indexOf('\n}', i));
}

describe('사이드바 로고 밑줄', () => {
  it('로고 칸은 넘침을 숨기지 않는다 — 숨기면 글자 아래 밑줄이 칸 밖이라 잘려 움직임이 안 보인다', () => {
    expect(블록('.side-logo')).not.toMatch(/overflow\s*:\s*hidden/);
  });

  it('움직이는 동안 밑줄이 끝까지 그어진 채 보이는 때가 있다', () => {
    expect(밑줄움직임()).toMatch(/transform:\s*scaleX\(1\);\s*opacity:\s*1/);
  });

  it('밑줄은 남지 않는다 — 움직임은 흐려지며 끝나고 멈춘 모습에는 밑줄이 없다', () => {
    expect(밑줄움직임()).toMatch(/100%\s*\{[^}]*opacity:\s*0/);
    expect(블록('.side-logo b::after')).toMatch(/transform\s*:\s*scaleX\(0\)/);
  });
});
