import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';

const 창 = '/Showcase HUD/Window 길드';
const 판 = `${창}/Panel 길드`;

export class 길드창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 길드';
  static readonly 창 = 창;
  static readonly 제목 = `${판}/TitleBar/Text`;
  static readonly 닫기 = `${판}/Button 닫기`;
  static readonly 안내 = `${판}/Content/Label/Text`;
  static readonly 이름칸 = `${판}/Content/Input 길드 이름 (2~12자)`;
  static readonly 이름안내 = `${판}/Content/Input 길드 이름 (2~12자)/Text Area/Text[0]`;
  static readonly 만들기 = `${판}/Content/Button 만들기 · 500G`;

  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<길드창> {
    await new 공통HUD(game).창열기('길드', 길드창.제목);
    return new 길드창(game);
  }

  async 안내글(): Promise<string> {
    return this.game.text(길드창.안내);
  }

  async 길드없는지(): Promise<boolean> {
    return (await this.game.find(길드창.만들기)) !== null;
  }

  async 이름넣기(이름: string): Promise<string> {
    return this.game.type(길드창.이름칸, 이름);
  }

  async 만들기누르기(): Promise<void> {
    await this.game.click(길드창.만들기);
  }

  async 제목글(): Promise<string> {
    return this.game.text(길드창.제목);
  }

  async 이름안내글(): Promise<string> {
    return this.game.text(길드창.이름안내);
  }

  async 만들기글(): Promise<string> {
    return this.game.text(`${길드창.만들기}/Text`);
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(길드창.닫기);
    await this.game.waitFor(창, { gone: true, timeoutMs: 10_000 });
  }
}
