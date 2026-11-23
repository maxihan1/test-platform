// 게임 화면 파일 열쇠의 무늬(`:n` · `game:*`)가 찾은 화면을 덮는지 본다 (도메인/작성 §3.6 「세는 방식」)

import { describe, expect, it } from 'vitest';

import { 틀닿나, 틀케이스 } from './authoring-crawl-rules.js';

describe('게임 화면 열쇠 무늬 — 케이스 주소가 표시한 자리만 넓게 본다', () => {
  it('이름 안 :n 은 그 자리 숫자 아무거나와 맞는다 — 던전마다 바뀌는 번호', () => {
    const 파일 = new Set(['game:BossRoom/PlayerAvatar:n/AvatarGraphics:n/fx_TankAttack1(Clone)']);
    expect(틀닿나('game:BossRoom/PlayerAvatar69/AvatarGraphics69/fx_TankAttack1(Clone)', 파일)).toBe(true);
    expect(틀닿나('game:BossRoom/PlayerAvatar7/AvatarGraphics37/fx_TankAttack1(Clone)', 파일)).toBe(true);
    expect(틀닿나('game:BossRoom/PlayerAvatar/AvatarGraphics69/fx_TankAttack1(Clone)', 파일)).toBe(false);
    expect(틀닿나('game:CharSelect/PlayerAvatar69/AvatarGraphics69/fx_TankAttack1(Clone)', 파일)).toBe(false);
    expect(틀닿나('game:BossRoom/PlayerAvatar69/AvatarGraphics69/fx_TankSkill1(Clone)', 파일)).toBe(false);
  });

  it('장면 자리 * 는 어느 장면의 같은 경로든 덮는다 — 장면이 바뀌어도 같은 Showcase HUD 창', () => {
    const 파일 = new Set(['game:*/Showcase HUD/Window 상점']);
    expect(틀닿나('game:BossRoom/Showcase HUD/Window 상점', 파일)).toBe(true);
    expect(틀닿나('game:CharSelect/Showcase HUD/Window 상점', 파일)).toBe(true);
    expect(틀닿나('game:BossRoom/Showcase HUD/Window 상점/Panel 상점', 파일)).toBe(false);
    expect(틀닿나('game:BossRoom/Showcase HUD/Window 가방', 파일)).toBe(false);
  });

  it('표시가 없으면 지금처럼 글자가 같아야 한다 — Window 1 이 Window 2 를 덮지 않고 장면도 같아야 한다', () => {
    expect(틀닿나('game:CharSelect/Showcase HUD/Window 2', new Set(['game:CharSelect/Showcase HUD/Window 1']))).toBe(false);
    expect(틀닿나('game:BossRoom/Showcase HUD/Window 상점', new Set(['game:CharSelect/Showcase HUD/Window 상점']))).toBe(false);
    expect(틀닿나('game:CharSelect/Showcase HUD/Window 상점', new Set(['game:CharSelect/Showcase HUD/Window 상점']))).toBe(true);
  });

  it('장면 첫 화면 · 장소 · 뒤에 글자가 붙은 :n 은 무늬로 읽지 않는다', () => {
    expect(틀닿나('game:BossRoom', new Set(['game:*']))).toBe(false);
    expect(틀닿나('game:World/zone:Town', new Set(['game:*/zone:Town']))).toBe(false);
    expect(틀닿나('game:World/zone:3', new Set(['game:World/zone:n']))).toBe(false);
    expect(틀닿나('game:World/Gate:north', new Set(['game:World/Gate:north']))).toBe(true);
    expect(틀닿나('game:World/Gate:5orth', new Set(['game:World/Gate:north']))).toBe(false);
    expect(틀닿나('game:nightmare/Canvas', new Set(['game:nightmare/Canvas']))).toBe(true);
    expect(틀닿나('game:nx/Canvas', new Set(['game:n/Canvas']))).toBe(false);
  });

  it('틀케이스 — 무늬가 덮는 화면 파일 틀의 케이스도 모은다', () => {
    const 지도 = new Map([
      ['game:*/Showcase HUD/Window 상점', ['BRM-FN-010']],
      ['game:BossRoom/Showcase HUD/Window 상점', ['BRM-FN-011']],
      ['game:BossRoom/PlayerAvatar:n/AvatarGraphics:n/fx_TankAttack1(Clone)', ['BRM-FN-020']],
    ]);
    expect(틀케이스('game:BossRoom/Showcase HUD/Window 상점', 지도)).toEqual(['BRM-FN-010', 'BRM-FN-011']);
    expect(틀케이스('game:CharSelect/Showcase HUD/Window 상점', 지도)).toEqual(['BRM-FN-010']);
    expect(틀케이스('game:BossRoom/PlayerAvatar69/AvatarGraphics69/fx_TankAttack1(Clone)', 지도)).toEqual(['BRM-FN-020']);
    expect(틀케이스('game:BossRoom/Showcase HUD/Window 가방', 지도)).toBeUndefined();
  });
});
