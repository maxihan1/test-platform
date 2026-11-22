import type { GameDriver } from '@platform/kit';

export class 설정창 {
  static readonly 주소 = 'game:MainMenu/SettingsPanelCanvas/SettingsPanel';
  static readonly 창 = '/SettingsPanelCanvas/SettingsPanel';
  static readonly 톱니버튼 = '/SettingsPanelCanvas/Settings Button';
  static readonly 종료버튼 = '/SettingsPanelCanvas/Quit Button';
  static readonly 닫기버튼 = '/SettingsPanelCanvas/SettingsPanel/Close Button';

  constructor(private readonly game: GameDriver) {}

  async 톱니누르기(): Promise<void> {
    await this.game.click(설정창.톱니버튼);
  }

  async 뜰때까지(한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(설정창.창, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 닫기(): Promise<void> {
    await this.game.click(설정창.닫기버튼);
    await this.game.waitFor(설정창.창, { gone: true, timeoutMs: 10_000 });
  }
}
