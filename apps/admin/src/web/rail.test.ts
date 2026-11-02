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

/** logo-line 움직임의 장면들 — [자리(%), 속성 글] */
function 밑줄장면들(): [number, string][] {
  const i = rail.indexOf('@keyframes logo-line');
  expect(i).toBeGreaterThanOrEqual(0);
  const 몸 = rail.slice(i, rail.indexOf('\n}', i));
  const 장면 = [...몸.matchAll(/(\d+)%\s*\{([^}]*)\}/g)].map((m) => [Number(m[1]), m[2]!] as [number, string]);
  expect(장면.length).toBeGreaterThan(1);
  return 장면;
}

describe('사이드바 로고 밑줄', () => {
  it('로고 칸은 넘침을 숨기지 않는다 — 숨기면 글자 아래 밑줄이 칸 밖이라 잘려 움직임이 안 보인다', () => {
    expect(블록('.side-logo')).not.toMatch(/overflow\s*:\s*hidden/);
  });

  it('움직이는 도중에 밑줄이 끝까지 그어진 채 또렷하게 보이는 장면이 있다', () => {
    const 보임 = 밑줄장면들().some(([자리, 글]) => 자리 > 0 && 자리 < 100 && /scaleX\(1\)/.test(글) && /opacity\s*:\s*1\s*;/.test(글));
    expect(보임).toBe(true);
  });

  it('밑줄은 남지 않는다 — 마지막 장면은 완전히 투명하고, 멈춘 모습(움직임 줄이기 포함)에는 밑줄이 없다', () => {
    const 끝 = 밑줄장면들().find(([자리]) => 자리 === 100);
    expect(끝?.[1]).toMatch(/opacity\s*:\s*0\s*;/);
    expect(블록('.side-logo b::after')).toMatch(/transform\s*:\s*scaleX\(0\)/);
  });
});
