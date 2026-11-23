import type { GameDriver } from '@platform/kit';

import { 공통HUD, 색뗀글 } from '../components/hud.component.js';

export class 상점창 {
  static readonly 주소 = 'game:*/Showcase HUD/Window 상점';
  static readonly 창 = '/Showcase HUD/Window 상점';
  static readonly 판 = '/Showcase HUD/Window 상점/Panel 상점';
  static readonly 가림막 = '/Showcase HUD/Window 상점/Shade';
  static readonly 닫기버튼 = '/Showcase HUD/Window 상점/Panel 상점/Button 닫기';
  static readonly 제목줄 = '/Showcase HUD/Window 상점/Panel 상점/TitleBar/Text';
  static readonly 줄 = '/Showcase HUD/Window 상점/Panel 상점/Scroll/Content/Row';
  static readonly 보유골드줄 = '/Showcase HUD/Window 상점/Panel 상점/Label/Text';

  readonly hud: 공통HUD;

  constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<상점창> {
    await 공통HUD.창열기(game, '/Showcase HUD/Menu/Button 상점', '상점');
    return new 상점창(game);
  }

  static 줄주소(번호: number): string {
    return `${상점창.줄}[${String(번호)}]`;
  }

  async 제목(): Promise<string> {
    return 색뗀글(await this.game.text(상점창.제목줄));
  }

  async 닫기(): Promise<void> {
    await this.game.click(상점창.닫기버튼);
  }

  async 가림막누르기(): Promise<void> {
    await this.game.click(상점창.가림막, { at: [0.05, 0.05] });
  }

  async 닫힐때까지(한도ms = 5_000): Promise<boolean> {
    return this.game.waitFor(상점창.창, { gone: true, timeoutMs: 한도ms }).then(
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
      if ((await this.game.find(상점창.줄주소(번호))) === null) return null;
      if ((await this.game.find(`${상점창.줄주소(번호)}/Label[0]/Text[contains(@text,${글})]`)) !== null) return 번호;
    }
    return null;
  }

  async 줄수(최대 = 60): Promise<number> {
    let 수 = 0;
    while (수 < 최대 && (await this.game.find(상점창.줄주소(수))) !== null) 수 += 1;
    return 수;
  }

  async 보유골드글(): Promise<string | null> {
    return this.칸글(상점창.보유골드줄);
  }

  async 줄이름(번호: number): Promise<string | null> {
    return this.칸글(`${상점창.줄주소(번호)}/Label[0]/Text`);
  }

  async 줄이름색(번호: number): Promise<string | null> {
    const 찾음 = await this.game.find(`${상점창.줄주소(번호)}/Label[0]/Text`);
    return 찾음 === null ? null : (찾음.text ?? '');
  }

  async 줄설명(번호: number): Promise<string | null> {
    return this.칸글(`${상점창.줄주소(번호)}/Label[1]/Text`);
  }

  async 줄가격(번호: number): Promise<string | null> {
    return this.칸글(`${상점창.줄주소(번호)}/Label[2]/Text`);
  }

  async 구매버튼눌림(번호: number): Promise<boolean> {
    return (await this.game.get(`${상점창.줄주소(번호)}/Button 구매`, 'Button.interactable')) === true;
  }

  async 구매누르기(번호: number): Promise<void> {
    await this.줄보이게하기(번호);
    await this.game.click(`${상점창.줄주소(번호)}/Button 구매`);
  }

  async 줄보이게하기(번호: number): Promise<void> {
    type 네모 = [number, number, number, number];
    const 안에있나 = (안: 네모, 칸: 네모) => 칸[1] >= 안[1] && 칸[1] + 칸[3] <= 안[1] + 안[3];
    const 겹치나 = (a: 네모, b: 네모) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
    const 줄수 = await this.줄수();
    for (let 번 = 0; 번 < 6; 번 += 1) {
      const 목록 = (await this.game.find(`${상점창.판}/Scroll`))?.rect;
      const 버튼 = (await this.game.find(`${상점창.줄주소(번호)}/Button 구매`))?.rect;
      const 닫기 = (await this.game.find(상점창.닫기버튼))?.rect;
      if (목록 === undefined || 버튼 === undefined) throw new Error(`상점 ${String(번호)}번 줄의 자리를 읽지 못했습니다`);
      if (안에있나(목록, 버튼) && (닫기 === undefined || !겹치나(닫기, 버튼))) return;
      const 보이는줄: number[] = [];
      for (let 줄 = 0; 줄 < 줄수; 줄 += 1) {
        const 자리 = (await this.game.find(상점창.줄주소(줄)))?.rect;
        if (자리 !== undefined && 안에있나(목록, 자리) && (닫기 === undefined || !겹치나(닫기, 자리))) 보이는줄.push(줄);
      }
      const 첫 = 보이는줄[0];
      const 끝 = 보이는줄[보이는줄.length - 1];
      if (첫 === undefined || 끝 === undefined || 첫 === 끝) throw new Error(`상점 목록에 끌 수 있는 줄이 둘 이상 보이지 않습니다(보이는 줄 ${보이는줄.join(',')})`);
      if (버튼[1] < 목록[1] + 목록[3] / 2) await this.끌어서넘기기(끝, 첫);
      else await this.끌어서넘기기(첫, 끝);
    }
    throw new Error(`상점 ${String(번호)}번 줄을 여섯 번 끌어도 화면 안으로 못 올렸습니다`);
  }

  async 끌어서넘기기(아래줄: number, 위줄: number): Promise<void> {
    await this.game.drag(상점창.줄주소(아래줄), 상점창.줄주소(위줄));
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

  async 줄설명들(최대 = 60): Promise<string[]> {
    const 글들: string[] = [];
    for (let 번호 = 0; 번호 < 최대; 번호 += 1) {
      const 글 = await this.줄설명(번호);
      if (글 === null) break;
      글들.push(글);
    }
    return 글들;
  }

  async 줄가격들(최대 = 60): Promise<string[]> {
    const 글들: string[] = [];
    for (let 번호 = 0; 번호 < 최대; 번호 += 1) {
      const 글 = await this.줄가격(번호);
      if (글 === null) break;
      글들.push(글);
    }
    return 글들;
  }

  async 줄이름색들(최대 = 60): Promise<string[]> {
    const 글들: string[] = [];
    for (let 번호 = 0; 번호 < 최대; 번호 += 1) {
      const 글 = await this.줄이름색(번호);
      if (글 === null) break;
      글들.push(글);
    }
    return 글들;
  }

  async 구매버튼수(최대 = 60): Promise<number> {
    let 수 = 0;
    for (let 번호 = 0; 번호 < 최대 && (await this.game.find(상점창.줄주소(번호))) !== null; 번호 += 1) {
      if ((await this.game.find(`${상점창.줄주소(번호)}/Button 구매`)) !== null) 수 += 1;
    }
    return 수;
  }

  async 판매버튼있나(): Promise<boolean> {
    return (await this.game.find(`${상점창.창}//*[contains(@name,Button 판매)]`)) !== null;
  }

  async 보유골드가될때까지(글: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(상점창.보유골드줄, { text: 글, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }
}
