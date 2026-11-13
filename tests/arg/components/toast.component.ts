import type { GameDriver } from '@platform/kit';

import { 글자포함, 뜨는지, 색벗기기 } from '../helpers/find.helper.js';

export class 알림 {
  static readonly 상자 = '/Showcase HUD/Toasts';

  constructor(private readonly game: GameDriver) {}

  주소(문구: string): string {
    return 글자포함(알림.상자, 문구);
  }

  async 뜨는지(문구: string, timeoutMs = 10_000): Promise<boolean> {
    return 뜨는지(this.game, this.주소(문구), timeoutMs);
  }

  async 개수(): Promise<number> {
    let 수 = 0;
    while (수 < 10 && (await this.game.find(`${알림.상자}/Toast[${수}]`)) !== null) 수 += 1;
    return 수;
  }

  async 글들(): Promise<string[]> {
    const 수 = await this.개수();
    const 글들: string[] = [];
    for (let i = 0; i < 수; i += 1) 글들.push(색벗기기(await this.game.text(`${알림.상자}/Toast[${i}]/Text`)));
    return 글들;
  }
}
