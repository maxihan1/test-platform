import type { GameDriver } from '@platform/kit';

import { 글만 } from '../components/hud.component.js';

export class 로그인화면 {
  static readonly 주소 = 'game:MainMenu';
  static readonly 창 = '/Showcase Login/Panel 로그인';
  static readonly 제목 = '/Showcase Login/Panel 로그인/TitleBar/Text';
  static readonly 아이디칸 = '/Showcase Login/Panel 로그인/Input 아이디';
  static readonly 아이디안내 = '/Showcase Login/Panel 로그인/Input 아이디/Text Area/Text[0]';
  static readonly 비밀번호칸 = '/Showcase Login/Panel 로그인/Input 비밀번호';
  static readonly 비밀번호안내 = '/Showcase Login/Panel 로그인/Input 비밀번호/Text Area/Text[0]';
  static readonly 비밀번호글 = '/Showcase Login/Panel 로그인/Input 비밀번호/Text Area/Text[1]';
  static readonly 게임시작 = '/Showcase Login/Panel 로그인/Button 게임 시작';
  static readonly 상태줄 = '/Showcase Login/Panel 로그인/Label/Text';
  static readonly 버전 = '/Showcase Login/Label/Text';
  static readonly 톱니바퀴 = '/SettingsPanelCanvas/Settings Button';
  static readonly 닫기X = '/SettingsPanelCanvas/Quit Button';
  static readonly 설정창 = '/SettingsPanelCanvas/SettingsPanel';
  static readonly 나가기창 = '/SettingsPanelCanvas/QuitPanel';
  static readonly 나가기글 = '/SettingsPanelCanvas/QuitPanel/QuitLabel';
  static readonly 나가기취소 = '/SettingsPanelCanvas/QuitPanel/Cancel Button';
  static readonly 가입글 = '//*[contains(@text,가입)]';
  static readonly 게임시작글 = '/Showcase Login/Panel 로그인/Button 게임 시작/Text';
  static readonly 공지띠후보 = '//*[contains(@text,[공지)]';

  private constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver, 시간 = 120_000): Promise<로그인화면> {
    await game.waitFor(로그인화면.게임시작, { timeoutMs: 시간 });
    return new 로그인화면(game);
  }

  static 지금(game: GameDriver): 로그인화면 {
    return new 로그인화면(game);
  }

  async 아이디넣기(아이디: string): Promise<string> {
    return await this.game.type(로그인화면.아이디칸, 아이디);
  }

  async 비밀번호넣기(비밀번호: string): Promise<string> {
    return await this.game.type(로그인화면.비밀번호칸, 비밀번호);
  }

  async 게임시작누르기(): Promise<void> {
    await this.game.click(로그인화면.게임시작);
  }

  async 로그인(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디넣기(아이디);
    await this.비밀번호넣기(비밀번호);
    await this.게임시작누르기();
  }

  async 아이디칸글(): Promise<string> {
    return await this.game.text(로그인화면.아이디칸);
  }

  async 비밀번호칸글(): Promise<string> {
    return await this.game.text(로그인화면.비밀번호칸);
  }

  async 상태줄글(): Promise<string> {
    const 찾은것 = await this.game.find(로그인화면.상태줄);
    return 찾은것 === null ? '' : 글만(찾은것.text ?? '');
  }

  async 상태줄색(): Promise<number[]> {
    return (await this.game.get(로그인화면.상태줄, 'TextMeshProUGUI.color')) as number[];
  }

  async 게임시작눌림(): Promise<boolean> {
    return (await this.game.get(로그인화면.게임시작, 'Button.interactable')) === true;
  }

  async 보이나(주소: string): Promise<boolean> {
    return (await this.game.find(주소)) !== null;
  }

  async 글(주소: string): Promise<string> {
    return 글만(await this.game.text(주소));
  }
}
