import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 서버설정화면 {
  static readonly 주소 = '/admin/settings/branding';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 저장: Locator;
  readonly 가입방식: Locator;
  readonly 가입이유필수: Locator;
  readonly 가입이유필수눌림: Locator;
  readonly 가입이유필수잠김: Locator;
  readonly 가입방식선택지: Locator;
  readonly 오류안내: Locator;
  readonly 칸오류들: Locator;
  readonly 사용자명없음오류: Locator;
  readonly 서버이름: Locator;
  readonly 연락관리자: Locator;
  readonly 연락이메일: Locator;
  readonly 서버설명: Locator;
  readonly 썸네일대체텍스트: Locator;
  readonly 서버썸네일: Locator;
  readonly 파비콘: Locator;
  readonly 앱아이콘: Locator;
  readonly 파비콘삭제: Locator;
  readonly 확장된설명: Locator;
  readonly 서버규칙관리: Locator;
  readonly 도메인차단보여주기: Locator;
  readonly 도메인차단이유보여주기: Locator;
  readonly 상태페이지: Locator;
  readonly 개인정보처리방침: Locator;
  readonly 최소연령: Locator;
  readonly 가입경고: Locator;
  readonly 가입불가메시지: Locator;
  readonly 캡차: Locator;
  readonly 유행활성화: Locator;
  readonly 사전리뷰허용: Locator;
  readonly 추천하지않음배지: Locator;
  readonly 로컬실시간피드: Locator;
  readonly 리모트실시간피드: Locator;
  readonly 로컬해시태그피드: Locator;
  readonly 리모트해시태그피드: Locator;
  readonly 추천계정: Locator;
  readonly 미디어캐시: Locator;
  readonly 아카이브유지: Locator;
  readonly 리모트보유: Locator;
  readonly 기본테마: Locator;
  readonly 사용자정의CSS: Locator;
  readonly 사용자정의마스코트: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '서버 설정', level: 1 });
    this.알림 = new 알림(page);
    this.저장 = page.getByRole('button', { name: '변경 사항을 저장' });
    this.가입방식 = page.getByRole('combobox', { name: '누가 가입할 수 있는지' });
    this.가입이유필수 = page.getByRole('checkbox', { name: '가입 하는 이유를 필수로 입력하게 하기' });
    this.가입이유필수눌림 = page.getByRole('checkbox', { name: '가입 하는 이유를 필수로 입력하게 하기', disabled: false });
    this.가입이유필수잠김 = page.getByRole('checkbox', { name: '가입 하는 이유를 필수로 입력하게 하기', disabled: true });
    this.가입방식선택지 = this.가입방식.getByRole('option');
    this.오류안내 = this.알림.모두.filter({ hasText: /^\s*오류가 발생했습니다/ });
    this.칸오류들 = page.locator('.error');
    this.사용자명없음오류 = page.getByText('해당 사용자명에 대한 로컬 유저를 찾을 수 없습니다').first();
    this.서버이름 = page.getByRole('textbox', { name: '서버 이름' });
    this.연락관리자 = page.getByRole('textbox', { name: '연락 받을 관리자 사용자명' });
    this.연락이메일 = page.getByRole('textbox', { name: '연락처 이메일' });
    this.서버설명 = page.getByRole('textbox', { name: '서버 설명' });
    this.썸네일대체텍스트 = page.getByRole('textbox', { name: '썸네일 대체 텍스트' });
    this.서버썸네일 = page.getByLabel('서버 썸네일', { exact: true });
    this.파비콘 = page.getByLabel('파비콘', { exact: true });
    this.앱아이콘 = page.getByLabel('앱 아이콘', { exact: true });
    this.파비콘삭제 = page.locator('.fields-row').filter({ has: this.파비콘 }).getByRole('link', { name: '업로드한 파일 삭제' });
    this.확장된설명 = page.getByRole('textbox', { name: '확장된 설명' });
    this.서버규칙관리 = page.getByRole('link', { name: '서버 규칙 관리' });
    this.도메인차단보여주기 = page.getByRole('combobox', { name: '도메인 차단 보여주기', exact: true });
    this.도메인차단이유보여주기 = page.getByRole('combobox', { name: '왜 도메인이 차단되었는지 보여주기', exact: true });
    this.상태페이지 = page.getByRole('textbox', { name: '상태 페이지 URL' });
    this.개인정보처리방침 = page.getByRole('textbox', { name: '개인정보처리방침' });
    this.최소연령 = page.getByRole('textbox', { name: '최소 연령 제한' });
    this.가입경고 = page.getByText(/^모두에게 가입을 열기 전에/).first();
    this.가입불가메시지 = page.getByRole('textbox', { name: '가입이 불가능 할 때의 사용자 지정 메시지' });
    this.캡차 = page.getByText(/캡차|CAPTCHA/i).first();
    this.유행활성화 = page.getByRole('checkbox', { name: '유행 활성화', exact: true });
    this.사전리뷰허용 = page.getByRole('checkbox', { name: /^사전 리뷰 없이 트렌드에 오르는 것을 허용/ });
    this.추천하지않음배지 = page.getByText('추천하지 않음', { exact: true }).first();
    this.로컬실시간피드 = page.getByRole('combobox', { name: '로컬 게시물에 대한 실시간 피드 접근' });
    this.리모트실시간피드 = page.getByRole('combobox', { name: '리모트 게시물에 대한 실시간 피드 접근' });
    this.로컬해시태그피드 = page.getByRole('combobox', { name: '로컬 게시물에 대한 해시태그와 링크 피드 접근' });
    this.리모트해시태그피드 = page.getByRole('combobox', { name: '리모트 게시물에 대한 해시태그와 링크 피드 접근' });
    this.추천계정 = page.getByRole('textbox', { name: '새로운 사용자들에게 추천할 계정들' });
    this.미디어캐시 = page.getByRole('textbox', { name: '미디어 캐시 유지 기한' });
    this.아카이브유지 = page.getByRole('textbox', { name: '사용자 아카이브 유지 기한' });
    this.리모트보유 = page.getByRole('textbox', { name: '리모트 콘텐츠 보유 기간' });
    this.기본테마 = page.getByRole('combobox', { name: '기본 테마' });
    this.사용자정의CSS = page.getByRole('textbox', { name: '사용자 정의 CSS' });
    this.사용자정의마스코트 = page.getByLabel('사용자 정의 마스코트 (legacy)', { exact: true });
  }

  탭(이름: string): Locator {
    return this.page.locator('.content__heading__tabs, .content__heading').getByRole('link', { name: 이름, exact: true });
  }

  랜딩선택지(이름: string): Locator {
    return this.page.getByRole('radio', { name: new RegExp(`^${이름} `) });
  }

  async 열기(탭경로 = 'branding'): Promise<void> {
    await this.page.goto(`/admin/settings/${탭경로}`);
    await this.제목.waitFor();
    await this.저장.waitFor();
  }

  async 옛주소열기(): Promise<void> {
    await this.page.goto('/admin/settings');
    await this.제목.waitFor();
    await this.저장.waitFor();
  }

  현재경로(): string {
    return new URL(this.page.url()).pathname;
  }

  async 저장하기(): Promise<void> {
    await this.저장.click();
    await this.page.waitForLoadState('load');
    await this.제목.waitFor();
  }

  async 가입방식바꾸기(방식: '누구나 가입 할 수 있음' | '가입하려면 승인이 필요함' | '아무도 가입 할 수 없음'): Promise<void> {
    await this.열기('registrations');
    await this.가입방식.selectOption({ label: 방식 });
    await this.저장하기();
    await this.알림.글('정상적으로 변경되었습니다!').waitFor();
  }
}
