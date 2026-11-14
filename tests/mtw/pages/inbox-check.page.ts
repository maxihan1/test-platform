import type { Locator, Page } from '@playwright/test';

export class 수신함확인화면 {
  static readonly 주소 = '/auth/setup';

  readonly 제목: Locator;
  readonly 안내: Locator;
  readonly 못받음펼침: Locator;
  readonly 다시보내기: Locator;
  readonly 보냄안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '수신함 확인하기' });
    this.안내 = page.getByRole('paragraph').filter({ hasText: '로 보낸 링크를 클릭해 마스토돈을 시작하세요.' });
    this.못받음펼침 = page.getByText('링크를 못 받으셨나요?', { exact: true });
    this.다시보내기 = page.getByRole('button', { name: /^확인 링크 다시 보내기/ });
    this.보냄안내 = page.getByText('확인 링크가 담긴 이메일이 몇 분 안에 도착할것입니다!');
  }

  async 시계를달고다시열기(): Promise<void> {
    await this.page.clock.install();
    await this.page.goto(수신함확인화면.주소);
    await this.제목.waitFor();
  }

  async 펼치기(): Promise<void> {
    await this.못받음펼침.click();
    await this.다시보내기.waitFor();
  }

  async 대기시간넘기기(): Promise<void> {
    await this.page.clock.runFor(35_000);
  }

  async 다시보내기누르기(): Promise<void> {
    await this.다시보내기.click();
  }
}
