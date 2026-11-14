import { 글카드 } from '../components/status-card.component.js';
import { 메뉴 } from '../components/menu.component.js';
import { 확인창 } from '../components/dialog.component.js';
import { 공개범위시트 } from '../pages/visibility-sheet.page.js';
import { 글자로고르기, 길게누르기, 문구가보이나, 문구식, 보이나, 뒤로, 뜰때까지, 아래로당기기, 앱id, 앱꾸러미, 위로밀기, type 앱, type 요소 } from './app.helper.js';
import { 글쓰기열기, 내글지우기, type 공개범위 } from './post.helper.js';

export async function 개수(driver: 앱, 선택자: string): Promise<number> {
  let 수 = 0;
  for (const _ of await driver.$$(선택자)) 수 += 1;
  return 수;
}

export async function 누르기(driver: 앱, 선택자: string, 시간 = 10_000): Promise<void> {
  const 요소 = await driver.$(선택자);
  await 요소.waitForDisplayed({ timeout: 시간 });
  await 요소.click();
}

export async function 글읽기(driver: 앱, 선택자: string, 시간 = 10_000): Promise<string> {
  const 요소 = await driver.$(선택자);
  const 떴다 = await 요소.waitForDisplayed({ timeout: 시간 }).then(
    () => true,
    () => false,
  );
  return 떴다 ? 요소.getText() : '';
}

export async function 속성이될때까지(driver: 앱, 선택자: string, 속성: string, 기대: string, 시간 = 10_000): Promise<boolean> {
  return driver
    .waitUntil(async () => (await driver.$(선택자).getAttribute(속성)) === 기대, { timeout: 시간, interval: 500 })
    .then(
      () => true,
      () => false,
    );
}

export async function 글이될때까지(driver: 앱, 선택자: string, 기대: string, 시간 = 10_000): Promise<boolean> {
  return driver
    .waitUntil(async () => (await driver.$(선택자).getText()) === 기대, { timeout: 시간, interval: 500 })
    .then(
      () => true,
      () => false,
    );
}

function 정규(글자: string): string {
  return 글자.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function 속성읽기(driver: 앱, 선택자: string, 속성: string, 시간 = 10_000): Promise<string> {
  const 요소 = await driver.$(선택자);
  const 떴다 = await 요소.waitForDisplayed({ timeout: 시간 }).then(
    () => true,
    () => false,
  );
  return 떴다 ? ((await 요소.getAttribute(속성)) ?? '') : '';
}

export async function 문구중하나가보이나(driver: 앱, 문구들: readonly string[], 시간 = 10_000): Promise<boolean> {
  const 식들 = 문구들.map((문구) => 문구식(문구));
  return driver
    .waitUntil(
      async () => {
        const 화면 = await driver.getPageSource();
        return 식들.some((식) => 식.test(화면));
      },
      { timeout: 시간, interval: 500 },
    )
    .then(
      () => true,
      () => false,
    );
}

export async function 글자요소가보이나(driver: 앱, 글자: string, 시간 = 10_000): Promise<boolean> {
  const 식 = new RegExp(` text="${정규(글자)}"`);
  return driver
    .waitUntil(async () => 식.test(await driver.getPageSource()), { timeout: 시간, interval: 500 })
    .then(
      () => true,
      () => false,
    );
}

export async function 글자요소(driver: 앱, 글자: string, 시간 = 15_000): Promise<요소> {
  const 바로 = `android=new UiSelector().text(${JSON.stringify(글자)})`;
  const 밀며 = `android=new UiScrollable(new UiSelector().scrollable(true).instance(0)).scrollIntoView(new UiSelector().text(${JSON.stringify(글자)}))`;
  const 바로떴다 = await driver
    .$(바로)
    .waitForDisplayed({ timeout: 3_000 })
    .then(
      () => true,
      () => false,
    );
  if (!바로떴다) await driver.$(밀며).waitForDisplayed({ timeout: 시간 });
  const [찾은] = await driver.$$(바로떴다 ? 바로 : 밀며);
  if (!찾은) throw new Error(`「${글자}」 요소를 찾지 못했다`);
  return 찾은;
}

export async function 마지막글자요소누르기(driver: 앱, 글자: string, 시간 = 10_000): Promise<void> {
  const 선택자 = `android=new UiSelector().text(${JSON.stringify(글자)})`;
  await driver.$(선택자).waitForDisplayed({ timeout: 시간 });
  let 마지막: 요소 | undefined;
  for (const 요소 of await driver.$$(선택자)) 마지막 = 요소;
  if (!마지막) throw new Error(`「${글자}」 요소를 찾지 못했다`);
  await 마지막.click();
}

export async function 글자요소누르기(driver: 앱, 글자: string): Promise<void> {
  await (await 글자요소(driver, 글자)).click();
}

export async function 글자요소찾기(driver: 앱, 글자: string, 쪽수 = 6): Promise<boolean> {
  if (await 글자요소가보이나(driver, 글자, 1_500)) return true;
  for (let i = 0; i < 쪽수; i++) {
    await 위로밀기(driver);
    if (await 글자요소가보이나(driver, 글자, 1_500)) return true;
  }
  for (let i = 0; i < 쪽수 * 2; i++) {
    await 아래로당기기(driver);
    if (await 글자요소가보이나(driver, 글자, 1_500)) return true;
  }
  return false;
}

export async function 문구찾기(driver: 앱, 문구: string, 쪽수 = 6): Promise<boolean> {
  if (await 문구가보이나(driver, 문구, 1_500)) return true;
  for (let i = 0; i < 쪽수; i++) {
    await 위로밀기(driver);
    if (await 문구가보이나(driver, 문구, 1_500)) return true;
  }
  for (let i = 0; i < 쪽수 * 2; i++) {
    await 아래로당기기(driver);
    if (await 문구가보이나(driver, 문구, 1_500)) return true;
  }
  return false;
}

export async function 문구가사라질때까지(driver: 앱, 문구: string, 시간 = 10_000): Promise<boolean> {
  const 식 = 문구식(문구);
  return driver
    .waitUntil(async () => !식.test(await driver.getPageSource()), { timeout: 시간, interval: 500 })
    .then(
      () => true,
      () => false,
    );
}

export function 메뉴에있나(항목들: readonly string[], 문구: string): boolean {
  const 식 = new RegExp(`^${문구식(문구).source}$`);
  return 항목들.some((항목) => 식.test(항목));
}

export function 시간꼴인가(글들: readonly string[]): boolean {
  const 식 = /^(방금|\d+초 전|\d+분 전|\d+시간 전|\d+일 전)$/;
  return 글들.length > 0 && 글들.every((글) => 식.test(글.split(' · ')[0] ?? ''));
}

export async function 탭줄로돌아오기(driver: 앱): Promise<void> {
  for (let i = 0; i < 5; i++) {
    if (await 보이나(driver, 앱id('tab_profile'))) return;
    await 뒤로(driver);
    const 창 = new 확인창(driver);
    if (await 창.떴나(1_500)) {
      if ((await 글읽기(driver, 창.확인, 1_000)) === 'Publish post') await 창.취소누르기();
      else await 창.확인누르기();
    }
  }
  throw new Error('하단 탭이 있는 화면으로 5번 안에 돌아오지 못했다');
}

export async function 글쓰기버리고나오기(driver: 앱): Promise<void> {
  await 누르기(driver, '~뒤로 가기');
  const 창 = new 확인창(driver);
  if (await 창.떴나(2_500)) await 창.확인누르기();
}

export async function 뒤로가기로확인창띄우기(driver: 앱): Promise<boolean> {
  const 창 = new 확인창(driver);
  for (let i = 0; i < 3; i++) {
    await 뒤로(driver);
    if (await 창.떴나(2_500)) return true;
  }
  return false;
}

export async function 뒤로가기로닫기(driver: 앱): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    await 뒤로(driver);
    if (await 뜰때까지(driver, 앱id('fab'), 2_500)) return true;
  }
  return false;
}

export async function 범위글올리기(driver: 앱, 본문: string, 범위: 공개범위): Promise<void> {
  const 시트 = new 공개범위시트(driver);
  await 글쓰기열기(driver);
  await driver.$(앱id('toot_text')).setValue(본문);
  await 누르기(driver, 앱id('btn_visibility'));
  await 시트.공개범위열기();
  await 시트.고르기(범위);
  await 시트.저장누르기();
  await 누르기(driver, 앱id('publish'));
  if (!(await 뜰때까지(driver, 앱id('fab'), 30_000))) throw new Error('글을 올린 뒤 30초 안에 홈으로 돌아오지 않았다');
}

export async function 내글남김없이지우기(driver: 앱, 본문: string): Promise<void> {
  await 탭줄로돌아오기(driver);
  for (let i = 0; i < 3; i++) {
    await driver.$(앱id('tab_profile')).click();
    await driver.$(앱id('profile_action_btn')).waitForDisplayed({ timeout: 20_000 });
    if (!(await 문구가보이나(driver, 본문, 4_000))) return;
    await 내글지우기(driver, 본문);
  }
}

export async function 더보기항목들(driver: 앱, 본문조각: string): Promise<string[]> {
  await new 글카드(driver).누르기(본문조각, 'more');
  const 항목들 = await new 메뉴(driver).항목글자();
  await 뒤로(driver);
  return 항목들;
}

export async function 더보기에서항목찾기(driver: 앱, 문구: string, 누를까: boolean, 쪽수 = 4): Promise<boolean> {
  const 식 = new RegExp(`^${문구식(문구).source}$`);
  for (let 쪽 = 0; 쪽 <= 쪽수; 쪽++) {
    const 수 = await 개수(driver, 앱id('more'));
    for (let i = 0; i < 수; i++) {
      const 버튼 = (await driver.$$(앱id('more')))[i];
      if (!버튼) break;
      await 버튼.click();
      const 항목들 = await new 메뉴(driver).항목글자().catch(() => [] as string[]);
      const 찾은 = 항목들.find((항목) => 식.test(항목));
      if (찾은 !== undefined && 누를까) {
        await new 메뉴(driver).고르기(찾은);
        return true;
      }
      await 뒤로(driver);
      if (찾은 !== undefined) return true;
    }
    await 위로밀기(driver);
  }
  return false;
}

export async function 부스트시트에서문구찾기(driver: 앱, 문구들: readonly string[], 쪽수 = 3): Promise<boolean> {
  for (let 쪽 = 0; 쪽 <= 쪽수; 쪽++) {
    const 수 = await 개수(driver, 앱id('boost_btn'));
    for (let i = 0; i < 수; i++) {
      const 버튼 = (await driver.$$(앱id('boost_btn')))[i];
      if (!버튼) break;
      if ((await 버튼.getAttribute('enabled')) !== 'true') continue;
      await 버튼.click();
      if (await 문구중하나가보이나(driver, 문구들, 3_000)) return true;
      await 뒤로(driver);
    }
    await 위로밀기(driver);
  }
  return false;
}

export async function 인용누르고확인창찾기(driver: 앱, 문구: string, 쪽수 = 3): Promise<boolean> {
  for (let 쪽 = 0; 쪽 <= 쪽수; 쪽++) {
    const 수 = await 개수(driver, 앱id('boost_btn'));
    for (let i = 0; i < 수; i++) {
      const 버튼 = (await driver.$$(앱id('boost_btn')))[i];
      if (!버튼) break;
      if ((await 버튼.getAttribute('enabled')) !== 'true') continue;
      await 버튼.click();
      const 항목 = await 글자로고르기(driver, 앱id('title'), '인용하기', 3_000).catch(() => undefined);
      if (!항목) {
        await 뒤로(driver);
        continue;
      }
      await 항목.click();
      if (await 문구가보이나(driver, 문구, 3_000)) return true;
      await 탭줄로돌아오기(driver).catch(() => undefined);
    }
    await 위로밀기(driver);
  }
  return false;
}

export async function 좋아요수가될때까지(driver: 앱, 본문조각: string, 기대: readonly string[], 시간 = 10_000): Promise<boolean> {
  const 카드 = new 글카드(driver);
  return driver
    .waitUntil(
      async () => {
        const 버튼 = await 카드.아래버튼(본문조각, 'favorite_btn');
        const 글 = await 버튼.$(앱id('favorite')).getText();
        return 기대.includes(글.trim());
      },
      { timeout: 시간, interval: 500 },
    )
    .then(
      () => true,
      () => false,
    );
}

export async function 모두읽음표시하기(driver: 앱): Promise<void> {
  await driver.$(앱id('tab_notifications')).click();
  await 누르기(driver, '~모두 읽은 상태로 표시');
}

export async function 알림멘션탭열기(driver: 앱): Promise<void> {
  await driver.$(앱id('tab_notifications')).click();
  await 누르기(driver, 앱id('mentions_tab'));
}

export async function 설정줄열기(driver: 앱, 경로: readonly string[]): Promise<void> {
  await 홈탭으로(driver);
  await 누르기(driver, '~설정');
  for (const 제목 of 경로) await (await 글자로고르기(driver, 앱id('title'), 제목)).click();
}

export async function 설정스위치(driver: 앱, 제목: string): Promise<요소> {
  const 줄 = await 글자로고르기(driver, 앱id('title'), 제목);
  const 위치 = await 줄.getLocation();
  const 크기 = await 줄.getSize();
  const 가운데 = 위치.y + 크기.height / 2;
  for (const 후보 of await driver.$$('android.widget.Switch')) {
    const 후보위치 = await 후보.getLocation();
    const 후보크기 = await 후보.getSize();
    if (Math.abs(후보위치.y + 후보크기.height / 2 - 가운데) < 90) return 후보;
  }
  throw new Error(`「${제목}」 줄 옆 스위치를 찾지 못했다`);
}

export async function 설정스위치바꾸기(driver: 앱, 제목: string, 켬: boolean): Promise<void> {
  const 스위치 = await 설정스위치(driver, 제목);
  if ((await 스위치.getAttribute('checked')) === String(켬)) return;
  await 스위치.click();
}

export async function 설정에서나오기(driver: 앱): Promise<void> {
  await 탭줄로돌아오기(driver);
}

export async function 게시범위기본값바꾸기(driver: 앱, 범위: 공개범위): Promise<void> {
  await 설정줄열기(driver, ['@qa_user1@mastodon.maxihan.com', '게시 기본값', '게시 범위']);
  await 마지막글자요소누르기(driver, 범위);
  await 설정에서나오기(driver);
}

export async function 앱밖으로나갔나(driver: 앱, 시간 = 10_000): Promise<boolean> {
  return driver
    .waitUntil(async () => (await driver.getCurrentPackage()) !== 앱꾸러미, { timeout: 시간, interval: 500 })
    .then(
      () => true,
      () => false,
    );
}

export async function 사진첨부하기(driver: 앱, 파일이름: string): Promise<void> {
  await 누르기(driver, 앱id('btn_media'));
  await 글자요소누르기(driver, 파일이름);
}

export async function 빠르게두번누르기(driver: 앱, 선택자: string): Promise<void> {
  const 요소 = await driver.$(선택자);
  await 요소.waitForDisplayed({ timeout: 10_000 });
  await 요소.click();
  await 요소.click().catch(() => undefined);
}

export async function 손잡이끌어지우기(driver: 앱, 선택자: string, 번호: number): Promise<void> {
  const 손잡이 = (await driver.$$(선택자))[번호 - 1];
  if (!손잡이) throw new Error(`투표 손잡이 ${번호}번이 없다`);
  const 크기 = await driver.getWindowSize();
  await driver.execute('mobile: dragGesture', { elementId: 손잡이.elementId, endX: 크기.width - 1, endY: 크기.height / 2 });
}

export async function 본문조각글수(driver: 앱, 본문: string): Promise<number> {
  const 글들 = await driver.$$(앱id('text'));
  let 수 = 0;
  for (const 요소 of 글들) if ((await 요소.getText()).includes(본문)) 수 += 1;
  return 수;
}

export async function 프로필화면떴나(driver: 앱, 시간 = 20_000): Promise<boolean> {
  return 뜰때까지(driver, 앱id('profile_action_btn'), 시간);
}

export async function 프로필버튼누르기(driver: 앱): Promise<void> {
  await 누르기(driver, 앱id('profile_action_btn'), 20_000);
}

export async function 계정전환시트열기(driver: 앱): Promise<void> {
  await 길게누르기(driver, 앱id('tab_profile'));
}

export async function 계정전환시트떴나(driver: 앱, 시간 = 10_000): Promise<boolean> {
  return 뜰때까지(driver, 앱id('title'), 시간);
}

export async function 홈탭으로(driver: 앱): Promise<void> {
  await 탭줄로돌아오기(driver);
  await driver.$(앱id('tab_home')).click();
}

export async function 파일선택기열렸나(driver: 앱, 시간 = 10_000): Promise<boolean> {
  return driver
    .waitUntil(async () => (await driver.getCurrentPackage()).includes('documentsui'), { timeout: 시간, interval: 500 })
    .then(
      () => true,
      () => false,
    );
}

export async function 손잡이끌어순서바꾸기(driver: 앱, 선택자: string): Promise<void> {
  const [첫, 둘] = await driver.$$(선택자);
  if (!첫 || !둘) throw new Error('투표 손잡이가 둘 이상 있어야 한다');
  const 위치 = await 둘.getLocation();
  const 크기 = await 둘.getSize();
  await driver.execute('mobile: dragGesture', { elementId: 첫.elementId, endX: 위치.x + 크기.width / 2, endY: 위치.y + 크기.height / 2 + 60 });
}
