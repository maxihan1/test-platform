import type { GameDriver } from '@platform/kit';

import { 공통HUD, 색뗀글 } from '../components/hud.component.js';

export class 로비화면 {
  static readonly 주소 = 'game:CharSelect';
  static readonly 판 = '/CharacterSelectCanvas';
  static readonly 준비버튼 = 'Ready Btn';
  static readonly 제목줄 = '/CharacterSelectCanvas/Title Text bg/TitleText (TMP)';
  static readonly 환영줄 = '/CharacterSelectCanvas/ClassInfoBox/Player';
  static readonly 직업안내줄 = '/CharacterSelectCanvas/ClassInfoBox/Class instr (TMP)';
  static readonly 현재직업줄 = '/CharacterSelectCanvas/ClassInfoBox/HideAllTheseWhenNoClass/CurrentClass (TMP)';
  static readonly 접속인원줄 = '/CharacterSelectCanvas/NumPlayersBox/Text (TMP)';
  static readonly 말풍선 = '/CharacterSelectCanvas/Tooltip/Text (TMP)';
  static readonly 정보상자 = '/CharacterSelectCanvas/ClassInfoBox';
  static readonly 스킬묶음 = '/CharacterSelectCanvas/ClassInfoBox/HideAllTheseWhenNoClass';
  static readonly 불러오는중 = '/LoadingScreenPanel/Title Text (TMP)';

  readonly hud: 공통HUD;

  constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 열기(game: GameDriver): Promise<로비화면> {
    await game.waitFor(로비화면.판, { timeoutMs: 60_000 });
    await game.waitFor(로비화면.준비버튼, { timeoutMs: 30_000 });
    return new 로비화면(game);
  }

  static 자리(번호: number): string {
    return `/CharacterSelectCanvas/PlayerSeats/PlayerSeat (${String(번호)})`;
  }

  async 자리누르기(번호: number): Promise<void> {
    await this.game.click(`${로비화면.자리(번호)}/AnimationContainer/ClickInteract`);
  }

  async 자리이름(번호: number): Promise<string | null> {
    const 줄 = await this.game.find(`${로비화면.자리(번호)}/AnimationContainer/PlayerName (TMP)`);
    return 줄 === null ? null : 색뗀글(줄.text ?? '');
  }

  async 준비누르기(): Promise<void> {
    await this.game.click(로비화면.준비버튼);
  }

  async 준비버튼글(): Promise<string> {
    return 색뗀글(await this.game.text(`${로비화면.준비버튼}/Text (TMP)`));
  }

  async 준비버튼글이될때까지(글: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(`/CharacterSelectCanvas//Ready Btn/Text (TMP)`, { text: 글, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 제목(): Promise<string> {
    return 색뗀글(await this.game.text(로비화면.제목줄));
  }

  async 접속인원글(): Promise<string> {
    return 색뗀글(await this.game.text(로비화면.접속인원줄));
  }

  async 환영글(): Promise<string> {
    return 색뗀글(await this.game.text(로비화면.환영줄));
  }

  async 직업안내글(): Promise<string> {
    return 색뗀글(await this.game.text(로비화면.직업안내줄));
  }

  async 현재직업(): Promise<string> {
    return 색뗀글(await this.game.text(로비화면.현재직업줄));
  }

  async 던전으로넘어갈때까지(한도ms = 60_000): Promise<boolean> {
    return this.game.waitFor('/BossRoomHudCanvas', { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 현재직업이될때까지(글: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(로비화면.현재직업줄, { text: 글, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 스킬묶음보임(): Promise<boolean> {
    return (await this.game.find(로비화면.스킬묶음)) !== null;
  }

  async 불러오는중뜸(한도ms = 30_000): Promise<boolean> {
    return this.game.waitFor(로비화면.불러오는중, { text: '불러오는 중…', timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 자리이름이될때까지(번호: number, 이름: string, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    do {
      if (((await this.자리이름(번호)) ?? '').includes(이름)) return true;
    } while (Date.now() < 끝);
    return false;
  }

  async 자리에이름없어질때까지(번호: number, 이름: string, 한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    do {
      if (!((await this.자리이름(번호)) ?? '').includes(이름)) return true;
    } while (Date.now() < 끝);
    return false;
  }

  static 스킬아이콘(번호: 1 | 2): string {
    return `${로비화면.스킬묶음}/AbilityIcon${String(번호)}`;
  }

  async 스킬아이콘눌러두기(번호: 1 | 2): Promise<number> {
    return this.game.touchDown(로비화면.스킬아이콘(번호));
  }

  async 손가락떼기(손가락: number): Promise<void> {
    await this.game.touchUp(손가락);
  }

  async 말풍선글(한도ms = 4_000): Promise<string | null> {
    const 뜸 = await this.game.waitFor(로비화면.말풍선, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
    return 뜸 ? await this.game.text(로비화면.말풍선) : null;
  }
}
