import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';
import { 줄글들, 줄수 } from '../helpers/find.helper.js';

const 창 = '/Showcase HUD/Window 우편함';
const 판 = `${창}/Panel 우편함`;

export class 우편함창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 우편함';
  static readonly 창 = 창;
  static readonly 제목 = `${판}/TitleBar/Text`;
  static readonly 닫기 = `${판}/Button 닫기`;
  static readonly 모두받기 = `${판}/Button 모두 받기`;
  static readonly 목록 = `${판}/Scroll/Content`;

  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<우편함창> {
    await new 공통HUD(game).창열기('우편', 우편함창.제목);
    return new 우편함창(game);
  }

  static 줄(번호: number): string {
    return `${우편함창.목록}/Row[${번호}]`;
  }

  async 줄수(): Promise<number> {
    return 줄수(this.game, 우편함창.목록);
  }

  async 제목들(): Promise<string[]> {
    return 줄글들(this.game, 우편함창.목록, 'Label[0]/Text');
  }

  async 첨부줄들(): Promise<string[]> {
    return 줄글들(this.game, 우편함창.목록, 'Label[2]/Text');
  }

  async 첨부줄원문(번호: number): Promise<string> {
    return this.game.text(`${우편함창.줄(번호)}/Label[2]/Text`);
  }

  async 받기있는지(번호?: number): Promise<boolean> {
    const 범위 = 번호 === undefined ? 우편함창.목록 : 우편함창.줄(번호);
    return (await this.game.find(`${범위}//*[contains(@name,받기)]`)) !== null;
  }

  async 삭제있는지(번호: number): Promise<boolean> {
    return (await this.game.find(`${우편함창.줄(번호)}/Button 삭제`)) !== null;
  }

  async 삭제누르기(번호: number): Promise<void> {
    await this.game.click(`${우편함창.줄(번호)}/Button 삭제`);
  }

  async 빈안내있는지(): Promise<boolean> {
    return (await this.game.find(`${창}//*[contains(@text,받은 우편이 없습니다)]`)) !== null;
  }

  async 빈안내뜨는지(timeoutMs = 10_000): Promise<boolean> {
    return this.game.waitFor(`${창}//*[contains(@text,받은 우편이 없습니다)]`, { timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 모두받기누르기(): Promise<void> {
    await this.game.click(우편함창.모두받기);
  }

  async 제목글(): Promise<string> {
    return this.game.text(우편함창.제목);
  }

  async 모두받기글(): Promise<string> {
    return this.game.text(`${우편함창.모두받기}/Text`);
  }

  async 닫기글(): Promise<string> {
    return this.game.text(`${우편함창.닫기}/Text`);
  }

  async 목록이뜰때까지(): Promise<void> {
    const 줄뜸 = await this.game.waitFor(우편함창.줄(0), { timeoutMs: 3_000 }).then(
      () => true,
      () => false,
    );
    if (!줄뜸) await this.빈안내뜨는지(3_000);
  }

  async 모두삭제하기(): Promise<void> {
    for (;;) {
      const 수 = await this.줄수();
      if (수 === 0) return;
      await this.삭제누르기(0);
      await this.game.waitFor(우편함창.줄(수 - 1), { gone: true, timeoutMs: 10_000 });
    }
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(우편함창.닫기);
    await this.game.waitFor(창, { gone: true, timeoutMs: 10_000 });
  }
}
