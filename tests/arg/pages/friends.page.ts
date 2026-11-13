import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';
import { 색벗기기 } from '../helpers/find.helper.js';

const 창 = '/Showcase HUD/Window 친구 · 파티';
const 판 = `${창}/Panel 친구 · 파티`;

export class 친구창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 친구 · 파티';
  static readonly 창 = 창;
  static readonly 제목 = `${판}/TitleBar/Text`;
  static readonly 닫기 = `${판}/Button 닫기`;
  static readonly 이름칸 = `${판}/Input 캐릭터 이름`;
  static readonly 이름안내 = `${판}/Input 캐릭터 이름/Text Area/Text[0]`;
  static readonly 친구신청 = `${판}/Button 친구 신청`;
  static readonly 파티초대 = `${판}/Button 파티 초대`;
  static readonly 목록 = `${판}/Scroll/Content`;

  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<친구창> {
    await new 공통HUD(game).창열기('친구', 친구창.제목);
    return new 친구창(game);
  }

  async 이름넣기(이름: string): Promise<string> {
    return this.game.type(친구창.이름칸, 이름);
  }

  async 친구신청누르기(): Promise<void> {
    await this.game.click(친구창.친구신청);
  }

  async 파티초대누르기(): Promise<void> {
    await this.game.click(친구창.파티초대);
  }

  async 목록글들(): Promise<string[]> {
    const 글들: string[] = [];
    for (let i = 0; i < 60; i += 1) {
      const 줄 = `${친구창.목록}/Row[${i}]`;
      if ((await this.game.find(줄)) === null) break;
      const 칸 = (await this.game.find(`${줄}/Text`)) !== null ? `${줄}/Text` : `${줄}/Label/Text`;
      글들.push(색벗기기(await this.game.text(칸)));
    }
    return 글들;
  }

  async 줄원문(글: string): Promise<string | null> {
    const 찾음 = await this.game.find(`${친구창.목록}//*[contains(@text,${글})]`);
    return 찾음?.text ?? null;
  }

  async 줄보이는지(글: string): Promise<boolean> {
    return (await this.game.find(`${친구창.목록}//*[contains(@text,${글})]`)) !== null;
  }

  async 친구줄(이름: string): Promise<string | null> {
    const 원문 = await this.줄원문(이름);
    return 원문 === null ? null : 색벗기기(원문);
  }

  async 제목글(): Promise<string> {
    return this.game.text(친구창.제목);
  }

  async 안내글(): Promise<string> {
    return this.game.text(친구창.이름안내);
  }

  async 친구신청글(): Promise<string> {
    return this.game.text(`${친구창.친구신청}/Text`);
  }

  async 파티초대글(): Promise<string> {
    return this.game.text(`${친구창.파티초대}/Text`);
  }

  async 닫기글(): Promise<string> {
    return this.game.text(`${친구창.닫기}/Text`);
  }

  async 줄뜨는지(글: string, timeoutMs = 10_000): Promise<boolean> {
    return this.game.waitFor(`${친구창.목록}//*[contains(@text,${글})]`, { timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(친구창.닫기);
    await this.game.waitFor(창, { gone: true, timeoutMs: 10_000 });
  }
}
