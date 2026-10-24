import type { GameDriver } from '@platform/kit';

export class 월드화면 {
  static readonly 주소 = 'game:World';

  static readonly 상태칸 = '/WorldRoot/HudCanvas/StatusPanel';

  static readonly 이름표판 = '/WorldRoot/NameplateCanvas';

  constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<월드화면> {
    await game.waitFor('/WorldRoot/HudCanvas/StatusPanel/GoldText', { timeoutMs: 60_000 });
    const 끝 = Date.now() + 30_000;
    for (;;) {
      const 구역 = await game.find('ZoneText');
      if (구역?.text !== undefined && 구역.text !== '') return new 월드화면(game);
      if (Date.now() >= 끝) throw new Error('월드 화면 구역 이름이 30초 안에 채워지지 않았다');
      await new Promise((깨운다) => setTimeout(깨운다, 300));
    }
  }

  async 구역글(): Promise<string> {
    return this.game.text('ZoneText');
  }

  async 구역글뜰때까지(글자: string, 한도 = 15_000): Promise<void> {
    await this.game.waitFor('ZoneText', { text: 글자, timeoutMs: 한도 });
  }

  async 좌표글(): Promise<string> {
    return this.game.text('CoordinatesText');
  }

  async 골드글(): Promise<string> {
    return this.game.text(`${월드화면.상태칸}/GoldText`);
  }

  async 레벨글(): Promise<string> {
    return this.game.text(`${월드화면.상태칸}/LevelText`);
  }

  async HP글(): Promise<string> {
    return this.game.text(`${월드화면.상태칸}/HpBar/Text`);
  }

  async 성향글(): Promise<string> {
    return this.game.text(`${월드화면.상태칸}/AlignmentText`);
  }

  async 물약수(): Promise<string> {
    return this.game.text('/WorldRoot/HudCanvas/QuickSlots/PotionButton/CountText');
  }

  async 있나(주소: string): Promise<boolean> {
    return (await this.game.find(주소)) !== null;
  }

  async NPC있나(npc: 'merchant' | 'enhancer' | 'guard_w' | 'guard_e'): Promise<boolean> {
    return this.있나(`/WorldRoot/Npcs/Npc_npc_${npc}`);
  }

  봇이름표(봇번호: number, 이름: string): string {
    return `${월드화면.이름표판}/Nameplate_Bot_${String(봇번호)}_${이름}/Name`;
  }

  몬스터이름표(스폰: string, 몬스터: string): string {
    return `${월드화면.이름표판}/Nameplate_Monster_${스폰}_${몬스터}/Name`;
  }

  async 보이는봇<T extends { id: number; name: string }>(후보: T[], 한도 = 30_000): Promise<T> {
    const 끝 = Date.now() + 한도;
    for (;;) {
      for (const 봇 of 후보) {
        if ((await this.game.find(this.봇이름표(봇.id, 봇.name))) !== null) return 봇;
      }
      if (Date.now() >= 끝) throw new Error(`이름표가 보이는 봇이 ${String(한도 / 1000)}초 안에 없다 — 후보 ${String(후보.length)}명`);
      await new Promise((깨운다) => setTimeout(깨운다, 500));
    }
  }

  async 이름표뜰때까지(주소: string, 한도 = 20_000): Promise<void> {
    await this.game.waitFor(주소, { timeoutMs: 한도 });
  }

  async 이름표글(주소: string): Promise<string> {
    return this.game.text(주소);
  }

  async 이름표색(주소: string): Promise<number[]> {
    return (await this.game.get(주소, 'Text.color')) as number[];
  }

  async 상인누르기(): Promise<void> {
    await this.game.click('Npc_npc_merchant');
  }

  async 대장장이누르기(): Promise<void> {
    await this.game.click('Npc_npc_enhancer');
  }

  async 가방누르기(): Promise<void> {
    await this.game.click('InventoryButton');
  }

  async 정보누르기(): Promise<void> {
    await this.game.click('CharacterButton');
  }

  async GM누르기(): Promise<void> {
    await this.game.click('GmButton');
  }

  async 나가기누르기(): Promise<void> {
    await this.game.click('ExitButton');
  }

  async 귀환누르기(): Promise<void> {
    await this.game.click('TownButton');
  }

  async 물약누르기(): Promise<void> {
    await this.game.click('PotionButton');
  }

  async 누르기(버튼: string): Promise<void> {
    await this.game.click(버튼);
  }

  async 버튼(이름: string): Promise<{ path: string; interactable?: boolean } | null> {
    return this.game.find(이름);
  }

  async 버튼색(이름: string): Promise<number[]> {
    return (await this.game.get(이름, 'Image.color')) as number[];
  }

  async 쿨타임글(): Promise<string> {
    return this.game.text('/WorldRoot/HudCanvas/QuickSlots/Skill2Button/CooldownText');
  }

  async 자리(주소: string): Promise<{ x: number; z: number }> {
    const [x = 0, , z = 0] = (await this.game.get(주소, 'Transform.position')) as number[];
    return { x, z };
  }
}
