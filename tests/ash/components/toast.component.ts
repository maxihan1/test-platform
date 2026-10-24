import type { GameDriver } from '@platform/kit';

export class 안내띠 {
  static readonly 글 = '/ToastCanvas/ToastStack/ToastMessage/Text';

  constructor(private readonly game: GameDriver) {}

  async 뜬글(): Promise<string> {
    await this.game.waitFor(안내띠.글);
    return this.game.text(안내띠.글);
  }
}
