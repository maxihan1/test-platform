import type { GameDriver } from '@platform/kit';

import { 공통HUD, 글만 } from '../components/hud.component.js';
import { 목록 } from '../components/list.component.js';

export class 가방창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 가방';
  static readonly 창 = '/Showcase HUD/Window 가방';
  static readonly 바깥 = '/Showcase HUD/Window 가방/Shade';
  static readonly 제목 = '/Showcase HUD/Window 가방/Panel 가방/TitleBar/Text';
  static readonly 닫기 = '/Showcase HUD/Window 가방/Panel 가방/Button 닫기';
  static readonly 내용 = '/Showcase HUD/Window 가방/Panel 가방/Scroll/Content';

  readonly 목록: 목록;
  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.목록 = new 목록(game, 가방창.내용);
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<가방창> {
    if ((await game.find(가방창.창)) === null) await game.click(공통HUD.메뉴버튼('가방'));
    await game.waitFor(가방창.제목, { timeoutMs: 10_000 });
    return new 가방창(game);
  }

  static 지금(game: GameDriver): 가방창 {
    return new 가방창(game);
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(가방창.닫기);
    await this.game.waitFor(가방창.창, { gone: true, timeoutMs: 10_000 });
  }

  async 열렸나(): Promise<boolean> {
    return (await this.game.find(가방창.창)) !== null;
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

  static 장착칸(칸: '무기' | '갑옷' | '장신구'): string {
    return `/Showcase HUD/Window 가방/Panel 가방/Gear/${칸}`;
  }

  static readonly 능력줄 = '/Showcase HUD/Window 가방/Panel 가방/Gear/Label/Text';
  static readonly 장착중글 = '/Showcase HUD/Window 가방/Panel 가방/Label[0]/Text';
  static readonly 가방글 = '/Showcase HUD/Window 가방/Panel 가방/Label[1]/Text';
  static readonly 빈가방 = '//*[contains(@text,가방이 비어 있습니다)]';

  async 장착칸글(칸: '무기' | '갑옷' | '장신구'): Promise<string> {
    return await this.글(`${가방창.장착칸(칸)}/Label[1]/Text`);
  }

  async 해제누르기(칸: '무기' | '갑옷' | '장신구'): Promise<void> {
    await this.game.click(`${가방창.장착칸(칸)}/Button 해제`);
  }

  async 장착(이름: string): Promise<boolean> {
    return await this.줄버튼누르기(이름, '장착');
  }

  async 판매(이름: string): Promise<boolean> {
    return await this.줄버튼누르기(이름, '판매');
  }

  async 사용(이름: string): Promise<boolean> {
    return await this.줄버튼누르기(이름, '사용');
  }

  async 줄칸글(이름: string, 칸: number): Promise<string> {
    const 줄 = await this.목록.이름줄(이름);
    return 줄 === null ? '' : await this.목록.칸글(줄, 칸);
  }

  async 이름글자색(이름: string): Promise<string> {
    const 줄 = await this.목록.이름줄(이름);
    if (줄 === null) return '';
    const 찾은것 = await this.game.find(`${줄}/Label[0]/Text`);
    return (/<color=(#[0-9A-Fa-f]{6})/.exec(찾은것?.text ?? '')?.[1] ?? '').toUpperCase();
  }

  async 해제버튼있나(칸: '무기' | '갑옷' | '장신구'): Promise<boolean> {
    return (await this.game.find(`${가방창.장착칸(칸)}/Button 해제`)) !== null;
  }

  async 장착칸이름글(칸: '무기' | '갑옷' | '장신구'): Promise<string> {
    return await this.글(`${가방창.장착칸(칸)}/Label[0]/Text`);
  }

  async 닫기글(): Promise<string> {
    return await this.글(`${가방창.닫기}/Text`);
  }

  async 줄버튼글(이름: string, 앞글: string): Promise<string | null> {
    const 줄 = await this.목록.이름줄(이름);
    if (줄 === null) return null;
    const 주소 = await this.목록.줄버튼(줄, 앞글);
    return 주소 === null ? null : await this.글(`${주소}/Text`);
  }

  async 장착칸설명글(칸: '무기' | '갑옷' | '장신구'): Promise<string> {
    return await this.글(`${가방창.장착칸(칸)}/Label[2]/Text`);
  }
}
