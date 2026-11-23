import type { GameDriver } from '@platform/kit';

import { 색뗀글 } from '../components/hud.component.js';

export class 설정창 {
  static readonly 주소 = 'game:MainMenu/SettingsPanelCanvas/SettingsPanel';
  static readonly 톱니바퀴 = '/SettingsPanelCanvas/Settings Button';
  static readonly 판 = '/SettingsPanelCanvas/SettingsPanel';
  static readonly 제목줄 = '/SettingsPanelCanvas/SettingsPanel/SettingsLabel';
  static readonly 닫기버튼 = '/SettingsPanelCanvas/SettingsPanel/Close Button';
  static readonly 전체소리이름 = '/SettingsPanelCanvas/SettingsPanel/MasterVolume/Label';
  static readonly 음악소리이름 = '/SettingsPanelCanvas/SettingsPanel/MusicVolume/Label';
  static readonly 화질버튼 = '/SettingsPanelCanvas/SettingsPanel/Settings Button';
  static readonly 화질글줄 = '/SettingsPanelCanvas/SettingsPanel/Settings Button/Text (TMP)';
  static readonly 화질차례 = ['Low', 'Medium', 'High'] as const;

  private constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<설정창> {
    if ((await game.find(설정창.판)) === null) await game.click(설정창.톱니바퀴);
    await game.waitFor(설정창.판, { timeoutMs: 10_000 });
    return new 설정창(game);
  }

  async 제목(): Promise<string> {
    return 색뗀글(await this.game.text(설정창.제목줄));
  }

  async 전체소리막대이름(): Promise<string> {
    return 색뗀글(await this.game.text(설정창.전체소리이름));
  }

  async 음악소리막대이름(): Promise<string> {
    return 색뗀글(await this.game.text(설정창.음악소리이름));
  }

  async 화질글(): Promise<string> {
    return 색뗀글(await this.game.text(설정창.화질글줄));
  }

  async 화질누르기(): Promise<string> {
    const 앞 = await this.화질글();
    await this.game.click(설정창.화질버튼);
    for (let 번 = 0; 번 < 20; 번 += 1) {
      const 지금 = await this.화질글();
      if (지금 !== 앞) return 지금;
    }
    return this.화질글();
  }

  async 화질맞추기(글: string): Promise<boolean> {
    for (let 번 = 0; 번 < 설정창.화질차례.length && (await this.화질글()) !== 글; 번 += 1) await this.화질누르기();
    return (await this.화질글()) === 글;
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(설정창.닫기버튼);
  }

  async 닫힐때까지(한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(설정창.판, { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }
}
