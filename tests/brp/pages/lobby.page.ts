import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';

export type 직업 = '탱커' | '궁수' | '마법사' | '도적';

export class 로비화면 {
  static readonly 주소 = 'game:CharSelect';
  static readonly 정보상자직업 = '/CharacterSelectCanvas/ClassInfoBox/HideAllTheseWhenNoClass/CurrentClass (TMP)';
  static readonly 스킬아이콘들 = ['AbilityIcon1', 'AbilityIcon2'] as const;
  static readonly 말풍선글 = '/CharacterSelectCanvas/Tooltip/Text (TMP)';
  static readonly 준비버튼 = 'Ready Btn';
  static readonly 준비글 = '/CharacterSelectCanvas/ClassInfoBox/DecorativeFrame/Ready Btn/Text (TMP)';
  static readonly 제목 = 'TitleText (TMP)';
  static readonly 인원글 = '/CharacterSelectCanvas/NumPlayersBox/Text (TMP)';
  static readonly 인사글 = 'Player';
  static readonly 직업안내 = 'Class instr (TMP)';
  static readonly 직업자리: Record<직업, number> = { 탱커: 0, 궁수: 2, 마법사: 4, 도적: 6 };
  static readonly 첫탱커모습 = '/AvatarGraphicsParent/PlayerGraphics_Tank_Girl_CharacterSelect(Clone)';

  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열림(game: GameDriver, 한도ms = 30_000): Promise<로비화면> {
    await game.waitFor(로비화면.준비버튼, { timeoutMs: 한도ms });
    return new 로비화면(game);
  }

  자리주소(자리: number): string {
    return `/CharacterSelectCanvas/PlayerSeats/PlayerSeat (${String(자리)})/AnimationContainer/ClickInteract`;
  }

  async 자리누르기(자리: number): Promise<void> {
    await this.game.click(this.자리주소(자리));
  }

  async 직업고르기(이름: 직업): Promise<void> {
    await this.자리누르기(로비화면.직업자리[이름]);
  }

  async 준비누르기(): Promise<void> {
    await this.game.click(로비화면.준비버튼);
  }

  async 준비글읽기(): Promise<string> {
    return this.game.text(로비화면.준비글);
  }

  async 던전들어가기(자리: number, 한도ms = 45_000): Promise<void> {
    await this.자리누르기(자리);
    await this.준비누르기();
    await this.game.waitFor('HowToPlayPopupPanel', { timeoutMs: 한도ms });
  }

  async 제목글(): Promise<string> {
    return this.game.text(로비화면.제목);
  }

  async 인원글읽기(): Promise<string> {
    return this.game.text(로비화면.인원글);
  }

  async 인사글읽기(): Promise<string> {
    return this.game.text(로비화면.인사글);
  }

  async 직업안내글읽기(): Promise<string> {
    return this.game.text(로비화면.직업안내);
  }

  async 자리있나(자리: number): Promise<boolean> {
    return (await this.game.find(this.자리주소(자리))) !== null;
  }

  async 자리수(): Promise<number> {
    let 개수 = 0;
    for (let 자리 = 0; 자리 < 8; 자리 += 1) {
      if (await this.자리있나(자리)) 개수 += 1;
    }
    return 개수;
  }

  async 준비글될때까지(글: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(로비화면.준비글, { text: 글, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 인원글될때까지(글: string, 한도ms = 15_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if ((await this.인원글읽기()).replace(/<[^>]+>/g, '').includes(글)) return true;
      if (Date.now() > 끝) return false;
    }
  }

  자리칸(자리: number, 칸: string): string {
    return `/CharacterSelectCanvas/PlayerSeats/PlayerSeat (${String(자리)})/AnimationContainer/${칸}`;
  }

  async 정보상자직업글(한도ms = 5_000): Promise<string | null> {
    if ((await this.game.waitFor(로비화면.정보상자직업, { timeoutMs: 한도ms }).then(() => true, () => false)) === false) return null;
    return this.game.text(로비화면.정보상자직업);
  }

  async 정보상자직업글될때까지(이름: string, 한도ms = 5_000): Promise<string | null> {
    try {
      await this.game.waitFor(로비화면.정보상자직업, { text: 이름, timeoutMs: 한도ms });
    } catch {
      return this.정보상자직업글(1_000);
    }
    return this.game.text(로비화면.정보상자직업);
  }

  async 스킬아이콘수(): Promise<number> {
    let 수 = 0;
    for (const 아이콘 of 로비화면.스킬아이콘들) if ((await this.game.find(아이콘)) !== null) 수 += 1;
    return 수;
  }

  async 스킬아이콘말풍선(번째: 0 | 1, 한도ms = 5_000): Promise<string | null> {
    await this.game.mouseMove(로비화면.스킬아이콘들[번째]);
    try {
      await this.game.waitFor(로비화면.말풍선글, { timeoutMs: 한도ms });
    } catch {
      return null;
    }
    return this.game.text(로비화면.말풍선글);
  }

  async 자리확정표시있나(자리: number): Promise<boolean> {
    return (await this.game.find(this.자리칸(자리, 'Checkmark'))) !== null;
  }

  async 자리확정표시될때까지(자리: number, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(this.자리칸(자리, 'Checkmark'), { timeoutMs: 한도ms }).then(() => true, () => false);
  }

  async 자리이름글(자리: number): Promise<string> {
    if ((await this.game.find(this.자리칸(자리, 'PlayerName (TMP)'))) === null) return '';
    return this.game.text(this.자리칸(자리, 'PlayerName (TMP)'));
  }

  async 첫탱커모습뜰때까지(한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(로비화면.첫탱커모습, { timeoutMs: 한도ms }).then(() => true, () => false);
  }

  async 첫탱커모습있나(): Promise<boolean> {
    return (await this.game.find(로비화면.첫탱커모습)) !== null;
  }

  async 자리바탕있나(자리: number): Promise<boolean> {
    return (await this.game.find(this.자리칸(자리, 'ActiveBkgnd'))) !== null;
  }

  async 자리바탕켜질때까지(자리: number, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(this.자리칸(자리, 'ActiveBkgnd'), { timeoutMs: 한도ms }).then(() => true, () => false);
  }

  async 자리이름글될때까지(자리: number, 맞나: (글: string) => boolean, 한도ms = 10_000): Promise<string> {
    const 끝 = Date.now() + 한도ms;
    let 글 = await this.자리이름글(자리);
    while (!맞나(글) && Date.now() < 끝) {
      await this.game.waitFor(this.자리칸(자리, 'ClickInteract'), { timeoutMs: 1_000 });
      글 = await this.자리이름글(자리);
    }
    return 글;
  }
}
