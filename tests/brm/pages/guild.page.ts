import type { GameDriver } from '@platform/kit';

import { 공통HUD, 색뗀글 } from '../components/hud.component.js';

export class 길드창 {
  static readonly 주소 = 'game:*/Showcase HUD/Window 길드';
  static readonly 창 = '/Showcase HUD/Window 길드';
  static readonly 판 = '/Showcase HUD/Window 길드/Panel 길드';
  static readonly 가림막 = '/Showcase HUD/Window 길드/Shade';
  static readonly 닫기버튼 = '/Showcase HUD/Window 길드/Panel 길드/Button 닫기';
  static readonly 제목줄 = '/Showcase HUD/Window 길드/Panel 길드/TitleBar/Text';
  static readonly 줄 = '/Showcase HUD/Window 길드/Panel 길드/Content[-1]/Scroll/Content/Row';
  static readonly 내용 = '/Showcase HUD/Window 길드/Panel 길드/Content[-1]';
  static readonly 이름칸 = '/Showcase HUD/Window 길드/Panel 길드/Content[-1]/Input 길드 이름 (2~12자)';
  static readonly 만들기버튼 = '/Showcase HUD/Window 길드/Panel 길드/Content[-1]/Button 만들기 · 500G';
  static readonly 초대칸 = '/Showcase HUD/Window 길드/Panel 길드/Content[-1]/Input 초대할 캐릭터 이름';
  static readonly 초대버튼 = '/Showcase HUD/Window 길드/Panel 길드/Content[-1]/Button 초대';
  static readonly 탈퇴버튼 = '/Showcase HUD/Window 길드/Panel 길드/Content[-1]/Button 길드 탈퇴';

  readonly hud: 공통HUD;

  constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<길드창> {
    await 공통HUD.창열기(game, '/Showcase HUD/Menu/Button 길드', '길드');
    return new 길드창(game);
  }

  static 줄주소(번호: number): string {
    return `${길드창.줄}[${String(번호)}]`;
  }

  async 제목(): Promise<string> {
    return 색뗀글(await this.game.text(길드창.제목줄));
  }

  async 닫기(): Promise<void> {
    await this.game.click(길드창.닫기버튼);
  }

  async 가림막누르기(): Promise<void> {
    await this.game.click(길드창.가림막, { at: [0.05, 0.05] });
  }

  async 닫힐때까지(한도ms = 5_000): Promise<boolean> {
    return this.game.waitFor(길드창.창, { gone: true, timeoutMs: 한도ms }).then(
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
      if ((await this.game.find(길드창.줄주소(번호))) === null) return null;
      if ((await this.game.find(`${길드창.줄주소(번호)}/Label[0]/Text[contains(@text,${글})]`)) !== null) return 번호;
    }
    return null;
  }

  async 줄수(최대 = 60): Promise<number> {
    let 수 = 0;
    while (수 < 최대 && (await this.game.find(길드창.줄주소(수))) !== null) 수 += 1;
    return 수;
  }

  async 이름넣기(이름: string): Promise<void> {
    await this.game.type(길드창.이름칸, 이름);
  }

  async 이름칸글(): Promise<string | null> {
    return this.칸글(`${길드창.이름칸}/Text Area/Text[1]`);
  }

  async 이름칸값(): Promise<string> {
    return String(await this.game.get(길드창.이름칸, 'TMP_InputField.text'));
  }

  async 이름칸안내(): Promise<string | null> {
    return this.칸글(`${길드창.이름칸}/Text Area/Text[0]`);
  }

  async 만들기누르기(): Promise<void> {
    await this.game.click(길드창.만들기버튼);
  }

  async 만들기버튼있나(): Promise<boolean> {
    return (await this.game.find(길드창.만들기버튼)) !== null;
  }

  async 머리줄(): Promise<string | null> {
    return this.칸글(`${길드창.내용}//*[contains(@text,길드원)][-1]`);
  }

  async 없음안내(): Promise<string | null> {
    return this.칸글(`${길드창.내용}//*[contains(@text,아직 길드가 없습니다)]`);
  }

  async 초대칸있나(): Promise<boolean> {
    return (await this.game.find(길드창.초대칸)) !== null;
  }

  async 초대칸안내(): Promise<string | null> {
    return this.칸글(`${길드창.초대칸}/Text Area/Text[0]`);
  }

  async 초대버튼있나(): Promise<boolean> {
    return (await this.game.find(길드창.초대버튼)) !== null;
  }

  async 초대하기(이름: string): Promise<void> {
    await this.game.type(길드창.초대칸, 이름);
    await this.game.click(길드창.초대버튼);
  }

  async 초대누르기(): Promise<void> {
    await this.game.click(길드창.초대버튼);
  }

  async 탈퇴누르기(): Promise<void> {
    await this.game.click(길드창.탈퇴버튼);
  }

  async 길드원줄글(번호: number): Promise<string | null> {
    return this.칸글(`${길드창.줄주소(번호)}//*[contains(@text,Lv.)][-1]`);
  }

  async 길드원줄원문(번호: number): Promise<string | null> {
    const 찾음 = await this.game.find(`${길드창.줄주소(번호)}//*[contains(@text,Lv.)][-1]`);
    return 찾음 === null ? null : (찾음.text ?? '');
  }

  async 추방버튼있나(번호: number): Promise<boolean> {
    return (await this.game.find(`${길드창.줄주소(번호)}/Button 추방`)) !== null;
  }

  async 추방누르기(번호: number): Promise<void> {
    await this.game.click(`${길드창.줄주소(번호)}/Button 추방`);
  }

  async 글줄뜸(글: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(`${길드창.내용}//*[contains(@text,${글})][-1]`, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 글줄사라질때까지(글: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(`${길드창.내용}//*[contains(@text,${글})][-1]`, { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 머리가될때까지(글: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(`${길드창.내용}//*[contains(@text,길드원)][-1]`, { text: 글, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 길드원줄번호(이름: string, 최대 = 20): Promise<number | null> {
    for (let 번호 = 0; 번호 < 최대; 번호 += 1) {
      if ((await this.game.find(길드창.줄주소(번호))) === null) return null;
      if ((await this.game.find(`${길드창.줄주소(번호)}//*[contains(@text,${이름})][-1]`)) !== null) return 번호;
    }
    return null;
  }

  async 만들기두번누르기(): Promise<void> {
    await Promise.allSettled([this.game.click(길드창.만들기버튼), this.game.click(길드창.만들기버튼)]);
  }
}
