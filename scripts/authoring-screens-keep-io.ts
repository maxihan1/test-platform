// 화면 기록 저장본 디스크 일 — 자식을 띄우기 전에 자료 폴더로 넣고, 올릴 때 이번에 본 화면만 저장본에 간다 (도메인/작성 §3.6 「★ 역방향」 · 2026-10-04)
// 에이전트는 서버에서 root 로 돈다 — 자식 uid 가 손댈 수 있는 자료 폴더는 링크 · 큰 파일을 따라가지 않고 읽는다
import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { type 목록칸, 갈기, 이번것들, 저장본모양 } from './authoring-screens-keep.js';

const 접두사꼴 = /^[A-Z][A-Z0-9]{0,11}$/;
const 기록상한 = 200_000;
const 목록상한 = 2_000_000;

/** 저장 폴더 — 작업 바탕 아래 `screens/<접두사>`. 보관 훑기는 `author-<번호>` 만 보므로 안 건드린다 */
export function 저장폴더(바탕: string, 접두사: string): string | null {
  return 접두사꼴.test(접두사) ? join(바탕, 'screens', 접두사) : null;
}

/** 자리 안의 일반 파일만 읽는다 — 링크 · 하드링크 · 큰 파일 · 자리 밖을 가리키면 null */
function 안전히읽기(자리: string, 이름: string, 상한: number): string | null {
  const 파일 = join(자리, 이름);
  try {
    const 정보 = lstatSync(파일);
    if (!정보.isFile() || 정보.nlink !== 1 || 정보.size > 상한) return null;
    if (realpathSync(파일) !== join(realpathSync(자리), 이름)) return null;
    return readFileSync(파일, 'utf8');
  } catch {
    return null;
  }
}

/** 진짜 폴더인가(링크 아님) */
function 폴더인가(경로: string): boolean {
  const 정보 = lstatSync(경로, { throwIfNoEntry: false });
  return 정보 !== undefined && 정보.isDirectory() && !정보.isSymbolicLink();
}

/** 링크를 따라가지 않게 지우고 새로 만든다(`wx` — 있으면 실패) */
function 새로쓰기(경로: string, 글: string): void {
  rmSync(경로, { force: true, recursive: true });
  writeFileSync(경로, 글, { mode: 0o644, flag: 'wx' });
}

/** 자식을 띄우기 전 — 저장본을 자료 폴더 `kept/` 로 넣는다. 저장본이 없으면 아무것도 안 한다. 실패해도 작성은 간다(전부 훑을 뿐) */
export function 저장본넣기(바탕: string, 접두사: string, 자료: string): number {
  const 폴더 = 저장폴더(바탕, 접두사);
  if (폴더 === null || !폴더인가(폴더)) return 0;
  const 원문 = 안전히읽기(폴더, 'index.json', 목록상한);
  if (원문 === null) return 0;
  let 저장;
  try {
    저장 = 저장본모양(JSON.parse(원문));
  } catch {
    return 0;
  }
  const 넣을곳 = join(자료, 'kept');
  try {
    rmSync(넣을곳, { force: true, recursive: true });
    mkdirSync(넣을곳, { mode: 0o755 });
    const 남긴: typeof 저장.항목 = [];
    for (const x of 저장.항목) {
      const 글 = 안전히읽기(폴더, x.기록, 기록상한);
      if (글 === null) continue;
      새로쓰기(join(넣을곳, x.기록), 글);
      남긴.push(x);
    }
    새로쓰기(join(넣을곳, 'index.json'), JSON.stringify({ 판: 1, 항목: 남긴 }));
    return 남긴.length;
  } catch {
    return 0;
  }
}

/** 임시 이름에 쓰고 옮긴다 — 같은 서비스 두 건이 같이 끝나도 반쯤 쓴 파일이 남지 않는다 */
function 바꿔쓰기(폴더: string, 이름: string, 글: string): void {
  const 임시 = join(폴더, `.${이름}.${process.pid}.tmp`);
  rmSync(임시, { force: true });
  writeFileSync(임시, 글, { mode: 0o600, flag: 'wx' });
  renameSync(임시, join(폴더, 이름));
}

/**
 * 올릴 때 — 자료 폴더의 크롤 목록 · 화면 기록으로 저장본을 간다. 이번에 본 화면만 바꾸고, 지우기는 화면만 · 다 봤을 때만.
 * `list.json` 이 없으면(크롤러를 못 돌렸다) 아무것도 안 한다. 돌려주는 글은 로그 한 줄
 */
export function 저장본갈기(바탕: string, 접두사: string, 자료: string, 화면만: boolean, 오늘 = new Date().toISOString().slice(0, 10)): string {
  const 폴더 = 저장폴더(바탕, 접두사);
  const 크롤 = join(자료, 'crawl');
  const 화면 = join(자료, 'screens');
  if (폴더 === null || !폴더인가(크롤)) return '화면 기록 저장: 크롤 목록이 없어 건너뜀';
  const 목록글 = 안전히읽기(크롤, 'list.json', 목록상한);
  if (목록글 === null) return '화면 기록 저장: 크롤 목록이 없어 건너뜀';
  let 목록: 목록칸[];
  let 요약: { 멈춘까닭?: unknown; 따라가기?: unknown } = {};
  try {
    목록 = (JSON.parse(목록글) as 목록칸[]).filter((x) => typeof x?.주소 === 'string' && typeof x?.틀 === 'string');
    요약 = JSON.parse(안전히읽기(크롤, 'summary.json', 10_000) ?? '{}') as typeof 요약;
  } catch {
    return '화면 기록 저장: 크롤 목록을 못 읽어 건너뜀';
  }
  const 기록들 = (폴더인가(화면) ? readdirSync(화면) : [])
    .filter((이름) => /^[\w.-]+\.md$/.test(이름))
    .flatMap((이름) => {
      const 글 = 안전히읽기(화면, 이름, 기록상한);
      return 글 === null ? [] : [{ 이름, 글 }];
    });
  const 이번 = 이번것들(목록, 기록들, 오늘);
  const 지우기 = 화면만 && 요약.멈춘까닭 === null && 요약.따라가기 === true;
  try {
    if (!폴더인가(폴더)) {
      if (lstatSync(폴더, { throwIfNoEntry: false }) !== undefined) return '화면 기록 저장: 저장 폴더가 폴더가 아니라 건너뜀';
      mkdirSync(폴더, { recursive: true, mode: 0o700 });
    }
    const 옛글 = 안전히읽기(폴더, 'index.json', 목록상한);
    const 옛 = 옛글 === null ? { 판: 1 as const, 항목: [] } : 저장본모양(JSON.parse(옛글));
    for (const x of 이번) 바꿔쓰기(폴더, x.기록, 기록들.find((r) => r.이름 === x.원본)!.글);
    // 「같음」으로 재사용한 화면은 새 기록을 안 썼어도 본 것이다 — 훑은 날은 그대로 둬 30일이 지나면 다시 훑게 한다
    const 이번키 = new Set(이번.map((x) => x.키));
    const 재사용 = 목록
      .filter((x) => (x as { 저장본?: unknown }).저장본 === '같음' && !이번키.has(`${x.상태} ${x.틀}`))
      .flatMap((x) => 옛.항목.filter((y) => y.키 === `${x.상태} ${x.틀}`));
    const 새 = 갈기(옛, [...이번, ...재사용], 지우기);
    바꿔쓰기(폴더, 'index.json', JSON.stringify(새));
    if (지우기) {
      const 남길것 = new Set([...새.항목.map((x) => x.기록), 'index.json']);
      for (const 이름 of readdirSync(폴더)) if (!남길것.has(이름) && /\.md$/.test(이름)) rmSync(join(폴더, 이름), { force: true });
    }
    return `화면 기록 저장: 갈음 ${이번.length}장 · 저장본 ${새.항목.length}장${지우기 ? ' (다 봐서 못 본 화면은 지움)' : ''}`;
  } catch (e) {
    return `화면 기록 저장: 실패 — ${e instanceof Error ? e.message : String(e)}`;
  }
}
