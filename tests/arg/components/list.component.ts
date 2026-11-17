import type { GameDriver } from '@platform/kit';

import { 글만 } from './hud.component.js';

export class 목록 {
  constructor(
    private readonly game: GameDriver,
    readonly 내용: string,
  ) {}

  async 줄경로들(최대 = 40): Promise<string[]> {
    if ((await this.game.find(`${this.내용}/Row[0]`)) === null) {
      const 하나 = await this.game.find(`${this.내용}/Row`).then(
        (찾은것) => (찾은것 === null ? '없음' : '하나'),
        (오류: unknown) => {
          if (오류 instanceof Error && 오류.message.includes('개라')) return '여럿';
          throw 오류;
        },
      );
      if (하나 === '없음') return [];
      if (하나 === '하나') return [`${this.내용}/Row`];
      await this.game.waitFor(`${this.내용}/Row[0]`, { timeoutMs: 5_000 });
    }
    const 경로들: string[] = [];
    for (let i = 0; i < 최대; i += 1) {
      const 경로 = `${this.내용}/Row[${String(i)}]`;
      if ((await this.game.find(경로)) === null) break;
      경로들.push(경로);
    }
    return 경로들;
  }

  async 줄수(): Promise<number> {
    return (await this.줄경로들()).length;
  }

  async 칸글(줄: string, 칸 = 0): Promise<string> {
    const 찾은것 = await this.game.find(`${줄}/Label[${String(칸)}]/Text`);
    if (찾은것 !== null) return 글만(찾은것.text ?? '');
    if (칸 !== 0) return '';
    const 하나 = await this.game.find(`${줄}/Label/Text`);
    return 하나 === null ? '' : 글만(하나.text ?? '');
  }

  async 줄글(줄: string): Promise<string> {
    const 직접 = await this.game.find(`${줄}/Text`).catch(() => null);
    if (직접 !== null) return 글만(직접.text ?? '');
    const 글들: string[] = [];
    for (let 칸 = 0; 칸 < 5; 칸 += 1) {
      const 찾은것 = await this.game.find(`${줄}/Label[${String(칸)}]/Text`);
      if (찾은것 === null) break;
      글들.push(글만(찾은것.text ?? ''));
    }
    return 글들.join(' · ');
  }

  async 첫칸들(): Promise<string[]> {
    const 글들: string[] = [];
    for (const 줄 of await this.줄경로들()) 글들.push(await this.칸글(줄, 0));
    return 글들;
  }

  async 이름줄(이름: string): Promise<string | null> {
    for (const 줄 of await this.줄경로들()) {
      const 첫칸 = await this.칸글(줄, 0);
      if (첫칸 === 이름 || 첫칸.startsWith(`${이름} x`) || 첫칸.replace(/^● /, '') === 이름) return 줄;
    }
    return null;
  }

  async 이름줄들(이름: string): Promise<string[]> {
    const 줄들: string[] = [];
    for (const 줄 of await this.줄경로들()) {
      const 첫칸 = await this.칸글(줄, 0);
      if (첫칸 === 이름 || 첫칸.startsWith(`${이름} x`)) 줄들.push(줄);
    }
    return 줄들;
  }

  async 줄버튼(줄: string, 앞글: string): Promise<string | null> {
    for (const 이름 of [`Button ${앞글}`]) {
      if ((await this.game.find(`${줄}/${이름}`)) !== null) return `${줄}/${이름}`;
    }
    const 찾은것 = await this.game.find(`${줄}//*[contains(@name,Button ${앞글})]`).catch(() => null);
    return 찾은것?.path ?? null;
  }
}
