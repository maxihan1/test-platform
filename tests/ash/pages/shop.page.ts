import type { GameDriver } from '@platform/kit';

export class 상점창 {
  static readonly 주소 = 'game:World/WorldRoot/HudCanvas/PanelLayer/ShopPanel';

  static readonly 창 = '/WorldRoot/HudCanvas/PanelLayer/ShopPanel';

  static readonly 목록 = '/WorldRoot/HudCanvas/PanelLayer/ShopPanel/Window/Body/ShopList/Content';

  constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<상점창> {
    await game.click('Npc_npc_merchant');
    await game.waitFor(상점창.창, { timeoutMs: 15_000 });
    return new 상점창(game);
  }

  구매줄(templateId: string): string {
    return `${상점창.목록}/Buy_${templateId}`;
  }

  판매줄(아이템번호: number): string {
    return `${상점창.목록}/Sell_${String(아이템번호)}`;
  }

  async 가격글(templateId: string): Promise<string> {
    return this.game.text(`${this.구매줄(templateId)}/PriceText`);
  }

  async 이름글(templateId: string): Promise<string> {
    return this.game.text(`${this.구매줄(templateId)}/NameText`);
  }

  async 하나사기(templateId: string): Promise<void> {
    const 소모품 = (await this.game.find(`${this.구매줄(templateId)}/Buy1Button`)) !== null;
    await this.game.click(`${this.구매줄(templateId)}/${소모품 ? 'Buy1Button' : 'BuyButton'}`);
  }

  async 열개사기(templateId: string): Promise<void> {
    await this.game.click(`${this.구매줄(templateId)}/Buy10Button`);
  }

  async 구매탭누르기(): Promise<void> {
    await this.game.click('BuyTab');
  }

  async 판매탭누르기(): Promise<void> {
    await this.game.click('SellTab');
  }

  async 하나팔기(아이템번호: number): Promise<void> {
    await this.game.click(`${this.판매줄(아이템번호)}/Sell1Button`);
  }

  async 모두팔기(아이템번호: number): Promise<void> {
    await this.game.click(`${this.판매줄(아이템번호)}/SellAllButton`);
  }

  async 판매줄있나(아이템번호: number): Promise<boolean> {
    return (await this.game.find(this.판매줄(아이템번호))) !== null;
  }

  async 보유골드글(): Promise<string> {
    return this.game.text(`${상점창.창}/Window/Body/InfoText`);
  }

  async 보유골드뜰때까지(글자: string, 한도 = 10_000): Promise<void> {
    await this.game.waitFor(`${상점창.창}/Window/Body/InfoText`, { text: 글자, timeoutMs: 한도 });
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(`${상점창.창}/Window/CloseButton`);
  }

  async 떠있나(): Promise<boolean> {
    return (await this.game.find(상점창.창)) !== null;
  }

  async 구매줄있나(templateId: string): Promise<boolean> {
    return (await this.game.find(this.구매줄(templateId))) !== null;
  }

  async 하나사기두번(templateId: string): Promise<void> {
    const 버튼 = `${this.구매줄(templateId)}/Buy1Button`;
    await Promise.all([this.game.click(버튼), this.game.click(버튼)]);
  }
}
