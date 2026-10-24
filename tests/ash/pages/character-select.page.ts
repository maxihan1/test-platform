import type { GameDriver } from '@platform/kit';

export class 캐릭터선택화면 {
  static readonly 주소 = 'game:Boot';

  static readonly 창 = '/Boot/BootCanvas/CharacterSelectView';

  constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<캐릭터선택화면> {
    await game.waitFor(캐릭터선택화면.창, { timeoutMs: 30_000 });
    return new 캐릭터선택화면(game);
  }

  칸(순번: number): string {
    return `${캐릭터선택화면.창}/Slots/CharacterSlot${String(순번)}`;
  }

  async 칸찾기(이름: string): Promise<number> {
    for (let 순번 = 0; 순번 < 3; 순번 += 1) {
      const 이름글 = `${this.칸(순번)}/NameText`;
      if ((await this.game.find(이름글)) !== null && (await this.game.text(이름글)) === 이름) return 순번;
    }
    throw new Error(`캐릭터 선택 창에 「${이름}」 칸이 없다`);
  }

  async 칸뜰때까지(이름: string, 한도 = 15_000): Promise<number> {
    const 끝 = Date.now() + 한도;
    for (;;) {
      for (let 순번 = 0; 순번 < 3; 순번 += 1) {
        const 이름글 = await this.game.find(`${this.칸(순번)}/NameText`);
        if (이름글?.text === 이름) return 순번;
      }
      if (Date.now() >= 끝) throw new Error(`캐릭터 선택 창에 「${이름}」 칸이 ${String(한도 / 1000)}초 안에 뜨지 않았다`);
      await new Promise((깨운다) => setTimeout(깨운다, 300));
    }
  }

  async 게임시작누르기(이름: string): Promise<void> {
    await this.game.click(`${this.칸(await this.칸찾기(이름))}/SelectButton`);
  }

  async 삭제누르기(이름: string): Promise<void> {
    await this.game.click(`${this.칸(await this.칸찾기(이름))}/DeleteButton`);
  }

  async 새캐릭터누르기(순번: number): Promise<void> {
    await this.game.click(`${this.칸(순번)}/CreateSlotButton`);
  }

  async 로그아웃누르기(): Promise<void> {
    await this.game.click('LogoutButton');
  }

  async 상태글(): Promise<string> {
    return this.game.text(`${캐릭터선택화면.창}/StatusText`);
  }

  async 삭제확인창떠있나(): Promise<boolean> {
    return (await this.game.find(`${캐릭터선택화면.창}/ConfirmDialog/Window/ConfirmButton`)) !== null;
  }

  async 삭제취소누르기(): Promise<void> {
    await this.game.click(`${캐릭터선택화면.창}/ConfirmDialog/Window/CancelButton`);
  }

  async 떠있나(): Promise<boolean> {
    return (await this.game.find(캐릭터선택화면.창)) !== null;
  }
}
