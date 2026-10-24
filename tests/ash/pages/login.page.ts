import type { GameDriver } from '@platform/kit';

export class 로그인화면 {
  static readonly 주소 = 'game:Boot';

  static readonly 창 = '/Boot/BootCanvas/LoginView';

  constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<로그인화면> {
    await game.waitFor(로그인화면.창, { timeoutMs: 60_000 });
    return new 로그인화면(game);
  }

  async 서버글(): Promise<string> {
    return this.game.text('ServerText');
  }

  async 서버설정누르기(): Promise<void> {
    await this.game.click('ServerSettingsButton');
  }

  async 아이디적기(아이디: string): Promise<string> {
    return this.game.type('UsernameInput', 아이디);
  }

  async 비밀번호적기(비밀번호: string): Promise<string> {
    return this.game.type('PasswordInput', 비밀번호);
  }

  async 로그인누르기(): Promise<void> {
    await this.game.click('LoginButton');
  }

  async 가입누르기(): Promise<void> {
    await this.game.click('SignupButton');
  }

  async 상태글(): Promise<string> {
    return this.game.text(`${로그인화면.창}/Form/StatusText`);
  }

  async 상태글뜰때까지(글자: string, 한도 = 15_000): Promise<void> {
    await this.game.waitFor(`${로그인화면.창}/Form/StatusText`, { text: 글자, timeoutMs: 한도 });
  }

  async 로그인버튼(): Promise<{ path: string; interactable?: boolean } | null> {
    return this.game.find('LoginButton');
  }

  async 가입버튼(): Promise<{ path: string; interactable?: boolean } | null> {
    return this.game.find('SignupButton');
  }
}
