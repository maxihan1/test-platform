import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';
import { 뜨는지, 줄글들 } from '../helpers/find.helper.js';

const 창 = '/Showcase HUD/Window 일일 퀘스트';
const 판 = `${창}/Panel 일일 퀘스트`;

export class 퀘스트창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 일일 퀘스트';
  static readonly 창 = 창;
  static readonly 제목 = `${판}/TitleBar/Text`;
  static readonly 닫기 = `${판}/Button 닫기`;
  static readonly 목록 = `${판}/Scroll/Content`;

  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<퀘스트창> {
    await new 공통HUD(game).창열기('퀘스트', 퀘스트창.제목);
    return new 퀘스트창(game);
  }

  static 줄(번호: number): string {
    return `${퀘스트창.목록}/Row[${번호}]`;
  }

  async 이름들(): Promise<string[]> {
    return 줄글들(this.game, 퀘스트창.목록, 'Label[0]/Text');
  }

  async 보상들(): Promise<string[]> {
    return 줄글들(this.game, 퀘스트창.목록, 'Label[1]/Text');
  }

  async 진행들(): Promise<string[]> {
    return 줄글들(this.game, 퀘스트창.목록, 'Label[2]/Text');
  }

  async 줄찾기(이름: string): Promise<number> {
    const 번호 = (await this.이름들()).indexOf(이름);
    if (번호 < 0) throw new Error(`퀘스트 창에 「${이름}」 줄이 없다`);
    return 번호;
  }

  async 진행(이름: string): Promise<string> {
    return this.game.text(`${퀘스트창.줄(await this.줄찾기(이름))}/Label[2]/Text`);
  }

  async 보상받기버튼(이름: string): Promise<{ 있음: boolean; 누름: boolean }> {
    const 찾음 = await this.game.find(`${퀘스트창.줄(await this.줄찾기(이름))}/Button 보상 받기`);
    return { 있음: 찾음 !== null, 누름: 찾음?.interactable === true };
  }

  async 보상받기누르기(이름: string): Promise<void> {
    await this.game.click(`${퀘스트창.줄(await this.줄찾기(이름))}/Button 보상 받기`);
  }

  async 받음있는지(이름: string): Promise<boolean> {
    return (await this.game.find(`${퀘스트창.줄(await this.줄찾기(이름))}//*[contains(@text,받음)]`)) !== null;
  }

  async 제목글(): Promise<string> {
    return this.game.text(퀘스트창.제목);
  }

  async 수락버튼있는지(): Promise<boolean> {
    return (await this.game.find(`${창}//*[contains(@name,수락)]`)) !== null;
  }

  async 받음표시가뜨는지(이름: string): Promise<boolean> {
    return 뜨는지(this.game, `${퀘스트창.줄(await this.줄찾기(이름))}//*[contains(@text,받음)]`);
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(퀘스트창.닫기);
    await this.game.waitFor(창, { gone: true, timeoutMs: 10_000 });
  }
}
