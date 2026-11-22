import type { GameDriver } from '@platform/kit';

export class 알림띠 {
  static readonly 뿌리 = '/Showcase HUD/Toasts';

  constructor(private readonly game: GameDriver) {}

  글주소(글: string): string {
    return `${알림띠.뿌리}//*[contains(@text,"${글}")]`;
  }

  async 있나(글: string): Promise<boolean> {
    try {
      return (await this.game.find(this.글주소(글))) !== null;
    } catch (e) {
      if (e instanceof Error && e.message.includes('하나를 고를 수 없습니다')) return true;
      throw e;
    }
  }

  async 뜰때까지(글: string, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if (await this.있나(글)) return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 사라질때까지(글: string, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if (!(await this.있나(글))) return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 글들(): Promise<string[]> {
    const 모은 = [];
    for (let i = 0; i < 8; i += 1) {
      const 칸 = await this.game.find(`${알림띠.뿌리}/Toast[${String(i)}]/Text`);
      if (칸 === null) break;
      모은.push(await this.game.text(`${알림띠.뿌리}/Toast[${String(i)}]/Text`));
    }
    return 모은;
  }

  async 그글줄주소(글: string, 한도ms = 10_000): Promise<string | null> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      for (let i = 0; i < 8; i += 1) {
        const 주소 = `${알림띠.뿌리}/Toast[${String(i)}]/Text`;
        if ((await this.game.find(주소)) === null) break;
        if ((await this.game.text(주소)).includes(글)) return 주소;
      }
      if (Date.now() > 끝) return null;
    }
  }

  async 첫줄색(한도ms = 10_000): Promise<{ 바탕: number[]; 글: number[] } | null> {
    const 줄 = `${알림띠.뿌리}/Toast[0]`;
    if (!(await this.game.waitFor(`${줄}/Text`, { timeoutMs: 한도ms }).then(() => true, () => false))) return null;
    return {
      바탕: (await this.game.get(줄, 'Image.color')) as number[],
      글: (await this.game.get(`${줄}/Text`, 'TextMeshProUGUI.color')) as number[],
    };
  }
}
