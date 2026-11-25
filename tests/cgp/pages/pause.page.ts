import type { GameDriver } from '@platform/kit';

import { 글읽기, 뜰때까지, 로딩끝날때까지, 있나, 사라질때까지 } from '../helpers/menu.helper.js';

const 버튼줄 = '/BossRoomHudCanvas/PauseRootPanel/PauseWindow/ButtonsLayout';

export class 일시정지창 {
  static readonly 주소 = 'game:*/BossRoomHudCanvas/PauseRootPanel/PauseWindow';

  static readonly 창 = '/BossRoomHudCanvas/PauseRootPanel/PauseWindow';
  static readonly 버튼 = {
    돌아가기: `${버튼줄}/ToReturnBtn`,
    '게임 가이드': `${버튼줄}/ToGuideBtn`,
    환경설정: `${버튼줄}/ToSettingBtn`,
    로비: `${버튼줄}/ToCharSelectBtn`,
    메인메뉴: `${버튼줄}/ToMainBtn`,
  } as const;
  static readonly 가이드 = '/BossRoomHudCanvas/PauseRootPanel/GuideBook';
  static readonly 환경설정창 = '/BossRoomHudCanvas/PauseRootPanel/SettingPanel';
  static readonly 환경설정닫기 = '/BossRoomHudCanvas/PauseRootPanel/SettingPanel/SettingExitBtn';

  private constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<일시정지창> {
    await 로딩끝날때까지(game);
    for (let 번 = 0; 번 < 3; 번 += 1) {
      if (await 있나(game, 일시정지창.창)) break;
      await game.key('Escape');
      await game.waitFor(일시정지창.창, { timeoutMs: 3_000 }).catch(() => undefined);
    }
    await game.waitFor(일시정지창.버튼.돌아가기, { timeoutMs: 5_000 });
    return new 일시정지창(game);
  }

  async 버튼글(이름: keyof typeof 일시정지창.버튼): Promise<string> {
    if (!(await 있나(this.game, 일시정지창.버튼[이름]))) return '';
    return await 글읽기(this.game, `${일시정지창.버튼[이름]}/Text (TMP)`);
  }

  async 버튼글들(): Promise<string> {
    const 글들: string[] = [];
    for (const 이름 of Object.keys(일시정지창.버튼) as (keyof typeof 일시정지창.버튼)[]) {
      const 글 = await this.버튼글(이름);
      if (글 !== '') 글들.push(글);
    }
    return 글들.join(' · ');
  }

  async 누르기(이름: keyof typeof 일시정지창.버튼): Promise<void> {
    await this.game.click(일시정지창.버튼[이름]);
  }

  async 닫혔나(): Promise<boolean> {
    return await 사라질때까지(this.game, 일시정지창.창, 5_000);
  }

  async 가이드뜰때까지(): Promise<boolean> {
    return await 뜰때까지(this.game, `${일시정지창.가이드}/TocPage/TocRibbonText`);
  }

  async 가이드닫기(): Promise<void> {
    await this.game.key('Escape');
    await 사라질때까지(this.game, 일시정지창.가이드, 5_000);
  }

  async 환경설정뜰때까지(): Promise<boolean> {
    return await 뜰때까지(this.game, 일시정지창.환경설정닫기);
  }

  async 환경설정닫기(): Promise<void> {
    for (let 번 = 0; 번 < 3; 번 += 1) {
      if (await 있나(this.game, 일시정지창.환경설정닫기)) await this.game.click(일시정지창.환경설정닫기);
      if (await 사라질때까지(this.game, 일시정지창.환경설정닫기, 3_000)) return;
      await this.game.key('Escape');
    }
  }
}
