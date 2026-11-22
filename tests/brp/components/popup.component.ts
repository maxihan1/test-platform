import type { GameDriver } from '@platform/kit';

export class 안내창 {
  static readonly 주소 = '/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)';
  static readonly 제목주소 = 'TitleText';
  static readonly 본문주소 = 'MainText';
  static readonly 확인주소 = 'Confirm Button';

  constructor(private readonly game: GameDriver) {}

  async 뜰때까지(한도ms = 15_000): Promise<boolean> {
    return this.game.waitForValue(안내창.주소, 'CanvasGroup.alpha', 1, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 보이나(): Promise<boolean> {
    if ((await this.game.find(안내창.주소)) === null) return false;
    return Number(await this.game.get(안내창.주소, 'CanvasGroup.alpha')) > 0.5;
  }

  async 제목(): Promise<string> {
    return this.game.text(안내창.제목주소);
  }

  async 본문(): Promise<string> {
    return this.game.text(안내창.본문주소);
  }

  async 확인누르기(): Promise<void> {
    await this.game.click(안내창.확인주소);
    const 끝 = Date.now() + 10_000;
    while (await this.보이나()) {
      if (Date.now() > 끝) throw new Error('안내 창이 「확인」을 누른 뒤 10초 안에 닫히지 않았습니다');
    }
  }
}
