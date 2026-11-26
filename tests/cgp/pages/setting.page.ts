import type { GameDriver } from '@platform/kit';

import { 글읽기, 화면안에있나 } from '../helpers/menu.helper.js';

const 내용 = '/MainMenu UI Canvas/SettingPanel/Contents/GamePlayScroll/Viewport/Content/GamePlay';

export class 환경설정창 {
  static readonly 주소 = 'game:MainMenu/MainMenu UI Canvas/SettingPanel';

  static readonly 창 = '/MainMenu UI Canvas/SettingPanel';
  static readonly 닫기버튼 = '/MainMenu UI Canvas/SettingPanel/SettingExitBtn';
  static readonly 소리제목 = `${내용}/Sound/Title/Text`;
  static readonly 소리줄 = ['Master', 'Bgm', 'Sfx'] as const;
  static readonly 언어글 = `${내용}/Language/Contents/Bg/Text`;
  static readonly 언어오른쪽 = 'Btn_R';
  static readonly 언어왼쪽 = 'Btn_L';
  static readonly 랭킹제목 = `${내용}/Account/Title/Text`;
  static readonly 랭킹등록글 = `${내용}/Account/Contents/Submit/Text`;
  static readonly 랭킹등록켜기 = 'Toggle';

  private constructor(private readonly game: GameDriver) {}

  static async 기다리기(game: GameDriver): Promise<환경설정창> {
    const 끝 = Date.now() + 10_000;
    while (!(await 화면안에있나(game, 환경설정창.창)) && Date.now() < 끝) await game.find(환경설정창.창);
    return new 환경설정창(game);
  }

  async 열렸나(): Promise<boolean> {
    return await 화면안에있나(this.game, 환경설정창.창);
  }

  async 글(주소: string): Promise<string> {
    return await 글읽기(this.game, 주소);
  }

  async 소리줄글(줄: (typeof 환경설정창.소리줄)[number]): Promise<string> {
    return await 글읽기(this.game, `${내용}/Sound/Contents/${줄}/Text[0]`);
  }

  async 소리줄값(줄: (typeof 환경설정창.소리줄)[number]): Promise<string> {
    return await 글읽기(this.game, `${내용}/Sound/Contents/${줄}/Text[1]`);
  }

  async 소리막대있나(줄: (typeof 환경설정창.소리줄)[number]): Promise<boolean> {
    return (await this.game.find(`${내용}/Sound/Contents/${줄}/Bar`).catch(() => null)) !== null;
  }

  async 랭킹켜기있나(): Promise<boolean> {
    return (await this.game.find(`${내용}/Account/Contents/Submit/Toggle`).catch(() => null)) !== null;
  }

  async 언어바꾸기(쪽: '오른쪽' | '왼쪽'): Promise<string> {
    const 앞 = await this.언어();
    await this.game.click(쪽 === '오른쪽' ? 환경설정창.언어오른쪽 : 환경설정창.언어왼쪽);
    const 끝 = Date.now() + 5_000;
    let 뒤 = await this.언어();
    while (뒤 === 앞 && Date.now() < 끝) 뒤 = await this.언어();
    return 뒤;
  }

  async 언어(): Promise<string> {
    return await 글읽기(this.game, 환경설정창.언어글);
  }

  async 닫기(): Promise<void> {
    await this.game.click(환경설정창.닫기버튼);
  }

  async 닫힐때까지(): Promise<boolean> {
    const 끝 = Date.now() + 10_000;
    while ((await 화면안에있나(this.game, 환경설정창.창)) && Date.now() < 끝) await this.game.find(환경설정창.창);
    return !(await 화면안에있나(this.game, 환경설정창.창));
  }
}
