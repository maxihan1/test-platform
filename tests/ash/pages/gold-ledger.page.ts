import type { GameDriver } from '@platform/kit';

export interface 골드내역칸 {
  시각: string;
  사유: string;
  금액: string;
  잔액: string;
}

export class 골드내역줄 {
  static readonly 주소 = 'game:World/WorldRoot/HudCanvas/PanelLayer/CharacterInfoPanel/Window/Body/InfoList/Content/LedgerEntry';

  static readonly 내용 = '/WorldRoot/HudCanvas/PanelLayer/CharacterInfoPanel/Window/Body/InfoList/Content';

  constructor(private readonly game: GameDriver) {}

  async 뜰때까지(순번: number, 한도 = 10_000): Promise<void> {
    await this.game.waitFor(`${골드내역줄.내용}/LedgerEntry[${String(순번)}]`, { timeoutMs: 한도 });
  }

  async 칸(순번: number): Promise<골드내역칸> {
    const 글 = await this.game.text(`${골드내역줄.내용}/LedgerEntry[${String(순번)}]/Text`);
    const [시각 = '', 사유 = '', 금액 = '', 잔액 = ''] = 글.split(/\s{2,}/).map((칸) => 칸.replace(/<[^>]+>/g, '').trim());
    return { 시각, 사유, 금액, 잔액 };
  }
}
