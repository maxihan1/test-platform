import type { GameDriver } from '@platform/kit';

import { 글읽기, 뜰때까지, 사라질때까지 } from '../helpers/menu.helper.js';

export class 게임가이드창 {
  static readonly 주소 = 'game:MainMenu/MainMenu UI Canvas/GuideBook';

  static readonly 창 = '/MainMenu UI Canvas/GuideBook';

  static readonly 목차띠 = '//*[@name=TocRibbonText]';
  static readonly 장제목 = ['Row01Label', 'Row02Label', 'Row03Label', 'Row04Label', 'Row05Label', 'Row06Label', 'Row07Label'] as const;
  static readonly 기본조작제목 = '//*[@name=C02PTitle]';
  static readonly 기본조작줄 = [
    ['C02PLRow2Label', 'C02PLRow2Kb_Text'],
    ['C02PLRow3Label', 'C02PLRow3Kb_Text'],
    ['C02PLRow4Label', 'C02PLRow4Kb_Text'],
    ['C02PLRow5Label', 'C02PLRow5Kb_Text'],
    ['C02PLRow6Label', 'C02PLRow6Kb_Text'],
    ['C02PLRow7Label', 'C02PLRow7Kb_Text'],
    ['C02PRRow1Label', 'C02PRRow1Kb_Text', 'C02PRRow1Kb2_Text'],
    ['C02PRRow3Label', 'C02PRRow3Kb_Text'],
    ['C02PRRow4Label', 'C02PRRow4Kb_Text'],
    ['C02PRRow5Label', 'C02PRRow5Kb_Text'],
    ['C02PRRow6Label', 'C02PRRow6Kb_Text'],
  ] as const;

  private constructor(private readonly game: GameDriver) {}

  static async 기다리기(game: GameDriver): Promise<게임가이드창> {
    await game.waitFor(게임가이드창.목차띠, { timeoutMs: 10_000 });
    return new 게임가이드창(game);
  }

  async 목차띠글(): Promise<string> {
    return await 글읽기(this.game, 게임가이드창.목차띠);
  }

  async 장제목들(): Promise<string> {
    const 제목들: string[] = [];
    for (const 이름 of 게임가이드창.장제목) 제목들.push(await 글읽기(this.game, `//*[@name=${이름}]`));
    return 제목들.join(' · ');
  }

  async 탭누르기(번호: number): Promise<void> {
    await this.game.click(`//*[@name=Tab0${번호}]`);
  }

  async 기본조작열기(): Promise<boolean> {
    await this.탭누르기(2);
    return await 뜰때까지(this.game, 게임가이드창.기본조작제목);
  }

  async 이동줄글(): Promise<string> {
    return await 글읽기(this.game, '//*[@name=C02PLRow1Label]');
  }

  async 기본조작키들(): Promise<string> {
    const 줄들: string[] = [];
    for (const [이름, ...키들] of 게임가이드창.기본조작줄) {
      const 이름글 = await 글읽기(this.game, `//*[@name=${이름}]`);
      const 키글: string[] = [];
      for (const 키 of 키들) 키글.push(await 글읽기(this.game, `//*[@name=${키}]`));
      줄들.push(키글.length === 0 ? 이름글 : `${이름글} ${키글.join(' ')}`);
    }
    return 줄들.join(' · ');
  }

  async 닫기(): Promise<void> {
    await this.game.key('Escape');
  }

  async 닫힐때까지(): Promise<boolean> {
    return await 사라질때까지(this.game, 게임가이드창.목차띠);
  }
}
