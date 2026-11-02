// 사이드바 로고 밑줄 CSS 검사 — 잘리거나 사라지지 않게 (2026-11-02 사용자 「밑줄은 어디갔어」)
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const rail = readFileSync(new URL('./rail.css', import.meta.url), 'utf8');

/** 머리 그대로의 첫 규칙 블록. 못 찾으면 실패한다 — 빈 글자로 넘기면 아래 검사가 헛돈다 */
function 블록(머리: string): string {
  const i = rail.indexOf(`\n${머리} {`);
  expect(i, `${머리} 규칙이 rail.css 에 없다`).toBeGreaterThanOrEqual(0);
  return rail.slice(i, rail.indexOf('}', i));
}

describe('사이드바 로고 밑줄', () => {
  it('로고 칸은 넘침을 숨기지 않는다 — 숨기면 글자 아래 밑줄이 칸 밖이라 잘린다', () => {
    expect(블록('.side-logo')).not.toMatch(/overflow\s*:\s*hidden/);
  });

  it('밑줄 움직임은 그어진 채 끝난다 — 투명해지며 사라지지 않는다', () => {
    const i = rail.indexOf('@keyframes logo-line');
    expect(i).toBeGreaterThanOrEqual(0);
    const 움직임 = rail.slice(i, rail.indexOf('\n}', i));
    expect(움직임).toMatch(/to\s*\{\s*transform:\s*scaleX\(1\)/);
    expect(움직임).not.toMatch(/opacity/);
  });

  it('밑줄의 멈춘 모습은 보이는 상태다 — 움직임 줄이기를 켜도 보인다', () => {
    const 멈춘밑줄 = 블록('.side-logo b::after');
    expect(멈춘밑줄).toMatch(/height\s*:\s*[1-9]/);
    expect(멈춘밑줄).not.toMatch(/scaleX?\(\s*0(\.0+)?\s*[,)]/);
    expect(멈춘밑줄).not.toMatch(/opacity\s*:\s*0(\.0+)?\s*;/);
    expect(멈춘밑줄).not.toMatch(/(^|[^-])width\s*:\s*0/);
  });
});
