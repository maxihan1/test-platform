// Android 앱 케이스가 서비스마다 다시 짜던 기본 동작 — 기다리기 · 지금 화면 가르기 · 적기 · 권한 창 · 토스트 (도메인/러너 §5.2 「앱 공용 부품」)
// dma · mta 도우미에서 서비스와 상관없는 것만 옮겼다. 앱 고유의 주소(id) · 화면 흐름은 여전히 서비스 폴더의 도우미가 맡는다

import type { AppDriver } from './app.js';

export type 앱요소 = WebdriverIO.Element;
export type 권한답 = '허용' | '거부';

const 권한단추: Record<권한답, string[]> = {
  // 위치 · 카메라는 「앱 사용 중에만 허용」이 허용 자리에 온다
  허용: ['id=com.android.permissioncontroller:id/permission_allow_button', 'id=com.android.permissioncontroller:id/permission_allow_foreground_only_button'],
  거부: ['id=com.android.permissioncontroller:id/permission_deny_button'],
};
/** UiAutomator2 가 명령마다 화면이 멈추기를 기다리는 기본 시간 */
const 멈춤기본 = 10_000;

const 참거짓 = (기다림: Promise<unknown>): Promise<boolean> =>
  기다림.then(
    () => true,
    () => false,
  );

/** 조건이 참이 될 때까지 기다리고 됐는지를 돌려준다 — 던지지 않으니 결과는 케이스가 verify 로 판정한다 */
export function 될때까지(driver: AppDriver, 조건: () => Promise<boolean>, 시간 = 10_000): Promise<boolean> {
  return 참거짓(driver.waitUntil(조건, { timeout: 시간, interval: 300 }));
}

export function 뜰때까지(driver: AppDriver, 선택자: string, 시간 = 10_000): Promise<boolean> {
  return 참거짓(driver.$(선택자).waitForDisplayed({ timeout: 시간 }));
}

export function 사라질때까지(driver: AppDriver, 선택자: string, 시간 = 10_000): Promise<boolean> {
  return 참거짓(driver.$(선택자).waitForDisplayed({ timeout: 시간, reverse: true }));
}

/** 기다리지 않고 지금 보이는지만 본다 — 없는 요소에 isDisplayed 를 물으면 던지는 판이 있어 있는지부터 본다 */
export async function 보이나(driver: AppDriver, 선택자: string): Promise<boolean> {
  const 요소 = driver.$(선택자);
  return (await 요소.isExisting()) && (await 요소.isDisplayed());
}

/**
 * 후보 가운데 먼저 보이는 것의 이름 — 시간 안에 아무것도 안 뜨면 undefined.
 * 시작할 때 화면이 정해져 있지 않은 케이스(데이터 남기고 시작 · E2E 이어 돌기)가 「로그인 화면인가 홈인가」를 가를 때 쓴다
 */
export async function 먼저뜨는것<이름 extends string>(driver: AppDriver, 후보: Record<이름, string>, 시간 = 30_000): Promise<이름 | undefined> {
  let 찾은: 이름 | undefined;
  await 될때까지(
    driver,
    async () => {
      for (const 이름 of Object.keys(후보) as 이름[]) {
        if (await 보이나(driver, 후보[이름])) {
          찾은 = 이름;
          return true;
        }
      }
      return false;
    },
    시간,
  );
  return 찾은;
}

export async function 글자들(driver: AppDriver, 선택자: string): Promise<string[]> {
  const 글: string[] = [];
  for (const 요소 of await driver.$$(선택자).getElements()) 글.push(await 요소.getText());
  return 글;
}

/** 굴려야 보이는 요소 — 굴릴 수 있는 첫 목록을 그 글자가 보일 때까지 굴린다. 화면 밖 요소는 찾기부터 실패한다 */
export async function 스크롤해서찾기(driver: AppDriver, 글자: string, 시간 = 15_000): Promise<앱요소> {
  const 선택자 = `android=new UiScrollable(new UiSelector().scrollable(true).instance(0)).scrollIntoView(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  if (!(await 뜰때까지(driver, 선택자, 시간))) throw new Error(`「${글자}」가 든 요소를 굴려도 찾지 못했다`);
  return driver.$(선택자).getElement();
}

/** 칸을 비우고 적는다 — setValue 만 쓰면 남은 글 뒤에 붙고, 빈 글을 setValue 하면 키보드만 뜬다 */
export async function 칸에적기(칸: 앱요소, 값: string): Promise<void> {
  await 칸.clearValue();
  if (값 !== '') await 칸.setValue(값);
}

/** 키보드의 완료 · 이동 단추 — 키보드를 뒤로 가기로 내리면 화면이 닫히는 앱이 있다 */
export async function 키보드완료(driver: AppDriver): Promise<void> {
  await driver.execute('mobile: performEditorAction', { action: 'done' });
}

/** 연타 — 둘 다 실패했을 때만 던진다. 첫 누르기에 화면이 넘어가 둘째가 실패하는 것은 정상이다 */
export async function 두번누르기(칸: 앱요소): Promise<void> {
  const 결과 = await Promise.allSettled([칸.click(), 칸.click()]);
  const 실패 = 결과.filter((하나): 하나 is PromiseRejectedResult => 하나.status === 'rejected');
  if (실패.length === 결과.length) throw 실패[0]?.reason;
}

export async function 길게누르기(driver: AppDriver, 선택자: string, 누르는시간 = 1200): Promise<void> {
  const 요소 = await driver.$(선택자).getElement();
  await 요소.waitForDisplayed({ timeout: 10_000 });
  await driver.execute('mobile: longClickGesture', { elementId: 요소.elementId, duration: 누르는시간 });
}

/** 데이터는 두고 앱만 껐다 켠다 */
export async function 앱다시켜기(driver: AppDriver, 꾸러미: string): Promise<void> {
  await driver.terminateApp(꾸러미);
  await driver.activateApp(꾸러미);
}

/**
 * 권한 창이 시간 안에 뜨면 답하고 true, 안 뜨면 false — 데이터를 남긴 연결은 이미 답한 권한 창이 다시 안 뜬다.
 * 안 뜬 것을 실패로 볼지는 부른 쪽이 정한다
 */
export async function 권한창답하기(driver: AppDriver, 답: 권한답, 시간 = 5_000): Promise<boolean> {
  const 뜬것 = await 먼저뜨는것(driver, Object.fromEntries(권한단추[답].map((선택자) => [선택자, 선택자])), 시간);
  if (뜬것 === undefined) return false;
  await driver.$(뜬것).click();
  return true;
}

/**
 * 토스트 글 — 뜰 때까지 되풀이해 읽고 시간 안에 못 읽으면 빈 글. 토스트는 읽는 사이에 사라져 요소가 낡으므로 읽기 실패는 다시 읽는다.
 * `선택자` 는 토스트 상자다(앱이 그린 토스트는 그 id, 시스템 토스트는 `//android.widget.Toast`)
 */
export async function 토스트글(driver: AppDriver, 선택자: string, 시간 = 15_000): Promise<string> {
  let 글 = '';
  await 될때까지(
    driver,
    async () => {
      try {
        const 상자 = driver.$(선택자);
        if (!(await 상자.isExisting())) return false;
        const 글칸 = 상자.$('android.widget.TextView');
        글 = (await 글칸.isExisting()) ? await 글칸.getText() : await 상자.getText();
      } catch {
        글 = '';
      }
      return 글 !== '';
    },
    시간,
  );
  return 글;
}

/**
 * 이 구간에서만 화면 멈춤 기다림을 낮추고 끝나면(던져도) 기본값으로 되돌린다.
 * 계속 움직이는 화면(자동으로 넘어가는 배너 · 재생 중인 영상)은 명령마다 10초를 꽉 채워 기다린다. 기본값을 낮추지 않는 까닭 —
 * 그 10초가 로딩을 기다려 주던 케이스가 있다(2026-11-15 PR #785). 구간 안에서는 다음 화면을 `뜰때까지` 로 직접 기다린다
 */
export async function 움직이는화면에서<값>(driver: AppDriver, 할일: () => Promise<값>, 기다림 = 1000): Promise<값> {
  await driver.updateSettings({ waitForIdleTimeout: 기다림 });
  try {
    return await 할일();
  } finally {
    await driver.updateSettings({ waitForIdleTimeout: 멈춤기본 });
  }
}
