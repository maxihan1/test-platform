// 게임 · Android 앱 항목이 지나던 화면 객체 함수 · 도우미 이름을 절차 기록에 남긴다 — 정식 실행이 조작 맵 · 앱 조작 맵 줄을 이 이름으로 맞춘다 (도메인/게임 §3.10 「정식 실행이 맵을 고친다」 · 도메인/작성 §3.6 「★ 앱 탐색」 결정 10)
// 행의 동작 칸은 「적 누르기 후 「공격」 누르기」 같은 문장이라 오브젝트 주소로는 못 맞춘다. 케이스가 그 동작을 부르는 함수 이름이 유일한 열쇠다

import { readFileSync } from 'node:fs';

import { stepScope, type StepScope } from './context.js';

// 화면 객체 · 도우미 · 화면 조각 폴더(하위 폴더까지)의 프레임만 본다 — 케이스 파일 · kit · 라이브러리는 행의 함수가 아니다.
// 이름에 빈칸이 든 프레임(new 던전화면 · get 이름)은 걸리지 않는다 — 행에 적는 함수가 아니다
const 프레임 = /^\s*at (?:async )?(\S+) \((?:file:\/\/)?(\/[^()]*\/(pages|helpers|components)\/[^()]+):(\d+):\d+\)$/;
const 클래스줄 = /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([^\s{<]+)/;
/** 절차 하나에 남기는 이름 수 — 결과 줄이 끝없이 커지지 않게 */
export const 함수상한 = 200;

const 클래스들 = new Map<string, { 줄: number; 이름: string }[]>();

// ponytail: 정적 함수는 스택에 「Function.열기」로만 찍혀 클래스 이름을 소스에서 읽는다 — 그 줄 위의 가장 가까운 class 선언이다.
// 한 줄에 클래스가 둘이거나 소스 지도가 줄을 못 맞추면 빗나간다. 그때는 그 프레임만 안 남는다
function 클래스이름(file: string, line: number): string | undefined {
  let 들 = 클래스들.get(file);
  if (들 === undefined) {
    try {
      들 = readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((글, i) => {
          const 이름 = 클래스줄.exec(글)?.[1];
          return 이름 === undefined ? [] : [{ 줄: i + 1, 이름 }];
        });
    } catch {
      들 = [];
    }
    클래스들.set(file, 들);
  }
  return 들.filter((c) => c.줄 <= line).at(-1)?.이름;
}

/** 스택 글에서 화면 객체 함수(`던전화면.공격`) · 도우미(`GM골드`) 이름을 안쪽부터, 겹침 없이 */
export function 지나던함수(stack: string | undefined): string[] {
  const 들: string[] = [];
  for (const 줄 of (stack ?? '').split('\n')) {
    const m = 프레임.exec(줄);
    if (m === null) continue;
    const [, 찍힌이름, file, 폴더, line] = m as unknown as [string, string, string, string, string];
    // 이름 없는 함수(<anonymous>)는 바깥 프레임이 그 함수다. 라이브러리 안의 같은 이름 폴더는 테스트 폴더가 아니다
    if (찍힌이름.includes('<') || file.includes('/node_modules/')) continue;
    // 객체에 묶어 내보낸 도우미(`gm.GM골드`)와 묶음 import(`import * as`)는 「Object.」 「Module.」 머리가 붙는다 — 행에는 함수 이름만 적는다
    const 이름 = 찍힌이름.replace(/^(?:Object|Module)\./, '');
    let 풀이름 = 이름;
    if (이름.startsWith('Function.')) {
      const 클래스 = 클래스이름(file, Number(line));
      if (클래스 === undefined) continue;
      풀이름 = `${클래스}.${이름.slice('Function.'.length)}`;
    } else if (!이름.includes('.') && 폴더 !== 'helpers') {
      // 화면 객체 · 화면 조각 파일의 머리 없는 이름은 함수 안에서 변수에 담은 화살표 함수다 — 같은 이름의 도우미 행과 잘못 맞지 않게 뺀다
      continue;
    }
    if (!들.includes(풀이름)) 들.push(풀이름);
  }
  return 들;
}

/** 동작을 부른 자리 — 절차 밖이면 적을 곳이 없어 스택도 안 읽는다(null). 부르는 순간 그 절차는 게임 동작이 있는 절차가 된다 */
export function 부른자리(): { scope: StepScope; 들: string[] } | null {
  const scope = stepScope.getStore();
  if (scope === undefined) return null;
  scope.gameFns ??= [];
  return { scope, 들: 지나던함수(new Error().stack) };
}

/** 동작이 끝까지 된 뒤에만 「지난 함수」로 적는다 — 화면 객체가 삼킨 실패(없으면 넘어가기)를 지난 것으로 세면 깨진 행에 새 빌드가 적힌다 */
export function 지났다고적는다(자리: { scope: StepScope; 들: string[] } | null): void {
  if (자리 === null) return;
  const 모음 = (자리.scope.gameFns ??= []);
  for (const f of 자리.들) if (모음.length < 함수상한 && !모음.includes(f)) 모음.push(f);
}

// 동작을 부른 순간의 함수 이름 — 오류가 만들어진 자리(소켓 이벤트 · 타이머)의 스택에는 부른 쪽이 안 남을 수 있다
const 부른함수 = new WeakMap<object, string[]>();

/** 그 절차를 멈춘 오류가 지나던 함수 이름. 게임 동작이 던진 것이면 부른 순간의 이름을, 화면 객체가 스스로 던진 것이면 오류 스택을 읽는다 */
export function 실패함수들(err: unknown): string[] {
  if (typeof err !== 'object' || err === null) return [];
  return 부른함수.get(err) ?? 지나던함수((err as { stack?: string }).stack);
}

/** 케이스가 부르는 게임 동작 — 오류 목록(errors) · 패드 읽기(pad)는 동작이 아니라 뺀다 */
export const 적을동작 = ['find', 'click', 'drag', 'type', 'text', 'get', 'waitFor', 'waitForValue', 'layout', 'touchDown', 'touchUp', 'key', 'keyDown', 'keyUp'] as const;

/** 화면 파일 함수가 부르는 Appium 드라이버 명령 — 요소 명령(click · getText)은 늘 $ · $$ 로 찾은 요소에 부르니 찾기에서 잡힌다 */
export const 적을앱명령 = ['$', '$$', 'execute', 'url', 'back', 'keys', 'action', 'actions', 'performActions', 'waitUntil', 'switchContext', 'activateApp', 'terminateApp', 'hideKeyboard', 'pressKeyCode'] as const;
const 앱건것 = new WeakSet<object>();

/**
 * Android 앱 항목의 드라이버 명령마다 부른 자리의 함수 이름을 적는다 (도메인/작성 §3.6 「★ 앱 탐색」 결정 10 · APP-F4-09).
 * WebdriverIO 는 명령 이벤트에 부른 쪽 스택을 남기지 않아(안에서 끊긴다) 케이스가 부르는 바로 그 순간에 읽는다. 실패 쪽은 WebdriverIO 오류 스택에 화면 파일 함수가 남아 실패함수들이 읽는다.
 * ponytail: 찾는 순간에 「지났다」고 적는다 — 화면 파일이 실패를 삼키면(없으면 넘어가기) 그 함수도 지난 것으로 센다. 요소 명령마다 끝을 기다려 적으려면 요소를 감싸야 하는데 overwriteCommand(…, true) 는 모든 앱 케이스를 깬다(highlight.ts)
 */
export function 앱함수를적게건다(드라이버: object): void {
  if (앱건것.has(드라이버)) return;
  앱건것.add(드라이버);
  const 칸 = 드라이버 as Record<string, unknown>;
  for (const 이름 of 적을앱명령) {
    const 원래 = 칸[이름];
    if (typeof 원래 !== 'function') continue;
    const 묶은 = (원래 as (...인자: unknown[]) => unknown).bind(드라이버);
    // Browser 의 명령은 읽기 전용 속성이라 그 연결에만 다시 정의한다 — $ 가 돌려주는 사슬(await $().click())은 그대로 넘긴다
    Object.defineProperty(드라이버, 이름, {
      configurable: true,
      writable: true,
      value: (...인자: unknown[]): unknown => {
        지났다고적는다(부른자리());
        return 묶은(...인자);
      },
    });
  }
}

/** 게임 드라이버의 동작마다 부른 자리의 함수 이름을 적고, 던진 오류에 그 이름을 달아 둔다. 다른 감싸기(돌발 팝업 닫기)보다 바깥에 건다 — 케이스가 부른 바로 그 순간의 스택을 읽는다 */
export function 함수를적게건다(드라이버: object): void {
  const 칸 = 드라이버 as Record<string, (...인자: unknown[]) => Promise<unknown>>;
  for (const 이름 of 적을동작) {
    const 원래 = 칸[이름]!.bind(드라이버);
    칸[이름] = async (...인자: unknown[]): Promise<unknown> => {
      const 자리 = 부른자리();
      let 값: unknown;
      try {
        값 = await 원래(...인자);
      } catch (err) {
        if (자리 !== null && 자리.들.length > 0 && typeof err === 'object' && err !== null && !부른함수.has(err)) 부른함수.set(err, 자리.들);
        throw err;
      }
      지났다고적는다(자리);
      return 값;
    };
  }
}
