import type { GameDriver } from '@platform/kit';

export class 탱커모으기효과 {
  static readonly 주소 = 'game:BossRoom/PlayerAvatar40/AvatarGraphics40/fx_TankSkill1_charging(Clone)';
  static readonly 효과 = '//*[contains(@name,fx_TankSkill1_charging)]';

  static async 스킬1눌러두고뜸(game: GameDriver, 한도ms = 10_000): Promise<boolean> {
    const 손가락 = await game.touchDown('/BossRoomHudCanvas/Hero Action Bar/Button1');
    try {
      return await game.waitFor(탱커모으기효과.효과, { timeoutMs: 한도ms }).then(
        () => true,
        () => false,
      );
    } finally {
      await game.touchUp(손가락);
    }
  }
}
