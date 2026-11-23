import type { GameDriver } from '@platform/kit';

export class 탱커공격효과 {
  static readonly 주소 = 'game:BossRoom/PlayerAvatar40/AvatarGraphics40/fx_TankAttack1(Clone)';
  static readonly 효과 = '//*[contains(@name,fx_TankAttack1)]';

  static async 공격누르고뜸(game: GameDriver, 한도ms = 10_000): Promise<boolean> {
    const 뜸 = game.waitFor(탱커공격효과.효과, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
    await game.click('/BossRoomHudCanvas/Hero Action Bar/Button0');
    return 뜸;
  }
}
