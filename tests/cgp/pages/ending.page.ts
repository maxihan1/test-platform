import type { GameDriver } from '@platform/kit';

import { 글읽기, 뜰때까지 } from '../helpers/menu.helper.js';

const 끝 = '/BossRoomHudCanvas/EndingUIRoot/EndingUI';
const 줄 = `${끝}/RivalryResult/Row0`;

export class 결과창 {
  static readonly 주소 = 'game:BossRoom3/BossRoomHudCanvas/EndingUIRoot/EndingUI';

  static readonly 계속안내 = `${끝}/CeremonyContinueGuide`;
  static readonly 승패 = `${끝}/Def/Txt`;
  static readonly 점수칸 = {
    직접처치: `${줄}/Cell_Direct/Value`,
    식물처치: `${줄}/Cell_Plant/Value`,
    중간보스: `${줄}/Cell_MiddleBoss/Value`,
    보스: `${줄}/Cell_Boss/Value`,
    총점: `${줄}/Cell_Total/Value`,
  } as const;
  static readonly 내순위 = `${끝}/RivalryResult/ClearTimeRow/MyRankValue`;

  private constructor(private readonly game: GameDriver) {}

  static async 넘기기(game: GameDriver): Promise<결과창 | null> {
    if (!(await 뜰때까지(game, 결과창.계속안내, 30_000))) return null;
    for (let 번 = 0; 번 < 3; 번 += 1) {
      await game.key('Return');
      if (await 뜰때까지(game, 결과창.점수칸.총점, 3_000)) return new 결과창(game);
    }
    return null;
  }

  async 승패글(): Promise<string> {
    return await 글읽기(this.game, 결과창.승패);
  }

  async 점수(칸: keyof typeof 결과창.점수칸): Promise<number> {
    return Number(await 글읽기(this.game, 결과창.점수칸[칸]));
  }

  async 캐릭터선택으로(): Promise<boolean> {
    for (let 번 = 0; 번 < 4; 번 += 1) {
      await this.game.key('Return');
      if (await 뜰때까지(this.game, '/CharSelectLocal UI Canvas', 5_000)) return true;
    }
    return false;
  }
}
