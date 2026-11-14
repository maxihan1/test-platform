import type { Locator, Page } from '@playwright/test';

import { 대화창 } from '../components/dialog.component.js';
import { 펼침메뉴 } from '../components/dropdown.component.js';
import { 알림막대 } from '../components/toast.component.js';

export class 글카드목록 {
  readonly 펼침: 펼침메뉴;
  readonly 창: 대화창;
  readonly 알림: 알림막대;
  readonly 필터검색칸: Locator;
  readonly 필터추가됨: Locator;

  constructor(private readonly page: Page) {
    this.펼침 = new 펼침메뉴(page);
    this.창 = new 대화창(page);
    this.알림 = new 알림막대(page);
    this.필터검색칸 = this.창.창.getByRole('searchbox', { name: '검색 또는 생성' });
    this.필터추가됨 = this.창.제목('필터 추가됨!');
  }

  카드(조각: string): Locator {
    return this.page.getByRole('main').getByRole('article').filter({ hasText: 조각 }).first();
  }

  글자들(조각: string): Locator {
    return this.page.getByRole('main').getByRole('article').filter({ hasText: 조각 });
  }

  자세히(조각: string): Locator {
    return this.카드(조각).getByRole('button', { name: '자세히' });
  }

  부스트(조각: string): Locator {
    return this.카드(조각).getByRole('button', { name: /부스트/ });
  }

  답장(조각: string): Locator {
    return this.카드(조각).getByRole('button', { name: /^답장/ });
  }

  좋아요(조각: string): Locator {
    return this.카드(조각).getByRole('button', { name: /좋아요|즐겨찾기에서 제거/ });
  }

  북마크(조각: string): Locator {
    return this.카드(조각).getByRole('button', { name: /북마크/ });
  }

  프로필사진(조각: string): Locator {
    return this.카드(조각).locator('.account__avatar');
  }

  표시이름(조각: string): Locator {
    return this.카드(조각).getByRole('strong').first();
  }

  핸들(조각: string, 아이디: string): Locator {
    return this.카드(조각).getByText(`@${아이디}`).first();
  }

  상대시각(조각: string): Locator {
    return this.카드(조각).getByRole('time').first();
  }

  공개범위아이콘(조각: string): Locator {
    return this.카드(조각).getByRole('img', { name: /^(공개|조용한 공개|팔로워|개인 멘션)$/ }).first();
  }

  투표버튼(조각: string): Locator {
    return this.카드(조각).getByRole('button', { name: '투표', exact: true });
  }

  투표선택지(조각: string): Locator {
    return this.카드(조각).getByRole('listitem');
  }

  미디어격자(조각: string): Locator {
    return this.카드(조각).locator('.media-gallery');
  }

  인용원글(조각: string): Locator {
    return this.카드(조각).locator('.status__quote');
  }

  async 카드뜰때까지(조각: string): Promise<boolean> {
    return this.카드(조각).waitFor({ timeout: 15_000 }).then(() => true, () => false);
  }

  async 카드보이기(조각: string): Promise<void> {
    await this.카드(조각).waitFor();
    await this.카드(조각).scrollIntoViewIfNeeded();
    await this.자세히(조각).waitFor();
  }

  async 자세히열기(조각: string): Promise<void> {
    await this.카드보이기(조각);
    await this.자세히(조각).click();
    await this.펼침.열릴때까지();
  }

  async 부스트메뉴열기(조각: string): Promise<void> {
    await this.카드보이기(조각);
    await this.부스트(조각).click({ timeout: 5_000 }).catch(() => undefined);
  }

  async 필터창열기(조각: string): Promise<void> {
    await this.자세히열기(조각);
    await this.펼침.항목('이 게시물을 필터').click();
    await this.필터검색칸.waitFor();
  }

  async 새필터만들기(이름: string): Promise<void> {
    await this.필터검색칸.fill(이름);
    await this.창.버튼(`새 카테고리: ${이름}`).click();
  }

  async 글눌러열기(조각: string): Promise<void> {
    await this.카드(조각).getByRole('paragraph').first().click();
  }
}
