import type { GameDriver } from '@platform/kit';

import { 글읽기, 뜰때까지, 있나, 사라질때까지 } from '../helpers/menu.helper.js';

export class 인원수선택창 {
  static readonly 주소 = 'game:MainMenu/MainMenu UI Canvas/PlayerCountPanel';

  static readonly 제목 = '/MainMenu UI Canvas/PlayerCountPanel/Title';
  static readonly 버튼 = {
    '1P': '/MainMenu UI Canvas/PlayerCountPanel/CountButtons/Count1Btn',
    '2P': '/MainMenu UI Canvas/PlayerCountPanel/CountButtons/Count2Btn',
    '3P': '/MainMenu UI Canvas/PlayerCountPanel/CountButtons/Count3Btn',
    '4P': '/MainMenu UI Canvas/PlayerCountPanel/CountButtons/Count4Btn',
  } as const;
  static readonly 참가창 = '/MainMenu UI Canvas/ControllerRegistrationPanel/Window';
  static readonly 참가창제목 = '/MainMenu UI Canvas/ControllerRegistrationPanel/Window/Title/Text';

  private constructor(private readonly game: GameDriver) {}

  static async 기다리기(game: GameDriver): Promise<인원수선택창> {
    await game.waitFor(인원수선택창.제목, { timeoutMs: 10_000 });
    return new 인원수선택창(game);
  }

  async 떴나(): Promise<boolean> {
    return await 있나(this.game, 인원수선택창.제목);
  }

  async 버튼글(인원: keyof typeof 인원수선택창.버튼): Promise<string> {
    return await 글읽기(this.game, `${인원수선택창.버튼[인원]}/CountText`);
  }

  async 누르기(인원: keyof typeof 인원수선택창.버튼): Promise<void> {
    await this.game.click(인원수선택창.버튼[인원]);
  }

  async 참가창뜰때까지(): Promise<boolean> {
    return await 뜰때까지(this.game, 인원수선택창.참가창제목);
  }

  async 참가창닫기(): Promise<void> {
    await this.game.key('Escape');
    await 사라질때까지(this.game, 인원수선택창.참가창, 5_000);
  }

  async 닫기(): Promise<void> {
    await this.game.key('Escape');
  }

  async 닫힐때까지(): Promise<boolean> {
    return await 사라질때까지(this.game, 인원수선택창.제목);
  }
}
