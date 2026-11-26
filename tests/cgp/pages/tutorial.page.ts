import type { GameDriver } from '@platform/kit';

import { 뜰때까지, 로딩끝날때까지 } from '../helpers/menu.helper.js';
import { type 튜토리얼화면, 튜토리얼식물, 튜토리얼읽기, 튜토리얼한걸음 } from '../helpers/tutorial.helper.js';

export class 튜토리얼장면 {
  static readonly 주소 = 'game:Tutorial';

  static readonly 카드제목 = '/TutorialHudCanvas/HudGuide/Card/Title';
  static readonly 장면 = '/TutorialHudCanvas';

  private constructor(private readonly game: GameDriver) {}

  static async 기다리기(game: GameDriver): Promise<튜토리얼장면> {
    await game.waitFor(튜토리얼장면.장면, { timeoutMs: 30_000 });
    await 로딩끝날때까지(game);
    await game.waitFor(튜토리얼장면.카드제목, { timeoutMs: 15_000 }).catch(() => undefined);
    return new 튜토리얼장면(game);
  }

  async 떴나(): Promise<boolean> {
    return await 뜰때까지(this.game, 튜토리얼장면.장면, 30_000);
  }

  async 지금(): Promise<튜토리얼화면> {
    return await 튜토리얼읽기(this.game);
  }

  async 한걸음(): Promise<{ 본것: 튜토리얼화면; 뒤: 튜토리얼화면 }> {
    return await 튜토리얼한걸음(this.game);
  }

  async 식물(): Promise<{ 주소: string; 레벨: number; 체력: number } | null> {
    return await 튜토리얼식물(this.game);
  }

  async 먹인고기(주소: string): Promise<number> {
    return Number(await this.game.get(주소, 'PlantStatus.MeatNum.Value'));
  }
}
