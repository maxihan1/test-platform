// 키보드 앱의 도움말 창이 앱 화면을 가려 요소를 못 찾을 때, 사라질 때까지 기다렸다가 다시 찾게 하는 끼어드는 창 처리기

import type { AppDriver } from './app.js';

/** 키보드 앱 꾸러미 — 키보드를 올릴 때 도움말 말풍선을 화면 전체 크기 창으로 띄워 UiAutomator 가 앱 대신 그 창을 읽는다 (도메인/러너 §5.2 「키보드 창 기다리기」) */
// ponytail: 아는 키보드만 본다. 다른 앱 창(권한 창 등)까지 넓히면 「무엇이 먼저 뜨나」를 묻는 케이스가 못 찾을 때마다 기다리게 된다
export const 키보드꾸러미 = ['com.samsung.android.honeyboard', 'com.sec.android.inputmethod', 'com.google.android.inputmethod.latin'];

const 요소키 = 'element-6066-11e4-a52e-4f735466cecf';

type 찾기 = (using: string, value: string) => Promise<unknown>;

function 요소번호(값: unknown): string | null {
  if (값 === null || typeof 값 !== 'object') return null;
  const 키 = (값 as Record<string, unknown>)[요소키] ?? (값 as Record<string, unknown>).ELEMENT;
  return typeof 키 === 'string' ? 키 : null;
}

/** 맨 앞 창이 키보드 앱 것이면 그 꾸러미 이름. 못 읽으면 null — 처리기 때문에 케이스가 깨지면 안 된다 */
async function 가린키보드(driver: AppDriver, 원래: 찾기): Promise<string | null> {
  try {
    const 맨앞 = 요소번호(await 원래('xpath', '/hierarchy/*[1]'));
    if (맨앞 === null) return null;
    const 꾸러미 = await driver.getElementAttribute(맨앞, 'package');
    return 꾸러미 !== null && 키보드꾸러미.includes(꾸러미) ? 꾸러미 : null;
  } catch {
    return null;
  }
}

/** 키보드 창이 가렸으면 사라질 때까지 기다린다. 다시 찾을 만하면 true, 안 가렸거나 끝까지 남았으면 false */
async function 지나가기를기다린다(driver: AppDriver, 원래: 찾기, 기다림_ms: number, 간격_ms: number): Promise<boolean> {
  const 꾸러미 = await 가린키보드(driver, 원래);
  if (꾸러미 === null) return false;
  const 끝 = Date.now() + 기다림_ms;
  while (Date.now() < 끝) {
    await new Promise((r) => setTimeout(r, 간격_ms));
    if ((await 가린키보드(driver, 원래)) === null) return true;
  }
  console.error(`[kit] 키보드 창(${꾸러미})이 ${String(기다림_ms / 1000)}초 넘게 앱 화면을 가렸다`);
  return false;
}

/**
 * 연결에 처리기를 건다 — 요소를 찾을 때마다가 아니라 못 찾았을 때만 맨 앞 창을 본다(UiWatcher 와 같은 때).
 * 삼성 키보드 도움말은 6.6~7초 뒤 저절로 닫혀(2026-11-16 정식 실행 21144 · 21145) 누르지 않고 기다린다 — 누르면 앱을 건드릴 수 있다
 */
export function 키보드창기다리기(driver: AppDriver, 기다림_ms = 8_000, 간격_ms = 500): void {
  // findElement · findElements 는 프로토콜 명령이라 webdriverio 의 덮어쓰기 타입 목록에 없다 — 실제로는 덮인다($ · $$ 가 이 둘을 부른다)
  const 덮어쓰기 = driver.overwriteCommand.bind(driver) as unknown as (이름: string, 함수: (원래: 찾기, using: string, value: string) => Promise<unknown>) => void;
  덮어쓰기('findElement', async (원래: 찾기, using: string, value: string) => {
    const 결과 = await 원래(using, value);
    if (요소번호(결과) !== null) return 결과;
    return (await 지나가기를기다린다(driver, 원래, 기다림_ms, 간격_ms)) ? 원래(using, value) : 결과;
  });
  덮어쓰기('findElements', async (원래: 찾기, using: string, value: string) => {
    const 결과 = await 원래(using, value);
    if (Array.isArray(결과) && 결과.length > 0) return 결과;
    // findElements 의 원래 명령으로 맨 앞 창을 읽으면 배열이 온다 — 첫 칸만 쓴다
    const 하나 = async (u: string, v: string) => ((await 원래(u, v)) as unknown[] | undefined)?.[0];
    return (await 지나가기를기다린다(driver, 하나, 기다림_ms, 간격_ms)) ? 원래(using, value) : 결과;
  });
}
