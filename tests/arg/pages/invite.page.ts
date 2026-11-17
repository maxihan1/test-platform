import type { GameDriver } from '@platform/kit';

import { 글만 } from '../components/hud.component.js';

export type 초대종류 = '친구 신청' | '파티 초대' | '길드 초대';

export class 초대창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Invite';
  static readonly 창 = '/Showcase HUD/Invite';

  private constructor(
    private readonly game: GameDriver,
    readonly 종류: 초대종류,
  ) {}

  static 판(종류: 초대종류): string {
    return `/Showcase HUD/Invite/Panel ${종류}`;
  }

  static async 뜰때까지(game: GameDriver, 종류: 초대종류, 시간 = 15_000): Promise<초대창 | null> {
    return game.waitFor(초대창.판(종류), { timeoutMs: 시간 }).then(
      () => new 초대창(game, 종류),
      () => null,
    );
  }

  async 제목(): Promise<string> {
    return 글만(await this.game.text(`${초대창.판(this.종류)}/TitleBar/Text`));
  }

  async 본문(): Promise<string> {
    return 글만(await this.game.text(`${초대창.판(this.종류)}/Label/Text`));
  }

  async 수락보이나(): Promise<boolean> {
    return (await this.game.find(`${초대창.판(this.종류)}/Button 수락`)) !== null;
  }

  async 거절보이나(): Promise<boolean> {
    return (await this.game.find(`${초대창.판(this.종류)}/Button 거절`)) !== null;
  }

  async 수락(): Promise<void> {
    await this.game.click(`${초대창.판(this.종류)}/Button 수락`);
  }

  async 거절(): Promise<void> {
    await this.game.click(`${초대창.판(this.종류)}/Button 거절`);
  }

  async 닫혔나(): Promise<boolean> {
    return this.game.waitFor(초대창.판(this.종류), { gone: true, timeoutMs: 10_000 }).then(
      () => true,
      () => false,
    );
  }

  static readonly 뒷배경 = '/Showcase HUD/Invite/Shade';

  async 배치문제들(): Promise<unknown[]> {
    return (await this.game.layout(초대창.창)).problems;
  }

  async 본문에글이뜰때까지(글: string, 시간 = 10_000): Promise<boolean> {
    return this.game.waitFor(`${초대창.판(this.종류)}/Label/Text`, { text: 글, timeoutMs: 시간 }).then(
      () => true,
      () => false,
    );
  }

  static readonly 두번째창 = '/Showcase HUD/Invite[1]';

  static async 두장뜰때까지(game: GameDriver, 시간 = 15_000): Promise<boolean> {
    return game.waitFor(초대창.두번째창, { timeoutMs: 시간 }).then(
      () => true,
      () => false,
    );
  }

  async 뒷배경있나(): Promise<boolean> {
    return (await this.game.find(`${초대창.뒷배경}[0]`)) !== null;
  }
}
