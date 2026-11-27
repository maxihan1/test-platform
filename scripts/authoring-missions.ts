// 게임 시나리오 미션 — 케이스 목록 파일의 미션 절을 읽어 PR 머리 한 줄로 남긴다 (도메인/게임 §3.10 결정 24 · 33)
// 미션 승인은 없어졌다(결정 33) — 같은 작성이 미션 목록과 게임 시나리오 케이스를 같이 쓰고, 승인 탭이 보이던 경고는 이 줄로 옮겼다

import { readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import type { 원장 } from './authoring-ledger.js';
import { type 작전, 다채웠나, 안건드린작전, 이긴판읽기, 채울판 } from './authoring-game-wins-log.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { type 기준결정, 원장대조, tcId들 } from './authoring-ledger-check.js';
import { 안전히읽기, 폴더인가 } from './authoring-screens-keep-io.js';

export interface 미션 {
  /** M01 · M02 … — 이어 작성이 고친 규칙의 미션만 고치고 번호는 둔다(tpx-cases game-scenario.md §2) */
  id: string;
  title: string;
  start: string;
  todo: string;
  success: string;
  /** 확인할 로그 한 줄 = 기획서 규칙 하나 */
  logs: { text: string; reqId: string }[];
  /** 이기는 미션만 — 원래 속도로 10판을 다 이긴 조작 도우미 함수와 인자(게임 §3.10 「배운 것을 PRD · 테스트로」) */
  plan?: 작전;
}

const 글상한 = 2_000_000;
const 규칙상한 = 1000;
/** PR 머리 줄에 싣는 번호 수 — 넘으면 「외 N건」 */
const 번호상한 = 10;
const 절머리 = /^##\s+게임 시나리오 미션\s*$/;
const 줄구분 = ' — ';

type 빈칸 = { reqId: string; note: string };
type 빠진 = { reqId: string; text: string };

/** `- <앞> — <뒤>` 한 줄. 긴 줄표가 글 안에 또 있어도 되게, 로그 줄은 마지막 것이(뒤가 규칙 번호) 빈칸 줄은 처음 것이(앞이 규칙 번호) 가름이다 */
function 한줄읽기(줄: string, 가름: 'first' | 'last' = 'last'): { 앞: string; 뒤: string } | null {
  const 몸 = 줄.trim().replace(/^-\s+/, '');
  const 자리 = 가름 === 'last' ? 몸.lastIndexOf(줄구분) : 몸.indexOf(줄구분);
  const 앞 = 자리 < 0 ? '' : 몸.slice(0, 자리).trim();
  const 뒤 = 자리 < 0 ? '' : 몸.slice(자리 + 줄구분.length).trim();
  return 앞 === '' || 뒤 === '' ? null : { 앞, 뒤 };
}

/** 소제목 아래 코드 덩이 안의 줄. 덩이가 없으면 소제목 아래 줄 전부(느슨하게) */
function 덩이줄들(몸: string[]): string[] {
  const 안: string[] = [];
  let 열림 = false;
  let 봄 = false;
  for (const 줄 of 몸) {
    if (/^\s*`{3,}/.test(줄)) {
      열림 = !열림;
      봄 = true;
      continue;
    }
    if (열림) 안.push(줄);
  }
  return 봄 ? 안 : 몸;
}

function 작전읽기(글: string): 작전 | null {
  const m = /^([a-z][a-z0-9-]*)\s+([\p{L}\p{N}_$]+)(?:\s+(\[.*\]))?$/u.exec(글);
  if (m === null) return null;
  try {
    const 인자 = JSON.parse(m[3] ?? '[]') as unknown;
    return Array.isArray(인자) ? { 파일: m[1]!, 함수: m[2]!, 인자 } : null;
  } catch {
    return null;
  }
}

function 미션읽기몸(id: string, 머리제목: string, 줄들: string[]): { 미션: 미션 } | { 틀림: string } {
  const 칸: Record<string, string> = {};
  const logs: 미션['logs'] = [];
  let 로그중 = false;
  for (const 줄 of 줄들) {
    const t = 줄.trim();
    const 필드 = /^(미션|시작 조건|할 일|성공 조건|작전)\s*:\s*(.*)$/.exec(t);
    if (필드 !== null) {
      칸[필드[1] ?? ''] = (필드[2] ?? '').trim();
      로그중 = false;
    } else if (/^확인할 로그\s*:?\s*$/.test(t)) {
      로그중 = true;
    } else if (로그중 && t.startsWith('-')) {
      const 읽음 = 한줄읽기(t);
      if (읽음 === null) return { 틀림: `${id} — 확인할 로그 줄이 「- <글> — <규칙 번호>」 꼴이 아니다` };
      logs.push({ text: 읽음.앞, reqId: 읽음.뒤 });
    }
  }
  const 미션: 미션 = { id, title: 칸['미션'] || 머리제목, start: 칸['시작 조건'] ?? '', todo: 칸['할 일'] ?? '', success: 칸['성공 조건'] ?? '', logs };
  if (칸['작전'] !== undefined) {
    const plan = 작전읽기(칸['작전']);
    if (plan === null) return { 틀림: `${id} — 작전 줄이 「<도우미 파일 이름> <함수> <인자 JSON 배열>」 꼴이 아니다` };
    미션.plan = plan;
  }
  const 빈칸 = (['title', 'start', 'todo', 'success'] as const).find((k) => 미션[k].trim() === '') ?? (logs.length === 0 ? 'logs' : undefined);
  return 빈칸 === undefined ? { 미션 } : { 틀림: `${id} — ${빈칸} 칸이 비었다` };
}

/**
 * 케이스 목록 파일 맨 끝 `## 게임 시나리오 미션` 절 — `### M01 <제목>` 아래 코드 덩이가 미션이고 `### 공식 빈칸` 아래 ` - <규칙 번호> — <까닭>` 줄이 빈칸이다.
 * 절이 없으면 null. 못 읽은 미션은 빼고 까닭을 `못읽음` 에 둔다 — 하나가 틀렸다고 목록 전체를 못 올리지 않게
 */
export function 미션절읽기(표글: string): { items: 미션[]; gaps: 빈칸[]; 못읽음: string[] } | null {
  const 줄들 = 표글.split(/\r?\n/);
  const 시작 = 줄들.findIndex((l) => 절머리.test(l.trim()));
  if (시작 < 0) return null;
  // 코드 덩이 안의 `# …` 줄은 제목이 아니다 — 거기서 끊으면 뒤 미션과 공식 빈칸이 말없이 빠진다
  let 덩이안 = false;
  const 끝 = 줄들.findIndex((l, i) => {
    if (i <= 시작) return false;
    if (l.trimStart().startsWith('```')) 덩이안 = !덩이안;
    return !덩이안 && /^#{1,2}\s/.test(l);
  });
  const 덩이들: { 제목: string; 몸: string[] }[] = [];
  for (const 줄 of 줄들.slice(시작 + 1, 끝 < 0 ? undefined : 끝)) {
    const 제목 = /^###\s+(.+?)\s*$/.exec(줄);
    if (제목 !== null) 덩이들.push({ 제목: 제목[1] ?? '', 몸: [] });
    else 덩이들.at(-1)?.몸.push(줄);
  }
  const items: 미션[] = [];
  const gaps: 빈칸[] = [];
  const 못읽음: string[] = [];
  for (const { 제목, 몸 } of 덩이들) {
    if (제목 === '공식 빈칸') {
      for (const 줄 of 덩이줄들(몸).filter((l) => l.trim().startsWith('-'))) {
        const 읽음 = 한줄읽기(줄, 'first');
        if (읽음 === null) 못읽음.push(`공식 빈칸 — 「${줄.trim().slice(0, 40)}」 줄이 「- <규칙 번호> — <까닭>」 꼴이 아니다`);
        else gaps.push({ reqId: 읽음.앞, note: 읽음.뒤 });
      }
      continue;
    }
    const 머리 = /^(M\d{2,3})(?:\s+(.*))?$/.exec(제목);
    if (머리 === null) continue;
    const id = 머리[1] ?? '';
    if (items.some((m) => m.id === id)) {
      못읽음.push(`${id} — 번호가 겹친다`);
      continue;
    }
    const 읽음 = 미션읽기몸(id, (머리[2] ?? '').trim(), 덩이줄들(몸));
    if ('틀림' in 읽음) 못읽음.push(읽음.틀림);
    else items.push(읽음.미션);
  }
  return { items, gaps, 못읽음 };
}

/**
 * 미션도 테스트도 없는 규칙 — 원장 대조의 「빠짐」(요구사항 · 제외 표가 안 덮은 번호)에서 미션 확인할 로그의 규칙 번호를 뺀 것.
 * PR 머리 줄 「미션도 테스트도 없는 규칙」으로 실린다(미션줄). 원장이 없으면 셀 수 없어 빈 목록이다
 */
export function 빠진규칙(원장값: 원장 | { 없음: string }, 표글: string, 기준: 기준결정 | undefined, 미션들: readonly 미션[], 있는케이스?: Set<string>): 빠진[] {
  if ('없음' in 원장값) return [];
  const 미션번호 = new Set(미션들.flatMap((m) => m.logs.map((l) => l.reqId)));
  const 대조 = 원장대조(원장값.항목, 표글, { 있는케이스, 에이전트: true, 사람이뺌: 기준?.사람이뺌, 다음요청: 기준?.다음요청, 제거함: 기준?.제거함 });
  const 글 = new Map(원장값.항목.map((h) => [h.번호, h.문장 ?? h.글 ?? h.번호]));
  return 대조.빠짐.filter((b) => !미션번호.has(b)).slice(0, 규칙상한).map((reqId) => ({ reqId, text: (글.get(reqId) ?? reqId).slice(0, 규칙상한) }));
}

/** 올릴 트리의 케이스 파일 글 — 빠짐 셈이 「파일 없는 줄」을 덮은 것으로 치지 않게. 못 읽으면 undefined(파일 확인 없이 센다) */
function 케이스글들읽기(폴더: string): string[] | undefined {
  try {
    if (!폴더인가(폴더)) return [];
    return readdirSync(폴더, { recursive: true, encoding: 'utf8' })
      .filter((p) => p.endsWith('.spec.ts'))
      .map((p) => 안전히읽기(join(폴더, dirname(p)), basename(p), 글상한) ?? '');
  } catch {
    return undefined;
  }
}

// 요구 번호 꼴만 싣는다 — 공식 빈칸 줄의 앞 칸은 자식이 쓴 글이라 번호가 아닌 글이 PR 본문에 그대로 실릴 수 있다
const 요구번호꼴 = /^[A-Z][A-Z0-9]*-REQ-\d{3}$/;
const 번호들 = (xs: readonly string[]): string => {
  const 번호 = xs.filter((x) => 요구번호꼴.test(x));
  return 번호.length === 0 ? '' : `(${번호.slice(0, 번호상한).join(' · ')}${번호.length > 번호상한 ? ` 외 ${String(번호.length - 번호상한)}건` : ''})`;
};

/** 작전이 적힌 미션 가운데 원래 속도로 10판을 다 못 이긴 것 — 막지 않고 보이기만 한다 */
function 못채운글(입력: { 트리: string; 케이스폴더: string; 자료?: string; 기준표글?: string; 바뀐?: readonly string[] | null }, 미션들: readonly 미션[]): string {
  const { 자료 } = 입력;
  if (자료 === undefined) return '';
  // 이긴 판 기록은 작성마다 새것이다 — 앞 작성의 작전(기준 표와 같고 이번에 안 돌리고 도우미도 안 고친 것)을 0판으로 세지 않는다. 바뀐 파일을 못 읽었으면 센다
  const 앞작전 = new Map((입력.기준표글 === undefined ? [] : (미션절읽기(입력.기준표글)?.items ?? [])).map((m) => [m.id, JSON.stringify(m.plan)]));
  const 작전들 = 미션들.flatMap((m) => {
    if (m.plan === undefined) return [];
    const 폴더 = basename(입력.케이스폴더);
    const 그대로 = 앞작전.get(m.id) === JSON.stringify(m.plan) && Array.isArray(입력.바뀐) && 안건드린작전(자료, 입력.트리, 폴더, m.plan, 입력.바뀐);
    return 그대로 ? [] : [{ id: m.id, 판: 이긴판읽기(자료, 입력.트리, 폴더, m.plan) }];
  });
  const 못채움 = 작전들.filter((x) => !다채웠나(x.판));
  if (작전들.length === 0) return '';
  const 낱 = 못채움.slice(0, 번호상한).map((x) => `${x.id} ${x.판.짐 > 0 ? '짐' : `${String(x.판.이김)}/${String(채울판)}`}`).join(' · ');
  return ` · 이기는 미션 ${String(작전들.length)}개 가운데 ${String(채울판)}판을 못 채운 것 ${String(못채움.length)}개${못채움.length === 0 ? '' : `(${낱})`}`;
}

/**
 * 자식 뒤 — 케이스 목록 파일의 미션 절을 읽어 PR 본문 머리 줄을 돌려준다. 절이 없으면 줄도 없다.
 * 공식 빈칸 · 미션도 테스트도 없는 규칙은 번호까지 싣는다 — 이전 버전의 「미션 승인」 탭 경고를 사람이 PR 에서 본다. 어떻게 끝나도 던지지 않는다
 */
export function 미션줄(입력: { 트리: string; 서비스: string; 케이스폴더: string; 원장값: 원장 | { 없음: string }; 기준?: 기준결정; 비밀: readonly string[]; 자료?: string; 기준표글?: string; 바뀐?: readonly string[] | null }): string[] {
  try {
    const 표글 = 안전히읽기(join(입력.트리, 'docs', 'cases'), `${입력.서비스}.md`, 글상한);
    const 읽음 = 표글 === null ? null : 미션절읽기(표글);
    if (표글 === null || 읽음 === null) return [];
    const 글 = 케이스글들읽기(입력.케이스폴더);
    const 빠짐 = 빠진규칙(입력.원장값, 표글, 입력.기준, 읽음.items, 글 === undefined ? undefined : tcId들(글));
    const 못읽음글 = 읽음.못읽음.length === 0 ? '' : ` · 못 읽은 미션 ${String(읽음.못읽음.length)}개(${읽음.못읽음.slice(0, 3).join(' / ')})`;
    const 줄 = `게임 시나리오 미션: ${String(읽음.items.length)}개 · 공식 빈칸 ${String(읽음.gaps.length)}개${번호들(읽음.gaps.map((g) => g.reqId))} · 미션도 테스트도 없는 규칙 ${String(빠짐.length)}개${번호들(빠짐.map((b) => b.reqId))}${못읽음글}${못채운글(입력, 읽음.items)}`;
    return [계정섞였나([줄], 입력.비밀) ? '게임 시나리오 미션: 줄에 테스트 계정 비밀번호가 들어 있어 뺌' : 줄];
  } catch (e) {
    return [`게임 시나리오 미션: 못 읽음 — ${e instanceof Error ? e.message : String(e)}`];
  }
}
