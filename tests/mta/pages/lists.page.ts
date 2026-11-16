import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

export class 목록화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 이름칸 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().className("android.widget.EditText").instance(0))';
  readonly 만들기 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("만들기"))';
  readonly 완료 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("완료"))';
  readonly 편집이름칸 = 'id=org.joinmastodon.android:id/edit';
  readonly 편집더보기 = '~옵션 더보기';
  readonly 구성원추가 = 'id=org.joinmastodon.android:id/fab';
  readonly 검색칸 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.EditText"))';
  readonly 편집제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 줄옵션 = 'id=org.joinmastodon.android:id/options_btn';
  readonly 행버튼 = 'id=org.joinmastodon.android:id/button';
  readonly 만들기버튼 = '~목록 만들기';
  readonly 선택제목 = 'id=android:id/action_bar_title';
  readonly 선택삭제 = 'id=org.joinmastodon.android:id/delete';
  readonly 선택닫기 = 'id=android:id/action_mode_close_button';
  readonly 제거 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("제거"))';

  constructor(private readonly driver: AppDriver) {}

  줄메뉴항목(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/title").text(${JSON.stringify(글자)})`;
  }

  화면글(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  화면글정확히(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  켜진줄(글자: string): string {
    return `android=new UiSelector().checked(true).childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  편집줄(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  계정(아이디: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().text(${JSON.stringify(`@${아이디}`)}))`;
  }

  async 편집그려질때까지(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.편집이름칸, 시간);
  }
}
