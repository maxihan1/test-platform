import type { Locator, Page, Response } from '@playwright/test';

import { 대화창 } from '../components/dialog.component.js';
import { 작성상자 } from '../components/compose.component.js';
import { 알림막대 } from '../components/toast.component.js';
import type { 올릴파일 } from '../helpers/media.helper.js';

export interface 게시시도결과 {
  게시됨: boolean;
  글번호: string | undefined;
}

export class 작성화면 {
  static readonly 주소 = '/publish';

  readonly 작성: 작성상자;
  readonly 창: 대화창;
  readonly 알림: 알림막대;
  readonly 게시버튼: Locator;
  readonly 첨부썸네일들: Locator;
  readonly 항목칸들: Locator;
  readonly 기간선택: Locator;
  readonly 기간옵션들: Locator;
  readonly 언어검색칸: Locator;
  readonly 언어목록: Locator;
  readonly 공개범위선택: Locator;
  readonly 인용범위선택: Locator;
  readonly 공개범위저장: Locator;
  readonly 답장취소: Locator;
  readonly 인용취소: Locator;
  readonly 예약버튼: Locator;
  readonly 임시저장: Locator;
  readonly 비공개경고: Locator;
  readonly 공개인용불가: Locator;
  readonly 대체텍스트칸: Locator;
  readonly 대체텍스트완료: Locator;
  readonly 대체텍스트완료꺼짐: Locator;
  readonly 대체텍스트확인: Locator;
  readonly 그냥게시: Locator;

  constructor(private readonly page: Page) {
    this.작성 = new 작성상자(page);
    this.창 = new 대화창(page);
    this.알림 = new 알림막대(page);
    this.게시버튼 = this.작성.영역.getByRole('button', { name: '게시', exact: true });
    this.첨부썸네일들 = this.작성.영역.getByRole('button', { name: '수정', exact: true });
    this.항목칸들 = this.작성.영역.getByRole('textbox', { name: /번째 옵션/ });
    this.기간선택 = this.작성.영역.getByRole('combobox', { name: '투표 기간' });
    this.기간옵션들 = this.기간선택.getByRole('option');
    this.언어검색칸 = page.getByRole('searchbox', { name: /언어 검색/ });
    this.언어목록 = page.getByRole('listbox');
    this.공개범위선택 = this.창.버튼(/^공개 범위/);
    this.인용범위선택 = this.창.버튼(/^인용할 수 있는 사람/);
    this.공개범위저장 = this.창.버튼('저장');
    this.답장취소 = this.작성.영역.getByRole('button', { name: '취소', exact: true });
    this.인용취소 = this.작성.영역.getByRole('button', { name: '인용 취소' });
    this.예약버튼 = this.작성.영역.getByRole('button', { name: /예약/ });
    this.임시저장 = this.작성.영역.getByText(/임시 ?저장/);
    this.비공개경고 = page.getByText('이 계정은 비공개상태가 아닙니다. 누구나 이 계정을 팔로우 하여 팔로워 전용의 게시물을 볼 수 있습니다.');
    this.공개인용불가 = page.getByText('자신의 비공개 게시물을 공개 게시물로 인용할 수 없습니다.').first();
    this.대체텍스트칸 = this.창.창.getByRole('textbox');
    this.대체텍스트완료 = this.창.버튼('완료');
    this.대체텍스트완료꺼짐 = this.창.창.getByRole('button', { name: '완료', disabled: true });
    this.대체텍스트확인 = this.창.제목('대체 텍스트를 추가할까요?');
    this.그냥게시 = this.창.버튼('그냥 게시하기');
  }

  async 열기(): Promise<void> {
    await this.page.goto(작성화면.주소);
    await this.작성.그려질때까지();
  }

  공개범위버튼(이름: string): Locator {
    return this.작성.영역.getByRole('button', { name: 이름, exact: true });
  }

  공개범위선택지(이름: string): Locator {
    return this.page.getByRole('option', { name: new RegExp(`^${이름}`) });
  }

  자동완성항목(이름: string | RegExp): Locator {
    return this.page.getByRole('button', { name: 이름 });
  }

  async 공개범위창열기(): Promise<void> {
    await this.작성.공개범위.click();
    await this.창.뜰때까지();
  }

  async 공개범위목록열기(): Promise<void> {
    if (await this.공개범위선택지('공개').isVisible()) return;
    await this.공개범위선택.click();
    await this.공개범위선택지('공개').waitFor();
  }

  async 공개범위고르기시도(이름: string): Promise<void> {
    await this.공개범위목록열기();
    await this.공개범위선택지(이름).click({ timeout: 3_000 }).catch(() => undefined);
  }

  async 공개범위바꾸고저장(이름: string): Promise<void> {
    await this.공개범위창열기();
    await this.공개범위고르기시도(이름);
    await this.공개범위저장.click();
    await this.창.닫힐때까지();
  }

  async 기간옵션글자(): Promise<string[]> {
    await this.기간선택.waitFor();
    return (await this.기간옵션들.allInnerTexts()).map((글) => 글.replace(/\s+/g, ''));
  }

  async 항목채우기(번호: number, 글: string): Promise<boolean> {
    const 칸 = this.항목칸들.nth(번호 - 1);
    if ((await 칸.count()) === 0) return false;
    await 칸.fill(글);
    return true;
  }

  async 항목칸생길때까지(개수: number): Promise<boolean> {
    return this.항목칸들.nth(개수 - 1).waitFor({ timeout: 2_000 }).then(() => true, () => false);
  }

  async 이미지넣기(파일: 올릴파일, 개수: number): Promise<void> {
    await this.작성.파일칸.setInputFiles(파일);
    await this.첨부썸네일들.nth(개수 - 1).waitFor();
  }

  async 파일넣기(파일: 올릴파일): Promise<void> {
    await this.작성.파일칸.setInputFiles(파일);
  }

  async 대체텍스트창열기(): Promise<void> {
    await this.첨부썸네일들.first().click();
    await this.대체텍스트칸.waitFor();
  }

  async 대체텍스트완료누르기(): Promise<void> {
    await this.대체텍스트완료.click({ timeout: 3_000 }).catch(() => undefined);
  }

  async 게시해보기(): Promise<게시시도결과> {
    const 응답 = this.page
      .waitForResponse((r) => r.url().endsWith('/api/v1/statuses') && r.request().method() === 'POST', { timeout: 5_000 })
      .catch(() => undefined);
    if (await this.게시버튼.isEnabled()) await this.게시버튼.click();
    const 받음 = await 응답;
    if (받음 === undefined || !받음.ok()) return { 게시됨: false, 글번호: undefined };
    return { 게시됨: true, 글번호: ((await 받음.json()) as { id: string }).id };
  }

  async 대체텍스트없이게시하기(): Promise<게시시도결과> {
    const 응답 = this.page.waitForResponse((r) => r.url().endsWith('/api/v1/statuses') && r.request().method() === 'POST', { timeout: 10_000 });
    await this.게시버튼.click();
    await this.그냥게시.click();
    const 받음 = await 응답;
    return { 게시됨: 받음.ok(), 글번호: 받음.ok() ? ((await 받음.json()) as { id: string }).id : undefined };
  }

  원문응답받기(): Promise<boolean> {
    return this.page
      .waitForResponse((r) => /\/api\/v1\/statuses\/\d+\/source$/.test(r.url()), { timeout: 10_000 })
      .then((r) => r.ok(), () => false);
  }

  async 공개인용불가뜰때까지(): Promise<boolean> {
    return this.공개인용불가.waitFor({ timeout: 10_000 }).then(() => true, () => false);
  }

  async 게시안내뜰때까지(): Promise<boolean> {
    return this.알림.글('게시하였습니다.').waitFor({ timeout: 10_000 }).then(() => true, () => false);
  }

  async 두번눌러게시하기(): Promise<string[]> {
    const 글번호들: string[] = [];
    const 거는중: Promise<void>[] = [];
    const 듣기 = (r: Response): void => {
      if (r.url().endsWith('/api/v1/statuses') && r.request().method() === 'POST') {
        거는중.push(
          r.json().then((몸) => {
            if (r.ok()) 글번호들.push((몸 as { id: string }).id);
          }),
        );
      }
    };
    this.page.on('response', 듣기);
    await this.게시버튼.dblclick();
    await this.게시안내뜰때까지();
    await Promise.all(거는중);
    this.page.off('response', 듣기);
    return 글번호들;
  }

  async 본문에커서올때까지(): Promise<boolean> {
    return this.page.waitForFunction(() => document.activeElement?.tagName === 'TEXTAREA', null, { timeout: 3_000 }).then(() => true, () => false);
  }

  async 키치기(키: string): Promise<void> {
    await this.page.keyboard.press(키);
  }
}
