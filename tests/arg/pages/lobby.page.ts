import type { GameDriver } from '@platform/kit';

import { 공통HUD, 글만 } from '../components/hud.component.js';

export class 로비화면 {
  static readonly 주소 = 'game:CharSelect';
  static readonly 제목 = '/CharacterSelectCanvas/Title Text bg/TitleText (TMP)';
  static readonly 접속인원 = '/CharacterSelectCanvas/NumPlayersBox/Text (TMP)';
  static readonly 환영글 = '/CharacterSelectCanvas/ClassInfoBox/Player';
  static readonly 직업안내 = '/CharacterSelectCanvas/ClassInfoBox/Class instr (TMP)';
  static readonly 직업이름 = '/CharacterSelectCanvas/ClassInfoBox/HideAllTheseWhenNoClass/CurrentClass (TMP)';
  static readonly 스킬아이콘1 = '/CharacterSelectCanvas/ClassInfoBox/HideAllTheseWhenNoClass/AbilityIcon1';
  static readonly 스킬아이콘2 = '/CharacterSelectCanvas/ClassInfoBox/HideAllTheseWhenNoClass/AbilityIcon2';
  static readonly 말풍선 = '/CharacterSelectCanvas/Tooltip/Text (TMP)';
  static readonly 준비 = '/CharacterSelectCanvas/ClassInfoBox/DecorativeFrame/Ready Btn';
  static readonly 준비글 = '/CharacterSelectCanvas/ClassInfoBox/DecorativeFrame/Ready Btn/Text (TMP)';
  static readonly 톱니바퀴 = '/SettingsPanelCanvas/Settings Button';
  static readonly 닫기X = '/SettingsPanelCanvas/Quit Button';
  static readonly 레벨업알림 = '//*[contains(@text,레벨 업! Lv.2)]';
  static readonly 레벨업큰글 = '//*[@text=레벨 업!]';
  static readonly 불러오는중 = '/LoadingScreen/LoadingScreenPanel/Title Text (TMP)';
  static readonly 카드차례 = { 탱커: 0, 궁수: 2, 마법사: 4, 도적: 6 } as const;

  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver, 시간 = 60_000): Promise<로비화면> {
    await game.waitFor(로비화면.준비, { timeoutMs: 시간 });
    return new 로비화면(game);
  }

  static 지금(game: GameDriver): 로비화면 {
    return new 로비화면(game);
  }

  static 카드(번호: number): string {
    return `/CharacterSelectCanvas/PlayerSeats/PlayerSeat (${String(번호)})/AnimationContainer/ClickInteract`;
  }

  async 카드누르기(번호: number): Promise<void> {
    for (let 번 = 0; 번 < 3; 번 += 1) {
      await this.game.click(로비화면.카드(번호));
      const 골랐다 = await this.game.waitFor(로비화면.직업이름, { timeoutMs: 5_000 }).then(
        () => true,
        () => false,
      );
      if (골랐다) return;
    }
    throw new Error(`영웅 카드 ${String(번호)} 을 세 번 눌러도 직업 이름이 뜨지 않았다`);
  }

  async 준비누르기(): Promise<void> {
    await this.game.click(로비화면.준비);
  }

  async 준비글읽기(): Promise<string> {
    return 글만(await this.game.text(로비화면.준비글));
  }

  async 직업이름읽기(): Promise<string> {
    const 찾은것 = await this.game.find(로비화면.직업이름);
    return 찾은것 === null ? '' : 글만(찾은것.text ?? '');
  }

  async 글(주소: string): Promise<string> {
    return 글만(await this.game.text(주소));
  }

  async 보이나(주소: string): Promise<boolean> {
    return (await this.game.find(주소)) !== null;
  }

  async 스킬말풍선읽기(아이콘: string): Promise<string> {
    const 손가락 = await this.game.touchDown(아이콘);
    try {
      await this.game.waitFor(로비화면.말풍선, { timeoutMs: 5_000 });
      return await this.game.text(로비화면.말풍선);
    } finally {
      await this.game.touchUp(손가락);
    }
  }
}
