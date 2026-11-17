import type { GameDriver } from '@platform/kit';

import { 글만 } from '../components/hud.component.js';

export class 결과화면 {
  static readonly 주소 = 'game:PostGame';
  static readonly 캔버스 = '/PostGameUICanvas';
  static readonly 패배글 = '/PostGameUICanvas/Game Lost Text (TMP)';
  static readonly 승리글 = '//*[contains(@name,Game Won Text)]';
  static readonly 메인메뉴로 = '/PostGameUICanvas/MenuBtn';
  static readonly 메인메뉴로글 = '/PostGameUICanvas/MenuBtn/Text (TMP)';
  static readonly 돌아감글 = '/PostGameUICanvas/WaitOnHost/Text (TMP)';
  static readonly 다시하기 = '//*[contains(@name,Play Again)]';
  static readonly 조명 = 'Directional Light';
  static readonly 승리글자 = '//*[contains(@text,승리!)]';

  private constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver, 시간 = 30_000): Promise<결과화면> {
    await game.waitFor(결과화면.메인메뉴로, { timeoutMs: 시간 });
    return new 결과화면(game);
  }

  static 지금(game: GameDriver): 결과화면 {
    return new 결과화면(game);
  }

  async 글(주소: string): Promise<string> {
    const 찾은것 = await this.game.find(주소);
    return 찾은것 === null ? '' : 글만(찾은것.text ?? '');
  }

  async 보이나(주소: string): Promise<boolean> {
    return (await this.game.find(주소)) !== null;
  }

  async 메인메뉴로누르기(): Promise<void> {
    await this.game.click(결과화면.메인메뉴로);
  }

  async 조명색(): Promise<unknown> {
    return await this.game.get(결과화면.조명, 'Light.color');
  }
}
