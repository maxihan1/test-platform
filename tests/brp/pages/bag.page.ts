import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';

export type 장착칸 = '무기' | '갑옷' | '장신구';

export interface 가방줄 {
  주소: string;
  이름글: string;
  이름: string;
  개수: number;
  설명: string;
}

function 색떼기(글: string): string {
  return 글.replace(/<[^>]+>/g, '').trim();
}

function 안에있나(판: number[], 줄: number[]): boolean {
  const [, 판아래 = 0, , 판높이 = 0] = 판;
  const [, 줄아래 = 0, , 줄높이 = 0] = 줄;
  return 줄아래 >= 판아래 && 줄아래 + 줄높이 <= 판아래 + 판높이;
}

export class 가방창 {
  static readonly 주소 = 'game:*/Showcase HUD/Window 가방';
  static readonly 창 = '/Showcase HUD/Window 가방';
  static readonly 패널 = '/Showcase HUD/Window 가방/Panel 가방';
  static readonly 제목 = '/Showcase HUD/Window 가방/Panel 가방/TitleBar/Text';
  static readonly 닫기버튼 = '/Showcase HUD/Window 가방/Panel 가방/Button 닫기';
  static readonly 장착중글 = '/Showcase HUD/Window 가방/Panel 가방/Label[0]/Text';
  static readonly 능력줄 = '/Showcase HUD/Window 가방/Panel 가방/Gear/Label/Text';
  static readonly 줄뿌리 = '/Showcase HUD/Window 가방/Panel 가방/Scroll/Content';
  static readonly 스크롤칸 = '/Showcase HUD/Window 가방/Panel 가방/Scroll';
  static readonly 비었다는글 = '가방이 비어 있습니다';
  static readonly 장착칸들: 장착칸[] = ['무기', '갑옷', '장신구'];

  private constructor(private readonly game: GameDriver) {}

  static 칸주소(칸: 장착칸): string {
    return `${가방창.패널}/Gear/${칸}`;
  }

  static async 누르기(game: GameDriver): Promise<void> {
    await new 공통HUD(game).메뉴누르기('가방');
  }

  static async 떴나(game: GameDriver, 한도ms = 15_000): Promise<boolean> {
    return game.waitFor(가방창.제목, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  static async 열기(game: GameDriver, 한도ms = 15_000): Promise<가방창> {
    await 가방창.누르기(game);
    await game.waitFor(가방창.제목, { timeoutMs: 한도ms });
    return new 가방창(game);
  }

  private async 있나(주소: string): Promise<boolean> {
    try {
      return (await this.game.find(주소)) !== null;
    } catch (e) {
      if (e instanceof Error && e.message.includes('하나를 고를 수 없습니다')) return true;
      throw e;
    }
  }

  async 닫기(): Promise<void> {
    await this.game.click(가방창.닫기버튼);
    await this.game.waitFor(가방창.창, { gone: true, timeoutMs: 10_000 });
  }

  async 제목글(): Promise<string> {
    return this.game.text(가방창.제목);
  }

  async 장착중글읽기(): Promise<string> {
    return this.game.text(가방창.장착중글);
  }

  async 능력줄글(): Promise<string> {
    return this.game.text(가방창.능력줄);
  }

  async 칸이름글(칸: 장착칸): Promise<string> {
    return this.game.text(`${가방창.칸주소(칸)}/Label[0]/Text`);
  }

  async 칸글(칸: 장착칸): Promise<string> {
    return this.game.text(`${가방창.칸주소(칸)}/Label[1]/Text`);
  }

  async 칸설명있나(칸: 장착칸, 글: string): Promise<boolean> {
    return this.있나(`${가방창.칸주소(칸)}//*[contains(@text,"${글}")]`);
  }

  async 해제버튼있나(칸: 장착칸): Promise<boolean> {
    return this.있나(`${가방창.칸주소(칸)}/Button 해제`);
  }

  async 칸판매버튼있나(칸: 장착칸): Promise<boolean> {
    return this.있나(`${가방창.칸주소(칸)}//*[contains(@text,"판매")]`);
  }

  async 칸이될때까지(칸: 장착칸, 이름: string, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if (색떼기(await this.칸글(칸)).includes(이름)) return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 칸이비기까지(칸: 장착칸, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if (색떼기(await this.칸글(칸)) === '비어 있음') return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 해제하기(칸: 장착칸): Promise<void> {
    await this.game.click(`${가방창.칸주소(칸)}/Button 해제`);
  }

  private async 줄주소들(): Promise<string[]> {
    const 모은: string[] = [];
    for (let n = 0; n < 40; n += 1) {
      const 주소 = `${가방창.줄뿌리}/Row[${String(n)}]`;
      if ((await this.game.find(`${주소}/Label[0]/Text`)) !== null) {
        모은.push(주소);
        continue;
      }
      if (n === 0 && (await this.game.find(`${가방창.줄뿌리}/Row/Label[0]/Text`)) !== null) 모은.push(`${가방창.줄뿌리}/Row`);
      break;
    }
    return 모은;
  }

  async 줄들(): Promise<가방줄[]> {
    const 결과: 가방줄[] = [];
    for (const 주소 of await this.줄주소들()) {
      const 이름글 = await this.game.text(`${주소}/Label[0]/Text`);
      const 설명주소 = `${주소}/Label[1]/Text`;
      const 설명 = (await this.game.find(설명주소)) === null ? '' : await this.game.text(설명주소);
      const 평문 = 색떼기(이름글);
      if (평문 === 가방창.비었다는글) continue;
      const 맞음 = /^(.*?) x(\d+)$/.exec(평문);
      결과.push({ 주소, 이름글, 이름: 맞음?.[1] ?? 평문, 개수: Number(맞음?.[2] ?? 1), 설명 });
    }
    return 결과;
  }

  async 줄찾기(이름: string): Promise<가방줄 | null> {
    return (await this.줄들()).find((줄) => 줄.이름 === 이름) ?? null;
  }

  async 줄수(이름: string): Promise<number> {
    return (await this.줄들()).filter((줄) => 줄.이름 === 이름).length;
  }

  async 줄이생길때까지(이름: string, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if ((await this.줄찾기(이름)) !== null) return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 줄이사라질때까지(이름: string, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if ((await this.줄찾기(이름)) === null) return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 개수가될때까지(이름: string, 개수: number, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if ((await this.줄찾기(이름))?.개수 === 개수) return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 줄수가될때까지(이름: string, 수: number, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if ((await this.줄수(이름)) === 수) return true;
      if (Date.now() > 끝) return false;
    }
  }

  static 이름색(줄: 가방줄): string | null {
    return /<color=(#[0-9A-Fa-f]{6})>/.exec(줄.이름글)?.[1]?.toUpperCase() ?? null;
  }

  static 글색(글: string): string | null {
    return /<color=(#[0-9A-Fa-f]{6})>/.exec(글)?.[1]?.toUpperCase() ?? null;
  }

  async 줄이바뀔때까지(이름: string, 전개수: number, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      const 줄 = await this.줄찾기(이름);
      if (줄 === null || 줄.개수 !== 전개수) return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 장착버튼있나(이름: string): Promise<boolean> {
    const 줄 = await this.줄찾기(이름);
    if (줄 === null) throw new Error(`가방에 「${이름}」 줄이 없습니다`);
    return this.있나(`${줄.주소}/Button 장착`);
  }

  async 사용버튼있나(이름: string): Promise<boolean> {
    const 줄 = await this.줄찾기(이름);
    if (줄 === null) throw new Error(`가방에 「${이름}」 줄이 없습니다`);
    return this.있나(`${줄.주소}/Button 사용`);
  }

  async 판매버튼있나(이름: string): Promise<boolean> {
    const 줄 = await this.줄찾기(이름);
    if (줄 === null) throw new Error(`가방에 「${이름}」 줄이 없습니다`);
    return this.있나(`${줄.주소}//*[contains(@text,"판매")]`);
  }

  async 판매글(이름: string): Promise<string> {
    const 줄 = await this.줄찾기(이름);
    if (줄 === null) throw new Error(`가방에 「${이름}」 줄이 없습니다`);
    return this.game.text(`${줄.주소}//*[contains(@text,"판매")]`);
  }

  async 비었다는글있나(): Promise<boolean> {
    return this.있나(`${가방창.창}//*[contains(@text,"${가방창.비었다는글}")]`);
  }

  private async 보이게(줄주소: string): Promise<void> {
    for (let 시도 = 0; 시도 < 4; 시도 += 1) {
      const 판 = await this.game.find(가방창.스크롤칸);
      const 줄 = await this.game.find(줄주소);
      if (판?.rect === undefined || 줄?.rect === undefined || 안에있나(판.rect, 줄.rect)) return;
      const 주소들 = await this.줄주소들();
      const 위줄 = 주소들[0];
      let 아래보이는줄: string | undefined;
      for (const 주소 of 주소들) {
        const 칸 = await this.game.find(주소);
        if (칸?.rect !== undefined && 안에있나(판.rect, 칸.rect)) 아래보이는줄 = 주소;
      }
      if (위줄 === undefined || 아래보이는줄 === undefined || 아래보이는줄 === 위줄) return;
      await this.game.drag(아래보이는줄, 위줄);
    }
  }

  private async 줄열기(이름: string): Promise<가방줄> {
    const 줄 = await this.줄찾기(이름);
    if (줄 === null) throw new Error(`가방에 「${이름}」 줄이 없습니다`);
    await this.보이게(줄.주소);
    return 줄;
  }

  async 장착하기(이름: string): Promise<void> {
    const 줄 = await this.줄열기(이름);
    await this.game.click(`${줄.주소}/Button 장착`);
  }

  async 사용하기(이름: string): Promise<void> {
    const 줄 = await this.줄열기(이름);
    await this.game.click(`${줄.주소}/Button 사용`);
  }

  async 판매하기(이름: string, 번 = 1): Promise<string> {
    const 줄 = await this.줄열기(이름);
    const 글 = await this.game.text(`${줄.주소}//*[contains(@text,"판매")]`);
    const 값 = /(\d+)\s*G/.exec(글)?.[1];
    if (값 === undefined) throw new Error(`판매 버튼 글에서 판매가를 못 읽었습니다: 「${글}」`);
    await this.game.click(`${줄.주소}/Button 판매 ${값}G`, 번 > 1 ? { count: 번, interval: 0.05 } : undefined);
    return 글;
  }

  async 모두팔기(한도ms = 40_000): Promise<void> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      const 줄 = (await this.줄들())[0];
      if (줄 === undefined) return;
      if (Date.now() > 끝) throw new Error('가방을 제한 시간 안에 비우지 못했습니다');
      await this.판매하기(줄.이름);
      await this.줄이바뀔때까지(줄.이름, 줄.개수);
    }
  }
}
