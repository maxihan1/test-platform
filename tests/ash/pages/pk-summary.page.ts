import type { GameDriver } from '@platform/kit';

export class PK요약줄 {
  static readonly 주소 = 'game:World/WorldRoot/HudCanvas/PanelLayer/CharacterInfoPanel/Window/Body/InfoList/Content/PkSummary';

  static readonly 줄 = '/WorldRoot/HudCanvas/PanelLayer/CharacterInfoPanel/Window/Body/InfoList/Content/PkSummary';

  constructor(private readonly game: GameDriver) {}

  async 뜰때까지(한도 = 10_000): Promise<void> {
    await this.game.waitFor(PK요약줄.줄, { timeoutMs: 한도 });
  }

  async 보이는글(): Promise<string> {
    const 글 = await this.game.text(`${PK요약줄.줄}/Text`);
    return 글.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }
}
