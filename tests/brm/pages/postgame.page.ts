import type { GameDriver } from '@platform/kit';

import { 색뗀글 } from '../components/hud.component.js';

export class 결과화면 {
  static readonly 주소 = 'game:PostGame';
  static readonly 판 = '/PostGameUICanvas';
  static readonly 승리글 = '/PostGameUICanvas/Game Win Text (TMP) (1)';
  static readonly 패배글 = '/PostGameUICanvas/Game Lost Text (TMP)';
  static readonly 메인메뉴버튼 = 'MenuBtn';
  static readonly 조명 = 'Directional Light';

  constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver, 한도ms = 60_000): Promise<결과화면> {
    await game.waitFor(결과화면.판, { timeoutMs: 한도ms });
    return new 결과화면(game);
  }

  async 승리글(): Promise<string | null> {
    const 줄 = await this.game.find(결과화면.승리글);
    return 줄 === null ? null : 색뗀글(줄.text ?? '');
  }

  async 패배글(): Promise<string | null> {
    const 줄 = await this.game.find(결과화면.패배글);
    return 줄 === null ? null : 색뗀글(줄.text ?? '');
  }

  async 조명색(): Promise<string> {
    return JSON.stringify(await this.game.get(결과화면.조명, 'Light.color'));
  }

  async 다시하기보임(): Promise<boolean> {
    return (await this.game.find('/PostGameUICanvas//*[contains(@text,다시 하기)]')) !== null;
  }

  async 메인메뉴로(): Promise<void> {
    await this.game.click(결과화면.메인메뉴버튼);
  }

  async 로비로돌아갈때까지(한도ms = 30_000): Promise<boolean> {
    return this.game.waitFor('/CharacterSelectCanvas', { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 승리글이될때까지(한도ms = 15_000): Promise<boolean> {
    return this.game.waitFor(결과화면.승리글, { text: '승리!', timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 패배글이될때까지(한도ms = 15_000): Promise<boolean> {
    return this.game.waitFor(결과화면.패배글, { text: '다시 도전', timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }
}
