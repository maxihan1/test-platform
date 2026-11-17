import type { GameDriver } from '@platform/kit';

import { 공통HUD, 글만 } from '../components/hud.component.js';
import { 목록 } from '../components/list.component.js';

export class 친구파티창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 친구 · 파티';
  static readonly 창 = '/Showcase HUD/Window 친구 · 파티';
  static readonly 바깥 = '/Showcase HUD/Window 친구 · 파티/Shade';
  static readonly 제목 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/TitleBar/Text';
  static readonly 닫기 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Button 닫기';
  static readonly 내용 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Scroll/Content';

  readonly 목록: 목록;
  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.목록 = new 목록(game, 친구파티창.내용);
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<친구파티창> {
    if ((await game.find(친구파티창.창)) === null) await game.click(공통HUD.메뉴버튼('친구'));
    await game.waitFor(친구파티창.제목, { timeoutMs: 10_000 });
    return new 친구파티창(game);
  }

  static 지금(game: GameDriver): 친구파티창 {
    return new 친구파티창(game);
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(친구파티창.닫기);
    await this.game.waitFor(친구파티창.창, { gone: true, timeoutMs: 10_000 });
  }

  async 열렸나(): Promise<boolean> {
    return (await this.game.find(친구파티창.창)) !== null;
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

  static readonly 이름칸 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Input 캐릭터 이름';
  static readonly 이름칸안내 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Input 캐릭터 이름/Text Area/Text[0]';
  static readonly 친구신청 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Button 친구 신청';
  static readonly 파티초대 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Button 파티 초대';
  static readonly 친구신청글 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Button 친구 신청/Text';
  static readonly 파티초대글 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Button 파티 초대/Text';
  static readonly 닫기글 = '/Showcase HUD/Window 친구 · 파티/Panel 친구 · 파티/Button 닫기/Text';
  static readonly 파티나가기 = '//*[contains(@name,Button 파티 나가기)]';

  async 이름넣기(이름: string): Promise<void> {
    await this.game.type(친구파티창.이름칸, 이름);
  }

  async 친구신청하기(이름: string): Promise<void> {
    await this.이름넣기(이름);
    await this.game.click(친구파티창.친구신청);
  }

  async 파티초대하기(이름: string): Promise<void> {
    await this.이름넣기(이름);
    await this.game.click(친구파티창.파티초대);
  }

  async 줄글들(): Promise<string[]> {
    const 글들: string[] = [];
    for (const 줄 of await this.목록.줄경로들()) 글들.push(await this.목록.줄글(줄));
    return 글들;
  }

  static async 다시열기(game: GameDriver): Promise<친구파티창> {
    if ((await game.find(친구파티창.창)) !== null) {
      await game.click(친구파티창.닫기);
      await game.waitFor(친구파티창.창, { gone: true, timeoutMs: 10_000 });
    }
    return await 친구파티창.열기(game);
  }

  async 배치문제들(): Promise<unknown[]> {
    return (await this.game.layout(친구파티창.창)).problems;
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

  async 줄이사라질때까지(글: string, 시간 = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 시간;
    do {
      const 창 = await 친구파티창.다시열기(this.game);
      if (!(await 창.줄글들()).some((줄) => 줄.includes(글))) return true;
    } while (Date.now() < 끝);
    return false;
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

  async 버튼있는줄수(이름: string, 버튼: string): Promise<number> {
    let 개수 = 0;
    for (const 줄 of await this.목록.줄경로들()) {
      if (!(await this.목록.줄글(줄)).includes(이름)) continue;
      if ((await this.목록.줄버튼(줄, 버튼)) !== null) 개수 += 1;
    }
    return 개수;
  }

  static readonly 받은신청머리 = '받은 친구 신청';

  async 줄첫글들(): Promise<string[]> {
    const 글들: string[] = [];
    for (const 줄 of await this.목록.줄경로들()) {
      const 글 = await this.목록.줄글(줄);
      글들.push(글 !== '' ? 글 : await this.목록.칸글(줄, 0));
    }
    return 글들;
  }

  async 받은신청이름들(): Promise<string[]> {
    const 글들 = await this.줄첫글들();
    if (!(글들[0] ?? '').startsWith(친구파티창.받은신청머리)) return [];
    const 끝 = 글들.findIndex((글, 칸) => 칸 > 0 && /^(파티 |친구 \d+명)/.test(글));
    return 글들.slice(1, 끝 === -1 ? undefined : 끝);
  }

  async 친구목록이름들(): Promise<string[]> {
    const 글들 = await this.줄첫글들();
    const 머리 = 글들.findIndex((글) => /^친구 \d+명/.test(글));
    return 머리 === -1 ? [] : 글들.slice(머리 + 1);
  }

  async 파티머리줄(): Promise<string> {
    return (await this.줄첫글들()).find((글) => /^파티 (없음|\d+\/4)/.test(글)) ?? '';
  }

  async 받은신청줄이뜰때까지(이름: string, 시간 = 15_000): Promise<boolean> {
    const 끝 = Date.now() + 시간;
    do {
      if ((await this.받은신청이름들()).some((글) => 글.includes(이름))) return true;
    } while (Date.now() < 끝);
    return false;
  }

  async 친구목록에뜰때까지(이름: string, 시간 = 15_000): Promise<boolean> {
    const 끝 = Date.now() + 시간;
    do {
      if ((await this.친구목록이름들()).some((글) => 글.includes(이름))) return true;
    } while (Date.now() < 끝);
    return false;
  }
}
