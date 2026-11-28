import type { AppDriver } from '@platform/kit/app';
import { 길게누르기, 될때까지, 보이나, 요소안에서밀기 } from '@platform/kit/parts';

import { 모든글자, 모든요소, 앱id } from '../helpers/app.helper.js';

export type 카드버튼 = '답장' | '부스트' | '좋아요' | '공유';

const 버튼id: Record<카드버튼, string> = { 답장: 'reply_btn', 부스트: 'boost_btn', 좋아요: 'favorite_btn', 공유: 'share_btn' };

export class 글카드 {
  static readonly 목록 = 앱id('list');
  static readonly 더보기id = 'more';
  static readonly 아바타id = 'clickable_thing';

  static 본문(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/text").textContains(${JSON.stringify(글자)}))`;
  }

  static 몇째(id: string, 차례: number): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/${id}").instance(${String(차례)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 보이나(글자: string): Promise<boolean> {
    return 보이나(this.driver, 글카드.본문(글자));
  }

  async 찾을때까지내리기(글자: string, 번 = 15, 목록 = 글카드.목록): Promise<boolean> {
    for (let i = 0; i <= 번; i++) {
      if (await 될때까지(this.driver, () => this.보이나(글자), i === 0 ? 3_000 : 1_500)) return true;
      if (i < 번) await 요소안에서밀기(this.driver, 목록, '위');
    }
    return false;
  }

  async 본문y(글자: string): Promise<number> {
    if (!(await this.보이나(글자))) throw new Error(`「${글자}」 글 카드가 화면에 없다`);
    return (await this.driver.$(글카드.본문(글자)).getLocation()).y;
  }

  private async 차례찾기(id: string, 글자: string, 쪽: '아래' | '위'): Promise<number> {
    const 기준 = await this.본문y(글자);
    const 요소들 = await 모든요소(this.driver, 앱id(id));
    let 고른 = -1;
    for (let i = 0; i < 요소들.length; i++) {
      const y = (await 요소들[i]!.getLocation()).y;
      if (쪽 === '아래' && y > 기준) return i;
      if (쪽 === '위' && y < 기준) 고른 = i;
    }
    if (고른 < 0) throw new Error(`「${글자}」 글 카드의 ${id} 를 못 찾았다`);
    return 고른;
  }

  async 버튼주소(글자: string, 버튼: 카드버튼): Promise<string> {
    return 글카드.몇째(버튼id[버튼], await this.차례찾기(버튼id[버튼], 글자, '아래'));
  }

  async 버튼누르기(글자: string, 버튼: 카드버튼): Promise<void> {
    await this.driver.$(await this.버튼주소(글자, 버튼)).click();
  }

  async 버튼길게누르기(글자: string, 버튼: 카드버튼): Promise<void> {
    await 길게누르기(this.driver, await this.버튼주소(글자, 버튼));
  }

  async 버튼켜져있나(글자: string, 버튼: 카드버튼): Promise<boolean> {
    return (await this.driver.$(await this.버튼주소(글자, 버튼)).getAttribute('enabled')) === 'true';
  }

  async 버튼골라져있나(글자: string, 버튼: 카드버튼): Promise<boolean> {
    return (await this.driver.$(await this.버튼주소(글자, 버튼)).getAttribute('selected')) === 'true';
  }

  async 더보기주소(글자: string): Promise<string> {
    return 글카드.몇째(글카드.더보기id, await this.차례찾기(글카드.더보기id, 글자, '위'));
  }

  async 더보기누르기(글자: string): Promise<void> {
    await this.driver.$(await this.더보기주소(글자)).click();
  }

  async 아바타누르기(글자: string): Promise<void> {
    await this.driver.$(글카드.몇째(글카드.아바타id, await this.차례찾기(글카드.아바타id, 글자, '위'))).click();
  }

  async 본문누르기(글자: string): Promise<void> {
    await this.driver.$(글카드.본문(글자)).click();
  }

  async 머리글(글자: string, id: 'name' | 'time_and_username'): Promise<string> {
    return this.driver.$(글카드.몇째(id, await this.차례찾기(id, 글자, '위'))).getText();
  }

  private async 머리y(글자: string): Promise<number> {
    const 차례 = await this.차례찾기(글카드.아바타id, 글자, '위');
    return (await this.driver.$(글카드.몇째(글카드.아바타id, 차례)).getLocation()).y;
  }

  private async 카드안차례들(id: string, 글자: string): Promise<number[]> {
    const 위 = await this.본문y(글자);
    const 아래 = (await this.driver.$(글카드.몇째('reply_btn', await this.차례찾기('reply_btn', 글자, '아래'))).getLocation()).y;
    const 요소들 = await 모든요소(this.driver, 앱id(id));
    const 차례들: number[] = [];
    for (let i = 0; i < 요소들.length; i++) {
      const y = (await 요소들[i]!.getLocation()).y;
      if (y > 위 && y < 아래) 차례들.push(i);
    }
    return 차례들;
  }

  async 카드안글들(글자: string, id: string): Promise<string[]> {
    const 글: string[] = [];
    for (const 차례 of await this.카드안차례들(id, 글자)) 글.push(await this.driver.$(글카드.몇째(id, 차례)).getText());
    return 글;
  }

  async 위줄글(글자: string): Promise<string> {
    const 머리 = await this.머리y(글자);
    for (const 요소 of await 모든요소(this.driver, 앱id('text'))) {
      const 간격 = 머리 - (await 요소.getLocation()).y;
      if (간격 > 0 && 간격 < 100) return 요소.getText();
    }
    return '';
  }

  async 핀배지글(글자: string): Promise<string> {
    const 머리 = await this.머리y(글자);
    const 본문 = await this.본문y(글자);
    for (const 요소 of await 모든요소(this.driver, 앱id('badge'))) {
      const y = (await 요소.getLocation()).y;
      if (y >= 머리 - 30 && y < 본문) return 요소.getText();
    }
    return '';
  }

  async 본문왼쪽끝누르기(글자: string): Promise<void> {
    const 요소 = await this.driver.$(글카드.본문(글자)).getElement();
    const 폭 = (await 요소.getSize()).width;
    await 요소.click({ x: 20 - Math.round(폭 / 2), y: 0 });
  }

  async 경고문글들(): Promise<string[]> {
    return 모든글자(this.driver, 앱id('spoiler_title'));
  }

  private async 경고차례(경고문: string): Promise<number> {
    const 제목들 = await 모든요소(this.driver, 앱id('spoiler_title'));
    for (let i = 0; i < 제목들.length; i++) {
      if ((await 제목들[i]!.getText()).includes(경고문)) return i;
    }
    throw new Error(`경고문에 「${경고문}」이 든 글 카드가 화면에 없다`);
  }

  async 경고동작글(경고문: string): Promise<string> {
    return this.driver.$(글카드.몇째('spoiler_action', await this.경고차례(경고문))).getText();
  }

  async 경고동작누르기(경고문: string): Promise<void> {
    await this.driver.$(글카드.몇째('spoiler_action', await this.경고차례(경고문))).click();
  }

  async 경고문찾을때까지내리기(경고문: string, 번 = 8): Promise<boolean> {
    for (let i = 0; i <= 번; i++) {
      if (await 될때까지(this.driver, async () => (await 모든글자(this.driver, 앱id('spoiler_title'))).some((글) => 글.includes(경고문)), 3_000)) return true;
      if (i < 번) await 요소안에서밀기(this.driver, 글카드.목록, '위');
    }
    return false;
  }

  async 투표줄글들(글자: string): Promise<string[]> {
    return this.카드안글들(글자, 'text');
  }

  async 투표퍼센트글들(글자: string): Promise<string[]> {
    return this.카드안글들(글자, 'percent');
  }

  async 투표항목누르기(글자: string, 항목: string): Promise<void> {
    for (const 차례 of await this.카드안차례들('text', 글자)) {
      const 요소 = this.driver.$(글카드.몇째('text', 차례));
      if ((await 요소.getText()) === 항목) {
        await 요소.click();
        return;
      }
    }
    throw new Error(`「${글자}」 투표 카드에 항목 「${항목}」이 없다`);
  }

  private async 투표버튼주소(글자: string, id: 'vote_btn' | 'show_results_btn'): Promise<string> {
    const 차례들 = await this.카드안차례들(id, 글자);
    if (차례들[0] === undefined) throw new Error(`「${글자}」 투표 카드에 ${id} 가 없다`);
    return 글카드.몇째(id, 차례들[0]);
  }

  async 투표버튼켜졌나(글자: string): Promise<boolean> {
    return (await this.driver.$(await this.투표버튼주소(글자, 'vote_btn')).getAttribute('enabled')) === 'true';
  }

  async 투표버튼누르기(글자: string): Promise<void> {
    await this.driver.$(await this.투표버튼주소(글자, 'vote_btn')).click();
  }

  async 결과버튼글(글자: string): Promise<string> {
    return this.driver.$(await this.투표버튼주소(글자, 'show_results_btn')).getText();
  }

  async 결과버튼누르기(글자: string): Promise<void> {
    await this.driver.$(await this.투표버튼주소(글자, 'show_results_btn')).click();
  }

  async 링크카드글들(글자: string, 부분: 'domain' | 'title' | 'description'): Promise<string[]> {
    return this.카드안글들(글자, 부분);
  }

  async 링크카드그림있나(글자: string): Promise<boolean> {
    return (await this.카드안차례들('photo', 글자)).length > 0;
  }

  async 링크카드누르기(글자: string): Promise<void> {
    const 차례들 = await this.카드안차례들('inner', 글자);
    if (차례들[0] === undefined) throw new Error(`「${글자}」 글 카드에 링크 카드가 없다`);
    await this.driver.$(글카드.몇째('inner', 차례들[0])).click();
  }

  async 사진설명들(글자: string): Promise<string[]> {
    const 설명: string[] = [];
    for (const 차례 of await this.카드안차례들('photo', 글자)) 설명.push((await this.driver.$(글카드.몇째('photo', 차례)).getAttribute('content-desc')) ?? '');
    return 설명;
  }

  async 사진누르기(글자: string, 번 = 0): Promise<void> {
    const 차례 = (await this.카드안차례들('photo', 글자))[번];
    if (차례 === undefined) throw new Error(`「${글자}」 글 카드에 ${String(번 + 1)}번째 사진이 없다`);
    await this.driver.$(글카드.몇째('photo', 차례)).click();
  }

  async 화면사진설명들(): Promise<string[]> {
    const 설명: string[] = [];
    for (const 요소 of await 모든요소(this.driver, 앱id('photo'))) 설명.push((await 요소.getAttribute('content-desc')) ?? '');
    return 설명;
  }

  async 화면사진누르기(번 = 0): Promise<void> {
    await this.driver.$(글카드.몇째('photo', 번)).click();
  }

  async 푸터숫자(글자: string, 버튼: '답장' | '부스트' | '좋아요'): Promise<string> {
    const id = { 답장: 'reply', 부스트: 'boost', 좋아요: 'favorite' }[버튼];
    return this.driver.$(글카드.몇째(id, await this.차례찾기(id, 글자, '아래'))).getText();
  }

  async 푸터버튼글들(글자: string): Promise<string[]> {
    const 글: string[] = [];
    for (const 버튼 of ['답장', '부스트', '좋아요', '공유'] as const) 글.push(await this.driver.$(await this.버튼주소(글자, 버튼)).getText());
    return 글;
  }
}
