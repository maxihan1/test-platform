import type { GameDriver } from '@platform/kit';

import { 글읽기, 사라질때까지 } from '../helpers/menu.helper.js';

const 판 = '/CharSelectLocal UI Canvas/LeaderboardPanel';

export class 랭킹창 {
  static readonly 주소 = 'game:CharSelectLocal/CharSelectLocal UI Canvas/LeaderboardPanel';

  static readonly 제목 = `${판}/Header/Title`;
  static readonly 맵이름 = `${판}/Header/MapName`;
  static readonly 인원탭 = [1, 2, 3, 4].map((n) => `${판}/Header/PlayerTabs/Tab${n}/Label`);
  static readonly 내기록 = `${판}/MyRecordLabel`;
  static readonly 못봄안내 = `${판}/States/Unavailable/Text`;

  private constructor(private readonly game: GameDriver) {}

  static async 기다리기(game: GameDriver): Promise<랭킹창> {
    await game.waitFor(랭킹창.제목, { timeoutMs: 10_000 });
    return new 랭킹창(game);
  }

  async 글(주소: string): Promise<string> {
    return await 글읽기(this.game, 주소);
  }

  async 인원탭글(): Promise<string> {
    const 글들: string[] = [];
    for (const 주소 of 랭킹창.인원탭) 글들.push(await 글읽기(this.game, 주소));
    return 글들.join(' · ');
  }

  async 닫기(): Promise<boolean> {
    await this.game.key('Escape');
    return await 사라질때까지(this.game, 랭킹창.제목);
  }
}
