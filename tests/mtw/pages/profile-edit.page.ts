import type { Locator, Page } from '@playwright/test';

export class 프로필편집화면 {
  static readonly 주소 = '/profile/edit';

  readonly 제목: Locator;
  readonly 이름버튼: Locator;
  readonly 소개버튼: Locator;
  readonly 필드추가: Locator;
  readonly 해시태그추가: Locator;
  readonly 이미지추가: Locator;
  readonly 창: Locator;
  readonly 창저장: Locator;
  readonly 창취소: Locator;
  readonly 이름칸: Locator;
  readonly 소개칸: Locator;
  readonly 라벨칸: Locator;
  readonly 내용칸: Locator;
  readonly 파일칸: Locator;
  readonly 다음: Locator;
  readonly 글자수초과: Locator;
  readonly 오류알림: Locator;
  readonly 필드편집버튼: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '프로필 편집', level: 1 });
    this.이름버튼 = page.getByRole('main').getByRole('button', { name: /^표시되는 이름 (추가|수정|편집)$/ });
    this.소개버튼 = page.getByRole('main').getByRole('button', { name: /^자기소개 (추가|수정|편집)$/ });
    this.필드추가 = page.getByRole('main').getByRole('button', { name: '필드 추가' });
    this.해시태그추가 = page.getByRole('main').getByRole('button', { name: '해시태그 추가' });
    this.이미지추가 = page.getByRole('main').getByRole('button', { name: '이미지 추가' });
    this.창 = page.getByRole('dialog');
    this.창저장 = this.창.getByRole('button', { name: '저장' });
    this.창취소 = this.창.getByRole('button', { name: '취소' });
    this.이름칸 = this.창.getByRole('textbox', { name: /^표시되는 이름/ });
    this.소개칸 = this.창.getByRole('textbox', { name: /^자기소개/ });
    this.라벨칸 = this.창.getByRole('textbox', { name: '라벨' });
    this.내용칸 = this.창.getByRole('textbox', { name: '내용' });
    this.파일칸 = this.창.locator('input[type="file"]');
    this.다음 = this.창.getByRole('button', { name: '다음' });
    this.글자수초과 = page.getByText('추천하는 글자수 제한을 초과했습니다.');
    this.오류알림 = page.getByRole('status');
    this.필드편집버튼 = page.getByRole('main').getByRole('button', { name: '필드 편집' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(프로필편집화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.이름버튼.waitFor();
  }

  async 이름창열기(): Promise<void> {
    await this.이름버튼.click();
    await this.이름칸.waitFor();
  }

  async 소개창열기(): Promise<void> {
    await this.소개버튼.click();
    await this.소개칸.waitFor();
  }

  async 필드창열기(): Promise<void> {
    await this.필드추가.click();
    await this.라벨칸.waitFor();
  }

  async 사진창열기(): Promise<void> {
    await this.이미지추가.nth(1).click();
    await this.창.getByRole('heading', { name: '프로필 사진 추가' }).waitFor();
  }

  async 창닫기(): Promise<void> {
    await this.창취소.or(this.창.getByRole('button', { name: '닫기' })).first().click();
    await this.창.first().waitFor({ state: 'detached' });
  }

  async 창있으면닫기(): Promise<void> {
    if ((await this.창.count()) > 0) await this.창닫기();
  }

  async 라벨넣기(글: string): Promise<void> {
    await this.라벨칸.fill(글);
    await this.라벨칸.blur();
  }

  필드카운터(글자수: number): Locator {
    return this.창.getByText(`${String(글자수)}/40 권장 글자`);
  }

  async 창저장누르기(): Promise<number | null> {
    if (!(await this.창저장.isEnabled())) return null;
    const 응답 = this.page.waitForResponse((r) => r.request().method() !== 'GET' && r.url().includes('/api/'), { timeout: 10_000 });
    await this.창저장.click();
    return (await 응답.then((r) => r, () => null))?.status() ?? null;
  }
}
