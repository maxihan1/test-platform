import type { Locator, Page } from '@playwright/test';

export class 상품상세화면 {
  readonly 상품명: Locator;
  readonly 큰이미지: Locator;
  readonly 큰이미지그림: Locator;
  readonly 썸네일들: Locator;
  readonly 확대보기: Locator;
  readonly 확대위치: Locator;
  readonly 확대닫기: Locator;
  readonly 확대다음: Locator;
  readonly 보고있어요: Locator;
  readonly 색상상자: Locator;
  readonly 사이즈상자: Locator;
  readonly 수량줄이기: Locator;
  readonly 수량칸: Locator;
  readonly 수량늘리기: Locator;
  readonly 총상품금액: Locator;
  readonly 장바구니담기버튼: Locator;
  readonly 바로구매버튼: Locator;
  readonly 품절버튼: Locator;
  readonly 탭들: Locator;
  readonly 상품문의탭: Locator;
  readonly 리뷰탭: Locator;
  readonly 탭패널: Locator;
  readonly 리뷰목록: Locator;
  readonly 리뷰실패문구: Locator;
  readonly 다시시도버튼: Locator;
  readonly 리뷰불러오는중: Locator;

  constructor(private readonly page: Page) {
    this.상품명 = page.getByRole('heading', { level: 1 });
    this.큰이미지 = page.getByRole('button', { name: '크게 보기', exact: true });
    this.큰이미지그림 = this.큰이미지.getByRole('img');
    this.썸네일들 = page.getByRole('button', { name: /^이미지 \d$/ });
    this.확대보기 = page.getByRole('dialog', { name: '이미지 확대 보기' });
    this.확대위치 = this.확대보기.getByText(/^\d \/ \d$/);
    this.확대닫기 = this.확대보기.getByRole('button', { name: '닫기', exact: true });
    this.확대다음 = this.확대보기.getByRole('button', { name: '다음 이미지', exact: true });
    this.보고있어요 = page.getByText(/명이 보고 있어요$/);
    this.색상상자 = page.getByRole('combobox', { name: '색상', exact: true });
    this.사이즈상자 = page.getByRole('combobox', { name: '사이즈', exact: true });
    this.수량줄이기 = page.getByRole('button', { name: '수량 줄이기', exact: true });
    this.수량칸 = page.getByRole('spinbutton', { name: '수량', exact: true });
    this.수량늘리기 = page.getByRole('button', { name: '수량 늘리기', exact: true });
    this.총상품금액 = page.getByText('총 상품 금액').locator('strong');
    this.장바구니담기버튼 = page.getByRole('button', { name: '장바구니 담기', exact: true });
    this.바로구매버튼 = page.getByRole('button', { name: '바로 구매', exact: true });
    this.품절버튼 = page.getByRole('button', { name: '품절', exact: true });
    this.탭들 = page.getByRole('tab');
    this.상품문의탭 = page.getByRole('tab', { name: '상품 문의', exact: true });
    this.리뷰탭 = page.getByRole('tab', { name: /^리뷰/ });
    this.탭패널 = page.getByRole('tabpanel');
    this.리뷰목록 = this.탭패널.getByRole('article');
    this.리뷰실패문구 = page.getByText('리뷰를 불러오지 못했습니다', { exact: true });
    this.다시시도버튼 = page.getByRole('button', { name: '다시 시도', exact: true });
    this.리뷰불러오는중 = page.getByText('리뷰를 불러오는 중…', { exact: true });
  }

  async 열기(상품번호: number): Promise<void> {
    await this.page.goto(`/shop/${상품번호}`);
    await this.상품명.waitFor();
  }

  썸네일(번호: number): Locator {
    return this.page.getByRole('button', { name: `이미지 ${번호}`, exact: true });
  }

  async 큰이미지주소(): Promise<string> {
    return (await this.큰이미지그림.getAttribute('src')) ?? '';
  }

  async 갤러리모양(): Promise<string> {
    const 큰것 = await this.큰이미지.boundingBox();
    const 작은것 = await this.썸네일들.evaluateAll((칸들) => 칸들.map((칸) =>칸.getBoundingClientRect().top));
    const 장수 = await this.큰이미지.count();
    const 아래 = 큰것 !== null && 작은것.every((위) => 위 >= 큰것.y + 큰것.height - 1);
    return `큰 이미지 ${장수}장 · 썸네일 ${작은것.length}장 · 썸네일은 큰 이미지 ${아래 ? '아래' : '옆'}`;
  }

  async 확대보기가화면전체를덮나(): Promise<boolean> {
    const 틀 = this.page.viewportSize();
    const 상자 = await this.확대보기.boundingBox();
    if (!틀 || !상자) return false;
    return 상자.x <= 0 && 상자.y <= 0 && 상자.width >= 틀.width && 상자.height >= 틀.height;
  }

  async 확대위치가위쪽에있나(): Promise<boolean> {
    const 틀 = this.page.viewportSize();
    const 상자 = await this.확대위치.boundingBox();
    if (!틀 || !상자) return false;
    return 상자.y < 틀.height / 4;
  }

  async 확대보기닫힘기다리기(): Promise<void> {
    await this.확대보기.waitFor({ state: 'detached' });
  }

  async 옵션고르기(): Promise<void> {
    await this.색상상자.selectOption({ index: 1 });
    await this.사이즈상자.selectOption({ index: 1 });
  }

  async 수량적기(수: number): Promise<void> {
    await this.수량칸.fill(String(수));
  }

  async 수량늘리기를(번: number): Promise<void> {
    for (let i = 0; i < 번; i += 1) await this.수량늘리기.click();
  }

  async 수량과늘리기상태(): Promise<string> {
    const 수 = await this.수량칸.inputValue();
    const 꺼짐 = await this.수량늘리기.isDisabled();
    return `수량 ${수} · 「+」 ${꺼짐 ? '눌리지 않음' : '눌림'}`;
  }

  async 장바구니담기누르고응답기다리기(): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => new URL(r.url()).pathname === '/api/cart' && r.request().method() === 'POST');
    await this.장바구니담기버튼.click();
    await 응답;
  }

  async 장바구니담기누르고장바구니갱신기다리기(): Promise<void> {
    const 갱신 = this.page.waitForResponse((r) => new URL(r.url()).pathname === '/api/cart' && r.request().method() === 'GET');
    await this.장바구니담기버튼.click();
    await 갱신;
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => setTimeout(끝, 50))));
  }

  async 품절버튼상태(): Promise<string> {
    const 보임 = await this.품절버튼.isVisible();
    const 꺼짐 = 보임 && (await this.품절버튼.isDisabled());
    return `「품절」 버튼 ${보임 ? '보임' : '안 보임'} · ${꺼짐 ? '눌리지 않음' : '눌림'}`;
  }

  async 본숫자(): Promise<number | null> {
    const 글 = await this.보고있어요.innerText();
    const 수 = /^(\d+)명이/.exec(글)?.[1];
    return 수 === undefined ? null : Number(수);
  }

  async 보고있어요가상품명아래에있나(): Promise<boolean> {
    const 이름 = await this.상품명.boundingBox();
    const 글 = await this.보고있어요.boundingBox();
    if (!이름 || !글) return false;
    return 글.y >= 이름.y + 이름.height - 1;
  }

  문의질문(문구: string): Locator {
    return this.page.getByRole('button', { name: 문구, exact: true });
  }

  문의답변(문구: string): Locator {
    return this.page.getByText(문구, { exact: true });
  }

  async 질문이열렸고답변이아래에있나(질문: string, 답변: string): Promise<boolean> {
    const 열림 = (await this.문의질문(질문).getAttribute('aria-expanded')) === 'true';
    const 위 = await this.문의질문(질문).boundingBox();
    const 아래 = await this.문의답변(답변).boundingBox();
    if (!위 || !아래) return false;
    return 열림 && 아래.y >= 위.y + 위.height - 1;
  }

  async 다시시도로리뷰불러오기(): Promise<void> {
    for (let 번 = 0; 번 < 5; 번 += 1) {
      await this.다시시도버튼.click();
      await this.리뷰불러오는중.waitFor({ state: 'detached' });
      if (!(await this.다시시도버튼.isVisible())) return;
    }
    throw new Error('「다시 시도」를 다섯 번 눌러도 리뷰가 불러와지지 않았다');
  }
}
