import type { GameDriver } from '@platform/kit';

import { 공통HUD, 색뗀글, 줄글될때까지, 줄글원문 } from '../components/hud.component.js';

export class 친구파티창 {
  static readonly 주소 = 'game:*/Showcase HUD/Window 친구 · 파티';
  static readonly 창 = '/Showcase HUD/Window 친구 · 파티';
  static readonly 판 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티';
  static readonly 가림막 = '/Showcase HUD/Window 친구 · 파티/Shade';
  static readonly 닫기버튼 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Button 닫기';
  static readonly 제목줄 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/TitleBar/Text';
  static readonly 줄 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Scroll/Content/Row';
  static readonly 이름칸 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Input 캐릭터 이름';
  static readonly 친구신청버튼 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Button 친구 신청';
  static readonly 파티초대버튼 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Button 파티 초대';

  readonly hud: 공통HUD;

  constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<친구파티창> {
    await 공통HUD.창열기(game, '/Showcase HUD/Menu/Button 친구', '친구 · 파티');
    return new 친구파티창(game);
  }

  static 줄주소(번호: number): string {
    return `${친구파티창.줄}[${String(번호)}]`;
  }

  async 제목(): Promise<string> {
    return 색뗀글(await this.game.text(친구파티창.제목줄));
  }

  async 닫기(): Promise<void> {
    await this.game.click(친구파티창.닫기버튼);
  }

  async 가림막누르기(): Promise<void> {
    await this.game.click(친구파티창.가림막, { at: [0.05, 0.05] });
  }

  async 닫힐때까지(한도ms = 5_000): Promise<boolean> {
    return this.game.waitFor(친구파티창.창, { gone: true, timeoutMs: 한도ms }).then(
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
      if ((await this.game.find(친구파티창.줄주소(번호))) === null) return null;
      if ((await this.game.find(`${친구파티창.줄주소(번호)}/Label[0]/Text[contains(@text,${글})]`)) !== null) return 번호;
    }
    return null;
  }

  async 줄수(최대 = 60): Promise<number> {
    let 수 = 0;
    while (수 < 최대 && (await this.game.find(친구파티창.줄주소(수))) !== null) 수 += 1;
    return 수;
  }

  async 이름넣기(이름: string): Promise<void> {
    await this.game.type(친구파티창.이름칸, 이름);
  }

  async 이름칸안내(): Promise<string | null> {
    return this.칸글(`${친구파티창.이름칸}/Text Area/Text[0]`);
  }

  async 친구신청누르기(): Promise<void> {
    await this.game.click(친구파티창.친구신청버튼);
  }

  async 파티초대누르기(): Promise<void> {
    await this.game.click(친구파티창.파티초대버튼);
  }

  async 글있는줄(글: string): Promise<string | null> {
    const 원문 = await 줄글원문(this.game, 친구파티창.줄, [글]);
    return 원문 === null ? null : 색뗀글(원문);
  }

  async 글있는줄원문(글: string): Promise<string | null> {
    return 줄글원문(this.game, 친구파티창.줄, [글]);
  }

  async 파티머리줄(): Promise<string | null> {
    const 있음 = await this.글있는줄('파티 ');
    return 있음;
  }

  async 친구머리줄(): Promise<string | null> {
    return this.칸글(`${친구파티창.줄}//*[contains(@text,친구 )][contains(@text,명)][-1]`);
  }

  async 파티나가기있나(): Promise<boolean> {
    return (await this.game.find(`${친구파티창.판}//Button 파티 나가기`)) !== null;
  }

  async 파티나가기(): Promise<void> {
    await this.game.click(`${친구파티창.판}//Button 파티 나가기`);
  }

  async 받은신청있나(): Promise<boolean> {
    return (await this.game.find(`${친구파티창.줄}//*[contains(@text,받은 친구 신청)]`)) !== null;
  }

  async 친구줄번호(이름: string, 최대 = 40): Promise<number | null> {
    for (let 번호 = 0; 번호 < 최대; 번호 += 1) {
      if ((await this.game.find(친구파티창.줄주소(번호))) === null) return null;
      const 줄 = await this.game.find(`${친구파티창.줄주소(번호)}//*[contains(@text,${이름})][-1]`);
      if (줄 !== null && (await this.game.find(`${친구파티창.줄주소(번호)}/Button 삭제`)) !== null) return 번호;
    }
    return null;
  }

  async 줄버튼있나(번호: number, 버튼: '파티 초대' | '삭제' | '수락' | '거절'): Promise<boolean> {
    return (await this.game.find(`${친구파티창.줄주소(번호)}/Button ${버튼}`)) !== null;
  }

  async 줄버튼누르기(번호: number, 버튼: '파티 초대' | '삭제' | '수락' | '거절'): Promise<void> {
    await this.game.click(`${친구파티창.줄주소(번호)}/Button ${버튼}`);
  }

  async 글줄뜸(글: string, 한도ms = 10_000): Promise<boolean> {
    return 줄글될때까지(this.game, 친구파티창.줄, [글], (원문) => 원문 !== null, 한도ms);
  }

  async 글줄사라질때까지(글: string, 한도ms = 10_000): Promise<boolean> {
    return 줄글될때까지(this.game, 친구파티창.줄, [글], (원문) => 원문 === null, 한도ms);
  }

  async 파티인원머리(한도ms = 10_000): Promise<string | null> {
    const 떴다 = await 줄글될때까지(this.game, 친구파티창.줄, ['파티 ', '·'], (원문) => 원문 !== null, 한도ms);
    const 원문 = 떴다 ? await 줄글원문(this.game, 친구파티창.줄, ['파티 ', '·']) : null;
    return 원문 === null ? null : 색뗀글(원문);
  }

  async 파티머리가될때까지(글: string, 한도ms = 10_000): Promise<boolean> {
    return 줄글될때까지(this.game, 친구파티창.줄, ['파티 ', '·'], (원문) => 원문?.includes(글) ?? false, 한도ms);
  }

  async 파티없음머리(한도ms = 10_000): Promise<string | null> {
    const 떴다 = await 줄글될때까지(this.game, 친구파티창.줄, ['파티 없음'], (원문) => 원문 !== null, 한도ms);
    const 원문 = 떴다 ? await 줄글원문(this.game, 친구파티창.줄, ['파티 없음']) : null;
    return 원문 === null ? null : 색뗀글(원문);
  }

  async 줄원문(번호: number): Promise<string | null> {
    const 찾음 = await this.game.find(`${친구파티창.줄주소(번호)}//*[contains(@text,Lv.)][-1]`);
    return 찾음 === null ? null : (찾음.text ?? '');
  }

  async 줄글이될때까지(이름: string, 글: string, 한도ms = 10_000): Promise<boolean> {
    return 줄글될때까지(this.game, 친구파티창.줄, [이름], (원문) => 원문?.includes(글) ?? false, 한도ms);
  }

  async 받은신청줄수(최대 = 40): Promise<number> {
    let 수 = 0;
    for (let 번호 = 0; 번호 < 최대; 번호 += 1) {
      if ((await this.game.find(친구파티창.줄주소(번호))) === null) break;
      if (await this.줄버튼있나(번호, '수락')) 수 += 1;
    }
    return 수;
  }

  async 맨위줄이받은신청인가(): Promise<boolean> {
    return (await this.game.find(`${친구파티창.줄주소(0)}//*[contains(@text,받은 친구 신청)][-1]`)) !== null;
  }
}
