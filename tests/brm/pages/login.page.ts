import type { GameDriver } from '@platform/kit';

import { 색뗀글 } from '../components/hud.component.js';

export class 로그인화면 {
  static readonly 주소 = 'game:MainMenu';
  static readonly 판 = '/Showcase Login/Panel 로그인';
  static readonly 제목줄 = '/Showcase Login/Panel 로그인/TitleBar/Text';
  static readonly 상태줄 = '/Showcase Login/Panel 로그인/Label/Text';
  static readonly 아이디칸 = '/Showcase Login/Panel 로그인/Input 아이디';
  static readonly 비밀번호칸 = '/Showcase Login/Panel 로그인/Input 비밀번호';
  static readonly 시작버튼 = '/Showcase Login/Panel 로그인/Button 게임 시작';
  static readonly 설정버튼 = '/SettingsPanelCanvas/Settings Button';
  static readonly 끄기버튼 = '/SettingsPanelCanvas/Quit Button';
  static readonly 설정창 = '/SettingsPanelCanvas/SettingsPanel';
  static readonly 공지띠 = '/Showcase Login/NoticeBar/Bg/Text';
  static readonly 공지띠바탕 = '/Showcase Login/NoticeBar/Bg';

  constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<로그인화면> {
    await game.waitFor(로그인화면.시작버튼, { timeoutMs: 60_000 });
    return new 로그인화면(game);
  }

  async 아이디넣기(값: string): Promise<void> {
    await this.game.type(로그인화면.아이디칸, 값);
  }

  async 비밀번호넣기(값: string): Promise<void> {
    await this.game.type(로그인화면.비밀번호칸, 값);
  }

  async 시작누르기(): Promise<void> {
    await this.game.click(로그인화면.시작버튼);
  }

  async 아이디칸글(): Promise<string> {
    return this.game.text(`${로그인화면.아이디칸}/Text Area/Text[1]`);
  }

  async 아이디안내글(): Promise<string> {
    return this.game.text(`${로그인화면.아이디칸}/Text Area/Text[0]`);
  }

  async 비밀번호칸글(): Promise<string> {
    return this.game.text(`${로그인화면.비밀번호칸}/Text Area/Text[1]`);
  }

  async 비밀번호안내글(): Promise<string> {
    return this.game.text(`${로그인화면.비밀번호칸}/Text Area/Text[0]`);
  }

  async 제목(): Promise<string> {
    return 색뗀글(await this.game.text(로그인화면.제목줄));
  }

  async 상태글(): Promise<string> {
    return 색뗀글(await this.game.text(로그인화면.상태줄));
  }

  async 시작버튼눌림(): Promise<boolean> {
    return (await this.game.get(로그인화면.시작버튼, 'Button.interactable')) === true;
  }

  async 버전글(): Promise<string> {
    return 색뗀글(await this.game.text('/Showcase Login//*[contains(@text,v0.1)]'));
  }

  async 공지띠글(): Promise<string | null> {
    const 띠 = await this.game.find(로그인화면.공지띠);
    return 띠 === null ? null : (띠.text ?? '');
  }

  async 공지띠바탕색(): Promise<string> {
    return JSON.stringify(await this.game.get(로그인화면.공지띠바탕, 'Image.color'));
  }

  async 설정누르기(): Promise<void> {
    await this.game.click(로그인화면.설정버튼);
  }

  async 상태줄원문(): Promise<string> {
    return this.game.text(로그인화면.상태줄);
  }

  async 상태글이될때까지(글: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(로그인화면.상태줄, { text: 글, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 시작버튼눌림이될때까지(눌림: boolean, 한도ms = 30_000): Promise<boolean> {
    return this.game.waitForValue(로그인화면.시작버튼, 'Button.interactable', 눌림, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 설정창뜸(한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(로그인화면.설정창, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 설정버튼있나(): Promise<boolean> {
    return (await this.game.find(로그인화면.설정버튼)) !== null;
  }

  async 끄기버튼있나(): Promise<boolean> {
    return (await this.game.find(로그인화면.끄기버튼)) !== null;
  }

  async 아이디칸이될때까지(글: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(`${로그인화면.아이디칸}/Text Area/Text[1]`, { text: 글, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 공지띠뜸(한도ms = 10_000): Promise<boolean> {
    const 띠 = '/Showcase Login/NoticeBar//*[contains(@text,공지)][-1]';
    return this.game.waitFor(띠, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }
}
