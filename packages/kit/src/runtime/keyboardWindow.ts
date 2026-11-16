// 키보드 앱의 도움말 창이 앱 화면을 가려 요소를 못 찾을 때, 사라질 때까지 기다렸다가 다시 찾게 하는 끼어드는 창 처리기

import type { AppDriver } from './app.js';
import { 웹맥락인가 } from './webview.js';

/** 키보드 앱 꾸러미 — 키보드를 올릴 때 도움말 말풍선을 화면 전체 크기 창으로 띄워 UiAutomator 가 앱 대신 그 창을 읽는다 (도메인/러너 §5.2 「키보드 창 기다리기」) */
// ponytail: 아는 키보드만 본다. 다른 앱 창(권한 창 등)까지 넓히면 「무엇이 먼저 뜨나」를 묻는 케이스가 못 찾을 때마다 기다리게 된다
export const 키보드꾸러미 = ['com.samsung.android.honeyboard', 'com.sec.android.inputmethod', 'com.google.android.inputmethod.latin'];

/**
 * UiAutomator 가 지금 읽는 창(활성 창)에 키보드 앱 요소가 있는지 — 찾기 한 번으로 묻는다.
 * 말풍선은 초점을 가져가 활성 창이 되고, 화면 아래에 붙는 보통 키보드 창은 초점을 받지 않아 활성 창이 되지 않는다.
 * `-android uiautomator` 는 활성 창만 찾는다 — 화면 구조식(xpath)은 말풍선이 떠 있어도 앱 창을 맨 앞으로 내놓아 못 알아봤다(2026-11-16 정식 실행 21146).
 * 요소 속성을 따로 읽으면 실패 사진이 그 창(화면 전체)을 마지막에 다룬 요소로 적는다(highlight.ts 「앱을지켜본다」)
 */
// ponytail: 꾸러미 이름의 점을 정규식에서 막지 않는다 — Appium UiSelector 해석기가 문자열 속 \\ 를 푸는지 확인 못 해 막으면 아예 안 걸릴 수 있다. 점이 아무 글자와 맞아도 이 세 이름 말고 걸릴 꾸러미는 없다
export const 가림식 = `new UiSelector().packageNameMatches("${키보드꾸러미.join('|')}")`;

const 요소키 = 'element-6066-11e4-a52e-4f735466cecf';

type 찾기 = (using: string, value: string) => Promise<unknown>;

function 찾았나(값: unknown): boolean {
  if (Array.isArray(값)) return 값.length > 0;
  if (값 === null || typeof 값 !== 'object') return false;
  const 키 = (값 as Record<string, unknown>)[요소키] ?? (값 as Record<string, unknown>).ELEMENT;
  return typeof 키 === 'string';
}

let 묻기실패알림 = false;

/** 못 읽으면 안 가린 것으로 친다 — 처리기 때문에 케이스가 깨지면 안 된다. 다만 처리기가 꺼진 줄 알게 연결마다 한 번 남긴다 */
async function 가렸나(원래: 찾기): Promise<boolean> {
  try {
    return 찾았나(await 원래('-android uiautomator', 가림식));
  } catch (err) {
    if (!묻기실패알림) console.error(`[kit] 키보드 창을 묻지 못해 기다리기를 건너뛴다: ${err instanceof Error ? err.message : String(err)}`);
    묻기실패알림 = true;
    return false;
  }
}

/** 키보드 창이 가렸으면 사라질 때까지 기다린다. 다시 찾을 만하면 true, 안 가렸거나 끝까지 남았으면 false */
async function 지나가기를기다린다(원래: 찾기, 기다림_ms: number, 간격_ms: number): Promise<boolean> {
  if (!(await 가렸나(원래))) return false;
  // 실제 폰에서 처리기가 말풍선을 잡았는지 실행 기록으로 보게 남긴다
  console.error('[kit] 키보드 창이 앱 화면을 가려 사라질 때까지 기다린다');
  const 끝 = Date.now() + 기다림_ms;
  while (Date.now() < 끝) {
    await new Promise((r) => setTimeout(r, 간격_ms));
    if (!(await 가렸나(원래))) return true;
  }
  console.error(`[kit] 키보드 창이 ${String(기다림_ms / 1000)}초 넘게 앱 화면을 가렸다`);
  return false;
}

/**
 * 연결에 처리기를 건다 — 요소를 찾을 때마다가 아니라 못 찾았을 때만 활성 창을 본다(UiWatcher 와 같은 때).
 * 삼성 키보드 도움말은 6.6~7초 뒤 저절로 닫혀(2026-11-16 정식 실행 21144 · 21145) 누르지 않고 기다린다 — 누르면 앱을 건드릴 수 있다.
 * 가린 동안은 「없다」를 묻는 기다림(보이나 · 사라질때까지)도 기다린다 — 가린 채로 답하면 있는 요소를 없다고 한다
 */
// ponytail: 부모 요소 안에서 찾기($(부모).$(자식))는 덮지 않는다 — 부모를 찾을 때 이미 기다린다. 그사이 말풍선이 뜨는 일이 보이면 findElementFromElement 도 덮는다
export function 키보드창기다리기(driver: AppDriver, 기다림_ms = 8_000, 간격_ms = 500): void {
  // findElement · findElements 는 프로토콜 명령이라 webdriverio 의 덮어쓰기 타입 목록에 없다 — 실제로는 덮인다($ · $$ 가 이 둘을 부른다)
  const 덮어쓰기 = driver.overwriteCommand.bind(driver) as unknown as (이름: string, 함수: (원래: 찾기, using: string, value: string) => Promise<unknown>) => void;
  for (const 이름 of ['findElement', 'findElements']) {
    덮어쓰기(이름, async (원래: 찾기, using: string, value: string) => {
      const 결과 = await 원래(using, value);
      // 웹뷰 구간은 크롬 드라이버가 받는다 — 폰 화면 찾기를 보내지 않는다
      if (찾았나(결과) || 웹맥락인가(driver)) return 결과;
      return (await 지나가기를기다린다(원래, 기다림_ms, 간격_ms)) ? 원래(using, value) : 결과;
    });
  }
}
