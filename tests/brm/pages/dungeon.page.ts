import type { GameDriver } from '@platform/kit';

import { 공통HUD, 색뗀글 } from '../components/hud.component.js';

export type 행동버튼 = '공격' | '스킬 1' | '스킬 2' | '감정';

export class 던전화면 {
  static readonly 주소 = 'game:BossRoom';
  static readonly 판 = '/BossRoomHudCanvas';
  static readonly 조작안내 = '/BossRoomHudCanvas/HowToPlayPopupPanel';
  static readonly 조작안내확인 = '/BossRoomHudCanvas/HowToPlayPopupPanel/Confirmation Button';
  static readonly 행동막대 = '/BossRoomHudCanvas/Hero Action Bar';
  static readonly 내초상화 = '/BossRoomHudCanvas/Party HUD/Hero HUD/Button';
  static readonly 내이름줄 = '/BossRoomHudCanvas/Party HUD/Hero HUD/Button/Hero Name (TMP)';
  static readonly 내체력막대 = '/BossRoomHudCanvas/Party HUD/Hero HUD/Button/Hero HP Slider';
  static readonly 알림줄 = '/BossRoomHudCanvas/MessageFeed';
  static readonly 말풍선 = '/BossRoomHudCanvas/Tooltip/Text (TMP)';
  static readonly 임프 = '/Imp(Clone)';
  static readonly 항아리 = '/PickUpPot(Clone)';
  static readonly 첫임프 = '/Imp(Clone)[0]';
  static readonly 고르기표시 = '//*[contains(@name,fx_TargetReticule)]';
  static readonly 적피해숫자 = '/Showcase HUD/DamageNumberEnemy[-1]/Text';
  static readonly 내피해숫자 = '/Showcase HUD/DamageNumberMine[-1]/Text';
  static readonly 회복숫자 = '/Showcase HUD/HealNumber[-1]/Text';
  static readonly 내얼굴 = '/BossRoomHudCanvas/Party HUD/Hero HUD/Button/Hero Portrait';
  static readonly 동료이름줄 = '/BossRoomHudCanvas/Party HUD/Ally HUD 1/Button/Ally Name 1 (TMP)';
  static readonly 동료체력막대 = '/BossRoomHudCanvas/Party HUD/Ally HUD 1/Button/Ally HP Slider 1';
  static readonly 동료직업방패 = '/BossRoomHudCanvas/Party HUD/Ally HUD 1//Ally Symbol 1';
  static readonly 그림 = { 들기: 'ui_action_pickup', 내려놓기: 'ui_action_putdown', 부활: 'ui_revive', 탱커기본: 'ui_tank_atk' } as const;

  readonly hud: 공통HUD;

  constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<던전화면> {
    await game.waitFor(던전화면.행동막대, { timeoutMs: 90_000 });
    return new 던전화면(game);
  }

  static 버튼(이름: 행동버튼): string {
    const 번호 = { 공격: 0, '스킬 1': 1, '스킬 2': 2, 감정: 3 }[이름];
    return `${던전화면.행동막대}/Button${String(번호)}`;
  }

  static 동료초상화(번호 = 1): string {
    return `/BossRoomHudCanvas/Party HUD/Ally HUD ${String(번호)}/Button`;
  }

  async 조작안내글(칸: 'Title Text (TMP)' | 'Instr Text 1 (TMP)' | 'Instr Text 2 (TMP)' | 'Instr Text 3 (TMP)' | 'Instr Text 4 (TMP)'): Promise<string> {
    return 색뗀글(await this.game.text(`${던전화면.조작안내}/${칸}`));
  }

  async 조작안내확인누르기(): Promise<void> {
    await this.game.click(던전화면.조작안내확인);
  }

  async 조작안내닫힐때까지(한도ms = 4_000): Promise<boolean> {
    return this.game.waitFor(던전화면.조작안내, { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 행동버튼글(이름: 행동버튼): Promise<string> {
    return 색뗀글(await this.game.text(`${던전화면.버튼(이름)}/Text`));
  }

  async 행동버튼그림(이름: 행동버튼): Promise<string> {
    return String(await this.game.get(던전화면.버튼(이름), 'Image.sprite.name'));
  }

  async 행동버튼눌림(이름: 행동버튼): Promise<boolean> {
    return (await this.game.get(던전화면.버튼(이름), 'UIHUDButton.interactable')) === true;
  }

  async 누르기(이름: 행동버튼): Promise<void> {
    await this.game.click(던전화면.버튼(이름));
  }

  async 임프고르고공격(): Promise<void> {
    await this.game.click(던전화면.임프);
    await this.game.click(던전화면.버튼('공격'));
  }

  async 항아리고르기(): Promise<void> {
    await this.game.click(던전화면.항아리);
  }

  async 동료고르기(번호 = 1): Promise<void> {
    await this.game.click(던전화면.동료초상화(번호));
  }

  async 알림줄뜸(글: string, 한도ms = 15_000): Promise<boolean> {
    return this.game.waitFor(`${던전화면.알림줄}//*[contains(@text,${글})][-1]`, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 결과화면으로넘어갈때까지(한도ms = 60_000): Promise<boolean> {
    return this.game.waitFor('/PostGameUICanvas', { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 조작안내뜰때까지(한도ms = 90_000): Promise<boolean> {
    return this.game.waitFor(던전화면.조작안내확인, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 행동버튼키(이름: 행동버튼): Promise<string> {
    return 색뗀글(await this.game.text(`${던전화면.버튼(이름)}/Text (1)`));
  }

  async 행동버튼그림이될때까지(이름: 행동버튼, 그림: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitForValue(던전화면.버튼(이름), 'Image.sprite.name', 그림, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 보임(주소: string): Promise<boolean> {
    return (await this.game.find(주소)) !== null;
  }

  async 임프누르기(): Promise<void> {
    await this.game.click(던전화면.임프);
  }

  async 첫임프누르기(): Promise<void> {
    await this.game.click(던전화면.첫임프);
  }

  async 고르기표시뜸(한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(던전화면.고르기표시, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 임프있나(): Promise<boolean> {
    return (await this.game.find(던전화면.첫임프)) !== null;
  }

  async 임프다사라질때까지(한도ms = 20_000): Promise<boolean> {
    return this.game.waitFor(던전화면.첫임프, { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 임프사라질때까지치기(번수 = 8): Promise<boolean> {
    for (let 번 = 0; 번 < 번수; 번 += 1) {
      if (!(await this.임프있나())) return true;
      await this.임프고르고공격();
      if (await this.임프다사라질때까지(3_000)) return true;
    }
    return !(await this.임프있나());
  }

  async 항아리뜰때까지(한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(던전화면.항아리, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 동료이름(): Promise<string> {
    return 색뗀글(await this.game.text(던전화면.동료이름줄));
  }

  async 내이름(): Promise<string> {
    return 색뗀글(await this.game.text(던전화면.내이름줄));
  }

  async 조작안내확인글(): Promise<string> {
    return 색뗀글(await this.game.text(`${던전화면.조작안내확인}/Confirm Text (TMP)`));
  }

  async 조작안내그림보임(): Promise<boolean> {
    for (const 이름 of ['Imp Image 1', 'Imp Image 2', 'Imp Image 3', 'Help BG Img']) {
      if ((await this.game.find(`${던전화면.조작안내}/${이름}`)) === null) return false;
    }
    return true;
  }

  async 행동버튼뜰때까지(이름: 행동버튼, 한도ms = 30_000): Promise<boolean> {
    return this.game.waitFor(던전화면.버튼(이름), { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 행동막대다시뜰때까지(한도ms = 120_000): Promise<boolean> {
    return this.game.waitForValue(던전화면.버튼('공격'), 'UIHUDButton.interactable', true, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 숫자뜰때까지(주소: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(주소, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 숫자사라질때까지(주소: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(주소, { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  static readonly 감정막대 = '/BossRoomHudCanvas/Hero Emote Bar';
  static readonly 행동말풍선 = '/BossRoomHudCanvas/Tooltip/Text (TMP)';

  static 조작그림(번호: 1 | 2 | 3): string {
    return `${던전화면.조작안내}/Controls Img ${String(번호)}`;
  }

  async 조작그림보임(번호: 1 | 2 | 3): Promise<boolean> {
    return (await this.game.find(던전화면.조작그림(번호))) !== null;
  }

  async 확대버튼보임(): Promise<boolean> {
    const 이름 = await this.game.find('//*[contains(@name,Zoom)]');
    const 글 = await this.game.find('/BossRoomHudCanvas//*[contains(@text,확대)]');
    return 이름 !== null || 글 !== null;
  }

  async 감정막대열릴때까지(한도ms = 5_000): Promise<boolean> {
    return this.game.waitFor(던전화면.감정막대, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 감정막대닫힐때까지(한도ms = 5_000): Promise<boolean> {
    return this.game.waitFor(던전화면.감정막대, { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 감정버튼수(): Promise<number> {
    let 수 = 0;
    while (수 < 8 && (await this.game.find(`${던전화면.감정막대}/Button${String(수)}`)) !== null) 수 += 1;
    return 수;
  }

  async 행동버튼눌러두기(이름: 행동버튼): Promise<number> {
    return this.game.touchDown(던전화면.버튼(이름));
  }

  async 손가락떼기(손가락: number): Promise<void> {
    await this.game.touchUp(손가락);
  }

  async 행동말풍선뜸(한도ms = 4_000): Promise<boolean> {
    return this.game.waitFor(던전화면.행동말풍선, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }
}
