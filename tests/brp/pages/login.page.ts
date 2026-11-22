import type { GameDriver } from '@platform/kit';

import { 안내창 } from '../components/popup.component.js';

export class 로그인화면 {
  static readonly 주소 = 'game:MainMenu';
  static readonly 공지띠 = '/Showcase Login/NoticeBar/Bg';
  static readonly 공지띠글 = '/Showcase Login/NoticeBar/Bg/Text';
  static readonly 아이디칸 = 'Input 아이디';
  static readonly 비밀번호칸 = 'Input 비밀번호';
  static readonly 게임시작 = 'Button 게임 시작';
  static readonly 상태줄 = '/Showcase Login/Panel 로그인/Label/Text';
  static readonly 제목 = '/Showcase Login/Panel 로그인/TitleBar/Text';
  static readonly 버전표기 = '/Showcase Login/Label/Text';
  static readonly 아이디안내 = '/Showcase Login/Panel 로그인/Input 아이디/Text Area/Text[0]';
  static readonly 아이디글 = '/Showcase Login/Panel 로그인/Input 아이디/Text Area/Text[1]';
  static readonly 비밀번호안내 = '/Showcase Login/Panel 로그인/Input 비밀번호/Text Area/Text[0]';
  static readonly 비밀번호글 = '/Showcase Login/Panel 로그인/Input 비밀번호/Text Area/Text[1]';

  readonly 안내: 안내창;

  private constructor(private readonly game: GameDriver) {
    this.안내 = new 안내창(game);
  }

  static async 열림(game: GameDriver, 한도ms = 60_000): Promise<로그인화면> {
    await game.waitFor(로그인화면.게임시작, { timeoutMs: 한도ms });
    return new 로그인화면(game);
  }

  async 아이디넣기(아이디: string): Promise<string> {
    return this.game.type(로그인화면.아이디칸, 아이디);
  }

  async 비밀번호넣기(비밀번호: string): Promise<string> {
    return this.game.type(로그인화면.비밀번호칸, 비밀번호);
  }

  async 게임시작누르기(): Promise<void> {
    await this.game.click(로그인화면.게임시작);
  }

  async 넣고시작(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디넣기(아이디);
    await this.비밀번호넣기(비밀번호);
    await this.게임시작누르기();
  }

  async 로비뜰때까지(한도ms = 30_000): Promise<boolean> {
    return this.game.waitFor('Ready Btn', { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 상태줄글(): Promise<string> {
    return this.game.text(로그인화면.상태줄);
  }

  async 게임시작눌리나(): Promise<boolean> {
    return (await this.game.get(로그인화면.게임시작, 'Button.interactable')) === true;
  }

  async 제목글(): Promise<string> {
    return this.game.text(로그인화면.제목);
  }

  async 아이디칸글(): Promise<string> {
    return this.game.text(로그인화면.아이디글);
  }

  async 비밀번호칸글(): Promise<string> {
    return this.game.text(로그인화면.비밀번호글);
  }

  async 아이디칸비우기(): Promise<void> {
    await this.game.type(로그인화면.아이디칸, '');
  }

  async 아이디넣고엔터(아이디: string): Promise<void> {
    await this.game.click(로그인화면.아이디칸);
    await this.game.type(로그인화면.아이디칸, 아이디);
    await this.game.key('Return');
  }

  async 비밀번호넣고엔터(비밀번호: string): Promise<void> {
    await this.game.click(로그인화면.비밀번호칸);
    await this.game.type(로그인화면.비밀번호칸, 비밀번호);
    await this.game.key('Return');
  }

  async 비밀번호칸에있나(): Promise<boolean> {
    return (await this.game.get(로그인화면.비밀번호칸, 'TMP_InputField.isFocused')) === true;
  }

  async 게임시작눌릴때까지(한도ms = 15_000): Promise<boolean> {
    return this.game.waitForValue(로그인화면.게임시작, 'Button.interactable', true, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 아이디안내글(): Promise<string> {
    return this.game.text(로그인화면.아이디안내);
  }

  async 비밀번호안내글(): Promise<string> {
    return this.game.text(로그인화면.비밀번호안내);
  }

  async 버전글(): Promise<string> {
    return this.game.text(로그인화면.버전표기);
  }

  async 공지띠보임(): Promise<boolean> {
    return (await this.game.find(로그인화면.공지띠)) !== null;
  }

  async 공지띠뜰때까지(한도ms = 15_000): Promise<boolean> {
    return this.game.waitFor(로그인화면.공지띠, { timeoutMs: 한도ms }).then(() => true, () => false);
  }

  async 공지띠글(): Promise<string> {
    return this.game.text(로그인화면.공지띠글);
  }

  async 공지띠바탕색(): Promise<number[]> {
    return (await this.game.get(로그인화면.공지띠, 'Image.color')) as number[];
  }

  async 공지띠글기다리기(조각: string, 한도ms = 20_000): Promise<string> {
    const 끝 = Date.now() + 한도ms;
    let 글 = '';
    for (;;) {
      글 = (await this.game.find(로그인화면.공지띠글)) === null ? '' : await this.game.text(로그인화면.공지띠글);
      if (글.includes(조각) || Date.now() > 끝) return 글;
    }
  }
}
