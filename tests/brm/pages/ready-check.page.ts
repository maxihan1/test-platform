import type { GameDriver } from '@platform/kit';

export class 준비체크표시 {
  static readonly 주소 = 'game:CharSelect/CharacterSelectCanvas/PlayerSeats/PlayerSeat (0)/AnimationContainer/Checkmark';

  static 표시(자리 = 0): string {
    return `/CharacterSelectCanvas/PlayerSeats/PlayerSeat (${String(자리)})/AnimationContainer/Checkmark`;
  }

  static async 준비누르고뜸(game: GameDriver, 자리 = 0, 한도ms = 10_000): Promise<boolean> {
    await game.click('Ready Btn');
    return game.waitFor(준비체크표시.표시(자리), { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }
}
