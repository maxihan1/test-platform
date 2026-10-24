import type { GameDriver } from '@platform/kit';

export class 강화창 {
  static readonly 주소 = 'game:World/WorldRoot/HudCanvas/PanelLayer/EnhancePanel';

  static readonly 창 = '/WorldRoot/HudCanvas/PanelLayer/EnhancePanel';

  static readonly 본문 = '/WorldRoot/HudCanvas/PanelLayer/EnhancePanel/Window/Body';

  constructor(private readonly game: GameDriver) {}

  static async 열기(game: GameDriver): Promise<강화창> {
    await game.click('Npc_npc_enhancer');
    await game.waitFor(강화창.창, { timeoutMs: 15_000 });
    return new 강화창(game);
  }

  장비줄(아이템번호: number): string {
    return `${강화창.본문}/EquipmentList/Content/Equip_${String(아이템번호)}`;
  }

  async 장비고르기(아이템번호: number): Promise<void> {
    const 이름 = (await this.장비이름(아이템번호)).replace(/\s+\[장착\]$/, '');
    const 골라짐 = async (): Promise<boolean> => {
      const 설명 = await this.game.find(`${강화창.본문}/DetailPanel/DetailText`);
      return (설명?.text ?? '').includes('강화 비용') && (설명?.text ?? '').includes(이름);
    };
    if (await 골라짐()) return;
    for (let 번 = 0; 번 < 2; 번 += 1) {
      await this.game.click(this.장비줄(아이템번호));
      const 끝 = Date.now() + 5_000;
      while (Date.now() < 끝) {
        if (await 골라짐()) return;
        await new Promise((깨운다) => setTimeout(깨운다, 300));
      }
    }
    throw new Error(`강화 창에서 장비 ${String(아이템번호)} 를 고르지 못했다`);
  }

  async 장비있나(아이템번호: number): Promise<boolean> {
    return (await this.game.find(this.장비줄(아이템번호))) !== null;
  }

  async 장비이름(아이템번호: number): Promise<string> {
    return this.game.text(`${this.장비줄(아이템번호)}/NameText`);
  }

  async 결과글(): Promise<string> {
    return this.game.text(`${강화창.본문}/DetailPanel/ResultText`);
  }

  async 설명글(): Promise<string> {
    return this.game.text(`${강화창.본문}/DetailPanel/DetailText`);
  }

  async 강화하기(): Promise<string> {
    const 앞 = await this.설명글();
    const 앞결과 = await this.결과글();
    await this.game.click(`${강화창.본문}/DetailPanel/EnhanceButton`);
    const 끝 = Date.now() + 15_000;
    for (;;) {
      const 지금결과 = await this.결과글();
      const 지금설명 = (await this.game.find(`${강화창.본문}/DetailPanel/DetailText`)) === null ? '' : await this.설명글();
      if (지금결과 !== '' && (지금결과 !== 앞결과 || 지금설명 !== 앞)) return 지금결과;
      if (Date.now() >= 끝) throw new Error(`강화 결과 글이 15초 안에 바뀌지 않았다 (마지막: ${지금결과})`);
      await new Promise((깨운다) => setTimeout(깨운다, 300));
    }
  }

  async 강화버튼(): Promise<{ path: string; interactable?: boolean } | null> {
    return this.game.find(`${강화창.본문}/DetailPanel/EnhanceButton`);
  }

  async 닫기누르기(): Promise<void> {
    await this.game.click(`${강화창.창}/Window/CloseButton`);
  }

  async 떠있나(): Promise<boolean> {
    return (await this.game.find(강화창.창)) !== null;
  }

  async 강화두번누르기(): Promise<void> {
    const 버튼 = `${강화창.본문}/DetailPanel/EnhanceButton`;
    await Promise.all([this.game.click(버튼), this.game.click(버튼)]);
  }

  async 강화누르기(): Promise<void> {
    await this.game.click(`${강화창.본문}/DetailPanel/EnhanceButton`);
  }
}
