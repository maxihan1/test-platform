import { 기다림, 글들, 누름틀, 밀어서찾기, 보이는가, 켜졌나, 한번밀기, type 앱 } from '../helpers/app.helper.js';

const 칩이름: Record<string, string> = {
  전체: 'category_all',
  패션: 'category_fashion',
  전자기기: 'category_digital',
  도서: 'category_book',
  식품: 'category_food',
};

export class 상품목록화면 {
  static readonly 주소 = 'app:.MainActivity/product_list';

  constructor(private readonly driver: 앱) {}

  get 장바구니버튼() {
    return this.driver.$('~cart_button');
  }

  get 장바구니버튼글() {
    return this.driver.$(`${누름틀('cart_button')}//android.widget.TextView`);
  }

  get 주문내역버튼() {
    return this.driver.$('~orders_button');
  }

  get 주문내역버튼글() {
    return this.driver.$(`${누름틀('orders_button')}//android.widget.TextView`);
  }

  get 로그아웃버튼() {
    return this.driver.$('~logout_button');
  }

  get 로그아웃버튼글() {
    return this.driver.$(`${누름틀('logout_button')}//android.widget.TextView`);
  }

  get 총개수() {
    return this.driver.$('~product_total');
  }

  get 목록() {
    return this.driver.$('~product_list');
  }

  get 불러오는표시() {
    return this.driver.$('~loading');
  }

  get 첫카드() {
    return this.driver.$('~product_item');
  }

  칩(이름: string) {
    return this.driver.$(`~${칩이름[이름]}`);
  }

  칩글(이름: string) {
    return this.driver.$(`${누름틀(칩이름[이름])}//android.widget.TextView`);
  }

  카드선택자(상품명: string): string {
    return `//android.view.View[@resource-id="product_item"][.//android.widget.TextView[@resource-id="product_name" and @text="${상품명}"]]`;
  }

  async 열릴때까지(시간 = 기다림 * 2): Promise<boolean> {
    return this.첫카드.waitForDisplayed({ timeout: 시간 }).then(() => true, () => false);
  }

  async 보이는가(): Promise<boolean> {
    return this.장바구니버튼.isDisplayed().catch(() => false);
  }

  async 칩누르기(이름: string): Promise<void> {
    await this.칩(이름).click();
  }

  async 칩골라졌나(이름: string): Promise<boolean> {
    return 켜졌나(this.driver, 누름틀(칩이름[이름]));
  }

  async 총개수바뀔때까지(글: string, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.총개수.getText().catch(() => '')) === 글, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 보이는상품명(): Promise<string[]> {
    return 글들(this.driver, '~product_name');
  }

  async 카드찾기(상품명: string): Promise<boolean> {
    return 밀어서찾기(this.driver, this.카드선택자(상품명));
  }

  async 카드글들(상품명: string): Promise<string[]> {
    return 글들(this.driver, `${this.카드선택자(상품명)}//android.widget.TextView`);
  }

  async 상품열기(상품명: string): Promise<void> {
    if (!(await this.카드찾기(상품명))) throw new Error(`상품 목록에서 「${상품명}」 카드를 찾지 못했다`);
    await this.driver.$(this.카드선택자(상품명)).click();
  }

  async 첫카드누르기(): Promise<void> {
    await this.첫카드.click();
  }

  async 끝까지모으기(최대 = 15): Promise<string[]> {
    const 모음: string[] = [];
    let 그대로 = 0;
    for (let i = 0; i < 최대 && 그대로 < 2; i += 1) {
      const 앞 = 모음.length;
      for (const 이름 of await this.보이는상품명()) if (!모음.includes(이름)) 모음.push(이름);
      그대로 = 모음.length === 앞 ? 그대로 + 1 : 0;
      await 한번밀기(this.driver);
    }
    return 모음;
  }

  async 불러오는표시보이나(): Promise<boolean> {
    return 보이는가(this.driver, '~loading');
  }

  async 분류칩글들(): Promise<string[]> {
    const 글: string[] = [];
    for (const 이름 of Object.keys(칩이름)) {
      글.push(await this.칩글(이름).getText().catch(() => ''));
    }
    return 글;
  }

  async 골라진칩들(): Promise<string[]> {
    const 골라진: string[] = [];
    for (const 이름 of Object.keys(칩이름)) {
      if (await this.칩골라졌나(이름).catch(() => false)) 골라진.push(이름);
    }
    return 골라진;
  }

  async 칩이가로로놓였나(): Promise<boolean> {
    const 자리: { x: number; y: number; 높이: number }[] = [];
    for (const 이름 of Object.keys(칩이름)) {
      const 위치 = await this.칩(이름).getLocation().catch(() => undefined);
      const 크기 = await this.칩(이름).getSize().catch(() => undefined);
      if (위치 === undefined || 크기 === undefined) return false;
      자리.push({ x: 위치.x, y: 위치.y, 높이: 크기.height });
    }
    return 자리.every((칸, 차례) => Math.abs(칸.y - 자리[0].y) < 자리[0].높이 / 2 && (차례 === 0 || 칸.x > 자리[차례 - 1].x));
  }

  async 총개수가칩아래인가(): Promise<boolean> {
    const 총 = await this.총개수.getLocation().catch(() => undefined);
    const 칩 = await this.칩('전체').getLocation().catch(() => undefined);
    const 칩크기 = await this.칩('전체').getSize().catch(() => undefined);
    if (총 === undefined || 칩 === undefined || 칩크기 === undefined) return false;
    return 총.y >= 칩.y + 칩크기.height;
  }

  async 칩골라질때까지(이름: string, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => this.칩골라졌나(이름).catch(() => false), { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 장바구니글바뀔때까지(글: string, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.장바구니버튼글.getText().catch(() => '')) === 글, { timeout: 시간 })
      .then(() => true, () => false);
  }
}
