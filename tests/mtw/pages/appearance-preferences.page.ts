import type { Locator, Page } from '@playwright/test';

import { 설정틀 } from '../components/settings-shell.component.js';

export class 외관설정화면 {
  static readonly 주소 = '/settings/preferences/appearance';

  readonly 틀: 설정틀;
  readonly 인터페이스언어: Locator;
  readonly 시간대: Locator;
  readonly 색상구성자동: Locator;
  readonly 오늘의유행: Locator;
  readonly 그라디언트: Locator;
  readonly 삭제전경고: Locator;
  readonly 대체텍스트경고: Locator;
  readonly 모든체크칸: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 설정틀(page);
    this.인터페이스언어 = page.getByRole('combobox', { name: '인터페이스 언어' });
    this.시간대 = page.getByRole('combobox', { name: '시간대' });
    this.색상구성자동 = page.getByRole('group', { name: '색상 구성' }).getByRole('radio', { name: '자동' });
    this.오늘의유행 = page.getByRole('checkbox', { name: '오늘의 유행 보이기' });
    this.그라디언트 = page.getByRole('checkbox', { name: '숨겨진 미디어에 대해 그라디언트 표시' });
    this.삭제전경고 = page.getByRole('checkbox', { name: '게시물을 삭제하기 전 경고하기' });
    this.대체텍스트경고 = page.getByRole('checkbox', { name: '대체텍스트가 없는 미디어를 포함하여 게시하기 전 경고' });
    this.모든체크칸 = page.getByRole('checkbox');
  }

  async 열기(): Promise<void> {
    await this.page.goto(외관설정화면.주소);
    await this.틀.저장.waitFor();
    await this.모든체크칸.first().waitFor();
  }

  async 선택된글(칸: Locator): Promise<string> {
    return 칸.evaluate((요소) => ((요소 as HTMLSelectElement).selectedOptions[0]?.textContent ?? '').trim());
  }

  async 켜진항목(제외: string[]): Promise<string> {
    const 이름들 = await this.모든체크칸.evaluateAll((칸들) =>
      칸들
        .filter((칸) => (칸 as HTMLInputElement).checked)
        .map((칸) => ((칸 as HTMLInputElement).labels?.[0]?.textContent ?? '').trim()),
    );
    return 이름들.filter((이름) => !제외.includes(이름)).join(', ');
  }
}
