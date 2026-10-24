import type { GameDriver } from '@platform/kit';

export class 서버설정창 {
  static readonly 주소 = 'game:Boot/Boot/BootCanvas/LoginView/ServerSettingsPanel';

  static readonly 창 = '/Boot/BootCanvas/LoginView/ServerSettingsPanel';
  static readonly 저장버튼 = 'SaveServerButton';
  static readonly 닫기버튼 = 'CancelButton';

  private constructor(private readonly game: GameDriver) {}

  static async 뜰때까지(game: GameDriver): Promise<서버설정창> {
    await game.waitFor(서버설정창.창);
    return new 서버설정창(game);
  }

  async 보이나(): Promise<boolean> {
    return (await this.game.find(서버설정창.창)) !== null;
  }

  async 저장(): Promise<void> {
    await this.game.click(서버설정창.저장버튼);
  }

  async 닫기(): Promise<void> {
    await this.game.click(서버설정창.닫기버튼);
    await this.game.waitFor(서버설정창.창, { gone: true });
  }
}
