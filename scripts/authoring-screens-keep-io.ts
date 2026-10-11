// 화면 기록 저장본 — 자식을 띄우기 전에 서버 저장본을 자료 폴더 kept/ 로 넣고, 올릴 때 이번에 본 화면과 그 화면 연결만 서버에 올린다 (도메인/작성 §3.6 「★ 역방향」 · PRD-F6-01 · F6-02)
// 에이전트는 서버에서 root 로 돈다 — 자식 uid 가 손댈 수 있는 자료 폴더는 링크 · 큰 파일을 따라가지 않고 읽는다
import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { 모두덮음 } from './authoring-covered.js';
import { 부른다 } from './authoring-io.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { type 목록칸, type 상태, 날수, 받은저장본, 이번것들 } from './authoring-screens-keep.js';

const 기록상한 = 200_000;
const 목록상한 = 2_000_000;
const 연결파일상한 = 20_000_000; // 100장 × 화면마다 연결 1,000개까지(크롤러가 자른다)

/** 그 요청의 통로로 부른다 — 서버가 요청 번호로 서비스를 찾는다 */
export interface 화면통로 {
  주소기지: string;
  토큰: string;
  번호: number;
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

/**
 * 크롤러의 화면 연결(`crawl/links.json`) — `상태 틀` → 서버 꼴 연결 목록. 없거나 못 읽으면 빈 것(연결 없이 올린다 — 못 읽음은 줄에 적는다).
 * 서버 상한(연결 1,000개 · 주소 2,000자 · 이름 500자)에 맞춰 자른다
 */
function 연결읽기(크롤: string): { 연결들: Map<string, { toUrl: string; via: string }[]>; 못읽음: boolean } {
  const 연결들 = new Map<string, { toUrl: string; via: string }[]>();
  const 원문 = 안전히읽기(크롤, 'links.json', 연결파일상한);
  let 글: unknown;
  try {
    글 = JSON.parse(원문 ?? '[]');
  } catch {
    return { 연결들, 못읽음: true };
  }
  const 글자 = (x: unknown, 상한: number): x is string => typeof x === 'string' && x.trim() !== '' && x.length <= 상한;
  for (const 칸 of Array.isArray(글) ? 글 : []) {
    const x = (typeof 칸 === 'object' && 칸 !== null ? 칸 : {}) as { 상태?: unknown; 틀?: unknown; 연결?: unknown };
    if ((x.상태 !== '로그아웃' && x.상태 !== '로그인') || typeof x.틀 !== 'string' || !Array.isArray(x.연결)) continue;
    const 줄들 = (x.연결 as { to?: unknown; via?: unknown }[]).flatMap((l) => (글자(l?.to, 2_000) && 글자(l?.via, 500) ? [{ toUrl: l.to, via: l.via }] : []));
    연결들.set(`${x.상태} ${x.틀}`, 줄들.slice(0, 1_000));
  }
  // 파일이 있는데 못 읽었다(링크 · 너무 큼) — 연결 없이 올리면 그 화면의 서버 연결이 비므로 사람이 알게 한다
  return { 연결들, 못읽음: 원문 === null && lstatSync(join(크롤, 'links.json'), { throwIfNoEntry: false }) !== undefined };
}

/** 자료 폴더의 크롤 목록(list.json) 글. 없거나 링크 · 너무 크면 null */
export function 크롤목록(자료: string): string | null {
  const 크롤 = join(자료, 'crawl');
  return 폴더인가(크롤) ? 안전히읽기(크롤, 'list.json', 목록상한) : null;
}

/** 자료 폴더의 크롤 목록(list.json)이 전부 PRD 에 이미 있는 화면이면 그 장수, 아니면(목록이 없거나 못 읽거나 덮지 않은 화면이 있다) null (PRD-F6-03) */
export function 크롤모두덮음(자료: string): number | null {
  const 글 = 크롤목록(자료);
  return 글 === null ? null : 모두덮음(글);
}

/**
 * 자식을 띄우기 전 — 서버 저장본을 자료 폴더 `kept/` 로 넣는다. 저장본이 없으면 아무것도 안 한다. 실패해도 작성은 간다(전부 훑을 뿐).
 * `있으면둠` — 이어받기는 크롤러를 다시 안 돌려 목록의 「같음」이 앞 실행의 `kept/` 를 가리킨다. 다시 넣으면 어긋난다 (검사 주의 2)
 */
export async function 저장본넣기(통로: 화면통로, 자료: string, 있으면둠 = false): Promise<number> {
  const 넣을곳 = join(자료, 'kept');
  if (있으면둠 && lstatSync(넣을곳, { throwIfNoEntry: false }) !== undefined) return 0;
  // 못 받아도 작성은 간다 — 까닭은 로그에 남긴다(매번 전부 훑게 되는 것을 사람이 찾게)
  const 못받음 = (까닭: string) => (console.error(`[작성] ${통로.번호}번 — 화면 기록 저장본을 못 받아 전부 훑는다: ${까닭}`), 0);
  try {
    const 답 = await 부른다(통로.주소기지, 통로.토큰, `/authoring/requests/${통로.번호}/screens`);
    if (답.status !== 200) return 못받음(`서버 ${답.status}`);
    const { 저장, 기록들 } = 받은저장본(답.몸);
    if (저장.항목.length === 0) return 0;
    rmSync(넣을곳, { force: true, recursive: true });
    mkdirSync(넣을곳, { mode: 0o755 });
    for (const x of 저장.항목) 새로쓰기(join(넣을곳, x.기록), 기록들.get(x.기록)!);
    새로쓰기(join(넣을곳, 'index.json'), JSON.stringify(저장));
    return 저장.항목.length;
  } catch (e) {
    return 못받음(e instanceof Error ? e.message : String(e));
  }
}

/**
 * 올릴 때 — 자료 폴더의 크롤 목록 · 화면 기록으로 이번에 본 화면만 서버에 올린다. 「같음」으로 재사용한 화면은 안 올린다(훑은 날을 그대로 둬야 30일 그물이 돈다).
 * 화면마다 크롤러가 남긴 화면 연결(`links.json`)을 같이 싣는다 — 재사용한 화면의 연결은 서버에 있던 것 그대로다 (PRD-F6-02).
 * 본 화면은 크롤 목록 전체다(대조는 AI 가 기획서 화면만 훑는다 — 나머지 기록이 지워지지 않게). 지우기는 크롤 「다 봄」일 때 실제로 돈 상태만.
 * `list.json` 이 없으면(크롤러를 못 돌렸다) 아무것도 안 한다.
 * 올릴 기록에 테스트 계정 비밀번호가 있으면 하나도 안 올리고 거절 까닭을 돌려준다(§3.6 「남는 한계」). 그 밖에는 로그 한 줄이고 실패해도 작성은 간다
 */
export async function 저장본올리기(통로: 화면통로, 자료: string, 비밀: string | null | undefined, 지금 = new Date()): Promise<{ 줄: string } | { 거절: string }> {
  const 크롤 = join(자료, 'crawl');
  const 화면 = join(자료, 'screens');
  const 목록글 = 폴더인가(크롤) ? 안전히읽기(크롤, 'list.json', 목록상한) : null;
  if (목록글 === null) return { 줄: '화면 기록 저장: 크롤 목록이 없어 건너뜀' };
  let 목록: (목록칸 & { 저장본?: unknown })[];
  let 요약: { 멈춘까닭?: unknown; 따라가기?: unknown; 상태들?: unknown; 예외?: unknown } = {};
  try {
    목록 = (JSON.parse(목록글) as 목록칸[]).filter((x) => typeof x?.주소 === 'string' && typeof x?.틀 === 'string');
    요약 = JSON.parse(안전히읽기(크롤, 'summary.json', 10_000) ?? '{}') as typeof 요약;
  } catch {
    return { 줄: '화면 기록 저장: 크롤 목록을 못 읽어 건너뜀' };
  }
  const 기록들 = (폴더인가(화면) ? readdirSync(화면) : [])
    .filter((이름) => /^[\w.-]+\.md$/.test(이름))
    .flatMap((이름) => {
      const 글 = 안전히읽기(화면, 이름, 기록상한);
      return 글 === null ? [] : [{ 이름, 글 }];
    });
  const 오늘 = 지금.toISOString().slice(0, 10);
  const 같은것 = 목록.filter((x) => x.저장본 === '같음');
  const 같음키 = new Set(같은것.map((x) => `${x.상태} ${x.틀}`));
  const 이번 = 이번것들(목록, 기록들, 오늘).filter((x) => !같음키.has(x.키));
  const { 연결들, 못읽음 } = 연결읽기(크롤);
  // 이름 · 틀 · 연결(버튼 · 링크 글자)도 서버에 남고 사람에게 보일 칸이다 — 본문과 같이 본다. 찾은 화면 이름(seen)은 목록 전체가 나간다
  const 볼글 = [...목록.map((x) => x.이름 ?? ''), ...이번.flatMap((x) => [x.글, x.이름, x.틀, ...(연결들.get(x.키) ?? []).flatMap((l) => [l.toUrl, l.via])])];
  if (계정섞였나(볼글, 비밀)) return { 거절: '올릴 화면 기록에 테스트 계정 비밀번호가 들어 있다 — 올리지 않는다' };
  // 지우기는 크롤이 링크를 따라가 예외 없이 다 봤을 때, 실제로 돈 상태만 (검사 주의 1 — 상태 파일 없이 로그아웃만 돌면 로그인 기록은 남긴다)
  const 돈상태 = Array.isArray(요약.상태들) ? 요약.상태들.filter((x): x is 상태 => x === '로그아웃' || x === '로그인') : [];
  const 지울상태 = 요약.멈춘까닭 === null && 요약.따라가기 === true && 요약.예외 !== true ? [...new Set(돈상태)] : [];
  const 길 = `/authoring/requests/${통로.번호}/screens`;
  try {
    // 재사용 수와 가장 오래된 날은 올리기 전 서버 저장본에서 센다 — 자식이 고칠 수 있는 kept/ 를 믿지 않는다
    const 받음 = await 부른다(통로.주소기지, 통로.토큰, 길);
    if (받음.status !== 200) return { 줄: `화면 기록 저장: 실패 — 저장본을 못 읽었다(서버 ${받음.status})` };
    const 재사용 = 받은저장본(받음.몸).저장.항목.filter((y) => 같음키.has(y.키));
    const 오래된 = 재사용.reduce((n, y) => Math.max(n, 날수(y.훑은날, 오늘)), 0);
    let 못올림 = 0;
    for (const x of 이번) {
      const body = { state: x.상태, url: x.틀, name: x.이름.slice(0, 500), textFp: x.글자지문, structFp: x.지문, record: x.글, crawledAt: 지금.toISOString(), links: 연결들.get(x.키) ?? [] };
      if ((await 부른다(통로.주소기지, 통로.토큰, 길, { method: 'PUT', body })).status !== 204) 못올림 += 1;
    }
    const seen = 목록.map((x) => ({ state: x.상태, url: x.틀, name: (x.이름 ?? '').slice(0, 500) }));
    const 끝 = await 부른다(통로.주소기지, 통로.토큰, `${길}/done`, { method: 'POST', body: { seen, complete: 지울상태 } });
    const 지운수 = 끝.status === 200 ? (끝.몸 as { deleted?: unknown } | null)?.deleted : undefined;
    return {
      줄:
        `화면 기록 저장: 재사용 ${재사용.length}장${재사용.length > 0 ? `(가장 오래된 것 ${오래된}일)` : ''} · 새로 저장 ${이번.length - 못올림}장` +
        (못올림 > 0 ? ` · 못 올림 ${못올림}장` : '') +
        (못읽음 ? ' · 화면 연결 파일을 못 읽어 연결 없이 올림' : '') +
        (지울상태.length === 0 ? '' : typeof 지운수 === 'number' ? ` · 다 봐서 ${지울상태.join(' · ')} 못 본 화면 ${지운수}장 지움` : ' · 못 본 화면 지우기 실패'),
    };
  } catch (e) {
    return { 줄: `화면 기록 저장: 실패 — ${e instanceof Error ? e.message : String(e)}` };
  }
}
