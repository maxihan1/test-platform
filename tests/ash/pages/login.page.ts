import type { GameDriver } from '@platform/kit';

import { 서버설정창 } from './server-settings.page.js';

export class 로그인창 {
  static readonly 주소 = 'game:Boot';

  static readonly 화면 = '/Boot/BootCanvas/LoginView';
  static readonly 로그인버튼 = 'LoginButton';
  static readonly 회원가입버튼 = 'SignupButton';
  static readonly 서버설정버튼 = 'ServerSettingsButton';

  private constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<로그인창> {
    await game.waitFor(로그인창.로그인버튼, { timeoutMs: 60_000 });
    return new 로그인창(game);
  }

  async 서버설정열기(): Promise<서버설정창> {
    await this.game.click(로그인창.서버설정버튼);
    return 서버설정창.뜰때까지(this.game);
  }

  async 누를수있나(버튼: string): Promise<boolean> {
    const 찾음 = await this.game.find(버튼);
    return 찾음 !== null && 찾음.interactable !== false;
  }
}
