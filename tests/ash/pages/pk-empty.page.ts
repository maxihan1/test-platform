import type { GameDriver } from '@platform/kit';

export class PK빈안내 {
  static readonly 주소 = 'game:World/WorldRoot/HudCanvas/PanelLayer/CharacterInfoPanel/Window/Body/InfoList/Content/PkEmpty';

  static readonly 줄 = '/WorldRoot/HudCanvas/PanelLayer/CharacterInfoPanel/Window/Body/InfoList/Content/PkEmpty';

  constructor(private readonly game: GameDriver) {}

  async 뜰때까지(한도 = 10_000): Promise<void> {
    await this.game.waitFor(PK빈안내.줄, { timeoutMs: 한도 });
  }

  async 글(): Promise<string> {
    return this.game.text(`${PK빈안내.줄}/Text`);
  }
}
