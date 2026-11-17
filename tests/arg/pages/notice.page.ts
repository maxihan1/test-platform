import type { GameDriver } from '@platform/kit';

import { 글만 } from '../components/hud.component.js';

export class 접속안내창 {
  static readonly 주소 = 'game:MainMenu/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)';
  static readonly 창 = '/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)';
  static readonly 제목 = '/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)/TitleText';
  static readonly 본문 = '/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)/MainText';
  static readonly 확인 = '/PopupPanelsCanvas/PopupPanelManager/PopupPanel(Clone)/Confirm Button';

  private constructor(private readonly game: GameDriver) {}

  static async 보이나(game: GameDriver): Promise<boolean> {
    if ((await game.find(접속안내창.창)) === null) return false;
    return Number(await game.get(접속안내창.창, 'CanvasGroup.alpha')) > 0;
  }

  static async 뜰때까지(game: GameDriver, 시간 = 30_000): Promise<접속안내창 | null> {
    return game.waitForValue(접속안내창.창, 'CanvasGroup.alpha', 1, { timeoutMs: 시간 }).then(
      () => new 접속안내창(game),
      () => null,
    );
  }

  static async 제목이될때까지(game: GameDriver, 제목: string, 시간 = 60_000): Promise<접속안내창 | null> {
    return game.waitFor(접속안내창.제목, { text: 제목, timeoutMs: 시간 }).then(
      async () => {
        await game.waitForValue(접속안내창.창, 'CanvasGroup.alpha', 1, { timeoutMs: 10_000 });
        return new 접속안내창(game);
      },
      () => null,
    );
  }

  async 제목글(): Promise<string> {
    return 글만(await this.game.text(접속안내창.제목));
  }

  async 본문글(): Promise<string> {
    return (await this.game.text(접속안내창.본문)).replace(/<[^>]+>/g, '');
  }

  async 확인보이나(): Promise<boolean> {
    return (await this.game.find(접속안내창.확인)) !== null && (await 접속안내창.보이나(this.game));
  }

  async 확인눌림(): Promise<boolean> {
    return (await this.game.get(접속안내창.확인, 'Button.interactable')) === true;
  }

  async 본문에뜰때까지(글: string, 시간 = 10_000): Promise<boolean> {
    return this.game.waitFor(접속안내창.본문, { text: 글, timeoutMs: 시간 }).then(
      () => true,
      () => false,
    );
  }

  async 확인으로닫을수있나(): Promise<boolean> {
    if (!(await this.확인보이나())) return false;
    return await this.확인눌림();
  }

  async 확인누르기(): Promise<void> {
    await this.game.click(접속안내창.확인);
    await this.game.waitForValue(접속안내창.창, 'CanvasGroup.alpha', 0, { timeoutMs: 10_000 });
  }

  async 자리(): Promise<{ x: number; y: number; 폭: number; 높이: number } | null> {
    const 찾은것 = await this.game.find(접속안내창.창);
    if (찾은것 === null) return null;
    return { x: 찾은것.x ?? 0, y: 찾은것.y ?? 0, 폭: 찾은것.screen?.[0] ?? 0, 높이: 찾은것.screen?.[1] ?? 0 };
  }
}

export class 공지띠 {
  static readonly 로그인화면띠 = '/Showcase Login/NoticeBar';

  static 글주소(글: string): string {
    return `//*[contains(@text,${글})]`;
  }

  static async 뜰때까지(game: GameDriver, 글: string, 시간 = 90_000): Promise<boolean> {
    return game.waitFor(공지띠.글주소(글), { timeoutMs: 시간 }).then(
      () => true,
      () => false,
    );
  }

  static async 사라질때까지(game: GameDriver, 글: string, 시간 = 10_000): Promise<boolean> {
    return game.waitFor(공지띠.글주소(글), { gone: true, timeoutMs: 시간 }).then(
      () => true,
      () => false,
    );
  }

  static async 보이나(game: GameDriver, 글: string): Promise<boolean> {
    return (await game.find(공지띠.글주소(글))) !== null;
  }

  static async 원문(game: GameDriver, 글: string): Promise<string> {
    const 찾은것 = await game.find(공지띠.글주소(글));
    return 찾은것?.text ?? '';
  }

  static async 배경색(game: GameDriver): Promise<number[]> {
    return (await game.get(공지띠.로그인화면띠, 'Image.color')) as number[];
  }

  static readonly 로그인화면띠바탕 = '/Showcase Login/NoticeBar/Bg';
  static readonly 로그인화면띠글 = '/Showcase Login/NoticeBar/Bg/Text';

  static async 띠글(game: GameDriver): Promise<string> {
    const 찾은것 = await game.find(공지띠.로그인화면띠글);
    return 찾은것 === null ? '' : 글만(찾은것.text ?? '');
  }

  static async 띠글이될때까지(game: GameDriver, 글: string, 시간 = 90_000): Promise<boolean> {
    const 끝 = Date.now() + 시간;
    do {
      if ((await 공지띠.띠글(game)) === 글) return true;
    } while (Date.now() < 끝);
    return false;
  }

  static async 띠바탕색(game: GameDriver): Promise<number[]> {
    return (await game.get(공지띠.로그인화면띠바탕, 'Image.color')) as number[];
  }
}
