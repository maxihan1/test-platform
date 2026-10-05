import type { Locator, Page, Route } from '@playwright/test';

export class 바닥글 {
  readonly 영역: Locator;
  readonly 이용약관링크: Locator;
  readonly 개인정보링크: Locator;
  readonly 저작권문구: Locator;

  constructor(page: Page) {
    this.영역 = page.getByRole('contentinfo');
    this.이용약관링크 = this.영역.getByRole('link', { name: '이용약관', exact: true });
    this.개인정보링크 = this.영역.getByRole('link', { name: '개인정보처리방침', exact: true });
    this.저작권문구 = this.영역.getByText('© 2026 DemoMarket', { exact: true });
  }
}

export class 쿠키띠 {
  readonly 영역: Locator;
  readonly 안내문구: Locator;
  readonly 동의버튼: Locator;

  constructor(page: Page) {
    this.영역 = page.getByRole('region', { name: '쿠키 안내' });
    this.안내문구 = this.영역.getByText('서비스 개선을 위해 쿠키를 사용합니다.', { exact: true });
    this.동의버튼 = this.영역.getByRole('button', { name: '동의', exact: true });
  }
}

export class 맨위로 {
  readonly 버튼: Locator;

  constructor(private readonly page: Page) {
    this.버튼 = page.getByRole('button', { name: '맨 위로', exact: true });
  }

  async 세로위치(): Promise<number> {
    return this.page.evaluate(() => Math.round(window.scrollY));
  }

  async 한화면넘게내리기(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, window.innerHeight + 20));
    await this.버튼.waitFor();
  }

  async 멈출때까지기다리기(): Promise<number> {
    return this.page.evaluate(
      () =>
        new Promise<number>((끝) => {
          let 앞 = -1;
          let 같은횟수 = 0;
          const 재기 = () => {
            const 지금 = Math.round(window.scrollY);
            같은횟수 = 지금 === 앞 ? 같은횟수 + 1 : 0;
            앞 = 지금;
            if (같은횟수 >= 8) 끝(지금);
            else setTimeout(재기, 50);
          };
          재기();
        }),
    );
  }

  async 오른쪽아래인가(): Promise<boolean> {
    const 상자 = await this.버튼.boundingBox();
    const 창 = this.page.viewportSize();
    if (!상자 || !창) return false;
    return 상자.x + 상자.width / 2 > 창.width / 2 && 상자.y + 상자.height / 2 > 창.height / 2;
  }
}

export class 상담 {
  readonly 호스트: Locator;
  readonly 열기버튼: Locator;
  readonly 창: Locator;
  readonly 닫기X: Locator;
  readonly 입력칸: Locator;
  readonly 보내기버튼: Locator;
  readonly 기록: Locator;
  readonly 자동답변: Locator;

  constructor(page: Page) {
    this.호스트 = page.locator('dm-chat');
    this.열기버튼 = page.getByRole('button', { name: '상담하기', exact: true });
    this.창 = page.getByRole('region', { name: '상담 창' });
    this.닫기X = this.창.getByRole('button', { name: '상담 창 닫기', exact: true });
    this.입력칸 = this.창.getByLabel('상담 메시지');
    this.보내기버튼 = this.창.getByRole('button', { name: '보내기', exact: true });
    this.기록 = this.창.getByRole('log');
    this.자동답변 = this.기록.getByText('상담원 연결 중입니다. 잠시만 기다려 주세요.', { exact: true });
  }

  async 열버튼누르기(): Promise<void> {
    await this.열기버튼.click();
    await this.창.waitFor();
  }

  async 열기(): Promise<void> {
    await this.열버튼누르기();
  }

  async 메시지보내기(글: string): Promise<void> {
    await this.입력칸.fill(글);
    await this.보내기버튼.click();
  }

  async 분리된영역안에만있나(): Promise<boolean> {
    return this.호스트.evaluate(
      (호스트) =>
        호스트.shadowRoot !== null &&
        호스트.shadowRoot.querySelector('.fab') !== null &&
        호스트.shadowRoot.querySelector('.panel') !== null &&
        호스트.querySelector('.fab') === null &&
        호스트.querySelector('.panel') === null,
    );
  }

  async 버튼글자(): Promise<string> {
    return (await this.열기버튼.innerText()).trim();
  }

  async 버튼이오른쪽아래인가(): Promise<boolean> {
    const 상자 = await this.열기버튼.boundingBox();
    const 창 = this.열기버튼.page().viewportSize();
    if (!상자 || !창) return false;
    return 상자.x + 상자.width / 2 > 창.width / 2 && 상자.y + 상자.height / 2 > 창.height / 2;
  }

  async 닫기X가창오른쪽위인가(): Promise<boolean> {
    const 창상자 = await this.창.boundingBox();
    const 엑스 = await this.닫기X.boundingBox();
    if (!창상자 || !엑스) return false;
    return 엑스.x + 엑스.width / 2 > 창상자.x + 창상자.width / 2 && 엑스.y + 엑스.height / 2 < 창상자.y + 창상자.height / 2;
  }
}

export class 늦춘응답 {
  private 붙잡힌것: Route | undefined;
  private 붙잡혔다 = false;
  private 도착했다: () => void = () => undefined;
  private readonly 도착: Promise<void>;

  constructor(private readonly page: Page, private readonly 패턴: string, private readonly 지연ms?: number) {
    this.도착 = new Promise<void>((끝) => {
      this.도착했다 = 끝;
    });
  }

  async 걸기(): Promise<void> {
    await this.page.context().route(this.패턴, async (route) => {
      this.붙잡힌것 = route;
      this.붙잡혔다 = true;
      this.도착했다();
      if (this.지연ms !== undefined) {
        await new Promise<void>((끝) => setTimeout(끝, this.지연ms));
        await route.continue().catch(() => undefined);
      }
    });
  }

  async 도착기다리기(): Promise<void> {
    await this.도착;
  }

  붙잡혔나(): boolean {
    return this.붙잡혔다;
  }

  async 풀기(): Promise<void> {
    const 길 = this.붙잡힌것;
    this.붙잡힌것 = undefined;
    if (길 !== undefined && this.지연ms === undefined) await 길.continue().catch(() => undefined);
  }

  async 걷기(): Promise<void> {
    await this.풀기();
    await this.page.context().unroute(this.패턴);
  }
}

export class 화면효과 {
  constructor(private readonly page: Page) {}

  async 모달전환(): Promise<{ 속성: string; 시간: string }> {
    return this.page.locator('.modal-backdrop').evaluate((el) => {
      const 값 = getComputedStyle(el);
      return { 속성: 값.transitionProperty, 시간: 값.transitionDuration };
    });
  }

  async 토스트가아래에서올라오나(): Promise<{ 시간: string; 아래에서: boolean }> {
    return this.page.locator('#toast-box .toast').first().evaluate((el) => {
      const 값 = getComputedStyle(el);
      let 아래에서 = false;
      for (const 시트 of Array.from(document.styleSheets)) {
        for (const 규칙 of Array.from(시트.cssRules)) {
          if (규칙 instanceof CSSKeyframesRule && 규칙.name === 값.animationName) {
            const 시작 = (규칙.cssRules[0] as CSSKeyframeRule).style.transform;
            아래에서 = Number(/translateY\((-?\d+)px\)/.exec(시작)?.[1] ?? 0) > 0;
          }
        }
      }
      return { 시간: 값.animationDuration, 아래에서 };
    });
  }
}

export async function 알림종누르고읽음처리끝나길기다리기(page: Page, 알림종: Locator): Promise<void> {
  await Promise.all([page.waitForResponse((응답) => 응답.url().endsWith('/api/notifications/read')), 알림종.click()]);
  await page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
}

export function 있어야한다<T>(값: T | undefined, 이름: string): T {
  if (값 === undefined) throw new Error(`${이름}이 준비되지 않았다`);
  return 값;
}

export class 응답엿보기 {
  본문 = '';
  private 끝났다: () => void = () => undefined;
  private readonly 끝: Promise<void>;

  constructor(private readonly page: Page, private readonly 패턴: string) {
    this.끝 = new Promise<void>((끝) => {
      this.끝났다 = 끝;
    });
  }

  async 걸기(): Promise<void> {
    await this.page.context().route(this.패턴, async (route) => {
      const 응답 = await route.fetch();
      this.본문 = await 응답.text();
      await route.fulfill({ response: 응답 });
      this.끝났다();
    });
  }

  async 끝나길기다리기(): Promise<void> {
    await this.끝;
  }

  async 걷기(): Promise<void> {
    await this.page.context().unroute(this.패턴);
  }
}

export class 가짜설정응답 {
  constructor(private readonly page: Page, private readonly 덮을것: Record<string, unknown>) {}

  async 걸기(): Promise<void> {
    await this.page.context().route('**/api/settings', async (route) => {
      const 진짜 = await route.fetch();
      const 본문 = (await 진짜.json()) as Record<string, unknown>;
      await route.fulfill({ response: 진짜, json: { ...본문, ...this.덮을것 } });
    });
  }

  async 걷기(): Promise<void> {
    await this.page.context().unroute('**/api/settings');
  }
}
