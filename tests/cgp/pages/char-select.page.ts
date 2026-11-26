import type { GameDriver } from '@platform/kit';

import { 글읽기, 뜰때까지, 있나, 화면안에있나 } from '../helpers/menu.helper.js';

const 자리판 = '/CharSelectLocal UI Canvas/Hud/Seats/CharSelectSeatPanel';
const 고르기창 = `${자리판}/PlantPickWindow`;

export const 식물이름들 = ['Fire', 'Twin', 'Slow', 'Poison', 'Sniper'] as const;
export type 식물이름 = (typeof 식물이름들)[number];

export class 캐릭터선택화면 {
  static readonly 주소 = 'game:CharSelectLocal';

  static readonly 화면 = '/CharSelectLocal UI Canvas';
  static readonly 안내 = `${자리판}/Plants/Text`;
  static readonly 준비글 = `${자리판}/ReadyFocus/IdleContent/Text`;
  static readonly 고르기창 = 고르기창;
  static readonly 조작안내 = {
    캐릭터선택Q: '/CharSelectLocal UI Canvas/Hud/Keyboard_Bot/Change/Key_Q/KeyText',
    캐릭터선택E: '/CharSelectLocal UI Canvas/Hud/Keyboard_Bot/Change/Key_E/KeyText',
    캐릭터선택: '/CharSelectLocal UI Canvas/Hud/Keyboard_Bot/Change/txt',
    이동: '/CharSelectLocal UI Canvas/Hud/Keyboard_Bot/Move/txt',
    자세히키: '/CharSelectLocal UI Canvas/Hud/Keyboard_Bot/Detail/Key_Tab/KeyText',
    자세히: '/CharSelectLocal UI Canvas/Hud/Keyboard_Bot/Detail/txt',
    선택키: '/CharSelectLocal UI Canvas/Hud/Keyboard_Bot/Select/Key_Enter/KeyText',
    선택: '/CharSelectLocal UI Canvas/Hud/Keyboard_Bot/Select/txt',
    취소키: '/CharSelectLocal UI Canvas/Hud/Keyboard_Bot/Cancel/Key_Esc/KeyText',
    취소: '/CharSelectLocal UI Canvas/Hud/Keyboard_Bot/Cancel/txt',
  } as const;

  private constructor(private readonly game: GameDriver) {}

  static async 기다리기(game: GameDriver): Promise<캐릭터선택화면> {
    await game.waitFor(캐릭터선택화면.조작안내.캐릭터선택, { timeoutMs: 15_000 });
    return new 캐릭터선택화면(game);
  }

  async 떴나(): Promise<boolean> {
    return await 있나(this.game, 캐릭터선택화면.조작안내.캐릭터선택);
  }

  async 글(주소: string): Promise<string> {
    return await 글읽기(this.game, 주소);
  }

  async 조작안내글(): Promise<string> {
    const 안내 = 캐릭터선택화면.조작안내;
    const 읽기 = async (주소: string): Promise<string> => await 글읽기(this.game, 주소);
    return [
      `${await 읽기(안내.캐릭터선택Q)} ${await 읽기(안내.캐릭터선택E)} ${await 읽기(안내.캐릭터선택)}`,
      await 읽기(안내.이동),
      `${await 읽기(안내.자세히키)} ${await 읽기(안내.자세히)}`,
      `${await 읽기(안내.선택키)} ${await 읽기(안내.선택)}`,
      `${await 읽기(안내.취소키)} ${await 읽기(안내.취소)}`,
    ].join(' · ');
  }

  async 고양이고르기(): Promise<boolean> {
    for (let 번 = 0; 번 < 3; 번 += 1) {
      if (await 화면안에있나(this.game, 캐릭터선택화면.안내)) return true;
      await this.game.key('Return');
      const 끝 = Date.now() + 4_000;
      while (Date.now() < 끝) if (await 화면안에있나(this.game, 캐릭터선택화면.안내)) return true;
    }
    return await 화면안에있나(this.game, 캐릭터선택화면.안내);
  }

  async 안내보이나(): Promise<boolean> {
    return await 화면안에있나(this.game, 캐릭터선택화면.안내);
  }

  async 칸수(): Promise<number> {
    let 수 = 0;
    for (const 칸 of [1, 2, 3]) if (await 있나(this.game, `${자리판}/Plants/${칸}`)) 수 += 1;
    return 수;
  }

  async 칸식물(칸: 1 | 2 | 3): Promise<식물이름 | '빈칸'> {
    for (const 이름 of 식물이름들) if (await 있나(this.game, `${자리판}/Plants/${칸}/${이름}`)) return 이름;
    return '빈칸';
  }

  async 칸들(): Promise<string> {
    return `${await this.칸식물(1)} · ${await this.칸식물(2)} · ${await this.칸식물(3)}`;
  }

  async 고르기창열기(): Promise<boolean> {
    for (let 번 = 0; 번 < 3; 번 += 1) {
      await this.game.key('Return');
      if (await 뜰때까지(this.game, 고르기창, 3_000)) return true;
    }
    return false;
  }

  async 고르기창식물(): Promise<{ 이름: string; 태그: string; 능력: string }> {
    const 보이는 = await this.game.find(`${고르기창}/PlantInfo/*`);
    if (보이는 === null) return { 이름: '', 태그: '', 능력: '' };
    const 뿌리 = 보이는.path;
    return {
      이름: await 글읽기(this.game, `${뿌리}/Text`),
      태그: `${await 글읽기(this.game, `${뿌리}/Tag/Tag (1)/Text`)} · ${await 글읽기(this.game, `${뿌리}/Tag/Tag (2)/Text`)}`,
      능력: `${await 글읽기(this.game, `${뿌리}/status/Damage`)} · ${await 글읽기(this.game, `${뿌리}/status/Range`)} · ${await 글읽기(this.game, `${뿌리}/status/AttackSpeed`)}`,
    };
  }

  async 고르기창커서(): Promise<number> {
    const 자리들 = ['Line1/1', 'Line1/2', 'Line1/3', 'Line2/1', 'Line2/2'];
    for (const [순번, 자리] of 자리들.entries()) if (await 있나(this.game, `${고르기창}/${자리}/Select_Arrow`)) return 순번;
    return -1;
  }

  async 고르기창에서고르기(오른쪽: number): Promise<void> {
    const 끝 = Date.now() + 8_000;
    while (Date.now() < 끝) {
      const 지금 = await this.고르기창커서();
      if (지금 === 오른쪽 || 지금 < 0) break;
      await this.game.key(지금 < 오른쪽 ? 'RightArrow' : 'LeftArrow');
      const 바뀜끝 = Date.now() + 1_500;
      let 뒤 = await this.고르기창커서();
      while (뒤 === 지금 && Date.now() < 바뀜끝) 뒤 = await this.고르기창커서();
    }
    await this.game.key('Return');
    await this.game.waitFor(고르기창, { gone: true, timeoutMs: 5_000 }).catch(() => undefined);
  }

  async 칸옮기기(쪽: 'RightArrow' | 'LeftArrow', 번: number): Promise<void> {
    for (let i = 0; i < 번; i += 1) await this.game.key(쪽);
  }

  async 고른칸(): Promise<number> {
    for (const 칸 of [1, 2, 3]) if (await 있나(this.game, `${자리판}/Plants/${칸}/Select_Arrow`)) return 칸;
    return 0;
  }

  async 칸으로가기(칸: 1 | 2 | 3): Promise<boolean> {
    const 끝 = Date.now() + 10_000;
    while (Date.now() < 끝) {
      const 지금 = await this.고른칸();
      if (지금 === 칸) return true;
      await this.game.key(지금 === 0 ? 'UpArrow' : 지금 < 칸 ? 'RightArrow' : 'LeftArrow');
      const 바뀜끝 = Date.now() + 1_500;
      let 뒤 = await this.고른칸();
      while (뒤 === 지금 && Date.now() < 바뀜끝) 뒤 = await this.고른칸();
    }
    return (await this.고른칸()) === 칸;
  }

  async 칸식물될때까지(칸: 1 | 2 | 3, 이름: 식물이름, 한도ms = 3_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    while (Date.now() < 끝) if ((await this.칸식물(칸)) === 이름) return true;
    return (await this.칸식물(칸)) === 이름;
  }

  async 칸에넣기(칸: 1 | 2 | 3, 이름: 식물이름): Promise<boolean> {
    for (let 번 = 0; 번 < 2; 번 += 1) {
      if ((await this.칸식물(칸)) === 이름) return true;
      if (!(await this.칸으로가기(칸))) continue;
      if (!(await this.고르기창열기())) continue;
      await this.고르기창에서고르기(식물이름들.indexOf(이름));
      if (await this.칸식물될때까지(칸, 이름)) return true;
    }
    return false;
  }

  async 칸채우기(차례: readonly 식물이름[]): Promise<void> {
    for (let 바퀴 = 0; 바퀴 < 2; 바퀴 += 1) {
      for (const [순번, 이름] of 차례.entries()) await this.칸에넣기((순번 + 1) as 1 | 2 | 3, 이름);
      if ((await this.칸들()) === 차례.join(' · ')) return;
    }
  }

  async 준비보이나(): Promise<boolean> {
    return await 화면안에있나(this.game, 캐릭터선택화면.준비글);
  }

  async 준비뜰때까지(): Promise<boolean> {
    const 끝 = Date.now() + 5_000;
    while (Date.now() < 끝) if (await 화면안에있나(this.game, 캐릭터선택화면.준비글)) return true;
    return await 화면안에있나(this.game, 캐릭터선택화면.준비글);
  }

  async 준비누르기(): Promise<void> {
    for (let 번 = 0; 번 < 3; 번 += 1) {
      await this.game.key('DownArrow');
      await this.game.key('Return');
      if (await 뜰때까지(this.game, '/CharSelectLocal UI Canvas/MapSelectOverlay/MapSelect/Bg/TitleText', 4_000)) return;
    }
  }

  async 뒤로(): Promise<void> {
    await this.game.key('Escape');
  }
}
