import type { GameDriver } from '@platform/kit';

import { 공통HUD, 글만 } from '../components/hud.component.js';
import { 목록 } from '../components/list.component.js';

export class 길드창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 길드';
  static readonly 창 = '/Showcase HUD/Window 길드';
  static readonly 바깥 = '/Showcase HUD/Window 길드/Shade';
  static readonly 제목 = '/Showcase HUD/Window 길드/Panel 길드/TitleBar/Text';
  static readonly 닫기 = '/Showcase HUD/Window 길드/Panel 길드/Button 닫기';
  static readonly 내용 = '/Showcase HUD/Window 길드/Panel 길드/Scroll/Content';

  readonly 목록: 목록;
  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.목록 = new 목록(game, 길드창.내용);
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<길드창> {
    if ((await game.find(길드창.창)) === null) await game.click(공통HUD.메뉴버튼('길드'));
    await game.waitFor(길드창.제목, { timeoutMs: 10_000 });
    return new 길드창(game);
  }

  static 지금(game: GameDriver): 길드창 {
    return new 길드창(game);
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(길드창.닫기);
    await this.game.waitFor(길드창.창, { gone: true, timeoutMs: 10_000 });
  }

  async 열렸나(): Promise<boolean> {
    return (await this.game.find(길드창.창)) !== null;
  }

  async 글(주소: string): Promise<string> {
    const 찾은것 = await this.game.find(주소);
    return 찾은것 === null ? '' : 글만(찾은것.text ?? '');
  }

  async 보이나(주소: string): Promise<boolean> {
    return (await this.game.find(주소)) !== null;
  }

  async 누르기(주소: string): Promise<void> {
    await this.game.click(주소);
  }

  async 줄버튼누르기(이름: string, 버튼: string): Promise<boolean> {
    const 줄 = await this.목록.이름줄(이름);
    if (줄 === null) return false;
    const 주소 = await this.목록.줄버튼(줄, 버튼);
    if (주소 === null) return false;
    await this.game.click(주소);
    return true;
  }

  static readonly 길드내용 = '/Showcase HUD/Window 길드/Panel 길드/Content';
  static readonly 안내 = '/Showcase HUD/Window 길드/Panel 길드/Content/Label/Text';
  static readonly 이름칸 = '/Showcase HUD/Window 길드/Panel 길드/Content/Input 길드 이름 (2~12자)';
  static readonly 이름칸안내 = '/Showcase HUD/Window 길드/Panel 길드/Content/Input 길드 이름 (2~12자)/Text Area/Text[0]';
  static readonly 만들기 = '/Showcase HUD/Window 길드/Panel 길드/Content/Button 만들기 · 500G';
  static readonly 만들기글 = '/Showcase HUD/Window 길드/Panel 길드/Content/Button 만들기 · 500G/Text';
  static readonly 초대칸 = '//*[contains(@name,Input 초대할 캐릭터 이름)]';
  static readonly 초대 = '//*[contains(@name,Button 초대)]';
  static readonly 탈퇴 = '//*[contains(@name,Button 길드 탈퇴)]';

  async 이름넣기(이름: string): Promise<string> {
    return await this.game.type(길드창.이름칸, 이름);
  }

  async 만들기(이름: string): Promise<void> {
    await this.이름넣기(이름);
    await this.game.click(길드창.만들기);
  }

  async 초대하기(이름: string): Promise<void> {
    const 칸 = await this.game.find(길드창.초대칸);
    if (칸 === null) throw new Error('길드 창에 초대 칸이 없다');
    await this.game.type(칸.path, 이름);
    const 버튼 = await this.game.find(길드창.초대);
    if (버튼 === null) throw new Error('길드 창에 「초대」 버튼이 없다');
    await this.game.click(버튼.path);
  }

  async 탈퇴누르기(): Promise<void> {
    const 버튼 = await this.game.find(길드창.탈퇴);
    if (버튼 === null) throw new Error('길드 창에 「길드 탈퇴」 버튼이 없다');
    await this.game.click(버튼.path);
  }

  async 줄글들(): Promise<string[]> {
    const 글들: string[] = [];
    for (const 줄 of await this.목록.줄경로들()) 글들.push(await this.목록.줄글(줄));
    return 글들;
  }

  async 배치문제들(): Promise<unknown[]> {
    return (await this.game.layout(길드창.창)).problems;
  }

  async 줄원문들(): Promise<string[]> {
    const 글들: string[] = [];
    for (const 줄 of await this.목록.줄경로들()) {
      const 직접 = await this.game.find(`${줄}/Text`).catch(() => null);
      if (직접 !== null) {
        글들.push(직접.text ?? '');
        continue;
      }
      const 조각: string[] = [];
      for (let 칸 = 0; 칸 < 5; 칸 += 1) {
        const 찾은것 = await this.game.find(`${줄}/Label[${String(칸)}]/Text`);
        if (찾은것 === null) break;
        조각.push(찾은것.text ?? '');
      }
      글들.push(조각.join(' · '));
    }
    return 글들;
  }

  async 길드없음안내뜰때까지(시간 = 10_000): Promise<boolean> {
    return this.game.waitFor(길드창.안내, { text: '아직 길드가 없습니다', timeoutMs: 시간 }).then(
      () => true,
      () => false,
    );
  }

  async 머리글(): Promise<string> {
    const 후보 = [await this.글(길드창.안내), ...(await this.줄글들())];
    return 후보.find((글) => 글.includes('길드원')) ?? '';
  }

  async 줄에서버튼누르기(이름: string, 버튼: string): Promise<boolean> {
    for (const 줄 of await this.목록.줄경로들()) {
      if (!(await this.목록.줄글(줄)).includes(이름)) continue;
      const 주소 = await this.목록.줄버튼(줄, 버튼);
      if (주소 === null) continue;
      await this.game.click(주소);
      return true;
    }
    return false;
  }

  static async 다시열기(game: GameDriver): Promise<길드창> {
    if ((await game.find(길드창.창)) !== null) {
      await game.click(길드창.닫기);
      await game.waitFor(길드창.창, { gone: true, timeoutMs: 10_000 });
    }
    return await 길드창.열기(game);
  }
}
