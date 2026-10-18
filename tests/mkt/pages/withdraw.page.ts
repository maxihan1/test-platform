import type { Dialog, Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 회원탈퇴화면 {
  static readonly 주소 = '/my/withdraw';
  readonly 제목: Locator;
  readonly 안내제목: Locator;
  readonly 동의: Locator;
  readonly 탈퇴버튼: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '회원 탈퇴', level: 1 });
    this.안내제목 = page.getByRole('heading', { name: '탈퇴 전에 꼭 확인하세요', level: 2 });
    this.동의 = page.getByRole('checkbox', { name: '위 내용을 확인했습니다' });
    this.탈퇴버튼 = page.getByRole('button', { name: '탈퇴하기', exact: true });
    this.머리글 = new 머리글(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원탈퇴화면.주소);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
    await this.탈퇴버튼.waitFor();
  }

  async 동의켜기(): Promise<void> {
    await this.동의.check();
  }

  async 탈퇴하기누르기(확인창에서: '확인' | '취소'): Promise<string> {
    let 글 = '';
    const 받기 = (창: Dialog) => {
      글 = 창.message();
      return 확인창에서 === '확인' ? 창.accept() : 창.dismiss();
    };
    this.page.once('dialog', 받기);
    await this.탈퇴버튼.click();
    return 글;
  }
}
