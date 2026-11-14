import { 확인창 } from '../components/dialog.component.js';
import { 앱id, 뜰때까지, type 앱, type 요소 } from './app.helper.js';

const 글자종류들 = ['android.widget.TextView', 'android.widget.Button'];

export async function 글자요소찾기(driver: 앱, 글자: string, 시간 = 10_000): Promise<요소 | undefined> {
  let 찾은: 요소 | undefined;
  await driver
    .waitUntil(
      async () => {
        for (const 종류 of 글자종류들) {
          for (const 요소 of await driver.$$(종류)) {
            if ((await 요소.getText()) === 글자) {
              찾은 = 요소;
              return true;
            }
          }
        }
        return false;
      },
      { timeout: 시간, interval: 500 },
    )
    .catch(() => undefined);
  return 찾은;
}

export async function 글자누르기(driver: 앱, 글자: string, 시간 = 10_000): Promise<void> {
  const 요소 = await 글자요소찾기(driver, 글자, 시간);
  if (!요소) throw new Error(`「${글자}」 글자를 화면에서 찾지 못했다`);
  await 요소.click();
}

export async function 글자있나(driver: 앱, 글자: string, 시간 = 10_000): Promise<boolean> {
  return (await 글자요소찾기(driver, 글자, 시간)) !== undefined;
}

export async function 글자사라질때까지(driver: 앱, 글자: string, 시간 = 10_000): Promise<boolean> {
  return driver
    .waitUntil(
      async () => {
        for (const 종류 of 글자종류들) {
          for (const 요소 of await driver.$$(종류)) {
            if ((await 요소.getText()) === 글자) return false;
          }
        }
        return true;
      },
      { timeout: 시간, interval: 500 },
    )
    .then(
      () => true,
      () => false,
    );
}

export async function 확인창이면누르기(driver: 앱, 시간 = 2_500): Promise<void> {
  const 창 = new 확인창(driver);
  if (await 창.떴나(시간)) await 창.확인누르기();
}

export async function 확인창이면취소하기(driver: 앱, 시간 = 2_500): Promise<void> {
  const 창 = new 확인창(driver);
  if (await 창.떴나(시간)) await 창.취소누르기();
}

export async function 키보드검색(driver: 앱): Promise<void> {
  await driver.execute('mobile: performEditorAction', { action: 'search' });
}

export function 글자수만큼(수: number): string {
  return 'a'.repeat(수);
}

export async function 칸글자수(driver: 앱, 선택자: string): Promise<number> {
  const 칸 = await driver.$(선택자);
  await 칸.waitForDisplayed({ timeout: 10_000 });
  return (await 칸.getText()).length;
}

export async function 이미지버튼들(driver: 앱, 제외설명: readonly string[]): Promise<요소[]> {
  await 뜰때까지(driver, 'android.widget.ImageButton');
  const 남은: 요소[] = [];
  for (const 버튼 of await driver.$$('android.widget.ImageButton')) {
    const 설명 = (await 버튼.getAttribute('content-desc')) ?? '';
    if (!제외설명.includes(설명)) 남은.push(버튼);
  }
  return 남은;
}

export async function 스낵바새글(driver: 앱, 이전글: string, 시간 = 10_000): Promise<string> {
  let 새글 = '';
  await driver
    .waitUntil(
      async () => {
        const 요소 = await driver.$(앱id('snackbar_text'));
        if (!(await 요소.isExisting())) return false;
        const 글 = await 요소.getText();
        if (글 !== '' && 글 !== 이전글) {
          새글 = 글;
          return true;
        }
        return false;
      },
      { timeout: 시간, interval: 300 },
    )
    .catch(() => undefined);
  return 새글;
}
