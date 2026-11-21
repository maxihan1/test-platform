import type { GameDriver } from '@platform/kit';

import { 공통HUD, 색뗀글 } from '../components/hud.component.js';

export class 가방창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 가방';
  static readonly 창 = '/Showcase HUD/Window 가방';
  static readonly 판 = '/Showcase HUD/Window 가방/Panel 가방';
  static readonly 가림막 = '/Showcase HUD/Window 가방/Shade';
  static readonly 닫기버튼 = '/Showcase HUD/Window 가방/Panel 가방/Button 닫기';
  static readonly 제목줄 = '/Showcase HUD/Window 가방/Panel 가방/TitleBar/Text';
  static readonly 줄 = '/Showcase HUD/Window 가방/Panel 가방/Scroll/Content/Row';
  static readonly 장착칸 = '/Showcase HUD/Window 가방/Panel 가방/Gear';
  static readonly 능력줄 = '/Showcase HUD/Window 가방/Panel 가방/Gear/Label/Text';
  static readonly 장착중글 = '/Showcase HUD/Window 가방/Panel 가방/Label[0]/Text';

  readonly hud: 공통HUD;

  constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<가방창> {
    await 공통HUD.창열기(game, '/Showcase HUD/Menu/Button 가방', '가방');
    return new 가방창(game);
  }

  static 줄주소(번호: number): string {
    return `${가방창.줄}[${String(번호)}]`;
  }

  async 제목(): Promise<string> {
    return 색뗀글(await this.game.text(가방창.제목줄));
  }

  async 닫기(): Promise<void> {
    await this.game.click(가방창.닫기버튼);
  }

  async 가림막누르기(): Promise<void> {
    await this.game.click(가방창.가림막, { at: [0.05, 0.05] });
  }

  async 닫힐때까지(한도ms = 5_000): Promise<boolean> {
    return this.game.waitFor(가방창.창, { gone: true, timeoutMs: 한도ms }).then(
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
      if ((await this.game.find(가방창.줄주소(번호))) === null) return null;
      if ((await this.game.find(`${가방창.줄주소(번호)}/Label[0]/Text[contains(@text,${글})]`)) !== null) return 번호;
    }
    return null;
  }

  async 줄수(최대 = 60): Promise<number> {
    let 수 = 0;
    while (수 < 최대 && (await this.game.find(가방창.줄주소(수))) !== null) 수 += 1;
    return 수;
  }

  static 칸(이름: '무기' | '갑옷' | '장신구'): string {
    return `${가방창.장착칸}/${이름}`;
  }

  async 칸이름(이름: '무기' | '갑옷' | '장신구'): Promise<string | null> {
    return this.칸글(`${가방창.칸(이름)}/Label[0]/Text`);
  }

  async 칸내용(이름: '무기' | '갑옷' | '장신구'): Promise<string | null> {
    return this.칸글(`${가방창.칸(이름)}/Label[1]/Text`);
  }

  async 칸내용색(이름: '무기' | '갑옷' | '장신구'): Promise<string | null> {
    const 찾음 = await this.game.find(`${가방창.칸(이름)}/Label[1]/Text`);
    return 찾음 === null ? null : (찾음.text ?? '');
  }

  async 칸설명(이름: '무기' | '갑옷' | '장신구'): Promise<string | null> {
    return this.칸글(`${가방창.칸(이름)}/Label[2]/Text`);
  }

  async 해제누르기(이름: '무기' | '갑옷' | '장신구'): Promise<void> {
    await this.game.click(`${가방창.칸(이름)}/Button 해제`);
  }

  async 해제버튼있나(이름: '무기' | '갑옷' | '장신구'): Promise<boolean> {
    return (await this.game.find(`${가방창.칸(이름)}/Button 해제`)) !== null;
  }

  async 능력글(): Promise<string | null> {
    return this.칸글(가방창.능력줄);
  }

  async 줄이름(번호: number): Promise<string | null> {
    return this.칸글(`${가방창.줄주소(번호)}/Label[0]/Text`);
  }

  async 줄이름색(번호: number): Promise<string | null> {
    const 찾음 = await this.game.find(`${가방창.줄주소(번호)}/Label[0]/Text`);
    return 찾음 === null ? null : (찾음.text ?? '');
  }

  async 줄설명(번호: number): Promise<string | null> {
    return this.칸글(`${가방창.줄주소(번호)}/Label[1]/Text`);
  }

  async 줄버튼있나(번호: number, 버튼: '장착' | '사용' | '판매'): Promise<boolean> {
    return (await this.game.find(`${가방창.줄주소(번호)}/*[contains(@name,Button ${버튼})]`)) !== null;
  }

  async 판매버튼글(번호: number): Promise<string | null> {
    return this.칸글(`${가방창.줄주소(번호)}/*[contains(@name,Button 판매)]/Text`);
  }

  async 줄버튼누르기(번호: number, 버튼: '장착' | '사용' | '판매'): Promise<void> {
    await this.game.click(`${가방창.줄주소(번호)}/*[contains(@name,Button ${버튼})]`);
  }

  async 비었음글(): Promise<string | null> {
    return this.칸글(`${가방창.줄}//*[contains(@text,비어 있습니다)]`);
  }

  static 이름만(글: string): string {
    return 글.replace(/\s+x\d+$/, '');
  }

  async 줄이름들(최대 = 60): Promise<string[]> {
    const 이름들: string[] = [];
    for (let 번호 = 0; 번호 < 최대; 번호 += 1) {
      const 글 = await this.줄이름(번호);
      if (글 === null) break;
      이름들.push(글);
    }
    return 이름들;
  }

  async 이름줄수(이름: string): Promise<number> {
    return (await this.줄이름들()).filter((글) => 가방창.이름만(글) === 이름).length;
  }

  async 버튼있는줄이름들(버튼: '장착' | '사용' | '판매'): Promise<string[]> {
    const 이름들: string[] = [];
    const 전부 = await this.줄이름들();
    for (let 번호 = 0; 번호 < 전부.length; 번호 += 1) {
      if (await this.줄버튼있나(번호, 버튼)) 이름들.push(가방창.이름만(전부[번호] ?? ''));
    }
    return 이름들;
  }

  async 줄이름뜰때까지(이름: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(`${가방창.줄}//*[contains(@text,${이름})][-1]`, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 줄이름사라질때까지(이름: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(`${가방창.줄}//*[contains(@text,${이름})][-1]`, { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 칸판매버튼있나(이름: '무기' | '갑옷' | '장신구'): Promise<boolean> {
    return (await this.game.find(`${가방창.칸(이름)}//*[contains(@name,Button 판매)]`)) !== null;
  }
}
