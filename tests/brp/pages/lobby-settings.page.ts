import type { GameDriver } from '@platform/kit';

export class 로비설정창 {
  static readonly 주소 = 'game:*/SettingsPanelCanvas/SettingsPanel';
  static readonly 창 = '/SettingsPanelCanvas/SettingsPanel';
  static readonly 톱니버튼 = '/SettingsPanelCanvas/Settings Button';
  static readonly 전체소리글 = '/SettingsPanelCanvas/SettingsPanel/MasterVolume/Label';
  static readonly 음악소리글 = '/SettingsPanelCanvas/SettingsPanel/MusicVolume/Label';
  static readonly 품질버튼 = '/SettingsPanelCanvas/SettingsPanel/Settings Button';
  static readonly 닫기버튼 = '/SettingsPanelCanvas/SettingsPanel/Close Button';

  private constructor(private readonly game: GameDriver) {}

  static 로비에서(game: GameDriver): 로비설정창 {
    return new 로비설정창(game);
  }

  async 톱니누르기(): Promise<void> {
    await this.game.click(로비설정창.톱니버튼);
  }

  async 뜰때까지(한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(로비설정창.창, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 열기(): Promise<boolean> {
    await this.톱니누르기();
    return this.뜰때까지();
  }

  async 전체소리글읽기(): Promise<string | null> {
    if ((await this.game.find(로비설정창.전체소리글)) === null) return null;
    return this.game.text(로비설정창.전체소리글);
  }

  async 음악소리글읽기(): Promise<string | null> {
    if ((await this.game.find(로비설정창.음악소리글)) === null) return null;
    return this.game.text(로비설정창.음악소리글);
  }

  async 품질버튼있나(): Promise<boolean> {
    return (await this.game.find(로비설정창.품질버튼)) !== null;
  }

  async 닫기버튼있나(): Promise<boolean> {
    return (await this.game.find(로비설정창.닫기버튼)) !== null;
  }

  async 배치문제(): Promise<unknown[]> {
    return (await this.game.layout(로비설정창.창)).problems;
  }

  async 닫기(): Promise<void> {
    if ((await this.game.find(로비설정창.창)) === null) return;
    await this.game.click(로비설정창.닫기버튼);
    await this.game.waitFor(로비설정창.창, { gone: true, timeoutMs: 10_000 });
  }
}
