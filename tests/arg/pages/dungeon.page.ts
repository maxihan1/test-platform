import type { GameDriver } from '@platform/kit';

import { 공통HUD, 글만 } from '../components/hud.component.js';

export class 던전화면 {
  static readonly 주소 = 'game:BossRoom';
  static readonly 행동막대 = '/BossRoomHudCanvas/Hero Action Bar';
  static readonly 공격 = '/BossRoomHudCanvas/Hero Action Bar/Button0';
  static readonly 스킬1 = '/BossRoomHudCanvas/Hero Action Bar/Button1';
  static readonly 스킬2 = '/BossRoomHudCanvas/Hero Action Bar/Button2';
  static readonly 감정 = '/BossRoomHudCanvas/Hero Action Bar/Button3';
  static readonly 말풍선 = '/BossRoomHudCanvas/Tooltip/Text (TMP)';
  static readonly 조작안내 = '/BossRoomHudCanvas/HowToPlayPopupPanel';
  static readonly 조작안내제목 = '/BossRoomHudCanvas/HowToPlayPopupPanel/Title Text (TMP)';
  static readonly 조작안내확인 = '/BossRoomHudCanvas/HowToPlayPopupPanel/Confirmation Button';
  static readonly 조작안내확인글 = '/BossRoomHudCanvas/HowToPlayPopupPanel/Confirmation Button/Confirm Text (TMP)';
  static readonly 조작안내마우스그림 = '//*[contains(@name,Mouse)]';
  static readonly 감정막대 = '//*[contains(@name,Emotes)]';
  static readonly 조작안내글 = [1, 2, 3, 4].map((n) => `/BossRoomHudCanvas/HowToPlayPopupPanel/Instr Text ${String(n)} (TMP)`);
  static readonly 물약 = '/Showcase HUD/Button ';
  static readonly 물약글 = '/Showcase HUD/Button /Text';
  static readonly 내초상화 = '/BossRoomHudCanvas/Party HUD/Hero HUD/Button';
  static readonly 내이름 = '/BossRoomHudCanvas/Party HUD/Hero HUD/Button/Hero Name (TMP)';
  static readonly 내체력막대 = '/BossRoomHudCanvas/Party HUD/Hero HUD/Button/Hero HP Slider';
  static readonly 아군초상화 = '/BossRoomHudCanvas/Party HUD/Ally HUD 1/Button';
  static readonly 아군이름 = '/BossRoomHudCanvas/Party HUD/Ally HUD 1/Button/Ally Name 1 (TMP)';
  static readonly 아군체력막대 = '/BossRoomHudCanvas/Party HUD/Ally HUD 1/Button/Ally HP Slider 1';
  static readonly 임프 = 'Imp(Clone)';
  static readonly 항아리 = 'PickUpPot(Clone)';
  static readonly 톱니바퀴 = '/SettingsPanelCanvas/Settings Button';
  static readonly 닫기X = '/SettingsPanelCanvas/Quit Button';
  static readonly 적피해숫자 = '//*[contains(@name,DamageNumberEnemy)]';
  static readonly 내피해숫자 = '//*[contains(@name,DamageNumberMine)]';
  static readonly 회복숫자 = '//*[contains(@name,HealNumber)]';
  static readonly 보스처치큰글 = '//*[@text=보스 처치!]';
  static readonly 이름표 = '//*[contains(@name,UIName)]';
  static readonly 내영웅 = '//*[contains(@name,PlayerAvatar)]';

  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver, 시간 = 60_000): Promise<던전화면> {
    await game.waitFor(던전화면.행동막대, { timeoutMs: 시간 });
    return new 던전화면(game);
  }

  static 지금(game: GameDriver): 던전화면 {
    return new 던전화면(game);
  }

  async 조작안내닫기(): Promise<void> {
    for (let 번 = 0; 번 < 4; 번 += 1) {
      if ((await this.game.find(던전화면.조작안내확인)) === null) return;
      await this.game.click(던전화면.조작안내확인);
      const 닫혔다 = await this.game.waitFor(던전화면.조작안내, { gone: true, timeoutMs: 4_000 }).then(
        () => true,
        () => false,
      );
      if (닫혔다) return;
    }
    throw new Error('조작 안내 창이 「확인」을 네 번 눌러도 닫히지 않았다');
  }


  async 버튼글(버튼: string): Promise<string> {
    return 글만(await this.game.text(`${버튼}/Text`));
  }

  async 버튼눌림(버튼: string): Promise<boolean> {
    return (await this.game.get(버튼, 'UIHUDButton.interactable')) === true;
  }

  async 누르기(주소: string): Promise<void> {
    await this.game.click(주소);
  }

  async 물약글읽기(): Promise<string> {
    return 글만(await this.game.text(던전화면.물약글));
  }

  async 물약누르기(): Promise<void> {
    await this.game.click(던전화면.물약);
  }

  async 보이나(주소: string): Promise<boolean> {
    return (await this.game.find(주소)) !== null;
  }

  async 글(주소: string): Promise<string> {
    return 글만(await this.game.text(주소));
  }

  async 뜰때까지(주소: string, 시간 = 10_000): Promise<boolean> {
    return this.game.waitFor(주소, { timeoutMs: 시간 }).then(
      () => true,
      () => false,
    );
  }

  async 말풍선읽기(버튼: string): Promise<string> {
    const 손가락 = await this.game.touchDown(버튼);
    try {
      await this.game.waitFor(던전화면.말풍선, { timeoutMs: 5_000 });
      return await this.game.text(던전화면.말풍선);
    } finally {
      await this.game.touchUp(손가락);
    }
  }
}
