import type { GameDriver } from '@platform/kit';

export class 안내창 {
  static readonly 창 = '/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)';
  static readonly 제목 = `${안내창.창}/TitleText`;
  static readonly 본문 = `${안내창.창}/MainText`;
  static readonly 확인 = `${안내창.창}/Confirm Button`;
  static readonly 보임칸 = 'CanvasGroup.blocksRaycasts';

  constructor(private readonly game: GameDriver) {}

  async 떠있는지(): Promise<boolean> {
    if ((await this.game.find(안내창.창)) === null) return false;
    return (await this.game.get(안내창.창, 안내창.보임칸)) === true;
  }

  async 뜰때까지(timeoutMs = 30_000): Promise<boolean> {
    return this.game.waitForValue(안내창.창, 안내창.보임칸, true, { timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 뜨는지(제목: string, timeoutMs = 30_000): Promise<boolean> {
    const 끝 = Date.now() + timeoutMs;
    while (Date.now() < 끝) {
      if (!(await this.뜰때까지(Math.max(1_000, 끝 - Date.now())))) return false;
      if ((await this.제목글()).includes(제목)) return true;
      await this.game.waitForValue(안내창.창, 안내창.보임칸, false, { timeoutMs: Math.max(1_000, 끝 - Date.now()) }).catch(() => undefined);
    }
    return false;
  }

  async 제목글(): Promise<string> {
    return this.game.text(안내창.제목);
  }

  async 본문글(): Promise<string> {
    return this.game.text(안내창.본문);
  }

  async 본문이될때까지(글: string, timeoutMs = 60_000): Promise<boolean> {
    if (!(await this.뜰때까지(timeoutMs))) return false;
    return this.game.waitFor(안내창.본문, { text: 글, timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 확인있는지(): Promise<boolean> {
    return (await this.떠있는지()) && (await this.game.find(안내창.확인)) !== null;
  }

  async 확인누르기(): Promise<void> {
    for (let i = 0; i < 5; i += 1) {
      if (!(await this.떠있는지())) return;
      await this.game.click(안내창.확인);
      const 닫힘 = await this.game.waitForValue(안내창.창, 안내창.보임칸, false, { timeoutMs: 5_000 }).then(
        () => true,
        () => false,
      );
      if (닫힘) return;
    }
    throw new Error('접속 안내 창이 「확인」을 다섯 번 눌러도 닫히지 않았다');
  }
}
