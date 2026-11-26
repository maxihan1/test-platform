import type { GameDriver } from '@platform/kit';

import { 글읽기, 뜰때까지, 있나 } from '../helpers/menu.helper.js';

const 맵 = '/CharSelectLocal UI Canvas/MapSelectOverlay/MapSelect/Bg';

export class 맵선택창 {
  static readonly 주소 = 'game:CharSelectLocal/CharSelectLocal UI Canvas/MapSelectOverlay';

  static readonly 창 = '/CharSelectLocal UI Canvas/MapSelectOverlay';
  static readonly 제목 = `${맵}/TitleText`;
  static readonly 맵이름 = `${맵}/Map/Winter/MapTitleText`;
  static readonly 크기 = `${맵}/Map/Winter/Size/Text`;
  static readonly 난이도 = `${맵}/Map/Winter/Level/Text`;
  static readonly 왼쪽 = `${맵}/L`;
  static readonly 오른쪽 = `${맵}/R`;
  static readonly 랭킹버튼 = '/CharSelectLocal UI Canvas/MapSelectOverlay/LeaderboardButton';
  static readonly 랭킹글 = '/CharSelectLocal UI Canvas/MapSelectOverlay/LeaderboardButton/txt';

  private constructor(private readonly game: GameDriver) {}

  static async 기다리기(game: GameDriver): Promise<맵선택창> {
    await game.waitFor(맵선택창.제목, { timeoutMs: 10_000 });
    return new 맵선택창(game);
  }

  async 글(주소: string): Promise<string> {
    return await 글읽기(this.game, 주소);
  }

  async 보이나(주소: string): Promise<boolean> {
    return await 있나(this.game, 주소);
  }

  async 랭킹누르기(): Promise<void> {
    await this.game.click(맵선택창.랭킹버튼);
  }

  async 들어가기(): Promise<boolean> {
    await this.game.key('Return');
    return await 뜰때까지(this.game, '/Lumikantle', 30_000);
  }
}
