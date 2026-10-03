import type { Locator, Page } from '@playwright/test';

export class 상품상세화면 {
  constructor(private readonly page: Page) {}

  async 열기(상품번호: number): Promise<void> {
    await this.page.goto(`/shop/${상품번호}`);
  }

  상품명(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  큰이미지버튼(): Locator {
    return this.page.getByRole('button', { name: '크게 보기', exact: true });
  }

  큰이미지(): Locator {
    return this.큰이미지버튼().getByRole('img');
  }

  썸네일버튼들(): Locator {
    return this.page.getByRole('button', { name: /^이미지 \d$/ });
  }

  썸네일버튼(번호: number): Locator {
    return this.page.getByRole('button', { name: `이미지 ${번호}`, exact: true });
  }

  현재썸네일(번호: number): Locator {
    return this.썸네일버튼(번호).and(this.page.locator('[aria-current="true"]'));
  }

  async 큰이미지주소(): Promise<string | null> {
    return this.큰이미지().getAttribute('src');
  }

  async 썸네일이미지주소(번호: number): Promise<string | null> {
    return this.썸네일버튼(번호).locator('img').getAttribute('src');
  }

  옵션선택(이름: string): Locator {
    return this.page.getByLabel(이름, { exact: true });
  }

  수량칸(): Locator {
    return this.page.getByLabel('수량', { exact: true });
  }

  수량줄이기버튼(): Locator {
    return this.page.getByRole('button', { name: '수량 줄이기', exact: true });
  }

  수량늘리기버튼(): Locator {
    return this.page.getByRole('button', { name: '수량 늘리기', exact: true });
  }

  눌리지않는늘리기버튼(): Locator {
    return this.page.getByRole('button', { name: '수량 늘리기', exact: true, disabled: true });
  }

  총상품금액(): Locator {
    return this.page.getByText(/^총 상품 금액/);
  }

  총상품금액이(금액글자: string): Locator {
    return this.총상품금액().filter({ hasText: 금액글자 });
  }

  주문서제목(): Locator {
    return this.page.getByRole('heading', { name: '주문서', exact: true });
  }

  장바구니담기버튼(): Locator {
    return this.page.getByRole('button', { name: '장바구니 담기', exact: true });
  }

  바로구매버튼(): Locator {
    return this.page.getByRole('button', { name: '바로 구매', exact: true });
  }

  품절버튼(): Locator {
    return this.page.getByRole('button', { name: '품절', exact: true });
  }

  눌리지않는품절버튼(): Locator {
    return this.page.getByRole('button', { name: '품절', exact: true, disabled: true });
  }

  탭들(): Locator {
    return this.page.getByRole('tablist', { name: '상품 정보', exact: true }).getByRole('tab');
  }

  탭(이름: string | RegExp): Locator {
    return this.탭들().filter({ hasText: 이름 });
  }

  선택된탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true, selected: true });
  }

  탭내용(): Locator {
    return this.page.getByRole('tabpanel');
  }

  질문버튼(질문: string): Locator {
    return this.탭내용().getByRole('button', { name: 질문, exact: true });
  }

  펼쳐진질문버튼(질문: string): Locator {
    return this.탭내용().getByRole('button', { name: 질문, exact: true, expanded: true });
  }

  접힌질문버튼(질문: string): Locator {
    return this.탭내용().getByRole('button', { name: 질문, exact: true, expanded: false });
  }

  질문버튼들(): Locator {
    return this.탭내용().getByRole('button');
  }

  펼쳐진질문버튼들(): Locator {
    return this.탭내용().getByRole('button', { expanded: true });
  }

  답변(답변글: string): Locator {
    return this.탭내용().getByText(답변글, { exact: true });
  }

  async 위아래로놓여있는가(위: Locator, 아래: Locator): Promise<boolean> {
    const 위상자 = await 위.boundingBox();
    const 아래상자 = await 아래.boundingBox();
    return 위상자 !== null && 아래상자 !== null && 위상자.y + 위상자.height <= 아래상자.y;
  }

  async 좌우로놓여있는가(왼쪽: Locator, 오른쪽: Locator): Promise<boolean> {
    const 왼쪽상자 = await 왼쪽.boundingBox();
    const 오른쪽상자 = await 오른쪽.boundingBox();
    return 왼쪽상자 !== null && 오른쪽상자 !== null && 왼쪽상자.x + 왼쪽상자.width <= 오른쪽상자.x;
  }

  async 수량최대까지늘리기(최대: number): Promise<void> {
    for (let 번 = 1; 번 < 최대; 번 += 1) await this.수량늘리기버튼().click();
  }

  리뷰실패문구(): Locator {
    return this.탭내용().getByText('리뷰를 불러오지 못했습니다', { exact: true });
  }

  다시시도버튼(): Locator {
    return this.탭내용().getByRole('button', { name: '다시 시도', exact: true });
  }

  리뷰글들(): Locator {
    return this.탭내용().getByRole('article');
  }
}
