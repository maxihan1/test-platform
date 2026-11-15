// 앱 안 웹 화면(웹뷰) 구간 — 웹 맥락으로 바꿨다 되돌리고, 구간 안에서 네이티브 전용 부품을 막고, kit 이 보내는 네이티브 명령은 잠깐 네이티브로 보낸다 (도메인/러너 §5.2 「범용 앱 부품」)

import type { AppDriver } from './app.js';
import { 앱사진, type 상자 } from './highlight.js';

const 네이티브 = 'NATIVE_APP';
const W3C요소 = 'element-6066-11e4-a52e-4f735466cecf';
/** 웹뷰 맥락이 뜨기를 기다리는 시간 — 다른 기다리는 부품의 기본값과 같다. 테스트가 줄일 수 있게 묶어 둔다 */
export const 웹뷰기다림 = { ms: 10_000, 간격ms: 300 };
// 구간 안인 driver 와 그 웹 맥락 이름 — 부품 · 사진이 지금 맥락을 폰에 묻지 않고 안다
const 웹맥락 = new WeakMap<AppDriver, string>();

export const 웹맥락인가 = (driver: AppDriver): boolean => 웹맥락.has(driver);

/** 네이티브 주소 · UiAutomator2 명령을 쓰는 부품 — 웹 맥락에서 부르면 조용히 엉뚱하게 돌지 않게 던진다 */
export function 네이티브전용(driver: AppDriver, 부품: string): void {
  if (웹맥락.has(driver)) throw new Error(`${부품} 은 웹 맥락에서는 못 쓴다 — 웹뷰에서 구간 밖에서 부르거나, 구간 안에서는 웹 케이스처럼 driver.$('<웹 주소>') 로 쓴다`);
}

/** kit 이 스스로 보내는 네이티브 명령(사진 · 화면 멈춤 기다림 설정) — 웹뷰 구간 안이면 네이티브로 갔다가 웹 맥락으로 돌아온다 */
export async function 네이티브에서<값>(driver: AppDriver, 일: () => Promise<값>): Promise<값> {
  const 웹 = 웹맥락.get(driver);
  if (웹 === undefined) return 일();
  await driver.switchContext(네이티브);
  try {
    return await 일();
  } finally {
    await driver.switchContext(웹);
  }
}

async function 맥락들(driver: AppDriver): Promise<string[]> {
  const 목록 = (await driver.getContexts()) as (string | { id: string })[];
  return 목록.map((x) => (typeof x === 'string' ? x : x.id));
}

/**
 * 웹뷰 맥락이 뜰 때까지 기다려 그 맥락으로 바꾸고 할일을 돌린 뒤(던져도) 네이티브로 되돌린다.
 * 안의 요소는 웹 케이스 순서로 찾는다(공통/2-명세선언 「Android 앱 케이스」 「범용 앱」). 웹뷰가 여럿이면 첫 웹뷰 맥락이다
 */
export async function 웹뷰에서<값>(driver: AppDriver, 할일: () => Promise<값>): Promise<값> {
  if (웹맥락.has(driver)) throw new Error('웹뷰에서 구간 안에서 웹뷰에서 를 또 부를 수 없다');
  const 끝 = Date.now() + 웹뷰기다림.ms;
  let 목록 = await 맥락들(driver);
  let 웹 = 목록.find((x) => x.startsWith('WEBVIEW'));
  while (웹 === undefined && Date.now() < 끝) {
    await new Promise((r) => setTimeout(r, 웹뷰기다림.간격ms));
    목록 = await 맥락들(driver);
    웹 = 목록.find((x) => x.startsWith('WEBVIEW'));
  }
  if (웹 === undefined) {
    throw new Error(`웹뷰 맥락이 ${웹뷰기다림.ms / 1000}초 안에 뜨지 않았다(지금 맥락: ${목록.join(' · ')}) — 웹 화면이 안 열렸거나 앱이 웹뷰 디버깅을 켠 빌드가 아니다`);
  }
  await driver.switchContext(웹);
  웹맥락.set(driver, 웹);
  try {
    return await 할일();
  } finally {
    웹맥락.delete(driver);
    // 되돌리기 실패가 케이스의 진짜 결과를 가리지 않게 알리기만 한다 — 연결이 끊겼으면 다음 명령이 어차피 실패한다
    await driver.switchContext(네이티브).catch((err: unknown) => console.error(`[kit] 웹뷰에서 네이티브로 되돌리지 못했다: ${err instanceof Error ? err.message : String(err)}`));
  }
}

// 웹뷰 안 자리 — CSS 화소 · 보이는 창 기준. 넓이로 웹뷰 상자에 맞춘다
const 자리읽기 = 'const r = arguments[0].getBoundingClientRect(); return [r.x, r.y, r.width, r.height, window.innerWidth];';

/**
 * 웹뷰 구간 안의 단계 사진 — 폰 화면 전체를 네이티브로 찍고, 마지막에 다룬 웹 요소는 웹뷰 상자 안 자리로 옮겨 표시한다.
 * 웹 요소 자리를 못 읽으면 맨 사진이다. ponytail: 화면에 웹뷰가 여럿이면 첫 웹뷰 상자로 옮긴다 — 어긋나는 앱이 나오면 맥락의 웹뷰를 고른다
 */
export async function 웹뷰사진(driver: AppDriver, path: string, 요소: string | undefined): Promise<void> {
  let 안: number[] | undefined;
  if (요소 !== undefined) {
    try {
      안 = (await driver.execute(자리읽기, { [W3C요소]: 요소 })) as number[];
    } catch (err) {
      console.error(`[kit] 웹 요소 자리를 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  await 네이티브에서(driver, async () => {
    let 자리: 상자 | undefined;
    if (안 !== undefined && 안[4]! > 0) {
      try {
        const 틀 = await driver.$('android=new UiSelector().className("android.webkit.WebView")').getElement();
        const r = await driver.getElementRect(틀.elementId);
        const 배 = r.width / 안[4]!;
        자리 = { x: r.x + 안[0]! * 배, y: r.y + 안[1]! * 배, width: 안[2]! * 배, height: 안[3]! * 배 };
      } catch (err) {
        console.error(`[kit] 웹뷰 상자를 찾지 못했다: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    await 앱사진(driver, path, undefined, 자리);
  });
}
