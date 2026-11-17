import type { GameDriver } from '@platform/kit';

export const 글만 = (글: string): string => 글.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export class 공통HUD {
  static readonly 상단바 = '/Showcase HUD/PlayerBar';
  static readonly 레벨이름 = '/Showcase HUD/PlayerBar/Label[0]/Text';
  static readonly 골드 = '/Showcase HUD/PlayerBar/Label[1]/Text';
  static readonly 경험치 = '/Showcase HUD/PlayerBar/Bar/Text';
  static readonly 메뉴 = '/Showcase HUD/Menu';
  static readonly 채팅띠 = '/Showcase HUD/ChatStrip';
  static readonly 채팅띠글 = '/Showcase HUD/ChatStrip/Text';
  static readonly 알림들 = '/Showcase HUD/Toasts/Toast/Text';

  constructor(private readonly game: GameDriver) {}

  static 메뉴버튼(이름: '가방' | '상점' | '퀘스트' | '우편' | '친구' | '길드'): string {
    return `/Showcase HUD/Menu/Button ${이름}`;
  }

  async 메뉴누르기(이름: '가방' | '상점' | '퀘스트' | '우편' | '친구' | '길드'): Promise<void> {
    await this.game.click(공통HUD.메뉴버튼(이름));
  }

  async 레벨이름글(): Promise<string> {
    return 글만(await this.game.text(공통HUD.레벨이름));
  }

  async 골드글(): Promise<string> {
    return 글만(await this.game.text(공통HUD.골드));
  }

  async 경험치글(): Promise<string> {
    return 글만(await this.game.text(공통HUD.경험치));
  }

  async 우편메뉴글(): Promise<string> {
    return 글만(await this.game.text(`${공통HUD.메뉴버튼('우편')}/Text`));
  }

  async 채팅띠읽기(): Promise<string> {
    return await this.game.text(공통HUD.채팅띠글);
  }

  async 알림글들(): Promise<string[]> {
    const 글들: string[] = [];
    const 하나 = await this.game.find(공통HUD.알림들).catch(() => null);
    if (하나 !== null) return [글만(하나.text ?? '')];
    for (let i = 0; i < 6; i += 1) {
      const 찾은것 = await this.game.find(`/Showcase HUD/Toasts/Toast[${String(i)}]/Text`);
      if (찾은것 === null) break;
      글들.push(글만(찾은것.text ?? ''));
    }
    return 글들;
  }

  async 알림기다리기(글: string, 시간 = 10_000): Promise<boolean> {
    return this.game.waitFor(`//*[contains(@text,${글})]`, { timeoutMs: 시간 }).then(
      () => true,
      () => false,
    );
  }
}
