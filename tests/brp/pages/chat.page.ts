import type { GameDriver } from '@platform/kit';

export type 채팅탭 = '전체' | '파티' | '길드';

export class 채팅창 {
  static readonly 주소 = 'game:*/Showcase HUD/Window 채팅';
  static readonly 창 = '/Showcase HUD/Window 채팅';
  static readonly 입력칸 = 'Input 메시지 입력 (100자)';
  static readonly 보내기버튼 = 'Button 보내기';
  static readonly 닫기버튼 = '/Showcase HUD/Window 채팅/Panel 채팅/Button 닫기';
  static readonly 제목 = '/Showcase HUD/Window 채팅/Panel 채팅/TitleBar/Text';
  static readonly 줄뿌리 = '/Showcase HUD/Window 채팅/Panel 채팅/Scroll/Content';
  static readonly 입력안내 = '/Showcase HUD/Window 채팅/Panel 채팅/Input 메시지 입력 (100자)/Text Area/Text[0]';
  static readonly 입력글 = '/Showcase HUD/Window 채팅/Panel 채팅/Input 메시지 입력 (100자)/Text Area/Text[1]';

  private constructor(private readonly game: GameDriver) {}

  static async 열려있나(game: GameDriver): Promise<boolean> {
    return (await game.find(채팅창.창)) !== null;
  }

  static async 열기(game: GameDriver): Promise<채팅창> {
    if (!(await 채팅창.열려있나(game))) {
      await game.click('ChatStrip');
      await game.waitFor(채팅창.입력칸, { timeoutMs: 10_000 });
    }
    return new 채팅창(game);
  }

  탭버튼(탭: 채팅탭): string {
    return 탭 === '길드' ? '/Showcase HUD/Window 채팅/Panel 채팅/Button 길드' : `Button ${탭}`;
  }

  async 탭고르기(탭: 채팅탭): Promise<void> {
    await this.game.click(this.탭버튼(탭));
  }

  async 넣기(글: string): Promise<string> {
    return this.game.type(채팅창.입력칸, 글);
  }

  탭글주소(탭: 채팅탭): string {
    return `/Showcase HUD/Window 채팅/Panel 채팅/Button ${탭}/Text`;
  }

  async 탭글(탭: 채팅탭): Promise<string> {
    return this.game.text(this.탭글주소(탭));
  }

  async 제목글(): Promise<string> {
    return this.game.text(채팅창.제목);
  }

  async 입력안내글(): Promise<string> {
    return this.game.text(채팅창.입력안내);
  }

  async 입력칸글(): Promise<string> {
    return this.game.text(채팅창.입력글);
  }

  async 엔터로보내기(글: string): Promise<void> {
    await this.넣기(글);
    await this.game.click(채팅창.입력칸);
    await this.game.key('Return');
  }

  async 줄수(): Promise<number> {
    return (await this.최근줄들(80)).length;
  }

  async 보내기(글: string): Promise<void> {
    await this.넣기(글);
    await this.game.click(채팅창.보내기버튼);
  }

  줄주소(뒤에서: number): string {
    return `${채팅창.줄뿌리}/Row[-${String(뒤에서)}]/Text`;
  }

  async 최근줄들(개수: number): Promise<string[]> {
    const 모은: string[] = [];
    for (let i = 1; i <= 개수; i += 1) {
      if ((await this.game.find(this.줄주소(i))) === null) break;
      모은.push(await this.game.text(this.줄주소(i)));
    }
    return 모은;
  }

  async 줄기다리기(맞나: (글: string) => boolean, 살필줄 = 5, 한도ms = 10_000): Promise<string | null> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      const 맞은 = (await this.최근줄들(살필줄)).find(맞나);
      if (맞은 !== undefined) return 맞은;
      if (Date.now() > 끝) return null;
    }
  }

  async 닫기(): Promise<void> {
    await this.game.click(채팅창.닫기버튼);
    await this.game.waitFor(채팅창.창, { gone: true, timeoutMs: 10_000 });
  }

  async 탭색(탭: 채팅탭): Promise<number[]> {
    return (await this.game.get(this.탭버튼(탭), 'Image.color')) as number[];
  }

  async 입력칸포커스(): Promise<boolean> {
    return (await this.game.get(채팅창.입력칸, 'TMP_InputField.isFocused')) === true;
  }
}
