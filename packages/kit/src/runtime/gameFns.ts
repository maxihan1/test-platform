// 게임 항목이 지나던 화면 객체 함수 · 도우미 이름을 절차 기록에 남긴다 — 정식 실행이 조작 맵 행을 이 이름으로 맞춘다 (도메인/게임 §3.10 「정식 실행이 맵을 고친다」)
// 행의 동작 칸은 「적 누르기 후 「공격」 누르기」 같은 문장이라 오브젝트 주소로는 못 맞춘다. 케이스가 그 동작을 부르는 함수 이름이 유일한 열쇠다

import { readFileSync } from 'node:fs';

import { stepScope } from './context.js';

// 화면 객체 · 도우미 · 화면 조각 폴더의 프레임만 본다 — 케이스 파일 · kit · 라이브러리는 행의 함수가 아니다.
// 이름에 빈칸이 든 프레임(new 던전화면 · get 이름)은 걸리지 않는다 — 행에 적는 함수가 아니다
const 프레임 = /^\s*at (?:async )?(\S+) \((?:file:\/\/)?(\/[^()]*\/(?:pages|helpers|components)\/[^/()]+):(\d+):\d+\)$/;
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
    const [, 이름, file, line] = m as unknown as [string, string, string, string];
    // 이름 없는 함수(<anonymous>)는 바깥 프레임이 그 함수다
    if (이름.includes('<')) continue;
    const 클래스 = 이름.startsWith('Function.') ? 클래스이름(file, Number(line)) : '';
    if (클래스 === undefined) continue;
    const 풀이름 = 클래스 === '' ? 이름 : `${클래스}.${이름.slice('Function.'.length)}`;
    if (!들.includes(풀이름)) 들.push(풀이름);
  }
  return 들;
}

/** 지금 부르는 자리의 함수 이름을 그 절차에 더하고 돌려준다. 절차 밖이면 적을 곳이 없어 스택도 안 읽는다 */
export function 지난함수를적는다(): string[] {
  const scope = stepScope.getStore();
  if (scope === undefined) return [];
  const 들 = 지나던함수(new Error().stack);
  const 모음 = (scope.gameFns ??= []);
  for (const f of 들) if (모음.length < 함수상한 && !모음.includes(f)) 모음.push(f);
  return 들;
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

/** 게임 드라이버의 동작마다 부른 자리의 함수 이름을 적고, 던진 오류에 그 이름을 달아 둔다. 다른 감싸기(돌발 팝업 닫기)보다 바깥에 건다 — 케이스가 부른 바로 그 순간의 스택을 읽는다 */
export function 함수를적게건다(드라이버: object): void {
  const 칸 = 드라이버 as Record<string, (...인자: unknown[]) => Promise<unknown>>;
  for (const 이름 of 적을동작) {
    const 원래 = 칸[이름]!.bind(드라이버);
    칸[이름] = async (...인자: unknown[]): Promise<unknown> => {
      const 들 = 지난함수를적는다();
      try {
        return await 원래(...인자);
      } catch (err) {
        if (들.length > 0 && typeof err === 'object' && err !== null && !부른함수.has(err)) 부른함수.set(err, 들);
        throw err;
      }
    };
  }
}
