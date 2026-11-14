import { 글카드 } from '../components/status-card.component.js';
import { 메뉴 } from '../components/menu.component.js';
import { 토스트 } from '../components/toast.component.js';
import { 글자들, 글자로고르기, 뒤로, 문구가보이나, 뜰때까지, 앱꾸러미, 앱id, type 앱, type 요소 } from './app.helper.js';

const 정확선택자 = (글: string): string => `android=new UiSelector().text(${JSON.stringify(글)})`;
const 포함선택자 = (글: string): string => `android=new UiSelector().textContains(${JSON.stringify(글)})`;

async function 보이는요소(driver: 앱, 글: string): Promise<요소 | undefined> {
  for (const 선택자 of [정확선택자(글), `~${글}`]) {
    const [요소] = await driver.$$(선택자);
    if (요소 !== undefined && (await 요소.isDisplayed())) return 요소;
  }
  return undefined;
}

export async function 정확글보이나(driver: 앱, 글: string, 시간 = 10_000): Promise<boolean> {
  return driver
    .waitUntil(async () => (await 보이는요소(driver, 글)) !== undefined, { timeout: 시간, interval: 500 })
    .then(
      () => true,
      () => false,
    );
}

export async function 정확글사라졌나(driver: 앱, 글: string, 시간 = 5_000): Promise<boolean> {
  return driver
    .waitUntil(async () => (await 보이는요소(driver, 글)) === undefined, { timeout: 시간, interval: 500 })
    .then(
      () => true,
      () => false,
    );
}

export async function 정확글누르기(driver: 앱, 글: string, 시간 = 10_000): Promise<void> {
  const 담음: { 요소?: 요소 } = {};
  await driver
    .waitUntil(
      async () => {
        담음.요소 = await 보이는요소(driver, 글);
        return 담음.요소 !== undefined;
      },
      { timeout: 시간, interval: 500 },
    )
    .catch(() => undefined);
  if (!담음.요소) throw new Error(`「${글}」를 화면에서 찾지 못했다`);
  await 담음.요소.click();
}

export async function 포함글누르기(driver: 앱, 조각: string, 시간 = 10_000): Promise<void> {
  const 요소 = await driver.$(포함선택자(조각));
  await 요소.waitForDisplayed({ timeout: 시간 });
  await 요소.click();
}

export async function 포함글수(driver: 앱, 조각: string): Promise<number> {
  return (await driver.$$(포함선택자(조각))).length;
}

export async function 포함글보이나(driver: 앱, 조각: string, 시간 = 10_000): Promise<boolean> {
  return 뜰때까지(driver, 포함선택자(조각), 시간);
}

export async function 목록글자(driver: 앱, 선택자: string, 시간 = 10_000): Promise<string[]> {
  if (!(await 뜰때까지(driver, 선택자, 시간))) return [];
  return 글자들(driver, 선택자);
}

async function 가운데높이(요소: 요소): Promise<number> {
  const 자리 = await 요소.getLocation();
  const 크기 = await 요소.getSize();
  return 자리.y + 크기.height / 2;
}

export async function 줄보이나(driver: 앱, 제목: string, 시간 = 10_000): Promise<boolean> {
  return 글자로고르기(driver, 앱id('title'), 제목, 시간).then(
    () => true,
    () => false,
  );
}

export async function 줄누르기(driver: 앱, 제목: string): Promise<void> {
  await (await 글자로고르기(driver, 앱id('title'), 제목)).click();
}

export async function 줄상태(driver: 앱, 제목: string): Promise<string> {
  const 높이 = await 가운데높이(await 글자로고르기(driver, 앱id('title'), 제목));
  const 담음: { 요소?: 요소; 거리: number } = { 거리: Number.POSITIVE_INFINITY };
  for (const 종류 of ['android.widget.Switch', 'android.widget.CheckBox']) {
    for (const 후보 of await driver.$$(종류)) {
      const 거리 = Math.abs((await 가운데높이(후보)) - 높이);
      if (거리 < 담음.거리) {
        담음.요소 = 후보;
        담음.거리 = 거리;
      }
    }
  }
  if (!담음.요소 || 담음.거리 > 200) throw new Error(`「${제목}」 줄 옆에서 스위치나 체크를 찾지 못했다`);
  return (await 담음.요소.getAttribute('checked')) ?? '';
}

export async function 줄부제(driver: 앱, 제목: string): Promise<string> {
  const 높이 = await 가운데높이(await 글자로고르기(driver, 앱id('title'), 제목));
  const 담음: { 글?: string; 거리: number } = { 거리: Number.POSITIVE_INFINITY };
  for (const 후보 of await driver.$$(앱id('subtitle'))) {
    const 거리 = (await 가운데높이(후보)) - 높이;
    if (거리 > 0 && 거리 < 담음.거리) {
      담음.글 = await 후보.getText();
      담음.거리 = 거리;
    }
  }
  if (담음.글 === undefined || 담음.거리 > 200) throw new Error(`「${제목}」 줄 아래에서 부제를 찾지 못했다`);
  return 담음.글;
}

export async function 줄활성(driver: 앱, 제목: string): Promise<string> {
  return (await (await 글자로고르기(driver, 앱id('title'), 제목)).getAttribute('enabled')) ?? '';
}

export async function 홈으로돌아가기(driver: 앱): Promise<void> {
  for (let i = 0; i < 8; i++) {
    if (await 뜰때까지(driver, 앱id('tab_home'), 2_000)) {
      await driver.$(앱id('tab_home')).click();
      return;
    }
    await 뒤로(driver);
  }
  throw new Error('뒤로 가기를 여덟 번 눌러도 하단 탭이 보이지 않았다');
}

export async function 앱데이터지우기(driver: 앱): Promise<void> {
  await driver.execute('mobile: clearApp', { appId: 앱꾸러미 });
  await driver.activateApp(앱꾸러미);
}

export async function 탭주소글(driver: 앱): Promise<string> {
  const 칸 = 'id=com.android.chrome:id/url_bar';
  if (!(await 뜰때까지(driver, 칸, 20_000))) return '';
  return driver.$(칸).getText();
}

export async function 쓰는화면(driver: 앱): Promise<string> {
  return `${await driver.getCurrentPackage()}/${await driver.getCurrentActivity()}`;
}

export async function 글쓰기닫기(driver: 앱): Promise<void> {
  await 뒤로(driver);
  const 버림 = await driver.$('id=android:id/button1');
  if (await 버림.waitForDisplayed({ timeout: 3_000 }).then(() => true, () => false)) await 버림.click();
  if (!(await 뜰때까지(driver, 앱id('fab'), 15_000))) throw new Error('글쓰기를 닫은 뒤 15초 안에 홈으로 돌아오지 않았다');
}

export async function 답글달기(driver: 앱, 원글조각: string, 답글: string): Promise<void> {
  await new 글카드(driver).누르기(원글조각, 'reply_btn');
  const 칸 = await driver.$(앱id('toot_text'));
  await 칸.waitForDisplayed({ timeout: 15_000 });
  await 칸.setValue(답글);
  await driver.$(앱id('publish')).click();
  if (!(await 뜰때까지(driver, 앱id('fab'), 30_000))) throw new Error('답글을 올린 뒤 30초 안에 홈으로 돌아오지 않았다');
}

export async function 내글수정하기(driver: 앱, 원글조각: string, 덧글: string): Promise<void> {
  await new 글카드(driver).누르기(원글조각, 'more');
  await new 메뉴(driver).고르기('수정');
  const 칸 = await driver.$(앱id('toot_text'));
  await 칸.waitForDisplayed({ timeout: 15_000 });
  await 칸.addValue(덧글);
  await driver.$(앱id('publish')).click();
  if (!(await 뜰때까지(driver, 앱id('fab'), 30_000))) throw new Error('글을 고친 뒤 30초 안에 홈으로 돌아오지 않았다');
}

export async function 문구나토스트(driver: 앱, 문구: string, 시간 = 8_000): Promise<boolean> {
  const 끝 = Date.now() + 시간;
  while (Date.now() < 끝) {
    if (await 문구가보이나(driver, 문구, 500)) return true;
    if ((await new 토스트(driver).글(500)).includes(문구)) return true;
  }
  return false;
}

export async function 포함글높이(driver: 앱, 조각: string, 시간 = 10_000): Promise<number> {
  const 요소 = await driver.$(포함선택자(조각));
  await 요소.waitForDisplayed({ timeout: 시간 });
  return (await 요소.getLocation()).y;
}

export async function 크롬이될때까지(driver: 앱, 시간 = 20_000): Promise<boolean> {
  return driver
    .waitUntil(async () => (await driver.getCurrentPackage()) === 'com.android.chrome', { timeout: 시간, interval: 500 })
    .then(
      () => true,
      () => false,
    );
}
