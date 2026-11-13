import type { GameDriver } from '@platform/kit';

import { 색벗기기, 숫자 } from '../helpers/find.helper.js';
import { 알림 } from './toast.component.js';

export type 메뉴이름 = '가방' | '상점' | '퀘스트' | '우편' | '친구' | '길드';

export class 공통HUD {
  static readonly 상단바 = '/Showcase HUD/PlayerBar';
  static readonly 레벨이름칸 = '/Showcase HUD/PlayerBar/Label[0]/Text';
  static readonly 골드칸 = '/Showcase HUD/PlayerBar/Label[1]/Text';
  static readonly 경험치칸 = '/Showcase HUD/PlayerBar/Bar/Text';
  static readonly 메뉴 = '/Showcase HUD/Menu';
  static readonly 채팅띠 = '/Showcase HUD/ChatStrip';
  static readonly 공지띠 = '/Showcase HUD/NoticeBar';

  readonly 알림: 알림;

  constructor(private readonly game: GameDriver) {
    this.알림 = new 알림(game);
  }

  static 메뉴버튼(이름: 메뉴이름): string {
    return `${공통HUD.메뉴}/*[contains(@name,${이름})]`;
  }

  async 보이는지(): Promise<boolean> {
    return (await this.game.find(공통HUD.상단바)) !== null;
  }

  async 레벨이름글(): Promise<string> {
    return this.game.text(공통HUD.레벨이름칸);
  }

  async 캐릭터이름(): Promise<string> {
    return 색벗기기(await this.레벨이름글()).replace(/^Lv\.\d+\s+/, '').trim();
  }

  async 골드글(): Promise<string> {
    return this.game.text(공통HUD.골드칸);
  }

  async 골드(): Promise<number> {
    return 숫자(await this.골드글());
  }

  async 골드가될때까지(값: number, timeoutMs = 10_000): Promise<void> {
    await this.game.waitFor(공통HUD.골드칸, { text: `${값.toLocaleString('en-US')} G`, timeoutMs });
  }

  async 경험치글(): Promise<string> {
    return this.game.text(공통HUD.경험치칸);
  }

  async 메뉴누르기(이름: 메뉴이름): Promise<void> {
    await this.game.click(공통HUD.메뉴버튼(이름));
  }

  async 창열기(이름: 메뉴이름 | '채팅', 제목주소: string): Promise<void> {
    for (let i = 0; i < 3; i += 1) {
      if ((await this.game.find(제목주소)) !== null) return;
      if (이름 === '채팅') await this.채팅띠누르기();
      else await this.메뉴누르기(이름);
      const 떴다 = await this.game.waitFor(제목주소, { timeoutMs: 5_000 }).then(
        () => true,
        () => false,
      );
      if (떴다) return;
    }
    throw new Error(`「${이름}」 창이 세 번 눌러도 열리지 않았다`);
  }

  async 메뉴글(이름: 메뉴이름): Promise<string> {
    return 색벗기기(await this.game.text(`${공통HUD.메뉴버튼(이름)}/Text`));
  }

  async 채팅띠누르기(): Promise<void> {
    await this.game.click(공통HUD.채팅띠);
  }

  async 채팅띠글(): Promise<string> {
    return this.game.text(`${공통HUD.채팅띠}/Text`);
  }
}
