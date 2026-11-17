import type { GameDriver } from '@platform/kit';

import { 공통HUD, 글만 } from '../components/hud.component.js';
import { 목록 } from '../components/list.component.js';

export class 우편함창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 우편함';
  static readonly 창 = '/Showcase HUD/Window 우편함';
  static readonly 바깥 = '/Showcase HUD/Window 우편함/Shade';
  static readonly 제목 = '/Showcase HUD/Window 우편함/Panel 우편함/TitleBar/Text';
  static readonly 닫기 = '/Showcase HUD/Window 우편함/Panel 우편함/Button 닫기';
  static readonly 내용 = '/Showcase HUD/Window 우편함/Panel 우편함/Scroll/Content';

  readonly 목록: 목록;
  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.목록 = new 목록(game, 우편함창.내용);
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<우편함창> {
    if ((await game.find(우편함창.창)) === null) await game.click(공통HUD.메뉴버튼('우편'));
    await game.waitFor(우편함창.제목, { timeoutMs: 10_000 });
    return new 우편함창(game);
  }

  static 지금(game: GameDriver): 우편함창 {
    return new 우편함창(game);
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(우편함창.닫기);
    await this.game.waitFor(우편함창.창, { gone: true, timeoutMs: 10_000 });
  }

  async 열렸나(): Promise<boolean> {
    return (await this.game.find(우편함창.창)) !== null;
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

  static readonly 모두받기 = '/Showcase HUD/Window 우편함/Panel 우편함/Button 모두 받기';
  static readonly 빈우편함 = '//*[contains(@text,받은 우편이 없습니다)]';

  async 받기(제목: string): Promise<boolean> {
    return await this.줄버튼누르기(제목, '받기');
  }

  async 삭제(제목: string): Promise<boolean> {
    return await this.줄버튼누르기(제목, '삭제');
  }

  async 모두받기누르기(): Promise<void> {
    await this.game.click(우편함창.모두받기);
  }

  async 줄칸글(이름: string, 칸: number): Promise<string> {
    const 줄 = await this.목록.이름줄(이름);
    return 줄 === null ? '' : await this.목록.칸글(줄, 칸);
  }

  async 닫기글(): Promise<string> {
    return await this.글(`${우편함창.닫기}/Text`);
  }

  async 모두받기글(): Promise<string> {
    return await this.글(`${우편함창.모두받기}/Text`);
  }

  async 칸주소(제목: string, 칸: number): Promise<string> {
    const 줄 = await this.목록.이름줄(제목);
    return 줄 === null ? '' : `${줄}/Label[${String(칸)}]/Text`;
  }
}
