import type { GameDriver } from '@platform/kit';

import { 오른쪽위버튼 } from '../components/corner.component.js';
import { 안내창 } from '../components/popup.component.js';
import { 뜨는지, 화면글자 } from '../helpers/find.helper.js';

const 창 = '/Showcase Login/Panel 로그인';

export class 로그인화면 {
  static readonly 주소 = 'game:MainMenu';
  static readonly 제목 = `${창}/TitleBar/Text`;
  static readonly 아이디칸 = `${창}/Input 아이디`;
  static readonly 비밀번호칸 = `${창}/Input 비밀번호`;
  static readonly 아이디안내 = `${창}/Input 아이디/Text Area/Text[0]`;
  static readonly 아이디글칸 = `${창}/Input 아이디/Text Area/Text[1]`;
  static readonly 비밀번호안내 = `${창}/Input 비밀번호/Text Area/Text[0]`;
  static readonly 비밀번호글칸 = `${창}/Input 비밀번호/Text Area/Text[1]`;
  static readonly 게임시작 = `${창}/Button 게임 시작`;
  static readonly 상태줄 = `${창}/Label/Text`;
  static readonly 버전 = '/Showcase Login/Label/Text';
  static readonly 공지띠 = '/Showcase Login/NoticeBar';

  readonly 안내창: 안내창;
  readonly 구석: 오른쪽위버튼;

  private constructor(private readonly game: GameDriver) {
    this.안내창 = new 안내창(game);
    this.구석 = new 오른쪽위버튼(game);
  }

  static async 열기(game: GameDriver): Promise<로그인화면> {
    await game.waitFor(로그인화면.게임시작, { timeoutMs: 120_000 });
    return new 로그인화면(game);
  }

  static 지금(game: GameDriver): 로그인화면 {
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

  async 로그인(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디넣기(아이디);
    await this.비밀번호넣기(비밀번호);
    await this.게임시작누르기();
  }

  async 아이디글(): Promise<string> {
    return this.game.text(로그인화면.아이디글칸);
  }

  async 비밀번호글(): Promise<string> {
    return this.game.text(로그인화면.비밀번호글칸);
  }

  async 상태글(): Promise<string> {
    return this.game.text(로그인화면.상태줄);
  }

  async 상태글이될때까지(글: string, timeoutMs = 10_000): Promise<boolean> {
    return this.game.waitFor(로그인화면.상태줄, { text: 글, timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 게임시작누를수있는지(): Promise<boolean> {
    return (await this.game.find(로그인화면.게임시작))?.interactable === true;
  }

  async 제목글(): Promise<string> {
    return this.game.text(로그인화면.제목);
  }

  async 아이디안내글(): Promise<string> {
    return this.game.text(로그인화면.아이디안내);
  }

  async 비밀번호안내글(): Promise<string> {
    return this.game.text(로그인화면.비밀번호안내);
  }

  async 게임시작글(): Promise<string> {
    return (await this.game.find(`${로그인화면.게임시작}//*[contains(@text,게임 시작)]`))?.text ?? '';
  }

  async 버전글(): Promise<string> {
    return this.game.text(로그인화면.버전);
  }

  async 아이디가될때까지(글: string, timeoutMs = 10_000): Promise<boolean> {
    return this.game.waitFor(로그인화면.아이디글칸, { text: 글, timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 게임시작보이는지(timeoutMs = 10_000): Promise<boolean> {
    return 뜨는지(this.game, 로그인화면.게임시작, timeoutMs);
  }

  async 게임시작이눌릴때까지(timeoutMs = 10_000): Promise<boolean> {
    return this.game.waitForValue(로그인화면.게임시작, 'Button.interactable', true, { timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 글자가뜨는지(문구: string, timeoutMs = 10_000): Promise<boolean> {
    return 뜨는지(this.game, 화면글자(문구), timeoutMs);
  }

  async 글자있는지(문구: string): Promise<boolean> {
    return (await this.game.find(화면글자(문구))) !== null;
  }

  async 안내창확인글(): Promise<string> {
    return (await this.game.find(`${안내창.확인}//*[contains(@text,확인)]`))?.text ?? '';
  }
}
