import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';

export interface 퀘스트줄 {
  주소: string;
  이름: string;
  보상글: string;
  진행글: string;
}

export class 퀘스트창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 일일 퀘스트';
  static readonly 창 = '/Showcase HUD/Window 일일 퀘스트';
  static readonly 패널 = '/Showcase HUD/Window 일일 퀘스트/Panel 일일 퀘스트';
  static readonly 제목 = '/Showcase HUD/Window 일일 퀘스트/Panel 일일 퀘스트/TitleBar/Text';
  static readonly 닫기버튼 = '/Showcase HUD/Window 일일 퀘스트/Panel 일일 퀘스트/Button 닫기';
  static readonly 줄뿌리 = '/Showcase HUD/Window 일일 퀘스트/Panel 일일 퀘스트/Scroll/Content';

  private constructor(private readonly game: GameDriver) {}

  static async 누르기(game: GameDriver): Promise<void> {
    await new 공통HUD(game).메뉴누르기('퀘스트');
  }

  static async 떴나(game: GameDriver, 한도ms = 15_000): Promise<boolean> {
    return game.waitFor(퀘스트창.제목, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  static async 열기(game: GameDriver, 한도ms = 15_000): Promise<퀘스트창> {
    await 퀘스트창.누르기(game);
    await game.waitFor(퀘스트창.제목, { timeoutMs: 한도ms });
    return new 퀘스트창(game);
  }

  static 줄주소(번: number): string {
    return `${퀘스트창.줄뿌리}/Row[${String(번)}]`;
  }

  async 닫기(): Promise<void> {
    await this.game.click(퀘스트창.닫기버튼);
    await this.game.waitFor(퀘스트창.창, { gone: true, timeoutMs: 10_000 });
  }

  async 제목글(): Promise<string> {
    return this.game.text(퀘스트창.제목);
  }

  async 줄들(): Promise<퀘스트줄[]> {
    const 결과: 퀘스트줄[] = [];
    for (let n = 0; n < 10; n += 1) {
      const 주소 = 퀘스트창.줄주소(n);
      if ((await this.game.find(`${주소}/Label[0]/Text`)) === null) break;
      결과.push({
        주소,
        이름: (await this.game.text(`${주소}/Label[0]/Text`)).trim(),
        보상글: await this.game.text(`${주소}/Label[1]/Text`),
        진행글: (await this.game.text(`${주소}/Label[2]/Text`)).trim(),
      });
    }
    return 결과;
  }

  async 줄찾기(이름: string): Promise<퀘스트줄 | null> {
    return (await this.줄들()).find((줄) => 줄.이름 === 이름) ?? null;
  }

  private async 줄열기(이름: string): Promise<퀘스트줄> {
    const 줄 = await this.줄찾기(이름);
    if (줄 === null) throw new Error(`일일 퀘스트에 「${이름}」 줄이 없습니다`);
    return 줄;
  }

  async 진행글(이름: string): Promise<string> {
    return (await this.줄열기(이름)).진행글;
  }

  async 목표(이름: string): Promise<number> {
    return Number((await this.진행글(이름)).split('/')[1]);
  }

  async 받기눌림(이름: string): Promise<boolean | undefined> {
    const 줄 = await this.줄열기(이름);
    return (await this.game.find(`${줄.주소}/Button 보상 받기`))?.interactable;
  }

  async 받음글(이름: string): Promise<string | null> {
    const 줄 = await this.줄열기(이름);
    const 주소 = `${줄.주소}/Label[3]/Text`;
    return (await this.game.find(주소)) === null ? null : (await this.game.text(주소)).trim();
  }

  async 보상받기(이름: string): Promise<void> {
    const 줄 = await this.줄열기(이름);
    await this.game.click(`${줄.주소}/Button 보상 받기`);
  }

  async 진행이될때까지(이름: string, 글: string, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if ((await this.진행글(이름)) === 글) return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 받음이될때까지(이름: string, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if ((await this.받음글(이름)) === '받음') return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 받기버튼있나(이름: string): Promise<boolean> {
    const 줄 = await this.줄열기(이름);
    return (await this.game.find(`${줄.주소}/Button 보상 받기`)) !== null;
  }

  async 받음글원색(이름: string): Promise<unknown> {
    const 줄 = await this.줄열기(이름);
    return this.game.get(`${줄.주소}/Label[3]/Text`, 'TextMeshProUGUI.color');
  }

  async 진행수(이름: string): Promise<number> {
    return Number((await this.진행글(이름)).split('/')[0]);
  }

  async 진행수가바뀔때까지(이름: string, 전: number, 한도ms = 15_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if ((await this.진행수(이름)) !== 전) return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 진행막대있나(줄: string): Promise<boolean> {
    return (await this.game.find(`${줄}/Bar/Fill`)) !== null;
  }

  async 줄바탕색(줄: string): Promise<number[]> {
    return (await this.game.get(줄, 'Image.color')) as number[];
  }
}
