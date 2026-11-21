import type { GameDriver } from '@platform/kit';

import { 공통HUD, 색뗀글 } from '../components/hud.component.js';

export class 퀘스트창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 일일 퀘스트';
  static readonly 창 = '/Showcase HUD/Window 일일 퀘스트';
  static readonly 판 = '/Showcase HUD/Window 일일 퀘스트/Panel 일일 퀘스트';
  static readonly 가림막 = '/Showcase HUD/Window 일일 퀘스트/Shade';
  static readonly 닫기버튼 = '/Showcase HUD/Window 일일 퀘스트/Panel 일일 퀘스트/Button 닫기';
  static readonly 제목줄 = '/Showcase HUD/Window 일일 퀘스트/Panel 일일 퀘스트/TitleBar/Text';
  static readonly 줄 = '/Showcase HUD/Window 일일 퀘스트/Panel 일일 퀘스트/Scroll/Content/Row';

  readonly hud: 공통HUD;

  constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<퀘스트창> {
    await 공통HUD.창열기(game, '/Showcase HUD/Menu/Button 퀘스트', '일일 퀘스트');
    return new 퀘스트창(game);
  }

  static 줄주소(번호: number): string {
    return `${퀘스트창.줄}[${String(번호)}]`;
  }

  async 제목(): Promise<string> {
    return 색뗀글(await this.game.text(퀘스트창.제목줄));
  }

  async 닫기(): Promise<void> {
    await this.game.click(퀘스트창.닫기버튼);
  }

  async 가림막누르기(): Promise<void> {
    await this.game.click(퀘스트창.가림막, { at: [0.05, 0.05] });
  }

  async 닫힐때까지(한도ms = 5_000): Promise<boolean> {
    return this.game.waitFor(퀘스트창.창, { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 칸글(주소: string): Promise<string | null> {
    const 찾음 = await this.game.find(주소);
    return 찾음 === null ? null : 색뗀글(찾음.text ?? '');
  }

  async 줄찾기(글: string, 최대 = 40): Promise<number | null> {
    for (let 번호 = 0; 번호 < 최대; 번호 += 1) {
      if ((await this.game.find(퀘스트창.줄주소(번호))) === null) return null;
      if ((await this.game.find(`${퀘스트창.줄주소(번호)}/Label[0]/Text[contains(@text,${글})]`)) !== null) return 번호;
    }
    return null;
  }

  async 줄수(최대 = 60): Promise<number> {
    let 수 = 0;
    while (수 < 최대 && (await this.game.find(퀘스트창.줄주소(수))) !== null) 수 += 1;
    return 수;
  }

  async 줄이름(번호: number): Promise<string | null> {
    return this.칸글(`${퀘스트창.줄주소(번호)}/Label[0]/Text`);
  }

  async 줄보상(번호: number): Promise<string | null> {
    return this.칸글(`${퀘스트창.줄주소(번호)}/Label[1]/Text`);
  }

  async 줄진행(번호: number): Promise<string | null> {
    return this.칸글(`${퀘스트창.줄주소(번호)}/Label[2]/Text`);
  }

  async 줄진행이될때까지(번호: number, 글: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(`${퀘스트창.줄주소(번호)}/Label[2]/Text`, { text: 글, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 보상버튼있나(번호: number): Promise<boolean> {
    return (await this.game.find(`${퀘스트창.줄주소(번호)}/Button 보상 받기`)) !== null;
  }

  async 보상버튼눌림(번호: number): Promise<boolean> {
    return (await this.game.get(`${퀘스트창.줄주소(번호)}/Button 보상 받기`, 'Button.interactable')) === true;
  }

  async 보상받기(번호: number): Promise<void> {
    await this.game.click(`${퀘스트창.줄주소(번호)}/Button 보상 받기`);
  }

  async 받음글(번호: number): Promise<string | null> {
    return this.칸글(`${퀘스트창.줄주소(번호)}//*[contains(@text,받음)]`);
  }

  async 줄이름들(최대 = 60): Promise<string[]> {
    const 이름들: string[] = [];
    for (let 번호 = 0; 번호 < 최대; 번호 += 1) {
      const 글 = await this.줄이름(번호);
      if (글 === null) break;
      이름들.push(글);
    }
    return 이름들;
  }

  async 줄보상들(최대 = 60): Promise<string[]> {
    const 글들: string[] = [];
    for (let 번호 = 0; 번호 < 최대; 번호 += 1) {
      const 글 = await this.줄보상(번호);
      if (글 === null) break;
      글들.push(글);
    }
    return 글들;
  }

  async 받음원문(번호: number): Promise<string | null> {
    const 찾음 = await this.game.find(`${퀘스트창.줄주소(번호)}//*[contains(@text,받음)]`);
    return 찾음 === null ? null : (찾음.text ?? '');
  }

  async 진행막대색(번호: number): Promise<number[]> {
    return (await this.game.get(`${퀘스트창.줄주소(번호)}/Bar/Fill`, 'Image.color')) as number[];
  }

  async 줄바탕색(번호: number): Promise<number[]> {
    return (await this.game.get(퀘스트창.줄주소(번호), 'Image.color')) as number[];
  }
}
