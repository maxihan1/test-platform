// 요소 안에서 하는 손동작 — 밀기 · 끌어 놓기 · 두 손가락 벌리기 · 오므리기 (도메인/러너 §5.2 「범용 앱 부품」 APP-F3-06)
// 전부 요소 주소를 받는다. 좌표는 폰 크기가 바뀌면 어긋나 케이스에 쓰지 않는다(공통/2-명세선언 「요소가 없는 자리는 누르지 않는다」)

import type { AppDriver } from './app.js';
import type { 앱요소 } from './appParts.js';
import { 네이티브전용 } from './webview.js';

export type 미는방향 = '위' | '아래' | '왼쪽' | '오른쪽';
const 방향: Record<미는방향, string> = { 위: 'up', 아래: 'down', 왼쪽: 'left', 오른쪽: 'right' };
/** appium-cli 손동작 명령과 같은 정도 — CLI 로 미리 본 움직임을 케이스가 그대로 되풀이한다 */
const 정도 = 0.75;

async function 보이는요소(driver: AppDriver, 선택자: string): Promise<앱요소> {
  const 요소 = await driver.$(선택자).getElement();
  await 요소.waitForDisplayed({ timeout: 10_000 });
  return 요소;
}

/** 그 요소 안에서만 민다 — 가로 상품 줄 · 밀어서 삭제 · 아래 시트 · 슬라이더 · 날짜 · 숫자 고르개. 화면 전체를 굴려 찾기는 `스크롤해서찾기` 다 */
export async function 요소안에서밀기(driver: AppDriver, 선택자: string, 쪽: 미는방향): Promise<void> {
  네이티브전용(driver, '요소안에서밀기');
  // 오타는 UiAutomator2 가 받기 전에 막는다 — 타입을 우회한 값이 「방향 없음」으로 폰까지 가지 않게
  if (!Object.hasOwn(방향, 쪽)) throw new Error(`요소안에서밀기 — 방향은 위 · 아래 · 왼쪽 · 오른쪽이다: ${String(쪽)}`);
  const 요소 = await 보이는요소(driver, 선택자);
  await driver.execute('mobile: swipeGesture', { elementId: 요소.elementId, direction: 방향[쪽], percent: 정도 });
}

/**
 * 어디서 요소를 눌러 어디로 요소의 가운데까지 끌어 놓는다 — 끝점은 놓을 요소의 지금 자리에서 구해 폰 크기가 달라도 맞는다.
 * ponytail: 놓을 요소는 끌기 전에 보여야 한다 — 끌기 시작한 뒤에야 뜨는 자리(휴지통 막대)와 화면 끝에 걸친 자리는 못 다룬다. 그런 앱이 나오면 끌면서 기다리는 꼴로 넓힌다
 */
export async function 끌어놓기(driver: AppDriver, 어디서: string, 어디로: string): Promise<void> {
  네이티브전용(driver, '끌어놓기');
  const [집을, 놓을요소] = await Promise.all([보이는요소(driver, 어디서), 보이는요소(driver, 어디로)]);
  const 놓을 = await driver.getElementRect(놓을요소.elementId);
  // 크기가 0 이면 가운데가 왼쪽 위 모서리가 된다 — 엉뚱한 자리에 놓고 제품 실패로 보이지 않게 막는다
  if (!(놓을?.width > 0 && 놓을.height > 0)) throw new Error(`끌어놓기 — 놓을 요소(${어디로})의 크기가 없다`);
  await driver.execute('mobile: dragGesture', { elementId: 집을.elementId, endX: Math.round(놓을.x + 놓을.width / 2), endY: Math.round(놓을.y + 놓을.height / 2) });
}

/** 그 요소에서 두 손가락을 벌린다 — 지도 · 사진 확대 */
export async function 벌리기(driver: AppDriver, 선택자: string): Promise<void> {
  네이티브전용(driver, '벌리기');
  await driver.execute('mobile: pinchOpenGesture', { elementId: (await 보이는요소(driver, 선택자)).elementId, percent: 정도 });
}

/** 그 요소에서 두 손가락을 오므린다 — 지도 · 사진 축소 */
export async function 오므리기(driver: AppDriver, 선택자: string): Promise<void> {
  네이티브전용(driver, '오므리기');
  await driver.execute('mobile: pinchCloseGesture', { elementId: (await 보이는요소(driver, 선택자)).elementId, percent: 정도 });
}
