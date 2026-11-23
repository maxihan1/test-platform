import type { GameDriver } from '@platform/kit';

const 뿌리 = '/Showcase HUD/Invite';

export class 초대창 {
  static readonly 주소 = 'game:*/Showcase HUD/Invite';
  static readonly 가림막 = `${뿌리}/Shade`;
  static readonly 뿌리 = 뿌리;
  static readonly 파티패널 = `${뿌리}/Panel 파티 초대`;
  static readonly 수락버튼 = `${뿌리}[-1]//Button 수락`;
  static readonly 거절버튼 = `${뿌리}[-1]//Button 거절`;

  private constructor(private readonly game: GameDriver) {}

  static async 뜰때까지(game: GameDriver, 한도ms = 15_000): Promise<초대창 | null> {
    const 떴다 = await game.waitFor(초대창.수락버튼, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
    return 떴다 ? new 초대창(game) : null;
  }

  async 수락누르기(): Promise<void> {
    await this.game.click(초대창.수락버튼);
  }

  async 거절누르기(): Promise<void> {
    await this.game.click(초대창.거절버튼);
  }

  async 수락보임(): Promise<boolean> {
    return (await this.game.find(초대창.수락버튼)) !== null;
  }

  async 거절보임(): Promise<boolean> {
    return (await this.game.find(초대창.거절버튼)) !== null;
  }

  async 닫힐때까지(한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(초대창.수락버튼, { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 제목있나(제목: string): Promise<boolean> {
    return (await this.game.find(`${뿌리}//*[@text="${제목}"]`)) !== null;
  }

  글주소(조각: string, 순번?: number): string {
    return `${뿌리}//*[contains(@text,"${조각}")]${순번 === undefined ? '' : `[${String(순번)}]`}`;
  }

  async 글(조각: string, 순번?: number): Promise<string | null> {
    try {
      if ((await this.game.find(this.글주소(조각, 순번))) === null) return null;
      return await this.game.text(this.글주소(조각, 순번));
    } catch (e) {
      if (e instanceof Error && e.message.includes('하나를 고를 수 없습니다')) return null;
      throw e;
    }
  }

  async 글기다리기(조각: string, 순번?: number, 한도ms = 10_000): Promise<string | null> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      const 글 = await this.글(조각, 순번);
      if (글 !== null) return 글;
      if (Date.now() > 끝) return null;
    }
  }

  static async 가림막색(game: GameDriver): Promise<number[] | null> {
    if ((await game.find(초대창.가림막)) === null) return null;
    return (await game.get(초대창.가림막, 'Image.color')) as number[];
  }

  static async 길드초대창수(game: GameDriver): Promise<number> {
    if ((await game.find(`${뿌리}[1]/Panel 길드 초대`)) !== null) return 2;
    return (await game.find(`${뿌리}[0]/Panel 길드 초대`)) !== null ? 1 : 0;
  }

  static async 길드초대수락(game: GameDriver, 번째: number): Promise<void> {
    await game.click(`${뿌리}[${String(번째)}]/Panel 길드 초대/Button 수락`);
  }
}
