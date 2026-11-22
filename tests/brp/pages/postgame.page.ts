import type { GameDriver } from '@platform/kit';

export class 결과화면 {
  static readonly 주소 = 'game:PostGame';
  static readonly 메뉴버튼 = 'MenuBtn';
  static readonly 승리글 = '/PostGameUICanvas/Game Win Text (TMP) (1)';
  static readonly 패배글 = '/PostGameUICanvas/Game Lost Text (TMP)';
  static readonly 안내글 = '/PostGameUICanvas/Text (TMP)';
  static readonly 조명 = 'Directional Light';
  static readonly 글뿌리 = '/PostGameUICanvas';

  private constructor(private readonly game: GameDriver) {}

  static async 열림(game: GameDriver, 한도ms = 30_000): Promise<결과화면> {
    await game.waitFor(결과화면.메뉴버튼, { timeoutMs: 한도ms });
    return new 결과화면(game);
  }

  static async 뜰때까지(game: GameDriver, 한도ms = 30_000): Promise<boolean> {
    return game.waitFor(결과화면.메뉴버튼, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 승리글읽기(): Promise<string | null> {
    return (await this.game.find(결과화면.승리글)) === null ? null : this.game.text(결과화면.승리글);
  }

  async 패배글읽기(): Promise<string | null> {
    return (await this.game.find(결과화면.패배글)) === null ? null : this.game.text(결과화면.패배글);
  }

  async 안내글읽기(): Promise<string> {
    return this.game.text(결과화면.안내글);
  }

  async 글있나(글: string): Promise<boolean> {
    return (await this.game.find(`${결과화면.글뿌리}//*[contains(@text,"${글}")]`)) !== null;
  }

  async 조명색(): Promise<string> {
    return JSON.stringify(await this.game.get(결과화면.조명, 'Light.color'));
  }

  async 메인메뉴로(): Promise<void> {
    await this.game.click(결과화면.메뉴버튼);
  }
}
