import type { Locator, Page } from '@playwright/test';

import { 로그인안내창 } from '../components/interaction-modal.component.js';
import { 오른쪽메뉴 } from '../components/side-nav.component.js';

export class 로그인전화면 {
  static readonly 주소 = '/';

  readonly 메뉴: 오른쪽메뉴;
  readonly 안내창: 로그인안내창;
  readonly 유행중: Locator;
  readonly 실시간피드: Locator;
  readonly 계정생성: Locator;
  readonly 로그인: Locator;
  readonly 서버더보기: Locator;
  readonly 바닥: Locator;
  readonly 서버정보: Locator;
  readonly 프로필책자: Locator;
  readonly 개인정보처리방침: Locator;
  readonly 이용약관: Locator;
  readonly 마스토돈제목: Locator;
  readonly 앱다운로드: Locator;
  readonly 키보드단축키: Locator;
  readonly 소스코드: Locator;
  readonly 버전: Locator;
  readonly 가입등록: Locator;
  readonly 로그인제목: Locator;
  readonly 스크립트안내: Locator;

  constructor(private readonly page: Page) {
    this.메뉴 = new 오른쪽메뉴(page);
    this.안내창 = new 로그인안내창(page);
    this.유행중 = this.메뉴.링크('유행 중');
    this.실시간피드 = this.메뉴.링크('실시간 피드');
    this.계정생성 = this.메뉴.영역.getByRole('link', { name: '계정 생성', exact: true });
    this.로그인 = this.메뉴.영역.getByRole('link', { name: '로그인', exact: true });
    this.서버더보기 = page.getByRole('link', { name: '이 서버에 대한 더 많은 정보' });
    this.바닥 = page.getByRole('contentinfo');
    this.서버정보 = this.바닥.getByRole('link', { name: '정보 mastodon.maxihan.com', exact: true });
    this.프로필책자 = this.바닥.getByRole('link', { name: '프로필 책자', exact: true });
    this.개인정보처리방침 = this.바닥.getByRole('link', { name: '개인정보처리방침', exact: true });
    this.이용약관 = this.바닥.getByRole('link', { name: /이용 ?약관/ });
    this.마스토돈제목 = this.바닥.getByRole('heading', { name: 'Mastodon:' });
    this.앱다운로드 = this.바닥.getByRole('link', { name: '앱 다운로드하기', exact: true });
    this.키보드단축키 = this.바닥.getByRole('link', { name: '키보드 단축키', exact: true });
    this.소스코드 = this.바닥.getByRole('link', { name: '소스코드 보기', exact: true });
    this.버전 = this.바닥.getByText('v4.7.5');
    this.가입등록 = page.getByRole('button', { name: '등록하기' });
    this.스크립트안내 = page.locator('noscript');
    this.로그인제목 = page.getByRole('heading', { name: 'mastodon.maxihan.com에 로그인' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(로그인전화면.주소);
    await this.그려질때까지();
  }

  async 이동(): Promise<void> {
    await this.page.goto(로그인전화면.주소);
  }

  async 그려질때까지(): Promise<void> {
    await this.계정생성.waitFor();
    await this.바닥.waitFor();
  }
}
