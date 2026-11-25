import type { GameDriver } from '@platform/kit';

import { 글읽기, 뜰때까지, 로딩끝날때까지, 있나 } from '../helpers/menu.helper.js';
import { 걸어가기, 고기수, 심긴식물주소들, 심기, 위치 } from '../helpers/stage.helper.js';

const 식물머리 = '/WorldUIRoot/WorldHudCanvas(Clone)/PlantUICanvas/PlantUIRoot/PlantUI(Clone)/Pivot';

export class 스테이지화면 {
  static readonly 주소 = 'game:BossRoom3';

  static readonly 세계수 = '/Lumikantle';
  static readonly 고양이 = '/Player(Clone)';
  static readonly 시작문구 = '/BossRoomHudCanvas/DevilUIRoot/DevilUI/StartMessage/StartMessageText';
  static readonly 고기 = '/BossRoomHudCanvas/QuadrantHudRoot/QuadrantHud(Clone)/Block/MeatPill/Num';
  static readonly 처치 = '/BossRoomHudCanvas/QuadrantHudRoot/QuadrantHud(Clone)/Block/KillPill/Num';
  static readonly 웨이브 = '/BossRoomHudCanvas/WaveRoot/Wave/WaveBg/txt/WaveText';
  static readonly 남은시간 = '/BossRoomHudCanvas/WaveRoot/Wave/L/Bg/LeftTimeText';
  static readonly 남은악마 = '/BossRoomHudCanvas/WaveRoot/Wave/R/LeftMonsterText';
  static readonly 식물머리 = {
    레벨: `${식물머리}/Texts/LevelText`,
    체력막대: `${식물머리}/Visual/MeatBack/HPBack/Bar/Bar_Green`,
    먹이막대: `${식물머리}/Visual/MeatBack/Bar/Bar_Green`,
  } as const;

  private constructor(private readonly game: GameDriver) {}

  static async 기다리기(game: GameDriver): Promise<스테이지화면> {
    await game.waitFor(스테이지화면.세계수, { timeoutMs: 30_000 });
    await game.waitFor(스테이지화면.고양이, { timeoutMs: 15_000 });
    await 로딩끝날때까지(game);
    return new 스테이지화면(game);
  }

  async 글(주소: string): Promise<string> {
    return await 글읽기(this.game, 주소);
  }

  async 보이나(주소: string): Promise<boolean> {
    return await 있나(this.game, 주소);
  }

  async 시작문구뜰때까지(): Promise<string> {
    if (!(await 뜰때까지(this.game, 스테이지화면.시작문구, 10_000))) return '';
    return await 글읽기(this.game, 스테이지화면.시작문구);
  }

  async 고기수(): Promise<number> {
    return await 고기수(this.game);
  }

  async 웨이브글(): Promise<string> {
    return await 글읽기(this.game, 스테이지화면.웨이브);
  }

  async 남은악마(): Promise<string> {
    return await 글읽기(this.game, 스테이지화면.남은악마);
  }

  async 남은악마될때까지(값: string, 한도ms: number): Promise<boolean> {
    const 끝 = Date.now() + 한도ms;
    while (Date.now() < 끝) if ((await this.남은악마()) === 값) return true;
    return false;
  }

  async 남은악마최대(한도ms: number): Promise<number> {
    const 끝 = Date.now() + 한도ms;
    let 최대 = 0;
    while (Date.now() < 끝) {
      const 지금 = Number(await this.남은악마());
      if (지금 > 최대) 최대 = 지금;
      else if (최대 > 0 && 지금 < 최대) break;
    }
    return 최대;
  }

  async 자리로가기(자리: [number, number]): Promise<boolean> {
    return (await 걸어가기(this.game, 자리, 6)).닿음;
  }

  async 세계수체력(): Promise<number> {
    return Number(await this.game.get(스테이지화면.세계수, 'Lumikantle.LumikantleHP.Value'));
  }

  async 판끝났나(): Promise<boolean> {
    return (await this.game.get(스테이지화면.세계수, 'Lumikantle.IsGameOver')) === true;
  }

  async 판끝날때까지(한도ms: number): Promise<boolean> {
    return await this.game.waitForValue(스테이지화면.세계수, 'Lumikantle.IsGameOver', true, { timeoutMs: 한도ms }).then(
      () => true,
      () => false,
    );
  }

  async 여기심기(): Promise<string> {
    return (await 심기(this.game, [await 위치(this.game)]))[0] ?? '';
  }

  async 자리에심기(자리: [number, number]): Promise<string> {
    return (await 심기(this.game, [자리]))[0] ?? '';
  }

  async 그자리X두번(): Promise<void> {
    await this.game.key('X');
    await this.game.key('X');
  }

  async 식물들(): Promise<string[]> {
    return await 심긴식물주소들(this.game);
  }

  async 식물수(): Promise<number> {
    return (await 심긴식물주소들(this.game)).length;
  }

  async 식물수될때까지(수: number, 한도ms: number): Promise<number> {
    const 끝 = Date.now() + 한도ms;
    let 지금 = await this.식물수();
    while (지금 !== 수 && Date.now() < 끝) 지금 = await this.식물수();
    return 지금;
  }

  async 식물체력(식물: string): Promise<number> {
    return Number(await this.game.get(식물, 'PlantStatus.CurHP.Value'));
  }

  async 식물최대체력(식물: string): Promise<number> {
    return Number(await this.game.get(식물, 'PlantStatus.MaxHP'));
  }

  async 먹인고기(식물: string): Promise<number> {
    return Number(await this.game.get(식물, 'PlantStatus.MeatNum.Value'));
  }

  async 식물자리(식물: string): Promise<[number, number]> {
    const p = (await this.game.get(식물, 'Transform.position')) as number[];
    return [p[0], p[2]];
  }

  async 식물곁에서기(식물: string): Promise<boolean> {
    const [x, z] = await this.식물자리(식물);
    const 감 = await 걸어가기(this.game, [x - 0.7, z], 5);
    await this.game.key('RightArrow', { duration: 0.08 });
    return 감.닿음;
  }

  async 식물에서떨어지기(식물: string, 거리: number): Promise<boolean> {
    const [x, z] = await this.식물자리(식물);
    return (await 걸어가기(this.game, [x - 거리, z], 6)).닿음;
  }

  async 먹이기(초 = 1): Promise<void> {
    await this.game.key('C', { duration: 초 });
  }

  async 회수누르기(): Promise<void> {
    await this.game.key('F');
  }

  async 고기바뀔때까지(앞: number, 한도ms: number): Promise<number> {
    const 끝 = Date.now() + 한도ms;
    let 뒤 = await this.고기수();
    while (뒤 === 앞 && Date.now() < 끝) 뒤 = await this.고기수();
    return 뒤;
  }

  async 체력줄때까지(식물: string, 앞: number, 한도ms: number): Promise<number> {
    const 끝 = Date.now() + 한도ms;
    let 뒤 = await this.식물체력(식물);
    while (뒤 >= 앞 && Date.now() < 끝) 뒤 = await this.식물체력(식물);
    return 뒤;
  }

  async 체력비율아래될때까지(식물: string, 비율: number, 한도ms: number): Promise<number> {
    const 최대 = await this.식물최대체력(식물);
    const 끝 = Date.now() + 한도ms;
    let 지금 = await this.식물체력(식물);
    while (지금 >= 최대 * 비율 && Date.now() < 끝) 지금 = await this.식물체력(식물);
    return 지금 / 최대;
  }

  async 식물머리보이나(부분: keyof typeof 스테이지화면.식물머리): Promise<boolean> {
    return await 뜰때까지(this.game, 스테이지화면.식물머리[부분], 5_000);
  }

  async 식물머리레벨(): Promise<string> {
    return await 글읽기(this.game, 스테이지화면.식물머리.레벨);
  }

  async 일시정지열기(): Promise<boolean> {
    await this.game.key('Escape');
    return await 뜰때까지(this.game, '/BossRoomHudCanvas/PauseRootPanel/PauseWindow', 5_000);
  }
}
