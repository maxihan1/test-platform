import type { GameDriver } from '@platform/kit';

import { 색뗀글 } from './hud.component.js';

export type 초대종류 = '친구 신청' | '파티 초대' | '길드 초대';

export class 초대창 {
  static readonly 자리 = '/Showcase HUD/Invite';
  static readonly 가림막 = '/Showcase HUD/Invite/Shade';

  constructor(private readonly game: GameDriver) {}

  static 판(종류: 초대종류): string {
    return `${초대창.자리}/Panel ${종류}`;
  }

  async 뜰때까지(종류: 초대종류, 한도ms = 15_000): Promise<boolean> {
    return this.game.waitFor(초대창.판(종류), { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 닫힐때까지(종류: 초대종류, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(초대창.판(종류), { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 제목(종류: 초대종류): Promise<string> {
    return 색뗀글(await this.game.text(`${초대창.판(종류)}/TitleBar/Text`));
  }

  async 안내(종류: 초대종류): Promise<string> {
    return 색뗀글(await this.game.text(`${초대창.판(종류)}/Label/Text`));
  }

  async 수락(종류: 초대종류): Promise<void> {
    await this.game.click(`${초대창.판(종류)}/Button 수락`);
  }

  async 거절(종류: 초대종류): Promise<void> {
    await this.game.click(`${초대창.판(종류)}/Button 거절`);
  }
}
