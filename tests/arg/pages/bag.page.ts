import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';
import { 색벗기기, 줄글들, 줄수 } from '../helpers/find.helper.js';

const 창 = '/Showcase HUD/Window 가방';
const 판 = `${창}/Panel 가방`;

export type 장착칸 = '무기' | '갑옷' | '장신구';

export class 가방창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 가방';
  static readonly 창 = 창;
  static readonly 제목 = `${판}/TitleBar/Text`;
  static readonly 닫기 = `${판}/Button 닫기`;
  static readonly 바깥 = `${창}/Shade`;
  static readonly 장착중 = `${판}/Label[0]/Text`;
  static readonly 가방제목 = `${판}/Label[1]/Text`;
  static readonly 능력줄 = `${판}/Gear/Label/Text`;
  static readonly 목록 = `${판}/Scroll/Content`;

  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<가방창> {
    await new 공통HUD(game).창열기('가방', 가방창.제목);
    return new 가방창(game);
  }

  static 칸(이름: 장착칸): string {
    return `${판}/Gear/${이름}`;
  }

  static 줄(번호: number): string {
    return `${가방창.목록}/Row[${번호}]`;
  }

  async 칸이름(이름: 장착칸): Promise<string> {
    return 색벗기기(await this.game.text(`${가방창.칸(이름)}/Label[1]/Text`));
  }

  async 칸이름원문(이름: 장착칸): Promise<string> {
    return this.game.text(`${가방창.칸(이름)}/Label[1]/Text`);
  }

  async 칸설명(이름: 장착칸): Promise<string> {
    return this.game.text(`${가방창.칸(이름)}/Label[2]/Text`);
  }

  async 해제있는지(이름: 장착칸): Promise<boolean> {
    return (await this.game.find(`${가방창.칸(이름)}/Button 해제`)) !== null;
  }

  async 해제누르기(이름: 장착칸): Promise<void> {
    await this.game.click(`${가방창.칸(이름)}/Button 해제`);
  }

  async 능력줄글(): Promise<string> {
    return this.game.text(가방창.능력줄);
  }

  async 줄수(): Promise<number> {
    return 줄수(this.game, 가방창.목록);
  }

  async 이름들(): Promise<string[]> {
    return 줄글들(this.game, 가방창.목록, 'Label[0]/Text');
  }

  async 이름원문(번호: number): Promise<string> {
    return this.game.text(`${가방창.줄(번호)}/Label[0]/Text`);
  }

  async 줄찾기(이름: string): Promise<number> {
    const 이름들 = await this.이름들();
    return 이름들.findIndex((글) => 글 === 이름 || 글.startsWith(`${이름} x`));
  }

  async 줄개수(이름: string): Promise<number> {
    return (await this.이름들()).filter((글) => 글 === 이름 || 글.startsWith(`${이름} x`)).length;
  }

  async 묶음수(이름: string): Promise<number> {
    const 글 = (await this.이름들()).find((x) => x === 이름 || x.startsWith(`${이름} x`));
    if (글 === undefined) return 0;
    const 맞음 = / x(\d+)$/.exec(글);
    return 맞음 === null ? 1 : Number(맞음[1]);
  }

  async 줄버튼있는지(번호: number, 버튼: string): Promise<boolean> {
    return (await this.game.find(`${가방창.줄(번호)}/*[contains(@name,${버튼})]`)) !== null;
  }

  async 줄버튼누르기(번호: number, 버튼: string): Promise<void> {
    await this.game.click(`${가방창.줄(번호)}/*[contains(@name,${버튼})]`);
  }

  async 줄버튼글(번호: number, 버튼: string): Promise<string> {
    return this.game.text(`${가방창.줄(번호)}/*[contains(@name,${버튼})]/Text`);
  }

  async 장착하기(이름: string): Promise<void> {
    const 번호 = await this.줄찾기(이름);
    if (번호 < 0) throw new Error(`가방에 「${이름}」 줄이 없다`);
    await this.줄버튼누르기(번호, '장착');
    await this.game.waitFor(`${가방창.칸('무기')}/Label[1]/Text`, { timeoutMs: 10_000 });
  }

  async 판매하기(이름: string): Promise<void> {
    const 번호 = await this.줄찾기(이름);
    if (번호 < 0) throw new Error(`가방에 「${이름}」 줄이 없다`);
    await this.줄버튼누르기(번호, '판매');
  }

  async 사용하기(이름: string): Promise<void> {
    const 번호 = await this.줄찾기(이름);
    if (번호 < 0) throw new Error(`가방에 「${이름}」 줄이 없다`);
    await this.줄버튼누르기(번호, '사용');
  }

  async 제목글(): Promise<string> {
    return this.game.text(가방창.제목);
  }

  async 장착중글(): Promise<string> {
    return this.game.text(가방창.장착중);
  }

  async 칸라벨(이름: 장착칸): Promise<string> {
    return this.game.text(`${가방창.칸(이름)}/Label[0]/Text`);
  }

  async 닫기글(): Promise<string> {
    return this.game.text(`${가방창.닫기}/Text`);
  }

  async 칸이될때까지(이름: 장착칸, 글: string, timeoutMs = 10_000): Promise<boolean> {
    return this.game.waitFor(`${가방창.칸(이름)}/Label[1]/Text`, { text: 글, timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 개수읽기(이름: string): Promise<number> {
    const 줄들 = await this.줄개수(이름);
    return 줄들 > 1 ? 줄들 : this.묶음수(이름);
  }

  async 해제하기(이름: 장착칸): Promise<boolean> {
    await this.해제누르기(이름);
    return this.칸이될때까지(이름, '비어 있음');
  }

  async 줄버튼요약(이름: string, 버튼들: string[]): Promise<string> {
    const 번호 = await this.줄찾기(이름);
    if (번호 < 0) return '줄 없음';
    const 글들: string[] = [];
    for (const 버튼 of 버튼들) {
      글들.push((await this.줄버튼있는지(번호, 버튼)) ? await this.줄버튼글(번호, 버튼) : `${버튼} 없음`);
    }
    return 글들.join(' · ');
  }

  async 판매버튼글들(): Promise<string[]> {
    const 수 = await this.줄수();
    const 글들: string[] = [];
    for (let i = 0; i < 수; i += 1) {
      if (await this.줄버튼있는지(i, '판매')) 글들.push(await this.줄버튼글(i, '판매'));
    }
    return 글들;
  }

  async 능력줄읽기(): Promise<{ 꼴맞음: boolean; 레벨: number; 골드: number }> {
    const 맞음 = /^Lv\.(\d+) · 골드 ([\d,]+)$/.exec(색벗기기(await this.능력줄글()).trim());
    if (맞음 === null) return { 꼴맞음: false, 레벨: -1, 골드: -1 };
    return { 꼴맞음: true, 레벨: Number(맞음[1]), 골드: Number((맞음[2] ?? '').replace(/,/g, '')) };
  }

  async 닫기버튼누르기(): Promise<void> {
    await this.game.click(가방창.닫기);
  }

  async 닫히는지(): Promise<boolean> {
    return this.game.waitFor(창, { gone: true, timeoutMs: 10_000 }).then(
      () => true,
      () => false,
    );
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(가방창.닫기);
    await this.game.waitFor(창, { gone: true, timeoutMs: 10_000 });
  }
}
