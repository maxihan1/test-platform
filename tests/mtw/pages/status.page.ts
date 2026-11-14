import type { Locator, Page } from '@playwright/test';

import { 펼침메뉴 } from '../components/dropdown.component.js';
import { 대화창 } from '../components/dialog.component.js';
import { 알림막대 } from '../components/toast.component.js';

export class 글상세화면 {
  static readonly 주소 = '/@{아이디}/{글번호}';

  readonly 펼침: 펼침메뉴;
  readonly 창: 대화창;
  readonly 알림: 알림막대;
  readonly 본글: Locator;
  readonly 본문: Locator;
  readonly 답장: Locator;
  readonly 부스트: Locator;
  readonly 좋아요: Locator;
  readonly 북마크: Locator;
  readonly 자세히: Locator;
  readonly 돌아가기: Locator;
  readonly 모두접기: Locator;
  readonly 모두펼치기: Locator;
  readonly 게시일시: Locator;
  readonly 공개범위아이콘: Locator;
  readonly 부스트수링크: Locator;
  readonly 인용수링크: Locator;
  readonly 마음수링크: Locator;
  readonly 수정됨: Locator;
  readonly 투표버튼: Locator;
  readonly 투표마감: Locator;
  readonly 투표함표시: Locator;
  readonly 없는글안내: Locator;
  readonly 부스트비활성: Locator;
  readonly 좋아요취소: Locator;
  readonly 북마크삭제: Locator;

  constructor(private readonly page: Page) {
    this.펼침 = new 펼침메뉴(page);
    this.창 = new 대화창(page);
    this.알림 = new 알림막대(page);
    this.본글 = page.getByRole('main').getByRole('region').filter({ has: page.getByRole('button', { name: '자세히' }) }).first();
    this.본문 = this.본글.getByRole('paragraph').first();
    this.답장 = this.본글.getByRole('button', { name: '답장' });
    this.부스트 = this.본글.getByRole('button', { name: /부스트/ }).first();
    this.좋아요 = this.본글.getByRole('button', { name: /좋아요|즐겨찾기에서 제거/ });
    this.북마크 = this.본글.getByRole('button', { name: /북마크/ });
    this.자세히 = this.본글.getByRole('button', { name: '자세히' });
    this.돌아가기 = page.getByRole('main').getByRole('button', { name: '돌아가기' });
    this.모두접기 = page.getByRole('main').getByRole('button', { name: '모두 접기' });
    this.모두펼치기 = page.getByRole('main').getByRole('button', { name: '모두 펼치기' });
    this.게시일시 = this.본글.getByRole('link', { name: /\d{4}년 \d+월 \d+일/ });
    this.공개범위아이콘 = this.본글.getByRole('img', { name: /^(공개|조용한 공개|팔로워|개인 멘션)$/ });
    this.부스트수링크 = this.본글.getByRole('link', { name: /부스트$/ });
    this.인용수링크 = this.본글.getByRole('link', { name: /인용$/ });
    this.마음수링크 = this.본글.getByRole('link', { name: /마음에 들어함$/ });
    this.수정됨 = this.본글.getByText(/\d+번 수정됨/);
    this.투표버튼 = this.본글.getByRole('button', { name: '투표', exact: true });
    this.투표마감 = this.본글.getByText(/명 · 마감/);
    this.투표함표시 = this.본글.getByRole('img', { name: '이 답변에 투표함' });
    this.없는글안내 = page.getByRole('main').getByRole('heading', { name: '찾으려는 페이지가 존재하지 않습니다.' });
    this.좋아요취소 = this.본글.getByRole('button', { name: '즐겨찾기에서 제거' });
    this.북마크삭제 = this.본글.getByRole('button', { name: '북마크 삭제' });
    this.부스트비활성 = this.본글.getByRole('button', { name: '부스트와 인용이 비활성화되었습니다' });
  }

  본문조각(조각: string): Locator {
    return this.page.getByRole('main').getByText(조각).first();
  }

  글타래글(조각: string): Locator {
    return this.page.getByRole('main').getByText(조각).first();
  }

  async 세로위치(조각: string): Promise<number> {
    await this.글타래글(조각).waitFor();
    const 상자 = await this.글타래글(조각).boundingBox();
    return 상자 === null ? Number.NaN : 상자.y;
  }

  async 열고본문기다리기(경로: string, 조각: string): Promise<boolean> {
    await this.page.goto(경로);
    await this.본문조각(조각).or(this.없는글안내).first().waitFor();
    return this.본문조각(조각).isVisible();
  }

  async 글타래열기(경로: string, 조각: string): Promise<void> {
    await this.page.goto(경로);
    await this.글타래글(조각).waitFor();
  }

  async 없는글열기(경로: string): Promise<void> {
    await this.page.goto(경로);
    await this.없는글안내.or(this.자세히).first().waitFor();
  }

  async 자세히열기(): Promise<void> {
    await this.자세히.click();
    await this.펼침.열릴때까지();
  }

  좋아요응답받기(): Promise<boolean> {
    return this.page
      .waitForResponse((r) => /\/api\/v1\/statuses\/\d+\/favourite$/.test(r.url()), { timeout: 10_000 })
      .then((r) => r.ok(), () => false);
  }

  북마크응답받기(): Promise<boolean> {
    return this.page
      .waitForResponse((r) => /\/api\/v1\/statuses\/\d+\/bookmark$/.test(r.url()), { timeout: 10_000 })
      .then((r) => r.ok(), () => false);
  }

  고정응답받기(): Promise<boolean> {
    return this.page
      .waitForResponse((r) => /\/api\/v1\/statuses\/\d+\/pin$/.test(r.url()), { timeout: 10_000 })
      .then((r) => r.ok(), () => false);
  }

  부스트응답받기(): Promise<boolean> {
    return this.page
      .waitForResponse((r) => /\/api\/v1\/statuses\/\d+\/reblog$/.test(r.url()), { timeout: 10_000 })
      .then((r) => r.ok(), () => false);
  }

  async 부스트메뉴열기(): Promise<void> {
    await this.부스트.click({ timeout: 5_000 }).catch(() => undefined);
  }

  async 투표마감기다리기(): Promise<boolean> {
    return this.투표마감.waitFor({ timeout: 10_000 }).then(() => true, () => false);
  }


  async 열기(경로: string): Promise<void> {
    await this.page.goto(경로);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.자세히.waitFor();
  }
}
