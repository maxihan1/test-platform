import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 역할폼화면 {
  static readonly 주소 = '/admin/roles/new';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 이름: Locator;
  readonly 우선순위: Locator;
  readonly 배지색상: Locator;
  readonly 배지표시: Locator;
  readonly 이단계인증: Locator;
  readonly 컬렉션한도: Locator;
  readonly 추가제출: Locator;
  readonly 저장: Locator;
  readonly 삭제: Locator;
  readonly 권한묶음제목들: Locator;
  readonly 켜진상자들: Locator;
  readonly 오류안내: Locator;
  readonly 칸오류들: Locator;
  readonly 우선순위초과오류: Locator;
  readonly 안전하지않음오류: Locator;
  readonly 자기역할변경오류: Locator;
  readonly 가진권한초과오류: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 });
    this.알림 = new 알림(page);
    this.이름 = page.getByRole('textbox', { name: '이름' });
    this.우선순위 = page.getByRole('spinbutton', { name: '우선순위' });
    this.배지색상 = page.getByRole('textbox', { name: '배지 색상' });
    this.배지표시 = page.getByRole('checkbox', { name: '역할 배지를 사용자 프로필에 표시' });
    this.이단계인증 = page.getByRole('checkbox', { name: '2단계 인증 필요' });
    this.컬렉션한도 = page.getByRole('spinbutton', { name: '사용자당 최대 컬렉션 개수' });
    this.추가제출 = page.getByRole('button', { name: '역할 추가' });
    this.저장 = page.getByRole('button', { name: '변경 사항을 저장' });
    this.삭제 = page.getByRole('main').getByRole('link', { name: '삭제' });
    this.권한묶음제목들 = page.getByRole('heading', { level: 2 });
    this.켜진상자들 = page.getByRole('checkbox', { checked: true });
    this.오류안내 = this.알림.모두.filter({ hasText: /^\s*오류가 발생했습니다/ });
    this.칸오류들 = page.locator('.error');
    this.우선순위초과오류 = page.getByText('당신의 현재 역할보다 높을 수 없습니다').first();
    this.자기역할변경오류 = page.getByText('당신의 현재 역할을 변경할 수 없습니다').first();
    this.가진권한초과오류 = page.getByText('당신의 현재 역할이 가지고 있지 않은 권한은 포함할 수 없습니다').first();
    this.안전하지않음오류 = page.getByText('기본 역할로 사용하기에 안전하지 않은 권한을 포함하고 있습니다').first();
  }

  async 추가폼열기(): Promise<void> {
    await this.page.goto(역할폼화면.주소);
    await this.이름.waitFor();
  }

  묶음(이름: string): Locator {
    return this.page.locator(`h2:text-is("${이름}") + div`);
  }

  묶음제목(이름: string): Locator {
    return this.page.getByRole('heading', { name: 이름, level: 2, exact: true });
  }

  권한(묶음이름: string, 권한이름: string): Locator {
    return this.묶음(묶음이름).getByRole('checkbox', { name: new RegExp(`^${권한이름}( |$)`) });
  }

  권한전체(권한이름: string): Locator {
    return this.page.getByRole('checkbox', { name: new RegExp(`^${권한이름}( |$)`) });
  }

  async 우선순위실어저장하기(값: number): Promise<void> {
    await this.이름.waitFor();
    await this.이름.evaluate((칸, 우선순위) => {
      const 폼 = 칸.closest('form');
      if (폼 === null) throw new Error('역할 폼을 찾지 못했다');
      const 숨은칸 = 칸.ownerDocument.createElement('input');
      숨은칸.type = 'hidden';
      숨은칸.name = 'user_role[position]';
      숨은칸.value = String(우선순위);
      폼.appendChild(숨은칸);
    }, 값);
    await this.저장.click();
  }

  async 막힌권한켜고추가하기(이름: string, 권한이름: string): Promise<void> {
    await this.이름.fill(이름);
    const 상자 = this.권한전체(권한이름);
    await 상자.evaluate((칸) => 칸.removeAttribute('disabled'));
    await 상자.check();
    await this.추가제출.click();
  }

  async 추가하기(이름: string, 우선순위: number, 권한이름들: string[]): Promise<void> {
    await this.추가폼열기();
    await this.이름.fill(이름);
    await this.우선순위.fill(String(우선순위));
    for (const 권한이름 of 권한이름들) await this.권한전체(권한이름).check();
    await this.추가제출.click();
  }
}
