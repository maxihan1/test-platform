// 게임 화면 파일 열쇠의 무늬(`:n` · `game:*`)가 찾은 화면을 덮는지 본다 (도메인/작성 §3.6 「세는 방식」)

import { describe, expect, it } from 'vitest';

import { 틀닿나, 틀케이스 } from './authoring-crawl-rules.js';
import { 여는주소들 } from '../apps/admin/src/catalog/screenMap.js';
import { 찾은화면에닿나 } from './authoring-game-key.js';

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
    expect(틀닿나('game:Lobby/Rank1위', new Set(['game:Lobby/Rank:n위']))).toBe(false);
    expect(틀닿나('game:Lobby/Rank:n위', new Set(['game:Lobby/Rank:n위']))).toBe(true);
  });

  it('장면 자리가 * 인 화면 파일의 요소 주소도 * 로 이어 어느 장면이든 덮는다 — 그 창 안 요소라서', () => {
    const 글 = [
      'export class 상점창 {',
      "  static readonly 주소 = 'game:*/Showcase HUD/Window 상점';",
      "  static readonly 사기 = '/Showcase HUD/Window 상점/Panel 상점/Button 사기';",
      '}',
    ].join('\n');
    const 여는 = 여는주소들(글);
    expect(여는).toEqual(['game:*/Showcase HUD/Window 상점/Panel 상점/Button 사기']);
    expect(틀닿나('game:BossRoom/Showcase HUD/Window 상점/Panel 상점/Button 사기', new Set(여는))).toBe(true);
    expect(틀닿나('game:BossRoom/Showcase HUD/Window 상점/Panel 상점/Button 팔기', new Set(여는))).toBe(false);
  });

  it('앱 열쇠는 무늬를 안 탄다 — 게임 무늬 틀이 있어도 글자가 같아야 한다', () => {
    expect(틀닿나('app:.Main/홈', new Set(['game:*/홈', 'app:.Main/설정']))).toBe(false);
  });

  it('찾은화면에닿나 — 호환성이 게임 여는 주소(무늬일 수 있다)를 화면으로 셀지 가른다', () => {
    const 찾은 = new Set(['game:BossRoom/Showcase HUD/Window 상점', 'game:BossRoom/PlayerAvatar69/AvatarGraphics69']);
    expect(찾은화면에닿나('game:*/Showcase HUD/Window 상점', 찾은)).toBe(true);
    expect(찾은화면에닿나('game:BossRoom/PlayerAvatar:n/AvatarGraphics:n', 찾은)).toBe(true);
    expect(찾은화면에닿나('game:BossRoom/Showcase HUD/Window 상점', 찾은)).toBe(true);
    expect(찾은화면에닿나('game:BossRoom/Showcase HUD/Window 상점/Panel/Text', 찾은)).toBe(false);
    expect(찾은화면에닿나('game:*/Showcase HUD/Window 가방', 찾은)).toBe(false);
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
