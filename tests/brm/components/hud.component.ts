import type { GameDriver } from '@platform/kit';

export const 색뗀글 = (글: string): string => 글.replace(/<[^>]+>/g, '').trim();

export class 공통HUD {
  static readonly 레벨줄 = '/Showcase HUD/PlayerBar/Label[0]/Text';
  static readonly 골드줄 = '/Showcase HUD/PlayerBar/Label[1]/Text';
  static readonly 경험치막대 = '/Showcase HUD/PlayerBar/Bar';
  static readonly 경험치글 = '/Showcase HUD/PlayerBar/Bar/Text';
  static readonly 메뉴 = '/Showcase HUD/Menu';
  static readonly 채팅띠 = '/Showcase HUD/ChatStrip';
  static readonly 채팅띠글 = '/Showcase HUD/ChatStrip/Text';
  static readonly 알림들 = '/Showcase HUD/Toasts';
  static readonly 물약버튼 = '/Showcase HUD/Button ';
  static readonly 물약글 = '/Showcase HUD/Button /Text';

  static readonly 창이름들 = ['가방', '상점', '일일 퀘스트', '우편함', '친구 · 파티', '길드', '채팅'] as const;

  constructor(private readonly game: GameDriver) {}

  static async 열린창모두닫기(game: GameDriver): Promise<void> {
    for (const 이름 of 공통HUD.창이름들) {
      if ((await game.find(`/Showcase HUD/Window ${이름}`)) !== null) {
        await game.click(`/Showcase HUD/Window ${이름}/Panel ${이름}/Button 닫기`);
        await game.waitFor(`/Showcase HUD/Window ${이름}`, { gone: true, timeoutMs: 5_000 });
      }
    }
  }

  static async 창열기(game: GameDriver, 누를것: string, 창이름: (typeof 공통HUD.창이름들)[number]): Promise<void> {
    if ((await game.find(`/Showcase HUD/Window ${창이름}`)) !== null) return;
    await 공통HUD.열린창모두닫기(game);
    await game.click(누를것);
    await game.waitFor(`/Showcase HUD/Window ${창이름}/Panel ${창이름}/Button 닫기`, { timeoutMs: 10_000 });
  }

  static 메뉴버튼(이름: '가방' | '상점' | '퀘스트' | '우편' | '친구' | '길드'): string {
    return `/Showcase HUD/Menu/Button ${이름}`;
  }

  static 알림(글: string): string {
    return `/Showcase HUD/Toasts/*/Text[contains(@text,${글})][-1]`;
  }

  static 큰알림(글: string): string {
    return `/Showcase HUD/*/Text[@text=${글}][-1]`;
  }

  async 그려질때까지(): Promise<void> {
    await this.game.waitFor('/Showcase HUD/PlayerBar', { timeoutMs: 30_000 });
  }

  async 레벨글(): Promise<string> {
    return 색뗀글(await this.game.text(공통HUD.레벨줄));
  }

  async 골드글(): Promise<string> {
    return 색뗀글(await this.game.text(공통HUD.골드줄));
  }

  async 경험치(): Promise<string> {
    return 색뗀글(await this.game.text(공통HUD.경험치글));
  }

  async 골드값(): Promise<number> {
    return Number((await this.골드글()).replace(/[^0-9]/g, ''));
  }

  async 골드가될때까지(글: string, 한도ms = 15_000): Promise<boolean> {
    return this.game.waitFor(공통HUD.골드줄, { text: 글, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 메뉴누르기(이름: '가방' | '상점' | '퀘스트' | '우편' | '친구' | '길드'): Promise<void> {
    await this.game.click(공통HUD.메뉴버튼(이름));
  }

  async 메뉴글(이름: '가방' | '상점' | '퀘스트' | '우편' | '친구' | '길드'): Promise<string> {
    return 색뗀글(await this.game.text(`${공통HUD.메뉴버튼(이름)}/Text`));
  }

  async 채팅띠누르기(): Promise<void> {
    await this.game.click(공통HUD.채팅띠);
  }

  async 채팅띠읽기(): Promise<string> {
    return 색뗀글(await this.game.text(공통HUD.채팅띠글));
  }

  async 알림글들(): Promise<string[]> {
    const 글들: string[] = [];
    for (let 번호 = 0; 번호 < 5; 번호 += 1) {
      const 찾음 = await this.game.find(`${공통HUD.알림들}/Toast[${String(번호)}]/Text`);
      if (찾음 === null) break;
      글들.push(색뗀글(찾음.text ?? ''));
    }
    return 글들;
  }

  async 알림뜸(글: string, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    do {
      if ((await this.알림글들()).some((줄) => 줄.includes(글))) return true;
    } while (Date.now() < 끝);
    return false;
  }

  async 큰알림뜸(글: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(공통HUD.큰알림(글), { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 물약누르기(): Promise<void> {
    await this.game.click(공통HUD.물약버튼);
  }

  async 물약버튼글(): Promise<string> {
    return 색뗀글(await this.game.text(공통HUD.물약글));
  }
}

export async function 줄글원문(game: GameDriver, 줄: string, 글들: string[], 최대 = 40): Promise<string | null> {
  const 조건 = 글들.map((글) => `[contains(@text,${글})]`).join('');
  for (let 뒤 = 1; 뒤 <= 최대; 뒤 += 1) {
    if ((await game.find(`${줄}[-${String(뒤)}]`)) === null) return null;
    const 찾음 = await game.find(`${줄}[-${String(뒤)}]//*${조건}`);
    if (찾음 !== null) return 찾음.text ?? '';
  }
  return null;
}

export async function 줄글될때까지(game: GameDriver, 줄: string, 글들: string[], 맞나: (원문: string | null) => boolean, 한도ms = 10_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  do {
    if (맞나(await 줄글원문(game, 줄, 글들))) return true;
  } while (Date.now() < 끝);
  return false;
}
