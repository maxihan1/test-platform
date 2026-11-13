import type { GameDriver } from '@platform/kit';

import { 오른쪽위버튼 } from '../components/corner.component.js';
import { 공통HUD } from '../components/hud.component.js';
import { 뜨는지, 사라지는지, 색벗기기, 숫자, 있는지, 화면글자 } from '../helpers/find.helper.js';

const 캔버스 = '/BossRoomHudCanvas';

export class 던전 {
  static readonly 주소 = 'game:BossRoom';
  static readonly 행동막대 = `${캔버스}/Hero Action Bar`;
  static readonly 감정막대 = `${캔버스}/Hero Emote Bar`;
  static readonly 초상화 = `${캔버스}/Party HUD/Hero HUD/Button`;
  static readonly 이름 = `${캔버스}/Party HUD/Hero HUD/Button/Hero Name (TMP)`;
  static readonly 체력막대 = `${캔버스}/Party HUD/Hero HUD/Button/Hero HP Slider`;
  static readonly 안내창 = `${캔버스}/HowToPlayPopupPanel`;
  static readonly 안내제목 = `${캔버스}/HowToPlayPopupPanel/Title Text (TMP)`;
  static readonly 안내확인 = `${캔버스}/HowToPlayPopupPanel/Confirmation Button`;
  static readonly 안내확인글칸 = `${캔버스}/HowToPlayPopupPanel/Confirmation Button/Confirm Text (TMP)`;
  static readonly 물약버튼 = '/Showcase HUD/Button ';
  static readonly 물약글 = '/Showcase HUD/Button /Text';

  readonly hud: 공통HUD;
  readonly 구석: 오른쪽위버튼;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
    this.구석 = new 오른쪽위버튼(game);
  }

  static async 열기(game: GameDriver): Promise<던전> {
    await game.waitFor(던전.행동막대, { timeoutMs: 60_000 });
    return new 던전(game);
  }

  static 행동버튼(번호: 0 | 1 | 2 | 3): string {
    return `${던전.행동막대}/Button${String(번호)}`;
  }

  static 안내글(번호: 1 | 2 | 3 | 4): string {
    return `${캔버스}/HowToPlayPopupPanel/Instr Text ${String(번호)} (TMP)`;
  }

  async 행동버튼글(번호: 0 | 1 | 2 | 3): Promise<string | null> {
    return (await this.game.find(`${던전.행동버튼(번호)}/Text`))?.text ?? null;
  }

  async 행동버튼보이는지(번호: 0 | 1 | 2 | 3): Promise<boolean> {
    return (await this.game.find(던전.행동버튼(번호))) !== null;
  }

  async 감정누르기(): Promise<void> {
    await this.game.click(던전.행동버튼(3));
  }

  async 안내확인누르기(): Promise<void> {
    await this.game.click(던전.안내확인);
  }

  async 안내창닫기(): Promise<void> {
    if ((await this.game.find(던전.안내확인)) !== null) {
      await this.game.click(던전.안내확인);
      await this.game.waitFor(던전.안내창, { gone: true, timeoutMs: 10_000 });
    }
  }

  async 물약개수(): Promise<number> {
    return 숫자(await this.game.text(던전.물약글));
  }

  async 물약누르기(): Promise<void> {
    await this.game.click(던전.물약글);
  }

  async 물약개수가될때까지(개수: number, timeoutMs = 10_000): Promise<boolean> {
    return this.game.waitFor(던전.물약글, { text: `물약 ${String(개수)}`, timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 체력최댓값(): Promise<unknown> {
    return this.game.get(던전.체력막대, 'Slider.maxValue');
  }

  async 안내창이뜨는지(timeoutMs = 15_000): Promise<boolean> {
    return 뜨는지(this.game, 던전.안내창, timeoutMs);
  }

  async 안내창이사라지는지(timeoutMs = 10_000): Promise<boolean> {
    return 사라지는지(this.game, 던전.안내창, timeoutMs);
  }

  async 안내제목글(): Promise<string> {
    return (await this.game.find(던전.안내제목))?.text ?? '보이지 않음';
  }

  async 안내확인버튼글(): Promise<string> {
    return (await this.game.find(던전.안내확인글칸))?.text ?? '보이지 않음';
  }

  async 안내설명글들(): Promise<string> {
    const 글들: string[] = [];
    for (const 번호 of [1, 2, 3] as const) {
      const 글 = (await this.game.find(던전.안내글(번호)))?.text ?? '보이지 않음';
      글들.push(글.replace(/\s+/g, ' ').trim());
    }
    return 글들.join(' / ');
  }

  async 행동막대가채워질때까지(): Promise<void> {
    await this.game.waitFor(던전.행동버튼(3), { timeoutMs: 15_000 });
  }

  async 행동버튼글들(): Promise<string> {
    await this.행동막대가채워질때까지();
    const 글들: string[] = [];
    for (const 번호 of [0, 1, 2, 3] as const) 글들.push((await this.행동버튼글(번호)) ?? '없음');
    return 글들.join(' · ');
  }

  async 감정막대가뜨는지(timeoutMs = 10_000): Promise<boolean> {
    return 뜨는지(this.game, 던전.감정막대, timeoutMs);
  }

  async 감정막대가사라지는지(timeoutMs = 10_000): Promise<boolean> {
    return 사라지는지(this.game, 던전.감정막대, timeoutMs);
  }

  async 초상화가채워질때까지(이름: string): Promise<void> {
    await this.game.waitFor(던전.이름, { text: 이름, timeoutMs: 20_000 });
  }

  async 초상화이름(): Promise<string> {
    return (await this.game.find(던전.이름))?.text ?? '보이지 않음';
  }

  async 체력막대가있는지(): Promise<boolean> {
    return 있는지(this.game, 던전.체력막대);
  }

  async 임프이름표가있는지(): Promise<boolean> {
    return 있는지(this.game, 화면글자('임프'));
  }

  async 체력최댓값수(): Promise<number> {
    return Number(await this.체력최댓값());
  }

  async 보이는것들(): Promise<string> {
    const 칸들: [string, string][] = [
      ['초상화', 던전.초상화],
      ['행동 막대', 던전.행동막대],
      ['「물약」 버튼', 던전.물약버튼],
      ['메뉴', 공통HUD.메뉴],
    ];
    const 보임: string[] = [];
    for (const [이름, 주소] of 칸들) if (await 있는지(this.game, 주소)) 보임.push(이름);
    return 보임.join(' · ');
  }

  async 물약버튼모양(): Promise<string> {
    const 단추 = await this.game.find(던전.물약버튼);
    const 막대 = await this.game.find(던전.행동막대);
    if (단추 === null) return '물약 버튼 없음';
    if (막대 === null) return '행동 막대 없음';
    const 글 = 색벗기기(await this.game.text(던전.물약글)).trim();
    const 왼쪽 = 단추.x !== undefined && 막대.x !== undefined && 단추.x < 막대.x;
    return `${/^물약 \d+$/.test(글) ? '물약 <개수>' : 글} · ${왼쪽 ? '행동 막대 왼쪽' : '행동 막대 왼쪽 아님'}`;
  }
}
