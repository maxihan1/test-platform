import type { GameDriver } from '@platform/kit';

import { 공통HUD, 색뗀글 } from '../components/hud.component.js';

export class 우편함창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 우편함';
  static readonly 창 = '/Showcase HUD/Window 우편함';
  static readonly 판 = '/Showcase HUD/Window 우편함/Panel 우편함';
  static readonly 가림막 = '/Showcase HUD/Window 우편함/Shade';
  static readonly 닫기버튼 = '/Showcase HUD/Window 우편함/Panel 우편함/Button 닫기';
  static readonly 제목줄 = '/Showcase HUD/Window 우편함/Panel 우편함/TitleBar/Text';
  static readonly 줄 = '/Showcase HUD/Window 우편함/Panel 우편함/Scroll/Content/Row';
  static readonly 모두받기버튼 = '/Showcase HUD/Window 우편함/Panel 우편함/Button 모두 받기';

  readonly hud: 공통HUD;

  constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<우편함창> {
    await 공통HUD.창열기(game, '/Showcase HUD/Menu/Button 우편', '우편함');
    return new 우편함창(game);
  }

  static 줄주소(번호: number): string {
    return `${우편함창.줄}[${String(번호)}]`;
  }

  async 제목(): Promise<string> {
    return 색뗀글(await this.game.text(우편함창.제목줄));
  }

  async 닫기(): Promise<void> {
    await this.game.click(우편함창.닫기버튼);
  }

  async 가림막누르기(): Promise<void> {
    await this.game.click(우편함창.가림막, { at: [0.05, 0.05] });
  }

  async 닫힐때까지(한도ms = 5_000): Promise<boolean> {
    return this.game.waitFor(우편함창.창, { gone: true, timeoutMs: 한도ms }).then(
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
      if ((await this.game.find(우편함창.줄주소(번호))) === null) return null;
      if ((await this.game.find(`${우편함창.줄주소(번호)}/Label[0]/Text[contains(@text,${글})]`)) !== null) return 번호;
    }
    return null;
  }

  async 줄수(최대 = 60): Promise<number> {
    let 수 = 0;
    while (수 < 최대 && (await this.game.find(우편함창.줄주소(수))) !== null) 수 += 1;
    return 수;
  }

  async 줄제목(번호: number): Promise<string | null> {
    return this.칸글(`${우편함창.줄주소(번호)}/Label[0]/Text`);
  }

  async 줄제목원문(번호: number): Promise<string | null> {
    const 찾음 = await this.game.find(`${우편함창.줄주소(번호)}/Label[0]/Text`);
    return 찾음 === null ? null : (찾음.text ?? '');
  }

  async 줄보낸이(번호: number): Promise<string | null> {
    return this.칸글(`${우편함창.줄주소(번호)}/Label[1]/Text`);
  }

  async 줄첨부(번호: number): Promise<string | null> {
    return this.칸글(`${우편함창.줄주소(번호)}/Label[2]/Text`);
  }

  async 줄첨부가될때까지(번호: number, 글: string, 한도ms = 15_000): Promise<boolean> {
    return this.game.waitFor(`${우편함창.줄주소(번호)}/Label[2]/Text`, { text: 글, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 줄첨부원문(번호: number): Promise<string | null> {
    const 찾음 = await this.game.find(`${우편함창.줄주소(번호)}/Label[2]/Text`);
    return 찾음 === null ? null : (찾음.text ?? '');
  }

  async 받기버튼있나(번호: number): Promise<boolean> {
    return (await this.game.find(`${우편함창.줄주소(번호)}/Button 받기`)) !== null;
  }

  async 삭제버튼있나(번호: number): Promise<boolean> {
    return (await this.game.find(`${우편함창.줄주소(번호)}/Button 삭제`)) !== null;
  }

  async 받기(번호: number): Promise<void> {
    await this.game.click(`${우편함창.줄주소(번호)}/Button 받기`);
  }

  async 삭제(번호: number): Promise<void> {
    await this.game.click(`${우편함창.줄주소(번호)}/Button 삭제`);
  }

  async 모두받기(): Promise<void> {
    await this.game.click(우편함창.모두받기버튼);
  }

  async 비었음글(): Promise<string | null> {
    return this.칸글(`${우편함창.줄}//*[contains(@text,받은 우편이 없습니다)]`);
  }

  async 모두받기있나(): Promise<boolean> {
    return (await this.game.find(우편함창.모두받기버튼)) !== null;
  }

  async 줄바탕색(번호: number): Promise<number[]> {
    return (await this.game.get(우편함창.줄주소(번호), 'Image.color')) as number[];
  }
}
