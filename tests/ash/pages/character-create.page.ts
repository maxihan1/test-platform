import type { GameDriver } from '@platform/kit';

export class 새캐릭터창 {
  static readonly 주소 = 'game:Boot/Boot/BootCanvas/CharacterSelectView/CharacterCreatePanel';

  static readonly 창 = '/Boot/BootCanvas/CharacterSelectView/CharacterCreatePanel';

  constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver, 순번 = 0): Promise<새캐릭터창> {
    await game.click(`/Boot/BootCanvas/CharacterSelectView/Slots/CharacterSlot${String(순번)}/CreateSlotButton`);
    await game.waitFor(새캐릭터창.창);
    return new 새캐릭터창(game);
  }

  async 이름적기(이름: string): Promise<string> {
    return this.game.type('NameInput', 이름);
  }

  async 직업누르기(직업: 'Warrior' | 'Archer' | 'Mage'): Promise<void> {
    await this.game.click(`Class${직업}`);
  }

  async 성별누르기(성별: 'Male' | 'Female'): Promise<void> {
    await this.game.click(`Gender${성별}`);
  }

  async 직업설명(): Promise<string> {
    return this.game.text('ClassDescription');
  }

  async 만들기누르기(): Promise<void> {
    await this.game.click('CreateButton');
  }

  async 취소누르기(): Promise<void> {
    await this.game.click(`${새캐릭터창.창}/Window/CancelButton`);
  }

  async 상태글(): Promise<string> {
    return this.game.text(`${새캐릭터창.창}/Window/StatusText`);
  }

  async 떠있나(): Promise<boolean> {
    return (await this.game.find(새캐릭터창.창)) !== null;
  }

  async 성별색(성별: 'Male' | 'Female'): Promise<number[]> {
    return (await this.game.get(`Gender${성별}`, 'Image.color')) as number[];
  }

  async 만들기버튼(): Promise<{ path: string; interactable?: boolean } | null> {
    return this.game.find('CreateButton');
  }
}
