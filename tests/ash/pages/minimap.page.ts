import type { GameDriver } from '@platform/kit';

export class 미니맵 {
  static readonly 주소 = 'game:World/WorldRoot/HudCanvas/Minimap/Dots/Dot';

  static readonly 첫점 = '/WorldRoot/HudCanvas/Minimap/Dots/Dot[0]';

  constructor(private readonly game: GameDriver) {}

  async 점있나(한도 = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도;
    for (;;) {
      if ((await this.game.find(미니맵.첫점)) !== null) return true;
      if (Date.now() >= 끝) return false;
      await new Promise((깨운다) => setTimeout(깨운다, 500));
    }
  }
}
