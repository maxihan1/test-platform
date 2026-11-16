// 키보드 앱의 도움말 창이 앱 화면을 가려 요소를 못 찾을 때, 사라질 때까지 기다렸다가 다시 찾게 하는 끼어드는 창 처리기

import type { AppDriver } from './app.js';
import { 웹맥락인가 } from './webview.js';

/**
 * UiAutomator 가 지금 읽는 창(활성 창)에 맨 바깥 틀 말고 요소가 하나라도 있는지 — 두 번째 요소(instance 1)를 찾기 한 번으로 묻는다.
 * 삼성 키보드 도움말 말풍선(SmartTip)이 떠 있는 동안 활성 창은 앱 창 그대로인데 맨 바깥 틀 하나만 남고 안이 빈다.
 * 말풍선은 키보드 앱의 다른 창에 있어 활성 창만 읽는 찾기로는 안 보인다(2026-11-17 SM-G996N 폰 진단 — 「여러 창 보기」에서만 smart_tip 이 보였다).
 * 그래서 키보드 앱을 묻지 않고 「앱 화면이 비었나」를 묻는다 — #825 의 키보드 꾸러미 물음은 정식 실행 21147 에서 말풍선이 떠 있던 6초 동안 늘 0건이었다.
 * 화면 구조식(xpath 로 맨 바깥 틀의 자식)도 같은 답이지만 화면 전체를 읽어 평소 200~450ms 걸린다 — 이 물음은 60ms 안팎이다(같은 폰에서 잼)
 */
export const 빈화면식 = 'new UiSelector().instance(1)';

const 요소키 = 'element-6066-11e4-a52e-4f735466cecf';

type 찾기 = (using: string, value: string) => Promise<unknown>;

function 찾았나(값: unknown): boolean {
  if (Array.isArray(값)) return 값.length > 0;
  if (값 === null || typeof 값 !== 'object') return false;
  const 키 = (값 as Record<string, unknown>)[요소키] ?? (값 as Record<string, unknown>).ELEMENT;
  return typeof 키 === 'string';
}

/**
 * 못 읽으면 안 가린 것으로 친다 — 처리기 때문에 케이스가 깨지면 안 된다. 다만 처리기가 꺼진 줄 알게 연결마다 한 번 남긴다.
 * 늘 여럿 찾기로 묻는다 — 하나 찾기로 물으면 찾은 요소를 실패 사진이 「마지막에 다룬 요소」로 적어 엉뚱한 자리를 짚는다(highlight.ts 「앱을지켜본다」)
 */
function 가림물음(여럿: 찾기): () => Promise<boolean> {
  let 묻기실패알림 = false;
  return async () => {
    try {
      return !찾았나(await 여럿('-android uiautomator', 빈화면식));
    } catch (err) {
      if (!묻기실패알림) console.error(`[kit] 앱 화면이 비었는지 묻지 못해 기다리기를 건너뛴다: ${err instanceof Error ? err.message : String(err)}`);
      묻기실패알림 = true;
      return false;
    }
  };
}

/** 앱 화면이 비어 보이면 다시 채워질 때까지 기다린다. 다시 찾을 만하면 true, 안 비었거나 끝까지 비었으면 false */
async function 지나가기를기다린다(가렸나: () => Promise<boolean>, 기다림_ms: number, 간격_ms: number): Promise<boolean> {
  if (!(await 가렸나())) return false;
  // 실제 폰에서 처리기가 돌았는지 실행 기록으로 보게 남긴다. 화면이 넘어가는 중에도 잠깐 빌 수 있어 키보드 탓으로 못 박지 않는다
  console.error('[kit] 앱 화면이 비어 보인다(키보드 말풍선 등) — 다시 보일 때까지 기다린다');
  const 끝 = Date.now() + 기다림_ms;
  while (Date.now() < 끝) {
    await new Promise((r) => setTimeout(r, 간격_ms));
    if (!(await 가렸나())) return true;
  }
  console.error(`[kit] 앱 화면이 ${String(기다림_ms / 1000)}초 넘게 비어 보였다`);
  return false;
}

/**
 * 연결에 처리기를 건다 — 요소를 찾을 때마다가 아니라 못 찾았을 때만 활성 창을 본다(UiWatcher 와 같은 때).
 * 삼성 키보드 도움말은 6~7초 뒤 저절로 닫혀(2026-11-16 정식 실행 21144 · 21145) 누르지 않고 기다린다 — 누르면 앱을 건드릴 수 있다.
 * 가린 동안은 「없다」를 묻는 기다림(보이나 · 사라질때까지)도 기다린다 — 가린 채로 답하면 있는 요소를 없다고 한다
 */
// ponytail: 부모 요소 안에서 찾기($(부모).$(자식))는 덮지 않는다 — 부모를 찾을 때 이미 기다린다. 그사이 말풍선이 뜨는 일이 보이면 findElementFromElement 도 덮는다
export function 키보드창기다리기(driver: AppDriver, 기다림_ms = 8_000, 간격_ms = 500): void {
  // findElement · findElements 는 프로토콜 명령이라 webdriverio 의 덮어쓰기 타입 목록에 없다 — 실제로는 덮인다($ · $$ 가 이 둘을 부른다)
  const 덮어쓰기 = driver.overwriteCommand.bind(driver) as unknown as (이름: string, 함수: (원래: 찾기, using: string, value: string) => Promise<unknown>) => void;
  // 덮기 전에 잡아 둔 원래 여럿 찾기 — 덮은 것으로 물으면 빈 화면에서 처리기가 처리기를 부른다
  // 여럿 찾기가 없는 연결(가짜 연결)은 묻기 실패로 쳐 기다리지 않는다
  const 날여럿 = (driver.findElements as unknown as 찾기 | undefined)?.bind(driver);
  const 가렸나 = 가림물음(날여럿 ?? (() => Promise.reject(new Error('연결에 findElements 가 없다'))));
  for (const 이름 of ['findElement', 'findElements']) {
    덮어쓰기(이름, async (원래: 찾기, using: string, value: string) => {
      const 결과 = await 원래(using, value);
      // 웹뷰 구간은 크롬 드라이버가 받는다 — 폰 화면 찾기를 보내지 않는다
      if (찾았나(결과) || 웹맥락인가(driver)) return 결과;
      return (await 지나가기를기다린다(가렸나, 기다림_ms, 간격_ms)) ? 원래(using, value) : 결과;
    });
  }
}
