import type { GameDriver } from '@platform/kit';

import { 색뗀글 } from '../components/hud.component.js';

export class 시작안내 {
  static readonly 주소 = 'game:CharSelect/CharacterSelectCanvas/SessionEndingSplash';
  static readonly 안내글 = '/CharacterSelectCanvas/SessionEndingSplash/Text (TMP)';

  static async 준비누르고안내줄들(game: GameDriver, 한도ms = 15_000): Promise<string | null> {
    const 읽기 = game.waitFor(시작안내.안내글, { timeoutMs: 한도ms }).then(
      async () => 색뗀글(await game.text(시작안내.안내글)),
      () => null,
    );
    await game.click('Ready Btn');
    const 글 = await 읽기.catch(() => null);
    if (글 === null) return null;
    return 글
      .split(/\r?\n|\\n/)
      .map((줄) => 줄.trim())
      .filter((줄) => 줄 !== '')
      .join(' · ');
  }
}
