// 반영 때 보류 값을 적고 관문(타입 · K 규칙 · 3회 실행)을 돌려 자기 author-<뿌리> 에 올리는 껍데기 (도메인/작성 §3.6 「★ 보류 케이스」 반영)
// 판단은 authoring-held-apply 의 순수 함수에 있다. authoring-merge 가 300줄을 넘지 않게 뗐다

import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { 집은것 } from './authoring-rules.js';
import { 덮어쓸수없는까닭, 커밋메시지 } from './authoring-chain.js';
import { type 계정, type 사본, 사본환경, 파일거부사유 } from './authoring-copy.js';
import { 모양보기, 사본만들기, 사본치우기, 자식거두기, 트리실제 } from './authoring-child.js';
import { type 보고손, 돌린다, 쉬기, 친다 } from './authoring-io.js';
import { 도는번호 } from './authoring-keeping.js';
import { 계정섞였나, 대상점검, 대상환경, 사유거르기 } from './authoring-reverse.js';
import {
  type 보류입력,
  값적기,
  반영커밋인가,
  반영표시,
  반영푸시인자,
  보류남음,
  비밀칸들,
  새머리판정,
  실패문장들,
  실행입력,
  케이스tcId,
  표고치기,
} from './authoring-held-apply.js';

/** 머지 한 건이 반영에 쓰는 것. `자식` 은 그 머지가 잡은 자리의 uid 다(맥이면 null) */
export interface 반영준비 {
  것: 집은것;
  서비스: string;
  판: { 바탕: string; 원천: string; 원격주소: string };
  자식: 계정 | null;
}

export function 보류입력들(것: 집은것): unknown {
  return (것 as { held?: unknown }).held;
}

/** 적은 뒤 쓸 글 — 3회 실행 뒤 트리를 되돌리고 이것만 다시 써서 커밋한다(케이스 코드가 돌며 바꾼 것은 안 올린다) */
export interface 쓸것 {
  쓰기: Map<string, string>;
  지우기: string[];
}

function 케이스들(트리: string): { 경로: string; 글: string }[] {
  const 뿌리 = join(트리, 'tests');
  if (!existsSync(뿌리)) return [];
  return readdirSync(뿌리, { recursive: true, encoding: 'utf8' })
    .filter((p) => p.endsWith('.spec.ts') && 모양보기(트리, join('tests', p)).종류 === '파일')
    .map((p) => ({ 경로: join('tests', p), 글: readFileSync(join(뿌리, p), 'utf8') }));
}

/** 넣은 값이 비밀번호 원문이면 거절한다 — 사람이 값 칸에 계정을 적으면 그대로 코드에 박혀 저장소로 나간다 */
export const 비밀거절 = '넣은 값에 테스트 계정 비밀번호가 들어 있어 올리지 않았다';

export function 계산(
  트리: string,
  서비스: string,
  held: Record<string, 보류입력>,
  비밀: string | null | undefined,
): 쓸것 | { 사유: string } {
  const 모두 = 케이스들(트리);
  const 쓰기 = new Map<string, string>();
  const 지우기: string[] = [];
  for (const [tcId, 입력] of Object.entries(held)) {
    const 파일 = 모두.find((f) => 케이스tcId(f.글) === tcId);
    if (파일 === undefined) return { 사유: `${tcId} 케이스 파일을 못 찾았다` };
    if (입력.removed === true) {
      지우기.push(파일.경로);
      continue;
    }
    const r = 값적기(파일.글, 입력);
    if ('사유' in r) return { 사유: `${tcId}: ${r.사유}` };
    쓰기.set(파일.경로, r.글);
  }
  const 표 = join('docs', 'cases', `${서비스}.md`);
  const 제거 = Object.entries(held).flatMap(([id, 입력]) => (입력.removed === true ? [id] : []));
  if (제거.length > 0 && existsSync(join(트리, 표))) 쓰기.set(표, 표고치기(readFileSync(join(트리, 표), 'utf8'), 제거));
  // ⒝ — 입력에 없던 보류까지 본다. 남으면 값 없이 건너뛰는 케이스가 main 에 들어간다
  const 남음 = 모두
    .filter((f) => !지우기.includes(f.경로))
    .filter((f) => 보류남음(쓰기.get(f.경로) ?? f.글))
    .map((f) => 케이스tcId(f.글) ?? f.경로);
  if (남음.length > 0) return { 사유: `보류 표시가 남아 병합하지 않는다: ${남음.join(' · ')}` };
  if (계정섞였나([...쓰기.values()], 비밀)) return { 사유: 비밀거절 };
  return { 쓰기, 지우기 };
}

export function 적용(자리: 사본, 쓸: 쓸것): string | null {
  const 트리 = 자리.트리;
  // 쓰기 · 지우기는 링크를 따라간다 — 케이스 코드가 돌며 폴더를 링크로 바꿔 두면 트리 밖에 쓰거나 지운다
  const 거부 = 파일거부사유([...쓸.쓰기.keys(), ...쓸.지우기].map((f) => 모양보기(트리, f)), 트리실제(자리));
  if (거부 !== null) return 거부;
  for (const [f, 글] of 쓸.쓰기) writeFileSync(join(트리, f), 글);
  for (const f of 쓸.지우기) rmSync(join(트리, f), { force: true });
  return null;
}

/** 3회 실행까지의 환경. 부모 것은 안 싣는다 — 케이스 코드는 자식이 쓴 것이라 에이전트 토큰을 읽게 두지 않는다 */
function 관문환경(자리: 사본, 자식: 계정 | null, 비밀칸: string[], 준비: 반영준비): Record<string, string> {
  const p = process.env;
  const t = 준비.것.target;
  return {
    PATH: p.PATH ?? '/usr/local/bin:/usr/bin:/bin',
    // 맥은 집을 안 바꾼다 — 바꾸면 Playwright 가 ~/Library/Caches 의 브라우저를 못 찾는다 (authoring-run 과 같다)
    HOME: 자식 === null ? (p.HOME ?? 자리.집) : 자리.집,
    TMPDIR: 자식 === null ? (p.TMPDIR ?? '/tmp') : 자리.임시,
    ...(p.PLAYWRIGHT_BROWSERS_PATH ? { PLAYWRIGHT_BROWSERS_PATH: p.PLAYWRIGHT_BROWSERS_PATH } : {}),
    ...(t === undefined ? {} : { ...대상환경(t), ...실행입력(t, 비밀칸) }),
  };
}

/**
 * 값을 적고 관문을 돌려 커밋까지 한다. null 이면 이미 FAILED 로 끝냈다. 작업방은 `반영치우기` 가 치운다.
 * 자리는 **자식이 끝낸 커밋** — 머리가 앞 반영의 값 커밋이면 그 부모로 간다(명세 「실패하면」)
 */
export async function 보류반영(
  손: 보고손,
  준비: 반영준비,
  held: Record<string, 보류입력>,
  뿌리: number,
  머리: string,
): Promise<사본 | null> {
  const 비밀 = 준비.것.target?.loginPassword;
  const 실패 = async (까닭: string) => (await 손.끝내기({ status: 'FAILED', error: 사유거르기(까닭, 비밀) }), null);
  const 채움 = Object.values(held).some((입력) => 입력.removed !== true);
  const 대상사유 = 채움 ? (준비.것.target === undefined ? '반영할 대상 서버가 없다' : 대상점검(준비.것.target)) : null;
  if (대상사유 !== null) return 실패(대상사유);

  await 손.단계('보류 값을 적는 중');
  // 훑기가 도는 반영의 작업방을 지우지 않게 — 3회 실행은 한 시간 훑기 간격에 걸칠 수 있다
  도는번호.add(준비.것.id);
  const 만든것 = await 사본만들기(준비.것.id, 준비.판.바탕, 준비.판.원천, 준비.판.원격주소, 머리, 준비.자식);
  if ('까닭' in 만든것) {
    도는번호.delete(준비.것.id);
    return 실패(만든것.까닭);
  }
  const 자리 = 만든것.자리;
  const 깃 = (인자: string[]) => 친다('git', 인자, 자리.트리, undefined, 120_000, { env: 사본환경(자리) });
  const 그만 = async (까닭: string) => (await 반영치우기(자리, 준비.것.id, 준비.자식), 실패(까닭));

  const 본문 = 깃(['log', '-1', '--format=%B']);
  if (!본문.ok) return 그만(`머리 커밋을 못 읽었다: ${본문.까닭}`);
  if (반영커밋인가(본문.낸것) && !깃(['-c', 'core.hooksPath=/dev/null', 'checkout', '-q', '--detach', '-f', 'HEAD~1']).ok) {
    return 그만('앞 반영 커밋의 부모로 못 갔다');
  }
  const 쓸 = 계산(자리.트리, 준비.서비스, held, 비밀);
  if ('사유' in 쓸) return 그만(쓸.사유);
  const 먼저 = 적용(자리, 쓸);
  if (먼저 !== null) return 그만(먼저);

  const 채운파일 = [...쓸.쓰기.keys()].filter((f) => f.endsWith('.spec.ts'));
  const 환경 = 관문환경(자리, 준비.자식, [...new Set(채운파일.flatMap((f) => 비밀칸들(쓸.쓰기.get(f) ?? '')))], 준비);
  const 관문들: [string, string[], string, number][] = [
    ['npm', ['run', 'typecheck'], '타입 검사', 600_000],
    ['npm', ['run', 'check:tests', '--', '--no-held'], '케이스 규칙 검사', 600_000],
  ];
  if (채운파일.length > 0) {
    await 손.단계('채운 케이스를 3회 돌리는 중');
    관문들.push(['npx', ['playwright', 'test', ...채운파일, '--project=desktop', '--repeat-each=3', '--reporter=json'], '3회 실행', 1_800_000]);
  }
  for (const [명령, 인자, 설명, 제한] of 관문들) {
    const r = await 돌린다(명령, 인자, { cwd: 자리.트리, env: 환경, uid: 준비.자식?.uid, gid: 준비.자식?.gid, 제한 });
    if (r.코드 === 0) continue;
    const 문장들 = 설명 === '3회 실행' ? 실패문장들(r.낸것) : null;
    const 끝줄 = `${r.낸것}\n${r.오류}`.trim().split('\n').filter((줄) => 줄.trim() !== '').slice(-3).join(' / ');
    return 그만(
      문장들 !== null && 문장들.length > 0
        ? `3회 실행에서 실패했다 — ${문장들.join(' · ')}`
        : `${설명}가 실패했다 (${r.시간초과 ? '시간 초과' : `종료 ${String(r.코드)}`}): ${끝줄}`,
    );
  }

  // 커밋 전에 케이스 코드가 남긴 것을 모두 죽이고 트리를 되돌린 뒤 계산한 글만 다시 쓴다
  if (!(await 자식거두기(준비.자식))) return 그만('3회 실행이 남긴 프로세스를 거두지 못했다 — 올리지 않는다');
  if (!깃(['reset', '-q', '--hard']).ok) return 그만('트리를 되돌리지 못했다');
  const 다시 = 적용(자리, 쓸);
  if (다시 !== null) return 그만(다시);
  const 메시지 = 커밋메시지(뿌리, 준비.서비스);
  if (계정섞였나([메시지], 비밀)) return 그만(비밀거절);
  for (const 인자 of [
    ['add', '-A', '--', ...쓸.쓰기.keys(), ...쓸.지우기],
    // 제목은 에이전트 커밋 모양 그대로 — 이어하기·덮어쓰기 검사가 에이전트 것으로 읽는다
    ['commit', '-q', '-m', 메시지, '-m', 반영표시],
  ]) {
    const r = 깃(인자);
    if (!r.ok) return 그만(`값 커밋을 못 만들었다: ${r.까닭}`);
  }
  return 자리;
}

/**
 * 자기 브랜치에 읽은 머리일 때만 덮어쓰고, PR 을 다시 읽어 **새 머리 SHA** 를 낸다. null 이면 FAILED 로 끝냈다.
 * 옛 머리로 CI 를 기다리면 옛 커밋의 초록으로 병합한다 (명세 반영 8)
 */
export async function 반영올리기(
  손: 보고손,
  자리: 사본,
  뿌리: number,
  옛머리: string,
  prUrl: string,
  cwd: string,
): Promise<string | null> {
  const 실패 = async (까닭: string) => (await 손.끝내기({ status: 'FAILED', error: 까닭 }), null);
  const 깃 = (명령: string, 인자: string[]) => 친다(명령, 인자, 자리.트리, undefined, 120_000, { env: 사본환경(자리) });
  const 올린 = 깃('git', ['rev-parse', 'HEAD']).낸것.trim();
  const 남의것 = 덮어쓸수없는까닭(깃, 뿌리);
  if (남의것 !== null) return 실패(남의것.까닭);
  const r = 깃('git', 반영푸시인자(뿌리, 옛머리));
  if (!r.ok) return 실패(`값 커밋을 못 올렸다: ${r.까닭}`);
  for (let 시도 = 0; 시도 < 10; 시도 += 1) {
    const 뷰 = 친다('gh', ['pr', 'view', prUrl, '--json', 'headRefOid'], cwd);
    if (뷰.ok) {
      const 판정 = 새머리판정(옛머리, 올린, (JSON.parse(뷰.낸것) as { headRefOid: string }).headRefOid);
      if ('sha' in 판정) return 판정.sha;
      if ('사유' in 판정) return 실패(판정.사유);
    }
    await 쉬기(3_000);
  }
  return 실패('올린 뒤 PR 머리가 새 커밋으로 안 바뀌었다 — 옛 커밋으로 병합하지 않는다');
}

export async function 반영치우기(자리: 사본, 번호: number, 자식: 계정 | null): Promise<void> {
  // 못 거뒀으면 손대지 않는다 — 살아 있는 것이 지우는 도중 폴더를 링크로 바꿔 트리 밖을 지우게 할 수 있다
  if (await 자식거두기(자식)) 사본치우기(자리);
  도는번호.delete(번호);
}
