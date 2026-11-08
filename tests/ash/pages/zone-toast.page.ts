import type { GameDriver } from '@platform/kit';

export class 구역안내띠 {
  static readonly 주소 = 'game:World/ToastCanvas/ToastStack/ToastMessage';

  static readonly 띠 = '/ToastCanvas/ToastStack/ToastMessage';

  constructor(private readonly game: GameDriver) {}

  private async 지금글들(): Promise<string[]> {
    const 하나 = await this.game.find(`${구역안내띠.띠}/Text`).catch(() => undefined);
    if (하나 !== undefined) return 하나 === null ? [] : [하나.text ?? ''];
    const 글들: string[] = [];
    for (let 순번 = 0; 순번 < 8; 순번 += 1) {
      const 찾은 = await this.game.find(`${구역안내띠.띠}[${String(순번)}]/Text`);
      if (찾은 === null) break;
      글들.push(찾은.text ?? '');
    }
    return 글들;
  }

  async 뜬글들모으기(한도 = 10_000, 더볼 = 2_000): Promise<string[]> {
    const 본글 = new Set<string>();
    const 끝 = Date.now() + 한도;
    let 마감 = 끝;
    for (;;) {
      for (const 글 of await this.지금글들()) {
        if (글 === '') continue;
        if (본글.size === 0) 마감 = Math.min(끝, Date.now() + 더볼);
        본글.add(글);
      }
      if (Date.now() >= 마감) return [...본글];
      await new Promise((깨운다) => setTimeout(깨운다, 200));
    }
  }
}
