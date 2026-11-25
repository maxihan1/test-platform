import type { GameDriver } from '@platform/kit';

import { 글읽기, 뜰때까지, 사라질때까지 } from '../helpers/menu.helper.js';

export class 알림창 {
  static readonly 주소 = 'game:CharSelectLocal/CharSelectLocal UI Canvas/popup';

  static readonly 창 = '/CharSelectLocal UI Canvas/popup';
  static readonly 제목 = '/CharSelectLocal UI Canvas/popup/Title/text';
  static readonly 내용 = '/CharSelectLocal UI Canvas/popup/content';
  static readonly 취소 = '/CharSelectLocal UI Canvas/popup/Btn/Cancel';
  static readonly 확인 = '/CharSelectLocal UI Canvas/popup/Btn/Confirm';

  private constructor(private readonly game: GameDriver) {}

  static async 띄우기(game: GameDriver): Promise<알림창 | null> {
    for (let 번 = 0; 번 < 3; 번 += 1) {
      await game.key('Escape');
      if (await 뜰때까지(game, 알림창.내용, 3_000)) return new 알림창(game);
    }
    return null;
  }

  async 글(주소: string): Promise<string> {
    return await 글읽기(this.game, 주소);
  }

  async 취소누르기(): Promise<void> {
    await this.game.click(알림창.취소);
  }

  async 확인누르기(): Promise<void> {
    await this.game.click(알림창.확인);
  }

  async 닫힐때까지(): Promise<boolean> {
    return await 사라질때까지(this.game, 알림창.내용);
  }
}
