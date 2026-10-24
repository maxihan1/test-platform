import type { GameDriver } from '@platform/kit';

export class 서버설정창 {
  static readonly 주소 = 'game:Boot/Boot/BootCanvas/LoginView/ServerSettingsPanel';

  static readonly 창 = '/Boot/BootCanvas/LoginView/ServerSettingsPanel';

  constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<서버설정창> {
    await game.click('ServerSettingsButton');
    await game.waitFor(서버설정창.창);
    return new 서버설정창(game);
  }

  async 주소적기(주소: string): Promise<string> {
    return this.game.type('ServerUrlInput', 주소);
  }

  async 저장누르기(): Promise<void> {
    await this.game.click('SaveServerButton');
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(`${서버설정창.창}/Window/CancelButton`);
  }

  async 떠있나(): Promise<boolean> {
    return (await this.game.find(서버설정창.창)) !== null;
  }

  async 닫힐때까지(): Promise<void> {
    await this.game.waitFor(서버설정창.창, { gone: true });
  }
}
