import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';
import { 색벗기기, 숫자, 줄글들 } from '../helpers/find.helper.js';

const 창 = '/Showcase HUD/Window 상점';
const 판 = `${창}/Panel 상점`;

export class 상점창 {
  static readonly 주소 = 'game:CharSelect/Showcase HUD/Window 상점';
  static readonly 창 = 창;
  static readonly 제목 = `${판}/TitleBar/Text`;
  static readonly 닫기 = `${판}/Button 닫기`;
  static readonly 보유골드 = `${판}/Label/Text`;
  static readonly 스크롤 = `${판}/Scroll`;
  static readonly 목록 = `${판}/Scroll/Content`;

  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<상점창> {
    await new 공통HUD(game).창열기('상점', 상점창.제목);
    return new 상점창(game);
  }

  static 줄(번호: number): string {
    return `${상점창.목록}/Row[${번호}]`;
  }

  async 이름들(): Promise<string[]> {
    return 줄글들(this.game, 상점창.목록, 'Label[0]/Text');
  }

  async 설명들(): Promise<string[]> {
    return 줄글들(this.game, 상점창.목록, 'Label[1]/Text');
  }

  async 가격들(): Promise<string[]> {
    return 줄글들(this.game, 상점창.목록, 'Label[2]/Text');
  }

  async 이름원문(번호: number): Promise<string> {
    return this.game.text(`${상점창.줄(번호)}/Label[0]/Text`);
  }

  async 줄찾기(이름: string): Promise<number> {
    const 번호 = (await this.이름들()).indexOf(이름);
    if (번호 < 0) throw new Error(`상점에 「${이름}」 줄이 없다`);
    return 번호;
  }

  async 가격(이름: string): Promise<number> {
    return 숫자(await this.game.text(`${상점창.줄(await this.줄찾기(이름))}/Label[2]/Text`));
  }

  async 보유골드글(): Promise<string> {
    return 색벗기기(await this.game.text(상점창.보유골드));
  }

  async 보유골드(): Promise<number> {
    return 숫자(await this.보유골드글());
  }

  async 보유골드가될때까지(값: number, timeoutMs = 10_000): Promise<boolean> {
    return this.game.waitFor(상점창.보유골드, { text: `>${String(값)}<`, timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 아래로넘기기(): Promise<void> {
    await this.game.drag(`${상점창.줄(4)}`, `${상점창.줄(0)}`, { duration: 1 });
  }

  async 위로끌기(): Promise<void> {
    await this.아래로넘기기();
  }

  async 위로넘기기(): Promise<void> {
    await this.game.drag(`${상점창.줄(3)}`, `${상점창.줄(7)}`, { duration: 1 });
  }

  async 구매버튼(이름: string): Promise<string> {
    const 번호 = await this.줄찾기(이름);
    if (번호 >= 6) await this.아래로넘기기();
    return `${상점창.줄(번호)}/Button 구매`;
  }

  async 구매누르기(이름: string): Promise<void> {
    await this.game.click(await this.구매버튼(이름));
  }

  async 판매버튼있는지(): Promise<boolean> {
    return (await this.game.find(`${창}//*[contains(@name,판매)]`)) !== null;
  }

  async 제목글(): Promise<string> {
    return this.game.text(상점창.제목);
  }

  async 닫기글(): Promise<string> {
    return this.game.text(`${상점창.닫기}/Text`);
  }

  async 줄글(이름: string): Promise<string> {
    const 번호 = await this.줄찾기(이름);
    const 설명 = 색벗기기(await this.game.text(`${상점창.줄(번호)}/Label[1]/Text`));
    const 가격 = 색벗기기(await this.game.text(`${상점창.줄(번호)}/Label[2]/Text`));
    return `${이름} / ${설명} / ${가격}`;
  }

  async 온전하지않은줄들(): Promise<string[]> {
    const 이름들 = await this.이름들();
    const 설명들 = await this.설명들();
    const 가격들 = await this.가격들();
    const 나쁜줄: string[] = [];
    for (let i = 0; i < 이름들.length; i += 1) {
      const 구매 = await this.game.find(`${상점창.줄(i)}/Button 구매`);
      const 구매글 = 구매 === null ? '' : 색벗기기(await this.game.text(`${상점창.줄(i)}/Button 구매/Text`));
      const 온전 = (이름들[i] ?? '') !== '' && (설명들[i] ?? '') !== '' && (가격들[i] ?? '') !== '' && 구매글 === '구매';
      if (!온전) 나쁜줄.push(이름들[i] ?? `${String(i)}번째 줄`);
    }
    return 나쁜줄;
  }

  async 골드보다비싼상품(골드: number): Promise<string | null> {
    const 이름들 = await this.이름들();
    const 가격들 = await this.가격들();
    let 고름: string | null = null;
    let 고른가격 = 골드;
    for (let i = 0; i < 이름들.length; i += 1) {
      const 값 = 숫자(가격들[i] ?? '');
      if (값 > 고른가격) {
        고름 = 이름들[i] ?? null;
        고른가격 = 값;
      }
    }
    return 고름;
  }

  async 구매버튼이화면안인지(이름: string): Promise<boolean> {
    const 번호 = await this.줄찾기(이름);
    for (let i = 0; i < 3; i += 1) {
      const 배치 = await this.game.layout(창);
      const 밖 = 배치.problems.some((문제) => 문제.kind === 'outside' && 문제.path.includes(`/Row[${String(번호)}]/`));
      if (!밖) return true;
    }
    return false;
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(상점창.닫기);
    await this.game.waitFor(창, { gone: true, timeoutMs: 10_000 });
  }
}
