import type { GameDriver } from '@platform/kit';

export class 고르기표시 {
  static readonly 주소 = 'game:BossRoom/PlayerAvatar69/AvatarGraphics69/fx_TargetReticule(Clone)';
  static readonly 표시 = '//*[contains(@name,fx_TargetReticule)]';
  static readonly 내초상화 = '/BossRoomHudCanvas/Party HUD/Hero HUD/Button';

  static async 있나(game: GameDriver): Promise<boolean> {
    return (await game.find(고르기표시.표시)) !== null;
  }

  static async 내초상화누르기(game: GameDriver): Promise<void> {
    await game.click(고르기표시.내초상화);
  }

  static async 내영웅발밑에뜰때까지(game: GameDriver, 한도ms = 10_000): Promise<boolean> {
    const 뜸 = await game.waitFor(고르기표시.표시, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
    if (!뜸) return false;
    const 찾음 = await game.find(고르기표시.표시);
    return 찾음 !== null && 찾음.path.startsWith('/PlayerAvatar');
  }
}
