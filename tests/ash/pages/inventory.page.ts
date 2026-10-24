import type { GameDriver } from '@platform/kit';

export class 가방창 {
  static readonly 주소 = 'game:World/WorldRoot/HudCanvas/PanelLayer/InventoryPanel';

  static readonly 창 = '/WorldRoot/HudCanvas/PanelLayer/InventoryPanel';

  constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<가방창> {
    await game.click('InventoryButton');
    await game.waitFor(가방창.창);
    return new 가방창(game);
  }

  async 요약(): Promise<string> {
    return this.game.text(`${가방창.창}/Window/Body/SummaryText`);
  }

  칸(순번: number): string {
    return `${가방창.창}/Window/Body/Grid/Slot${String(순번)}`;
  }

  async 칸누르기(순번: number): Promise<void> {
    await this.game.click(this.칸(순번));
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(`${가방창.창}/Window/CloseButton`);
  }

  async 떠있나(): Promise<boolean> {
    return (await this.game.find(가방창.창)) !== null;
  }

  async 장착표시있나(순번: number): Promise<boolean> {
    return (await this.game.find(`${this.칸(순번)}/Equipped`)) !== null;
  }
}
