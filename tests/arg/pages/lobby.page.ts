import type { GameDriver } from '@platform/kit';

import { 오른쪽위버튼 } from '../components/corner.component.js';
import { 공통HUD } from '../components/hud.component.js';
import { 안내창 } from '../components/popup.component.js';
import { 뜨는지, 색벗기기 } from '../helpers/find.helper.js';

const 캔버스 = '/CharacterSelectCanvas';
const 로그인시작 = '/Showcase Login/Panel 로그인/Button 게임 시작';

export class 로비 {
  static readonly 주소 = 'game:CharSelect';
  static readonly 제목 = `${캔버스}/Title Text bg/TitleText (TMP)`;
  static readonly 접속인원 = `${캔버스}/NumPlayersBox/Text (TMP)`;
  static readonly 환영 = `${캔버스}/ClassInfoBox/Player`;
  static readonly 직업안내 = `${캔버스}/ClassInfoBox/Class instr (TMP)`;
  static readonly 고른직업 = `${캔버스}/ClassInfoBox/HideAllTheseWhenNoClass/CurrentClass (TMP)`;
  static readonly 준비 = `${캔버스}/ClassInfoBox/DecorativeFrame/Ready Btn`;
  static readonly 준비글 = `${캔버스}/ClassInfoBox/DecorativeFrame/Ready Btn/Text (TMP)`;
  static readonly 카드들 = `${캔버스}/PlayerSeats`;
  static readonly 로딩제목 = '/LoadingScreenPanel/Title Text (TMP)';

  readonly hud: 공통HUD;
  readonly 구석: 오른쪽위버튼;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
    this.구석 = new 오른쪽위버튼(game);
  }

  static async 열기(game: GameDriver): Promise<로비> {
    const 끝 = Date.now() + 90_000;
    while ((await game.find(로비.제목)) === null) {
      if (Date.now() > 끝) throw new Error(`${로비.제목} 이 90초 안에 뜨지 않았습니다`);
      const 창 = new 안내창(game);
      if ((await 창.떠있는지()) && (await 창.본문글()).includes('같은 계정')) {
        await 창.확인누르기();
        await game.click(로그인시작);
      }
      await game.waitFor(로비.제목, { timeoutMs: 10_000 }).catch(() => undefined);
    }
    await game.waitFor(공통HUD.골드칸, { text: ' G', timeoutMs: 30_000 });
    return new 로비(game);
  }

  static 카드(번호: number): string {
    return `${로비.카드들}/PlayerSeat (${번호})/AnimationContainer/ClickInteract`;
  }

  async 제목글(): Promise<string> {
    return this.game.text(로비.제목);
  }

  async 접속인원글(): Promise<string> {
    return 색벗기기(await this.game.text(로비.접속인원));
  }

  async 카드수(): Promise<number> {
    let 수 = 0;
    while (수 < 12 && (await this.game.find(`${로비.카드들}/PlayerSeat (${수})`)) !== null) 수 += 1;
    return 수;
  }

  async 카드누르기(번호: number): Promise<void> {
    await this.game.click(로비.카드(번호));
  }

  async 고른직업글(): Promise<string> {
    return this.game.text(로비.고른직업);
  }

  async 직업고르기(직업: string): Promise<number> {
    const 수 = await this.카드수();
    for (let i = 0; i < 수; i += 1) {
      await this.카드누르기(i);
      const 됐나 = await this.game.waitFor(로비.고른직업, { text: 직업, timeoutMs: 3_000 }).then(
        () => true,
        () => false,
      );
      if (됐나) return i;
    }
    throw new Error(`로비 카드 ${String(수)}장 가운데 「${직업}」 카드를 찾지 못했다`);
  }

  async 준비누르기(): Promise<void> {
    await this.game.click(로비.준비);
  }

  async 환영글(): Promise<string> {
    return 색벗기기(await this.game.text(로비.환영));
  }

  async 직업안내글(): Promise<string> {
    return 색벗기기(await this.game.text(로비.직업안내));
  }

  async 고른직업이뜨는지(timeoutMs = 10_000): Promise<boolean> {
    return 뜨는지(this.game, 로비.고른직업, timeoutMs);
  }

  async 로딩글이뜨는지(글: string, timeoutMs = 15_000): Promise<boolean> {
    return this.game.waitFor(로비.로딩제목, { text: 글, timeoutMs }).then(
      () => true,
      () => false,
    );
  }

  async 상단바모양(): Promise<string> {
    const 레벨글 = await this.hud.레벨이름글();
    const 금색Lv = /^<color=#([0-9A-Fa-f]{6})>Lv\.\d+<\/color>/.exec(레벨글);
    const 레벨표시 = 금색Lv === null ? 색벗기기(레벨글) : 금색인가(금색Lv[1] ?? '') ? '금색 Lv.<레벨>' : '금색이 아닌 Lv.<레벨>';
    const 골드글 = (await this.hud.골드글()).trim();
    const 경험치글 = (await this.hud.경험치글()).trim();
    const 골드표시 = /^[\d,]+ G$/.test(골드글) ? '<골드> G' : 골드글;
    const 경험치표시 = /^\d+\/\d+$/.test(경험치글) ? '<경험치>/<필요량>' : 경험치글;
    return [레벨표시, 골드표시, 경험치표시].join(' · ');
  }

  async 채팅띠줄수(): Promise<number> {
    const 글 = 색벗기기(await this.hud.채팅띠글());
    return 글.split('\n').filter((줄) => 줄.trim() !== '').length;
  }
}

function 금색인가(색: string): boolean {
  const 빨강 = parseInt(색.slice(0, 2), 16);
  const 초록 = parseInt(색.slice(2, 4), 16);
  const 파랑 = parseInt(색.slice(4, 6), 16);
  return 빨강 >= 200 && 초록 >= 150 && 초록 <= 230 && 파랑 <= 120;
}
