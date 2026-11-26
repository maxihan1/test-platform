import type { GameDriver } from '@platform/kit';

import { 글읽기, 로딩끝날때까지, 메인메뉴로, 빠른시작버튼, 있나 } from '../helpers/menu.helper.js';

export class 메인메뉴화면 {
  static readonly 주소 = 'game:MainMenu';

  static readonly 버튼글 = {
    빠른시작: '/MainMenu UI Canvas/Buttons/QuickStartBtn/Text (TMP)',
    튜토리얼: '/MainMenu UI Canvas/Buttons/SingleBtn/Text (TMP)',
    환경설정: '/MainMenu UI Canvas/Buttons/SettingBtn/Text (TMP)',
    게임종료: '/MainMenu UI Canvas/Buttons/ExitBtn/Text (TMP)',
  } as const;

  static readonly 가이드버튼 = 'Btn_GameGuide';
  static readonly 가이드버튼글 = '/MainMenu UI Canvas/Btn_GameGuide/Keyboard/Text';
  static readonly 판번호 = '/MainMenu UI Canvas/Version';
  static readonly 키보드안내 = '/MainMenu UI Canvas/Keyboard_Bot';
  static readonly 패드안내 = '/MainMenu UI Canvas/Gamepad_Bot';
  static readonly 가이드키보드그림 = '/MainMenu UI Canvas/Btn_GameGuide/Keyboard';
  static readonly 가이드패드그림 = '/MainMenu UI Canvas/Btn_GameGuide/Nintendo';
  static readonly 안내글 = {
    이동: '/MainMenu UI Canvas/Keyboard_Bot/Move/txt',
    선택키: '/MainMenu UI Canvas/Keyboard_Bot/Select/KeyText',
    선택: '/MainMenu UI Canvas/Keyboard_Bot/Select/txt',
    취소키: '/MainMenu UI Canvas/Keyboard_Bot/Cancel/KeyText',
    취소: '/MainMenu UI Canvas/Keyboard_Bot/Cancel/txt',
  } as const;

  private constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<메인메뉴화면> {
    await 메인메뉴로(game);
    await 로딩끝날때까지(game);
    await game.waitFor(메인메뉴화면.버튼글.빠른시작, { text: '빠른시작', timeoutMs: 20_000 }).catch(() => undefined);
    return new 메인메뉴화면(game);
  }

  static async 다시켜서열기(game: GameDriver): Promise<메인메뉴화면> {
    await game.restart();
    await game.waitFor(빠른시작버튼, { timeoutMs: 120_000 });
    await game.waitFor(메인메뉴화면.버튼글.빠른시작, { text: '빠른시작', timeoutMs: 20_000 }).catch(() => undefined);
    return new 메인메뉴화면(game);
  }

  async 글(주소: string): Promise<string> {
    return await 글읽기(this.game, 주소);
  }

  async 보이나(주소: string): Promise<boolean> {
    return await 있나(this.game, 주소);
  }

  async 빠른시작누르기(): Promise<void> {
    await this.game.click(빠른시작버튼);
  }

  async 튜토리얼누르기(): Promise<void> {
    await this.game.click('SingleBtn');
  }

  async 환경설정누르기(): Promise<void> {
    await this.game.click('SettingBtn');
  }

  async 가이드누르기(): Promise<void> {
    await this.game.click(메인메뉴화면.가이드버튼);
  }

  async 패드버튼누르기(): Promise<void> {
    const { type } = await this.game.pad();
    await this.game.key(type === 'switch' ? 'Pad.B' : 'Pad.Cross');
  }

  async 키보드누르기(): Promise<void> {
    await this.game.key('DownArrow');
  }
}
