import type { Locator, Page } from '@playwright/test';

import { 펼침메뉴 } from '../components/dropdown.component.js';
import { 오른쪽메뉴 } from '../components/side-nav.component.js';

export class 프로필화면 {
  static readonly 주소 = '/@{아이디}';

  readonly 메뉴: 오른쪽메뉴;
  readonly 펼침: 펼침메뉴;
  readonly 머리: Locator;
  readonly 표시이름: Locator;
  readonly 핸들: Locator;
  readonly 팔로우버튼: Locator;
  readonly 더보기: Locator;
  readonly 글목록: Locator;
  readonly 돌아가기: Locator;
  readonly 핸들안내: Locator;
  readonly 소개없음: Locator;
  readonly 개인메모제목: Locator;
  readonly 잠금안내: Locator;
  readonly 알림벨: Locator;
  readonly 커버: Locator;
  readonly 아바타: Locator;
  readonly 게시물없음: Locator;
  readonly 게시물과부스트: Locator;
  readonly 가입창: Locator;
  readonly 가입날짜버튼: Locator;
  readonly 프로필편집링크: Locator;
  readonly 메모창: Locator;
  readonly 메모칸: Locator;
  readonly 메모저장: Locator;
  readonly 메모취소: Locator;
  readonly 확인창: Locator;
  readonly 확인창제목: Locator;
  readonly 확인창취소: Locator;
  readonly 알림: Locator;
  readonly 팔로우하기버튼: Locator;
  readonly 차단해제확인: Locator;
  readonly 사용불가: Locator;

  constructor(private readonly page: Page) {
    this.메뉴 = new 오른쪽메뉴(page);
    this.펼침 = new 펼침메뉴(page);
    this.머리 = page.getByRole('main').getByRole('region').first();
    this.표시이름 = this.머리.getByRole('heading', { level: 1 });
    this.핸들 = this.머리.getByRole('button', { name: /이것은 무엇을 의미하나요/ });
    this.팔로우버튼 = this.머리.getByRole('button', { name: /^(팔로우|팔로우 요청|맞팔로우|언팔로우|요청 취소|차단 해제|뮤트 해제)$/ });
    this.더보기 = this.머리.getByRole('button', { name: /^(Menu|메뉴|더 보기)$/ });
    this.글목록 = page.getByRole('main').getByRole('feed');
    this.돌아가기 = page.getByRole('main').getByRole('button', { name: '돌아가기' });
    this.핸들안내 = page.getByRole('heading', { name: '핸들은 이메일과 비슷합니다' });
    this.소개없음 = page.getByText('제공된 설명이 없습니다.');
    this.개인메모제목 = page.getByText('개인 메모 (나에게만 보입니다)');
    this.잠금안내 = page.getByText('이 계정의 프라이버시 설정은 잠금으로 설정되어 있습니다. 계정 소유자가 수동으로 팔로워를 승인합니다.');
    this.알림벨 = this.머리.getByRole('button', { name: /게시물 알림 (켜기|끄기)/ });
    this.커버 = this.머리.locator('img.parallax');
    this.아바타 = this.머리.locator('[class*="avatarWrapper"]');
    this.게시물없음 = page.getByText('이곳에는 게시물이 없습니다!');
    this.게시물과부스트 = this.머리.getByRole('button', { name: '게시물과 부스트' });
    this.가입창 = page.getByRole('dialog').filter({ hasText: '에 가입한 날' });
    this.가입날짜버튼 = this.통계('가입').getByRole('button');
    this.프로필편집링크 = this.머리.getByRole('link', { name: '프로필 편집' });
    this.메모창 = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /개인 메모/ }) });
    this.메모칸 = this.메모창.getByRole('textbox', { name: '개인 노트' });
    this.메모저장 = this.메모창.getByRole('button', { name: '저장' });
    this.메모취소 = this.메모창.getByRole('button', { name: '취소' });
    this.확인창 = page.getByRole('dialog');
    this.확인창제목 = this.확인창.getByRole('heading', { level: 1 });
    this.확인창취소 = this.확인창.getByRole('button', { name: '취소' });
    this.알림 = page.getByRole('status');
    this.차단해제확인 = this.확인창.getByRole('button', { name: '차단 해제' });
    this.팔로우하기버튼 = this.머리.getByRole('button', { name: /^(팔로우|팔로우 요청)$/ });
    this.사용불가 = page.getByText('프로필 사용 불가');
  }

  async 열기(아이디: string): Promise<void> {
    await this.page.goto(`/@${아이디}`);
    await this.그려질때까지();
  }

  async 주소만열기(경로: string): Promise<void> {
    await this.page.goto(경로);
  }

  async 그려질때까지(): Promise<void> {
    await this.표시이름.waitFor();
  }

  글(글조각: string): Locator {
    return this.글목록.getByRole('article').filter({ hasText: 글조각 });
  }

  통계(이름: string): Locator {
    return this.머리.getByRole('listitem').filter({ hasText: 이름 });
  }

  async 통계숫자(이름: string): Promise<string> {
    const 글 = await this.통계(이름).innerText();
    return 글.replace(이름, '').trim();
  }

  async 가입일(): Promise<string | null> {
    return this.통계('가입').getAttribute('title');
  }

  탭(이름: string): Locator {
    return this.머리.getByRole('link', { name: 이름, exact: true });
  }

  통계링크(이름: string): Locator {
    return this.통계(이름).getByRole('link');
  }

  체크상자(이름: string): Locator {
    return this.page.getByRole('checkbox', { name: 이름 });
  }

  async 더보기열기(): Promise<void> {
    await this.더보기.click({ timeout: 10_000 });
    await this.펼침.열릴때까지();
  }

  async 팔로우누르기(): Promise<void> {
    await this.팔로우버튼.click();
  }

  async 메모저장누르기(): Promise<number> {
    const 응답 = this.page.waitForResponse((r) => /\/accounts\/\d+\/note$/.test(r.url()) && r.request().method() === 'POST');
    await this.메모저장.click();
    return (await 응답).status();
  }

  async 메모열기(): Promise<void> {
    await this.더보기열기();
    await this.펼침.항목(/개인 메모/).click();
    await this.메모칸.waitFor();
  }

  async 첫글메뉴열기(): Promise<void> {
    const 첫글 = this.글목록.getByRole('article').first();
    await 첫글.waitFor();
    await 첫글.getByRole('button', { name: '자세히' }).click();
    await this.펼침.열릴때까지();
  }

  async 버튼그려질때까지(): Promise<void> {
    await this.팔로우버튼.waitFor();
  }

  async 첫글그려질때까지(): Promise<void> {
    await this.글목록.getByRole('article').first().waitFor();
  }

  async 주소바뀔때까지(경로식: RegExp): Promise<void> {
    await this.page.waitForURL((주소) => 경로식.test(주소.pathname));
  }

  안내글(문구: string): Locator {
    return this.page.getByText(문구);
  }
}
