// Android 앱 케이스가 서비스마다 다시 짜던 기본 동작 — 기다리기 · 지금 화면 가르기 · 적기 · 권한 창 · 토스트 (도메인/러너 §5.2 「앱 공용 부품」)
// dma · mta 도우미에서 서비스와 상관없는 것만 옮겼다. 앱 고유의 주소(id) · 화면 흐름은 여전히 서비스 폴더의 도우미가 맡는다

import type { AppDriver } from './app.js';
import { 네이티브에서, 네이티브전용 } from './webview.js';

export type 앱요소 = WebdriverIO.Element;
export type 권한답 = '허용' | '거부';

const 권한주소 = (이름: string) => [`id=com.android.permissioncontroller:id/${이름}`, `id=com.android.packageinstaller:id/${이름}`];
const 권한단추: Record<권한답, string[]> = {
  // 위치 · 카메라는 「앱 사용 중에만 허용」 · 「이번만 허용」이 허용 자리에 온다. 꾸러미가 둘인 것은 안드로이드 9 까지가 packageinstaller 라서다
  허용: ['permission_allow_button', 'permission_allow_foreground_only_button', 'permission_allow_one_time_button'].flatMap(권한주소),
  // 한 번 거부한 권한을 다시 물으면 「거부 및 다시 묻지 않음」만 뜬다 — 데이터를 남긴 연결에서 앞 케이스의 거부가 이어질 때다
  거부: ['permission_deny_button', 'permission_deny_and_dont_ask_again_button'].flatMap(권한주소),
};
/** UiAutomator2 가 명령마다 화면이 멈추기를 기다리는 기본 시간 */
const 멈춤기본 = 10_000;
const 지금멈춤 = new WeakMap<AppDriver, number>();

const 참거짓 = (기다림: Promise<unknown>): Promise<boolean> =>
  기다림.then(
    () => true,
    () => false,
  );

/** 조건이 참이 될 때까지 기다리고 됐는지를 돌려준다 — 던지지 않으니 결과는 케이스가 verify 로 판정한다 */
export function 될때까지(driver: AppDriver, 조건: () => Promise<boolean>, 시간 = 10_000): Promise<boolean> {
  return 참거짓(driver.waitUntil(조건, { timeout: 시간, interval: 300 }));
}

export async function 뜰때까지(driver: AppDriver, 선택자: string, 시간 = 10_000): Promise<boolean> {
  네이티브전용(driver, '뜰때까지');
  return 참거짓(driver.$(선택자).waitForDisplayed({ timeout: 시간 }));
}

export async function 사라질때까지(driver: AppDriver, 선택자: string, 시간 = 10_000): Promise<boolean> {
  네이티브전용(driver, '사라질때까지');
  return 참거짓(driver.$(선택자).waitForDisplayed({ timeout: 시간, reverse: true }));
}

/** 기다리지 않고 지금 보이는지만 본다 — 없는 요소에 isDisplayed 를 물으면 던지는 판이 있어 있는지부터 본다 */
export async function 보이나(driver: AppDriver, 선택자: string): Promise<boolean> {
  네이티브전용(driver, '보이나');
  const 요소 = driver.$(선택자);
  return (await 요소.isExisting()) && (await 요소.isDisplayed());
}

/**
 * 후보 가운데 먼저 보이는 것의 이름 — 시간 안에 아무것도 안 뜨면 undefined.
 * 시작할 때 화면이 정해져 있지 않은 케이스(데이터 남기고 시작 · E2E 이어 돌기)가 「로그인 화면인가 홈인가」를 가를 때 쓴다
 */
export async function 먼저뜨는것<이름 extends string>(driver: AppDriver, 후보: Record<이름, string>, 시간 = 30_000): Promise<이름 | undefined> {
  // 안의 보이나 가 던지면 될때까지 가 삼켜 「안 떴다」가 된다 — 먼저 막는다
  네이티브전용(driver, '먼저뜨는것');
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
export async function 스크롤해서찾기(driver: AppDriver, 글자: string): Promise<앱요소> {
  네이티브전용(driver, '스크롤해서찾기');
  const 선택자 = `android=new UiScrollable(new UiSelector().scrollable(true).instance(0)).scrollIntoView(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  // 한 번만 묻는다 — 이 선택자는 물을 때마다 목록을 처음부터 굴려, 되풀이해 기다리면 없는 글자에 케이스 제한 시간을 다 쓴다
  const 요소 = await driver.$(선택자).getElement();
  if (요소.elementId === undefined) throw new Error(`「${글자}」가 든 요소를 굴려도 찾지 못했다`);
  return 요소;
}

const 한번에_글자 = 2_000;

/**
 * 칸을 비우고 적는다 — 빈 글을 보내면 키보드만 뜬다.
 * 긴 글은 나눠 이어 붙인다 — 폰의 UiAutomator2 서버가 요청을 64KB 까지만 받아(ServerInitializer 의 HttpObjectAggregator) 한글 10,000자를 한 번에 보내면 413 이다.
 * Appium 이 글자 목록을 한 벌 더 실어 한 글자에 최대 11바이트라 2,000자면 22KB 다. UiAutomator2 는 replace 없이 받은 글을 지금 칸 글 뒤에 붙인다
 * ponytail: 붙일 때 칸 글을 읽어 오므로 2,000자 넘는 비밀번호 칸(가려진 글) · 적는 대로 서식을 바꾸는 칸은 이어 붙인 값이 어긋난다. 그런 케이스가 나오면 클립보드로 붙여 넣는다
 */
export async function 칸에적기(칸: 앱요소, 값: string): Promise<void> {
  await 칸.clearValue();
  // 이모지가 반으로 갈리지 않게 글자 단위로 자른다
  const 글자 = Array.from(값);
  for (let i = 0; i < 글자.length; i += 한번에_글자) await 칸.addValue(글자.slice(i, i + 한번에_글자).join(''));
}

/** 키보드의 완료 · 이동 단추 — 키보드를 뒤로 가기로 내리면 화면이 닫히는 앱이 있다 */
export async function 키보드완료(driver: AppDriver): Promise<void> {
  네이티브전용(driver, '키보드완료');
  await driver.execute('mobile: performEditorAction', { action: 'done' });
}

/** 연타 — 둘 다 실패했을 때만 던진다. 첫 누르기에 화면이 넘어가 둘째가 실패하는 것은 정상이다 */
export async function 두번누르기(칸: 앱요소): Promise<void> {
  const 결과 = await Promise.allSettled([칸.click(), 칸.click()]);
  const 실패 = 결과.filter((하나): 하나 is PromiseRejectedResult => 하나.status === 'rejected');
  if (실패.length === 결과.length) throw 실패[0]?.reason;
}

export async function 길게누르기(driver: AppDriver, 선택자: string, 누르는시간 = 1200): Promise<void> {
  네이티브전용(driver, '길게누르기');
  const 요소 = await driver.$(선택자).getElement();
  await 요소.waitForDisplayed({ timeout: 10_000 });
  await driver.execute('mobile: longClickGesture', { elementId: 요소.elementId, duration: 누르는시간 });
}

/** 데이터는 두고 앱만 껐다 켠다 */
export async function 앱다시켜기(driver: AppDriver, 꾸러미: string): Promise<void> {
  // 앱을 끄면 웹뷰 맥락도 사라진다
  네이티브전용(driver, '앱다시켜기');
  await driver.terminateApp(꾸러미);
  await driver.activateApp(꾸러미);
}

/**
 * 권한 창이 시간 안에 뜨면 답하고 true, 안 뜨면 false — 데이터를 남긴 연결은 이미 답한 권한 창이 다시 안 뜬다.
 * 안 뜬 것을 실패로 볼지는 부른 쪽이 정한다
 */
export async function 권한창답하기(driver: AppDriver, 답: 권한답, 시간 = 5_000): Promise<boolean> {
  네이티브전용(driver, '권한창답하기');
  const 뜬것 = await 먼저뜨는것(driver, Object.fromEntries(권한단추[답].map((선택자) => [선택자, 선택자])), 시간);
  if (뜬것 === undefined) return false;
  await driver.$(뜬것).click();
  return true;
}

/** 알림 창을 내린다 — 닫기는 `driver.back()`, 시험 대상 앱을 다시 앞에 두기는 `driver.activateApp(꾸러미)` 그대로다. 푸시는 그 요소를 네이티브 주소로 누른다 */
export async function 알림창열기(driver: AppDriver): Promise<void> {
  네이티브전용(driver, '알림창열기');
  await driver.execute('mobile: openNotifications');
}

/** 권한 이름은 온 이름(`android.permission.CAMERA`)이다 */
export interface 바꿀권한 {
  준다?: string[];
  뺀다?: string[];
}

const 오류글 = (err: unknown): string => (err instanceof Error ? err.message : String(err));

async function 준권한(driver: AppDriver, 꾸러미: string): Promise<Set<string>> {
  try {
    return new Set((await driver.execute('mobile: getPermissions', { type: 'granted', appPackage: 꾸러미 })) as string[]);
  } catch (err) {
    throw new Error(`권한을 못 읽었다 — ${오류글(err)}`);
  }
}

// 준 권한을 빼면 Android 가 앱 프로세스를 끈다 — 다시 켜야 할일 · 다음 단계가 앱 화면에서 돈다
async function 권한바꾸기(driver: AppDriver, 꾸러미: string, 줌: string[], 뺌: string[]): Promise<void> {
  for (const [action, 이름들] of [['grant', 줌], ['revoke', 뺌]] as const) {
    if (이름들.length === 0) continue;
    try {
      await driver.execute('mobile: changePermissions', { permissions: 이름들, appPackage: 꾸러미, action });
    } catch (err) {
      throw new Error(`권한을 ${action === 'grant' ? '못 줬다' : '못 뺐다'}(${이름들.join(' · ')}) — ${오류글(err)}`);
    }
  }
  // pm 은 앱을 비동기로 끈다 — 바로 켜면 아직 살아 있던 앱이 앞에 왔다가 꺼진다. terminateApp 이 꺼질 때까지 기다린다
  if (뺌.length > 0) {
    await driver.terminateApp(꾸러미);
    await driver.activateApp(꾸러미);
  }
}

/**
 * 이 구간에서만 시험 대상 앱의 권한을 창 없이 주거나 빼고, 끝나면(던져도) 앞 권한으로 되돌린다 — 연결 하나를 이어 쓰는 길(E2E 앱 단계 ·
 * keepAppData 케이스)에서 바꾼 권한이 뒤로 넘어가지 않게. 되돌리기는 구간 전에 있던 것과 다른 권한만 바꾼다.
 * 되돌리기에 실패하면 던진다(할일이 이미 던졌으면 그 오류에 까닭을 덧붙인다) — 조용히 넘기면 다음 케이스가 바뀐 권한으로 돈다.
 * 구간에서 새로 준 권한을 되돌려 빼면 구간 뒤에도 앱이 꺼졌다 켜진다.
 * ponytail: 준 · 안 줌만 되돌린다 — 「다시 묻지 않음」 같은 권한 꼬리표는 pm 이 바꾼 채 남는다. 이어 쓰는 연결에서 권한 창이 달라지면 꼬리표까지 되돌린다
 */
export async function 권한상태에서<값>(driver: AppDriver, 바꿀: 바꿀권한, 할일: () => Promise<값>): Promise<값> {
  네이티브전용(driver, '권한상태에서');
  const 준다 = 바꿀.준다 ?? [];
  const 뺀다 = 바꿀.뺀다 ?? [];
  if (준다.length + 뺀다.length === 0) throw new Error('권한상태에서 — 준다 · 뺀다 가운데 하나는 적어야 한다');
  const 겹침 = 준다.filter((이름) => 뺀다.includes(이름));
  if (겹침.length > 0) throw new Error(`권한상태에서 — 같은 권한을 주고 뺄 수 없다: ${겹침.join(' · ')}`);
  // 줄인 이름(CAMERA)은 앱 권한 목록에 없어 빼기에서 조용히 빠진다 — 손대기 전에 막는다
  const 줄인 = [...준다, ...뺀다].filter((이름) => !이름.includes('.'));
  if (줄인.length > 0) throw new Error(`권한상태에서 — 권한은 온 이름(android.permission.…)으로 적는다: ${줄인.join(' · ')}`);
  // 시험 대상 앱의 것만 — 앞에 온 다른 앱의 권한을 바꾸지 않게 지금 화면의 꾸러미를 쓰지 않는다
  const caps = driver.capabilities as Record<string, unknown> | undefined;
  const 꾸러미 = caps?.appPackage ?? caps?.['appium:appPackage'];
  if (typeof 꾸러미 !== 'string' || 꾸러미 === '') throw new Error('권한상태에서 — 연결 설정에 시험 대상 앱 꾸러미(appPackage)가 없다');
  const 있던 = await 준권한(driver, 꾸러미);
  const 되돌리기 = async (): Promise<void> => {
    const 지금 = await 준권한(driver, 꾸러미);
    const 바뀐 = [...준다, ...뺀다].filter((이름) => 지금.has(이름) !== 있던.has(이름));
    await 권한바꾸기(driver, 꾸러미, 바뀐.filter((이름) => 있던.has(이름)), 바뀐.filter((이름) => !있던.has(이름)));
  };
  let 값: 값;
  try {
    await 권한바꾸기(driver, 꾸러미, 준다, 뺀다.filter((이름) => 있던.has(이름)));
    값 = await 할일();
  } catch (err) {
    try {
      await 되돌리기();
    } catch (되돌림오류) {
      const 덧 = ` (권한도 복원하지 못했다 — ${오류글(되돌림오류)})`;
      if (!(err instanceof Error)) throw new Error(`${String(err)}${덧}`);
      // 보고가 stack 을 찍는 길도 있어 둘 다 고친다 — stack 은 만들 때 글이 굳는다
      err.message += 덧;
      if (err.stack !== undefined) err.stack = `${err.stack}\n${덧.trim()}`;
    }
    throw err;
  }
  try {
    await 되돌리기();
  } catch (err) {
    throw new Error(`권한을 구간 전으로 복원하지 못했다 — ${오류글(err)}`);
  }
  return 값;
}

/**
 * 토스트 글 — 뜰 때까지 되풀이해 읽고 시간 안에 못 읽으면 빈 글. 토스트는 읽는 사이에 사라져 요소가 낡으므로 읽기 실패는 다시 읽는다.
 * `선택자` 는 토스트 상자다(앱이 그린 토스트는 그 id, 시스템 토스트는 `//android.widget.Toast`)
 */
export async function 토스트글(driver: AppDriver, 선택자: string, 시간 = 15_000): Promise<string> {
  네이티브전용(driver, '토스트글');
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
  // 겹쳐 쓰면 안쪽이 끝날 때 바깥 구간의 값으로 돌아가야 한다
  const 앞 = 지금멈춤.get(driver) ?? 멈춤기본;
  // 웹뷰 구간 안에서 불러도 UiAutomator2 설정이다 — 잠깐 네이티브로 가서 바꾼다
  await 네이티브에서(driver, () => driver.updateSettings({ waitForIdleTimeout: 기다림 }));
  지금멈춤.set(driver, 기다림);
  try {
    return await 할일();
  } finally {
    지금멈춤.set(driver, 앞);
    // 본문이 연결 끊김으로 던졌으면 되돌리기도 던진다 — 원래 실패 까닭을 덮지 않는다
    await 네이티브에서(driver, () => driver.updateSettings({ waitForIdleTimeout: 앞 })).catch((err: unknown) => console.error(`[kit] 화면 멈춤 기다림을 되돌리지 못했다: ${err instanceof Error ? err.message : String(err)}`));
  }
}
