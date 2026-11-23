import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';

export interface 상점줄 {
  주소: string;
  이름글: string;
  이름: string;
  설명: string;
  가격글: string;
  가격: number;
}

function 색떼기(글: string): string {
  return 글.replace(/<[^>]+>/g, '').trim();
}

function 안에있나(판: number[], 줄: number[]): boolean {
  const [, 판아래 = 0, , 판높이 = 0] = 판;
  const [, 줄아래 = 0, , 줄높이 = 0] = 줄;
  return 줄아래 >= 판아래 && 줄아래 + 줄높이 <= 판아래 + 판높이;
}

export class 상점창 {
  static readonly 주소 = 'game:*/Showcase HUD/Window 상점';
  static readonly 창 = '/Showcase HUD/Window 상점';
  static readonly 패널 = '/Showcase HUD/Window 상점/Panel 상점';
  static readonly 제목 = '/Showcase HUD/Window 상점/Panel 상점/TitleBar/Text';
  static readonly 닫기버튼 = '/Showcase HUD/Window 상점/Panel 상점/Button 닫기';
  static readonly 보유골드 = '/Showcase HUD/Window 상점/Panel 상점/Label/Text';
  static readonly 줄뿌리 = '/Showcase HUD/Window 상점/Panel 상점/Scroll/Content';
  static readonly 스크롤칸 = '/Showcase HUD/Window 상점/Panel 상점/Scroll';

  private constructor(private readonly game: GameDriver) {}

  static async 누르기(game: GameDriver): Promise<void> {
    await new 공통HUD(game).메뉴누르기('상점');
  }

  static async 떴나(game: GameDriver, 한도ms = 15_000): Promise<boolean> {
    return game.waitFor(상점창.제목, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  static async 열기(game: GameDriver, 한도ms = 15_000): Promise<상점창> {
    await 상점창.누르기(game);
    await game.waitFor(상점창.제목, { timeoutMs: 한도ms });
    return new 상점창(game);
  }

  static 줄주소(번: number): string {
    return `${상점창.줄뿌리}/Row[${String(번)}]`;
  }

  async 닫기(): Promise<void> {
    await this.game.click(상점창.닫기버튼);
    await this.game.waitFor(상점창.창, { gone: true, timeoutMs: 10_000 });
  }

  async 제목글(): Promise<string> {
    return this.game.text(상점창.제목);
  }

  async 보유골드글(): Promise<string> {
    return this.game.text(상점창.보유골드);
  }

  async 보유골드(): Promise<number> {
    return Number((await this.보유골드글()).replace(/<[^>]+>/g, '').replace(/[^0-9]/g, ''));
  }

  async 보유골드가바뀔때까지(전: number, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if ((await this.보유골드()) !== 전) return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 줄주소들(): Promise<string[]> {
    const 모은: string[] = [];
    for (let n = 0; n < 40; n += 1) {
      if ((await this.game.find(`${상점창.줄주소(n)}/Label[0]/Text`)) === null) break;
      모은.push(상점창.줄주소(n));
    }
    return 모은;
  }

  async 줄들(): Promise<상점줄[]> {
    const 결과: 상점줄[] = [];
    for (const 주소 of await this.줄주소들()) {
      const 이름글 = await this.game.text(`${주소}/Label[0]/Text`);
      const 설명 = await this.game.text(`${주소}/Label[1]/Text`);
      const 가격글 = await this.game.text(`${주소}/Label[2]/Text`);
      결과.push({ 주소, 이름글, 이름: 색떼기(이름글), 설명, 가격글, 가격: Number(가격글.replace(/[^0-9]/g, '')) });
    }
    return 결과;
  }

  async 줄찾기(이름: string): Promise<상점줄 | null> {
    return (await this.줄들()).find((줄) => 줄.이름 === 이름) ?? null;
  }

  async 구매글(이름: string): Promise<string> {
    const 줄 = await this.줄열기(이름);
    return this.game.text(`${줄.주소}/Button 구매/Text`);
  }

  async 판매버튼있나(): Promise<boolean> {
    try {
      return (await this.game.find(`${상점창.창}//*[contains(@text,"판매")]`)) !== null;
    } catch (e) {
      if (e instanceof Error && e.message.includes('하나를 고를 수 없습니다')) return true;
      throw e;
    }
  }

  async 줄보이나(이름: string): Promise<boolean> {
    const 줄 = await this.줄찾기(이름);
    if (줄 === null) return false;
    const 판 = await this.game.find(상점창.스크롤칸);
    const 칸 = await this.game.find(줄.주소);
    if (판?.rect === undefined || 칸?.rect === undefined) return false;
    return 안에있나(판.rect, 칸.rect);
  }

  async 끌어넘기기(): Promise<void> {
    const 판 = await this.game.find(상점창.스크롤칸);
    const 주소들 = await this.줄주소들();
    const 위줄 = 주소들[0];
    if (판?.rect === undefined || 위줄 === undefined) return;
    let 아래보이는줄: string | undefined;
    for (const 주소 of 주소들) {
      const 칸 = await this.game.find(주소);
      if (칸?.rect !== undefined && 안에있나(판.rect, 칸.rect)) 아래보이는줄 = 주소;
    }
    if (아래보이는줄 === undefined || 아래보이는줄 === 위줄) return;
    await this.game.drag(아래보이는줄, 위줄);
  }

  private async 줄열기(이름: string): Promise<상점줄> {
    const 줄 = await this.줄찾기(이름);
    if (줄 === null) throw new Error(`상점에 「${이름}」 줄이 없습니다`);
    for (let 시도 = 0; 시도 < 4 && !(await this.줄보이나(이름)); 시도 += 1) await this.끌어넘기기();
    return 줄;
  }

  async 구매버튼눌림(이름: string): Promise<boolean | undefined> {
    const 줄 = await this.줄열기(이름);
    return (await this.game.find(`${줄.주소}/Button 구매`))?.interactable;
  }

  async 구매하기(이름: string): Promise<void> {
    await this.끌어서보이게(이름);
    const 줄 = await this.줄열기(이름);
    await this.game.click(`${줄.주소}/Button 구매`);
  }

  async 두번구매하기(이름: string): Promise<void> {
    const 줄 = await this.줄열기(이름);
    await this.game.click(`${줄.주소}/Button 구매`, { count: 2, interval: 0.05 });
  }

  async 구매버튼있는줄수(): Promise<number> {
    let 수 = 0;
    for (const 주소 of await this.줄주소들()) {
      if ((await this.game.find(`${주소}/Button 구매`)) !== null) 수 += 1;
    }
    return 수;
  }

  async 끌어서보이게(이름: string): Promise<boolean> {
    for (let 시도 = 0; 시도 < 6; 시도 += 1) {
      const 줄 = await this.줄찾기(이름);
      const 판 = await this.game.find(상점창.스크롤칸);
      const 칸 = 줄 === null ? null : await this.game.find(줄.주소);
      if (판?.rect === undefined || 칸?.rect === undefined || 칸 === null) return false;
      if (안에있나(판.rect, 칸.rect)) return true;
      const 보이는: string[] = [];
      for (const 주소 of await this.줄주소들()) {
        const 다른칸 = await this.game.find(주소);
        if (다른칸?.rect !== undefined && 안에있나(판.rect, 다른칸.rect)) 보이는.push(주소);
      }
      const 첫 = 보이는[0];
      const 끝 = 보이는[보이는.length - 1];
      if (첫 === undefined || 끝 === undefined || 첫 === 끝) return false;
      const 위에있나 = (칸.rect[1] ?? 0) > (판.rect[1] ?? 0);
      await (위에있나 ? this.game.drag(첫, 끝) : this.game.drag(끝, 첫));
    }
    return this.줄보이나(이름);
  }
}
