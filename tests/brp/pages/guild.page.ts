import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';

const 창뿌리 = '/Showcase HUD/Window 길드';
const 패널 = `${창뿌리}/Panel 길드`;
const 내용 = `${패널}/Content`;

function 글만(글: string): string {
  return 글.replace(/<[^>]+>/g, '').trim();
}

export class 길드창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 길드';
  static readonly 창 = 창뿌리;
  static readonly 제목 = `${패널}/TitleBar/Text`;
  static readonly 닫기버튼 = `${패널}/Button 닫기`;
  static readonly 안내글 = `${내용}/Label/Text`;
  static readonly 이름칸 = 'Input 길드 이름 (2~12자)';
  static readonly 초대칸안내 = `${내용}/Input 초대할 캐릭터 이름/Text Area/Text[0]`;
  static readonly 이름칸안내 = `${내용}/Input 길드 이름 (2~12자)/Text Area/Text[0]`;
  static readonly 만들기버튼 = 'Button 만들기 · 500G';
  static readonly 초대칸 = 'Input 초대할 캐릭터 이름';
  static readonly 초대버튼 = 'Button 초대';
  static readonly 탈퇴버튼 = 'Button 길드 탈퇴';
  static readonly 길드머리 = `${내용}/Label/Text`;
  static readonly 길드원뿌리 = `${내용}/Scroll/Content`;

  private constructor(private readonly game: GameDriver) {}

  static async 열려있나(game: GameDriver): Promise<boolean> {
    return (await game.find(길드창.창)) !== null;
  }

  static async 열기(game: GameDriver): Promise<길드창> {
    if (!(await 길드창.열려있나(game))) {
      await new 공통HUD(game).메뉴누르기('길드');
      await game.waitFor(길드창.닫기버튼, { timeoutMs: 10_000 });
    }
    return new 길드창(game);
  }

  async 닫기(): Promise<void> {
    await this.game.click(길드창.닫기버튼);
    await this.game.waitFor(길드창.창, { gone: true, timeoutMs: 10_000 });
  }

  async 제목글(): Promise<string> {
    return this.game.text(길드창.제목);
  }

  async 안내글읽기(): Promise<string> {
    return this.game.text(길드창.안내글);
  }

  async 이름칸안내글(): Promise<string> {
    return this.game.text(길드창.이름칸안내);
  }

  async 초대칸안내글(): Promise<string> {
    return this.game.text(길드창.초대칸안내);
  }

  async 이름넣기(이름: string): Promise<string> {
    return this.game.type(길드창.이름칸, 이름);
  }

  async 만들기(이름: string): Promise<void> {
    await this.이름넣기(이름);
    await this.game.click(길드창.만들기버튼);
  }

  async 빠르게두번만들기(이름: string): Promise<void> {
    await this.이름넣기(이름);
    await this.game.click(길드창.만들기버튼, { count: 2, interval: 0.05 });
  }

  async 초대하기(이름: string): Promise<void> {
    await this.game.type(길드창.초대칸, 이름);
    await this.game.click(길드창.초대버튼);
  }

  async 초대칸있나(): Promise<boolean> {
    return (await this.game.find(길드창.초대칸)) !== null;
  }

  async 초대버튼있나(): Promise<boolean> {
    return (await this.game.find(길드창.초대버튼)) !== null;
  }

  async 탈퇴(): Promise<void> {
    await this.game.click(길드창.탈퇴버튼);
    await this.game.waitFor(길드창.이름칸, { timeoutMs: 10_000 });
  }

  async 길드머리글(): Promise<string | null> {
    if ((await this.game.find(길드창.길드머리)) === null) return null;
    return 글만(await this.game.text(길드창.길드머리));
  }

  async 길드머리기다리기(조각: string, 한도ms = 10_000): Promise<string | null> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      const 글 = await this.길드머리글();
      if (글 !== null && 글.includes(조각)) return 글;
      if (Date.now() > 끝) return null;
    }
  }

  줄주소(번호: number): string {
    return `${길드창.길드원뿌리}/Row[${String(번호)}]/Label/Text`;
  }

  async 길드원줄들(): Promise<string[]> {
    const 모은: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      if ((await this.game.find(this.줄주소(i))) === null) break;
      모은.push(await this.game.text(this.줄주소(i)));
    }
    return 모은;
  }

  async 길드원줄기다리기(맞나: (줄들: string[]) => boolean, 한도ms = 10_000): Promise<string[] | null> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      const 줄들 = await this.길드원줄들();
      if (맞나(줄들)) return 줄들;
      if (Date.now() > 끝) return null;
    }
  }

  길드원줄번호(줄들: string[], 이름: string): number {
    return 줄들.findIndex((줄) => 글만(줄).includes(이름));
  }

  추방버튼주소(번호: number): string {
    return `${길드창.길드원뿌리}/Row[${String(번호)}]/Button 추방`;
  }

  async 추방있나(번호: number): Promise<boolean> {
    return (await this.game.find(this.추방버튼주소(번호))) !== null;
  }

  async 추방누르기(번호: number): Promise<void> {
    await this.game.click(this.추방버튼주소(번호));
  }
}
