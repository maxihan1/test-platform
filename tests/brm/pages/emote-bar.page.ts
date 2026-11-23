import type { GameDriver } from '@platform/kit';

import { 색뗀글 } from '../components/hud.component.js';

export class 감정표현막대 {
  static readonly 주소 = 'game:BossRoom/BossRoomHudCanvas/Hero Emote Bar';
  static readonly 감정버튼 = '/BossRoomHudCanvas/Hero Action Bar/Button3';
  static readonly 판 = '/BossRoomHudCanvas/Hero Emote Bar';

  private constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<감정표현막대> {
    if ((await game.find(감정표현막대.판)) === null) await game.click(감정표현막대.감정버튼);
    await game.waitFor(감정표현막대.판, { timeoutMs: 10_000 });
    return new 감정표현막대(game);
  }

  static 버튼(번호: number): string {
    return `${감정표현막대.판}/Button${String(번호)}`;
  }

  private async 버튼수(): Promise<number> {
    let 수 = 0;
    while (수 < 8 && (await this.game.find(감정표현막대.버튼(수))) !== null) 수 += 1;
    return 수;
  }

  async 버튼글들(): Promise<string[]> {
    const 글들: string[] = [];
    for (let 번호 = 0; 번호 < (await this.버튼수()); 번호 += 1) 글들.push(색뗀글(await this.game.text(`${감정표현막대.버튼(번호)}/Text`)));
    return 글들;
  }

  async 키번호들(): Promise<string[]> {
    const 글들: string[] = [];
    for (let 번호 = 0; 번호 < (await this.버튼수()); 번호 += 1) 글들.push(색뗀글(await this.game.text(`${감정표현막대.버튼(번호)}/Text (1)`)));
    return 글들;
  }

  async 누르기(번호: number): Promise<void> {
    await this.game.click(감정표현막대.버튼(번호));
  }

  async 닫힐때까지(한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(감정표현막대.판, { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }
}
