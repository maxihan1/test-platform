import type { GameDriver } from '@platform/kit';

import { 색뗀글 } from '../components/hud.component.js';

export class 안내창 {
  static readonly 주소 = 'game:MainMenu/PopupPanel(Clone)';
  static readonly 창 = '/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)';
  static readonly 제목줄 = '/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)/TitleText';
  static readonly 본문줄 = '/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)/MainText';
  static readonly 확인버튼 = '/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)/Confirm Button';

  constructor(private readonly game: GameDriver) {}

  static async 뜰때까지(game: GameDriver, 한도ms = 30_000): Promise<안내창 | null> {
    return game.waitFor(안내창.제목줄, { timeoutMs: 한도ms }).then(
      () => new 안내창(game),
      () => null,
    );
  }

  static async 제목이될때까지(game: GameDriver, 제목: string, 한도ms = 30_000): Promise<boolean> {
    return game.waitFor(안내창.제목줄, { text: 제목, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 제목(): Promise<string> {
    return 색뗀글(await this.game.text(안내창.제목줄));
  }

  async 본문(): Promise<string> {
    return 색뗀글(await this.game.text(안내창.본문줄));
  }

  async 확인누르기(): Promise<void> {
    await this.game.click(안내창.확인버튼);
  }

  async 닫힐때까지(한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(안내창.창, { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 본문원문(): Promise<string> {
    return this.game.text(안내창.본문줄);
  }

  async 확인버튼글(): Promise<string> {
    return 색뗀글(await this.game.text(`${안내창.확인버튼}/Text (TMP)`));
  }

  async 다른버튼있나(): Promise<boolean> {
    return (await this.game.find(`${안내창.창}/*[contains(@name,Button)][1]`)) !== null;
  }

  async 열려있나(): Promise<boolean> {
    return (await this.game.find(안내창.창)) !== null;
  }

  async 본문에줄있나(글: string): Promise<boolean> {
    return (await this.game.find(`${안내창.창}//*[contains(@text,${글})]`)) !== null;
  }

  async 본문이될때까지(글: string, 한도ms = 30_000): Promise<boolean> {
    return this.game.waitFor(안내창.본문줄, { text: 글, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 확인있나(): Promise<boolean> {
    return (await this.game.find(안내창.확인버튼)) !== null;
  }
}
