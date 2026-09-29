// 끝내기의 result.held[] 를 케이스 스키마에서 계산한다 — 자식의 말이 아니라 코드를 본다 (도메인/작성 §3.6 「★ 보류 케이스」)

import { join } from 'node:path';

import type { 사본, 계정 } from './authoring-copy.js';
import { type 보고손, 친다 } from './authoring-io.js';
import { 변환환경 } from './authoring-reverse.js';

export interface 보류칸 {
  side: 'params' | 'expected';
  key: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  options?: string[];
}

export interface 보류 {
  tcId: string;
  name?: string;
  file: string;
  kind: 'UNDECIDABLE' | 'ON_HOLD';
  reason: string;
  fields: 보류칸[];
}

type 물건 = Record<string, unknown>;
const 물건인가 = (v: unknown): v is 물건 => typeof v === 'object' && v !== null && !Array.isArray(v);

function 칸하나(side: 보류칸['side'], key: string, 칸: unknown): 보류칸 | null {
  // 비밀값은 화면에서 받지 않는다 — 반영 때 테스트 계정으로 채운다
  if (!물건인가(칸) || 칸.secret === true) return null;
  const description = typeof 칸.description === 'string' ? 칸.description : '';
  if (칸.type === 'string' && Array.isArray(칸.enum) && 칸.enum.every((o) => typeof o === 'string')) {
    return { side, key, description, type: 'enum', options: 칸.enum };
  }
  if (칸.type === 'string' || 칸.type === 'boolean') return { side, key, description, type: 칸.type };
  if (칸.type === 'number' || 칸.type === 'integer') return { side, key, description, type: 'number' };
  // 배열·객체·날짜 같은 칸은 화면이 못 받는다 — 그 케이스는 제거만 된다
  return null;
}

function 칸들(side: 보류칸['side'], 스키마: unknown): 보류칸[] {
  const 속성 = 물건인가(스키마) ? 스키마.properties : undefined;
  if (!물건인가(속성)) return [];
  // io:'input' 스키마의 required 가 곧 「값이 없으면 못 도는 칸」이다 — 기본값 · optional 칸은 안 든다 (K10 과 같은 기준)
  const 필수 = 물건인가(스키마) && Array.isArray(스키마.required) ? 스키마.required : [];
  return Object.entries(속성).flatMap(([key, 칸]) => (필수.includes(key) ? (칸하나(side, key, 칸) ?? []) : []));
}

/** 스캐너가 낸 케이스 명세들 가운데 held 가 있는 것만 result.held[] 모양으로 */
export function 보류목록(명세들: unknown[]): 보류[] {
  return 명세들.flatMap((s) => {
    if (!물건인가(s) || typeof s.tcId !== 'string' || typeof s.held !== 'string' || !s.held.trim()) return [];
    if (typeof s.filePath !== 'string') return [];
    return {
      tcId: s.tcId,
      // 서버가 300자 넘는 이름을 거절한다 — 이름 하나로 끝내기 전체가 400 이 되지 않게 자른다
      ...(typeof s.name === 'string' ? { name: s.name.slice(0, 300) } : {}),
      file: `tests/${s.filePath}`,
      // 머리가 틀린 것은 K13 이 잡는다. 여기서는 사람이 값을 넣는 쪽으로 둔다
      kind: s.held.startsWith('판정 불가') ? 'UNDECIDABLE' : 'ON_HOLD',
      reason: s.held,
      fields: [...칸들('params', s.paramSchema), ...칸들('expected', s.expectedSchema)],
    };
  });
}

/** 케이스 파일이 console 에 무엇을 찍어도 섞이지 않게 결과 앞에 붙이는 표시 */
export const 스캔표시 = '@@HELD-SCAN@@';

export function 스캔풀기(낸것: string): unknown[] | null {
  const 자리 = 낸것.lastIndexOf(스캔표시);
  if (자리 < 0) return null;
  try {
    const 값: unknown = JSON.parse(낸것.slice(자리 + 스캔표시.length));
    return Array.isArray(값) ? 값 : null;
  } catch {
    return null;
  }
}

/**
 * 사본 트리의 `tests/<폴더>` 를 스캐너로 읽는다. 케이스 파일은 자식이 쓴 코드라 import 하면 실행된다 —
 * 에이전트 프로세스(토큰을 쥔)가 아니라 **자리 uid · 빈 환경의 하위 프로세스**에서 읽는다
 */
function 보류읽기(자리: 사본, 자식: 계정 | null, 폴더: string): 보류[] | { 사유: string } {
  const 스캐너 = join(자리.트리, 'apps', 'admin', 'src', 'catalog', 'scanner.ts');
  const 뿌리 = join(자리.트리, 'tests', 폴더);
  const 코드 = `import(${JSON.stringify(스캐너)}).then(async (m) => { const r = await m.scan(${JSON.stringify(뿌리)}); process.stdout.write(${JSON.stringify(스캔표시)} + JSON.stringify(r.specs)); })`;
  const 칠때 = { env: 변환환경(process.env, { HOME: 자리.집, TMPDIR: 자리.임시 }), ...(자식 ?? {}) };
  const r = 친다('npx', ['--no-install', 'tsx', '-e', 코드], 자리.트리, undefined, 120_000, 칠때);
  const 명세들 = r.ok ? 스캔풀기(r.낸것) : null;
  // 표준 오류는 싣지 않는다 — 케이스 코드가 찍은 글에 계정 원문이 섞일 수 있다
  if (명세들 === null) return { 사유: `보류 케이스를 못 읽었다 (${r.ok ? '스캔 결과 모양이 틀렸다' : `종료 ${String(r.코드)}`})` };
  return 보류목록(명세들);
}

/**
 * DONE 끝내기 몸에 보류를 싣는다. 못 읽으면 삼키지 않고 error 에 남기고 heldUnknown 을 단다 — PR 은 이미 섰다.
 * 빈 held 로 보내면 서버는 「보류 없음」으로 읽고 반영을 푼다 — 값 없이 건너뛰는 케이스가 main 에 들어간다
 */
export function 보류실은몸(몸: Record<string, unknown>, 읽음: 보류[] | { 사유: string }): Record<string, unknown> {
  const 결과 = 물건인가(몸.result) ? 몸.result : {};
  if ('사유' in 읽음) {
    const 앞 = typeof 몸.error === 'string' ? `${몸.error} · ` : '';
    return { ...몸, error: `${앞}${읽음.사유}`, result: { ...결과, heldUnknown: true } };
  }
  return 읽음.length === 0 ? 몸 : { ...몸, result: { ...결과, held: 읽음 } };
}

export function 보류싣는손(손: 보고손, 자리: 사본, 자식: 계정 | null, 폴더: string): 보고손 {
  return {
    ...손,
    끝내기: (몸) => (몸.status === 'DONE' ? 손.끝내기(보류실은몸(몸, 보류읽기(자리, 자식, 폴더))) : 손.끝내기(몸)),
  };
}
