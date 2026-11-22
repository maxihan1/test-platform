import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';

function 색태그떼기(글: string): string {
  return 글.replace(/<[^>]+>/g, '').trim();
}

export class 우편함창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 우편함';
  static readonly 창 = '/Showcase HUD/Window 우편함';
  static readonly 패널 = '/Showcase HUD/Window 우편함/Panel 우편함';
  static readonly 제목 = '/Showcase HUD/Window 우편함/Panel 우편함/TitleBar/Text';
  static readonly 닫기버튼 = '/Showcase HUD/Window 우편함/Panel 우편함/Button 닫기';
  static readonly 모두받기버튼 = '/Showcase HUD/Window 우편함/Panel 우편함/Button 모두 받기';
  static readonly 빈안내 = '/Showcase HUD/Window 우편함/Panel 우편함/Scroll/Content/Row/Label/Text';
  static readonly 줄뿌리 = '/Showcase HUD/Window 우편함/Panel 우편함/Scroll/Content';
  static readonly 빈안내글 = '받은 우편이 없습니다';

  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열려있나(game: GameDriver): Promise<boolean> {
    return (await game.find(우편함창.창)) !== null;
  }

  static async 열기(game: GameDriver): Promise<우편함창> {
    const 창 = new 우편함창(game);
    if (!(await 우편함창.열려있나(game))) {
      await 창.hud.메뉴누르기('우편');
      await game.waitFor(우편함창.창, { timeoutMs: 10_000 });
    }
    return 창;
  }

  async 닫기(): Promise<void> {
    if (!(await 우편함창.열려있나(this.game))) return;
    await this.game.click(우편함창.닫기버튼);
    await this.game.waitFor(우편함창.창, { gone: true, timeoutMs: 10_000 });
  }

  async 제목글(): Promise<string> {
    return this.game.text(우편함창.제목);
  }

  줄주소(번호: number): string {
    return `${우편함창.줄뿌리}/Row[${String(번호)}]`;
  }

  async 제목원문(번호: number): Promise<string> {
    return this.game.text(`${this.줄주소(번호)}/Label[0]/Text`);
  }

  async 둘째글(번호: number): Promise<string> {
    return this.game.text(`${this.줄주소(번호)}/Label[1]/Text`);
  }

  async 첨부글(번호: number): Promise<string> {
    return this.game.text(`${this.줄주소(번호)}/Label[2]/Text`);
  }

  첨부주소(번호: number): string {
    return `${this.줄주소(번호)}/Label[2]/Text`;
  }

  제목주소(번호: number): string {
    return `${this.줄주소(번호)}/Label[0]/Text`;
  }

  async 줄수(): Promise<number> {
    let 개수 = 0;
    for (;;) {
      const 주소 = this.제목주소(개수);
      if ((await this.game.find(주소)) === null) return 개수;
      if ((await this.game.text(주소)).includes(우편함창.빈안내글)) return 개수;
      개수 += 1;
      if (개수 > 30) return 개수;
    }
  }

  async 제목들(): Promise<string[]> {
    const 모은: string[] = [];
    const 개수 = await this.줄수();
    for (let i = 0; i < 개수; i += 1) {
      모은.push(색태그떼기(await this.제목원문(i)).replace(/^●\s*/, ''));
    }
    return 모은;
  }

  async 줄찾기(제목: string): Promise<number> {
    return (await this.제목들()).findIndex((글) => 글.includes(제목));
  }

  async 줄기다리기(제목: string, 한도ms = 15_000): Promise<number> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      const 번호 = await this.줄찾기(제목);
      if (번호 >= 0 || Date.now() > 끝) return 번호;
    }
  }

  async 제목사라질때까지(제목: string, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if ((await this.줄찾기(제목)) < 0) return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 줄보이게(번호: number): Promise<void> {
    if (번호 < 2) return;
    await this.game.drag(this.제목주소(번호 - 1), this.제목주소(0));
  }

  async 받기누르기(번호: number): Promise<void> {
    await this.줄보이게(번호);
    await this.game.click(`${this.줄주소(번호)}/Button 받기`);
  }

  async 삭제누르기(번호: number): Promise<void> {
    await this.줄보이게(번호);
    await this.game.click(`${this.줄주소(번호)}/Button 삭제`);
  }

  async 모두받기누르기(): Promise<void> {
    await this.game.click(우편함창.모두받기버튼);
  }

  async 받기버튼있나(번호: number): Promise<boolean> {
    return (await this.game.find(`${this.줄주소(번호)}/Button 받기`)) !== null;
  }

  async 삭제버튼있나(번호: number): Promise<boolean> {
    return (await this.game.find(`${this.줄주소(번호)}/Button 삭제`)) !== null;
  }

  async 첨부없음이될때까지(번호: number, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(this.첨부주소(번호), { text: '첨부 없음', timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 빈안내읽기(): Promise<string> {
    return this.game.text(우편함창.빈안내);
  }

  async 줄뜰때까지(번호: number, 한도ms = 15_000): Promise<boolean> {
    return this.game.waitFor(this.제목주소(번호), { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 빈안내뜰때까지(한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(우편함창.빈안내, { text: 우편함창.빈안내글, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 쓰기버튼있나(): Promise<boolean> {
    for (const 낱말 of ['쓰기', '보내기', '작성']) {
      try {
        if ((await this.game.find(`${우편함창.패널}//*[contains(@name,${낱말})]`)) !== null) return true;
      } catch (e) {
        if (e instanceof Error && e.message.includes('하나를 고를 수 없습니다')) return true;
        throw e;
      }
    }
    return false;
  }
}
