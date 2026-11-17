import type { GameDriver } from '@platform/kit';

import { 공통HUD, 글만 } from '../components/hud.component.js';
import { 목록 } from '../components/list.component.js';

export class 채팅창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 채팅';
  static readonly 창 = '/Showcase HUD/Window 채팅';
  static readonly 바깥 = '/Showcase HUD/Window 채팅/Shade';
  static readonly 제목 = '/Showcase HUD/Window 채팅/Panel 채팅/TitleBar/Text';
  static readonly 닫기 = '/Showcase HUD/Window 채팅/Panel 채팅/Button 닫기';
  static readonly 내용 = '/Showcase HUD/Window 채팅/Panel 채팅/Scroll/Content';
  static readonly 입력칸 = '/Showcase HUD/Window 채팅/Panel 채팅/Input 메시지 입력 (100자)';
  static readonly 입력칸안내 = '/Showcase HUD/Window 채팅/Panel 채팅/Input 메시지 입력 (100자)/Text Area/Text[0]';
  static readonly 보내기 = '/Showcase HUD/Window 채팅/Panel 채팅/Button 보내기';
  static readonly 보내기글 = '/Showcase HUD/Window 채팅/Panel 채팅/Button 보내기/Text';
  static readonly 닫기글 = '/Showcase HUD/Window 채팅/Panel 채팅/Button 닫기/Text';

  readonly 목록: 목록;

  private constructor(private readonly game: GameDriver) {
    this.목록 = new 목록(game, 채팅창.내용);
  }

  static 탭(이름: '전체' | '파티' | '길드'): string {
    return `/Showcase HUD/Window 채팅/Panel 채팅/Button ${이름}`;
  }

  static async 열기(game: GameDriver): Promise<채팅창> {
    if ((await game.find(채팅창.창)) === null) await game.click(공통HUD.채팅띠);
    await game.waitFor(채팅창.입력칸, { timeoutMs: 10_000 });
    return new 채팅창(game);
  }

  static 지금(game: GameDriver): 채팅창 {
    return new 채팅창(game);
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(채팅창.닫기);
    await this.game.waitFor(채팅창.창, { gone: true, timeoutMs: 10_000 });
  }

  async 탭누르기(이름: '전체' | '파티' | '길드'): Promise<void> {
    await this.game.click(채팅창.탭(이름));
  }

  async 넣기(글: string): Promise<string> {
    return await this.game.type(채팅창.입력칸, 글);
  }

  async 보내기누르기(): Promise<void> {
    await this.game.click(채팅창.보내기);
  }

  async 보내기(글: string): Promise<void> {
    await this.넣기(글);
    await this.보내기누르기();
  }

  async 입력칸글(): Promise<string> {
    return await this.game.text(채팅창.입력칸);
  }

  async 줄들(): Promise<string[]> {
    const 글들: string[] = [];
    for (const 줄 of await this.목록.줄경로들(40)) {
      const 찾은것 = await this.game.find(`${줄}/Text`);
      글들.push(찾은것?.text ?? '');
    }
    return 글들;
  }

  async 줄글들(): Promise<string[]> {
    return (await this.줄들()).map(글만);
  }

  async 줄이뜰때까지(글: string, 시간 = 10_000): Promise<boolean> {
    return this.game.waitFor(`//*[contains(@text,${글})]`, { timeoutMs: 시간 }).then(
      () => true,
      () => false,
    );
  }

  async 탭색(이름: '전체' | '파티' | '길드'): Promise<unknown> {
    return await this.game.get(채팅창.탭(이름), 'Image.color');
  }

  async 탭보이나(이름: '전체' | '파티' | '길드'): Promise<boolean> {
    return (await this.game.find(채팅창.탭(이름))) !== null;
  }

  async 보이나(주소: string): Promise<boolean> {
    return (await this.game.find(주소)) !== null;
  }

  async 글(주소: string): Promise<string> {
    const 찾은것 = await this.game.find(주소);
    return 찾은것 === null ? '' : 글만(찾은것.text ?? '');
  }

  async 배치문제들(): Promise<unknown[]> {
    return (await this.game.layout(채팅창.창)).problems;
  }

  async 줄수(): Promise<number> {
    return (await this.목록.줄경로들(60)).length;
  }

  async 줄원문들(): Promise<string[]> {
    return (await this.줄들()).map((줄) => 줄.replace(/<[^>]+>/g, ''));
  }

  async 띠에뜰때까지(글: string, 시간 = 10_000): Promise<boolean> {
    return this.game.waitFor(공통HUD.채팅띠글, { text: 글, timeoutMs: 시간 }).then(
      () => true,
      () => false,
    );
  }

  async 줄색(글: string): Promise<string | null> {
    const 줄들 = await this.줄들();
    for (const 줄 of 줄들.reverse()) {
      if (글만(줄).includes(글)) return /<color=(#[0-9a-fA-F]{6})/.exec(줄)?.[1]?.toUpperCase() ?? null;
    }
    return null;
  }

  async 여러줄보내기(개수: number, 앞글: string): Promise<void> {
    for (let 번호 = 1; 번호 <= 개수; 번호 += 1) await this.보내기(`${앞글}${String(번호)}`);
  }

  async 탭밝기(이름: '전체' | '파티' | '길드'): Promise<number> {
    const 색 = await this.탭색(이름);
    const 값들 = Array.isArray(색)
      ? (색 as unknown[]).slice(0, 3).map(Number)
      : [Number((색 as { r?: number }).r ?? 0), Number((색 as { g?: number }).g ?? 0), Number((색 as { b?: number }).b ?? 0)];
    return (값들[0]! + 값들[1]! + 값들[2]!) / 3;
  }
}
