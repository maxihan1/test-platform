import type { GameDriver } from '@platform/kit';

import { 공통HUD, 색뗀글 } from '../components/hud.component.js';

export class 채팅창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 채팅';
  static readonly 창 = '/Showcase HUD/Window 채팅';
  static readonly 판 = '/Showcase HUD/Window 채팅/Panel 채팅';
  static readonly 가림막 = '/Showcase HUD/Window 채팅/Shade';
  static readonly 닫기버튼 = '/Showcase HUD/Window 채팅/Panel 채팅/Button 닫기';
  static readonly 제목줄 = '/Showcase HUD/Window 채팅/Panel 채팅/TitleBar/Text';
  static readonly 줄 = '/Showcase HUD/Window 채팅/Panel 채팅/Scroll/Content/Row';
  static readonly 입력칸 = '/Showcase HUD/Window 채팅/Panel 채팅/Input 메시지 입력 (100자)';
  static readonly 보내기버튼 = '/Showcase HUD/Window 채팅/Panel 채팅/Button 보내기';

  readonly hud: 공통HUD;

  constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<채팅창> {
    await 공통HUD.창열기(game, '/Showcase HUD/ChatStrip', '채팅');
    return new 채팅창(game);
  }

  static 줄주소(번호: number): string {
    return `${채팅창.줄}[${String(번호)}]`;
  }

  async 제목(): Promise<string> {
    return 색뗀글(await this.game.text(채팅창.제목줄));
  }

  async 닫기(): Promise<void> {
    await this.game.click(채팅창.닫기버튼);
  }

  async 가림막누르기(): Promise<void> {
    await this.game.click(채팅창.가림막, { at: [0.05, 0.05] });
  }

  async 닫힐때까지(한도ms = 5_000): Promise<boolean> {
    return this.game.waitFor(채팅창.창, { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 칸글(주소: string): Promise<string | null> {
    const 찾음 = await this.game.find(주소);
    return 찾음 === null ? null : 색뗀글(찾음.text ?? '');
  }

  async 줄찾기(글: string, 최대 = 40): Promise<number | null> {
    for (let 번호 = 0; 번호 < 최대; 번호 += 1) {
      if ((await this.game.find(채팅창.줄주소(번호))) === null) return null;
      if ((await this.game.find(`${채팅창.줄주소(번호)}/Label[0]/Text[contains(@text,${글})]`)) !== null) return 번호;
    }
    return null;
  }

  async 줄수(최대 = 60): Promise<number> {
    let 수 = 0;
    while (수 < 최대 && (await this.game.find(채팅창.줄주소(수))) !== null) 수 += 1;
    return 수;
  }

  static 탭(이름: '전체' | '파티' | '길드'): string {
    return `${채팅창.판}/Button ${이름}`;
  }

  async 탭누르기(이름: '전체' | '파티' | '길드'): Promise<void> {
    await this.game.click(채팅창.탭(이름));
  }

  async 탭색(이름: '전체' | '파티' | '길드'): Promise<string> {
    return JSON.stringify(await this.game.get(채팅창.탭(이름), 'Image.color'));
  }

  async 글넣기(글: string): Promise<string> {
    return this.game.type(채팅창.입력칸, 글);
  }

  async 입력칸값(): Promise<string> {
    return String(await this.game.get(채팅창.입력칸, 'TMP_InputField.text'));
  }

  async 입력칸안내(): Promise<string | null> {
    return this.칸글(`${채팅창.입력칸}/Text Area/Text[0]`);
  }

  async 입력칸골라짐(): Promise<boolean> {
    return (await this.game.get(채팅창.입력칸, 'TMP_InputField.isFocused')) === true;
  }

  async 보내기누르기(): Promise<void> {
    await this.game.click(채팅창.보내기버튼);
  }

  async 보내기(글: string): Promise<void> {
    await this.글넣기(글);
    await this.보내기누르기();
  }

  async 끝줄원문(): Promise<string | null> {
    const 찾음 = await this.game.find(`${채팅창.줄}[-1]/Text`);
    return 찾음 === null ? null : (찾음.text ?? '');
  }

  async 끝줄(): Promise<string | null> {
    const 원문 = await this.끝줄원문();
    return 원문 === null ? null : 색뗀글(원문);
  }

  async 글있는줄(글: string): Promise<string | null> {
    const 원문 = await this.글있는줄원문(글);
    return 원문 === null ? null : 색뗀글(원문);
  }

  async 글있는줄원문(글: string, 최대 = 60): Promise<string | null> {
    for (let 뒤 = 1; 뒤 <= 최대; 뒤 += 1) {
      const 찾음 = await this.game.find(`${채팅창.줄}[-${String(뒤)}]/Text`);
      if (찾음 === null) return null;
      if ((찾음.text ?? '').includes(글)) return 찾음.text ?? '';
    }
    return null;
  }

  async 글줄뜸(글: string, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    do {
      if ((await this.글있는줄원문(글)) !== null) return true;
    } while (Date.now() < 끝);
    return false;
  }

  async 탭글(이름: '전체' | '파티' | '길드'): Promise<string | null> {
    return this.칸글(`${채팅창.탭(이름)}/Text`);
  }

  async 탭밝기(이름: '전체' | '파티' | '길드'): Promise<number> {
    const 값 = JSON.stringify(await this.game.get(채팅창.탭(이름), 'Image.color'));
    const 수 = 값.match(/-?\d*\.?\d+/g) ?? [];
    return 수.slice(0, 3).reduce((합, 글) => 합 + Number(글), 0);
  }

  async 알림글(글: string): Promise<string | null> {
    return this.칸글(공통HUD.알림(글));
  }
}
