import type { GameDriver } from '@platform/kit';

export type 순간이동곳 = 'TeleportTown' | 'TeleportBeginner' | 'TeleportIntermediate' | 'TeleportBoss';

export class GM콘솔 {
  static readonly 주소 = 'game:World/WorldRoot/HudCanvas/PanelLayer/GmConsole';

  static readonly 창 = '/WorldRoot/HudCanvas/PanelLayer/GmConsole';

  constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<GM콘솔> {
    await game.click('GmButton');
    await game.waitFor(GM콘솔.창);
    return new GM콘솔(game);
  }

  async 순간이동누르기(곳: 순간이동곳): Promise<void> {
    await this.game.click(곳);
  }

  async 골드지급(값: number): Promise<void> {
    await this.game.type('GmGoldInput', String(값));
    await this.game.click('GmGoldButton');
  }

  async 출력글(): Promise<string> {
    return this.game.text('GmOutputText');
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(`${GM콘솔.창}/Window/CloseButton`);
  }

  async 닫힐때까지(): Promise<void> {
    await this.game.waitFor(GM콘솔.창, { gone: true });
  }

  async 조회누르기(): Promise<void> {
    await this.game.click('GmConfigButton');
  }

  async 버튼(이름: string): Promise<{ path: string; interactable?: boolean } | null> {
    return this.game.find(이름);
  }

  async 떠있나(): Promise<boolean> {
    return (await this.game.find(GM콘솔.창)) !== null;
  }
}
