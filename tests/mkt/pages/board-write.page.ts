import type { Locator, Page, Response } from '@playwright/test';

export interface 글칸값 {
  분류?: string;
  제목?: string;
  본문?: string;
}

export class 글쓰기화면 {
  static readonly 주소 = '/board/write';

  readonly page: Page;
  readonly 화면제목: Locator;
  readonly 분류: Locator;
  readonly 분류항목들: Locator;
  readonly 제목칸: Locator;
  readonly 본문칸: Locator;
  readonly 이미지칸: Locator;
  readonly 미리보기들: Locator;
  readonly 이미지빼기버튼: Locator;
  readonly 임시저장버튼: Locator;
  readonly 취소링크: Locator;
  readonly 등록버튼: Locator;
  readonly 제목글자수: Locator;
  readonly 본문글자수: Locator;
  readonly 권한없음제목: Locator;
  readonly 권한없음안내: Locator;
  readonly 홈으로링크: Locator;
  readonly 폼준비: Locator;

  constructor(page: Page) {
    this.page = page;
    this.화면제목 = page.getByRole('heading', { level: 1 });
    this.분류 = page.getByLabel('분류');
    this.분류항목들 = this.분류.getByRole('option');
    this.제목칸 = page.getByLabel('제목');
    this.본문칸 = page.getByLabel('본문');
    this.이미지칸 = page.getByLabel('이미지 첨부');
    this.미리보기들 = page.getByRole('img', { name: /^첨부 이미지 \d+$/ });
    this.이미지빼기버튼 = page.getByRole('button', { name: '이미지 빼기' });
    this.임시저장버튼 = page.getByRole('button', { name: '임시 저장', exact: true });
    this.취소링크 = page.getByRole('link', { name: '취소', exact: true });
    this.등록버튼 = page.getByRole('button', { name: '등록', exact: true });
    this.제목글자수 = page.getByText(/^\d+\/50$/);
    this.본문글자수 = page.getByText(/^\d+\/2000$/);
    this.권한없음제목 = page.getByRole('heading', { name: '권한이 없습니다', level: 1 });
    this.권한없음안내 = page.getByText('이 화면을 볼 수 있는 권한이 없습니다');
    this.홈으로링크 = page.getByRole('link', { name: '홈으로', exact: true });
    this.폼준비 = page.locator('#post-form:not([aria-busy])');
  }

  async 열기(): Promise<void> {
    await this.page.goto(글쓰기화면.주소);
    await this.폼준비.waitFor();
  }

  async 수정열기(번호: number): Promise<void> {
    await this.page.goto(`/board/${번호}/edit`);
    await this.폼준비.or(this.권한없음제목).first().waitFor();
  }

  async 채우기(값: 글칸값): Promise<void> {
    if (값.분류 !== undefined) await this.분류.selectOption({ label: 값.분류 });
    if (값.제목 !== undefined) await this.제목칸.fill(값.제목);
    if (값.본문 !== undefined) await this.본문칸.fill(값.본문);
  }

  async 이미지넣기(파일들: { name: string; mimeType: string; buffer: Buffer }[]): Promise<void> {
    await this.이미지칸.setInputFiles(파일들);
  }

  async 등록누르고응답받기(): Promise<Response> {
    const 응답 = this.page.waitForResponse(등록요청인가);
    await this.등록버튼.click();
    return 응답;
  }

  async 등록두번누르기(): Promise<void> {
    await this.등록버튼.dblclick();
  }

  async 제목채워질때까지기다리기(): Promise<void> {
    const 칸 = await this.제목칸.elementHandle();
    if (칸 === null) throw new Error('제목 칸을 찾지 못했다');
    await this.page.waitForFunction((요소) => (요소 as HTMLInputElement).value !== '', 칸);
  }

  async 고른분류(): Promise<string> {
    return this.분류.inputValue();
  }

  async 글자수자리읽기(): Promise<{ 제목글자수: string; 제목칸아래: boolean; 본문글자수: string; 본문칸아래: boolean }> {
    const 제목칸자리 = await this.제목칸.boundingBox();
    const 제목수자리 = await this.제목글자수.boundingBox();
    const 본문칸자리 = await this.본문칸.boundingBox();
    const 본문수자리 = await this.본문글자수.boundingBox();
    if (제목칸자리 === null || 제목수자리 === null || 본문칸자리 === null || 본문수자리 === null) throw new Error('글자 수 자리를 읽지 못했다');
    return {
      제목글자수: await this.제목글자수.innerText(),
      제목칸아래: 제목수자리.y >= 제목칸자리.y + 제목칸자리.height - 2,
      본문글자수: await this.본문글자수.innerText(),
      본문칸아래: 본문수자리.y >= 본문칸자리.y + 본문칸자리.height - 2,
    };
  }

  async 분류글자들(): Promise<string[]> {
    return this.분류항목들.allInnerTexts();
  }
}

function 등록요청인가(값: Response): boolean {
  const 방식 = 값.request().method();
  return 값.url().includes('/api/posts') && (방식 === 'POST' || 방식 === 'PUT');
}
