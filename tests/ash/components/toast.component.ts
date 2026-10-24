import type { GameDriver } from '@platform/kit';

export class 안내띠 {
  static readonly 띠 = '/ToastCanvas/ToastStack/ToastMessage';

  constructor(private readonly game: GameDriver) {}

  private async 글들(): Promise<string[]> {
    const 글들: string[] = [];
    const 하나 = await this.game.find(`${안내띠.띠}/Text`).catch(() => undefined);
    if (하나 !== undefined && 하나 !== null) return [하나.text ?? ''];
    for (let 순번 = 0; 순번 < 8; 순번 += 1) {
      const 찾은 = await this.game.find(`${안내띠.띠}[${String(순번)}]/Text`);
      if (찾은 === null) break;
      글들.push(찾은.text ?? '');
    }
    return 글들;
  }

  async 뜰때까지(글자: string, 한도 = 10_000): Promise<void> {
    const 끝 = Date.now() + 한도;
    for (;;) {
      if ((await this.글들()).some((글) => 글.includes(글자))) return;
      if (Date.now() >= 끝) throw new Error(`안내 띠에 「${글자}」가 ${String(한도 / 1000)}초 안에 뜨지 않았다`);
      await new Promise((깨운다) => setTimeout(깨운다, 300));
    }
  }

  async 읽기(): Promise<string | null> {
    const 글들 = await this.글들();
    return 글들.length === 0 ? null : 글들.join(' / ');
  }
}
