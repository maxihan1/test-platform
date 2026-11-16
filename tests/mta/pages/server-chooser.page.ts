import type { AppDriver } from '@platform/kit/app';
import { 글자들, 뜰때까지, 될때까지, 보이나, 칸에적기, 포커스칸에치기 } from '@platform/kit/parts';

function 글쇠(글자: string): { keycode: number; metastate?: number } | undefined {
  const 작은 = 글자.toLowerCase();
  if (작은 >= 'a' && 작은 <= 'z') {
    const keycode = 29 + 작은.charCodeAt(0) - 'a'.charCodeAt(0);
    return 글자 === 작은 ? { keycode } : { keycode, metastate: 1 };
  }
  if (글자 >= '0' && 글자 <= '9') return { keycode: 7 + 글자.charCodeAt(0) - '0'.charCodeAt(0) };
  const 따로: Record<string, number> = { '.': 56, ' ': 62, '/': 76, '-': 69 };
  return 따로[글자] === undefined ? undefined : { keycode: 따로[글자] };
}

export class 서버고르기화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 입력칸 = 'id=org.joinmastodon.android:id/search_edit';
  readonly 필터영역 = 'id=org.joinmastodon.android:id/filters_scroll';
  readonly 초대링크사용 = 'id=org.joinmastodon.android:id/btn_use_invite';
  readonly 다음 = 'id=org.joinmastodon.android:id/btn_next';
  readonly 다음켜짐 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/btn_next").enabled(true)';
  readonly 필터칩들 = 'android=new UiSelector().className("android.widget.TextView").clickable(true)';
  readonly 카드제목들 = 'id=org.joinmastodon.android:id/title';
  readonly 첫카드제목칸 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title").instance(0))';

  constructor(private readonly driver: AppDriver) {}

  카드(서버: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title").text(${JSON.stringify(서버)}))`;
  }

  화면글(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  async 그려질때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.입력칸, 시간);
  }

  async 적기(글: string): Promise<void> {
    await 뜰때까지(this.driver, this.첫카드제목칸, 15_000);
    const 칸 = await this.driver.$(this.입력칸).getElement();
    const 끝 = 글.slice(-1);
    const 키 = 글쇠(끝);
    if (키 === undefined) {
      await 칸에적기(칸, 글);
      return;
    }
    await 칸.click();
    await 칸에적기(칸, 글.slice(0, -1));
    await this.driver.execute('mobile: pressKey', 키);
  }

  async 글보이나(글자: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.화면글(글자), 시간);
  }

  async 입력칸글(): Promise<string> {
    return this.driver.$(this.입력칸).getText();
  }

  async 첫카드제목(): Promise<string> {
    if (!(await 보이나(this.driver, this.첫카드제목칸))) return '';
    return this.driver.$(this.첫카드제목칸).getText();
  }

  async 첫카드가바뀔때까지(앞: string, 시간 = 20_000): Promise<boolean> {
    return 될때까지(
      this.driver,
      async () => {
        const 글 = await this.첫카드제목();
        return 글 !== '' && 글 !== 앞;
      },
      시간,
    );
  }

  async 카드제목읽기(): Promise<string[]> {
    return 글자들(this.driver, this.카드제목들);
  }

  async 카드누르기(서버: string, 시간 = 20_000): Promise<void> {
    if (!(await 뜰때까지(this.driver, this.카드(서버), 시간))) throw new Error(`서버 카드 「${서버}」가 ${String(시간)}ms 안에 안 보인다`);
    await this.driver.$(this.카드(서버)).click();
  }

  async 다음켜질때까지(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.다음켜짐, 시간);
  }

  async 다음누르기(): Promise<void> {
    await this.driver.$(this.다음).click();
  }

  async 다음켜졌나(): Promise<boolean> {
    return (await this.driver.$(this.다음).getAttribute('enabled')) === 'true';
  }

  async 초대링크사용누르기(): Promise<void> {
    await this.driver.$(this.초대링크사용).click();
  }

  async 초대링크적기(글: string): Promise<void> {
    await 포커스칸에치기(this.driver, 글);
  }

  async 칩글자모으기(): Promise<string[]> {
    const 모음 = new Set<string>();
    for (let 번 = 0; 번 < 4; 번 += 1) {
      const 앞 = 모음.size;
      for (const 글 of await 글자들(this.driver, this.필터칩들)) 모음.add(글);
      if (번 > 0 && 모음.size === 앞) break;
      const 영역 = await this.driver.$(this.필터영역).getElement();
      await this.driver.execute('mobile: scrollGesture', { elementId: 영역.elementId, direction: 'right', percent: 0.8 });
    }
    return [...모음];
  }
}
