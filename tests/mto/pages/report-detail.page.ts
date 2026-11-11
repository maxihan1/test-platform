import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 신고상세화면 {
  static readonly 주소 = '/admin/reports/';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 해결로표시: Locator;
  readonly 미해결로표시: Locator;
  readonly 신고대상계정라벨: Locator;
  readonly 신고자라벨: Locator;
  readonly 신고시각라벨: Locator;
  readonly 업데이트시각라벨: Locator;
  readonly 할당된중재자라벨: Locator;
  readonly 할당된중재자항목: Locator;
  readonly 아무도없음: Locator;
  readonly 나에게할당하기: Locator;
  readonly 할당해제: Locator;
  readonly 카테고리제목: Locator;
  readonly 게시물묶음: Locator;
  readonly 신고에더추가하기: Locator;
  readonly 신고에서제거: Locator;
  readonly 작업으로건너뛰기: Locator;
  readonly 조치영역: Locator;
  readonly 조치해결로표시: Locator;
  readonly 민감함으로설정: Locator;
  readonly 컨텐츠삭제: Locator;
  readonly 삭제불가안내: Locator;
  readonly 제한: Locator;
  readonly 정지: Locator;
  readonly 사용자지정: Locator;
  readonly 참고사항칸: Locator;
  readonly 참고사항추가: Locator;
  readonly 참고사항종결: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: /^신고 #\d+/, level: 1 });
    this.알림 = new 알림(page);
    this.해결로표시 = page.locator('.content__heading').getByRole('link', { name: '해결로 표시' }).or(page.locator('.content__heading').getByRole('button', { name: '해결로 표시' })).first();
    this.미해결로표시 = page.locator('.content__heading').getByRole('link', { name: '미해결로 표시' }).or(page.locator('.content__heading').getByRole('button', { name: '미해결로 표시' })).first();
    this.신고대상계정라벨 = page.getByText('신고 대상 계정', { exact: true });
    this.신고자라벨 = page.getByText('신고자', { exact: true });
    this.신고시각라벨 = page.getByText('신고 시각', { exact: true });
    this.업데이트시각라벨 = page.getByText('업데이트 시각', { exact: true });
    this.할당된중재자라벨 = page.getByText('할당된 중재자', { exact: true });
    this.할당된중재자항목 = page.locator('.report-header__details__item').filter({ has: page.getByText('할당된 중재자', { exact: true }) });
    this.아무도없음 = this.할당된중재자항목.getByText('아무도 없음');
    this.나에게할당하기 = page.getByRole('link', { name: '나에게 할당하기' });
    this.할당해제 = page.getByRole('link', { name: '할당 해제' });
    this.카테고리제목 = page.getByRole('heading', { name: '카테고리', level: 3 });
    this.게시물묶음 = page.getByText(/^\s*게시물 \(\d+\)\s*$/);
    this.신고에더추가하기 = page.getByRole('link', { name: '신고에 더 추가하기' });
    this.신고에서제거 = page.getByRole('button', { name: '신고에서 제거' });
    this.작업으로건너뛰기 = page.getByRole('link', { name: '작업으로 건너뛰기' });
    this.조치영역 = page.locator('.report-actions');
    this.조치해결로표시 = this.조치영역.getByRole('link', { name: '해결로 표시' });
    this.민감함으로설정 = this.조치영역.getByRole('button', { name: '민감함으로 설정' });
    this.컨텐츠삭제 = this.조치영역.getByRole('button', { name: '컨텐츠 삭제' });
    this.삭제불가안내 = page.getByTitle('이 신고는 삭제할 관련 게시물이 없습니다');
    this.제한 = this.조치영역.getByRole('button', { name: '제한', exact: true });
    this.정지 = this.조치영역.getByRole('button', { name: '정지', exact: true });
    this.사용자지정 = this.조치영역.getByRole('link', { name: '사용자 지정' });
    this.참고사항칸 = page.getByRole('textbox', { name: '어떤 대응을 했는지 설명 또는 그 밖의 관련된 갱신 사항들' });
    this.참고사항추가 = page.getByRole('button', { name: '참고사항 추가' });
    this.참고사항종결 = page.getByRole('button', { name: '참고사항 기재 및 종결' });
  }

  async 열기(신고번호: string): Promise<number> {
    const 응답 = await this.page.goto(`${신고상세화면.주소}${신고번호}`);
    await this.page.getByRole('heading', { level: 1 }).first().waitFor();
    return 응답?.status() ?? 0;
  }

  카테고리(이름: string): Locator {
    return this.page.getByRole('button', { name: 이름, exact: true });
  }

  async 카테고리눌림(이름: string): Promise<boolean> {
    return !(await this.카테고리(이름).evaluate((요소) => 요소.classList.contains('disabled')));
  }

  할당자(이름: string): Locator {
    return this.할당된중재자항목.getByText(이름);
  }

  async 카테고리선택됨(이름: string): Promise<boolean> {
    return this.카테고리(이름).evaluate((요소) => 요소.classList.contains('selected'));
  }

  사유글(글: string): Locator {
    return this.page.getByText(글, { exact: true });
  }

  async 해결하기(): Promise<void> {
    await this.해결로표시.click();
    await this.알림.모두.first().waitFor();
  }

  async 미해결로되돌리기(): Promise<void> {
    await this.미해결로표시.click();
    await this.해결로표시.waitFor();
  }

  async 나에게할당(): Promise<void> {
    await this.나에게할당하기.click();
    await this.할당해제.waitFor();
  }

  async 할당풀기(): Promise<void> {
    await this.할당해제.click();
    await this.나에게할당하기.waitFor();
  }

  async 참고사항으로종결(글: string): Promise<void> {
    await this.참고사항칸.fill(글);
    await this.참고사항종결.click();
    await this.알림.모두.first().waitFor();
  }
}
