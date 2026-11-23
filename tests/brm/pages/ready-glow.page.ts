import type { GameDriver } from '@platform/kit';

export class 준비자리빛 {
  static readonly 주소 = 'game:CharSelect/CharacterSelectCanvas/PlayerSeats/PlayerSeat (0)/AnimationContainer/Glow';

  static 빛(자리 = 0): string {
    return `/CharacterSelectCanvas/PlayerSeats/PlayerSeat (${String(자리)})/AnimationContainer/Glow`;
  }

  static async 준비누르고빛남(game: GameDriver, 자리 = 0, 한도ms = 10_000): Promise<boolean> {
    await game.click('Ready Btn');
    return game.waitFor(준비자리빛.빛(자리), { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }
}
