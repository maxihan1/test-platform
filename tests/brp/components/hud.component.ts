import type { GameDriver } from '@platform/kit';

export type 메뉴이름 = '가방' | '상점' | '퀘스트' | '우편' | '친구' | '길드';

export class 공통HUD {
  static readonly 상단바 = '/Showcase HUD/PlayerBar';
  static readonly 레벨이름주소 = '/Showcase HUD/PlayerBar/Label[0]/Text';
  static readonly 골드주소 = '/Showcase HUD/PlayerBar/Label[1]/Text';
  static readonly 경험치글주소 = '/Showcase HUD/PlayerBar/Bar/Text';
  static readonly 경험치막대주소 = '/Showcase HUD/PlayerBar/Bar/Fill';
  static readonly 메뉴 = '/Showcase HUD/Menu';
  static readonly 채팅띠 = 'ChatStrip';
  static readonly 채팅띠글주소 = '/Showcase HUD/ChatStrip/Text';
  static readonly 물약버튼 = 'Button ';
  static readonly 물약글주소 = '/Showcase HUD/Button /Text';
  static readonly 공지띠글주소 = '/Showcase HUD/NoticeBar/Bg/Text';

  constructor(private readonly game: GameDriver) {}

  메뉴버튼(이름: 메뉴이름): string {
    return `/Showcase HUD/Menu/Button ${이름}`;
  }

  async 그려질때까지(한도ms = 30_000): Promise<void> {
    await this.game.waitFor(공통HUD.골드주소, { timeoutMs: 한도ms });
  }

  async 레벨이름(): Promise<string> {
    await this.game.waitFor(공통HUD.레벨이름주소, { timeoutMs: 10_000 });
    return this.game.text(공통HUD.레벨이름주소);
  }

  async 골드글(): Promise<string> {
    await this.game.waitFor(공통HUD.골드주소, { timeoutMs: 10_000 });
    return this.game.text(공통HUD.골드주소);
  }

  async 골드(): Promise<number> {
    return Number((await this.골드글()).replace(/[^0-9]/g, ''));
  }

  async 골드가될때까지(값: number, 한도ms = 10_000): Promise<boolean> {
    const 글 = `${값.toLocaleString('en-US')} G`;
    return this.game.waitFor(공통HUD.골드주소, { text: 글, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 경험치글(): Promise<string> {
    return this.game.text(공통HUD.경험치글주소);
  }

  async 메뉴누르기(이름: 메뉴이름): Promise<void> {
    await this.game.click(this.메뉴버튼(이름));
  }

  async 메뉴글(이름: 메뉴이름): Promise<string> {
    return this.game.text(`${this.메뉴버튼(이름)}/Text`);
  }

  async 채팅띠누르기(): Promise<void> {
    await this.game.click(공통HUD.채팅띠);
  }

  async 물약누르기(): Promise<void> {
    await this.game.click(공통HUD.물약버튼);
  }

  async 공지띠글기다리기(조각: string, 한도ms = 20_000): Promise<string> {
    const 끝 = Date.now() + 한도ms;
    let 글 = '';
    for (;;) {
      글 = (await this.game.find(공통HUD.공지띠글주소)) === null ? '' : await this.game.text(공통HUD.공지띠글주소);
      if (글.includes(조각) || Date.now() > 끝) return 글;
    }
  }
}
