import type { AppDriver } from '@platform/kit/app';
import { 두번누르기, 뜰때까지, 먼저뜨는것, 칸에적기 } from '@platform/kit/parts';

import { 확인창 } from '../components/dialog.component.js';
import { 뜨는메뉴 } from '../components/popup-menu.component.js';

export class 글쓰기화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 닫기 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.ImageButton"))';
  readonly 제목글 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 게시 = 'id=org.joinmastodon.android:id/publish';
  readonly 게시켜짐 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/publish").enabled(true)';
  readonly 공개범위버튼 = 'id=org.joinmastodon.android:id/btn_visibility';
  readonly 공개범위글 = 'id=org.joinmastodon.android:id/visibility_text1';
  readonly 표시이름 = 'id=org.joinmastodon.android:id/name';
  readonly 사용자명 = 'id=org.joinmastodon.android:id/username';
  readonly 아바타 = 'id=org.joinmastodon.android:id/avatar';
  readonly 본문 = 'id=org.joinmastodon.android:id/toot_text';
  readonly 경고칸 = 'id=org.joinmastodon.android:id/content_warning';
  readonly 미디어추가 = 'id=org.joinmastodon.android:id/btn_media';
  readonly 투표추가 = 'id=org.joinmastodon.android:id/btn_poll';
  readonly 에모지 = 'id=org.joinmastodon.android:id/btn_emoji';
  readonly 열람주의 = 'id=org.joinmastodon.android:id/btn_spoiler';
  readonly 언어 = 'id=org.joinmastodon.android:id/btn_language';
  readonly 남은글자수 = 'id=org.joinmastodon.android:id/char_counter';
  readonly 투표영역 = 'id=org.joinmastodon.android:id/poll_wrap';
  readonly 투표항목들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/poll_options").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/edit"))';
  readonly 투표손잡이들 = 'id=org.joinmastodon.android:id/dragger_thingy';
  readonly 투표옵션추가 = 'id=org.joinmastodon.android:id/add_poll_option';
  readonly 설문길이 = 'id=org.joinmastodon.android:id/poll_duration';
  readonly 설문길이값 = 'id=org.joinmastodon.android:id/poll_duration_value';
  readonly 스타일 = 'id=org.joinmastodon.android:id/poll_style';
  readonly 스타일값 = 'id=org.joinmastodon.android:id/poll_style_value';
  readonly 글쓰기버튼 = 'id=org.joinmastodon.android:id/fab';
  readonly 투표옵션추가이름 = '~투표 옵션 추가';
  readonly 설문길이이름 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/poll_duration").childSelector(new UiSelector().className("android.widget.TextView").instance(0))';
  readonly 스타일이름 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/poll_style").childSelector(new UiSelector().className("android.widget.TextView").instance(0))';
  readonly 실패창취소 = 'android=new UiSelector().resourceId("android:id/buttonPanel").childSelector(new UiSelector().text("취소"))';
  readonly 언어창 = 'id=android:id/customPanel';
  readonly 사진선택기표지 = { 미디어그리드: '~미디어 그리드', 사진: '~사진', 컬렉션: '~컬렉션' };
  readonly 창: 확인창;
  readonly 메뉴: 뜨는메뉴;

  constructor(private readonly driver: AppDriver) {
    this.창 = new 확인창(driver);
    this.메뉴 = new 뜨는메뉴(driver);
  }

  버튼이름(이름: string): string {
    return `~${이름}`;
  }

  async 열기(): Promise<boolean> {
    await this.driver.$(this.글쓰기버튼).click();
    return this.그려질때까지();
  }

  창단추(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/buttonPanel").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  async 사진선택기열기(시간 = 15_000): Promise<boolean> {
    await this.driver.$(this.미디어추가).click();
    return (await 먼저뜨는것(this.driver, this.사진선택기표지, 시간)) !== undefined;
  }

  async 나가기(): Promise<void> {
    await this.driver.$(this.닫기).click();
    if (await 뜰때까지(this.driver, this.창.확인버튼, 3_000)) await this.창.확인();
  }

  async 본문글(): Promise<string> {
    return this.driver.$(this.본문).getText();
  }

  async 경고글(): Promise<string> {
    return this.driver.$(this.경고칸).getText();
  }

  async 공개범위표시(): Promise<string> {
    return this.driver.$(this.공개범위글).getText();
  }

  async 열람주의열기(): Promise<boolean> {
    await this.driver.$(this.열람주의).click();
    return 뜰때까지(this.driver, this.경고칸, 10_000);
  }

  async 투표열기(): Promise<boolean> {
    await this.driver.$(this.투표추가).click();
    return 뜰때까지(this.driver, this.투표영역, 10_000);
  }

  async 투표항목글(순서: number): Promise<string> {
    return this.driver.$(this.투표항목(순서)).getText();
  }

  async 투표항목수(): Promise<number> {
    return (await this.driver.$$(this.투표항목들).getElements()).length;
  }

  async 투표칸더하기(): Promise<void> {
    await this.driver.$(this.투표옵션추가).click();
  }

  async 투표항목끌기(시작: number, 도착: number): Promise<void> {
    const 손잡이들 = await this.driver.$$(this.투표손잡이들).getElements();
    const 잡을것 = 손잡이들[시작];
    const 놓을곳 = 손잡이들[도착];
    if (잡을것 === undefined || 놓을곳 === undefined) throw new Error(`투표 손잡이가 ${String(손잡이들.length)}개뿐이라 ${String(시작)}번째에서 ${String(도착)}번째로 끌 수 없다`);
    const 자리 = await 놓을곳.getLocation();
    const 크기 = await 놓을곳.getSize();
    await this.driver.execute('mobile: dragGesture', {
      elementId: 잡을것.elementId,
      endX: Math.round(자리.x + 크기.width / 2),
      endY: Math.round(자리.y + 크기.height / 2),
      speed: 600,
    });
  }

  async 게시두번누르기(): Promise<void> {
    await 두번누르기(await this.driver.$(this.게시).getElement());
  }

  투표항목(순서: number): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/poll_options").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/edit").instance(${String(순서)}))`;
  }

  async 그려질때까지(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.본문, 시간);
  }

  async 본문적기(글: string): Promise<void> {
    await 칸에적기(await this.driver.$(this.본문).getElement(), 글);
  }

  async 경고적기(글: string): Promise<void> {
    await 칸에적기(await this.driver.$(this.경고칸).getElement(), 글);
  }

  async 투표항목적기(순서: number, 글: string): Promise<void> {
    await 칸에적기(await this.driver.$(this.투표항목(순서)).getElement(), 글);
  }

  async 남은글자(): Promise<string> {
    return this.driver.$(this.남은글자수).getText();
  }

  async 게시켜졌나(): Promise<boolean> {
    return (await this.driver.$(this.게시).getAttribute('enabled')) === 'true';
  }

  async 꺼졌나(선택자: string): Promise<boolean> {
    return (await this.driver.$(선택자).getAttribute('enabled')) === 'false';
  }
}
