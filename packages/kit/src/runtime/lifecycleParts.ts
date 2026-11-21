// 앱 생명 주기 — 뒤로 보냈다 오기 · 딥 링크 · 화면 껐다 켜기 · 앱 데이터 지우기 · 인자 실어 켜기 · 다시 깔기 · 앞 빌드에서 올리기 (도메인/러너 §5.2 「범용 앱 부품」 APP-F3-08)
// 데이터는 두고 껐다 켜기는 appParts 의 앱다시켜기 다. 깔기 · 지우기는 팜이 이번 실행에 깐 시험 대상 앱만이다(공통/2-명세선언 「범용 앱」)

import type { AppDriver } from './app.js';
import { 쪽지쓰기 } from './appBuild.js';
import { 패키지이름인가 } from './protocol.js';
import { 네이티브전용 } from './webview.js';

/** intent 의 글 인자(`am start --es 이름 값`) — appium-cli 의 app restart · clear 가 Ran 줄에 이 꼴로 싣는다 */
export type 실행인자 = Record<string, string>;

const 오류글 = (err: unknown): string => (err instanceof Error ? err.message : String(err));

function 연결설정(driver: AppDriver, 키: string): unknown {
  const caps = driver.capabilities as Record<string, unknown> | undefined;
  return caps?.[키] ?? caps?.[`appium:${키}`];
}

// 시험 대상 앱의 것만 — 앞에 온 다른 앱을 건드리지 않게 지금 화면의 꾸러미를 쓰지 않는다
export function 시험앱(driver: AppDriver, 부품: string): string {
  const 꾸러미 = 연결설정(driver, 'appPackage');
  if (typeof 꾸러미 !== 'string' || 꾸러미 === '') throw new Error(`${부품} — 연결 설정에 시험 대상 앱 꾸러미(appPackage)가 없다`);
  return 꾸러미;
}

/** 앱을 그 초만큼 뒤로 보냈다가 다시 앞에 둔다 — 돌아왔을 때 화면 · 입력이 남는지는 케이스가 verify 로 본다. 돌아올 때까지 기다린다 */
export async function 뒤로보냈다오기(driver: AppDriver, 초: number): Promise<void> {
  네이티브전용(driver, '뒤로보냈다오기');
  if (!Number.isInteger(초) || 초 < 1 || 초 > 600) throw new Error(`뒤로보냈다오기 — 초는 1~600 의 정수다: ${String(초)}`);
  await driver.execute('mobile: backgroundApp', { seconds: 초 });
}

/** 딥 링크로 시험 대상 앱의 그 화면을 연다 — 꾸러미를 실어 같은 주소를 받는 다른 앱 · 고르는 창이 끼지 않게 */
export async function 딥링크열기(driver: AppDriver, 주소: string): Promise<void> {
  네이티브전용(driver, '딥링크열기');
  if (!/^[a-z][a-z0-9+.-]*:/i.test(주소)) throw new Error(`딥링크열기 — 주소는 myapp://… · https://… 꼴이다: ${주소}`);
  await driver.execute('mobile: deepLink', { url: 주소, package: 시험앱(driver, '딥링크열기') });
}

/** 화면을 껐다(잠금) 켠다(풀기) — 잠금 화면에 PIN 이 걸린 폰은 못 푼다(팜 폰은 잠금이 없다) */
export async function 화면껐다켜기(driver: AppDriver): Promise<void> {
  네이티브전용(driver, '화면껐다켜기');
  await driver.execute('mobile: lock', {});
  await driver.execute('mobile: unlock', {});
}

/** `mobile: startActivity` 인자 — 화면 하나를 글 인자와 함께 켠다. kit 앱 켜기(app.ts 실어켠다)도 같이 쓴다 */
export function 화면켜기인자(꾸러미: string, 화면: string, 인자: 실행인자): Record<string, unknown> {
  return { component: `${꾸러미}/${화면}`, extras: Object.entries(인자).map(([이름, 값]) => ['s', 이름, 값]) };
}

async function 인자로띄우기(driver: AppDriver, 꾸러미: string, 인자: 실행인자, 부품: string): Promise<void> {
  // UiAutomator2 는 앱 파일에서 읽은 첫 화면(appActivity)을 연결 설정 답에 싣는다 — appium-cli 도 같은 값으로 띄운다
  const 첫화면 = 연결설정(driver, 'appActivity');
  if (typeof 첫화면 !== 'string' || 첫화면 === '') throw new Error(`${부품} — 연결 설정에 시험 대상 앱 첫 화면(appActivity)이 없다`);
  await driver.execute('mobile: startActivity', 화면켜기인자(꾸러미, 첫화면, 인자));
}

/** 앱을 끄고 실행 인자(서버 주소 등)를 실어 다시 켠다 — 인자 없이 껐다 켜기는 앱다시켜기 다 */
export async function 인자로켜기(driver: AppDriver, 인자: 실행인자): Promise<void> {
  네이티브전용(driver, '인자로켜기');
  if (Object.keys(인자).length === 0) throw new Error('인자로켜기 — 인자가 비었다. 인자 없이 껐다 켜기는 앱다시켜기 다');
  const 꾸러미 = 시험앱(driver, '인자로켜기');
  await driver.terminateApp(꾸러미);
  await 인자로띄우기(driver, 꾸러미, 인자, '인자로켜기');
}

/** 앱 데이터를 지우고(clearApp 이 앱도 끈다) 다시 켠다 — 인자를 주면 그 인자를 실어 켠다(데이터와 같이 지워진 서버 주소를 다시 준다) */
export async function 앱비우기(driver: AppDriver, 인자?: 실행인자): Promise<void> {
  네이티브전용(driver, '앱비우기');
  const 꾸러미 = 시험앱(driver, '앱비우기');
  await driver.execute('mobile: clearApp', { appId: 꾸러미 });
  if (인자 !== undefined && Object.keys(인자).length > 0) await 인자로띄우기(driver, 꾸러미, 인자, '앱비우기');
  else await driver.activateApp(꾸러미);
}

// 러너가 실행 요청의 app · previousApp 을 이 이름으로 케이스에 넘긴다(도메인/러너 §5.2 「앱 실행」)
function 앱파일(이름: 'PLATFORM_APP' | 'PLATFORM_APP_PREVIOUS', 부품: string): string {
  const 값 = process.env[이름];
  if (값 === undefined || 값 === '') {
    throw new Error(
      이름 === 'PLATFORM_APP'
        ? `${부품} — 깔 앱 파일(PLATFORM_APP)이 없다`
        : `${부품} — 앞 빌드가 없다. 이 대상 서버 줄의 빌드 목록에 빌드가 둘 이상 있어야 한다(앱 파일 경로로 도는 줄 · 빌드를 한 번만 올린 줄은 못 쓴다)`,
    );
  }
  // 패키지 이름으로 준 스토어 앱은 팜이 「남길 앱」으로 둔 것이라 지우면 다음 실행이 그 폰을 못 잡는다
  if (패키지이름인가(값)) throw new Error(`${부품} — 패키지 이름으로 준 스토어 앱(${값})은 지우거나 다시 깔지 않는다`);
  return 값;
}

// 앱 파일 값은 서명 주소일 수 있어 오류에 싣지 않는다 — 어느 판인지만 적고, Appium 이 되비친 주소 · 서명도 가린다(실행 기록 · 리포트에 남는다)
async function 깔기(driver: AppDriver, 파일: string, 무엇: string, 부품: string): Promise<void> {
  try {
    await driver.execute('mobile: installApp', { appPath: 파일 });
  } catch (err) {
    const 가린 = 오류글(err).split(파일).join('<앱 파일>').replace(/([?&]sig=)[^&\s'"]+/g, '$1…');
    throw new Error(`${부품} — ${무엇} 못 깔았다 — ${가린}`);
  }
  // 지금 판을 깔았으면 폰 쪽지를 고친다 — 안 고치면 다음 항목이 「그사이 누가 다시 깔았다」로 보고 데이터째 또 깐다 (appBuild.ts)
  if (무엇 === '지금 판을') await 쪽지쓰기((script, args) => driver.execute(script, args), 시험앱(driver, 부품), 파일);
}

/** 시험 대상 앱을 지우고 지금 판을 다시 깐 뒤 켠다 — 처음 깐 상태(첫 실행 안내 · 권한 창)를 보는 케이스 */
export async function 앱다시깔기(driver: AppDriver): Promise<void> {
  네이티브전용(driver, '앱다시깔기');
  const 지금 = 앱파일('PLATFORM_APP', '앱다시깔기');
  const 꾸러미 = 시험앱(driver, '앱다시깔기');
  await driver.execute('mobile: removeApp', { appId: 꾸러미 });
  await 깔기(driver, 지금, '지금 판을', '앱다시깔기');
  // 백업이 켜진 폰은 설치 순간 옛 데이터를 되살린다 — 처음 깐 상태가 안 나온다 (app.ts 켜기전에)
  await driver.execute('mobile: clearApp', { appId: 꾸러미 });
  await driver.activateApp(꾸러미);
}

/**
 * 앞 빌드를 깔아 할일(옛 판에서 로그인 · 데이터 만들기)을 돌린 뒤 지금 판을 덮어 깔고(데이터는 남는다) 켠다 — 올린 뒤 무엇이 남는지는 케이스가 verify 로 본다.
 * 옛 판은 판 번호가 낮아 덮어 깔 수 없어 먼저 지운다. 할일이 던져도 지금 판을 덮어 깔아 둔다(같은 연결을 이어 쓰는 길이 옛 판으로 돌지 않게) —
 * 그것도 못 하면 할일의 오류에 까닭을 덧붙인다
 */
export async function 옛판에서올리기<값>(driver: AppDriver, 할일: () => Promise<값>): Promise<값> {
  네이티브전용(driver, '옛판에서올리기');
  const 옛 = 앱파일('PLATFORM_APP_PREVIOUS', '옛판에서올리기');
  const 지금 = 앱파일('PLATFORM_APP', '옛판에서올리기');
  const 꾸러미 = 시험앱(driver, '옛판에서올리기');
  await driver.execute('mobile: removeApp', { appId: 꾸러미 });
  await 깔기(driver, 옛, '앞 빌드를', '옛판에서올리기');
  await driver.activateApp(꾸러미);
  let 값: 값;
  try {
    값 = await 할일();
  } catch (err) {
    try {
      await 깔기(driver, 지금, '지금 판을', '옛판에서올리기');
      // 실패 사진 · 이어 쓰는 연결이 런처가 아닌 앱 화면을 보게
      await driver.activateApp(꾸러미);
    } catch (깔기오류) {
      const 덧 = ` (지금 판도 다시 못 깔았다 — ${오류글(깔기오류)})`;
      if (!(err instanceof Error)) throw new Error(`${String(err)}${덧}`);
      // 보고가 stack 을 찍는 길도 있어 둘 다 고친다 — stack 은 만들 때 글이 굳는다
      err.message += 덧;
      if (err.stack !== undefined) err.stack = `${err.stack}\n${덧.trim()}`;
    }
    throw err;
  }
  await 깔기(driver, 지금, '지금 판을', '옛판에서올리기');
  await driver.activateApp(꾸러미);
  return 값;
}
