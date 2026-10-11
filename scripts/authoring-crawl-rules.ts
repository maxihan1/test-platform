// 화면 크롤러의 판정 — 따라갈 주소 · 같은 틀 · 지문 · 목록 · 로그인 풀림. 껍데기(authoring-crawl.ts)는 I/O 만 한다 (도메인/작성 §3.6 「★ 역방향」)
import { createHash } from 'node:crypto';

import { 제외경로정리, 제외되나 } from '../apps/admin/src/settings/rules.js';

const 내려받기 = /\.(pdf|zip|7z|rar|hwpx?|docx?|xlsx?|pptx?|csv|txt|png|jpe?g|gif|svg|webp|ico|mp4|mov|avi|mp3|wav|apk|exe|dmg|msi)$/i;
// 링크 글자 — 주소가 멀쩡해 보여도 이것이면 상태가 바뀐다(검토 BLOCKER — `/member/out.php` 가 「로그아웃」이었다)
// 걸러진 주소는 index.json 에 남고 요약에 수가 실린다 — 「결제 내역」 같은 정상 화면이 빠지면 자식이 거기서 본다
const 위험글자 = /로그아웃|로그오프|탈퇴|삭제|담기|결제|구매하기|주문하기|신청하기|추천|좋아요|해지|스크랩|logout|log\s?out|log\s?off|sign\s?out|delete|remove|unsubscribe|withdraw/i;
// 주소의 동작 낱말 — 낱말 경계로만 본다(`/address` · `/outline` 은 따라간다). 로그아웃 꼴은 경계 없이(`logoutProc.do` · `actionLogout.do`)
const 위험낱말 = /(?:^|[/_.\-?&=])(?:out\.php|delete|del|remove|add|cancel|like|toggle|withdraw|unsubscribe|download|leave|good|nogood|wish|scrap|vote|follow)(?=$|[/_.\-?&=])|log-?out|log-?off|sign-?out/i;
// 동작을 하는 스크립트 파일(그누보드 · 영카트 · 전자정부) — 경로의 마지막 마디만 본다
const 위험파일 = /(?:update|delete|insert|good|wish|scrap|vote|proc)[^/]*\.(?:php|do|jsp|aspx?)$/i;
// 보기 · 목록 동작(XE `act=dispMemberLoginForm` · `mode=list`)은 따라간다. 그누보드 삭제는 `w=d`
const 동작인자 = /[?&](?:(?:action|act|cmd|mode|op)=(?!disp|view|list|read|show)|w=d(?:&|$))/i;
// 같은 틀로 묶는 인자 — 쪽 번호 · 정렬 · 개수 · 돌아갈 주소. 글자 값으로 화면을 가르는 인자(?modal= · ?bo_table=)는 묶지 않는다
const 쪽인자 = new Set([
  'page', 'p', 'pg', 'pageno', 'sort', 'order', 'orderby', 'sst', 'sod', 'size', 'limit', 'offset', 'per', 'perpage',
  'next', 'returnurl', 'return', 'returnto', 'redirect', 'redirecturl', 'redirect_uri', 'from', 'continue', 'url',
]);
// 번호 마디 — 숫자 · UUID · 긴 16진수, 그리고 영문 세 자 이하 머리에 숫자가 넷 이상인 주문 번호 꼴(`DM20261002-0001`). `privacy-2024` 는 이름이다
const 숫자마디 = /^(?:\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{24,}|[a-z]{0,3}(?=(?:[-_]?\d){4})[\d_-]+)$/i;

/** 경로 글자 — EUC-KR 처럼 풀 수 없으면 원문 그대로(크롤 전체가 죽지 않게) */
export const 풀기 = (글: string): string => {
  try {
    return decodeURIComponent(글);
  } catch {
    return 글;
  }
};

const 해시라우트 = (해시: string): boolean => 해시.startsWith('#/') || 해시.startsWith('#!');

type 판정 = { 주소: string } | { 까닭: '위험 글자' | '동작 낱말' | '내려받기' } | null;

function 가르기(href: string, 글자: string, 기준: string): 판정 {
  let u: URL;
  try {
    u = new URL(href, 기준);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.origin !== new URL(기준).origin) return null;
  if (!해시라우트(u.hash)) u.hash = '';
  if (내려받기.test(u.pathname)) return { 까닭: '내려받기' };
  // 버튼 글자는 짧다 — 긴 글자는 글 제목이라 「추천」이 들어 있어도 따라간다
  if (글자.trim().length <= 12 && 위험글자.test(글자)) return { 까닭: '위험 글자' };
  const 경로 = 풀기(u.pathname) + u.search + u.hash;
  if (위험낱말.test(경로) || 위험파일.test(풀기(u.pathname)) || 동작인자.test(u.search)) return { 까닭: '동작 낱말' };
  return { 주소: u.toString() };
}

/** 따라갈 절대 주소, 아니면 null. 링크 이동만으로 로그아웃 · 삭제 · 담기 · 추천이 일어나는 곳을 거른다 */
export function 주소고르기(href: string, 글자: string, 기준: string): string | null {
  const 판 = 가르기(href, 글자, 기준);
  return 판 !== null && '주소' in 판 ? 판.주소 : null;
}

/** 같은 사이트 링크를 거른 까닭 — 다른 출처 · 못 읽는 주소 · 따라가는 주소는 null */
export function 걸러진까닭(href: string, 글자: string, 기준: string): string | null {
  const 판 = 가르기(href, 글자, 기준);
  return 판 !== null && '까닭' in 판 ? 판.까닭 : null;
}

const 마디정리 = (경로: string): string =>
  경로
    .split('/')
    .map((m) => (숫자마디.test(m) ? ':n' : m))
    .join('/');

/** 같은 틀이면 같은 키 — 숫자 마디 · 숫자 값 · 쪽 인자만 묶는다 */
export function 틀키(주소: string): string {
  const u = new URL(주소);
  const 인자 = [...u.searchParams]
    .filter(([k]) => !쪽인자.has(k.toLowerCase()))
    .map(([k, v]) => `${k}=${/^\d+$/.test(v) ? ':n' : v}`)
    .sort();
  const 해시 = 해시라우트(u.hash) ? 마디정리(u.hash) : '';
  return `${마디정리(u.pathname)}${인자.length === 0 ? '' : `?${인자.join('&')}`}${해시}`;
}

/** 같은 틀 둘째 장을 열어 구조를 견줄까 — 인자의 숫자 값으로 화면을 가르는 틀(`?board_no=1` 공지 · `=4` 문의)만. 경로 숫자(글 상세)는 한 장이면 된다 */
export function 둘째장볼까(틀: string): boolean {
  return /[?&][^=&]+=:n/.test(틀);
}

/** 마지막 마디를 뺀 경로 — 숫자가 아닌 상세(슬러그)가 장수를 다 먹지 않게 부모마다 상한을 둔다. 최상위 화면은 null(상한 없음) */
export function 부모키(주소: string): string | null {
  const u = new URL(주소);
  const 경로 = 해시라우트(u.hash) ? `${u.pathname}${u.hash}` : u.pathname;
  const 부모 = 경로.replace(/\/[^/]*\/?$/, '');
  return 부모 === '' || 부모 === '/' || 부모 === '/#' || 부모 === '/#!' ? null : 부모;
}

/**
 * 화면 구조의 지문 — 요소 종류와 짜임만 본다. 따옴표 안 글자 · 숫자는 뺀다(글 제목만 다른 게시판 글 둘은 같은 값).
 * 같은 틀 둘째 장을 견줄 때와 다음 실행이 바뀐 화면을 가를 때 쓴다
 */
export function 지문(구조: string): string {
  const 정리 = 구조
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/\d+/g, '0')
    .replace(/[ \t]+/g, ' ');
  return createHash('sha1').update(정리).digest('hex').slice(0, 12);
}

/**
 * 글자 지문 — 크롤 파일 전체. 이것까지 같아야 저장 화면 기록을 그대로 쓴다 (2026-10-04).
 * 본문 숫자(알림 수 · 글 번호)는 0 으로, `#` 머리 줄(주소 · 입력칸 규칙 — 최대 20자 → 30자)은 숫자까지 본다
 */
export function 글자지문(파일글: string): string {
  const 정리 = 파일글
    .split('\n')
    .map((줄) => (줄.startsWith('#') ? 줄 : 줄.replace(/\d+/g, '0')).replace(/[ \t]+/g, ' '))
    .join('\n');
  return createHash('sha1').update(정리).digest('hex').slice(0, 12);
}

export interface 목록항목 {
  상태: '로그아웃' | '로그인';
  틀: string;
  주소: string;
  이름: string;
  파일: string;
  시작: boolean;
}

/** 훑을 목록 — 두 상태에 다 있는 틀은 로그인 하나, 시작 화면만 둘 다 (§3.6 「기획서가 없을 때」) */
export function 목록고르기(항목들: 목록항목[]): 목록항목[] {
  const 로그인틀 = new Set(항목들.filter((x) => x.상태 === '로그인').map((x) => x.틀));
  const 본 = new Set<string>();
  const 고른: 목록항목[] = [];
  for (const x of 항목들) {
    if (x.상태 === '로그아웃' && 로그인틀.has(x.틀) && !x.시작) continue;
    const 키 = `${x.상태} ${x.틀}`;
    if (본.has(키)) continue;
    본.add(키);
    고른.push(x);
  }
  return 고른;
}

/**
 * 화면 연결(본 화면 번호 → 나간 연결)을 목록에 남은 화면으로 모은다 (PRD-F6-02).
 * 두 상태에 다 있는 틀은 로그인 하나만 남으므로 로그아웃 때 본 연결(홈 → 로그인 · 가입)도 그 화면에 합친다. 목록에 같은 틀이 없으면 버린다
 */
export function 연결모으기<T extends Pick<목록항목, '상태' | '틀'>>(
  본들: readonly T[],
  연결: ReadonlyMap<number, ReadonlyMap<string, { to: string; via: string }>>,
  고른: readonly T[],
): { 상태: T['상태']; 틀: string; 연결: { to: string; via: string }[] }[] {
  const 자리 = new Map(고른.map((x) => [`${x.상태} ${x.틀}`, x]));
  const 모은 = new Map<T, Map<string, { to: string; via: string }>>();
  본들.forEach((본, i) => {
    const 칸 = 연결.get(i);
    const 갈곳 = 자리.get(`${본.상태} ${본.틀}`) ?? 자리.get(`로그인 ${본.틀}`);
    if (칸 === undefined || 갈곳 === undefined) return;
    const 합 = 모은.get(갈곳) ?? new Map<string, { to: string; via: string }>();
    for (const [키, 값] of 칸) 합.set(키, 값);
    모은.set(갈곳, 합);
  });
  return 고른.flatMap((x) => (모은.has(x) ? [{ 상태: x.상태, 틀: x.틀, 연결: [...모은.get(x)!.values()] }] : []));
}

// login 은 머리만 맞으면(`/loginForm`), auth 는 낱말로만(`/authors` 는 아니다)
const 로그인주소 = /(?:^|[/_.\-])(?:log-?in|sign-?in)|(?:^|\/)auth(?=$|[/_.\-])|로그인/i;

/**
 * 로그인 판에서 로그인 화면으로 튕겼나 — 로그인 주소로 돌려보내졌거나, 로그인 화면이 아닌 곳에 아이디 칸과 비밀번호 칸이 같이 나왔다.
 * 비밀번호 칸만 있는 본인 확인 화면(회원정보 수정)은 풀림이 아니다
 */
export function 로그인풀렸나(x: { 요청: string; 최종: string; 비밀번호칸: boolean; 아이디칸: boolean }): boolean {
  const 요청 = new URL(x.요청);
  const 최종 = new URL(x.최종);
  const 로그인화면 = (u: URL) => 로그인주소.test(풀기(u.pathname));
  if (로그인화면(요청)) return false;
  return 로그인화면(최종) || (x.비밀번호칸 && x.아이디칸);
}

/** 서비스 설정의 훑지 않을 경로 아래 주소인가 — pathname 만 본다. 해시 라우트(`#/…`) 안 화면은 못 뺀다 (SPEC 도메인/작성 §3.6 · #153) */
export function 빼는주소인가(주소: string, 뺄: readonly string[]): boolean {
  if (뺄.length === 0) return false;
  try {
    return 제외되나(new URL(주소).pathname, 뺄);
  } catch {
    return false;
  }
}

/** `--exclude <경로>` 를 모두 — 값이 명령줄로 들어오므로 설정 화면과 같은 규칙으로 거른다. 틀리면 까닭 글 */
export function 뺄경로읽기(argv: readonly string[]): string[] | string {
  const 줄들: string[] = [];
  for (const [i, a] of argv.entries()) {
    if (a !== '--exclude') continue;
    const 값 = argv[i + 1];
    if (값 === undefined || 값.startsWith('--')) return '--exclude 뒤에 경로가 없다';
    줄들.push(값);
  }
  const 정리 = 제외경로정리(줄들);
  return '값' in 정리 ? 정리.값 : `--exclude 값이 틀렸다(${정리.까닭}): ${정리.틀린줄}`;
}
