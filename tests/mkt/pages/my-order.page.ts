import type { Locator, Page } from '@playwright/test';

export class 주문상세화면 {
  static readonly 주소 = '/my/orders/{주문번호}';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 불러오는중: Locator;
  readonly 주문번호값: Locator;
  readonly 상태배지: Locator;
  readonly 취소사유행: Locator;
  readonly 상품목록제목: Locator;
  readonly 배송정보제목: Locator;
  readonly 결제정보제목: Locator;
  readonly 주문취소버튼: Locator;
  readonly 없는주문안내: Locator;
  readonly 권한없음안내: Locator;

  constructor(page: Page) {
    this.page = page;
    const 상세 = page.locator('#detail');
    this.제목 = page.getByRole('heading', { name: '주문 상세', level: 1 });
    this.불러오는중 = 상세.locator('.skeleton');
    this.주문번호값 = 상세.locator('dt:text-is("주문번호") + dd');
    this.상태배지 = 상세.locator('.status');
    this.취소사유행 = 상세.locator('dt:text-is("취소 사유")');
    this.상품목록제목 = 상세.getByRole('heading', { name: '주문 상품' });
    this.배송정보제목 = 상세.getByRole('heading', { name: '배송 정보' });
    this.결제정보제목 = 상세.getByRole('heading', { name: '결제 정보' });
    this.주문취소버튼 = 상세.getByRole('button', { name: '주문 취소' });
    this.없는주문안내 = 상세.getByRole('heading', { name: '주문을 찾을 수 없습니다' });
    this.권한없음안내 = 상세.getByRole('heading', { name: '권한이 없습니다' });
  }

  async 열기(주문번호: string): Promise<void> {
    await this.page.goto(`/my/orders/${encodeURIComponent(주문번호)}`);
    await this.불러오는중.waitFor({ state: 'detached' });
  }

  취소창사유선택(창: Locator): Locator {
    return 창.getByLabel('취소 사유', { exact: true });
  }

  취소창사유목록(창: Locator): Locator {
    return this.취소창사유선택(창).getByRole('option');
  }

  취소창사유입력칸(창: Locator): Locator {
    return 창.getByLabel('사유 입력', { exact: true });
  }

  취소창오류문구(창: Locator): Locator {
    return 창.getByRole('alert');
  }
}
