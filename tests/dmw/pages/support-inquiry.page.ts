import type { Locator, Page } from '@playwright/test';

export class 문의화면 {
  static readonly 주소 = '/support/inquiry';

  readonly 큰제목: Locator;
  readonly 유형: Locator;
  readonly 제목칸: Locator;
  readonly 내용칸: Locator;
  readonly 글자수: Locator;
  readonly 첨부칸: Locator;
  readonly 이메일알림: Locator;
  readonly 등록버튼: Locator;
  readonly 내역제목: Locator;
  readonly 내역표: Locator;
  readonly 내역없음: Locator;
  readonly 내역줄들: Locator;
  readonly 내역제목들: Locator;
  readonly 내역상태들: Locator;

  constructor(private readonly page: Page) {
    this.큰제목 = page.getByRole('heading', { level: 1, name: '1:1 문의' });
    this.유형 = page.getByLabel('유형');
    this.제목칸 = page.getByLabel('제목');
    this.내용칸 = page.getByLabel('내용');
    this.글자수 = page.getByText(/^\d+\/1000$/);
    this.첨부칸 = page.getByLabel('첨부 파일 (1개, 10MB 이하)', { exact: true });
    this.이메일알림 = page.getByRole('checkbox', { name: '답변 알림 이메일 받기' });
    this.등록버튼 = page.getByRole('button', { name: '등록', exact: true });
    this.내역제목 = page.getByRole('heading', { level: 2, name: '내 문의 내역' });
    this.내역표 = page.getByRole('table');
    this.내역없음 = page.getByText('문의 내역이 없습니다', { exact: true });
    this.내역줄들 = this.내역표.getByRole('row').filter({ has: page.locator('td:nth-child(5)') });
    this.내역제목들 = this.내역줄들.locator('td:nth-child(2)');
    this.내역상태들 = this.내역줄들.locator('td:nth-child(4)');
  }

  async 열기(): Promise<void> {
    await this.page.goto(문의화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.내역표.or(this.내역없음).waitFor();
  }

  async 채우기(문의: { 유형?: string; 제목?: string; 내용?: string }): Promise<void> {
    if (문의.유형 !== undefined) await this.유형.selectOption(문의.유형);
    if (문의.제목 !== undefined) await this.제목칸.fill(문의.제목);
    if (문의.내용 !== undefined) await this.내용칸.fill(문의.내용);
  }

  async 등록누르고_응답기다리기(): Promise<number> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/inquiries') && r.request().method() === 'POST');
    await this.등록버튼.click();
    return (await 응답).status();
  }

  async 첨부파일이름(): Promise<string> {
    return this.첨부칸.evaluate((칸) => (칸 as HTMLInputElement).files?.[0]?.name ?? '');
  }

  async 첨부파일수(): Promise<number> {
    return this.첨부칸.evaluate((칸) => (칸 as HTMLInputElement).files?.length ?? 0);
  }

  async 첨부하기(이름: string, 바이트수: number): Promise<void> {
    await this.첨부칸.evaluate((칸, [파일이름, 크기]) => {
      const 모음 = new DataTransfer();
      모음.items.add(new File([new Uint8Array(크기 as number)], 파일이름 as string, { type: 'application/octet-stream' }));
      (칸 as HTMLInputElement).files = 모음.files;
      칸.dispatchEvent(new Event('change', { bubbles: true }));
    }, [이름, 바이트수] as const);
  }
}
