import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';

const 창뿌리 = '/Showcase HUD/Window 친구 · 파티';
const 패널 = `${창뿌리}/Panel 친구 · 파티`;

export type 줄버튼 = '파티 초대' | '삭제' | '수락';

function 글만(글: string): string {
  return 글.replace(/<[^>]+>/g, '').trim();
}

export class 친구파티창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 친구 · 파티';
  static readonly 창 = 창뿌리;
  static readonly 제목 = `${패널}/TitleBar/Text`;
  static readonly 이름칸 = 'Input 캐릭터 이름';
  static readonly 이름칸안내 = `${패널}/Input 캐릭터 이름/Text Area/Text[0]`;
  static readonly 친구신청버튼 = 'Button 친구 신청';
  static readonly 파티초대버튼 = `${패널}/Button 파티 초대`;
  static readonly 파티나가기버튼 = 'Button 파티 나가기';
  static readonly 닫기버튼 = `${패널}/Button 닫기`;
  static readonly 줄뿌리 = `${패널}/Scroll/Content`;

  private constructor(private readonly game: GameDriver) {}

  static async 열려있나(game: GameDriver): Promise<boolean> {
    return (await game.find(친구파티창.창)) !== null;
  }

  static async 열기(game: GameDriver): Promise<친구파티창> {
    if (!(await 친구파티창.열려있나(game))) {
      await new 공통HUD(game).메뉴누르기('친구');
      await game.waitFor(친구파티창.이름칸, { timeoutMs: 10_000 });
    }
    return new 친구파티창(game);
  }

  async 닫기(): Promise<void> {
    await this.game.click(친구파티창.닫기버튼);
    await this.game.waitFor(친구파티창.창, { gone: true, timeoutMs: 10_000 });
  }

  async 제목글(): Promise<string> {
    return this.game.text(친구파티창.제목);
  }

  async 이름칸안내글(): Promise<string> {
    return this.game.text(친구파티창.이름칸안내);
  }

  async 이름넣기(이름: string): Promise<string> {
    return this.game.type(친구파티창.이름칸, 이름);
  }

  async 친구신청(이름: string): Promise<void> {
    await this.이름넣기(이름);
    await this.game.click(친구파티창.친구신청버튼);
  }

  async 파티초대(이름: string): Promise<void> {
    await this.이름넣기(이름);
    await this.game.click(친구파티창.파티초대버튼);
  }

  async 파티나가기(): Promise<void> {
    await this.game.click(친구파티창.파티나가기버튼);
  }

  async 파티나가기보임(): Promise<boolean> {
    return (await this.game.find(친구파티창.파티나가기버튼)) !== null;
  }

  줄주소(번호: number): string {
    return `${친구파티창.줄뿌리}/Row[${String(번호)}]/Text`;
  }

  async 줄글(번호: number): Promise<string | null> {
    const 뿌리 = `${친구파티창.줄뿌리}/Row[${String(번호)}]`;
    if ((await this.game.find(뿌리)) === null) return null;
    for (const 칸 of ['Text', 'Label/Text']) {
      if ((await this.game.find(`${뿌리}/${칸}`)) !== null) return this.game.text(`${뿌리}/${칸}`);
    }
    return '';
  }

  async 줄들(): Promise<string[]> {
    const 모은: string[] = [];
    for (let i = 0; i < 16; i += 1) {
      const 글 = await this.줄글(i);
      if (글 === null) break;
      모은.push(글);
    }
    return 모은;
  }

  async 줄기다리기(맞나: (줄들: string[]) => boolean, 한도ms = 10_000): Promise<string[] | null> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      const 줄들 = await this.줄들();
      if (맞나(줄들)) return 줄들;
      if (Date.now() > 끝) return null;
    }
  }

  async 머리줄(): Promise<string> {
    return 글만((await this.줄들())[0] ?? '');
  }

  async 머리줄기다리기(조각: string, 한도ms = 10_000): Promise<boolean> {
    return (await this.줄기다리기((줄들) => 글만(줄들[0] ?? '').includes(조각), 한도ms)) !== null;
  }

  친구머리번호(줄들: string[]): number {
    return 줄들.findIndex((줄) => /^친구 \d+명$/.test(글만(줄)));
  }

  async 친구머리줄(): Promise<string> {
    const 줄들 = await this.줄들();
    return 글만(줄들[this.친구머리번호(줄들)] ?? '');
  }

  async 친구머리줄기다리기(명수: number, 한도ms = 10_000): Promise<boolean> {
    return (await this.줄기다리기((줄들) => 글만(줄들[this.친구머리번호(줄들)] ?? '') === `친구 ${String(명수)}명`, 한도ms)) !== null;
  }

  친구줄번호(줄들: string[], 이름: string): number {
    const 머리 = this.친구머리번호(줄들);
    if (머리 < 0) return -1;
    return 줄들.findIndex((줄, i) => i > 머리 && 글만(줄).includes(이름));
  }

  async 친구줄글(이름: string): Promise<string | null> {
    const 줄들 = await this.줄들();
    const 번호 = this.친구줄번호(줄들, 이름);
    return 번호 < 0 ? null : (줄들[번호] ?? null);
  }

  async 친구줄기다리기(이름: string, 조각: string, 한도ms = 10_000): Promise<string | null> {
    const 줄들 = await this.줄기다리기((모음) => {
      const 번호 = this.친구줄번호(모음, 이름);
      return 번호 >= 0 && 글만(모음[번호] ?? '').includes(조각);
    }, 한도ms);
    if (줄들 === null) return null;
    return 줄들[this.친구줄번호(줄들, 이름)] ?? null;
  }

  async 친구줄사라질때까지(이름: string, 한도ms = 10_000): Promise<boolean> {
    return (await this.줄기다리기((줄들) => this.친구줄번호(줄들, 이름) < 0, 한도ms)) !== null;
  }

  줄버튼주소(번호: number, 버튼: 줄버튼): string {
    return `${친구파티창.줄뿌리}/Row[${String(번호)}]/Button ${버튼}`;
  }

  async 줄버튼있나(번호: number, 버튼: 줄버튼): Promise<boolean> {
    return (await this.game.find(this.줄버튼주소(번호, 버튼))) !== null;
  }

  async 줄버튼누르기(번호: number, 버튼: 줄버튼): Promise<void> {
    await this.game.click(this.줄버튼주소(번호, 버튼));
  }
}
