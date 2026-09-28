// 멈춘 작성의 작업 폴더를 남기고 넘겨받고 훑는 껍데기 (SPEC 도메인/작성 §7 「이어하기」). 판단은 authoring-keep.ts 의 순수 함수에 있다

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { 집은것 } from './authoring-rules.js';
import { type 계정, type 사본, 남은사본, 사본자리 } from './authoring-copy.js';
import { 사본만들기, 사본치우기, 새집 } from './authoring-child.js';
import { type 보고손, 멈춤, 부른다, 진짜main묻기, 친다 } from './authoring-io.js';
import { 케이스파일들 } from './authoring-progress.js';
import {
  type 보관,
  type 서버답,
  보관글,
  보관이름,
  보관읽기,
  이어받을폴더,
  잠그기명령,
  넘겨받기명령,
  훑기판정,
} from './authoring-keep.js';

/** 지금 이 에이전트가 잡은 요청 번호 — 훑기가 도는 건의 폴더를 안 건드린다 */
export const 도는번호 = new Set<number>();

/** 새 실행에 쓸 작업방 — 새로 만들었거나 멈춘 요청에서 넘겨받았다 */
export interface 작업방 {
  자리: 사본;
  기준: string;
  /** 처음 사본에 있던 케이스 — 진척의 「새 케이스」를 누적으로 센다 */
  옛케이스: Set<string>;
  /** 넘겨받았으면 앞 실행이 멈춘 까닭 — 자식의 이어하기 절에 싣는다 */
  이어하기?: { 번호: number; 이유: string | null; 까닭: string | null };
}

function 보관가져오기(자리: 사본): 보관 | null {
  const 파일 = join(자리.뿌리, 보관이름);
  return existsSync(파일) ? 보관읽기(readFileSync(파일, 'utf8')) : null;
}

/** 뿌리는 root 0755 라 자식이 못 쓴다. 비밀값이 없어 읽기는 열어 둔다 */
function 보관쓰기(자리: 사본, 값: 보관): void {
  writeFileSync(join(자리.뿌리, 보관이름), 보관글(값), { mode: 0o644 });
}

function 명령들(목록: { 명령: string; 인자: string[] }[], 자리: 사본): string | null {
  for (const c of 목록) {
    const r = 친다(c.명령, c.인자, 자리.뿌리, undefined, 120_000);
    if (!r.ok) return `${c.명령} ${c.인자.slice(0, 2).join(' ')} — ${r.까닭}`;
  }
  return null;
}

/**
 * 멈춘 채 끝난 건의 폴더를 남긴다 — 자식을 거둔 뒤 root 로 잠그고 보관 끝을 적는다.
 * 못 잠그면 지운다: 같은 자리 uid 를 받은 다음 건이 7일 동안 읽게 두느니 이어가기를 잃는 편이 낫다
 */
export function 보관하기(자리: 사본, 자식: 계정 | null): void {
  const 표시 = 보관가져오기(자리);
  const 못함 = 표시 === null ? '보관 표시가 없다' : 명령들(잠그기명령(자리, 자식), 자리);
  if (표시 === null || 못함 !== null) {
    console.error(`[정리] ${자리.뿌리} 를 보관하지 못해 지운다: ${못함 ?? ''}`);
    사본치우기(자리);
    return;
  }
  보관쓰기(자리, { ...표시, 끝: true });
  console.log(`[보관] ${자리.뿌리} — 멈춘 자리부터 이어서 작성할 수 있게 남겼다`);
}

/** 폴더를 옮긴다. 그 사이 다른 훑기가 지웠으면 false — 부르는 쪽이 처음부터 만든다 */
function 옮기기(옛: string, 새: string): boolean {
  try {
    rmSync(새, { recursive: true, force: true });
    renameSync(옛, 새);
    return true;
  } catch (err) {
    console.error(`[보관] ${옛} 를 넘겨받지 못해 처음부터 한다: ${String(err)}`);
    return false;
  }
}

/** 이어받은 사슬 — 가까운 중단 요청부터. 멈춘 까닭은 가장 가까운 것 */
async function 사슬읽기(
  주소기지: string,
  토큰: string,
  서비스: string,
  시작: number,
): Promise<{ 번호: number; 이유: string | null; 까닭: string | null }[]> {
  const 사슬: { 번호: number; 이유: string | null; 까닭: string | null }[] = [];
  let 번호: number | null = 시작;
  // 사슬이 끝없이 이어질 리 없지만 서버가 틀린 값을 주면 여기서 멈춘다
  while (번호 !== null && 사슬.length < 20) {
    const 답 = await 부른다(주소기지, 토큰, `/authoring/requests/${번호}?service=${encodeURIComponent(서비스)}`);
    if (답.status !== 200) break;
    const 몸 = 답.몸 as { stopReason?: string | null; error?: string | null; resumeFrom?: number | null };
    사슬.push({ 번호, 이유: 몸.stopReason ?? null, 까닭: 몸.error ?? null });
    번호 = typeof 몸.resumeFrom === 'number' ? 몸.resumeFrom : null;
  }
  return 사슬;
}

/**
 * 한 건의 작업방을 준비한다. 이어서 작성이면 보관 폴더를 넘겨받고, 없으면 처음부터 만든다.
 * null 이면 이미 FAILED 로 끝냈다
 */
export async function 작업방준비(
  주소기지: string,
  토큰: string,
  서비스: string,
  것: 집은것,
  판: { 바탕: string; 원천: string; 원격주소: string },
  자식: 계정 | null,
  케이스폴더: string,
  손: 보고손,
): Promise<작업방 | null> {
  if (typeof 것.resumeFrom === 'number') {
    const 사슬 = await 사슬읽기(주소기지, 토큰, 서비스, 것.resumeFrom);
    const 폴더들 = new Map(사슬.map((c) => [c.번호, 보관가져오기(사본자리(c.번호, 판.바탕))] as const));
    const 고른 = 이어받을폴더(
      사슬.map((c) => c.번호),
      폴더들,
    );
    const 멈춘것 = 사슬[0];
    const 자리 = 사본자리(것.id, 판.바탕);
    if (고른 !== null && 멈춘것 !== undefined && 옮기기(사본자리(고른, 판.바탕).뿌리, 자리.뿌리)) {
      const 표시 = 폴더들.get(고른)!;
      // 넘겨받는 동안 훑기가 보면 도는 건이다 — 끝을 먼저 내린다
      보관쓰기(자리, { ...표시, 끝: false });
      새집(자리);
      const 못함 = 명령들(넘겨받기명령(자리, 표시.기준, 자식), 자리);
      if (못함 !== null) {
        사본치우기(자리);
        await 손.끝내기({ status: 'FAILED', error: `보관한 작업방을 넘겨받지 못했다: ${못함}` });
        return null;
      }
      return {
        자리,
        기준: 표시.기준,
        옛케이스: new Set(표시.옛케이스),
        이어하기: { 번호: 멈춘것.번호, 이유: 멈춘것.이유, 까닭: 멈춘것.까닭 },
      };
    }
    // 다른 기계였거나 7일이 지나 지워졌다. 그 사실을 사람이 보는 단계 글에 남긴다
    await 손.단계('보관한 작업방이 없어 처음부터 하는 중');
  }

  // 기준은 GitHub 이 말하는 main 이다. 서버 저장소의 origin/main 은 옛 판일 수 있다
  const 메인 = 진짜main묻기(판.원천);
  if ('까닭' in 메인) {
    await 손.끝내기({ status: 'FAILED', error: 메인.까닭 });
    return null;
  }
  const 만든것 = await 사본만들기(것.id, 판.바탕, 판.원천, 판.원격주소, 메인.sha, 자식);
  if ('까닭' in 만든것) {
    await 손.끝내기({ status: 'FAILED', error: 만든것.까닭 });
    return null;
  }
  const 옛케이스 = 케이스파일들(join(만든것.자리.트리, 'tests', 케이스폴더));
  // 사본을 만들자마자 쓴다 — 꺼지며 끊긴 건은 finally 가 안 돌아 이것만 남는다
  보관쓰기(만든것.자리, { 서비스, 기준: 메인.sha, 옛케이스: [...옛케이스], 끝: false });
  return { 자리: 만든것.자리, 기준: 메인.sha, 옛케이스 };
}

/** 서버 상세로 그 요청의 폴더를 남길지 묻는다. 403 은 배정이 빠진 서비스 — 이어갈 길이 없어 없는 것과 같다 */
async function 남길지묻기(주소기지: string, 토큰: string, 서비스: string, 번호: number): Promise<서버답> {
  try {
    const 답 = await 부른다(주소기지, 토큰, `/authoring/requests/${번호}?service=${encodeURIComponent(서비스)}`);
    if (답.status === 200) return 답.몸 as { keepWorkspace?: unknown };
    if (답.status === 404 || 답.status === 403) return 'NOT_FOUND';
    return 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

/**
 * 바탕에 남은 폴더를 훑는다 — 켤 때(멈춘것닫기 뒤)와 한 시간마다. 서버가 남기라는 것만 둔다.
 * 꺼지며 끊긴 건(보관 끝 없음)은 여기서 잠근다 — 그 자리 uid 의 프로세스는 이미 없다(켤 때) 또는 도는번호에 없다
 */
export async function 보관훑기(바탕: string, 주소기지: string, 토큰: string, 잠글자식: 계정 | null): Promise<void> {
  // 자식을 못 거둬 멈추는 중이면 손대지 않는다 — 살아남은 자식이 root 가 지우는 도중에 폴더를 링크로 바꿔
  // 트리 밖을 지우게 할 수 있다. 에이전트가 다시 켜지면(프로세스가 다 죽은 뒤) 켤 때 훑기가 한다 (2026-09-28 보안 검사)
  if (멈춤.까닭 !== null) return;
  mkdirSync(바탕, { recursive: true, mode: 0o755 });
  for (const 이름 of 남은사본(readdirSync(바탕))) {
    const 번호 = Number(이름.slice('author-'.length));
    const 자리 = 사본자리(번호, 바탕);
    const 표시 = 보관가져오기(자리);
    const 판정 = 훑기판정(
      번호,
      표시,
      도는번호,
      표시 === null ? 'NOT_FOUND' : await 남길지묻기(주소기지, 토큰, 표시.서비스, 번호),
    );
    if (판정 === '지운다') {
      사본치우기(자리);
      console.log(`[정리] 남은 사본을 지웠다: ${자리.뿌리}`);
    } else if (판정 === '잠근다') {
      보관하기(자리, 잠글자식);
    }
  }
}
