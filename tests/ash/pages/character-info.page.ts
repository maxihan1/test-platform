import type { GameDriver } from '@platform/kit';

export class 캐릭터정보창 {
  static readonly 주소 = 'game:World/WorldRoot/HudCanvas/PanelLayer/CharacterInfoPanel';

  static readonly 창 = '/WorldRoot/HudCanvas/PanelLayer/CharacterInfoPanel';

  constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<캐릭터정보창> {
    await game.click('CharacterButton');
    await game.waitFor(캐릭터정보창.창);
    return new 캐릭터정보창(game);
  }

  async 탭누르기(탭: 'StatsTab' | 'PkTab' | 'LedgerTab'): Promise<void> {
    await this.game.click(`${캐릭터정보창.창}/Window/Body/InfoTabs/${탭}`);
  }

  static readonly 내용 = '/WorldRoot/HudCanvas/PanelLayer/CharacterInfoPanel/Window/Body/InfoList/Content';

  async 줄글(줄이름: 'NameLine' | 'ExpLine' | 'GoldLine' | 'HpLine' | 'AttackLine' | 'AlignmentLine' | 'PkLine' | 'ZoneLine'): Promise<string> {
    return this.game.text(`${캐릭터정보창.내용}/${줄이름}/Text`);
  }

  async 줄뜰때까지(줄이름: string, 한도 = 10_000): Promise<void> {
    await this.game.waitFor(`${캐릭터정보창.내용}/${줄이름}`, { timeoutMs: 한도 });
  }

  async 원장줄(순번: number): Promise<string> {
    return this.game.text(`${캐릭터정보창.내용}/LedgerEntry[${String(순번)}]/Text`);
  }

  async PK요약있나(): Promise<boolean> {
    return (await this.game.find(`${캐릭터정보창.내용}/PkSummary`)) !== null;
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(`${캐릭터정보창.창}/Window/CloseButton`);
  }

  async 떠있나(): Promise<boolean> {
    return (await this.game.find(캐릭터정보창.창)) !== null;
  }

  async 원장줄있나(): Promise<boolean> {
    return (await this.game.find(`${캐릭터정보창.내용}/LedgerEntry[0]/Text`)) !== null;
  }
}
