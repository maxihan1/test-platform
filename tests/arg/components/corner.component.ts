import type { GameDriver } from '@platform/kit';

export class 오른쪽위버튼 {
  static readonly 톱니바퀴 = '/SettingsPanelCanvas/Settings Button';
  static readonly X = '/SettingsPanelCanvas/Quit Button';
  static readonly 설정창 = '/SettingsPanelCanvas/SettingsPanel';
  static readonly 나가기창 = '/SettingsPanelCanvas/QuitPanel';
  static readonly 나가기확인 = '/SettingsPanelCanvas/QuitPanel/Confirm Button';
  static readonly 나가기취소 = '/SettingsPanelCanvas/QuitPanel/Cancel Button';

  constructor(private readonly game: GameDriver) {}

  async 톱니바퀴누르기(): Promise<void> {
    await this.game.click(오른쪽위버튼.톱니바퀴);
  }

  async X누르기(): Promise<void> {
    await this.game.click(오른쪽위버튼.X);
  }

  async 나가기창글(): Promise<string> {
    return this.game.text(`${오른쪽위버튼.나가기창}/QuitLabel`);
  }

  async 메인메뉴로나가기(): Promise<void> {
    await this.game.click(오른쪽위버튼.X);
    await this.game.waitFor(오른쪽위버튼.나가기확인, { timeoutMs: 10_000 });
    await this.game.click(오른쪽위버튼.나가기확인);
  }
}
