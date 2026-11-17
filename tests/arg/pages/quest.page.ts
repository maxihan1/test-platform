import type { GameDriver } from '@platform/kit';

import { 공통HUD, 글만 } from '../components/hud.component.js';
import { 목록 } from '../components/list.component.js';

export class 퀘스트창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 일일 퀘스트';
  static readonly 창 = '/Showcase HUD/Window 일일 퀘스트';
  static readonly 바깥 = '/Showcase HUD/Window 일일 퀘스트/Shade';
  static readonly 제목 = '/Showcase HUD/Window 일일 퀘스트/Panel 일일 퀘스트/TitleBar/Text';
  static readonly 닫기 = '/Showcase HUD/Window 일일 퀘스트/Panel 일일 퀘스트/Button 닫기';
  static readonly 내용 = '/Showcase HUD/Window 일일 퀘스트/Panel 일일 퀘스트/Scroll/Content';

  readonly 목록: 목록;
  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.목록 = new 목록(game, 퀘스트창.내용);
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<퀘스트창> {
    if ((await game.find(퀘스트창.창)) === null) await game.click(공통HUD.메뉴버튼('퀘스트'));
    await game.waitFor(퀘스트창.제목, { timeoutMs: 10_000 });
    return new 퀘스트창(game);
  }

  static 지금(game: GameDriver): 퀘스트창 {
    return new 퀘스트창(game);
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(퀘스트창.닫기);
    await this.game.waitFor(퀘스트창.창, { gone: true, timeoutMs: 10_000 });
  }

  async 열렸나(): Promise<boolean> {
    return (await this.game.find(퀘스트창.창)) !== null;
  }

  async 글(주소: string): Promise<string> {
    const 찾은것 = await this.game.find(주소);
    return 찾은것 === null ? '' : 글만(찾은것.text ?? '');
  }

  async 보이나(주소: string): Promise<boolean> {
    return (await this.game.find(주소)) !== null;
  }

  async 누르기(주소: string): Promise<void> {
    await this.game.click(주소);
  }

  async 줄버튼누르기(이름: string, 버튼: string): Promise<boolean> {
    const 줄 = await this.목록.이름줄(이름);
    if (줄 === null) return false;
    const 주소 = await this.목록.줄버튼(줄, 버튼);
    if (주소 === null) return false;
    await this.game.click(주소);
    return true;
  }

  async 보상받기(이름: string): Promise<boolean> {
    return await this.줄버튼누르기(이름, '보상 받기');
  }

  async 보상받기눌림(이름: string): Promise<boolean | null> {
    const 줄 = await this.목록.이름줄(이름);
    if (줄 === null) return null;
    const 버튼 = await this.game.find(`${줄}/Button 보상 받기`);
    if (버튼 === null) return null;
    return (await this.game.get(`${줄}/Button 보상 받기`, 'Button.interactable')) === true;
  }

  async 줄칸글(이름: string, 칸: number): Promise<string> {
    const 줄 = await this.목록.이름줄(이름);
    return 줄 === null ? '' : await this.목록.칸글(줄, 칸);
  }

  async 줄전체글(이름: string): Promise<string> {
    const 줄 = await this.목록.이름줄(이름);
    return 줄 === null ? '' : await this.목록.줄글(줄);
  }

  async 칸주소(이름: string, 칸: number): Promise<string> {
    const 줄 = await this.목록.이름줄(이름);
    return 줄 === null ? '' : `${줄}/Label[${String(칸)}]/Text`;
  }
}
