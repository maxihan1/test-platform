import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';

export class 던전화면 {
  static readonly 주소 = 'game:BossRoom';
  static readonly 안내그림설명들 = ['Instr Text 1 (TMP)', 'Instr Text 2 (TMP)', 'Instr Text 3 (TMP)', 'Instr Text 4 (TMP)'] as const;
  static readonly 안내확인글 = 'Confirm Text (TMP)';
  static readonly 감정막대 = '/BossRoomHudCanvas/Hero Emote Bar';
  static readonly 카메라 = '/CMCameraPrefab/CMFreeLook';
  static readonly 내영웅 = '//*[contains(@name,PlayerAvatar)]';
  static readonly 안내창 = 'HowToPlayPopupPanel';
  static readonly 안내확인 = 'Confirmation Button';
  static readonly 행동막대 = '/BossRoomHudCanvas/Hero Action Bar';
  static readonly 공격버튼 = '/BossRoomHudCanvas/Hero Action Bar/Button0';
  static readonly 스킬1버튼 = '/BossRoomHudCanvas/Hero Action Bar/Button1';
  static readonly 스킬2버튼 = '/BossRoomHudCanvas/Hero Action Bar/Button2';
  static readonly 감정버튼 = '/BossRoomHudCanvas/Hero Action Bar/Button3';
  static readonly 동료초상화 = '/BossRoomHudCanvas/Party HUD/Ally HUD 1/Button';
  static readonly 알림줄 = '/BossRoomHudCanvas/MessageFeed/Mask/MessageFeed';
  static readonly 임프 = '/Imp(Clone)[-1]';
  static readonly 항아리 = '/PickUpPot(Clone)';
  static readonly 안내제목 = '/BossRoomHudCanvas/HowToPlayPopupPanel/Title Text (TMP)';
  static readonly 말풍선글 = '/BossRoomHudCanvas/Tooltip/Text (TMP)';
  static readonly 내이름 = 'Hero Name (TMP)';
  static readonly 내체력막대 = 'Hero HP Slider';
  static readonly 동료이름 = 'Ally Name 1 (TMP)';
  static readonly 동료체력막대 = 'Ally HP Slider 1';
  static readonly 대상표시 = 'fx_TargetReticule(Clone)';
  static readonly 적피해숫자 = '/Showcase HUD/DamageNumberEnemy[-1]/Text';
  static readonly 내피해숫자 = '/Showcase HUD/DamageNumberMine[-1]/Text';
  static readonly 회복숫자 = '/Showcase HUD/HealNumber[-1]/Text';
  static readonly 큰글 = '/Showcase HUD/Label/Text';
  static readonly 불러오는화면 = '/LoadingScreen';
  static readonly 불러오는글 = '/LoadingScreen/LoadingScreenPanel/Title Text (TMP)';
  static readonly 마우스치울자리 = '/Showcase HUD/PlayerBar';

  readonly hud: 공통HUD;

  private constructor(private readonly game: GameDriver) {
    this.hud = new 공통HUD(game);
  }

  static async 안내창뜸(game: GameDriver, 한도ms = 45_000): Promise<던전화면> {
    await game.waitFor(던전화면.안내창, { timeoutMs: 한도ms });
    return new 던전화면(game);
  }

  static async 열림(game: GameDriver, 한도ms = 45_000): Promise<던전화면> {
    await game.waitFor(던전화면.행동막대, { timeoutMs: 한도ms });
    return new 던전화면(game);
  }

  async 안내창닫기(): Promise<void> {
    if ((await this.game.find(던전화면.안내창)) === null) return;
    await this.game.click(던전화면.안내확인);
    await this.game.waitFor(던전화면.안내창, { gone: true, timeoutMs: 10_000 });
  }

  async 대상고르기(주소: string): Promise<void> {
    const 자리들: ([number, number] | null)[] = [null, [0.5, 0.85], [0.5, 0.95], [0.2, 0.7], [0.8, 0.7], [0.5, 0.6]];
    let 덮임: unknown = null;
    let 눌렀나 = false;
    for (const 자리 of 자리들) {
      try {
        await (자리 === null ? this.game.click(주소) : this.game.click(주소, { at: 자리 }));
        눌렀나 = true;
      } catch (e) {
        if (!(e instanceof Error && e.message.includes('덮고 있습니다'))) throw e;
        덮임 = e;
        continue;
      }
      if (await this.대상표시뜰때까지(1_500)) return;
    }
    if (!눌렀나) throw 덮임;
  }

  async 공격누르기(): Promise<void> {
    await this.game.click(던전화면.공격버튼);
  }

  async 스킬1누르기(): Promise<void> {
    await this.game.click(던전화면.스킬1버튼);
  }

  async 임프공격(): Promise<void> {
    await this.대상고르기(던전화면.임프);
    await this.game.click(던전화면.공격버튼);
  }

  async 임프있나(): Promise<boolean> {
    return (await this.game.find(던전화면.임프)) !== null;
  }

  async 알림줄기다리기(글: string, 한도ms = 15_000): Promise<boolean> {
    const 주소 = `${던전화면.알림줄}//*[contains(@text,"${글}")]`;
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      try {
        if ((await this.game.find(주소)) !== null) return true;
      } catch (e) {
        if (e instanceof Error && e.message.includes('하나를 고를 수 없습니다')) return true;
        throw e;
      }
      if (Date.now() > 끝) return false;
    }
  }

  async 임프사라질때까지(한도ms = 20_000): Promise<boolean> {
    return this.game.waitFor(던전화면.임프, { gone: true, timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  버튼주소(번호: 0 | 1 | 2 | 3): string {
    return `${던전화면.행동막대}/Button${String(번호)}`;
  }

  async 버튼있나(번호: 0 | 1 | 2 | 3): Promise<boolean> {
    return (await this.game.find(this.버튼주소(번호))) !== null;
  }

  async 버튼글(번호: 0 | 1 | 2 | 3): Promise<string> {
    return this.game.text(`${this.버튼주소(번호)}/Text`);
  }

  async 버튼키글(번호: 0 | 1 | 2 | 3): Promise<string> {
    return this.game.text(`${this.버튼주소(번호)}/Text (1)`);
  }

  async 버튼눌림(번호: 0 | 1 | 2 | 3): Promise<boolean> {
    return (await this.game.get(this.버튼주소(번호), 'UIHUDButton.interactable')) === true;
  }

  async 버튼그림(번호: 0 | 1 | 2 | 3): Promise<string> {
    return String(await this.game.get(this.버튼주소(번호), 'Image.sprite.name'));
  }

  async 버튼그림될때까지(번호: 0 | 1 | 2 | 3, 그림: string, 한도ms = 10_000): Promise<boolean> {
    return this.game.waitForValue(this.버튼주소(번호), 'Image.sprite.name', 그림, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 버튼누르기(번호: 0 | 1 | 2 | 3): Promise<void> {
    await this.game.click(this.버튼주소(번호));
  }

  async 키누르기(키: 'Alpha1' | 'Alpha2' | 'Alpha3' | 'Alpha4'): Promise<void> {
    await this.game.key(키, { duration: 0.5 });
  }

  async 오른쪽클릭(주소: string): Promise<void> {
    await this.game.mouseMove(주소);
    await this.game.key('Mouse1');
  }

  async 버튼에올리기(번호: 0 | 1 | 2 | 3): Promise<void> {
    await this.game.mouseMove(this.버튼주소(번호));
  }

  async 마우스치우기(): Promise<void> {
    await this.game.mouseMove(던전화면.마우스치울자리);
  }

  async 말풍선뜰때까지(한도ms = 10_000): Promise<boolean> {
    return this.game.waitFor(던전화면.말풍선글, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 말풍선글읽기(): Promise<string> {
    return this.game.text(던전화면.말풍선글);
  }

  async 대상표시있나(): Promise<boolean> {
    try {
      return (await this.game.find(던전화면.대상표시)) !== null;
    } catch (e) {
      if (e instanceof Error && e.message.includes('하나를 고를 수 없습니다')) return true;
      throw e;
    }
  }

  async 대상표시뜰때까지(한도ms = 10_000): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    for (;;) {
      if (await this.대상표시있나()) return true;
      if (Date.now() > 끝) return false;
    }
  }

  async 항아리있나(): Promise<boolean> {
    return (await this.game.find(던전화면.항아리)) !== null;
  }

  async 내이름글(): Promise<string> {
    return this.game.text(던전화면.내이름);
  }

  async 내체력막대있나(): Promise<boolean> {
    return (await this.game.find(던전화면.내체력막대)) !== null;
  }

  async 동료이름글(): Promise<string> {
    return this.game.text(던전화면.동료이름);
  }

  async 동료체력막대있나(): Promise<boolean> {
    return (await this.game.find(던전화면.동료체력막대)) !== null;
  }

  async 동료초상화누르기(): Promise<void> {
    await this.game.click(던전화면.동료초상화);
  }

  async 알림줄있나(글: string): Promise<boolean> {
    return (await this.game.find(`${던전화면.알림줄}//*[contains(@text,"${글}")]`)) !== null;
  }

  async 불러오는화면보임(): Promise<boolean> {
    return Number(await this.game.get(던전화면.불러오는화면, 'CanvasGroup.alpha')) > 0.5;
  }

  async 큰글있나(글: string): Promise<boolean> {
    return (await this.game.find(던전화면.큰글)) !== null && (await this.game.text(던전화면.큰글)).includes(글);
  }

  async 안내그림설명글들(): Promise<string[]> {
    const 글들: string[] = [];
    for (const 칸 of 던전화면.안내그림설명들) if ((await this.game.find(칸)) !== null) 글들.push(await this.game.text(칸));
    return 글들;
  }

  async 감정막대열렸나(): Promise<boolean> {
    return (await this.game.find(던전화면.감정막대)) !== null;
  }

  async 감정막대될때까지(열림: boolean, 한도ms = 5_000): Promise<boolean> {
    const 됨 = await this.game.waitFor(던전화면.감정막대, { gone: !열림, timeoutMs: 한도ms }).then(() => true, () => false);
    return 됨 ? 열림 : !열림;
  }

  async 카메라값(): Promise<number> {
    return Number(await this.game.get(던전화면.카메라, 'CinemachineOrbitalFollow.VerticalAxis.Value'));
  }

  async 휠굴리기(칸: number): Promise<void> {
    await this.game.scroll(칸, { at: 던전화면.내영웅 });
  }

  async 카메라값바뀔때까지(전: number, 한도ms = 5_000): Promise<number> {
    const 끝 = Date.now() + 한도ms;
    let 값 = await this.카메라값();
    while (값 === 전 && Date.now() < 끝) {
      await this.game.waitFor(던전화면.행동막대, { timeoutMs: 1_000 });
      값 = await this.카메라값();
    }
    return 값;
  }

  async 내이동속도(): Promise<number> {
    return Number(await this.game.get(던전화면.내영웅, 'ServerCharacter.CharacterClass.Speed'));
  }
}
