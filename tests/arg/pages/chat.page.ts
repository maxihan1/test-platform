import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';
import { 색벗기기, 줄글들, 줄수 } from '../helpers/find.helper.js';

const 창 = '/Showcase HUD/Window 채팅';
const 판 = `${창}/Panel 채팅`;

export type 채팅탭 = '전체' | '파티' | '길드';

export class 채팅창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 채팅';
  static readonly 창 = 창;
  static readonly 제목 = `${판}/TitleBar/Text`;
  static readonly 닫기 = `${판}/Button 닫기`;
  static readonly 입력칸 = `${판}/Input 메시지 입력 (100자)`;
  static readonly 입력안내 = `${판}/Input 메시지 입력 (100자)/Text Area/Text[0]`;
  static readonly 입력글칸 = `${판}/Input 메시지 입력 (100자)/Text Area/Text[1]`;
  static readonly 보내기 = `${판}/Button 보내기`;
  static readonly 목록 = `${판}/Scroll/Content`;
  static readonly 최대줄 = 30;

  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<채팅창> {
    await new 공통HUD(game).창열기('채팅', 채팅창.제목);
    return new 채팅창(game);
  }

  static 탭(이름: 채팅탭): string {
    return `${판}/Button ${이름}`;
  }

  async 탭누르기(이름: 채팅탭): Promise<void> {
    await this.game.click(채팅창.탭(이름));
  }

  async 글넣기(글: string): Promise<string> {
    return this.game.type(채팅창.입력칸, 글);
  }

  async 입력글(): Promise<string> {
    return this.game.text(채팅창.입력글칸);
  }

  async 보내기누르기(): Promise<void> {
    await this.game.click(채팅창.보내기);
  }

  async 보내기하기(글: string): Promise<void> {
    await this.글넣기(글);
    await this.보내기누르기();
  }

  async 줄수(): Promise<number> {
    return 줄수(this.game, 채팅창.목록, 80);
  }

  async 줄글들(): Promise<string[]> {
    return 줄글들(this.game, 채팅창.목록, 'Text', 80);
  }

  async 줄원문(글: string): Promise<string | null> {
    return (await this.game.find(`${채팅창.목록}//*[contains(@text,${글})]`))?.text ?? null;
  }

  async 줄뜨는지(글: string, timeoutMs = 10_000): Promise<boolean> {
    return this.game.waitFor(`${채팅창.목록}//*[contains(@text,${글})]`, { timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 마지막줄(): Promise<string> {
    const 글들 = await this.줄글들();
    return 색벗기기(글들.at(-1) ?? '');
  }

  async 제목글(): Promise<string> {
    return this.game.text(채팅창.제목);
  }

  async 탭글(이름: 채팅탭): Promise<string> {
    return this.game.text(`${채팅창.탭(이름)}/Text`);
  }

  async 입력안내글(): Promise<string> {
    return this.game.text(채팅창.입력안내);
  }

  async 보내기글(): Promise<string> {
    return this.game.text(`${채팅창.보내기}/Text`);
  }

  async 입력칸비었는지(): Promise<boolean> {
    return (await this.입력글()).replace(/[\u200B-\u200D\uFEFF]/g, '') === '';
  }

  async 보내기여러번누르기(횟수: number): Promise<void> {
    await this.game.click(채팅창.보내기, { count: 횟수, interval: 0.1 });
  }

  async 새줄이뜨는지(앞줄수: number, 글: string, timeoutMs = 10_000): Promise<boolean> {
    const 자리 = Math.min(앞줄수, 채팅창.최대줄 - 1);
    return this.game.waitFor(`${채팅창.목록}/Row[${자리}]/Text`, { text: 글, timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 첫줄뜨는지(timeoutMs = 10_000): Promise<boolean> {
    return this.game.waitFor(`${채팅창.목록}/Row[0]`, { timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 줄사라지는지(글: string, timeoutMs = 10_000): Promise<boolean> {
    return this.game.waitFor(`${채팅창.목록}//*[contains(@text,${글})]`, { gone: true, timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 띠에뜨는지(글: string, timeoutMs = 10_000): Promise<boolean> {
    return this.game.waitFor(`${공통HUD.채팅띠}/Text`, { text: 글, timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(채팅창.닫기);
    await this.game.waitFor(창, { gone: true, timeoutMs: 10_000 });
  }
}
