import type { GameDriver } from '@platform/kit';

export class 아이템설명창 {
  static readonly 주소 = 'game:World/WorldRoot/HudCanvas/PanelLayer/ItemDetailPopup';

  static readonly 창 = '/WorldRoot/HudCanvas/PanelLayer/ItemDetailPopup';

  constructor(private readonly game: GameDriver) {}

  static async 뜰때까지(game: GameDriver): Promise<아이템설명창> {
    await game.waitFor(아이템설명창.창);
    return new 아이템설명창(game);
  }

  async 이름(): Promise<string> {
    return this.game.text(`${아이템설명창.창}/Window/ItemName`);
  }

  async 설명(): Promise<string> {
    return this.game.text(`${아이템설명창.창}/Window/ItemDescription`);
  }

  async 해제누르기(): Promise<void> {
    await this.game.click(`${아이템설명창.창}/Window/UnequipButton`);
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(`${아이템설명창.창}/Window/CloseButton`);
  }

  async 떠있나(): Promise<boolean> {
    return (await this.game.find(아이템설명창.창)) !== null;
  }

  async 장착누르기(): Promise<void> {
    await this.game.click(`${아이템설명창.창}/Window/EquipButton`);
  }
}
