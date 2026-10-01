// 케이스 고치기(EDIT · 원본이 EDIT 인 재실행)를 처리하는 껍데기 — 자식(Claude) 없이 GitHub main 사본에 고칠 것을 적고
// 타입 · 케이스 규칙 검사만 거쳐 author-<뿌리> 에 초안 PR 을 올린다 (도메인/작성 §3.6 「★ 케이스 고치기」).
// 판단은 위쪽 순수 함수와 authoring-edit-apply 에 있고 검사도 거기 붙어 있다. authoring-run 이 300줄에 닿아 따로 둔다

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { 고치기상한 } from '../apps/admin/src/authoring/edit.js';
import type { 집은것 } from './authoring-rules.js';
import { 자료출처 } from './authoring-assets.js';
import { type 고칠것, type 기대값, 편집PR본문, 편집계산 } from './authoring-edit-apply.js';
import {
  PR만들기인자,
  PR본문고치기인자,
  PR찾기인자,
  push실패,
  덮어쓸수없는까닭,
  올린파일인자,
  커밋뒤거부사유,
  커밋메시지,
  커밋수인자,
  푸시거부사유,
  푸시인자,
} from './authoring-chain.js';
import { type 계정, type 사본, 사본환경, 파일거부사유 } from './authoring-copy.js';
import { 모양보기, 사본만들기, 사본치우기, 자식거두기, 트리실제 } from './authoring-child.js';
import { type 보고손, type 판정기, 다시하며, 돌린다, 진짜main묻기, 친다 } from './authoring-io.js';
import { 도는번호 } from './authoring-keeping.js';
import { 적용 } from './authoring-held-merge.js';

/**
 * 고치기 실행인가. edits 모양이 틀린 케이스 고치기 행도 여기로 와 실패로 닫힌다 —
 * 자식 경로로 가면 자료 없는 행으로 claude 를 띄우려 든다
 */
export function 고치기실행인가(것: { kind: string; edits?: unknown }): boolean {
  return 것.kind === 'EDIT' || 것.edits !== undefined;
}

function 묶음인가(값: unknown): 값 is Record<string, unknown> {
  return typeof 값 === 'object' && 값 !== null && !Array.isArray(값);
}

function 기대값인가(값: unknown): 값 is 기대값 {
  return typeof 값 === 'string' || typeof 값 === 'boolean' || (typeof 값 === 'number' && Number.isFinite(값));
}

const 키들 = new Set(['tcId', 'delete', 'expected', 'confirm']);

function 한줄모양(e: unknown): 고칠것 | null {
  // tcId 는 PR 본문 줄에 그대로 실린다 — 줄바꿈이 섞이면 가짜 줄을 끼운다
  if (!묶음인가(e) || typeof e.tcId !== 'string' || !/^\S+$/.test(e.tcId)) return null;
  if (Object.keys(e).some((k) => !키들.has(k))) return null;
  // 지우기는 다른 고침과 섞지 않는다 — 지운 파일에 기대값을 쓸 수 없다
  if ('delete' in e) return e.delete === true && Object.keys(e).length === 2 ? { tcId: e.tcId, delete: true } : null;
  if (!('expected' in e) && !('confirm' in e)) return null;
  const 고침: { tcId: string; expected?: Record<string, 기대값>; confirm?: true } = { tcId: e.tcId };
  if ('expected' in e) {
    const 기대 = e.expected;
    if (!묶음인가(기대) || Object.keys(기대).length === 0 || !Object.values(기대).every(기대값인가)) return null;
    고침.expected = 기대 as Record<string, 기대값>;
  }
  if ('confirm' in e) {
    if (e.confirm !== true) return null;
    고침.confirm = true;
  }
  return 고침;
}

/**
 * 집은 것에서 고칠 내용을 꺼낸다. 칸 규칙(스키마 · 비밀번호)은 서버가 이미 봤다 — 여기는 모양만 다시 본다.
 * 서버와 에이전트의 판이 어긋나도 엉뚱한 것을 고치지 않게. 상한은 서버 것을 그대로 쓴다(명세가 숫자를 두 곳에만 둔다)
 */
export function 편집들(것: unknown): 고칠것[] | null {
  const edits = 묶음인가(것) ? 것.edits : undefined;
  if (!Array.isArray(edits) || edits.length === 0 || edits.length > 고치기상한) return null;
  const 본것 = new Set<string>();
  const 모은것: 고칠것[] = [];
  for (const e of edits) {
    const 하나 = 한줄모양(e);
    // 같은 tcId 가 두 번 오면 서버도 거절한다 — 지우고 고치는 순서에 따라 결과가 갈린다
    if (하나 === null || 본것.has(하나.tcId)) return null;
    본것.add(하나.tcId);
    모은것.push(하나);
  }
  return 모은것;
}

export function 편집PR제목(뿌리: number, 서비스: string): string {
  return `[WS-작성] ${서비스} 케이스 고치기 ${뿌리}번`;
}

/**
 * 타입 · 케이스 규칙 검사를 돌리는 환경. 부모 것을 안 싣는다 — 자리 uid 의 남은 것이 /proc 로 에이전트 토큰을 읽는다.
 * 맥(자리 uid 없음)은 집과 임시를 그대로 둔다 — authoring-run · 보류 반영과 같다
 */
export function 검사환경(
  부모: Record<string, string | undefined>,
  자리: { 집: string; 임시: string },
  자리uid로: boolean,
): Record<string, string> {
  return {
    PATH: 부모.PATH ?? '/usr/local/bin:/usr/bin:/bin',
    HOME: 자리uid로 ? 자리.집 : (부모.HOME ?? 자리.집),
    TMPDIR: 자리uid로 ? 자리.임시 : (부모.TMPDIR ?? '/tmp'),
  };
}

/** 사람이 화면에서 읽는 실패 까닭 — 검사 출력의 마지막 몇 줄이 무엇이 틀렸는지를 말한다 */
export function 검사실패글(설명: string, r: { 코드: number | null; 낸것: string; 오류: string; 시간초과: boolean }): string {
  const 끝줄 = `${r.낸것}\n${r.오류}`.split('\n').filter((줄) => 줄.trim() !== '').slice(-3).join(' / ');
  return `${설명}가 실패했다 (${r.시간초과 ? '시간 초과' : `종료 ${String(r.코드)}`}): ${끝줄}`;
}

// ── 껍데기 ────────────────────────────────────────────────────────────

/** 켤 때 정한 판 가운데 고치기가 쓰는 것 */
export interface 고치기판 {
  판정: 판정기;
  바탕: string;
  원천: string;
  원격주소: string;
}

interface 고칠자리 {
  자리: 사본;
  기준: string;
  서비스: string;
  폴더: string;
  자식: 계정 | null;
  판정: 판정기;
  /** 브랜치 · 커밋의 번호. 다시 적용(RERUN)이면 원본 고치기 행이다 — 같은 author-<뿌리> 를 덮어쓴다 */
  뿌리: number;
  번호: number;
}

/**
 * 고치기 실행 한 건. 사본은 늘 치운다 — 이어하기가 없다(다시 적용은 새 main 에서 처음부터 계산한다).
 * 예외는 `닫으며` 가 FAILED 로 닫는다
 */
export async function 편집처리(
  손: 보고손,
  것: 집은것,
  서비스: string,
  판: 고치기판,
  자식: 계정 | null,
  폴더: string,
): Promise<void> {
  const edits = 편집들(것);
  if (edits === null) {
    await 손.끝내기({ status: 'FAILED', error: '고칠 내용(edits)의 모양이 틀렸다 — 서버와 에이전트의 판이 어긋났을 수 있다' });
    return;
  }
  await 손.단계('케이스를 고치는 중');
  // 훑기가 도는 건의 사본을 지우지 않게
  도는번호.add(것.id);
  let 자리: 사본 | null = null;
  try {
    // 기준은 GitHub 이 말하는 main 이다. 서버 저장소의 origin/main 은 옛 판일 수 있다
    const 메인 = 진짜main묻기(판.원천);
    if ('까닭' in 메인) return void (await 손.끝내기({ status: 'FAILED', error: 메인.까닭 }));
    const 만든것 = await 사본만들기(것.id, 판.바탕, 판.원천, 판.원격주소, 메인.sha, 자식);
    if ('까닭' in 만든것) return void (await 손.끝내기({ status: 'FAILED', error: 만든것.까닭 }));
    자리 = 만든것.자리;
    const 고칠 = { 자리, 기준: 메인.sha, 서비스, 폴더, 자식, 판정: 판.판정, 뿌리: 자료출처(것), 번호: 것.id };
    await 고치고올리기(손, 고칠, edits);
  } finally {
    // 못 거뒀으면 손대지 않는다 — 살아 있는 것이 지우는 도중 폴더를 링크로 바꿔 트리 밖을 지우게 할 수 있다
    if (자리 !== null && (await 자식거두기(자식))) 사본치우기(자리);
    도는번호.delete(것.id);
  }
}

async function 고치고올리기(손: 보고손, 판: 고칠자리, edits: 고칠것[]): Promise<void> {
  const { 자리, 기준 } = 판;
  const 실패 = async (까닭: string) => void (await 손.끝내기({ status: 'FAILED', error: 까닭 }));
  const 깃환경 = 사본환경(자리);
  const 트리에서 = (명령: string, 인자: string[]) => 친다(명령, 인자, 자리.트리, undefined, 120_000, { env: 깃환경 });

  // 추적된 것만 읽는다. 읽기는 링크를 따라가므로 모양을 먼저 본다 — 트리 밖을 가리키는 것은 main 의 것이라도 안 읽는다
  const 추적 = 트리에서('git', ['ls-files', '-z', '--', `tests/${판.폴더}`]);
  if (!추적.ok) return 실패(`케이스 목록을 못 읽었다: ${추적.까닭}`);
  const 실제 = 트리실제(자리);
  const 읽기 = (f: string): { 경로: string; 글: string }[] => {
    const 모양 = 모양보기(자리.트리, f);
    if (모양.종류 !== '파일' || 파일거부사유([모양], 실제) !== null) return [];
    return [{ 경로: f, 글: readFileSync(join(자리.트리, f), 'utf8') }];
  };
  const 케이스들 = 추적.낸것.split('\0').filter((f) => f.endsWith('.spec.ts')).flatMap(읽기);
  const 계산 = 편집계산(케이스들, 읽기(join('docs', 'cases', `${판.서비스}.md`))[0] ?? null, edits);
  if ('사유' in 계산) return 실패(계산.사유);

  // 올리는 것은 tests/** · docs/cases/*.md 뿐 — 판정 규칙은 cases-only.mjs 가 정본이고 켤 때 고정한 판으로 본다
  const 파일들 = [...계산.쓰기.keys(), ...계산.지우기];
  const 거부 = 푸시거부사유(판.판정(파일들, 기준, 자리.트리, 깃환경), 파일들);
  if (거부 !== null) return 실패(거부);
  const 적을것 = { 쓰기: 계산.쓰기, 지우기: 계산.지우기 };
  const 먼저 = 적용(자리, 적을것);
  if (먼저 !== null) return 실패(먼저);

  // 케이스는 돌리지 않는다 — 기대값이 기획 기준이면 지금 화면이 틀려 실패할 수 있고, 그 실패가 곧 버그 신호다 (게이트 0)
  await 손.단계('검사하는 중');
  const 환경 = 검사환경(process.env, 자리, 판.자식 !== null);
  const 검사들: [string[], string][] = [
    [['run', 'typecheck'], '타입 검사'],
    [['run', 'check:tests', '--', '--no-held'], '케이스 규칙 검사'],
  ];
  for (const [인자, 설명] of 검사들) {
    const r = await 돌린다('npm', 인자, { cwd: 자리.트리, env: 환경, uid: 판.자식?.uid, gid: 판.자식?.gid, 제한: 600_000 });
    if (r.코드 !== 0) return 실패(검사실패글(설명, r));
  }

  // 검사가 남긴 것을 거두고 계산한 글만 다시 쓴다 — 검사 도중 바뀐 글을 올리지 않는다
  if (!(await 자식거두기(판.자식))) return 실패('검사가 남긴 프로세스를 거두지 못했다 — 올리지 않는다');
  const 다시 = 적용(자리, 적을것);
  if (다시 !== null) return 실패(다시);
  await 손.단계('올리는 중');
  // 제목은 에이전트 커밋 모양 그대로 — 다시 적용 · 다시 작성의 덮어쓰기 검사가 에이전트 것으로 읽는다
  for (const 인자 of [['add', '-A', '--', ...파일들], ['commit', '-q', '-m', 커밋메시지(판.뿌리, 판.서비스)]]) {
    const r = 트리에서('git', 인자);
    if (!r.ok) return 실패(`커밋을 못 만들었다: ${r.까닭}`);
  }
  // push 는 HEAD 라 커밋한 뒤 진짜 main 과의 차이 전체를 다시 본다 — 커밋 하나 · 케이스만이어야 한다
  const 올린것 = 트리에서('git', 올린파일인자(기준));
  const 커밋수 = 트리에서('git', 커밋수인자(기준));
  const 전체 = 올린것.낸것.split('\n').filter((f) => f !== '');
  const 뒤거부 =
    올린것.ok && 커밋수.ok
      ? 커밋뒤거부사유(판.판정(전체, 기준, 자리.트리, 깃환경), 전체, Number(커밋수.낸것.trim()))
      : '커밋한 뒤 차이를 못 읽었다';
  if (뒤거부 !== null) return 실패(뒤거부);

  // 사람이 올린 커밋이 머리에 있으면 덮어쓰지 않는다 (§7 「실행 기록」)
  const 올림 = await 다시하며('push', () => {
    const 남의것 = 덮어쓸수없는까닭(트리에서, 판.뿌리);
    if (남의것 !== null) return 남의것;
    const r = 트리에서('git', 푸시인자(판.뿌리));
    return r.ok ? { 값: true } : push실패(r);
  });
  if ('까닭' in 올림) return 실패(`push 가 실패했다: ${올림.까닭}`);

  // 재시도 전에 먼저 찾는다 — 만들기가 GitHub 에선 됐는데 답만 잃었으면 또 만들어 PR 이 둘이 된다. 다시 적용은 열린 PR 의 본문을 바꾼다
  const 본문 = 편집PR본문(계산.줄들);
  const PR = await 다시하며('PR 만들기', () => {
    const 있나 = 트리에서('gh', PR찾기인자(판.뿌리));
    const 있는것 = 있나.ok ? (JSON.parse(있나.낸것 || '[]') as { url: string }[])[0]?.url : undefined;
    if (있는것 !== undefined) {
      if (!트리에서('gh', PR본문고치기인자(있는것, 본문)).ok) console.error(`[작성] ${판.번호}번 PR 본문을 못 고쳤다 — 옛 본문이 남는다`);
      return { 값: 있는것 };
    }
    const r = 트리에서('gh', PR만들기인자(판.뿌리, 편집PR제목(판.뿌리, 판.서비스), 본문));
    const 주소 = r.낸것.trim().split('\n').pop() ?? '';
    return r.ok && 주소.startsWith('https://') ? { 값: 주소 } : { 까닭: r.까닭 || 'PR 주소가 안 찍혔다' };
  });
  if ('까닭' in PR) return 실패(`PR 을 못 만들었다: ${PR.까닭}`);
  await 손.끝내기({ status: 'DONE', prUrl: PR.값 });
}
