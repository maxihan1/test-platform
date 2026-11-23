// 테스트 프로시저 선언. 케이스 선언을 도는 차례대로 묶어 테스트 하나가 케이스 여럿을 확인하게 한다 (SPEC 공통/2 §4 「테스트 프로시저」)

import { relative } from 'node:path';

import { PC항목인가 } from '../types.js';
import type { Platform, ProcId, ProcedureSpec } from '../types.js';
import type { AppLaunchIntent } from './app.js';
import { callerFile } from './callsite.js';
import { testsRoot, 켜기설정을적는다, 켜기설정을적었나, type CaseHandle } from './defineCase.js';
import { 게임시나리오인가 } from './protocol.js';

type 아무케이스 = CaseHandle<unknown, unknown>;
type 입력값<C> = C extends CaseHandle<infer P, unknown> ? P : never;

export interface DefineProcedureInput<C extends readonly [아무케이스, ...아무케이스[]]> {
  procId: ProcId;
  name: string;
  platforms: Platform[];
  precondition: string[];
  // 도는 차례대로. 같은 파일 맨 위에서 선언한 케이스만 넣는다 (K19)
  cases: C;
  // 앱 켜기 설정은 케이스가 아니라 여기에 적는다 — 폰 연결과 앱 켜기가 프로시저에 한 번이다 (K22)
  keepAppData?: boolean;
  // 첫 케이스의 입력값을 받는다 — 로그인할 계정 칸은 첫 케이스의 params 에 둔다
  launchIntent?: (params: 입력값<C[0]>) => Promise<AppLaunchIntent>;
}

const 같은디바이스 = (a: readonly Platform[], b: readonly Platform[]): boolean => [...a].sort().join() === [...b].sort().join();

export function defineProcedure<C extends readonly [아무케이스, ...아무케이스[]]>(input: DefineProcedureInput<C>): ProcedureSpec {
  // defineCase 와 같다 — 자신의 프레임을 지워야 첫 프레임이 프로시저 파일이 된다
  const here = new Error();
  Error.captureStackTrace(here, defineProcedure);
  const file = callerFile(here);
  const id = input.procId;

  // 케이스마다 깨끗한 창으로 시작하는 웹 · API 는 프로시저를 쓰지 않는다 (K21)
  const 앱 = input.platforms.length === 1 && input.platforms[0] === 'android';
  if (!앱 && !(input.platforms.length > 0 && input.platforms.every(PC항목인가))) {
    throw new Error(`${id}: 프로시저의 platforms 는 android 하나이거나 windows 값이다`);
  }
  if (input.keepAppData === true && !앱) throw new Error(`${id}: keepAppData 는 android 프로시저에만 단다`);
  if (input.launchIntent !== undefined && !앱) throw new Error(`${id}: launchIntent 는 android 프로시저에만 단다`);

  // 10개를 넘으면 앞 케이스 하나가 깨질 때 가려지는 케이스가 너무 많고 폰을 오래 잡는다 (K19)
  if (input.cases.length < 1 || input.cases.length > 10) {
    throw new Error(`${id}: cases 는 1개 이상 10개 이하다 — ${String(input.cases.length)}개를 넣었다`);
  }

  const filePath = file === undefined ? '' : relative(testsRoot(), file);
  // 다 본 뒤에 싣는다 — 보다가 던지면 앞 케이스에 없는 프로시저의 번호가 남는다
  const 번호들 = new Set<string>();
  for (const c of input.cases) {
    // 미션은 규칙을 끝에 한꺼번에 판정해 차례 구간으로 못 쪼갠다 (K19)
    if (게임시나리오인가(c.tcId)) throw new Error(`${id}: 게임 미션 ${c.tcId} 는 프로시저에 넣지 않는다`);
    // 결과 줄이 케이스 번호마다 하나라 케이스 하나는 프로시저 한 자리에만 든다 (K2 · K19)
    if (c.procId !== undefined) throw new Error(`${id}: ${c.tcId} 는 이미 ${c.procId} 에 들어 있다 — 케이스 하나는 프로시저 하나에만 든다`);
    if (번호들.has(c.tcId)) throw new Error(`${id}: ${c.tcId} 를 두 번 넣었다 — 케이스 하나는 프로시저 한 자리에만 든다`);
    번호들.add(c.tcId);
    // 옛 꼴 파일의 케이스를 가져오면 그 파일의 spec 에도 프로시저 번호가 실려 한 케이스가 두 꼴로 읽힌다 (K19)
    if (c.filePath !== filePath) throw new Error(`${id}: ${c.tcId} 는 다른 파일(${c.filePath})의 케이스다 — 같은 파일에서 선언한 케이스만 넣는다`);
    if (!같은디바이스(c.platforms, input.platforms)) throw new Error(`${id}: ${c.tcId} 의 platforms 가 프로시저와 다르다`);
    // 케이스에 적은 값은 쓰이지 않는다 — 적혀 있으면 읽는 사람이 그 값으로 켜지는 줄 안다 (K22)
    if (켜기설정을적었나(c)) throw new Error(`${id}: ${c.tcId} 의 keepAppData · launchIntent 는 프로시저에 적는다`);
  }
  // 같은 객체에 싣는다 — test.case 가 받는 케이스 선언과 스캐너가 읽는 cases 가 한 몸이어야 스키마 원본을 찾는다
  input.cases.forEach((c, i) => {
    c.procId = id;
    c.procSeq = i + 1;
  });

  const procedure: ProcedureSpec = {
    procId: id,
    name: input.name,
    platforms: input.platforms,
    precondition: input.precondition,
    filePath,
    cases: [...input.cases],
  };
  켜기설정을적는다(procedure, input);
  return procedure;
}
