import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 뜰때까지, 사라질때까지 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 모든요소, 앱id } from '../helpers/app.helper.js';
import { 파일선택기줄 } from '../helpers/system-ui.helper.js';

export class 글쓰기첨부 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 첨부줄 = 앱id('attachments');
  static readonly 썸네일들 = 앱id('thumb');
  static readonly 조각글칸들 = 앱id('title');

  static 조각글(글자: string, 차례 = 0): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/title").text(${JSON.stringify(글자)}).instance(${String(차례)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 첨부있나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기첨부.첨부줄, 시간);
  }

  async 첨부사라질때까지(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 글쓰기첨부.첨부줄, 시간);
  }

  async 첨부개수(): Promise<number> {
    return (await 모든요소(this.driver, 글쓰기첨부.썸네일들)).length;
  }

  async 첨부가될때까지(개수: number, 시간 = 20_000): Promise<boolean> {
    return 될때까지(this.driver, async () => (await this.첨부개수()) === 개수, 시간);
  }

  async 조각글들(): Promise<string[]> {
    return 모든글자(this.driver, 글쓰기첨부.조각글칸들);
  }

  async 조각글있나(글자: string, 차례 = 0, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기첨부.조각글(글자, 차례), 시간);
  }

  async 파일선택기에파일있나(이름: string, 시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 파일선택기줄(이름), 시간);
  }

  async 파일선택기닫기(이름: string): Promise<boolean> {
    await this.driver.back();
    return 사라질때까지(this.driver, 파일선택기줄(이름), 5_000);
  }

  async 대체텍스트추가누르기(차례 = 0): Promise<void> {
    if (!(await this.조각글있나('대체 텍스트 추가', 차례, 15_000))) throw new Error(`미디어 조각 ${String(차례 + 1)}번의 「대체 텍스트 추가」가 안 보인다`);
    await this.driver.$(글쓰기첨부.조각글('대체 텍스트 추가', 차례)).click();
  }

  static 조각안(id: string, 차례 = 0): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/attachments").childSelector(new UiSelector().resourceId("${꾸러미}:id/${id}").instance(${String(차례)}))`;
  }

  async 조각삭제있나(차례 = 0, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기첨부.조각안('delete', 차례), 시간);
  }

  async 조각편집누르기(차례 = 0): Promise<void> {
    if (!(await 뜰때까지(this.driver, 글쓰기첨부.조각안('edit', 차례), 15_000))) throw new Error(`미디어 조각 ${String(차례 + 1)}번의 편집 버튼이 안 보인다`);
    await this.driver.$(글쓰기첨부.조각안('edit', 차례)).click();
  }

  async 업로드진행있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, `android=new UiSelector().resourceId("${꾸러미}:id/attachments").childSelector(new UiSelector().className("android.widget.ProgressBar"))`, 시간);
  }

  async 재시도있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, `android=new UiSelector().resourceId("${꾸러미}:id/attachments").childSelector(new UiSelector().descriptionContains("재시도"))`, 시간);
  }
}
