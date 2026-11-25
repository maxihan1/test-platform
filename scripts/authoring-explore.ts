// 게임 작성의 탐색 플레이 — 목표 파일 검사(체크포인트) · 결과 줄 · 조작 맵 올리기 · 탐색 세션과 케이스 작성 세션 나눠 띄우기 (도메인/게임 §3.10 「탐색 플레이 · 조작 맵」)
// 쓰는 법(자식이 끝내기 전에 스스로 검사): npx tsx scripts/authoring-explore.ts <자료 폴더> — 0 지남 · 1 못 지남 · 2 부를 수 없음
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { 올릴빌드 } from './authoring-app-crawl-route.js';
import { 삭제요청읽기 } from './authoring-apply-proc.js';
import { 테스트고침읽기, 화면이맞음읽기 } from './authoring-apply.js';
import { 게임자리, 글받기 } from './authoring-game.js';
import { type 맵행, 경로, 맵행읽기, 목표풀기, 출발고르기 } from './authoring-game-route.js';
import { type 돌린결과, type 보고손, 부른다 } from './authoring-io.js';
import { 끝낼상태 } from './authoring-progress.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { type 화면통로, 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

export interface 탐색목표 {
  /** 표준 기획서의 기능 단위 — 「강화」 「사냥 샘플 플레이」 */
  기능: string;
  /** 경로 검색 명령에 주는 목표 열쇠 — `state:…` 묶음과 창 · 구역 열쇠 하나 */
  열쇠: string[];
  /** 장면 첫 화면이 여럿일 때만 — 경로 검색 `--from` */
  출발?: string;
  결과: '경로 확보' | '진행 불가' | null;
  까닭?: string;
}

/** 자식 프롬프트의 탐색 플레이 절 — 첫 세션은 탐색 플레이까지, 체크포인트를 지난 뒤 세션은 결과 줄을 받는다 */
export type 탐색단계 = { 까지: true } | { 끝: string };

const 파일상한 = 1_000_000;
const 결과들 = ['경로 확보', '진행 불가', null] as const;

/** 목표 파일(game-explore.json `{ 목표: [...] }`)을 읽는다. 꼴이 틀리면 까닭 글 */
export function 목표들읽기(글: string | null): 탐색목표[] | string {
  if (글 === null) return `${게임자리.탐색} 이 없거나 1MB 를 넘는다 — 탐색 플레이를 시작할 때 목표부터 적는다`;
  let 몸: unknown;
  try {
    몸 = JSON.parse(글);
  } catch {
    return `${게임자리.탐색} 을 JSON 으로 못 읽었다`;
  }
  const 목표 = (몸 as { 목표?: unknown } | null)?.목표;
  if (!Array.isArray(목표)) return `${게임자리.탐색} 에 「목표」 배열이 없다`;
  const 들: 탐색목표[] = [];
  for (const [i, x] of (목표 as Record<string, unknown>[]).entries()) {
    const 글인가 = (v: unknown) => typeof v === 'string' && v.trim() !== '';
    const 결과 = x?.결과 ?? null;
    if (!글인가(x?.기능) || !Array.isArray(x.열쇠) || x.열쇠.length === 0 || !x.열쇠.every(글인가) || !(결과들 as readonly unknown[]).includes(결과) ||
      (x.출발 !== undefined && !글인가(x.출발)) || (x.까닭 !== undefined && typeof x.까닭 !== 'string')) {
      return `${게임자리.탐색} 목표 ${String(i + 1)} 의 꼴이 틀렸다 — 기능 · 열쇠(글 배열) · 결과(「경로 확보」 · 「진행 불가」 · null) · 까닭 · 출발`;
    }
    들.push({ 기능: x.기능 as string, 열쇠: x.열쇠 as string[], ...(x.출발 === undefined ? {} : { 출발: x.출발 as string }), 결과: 결과 as 탐색목표['결과'], ...(x.까닭 === undefined ? {} : { 까닭: x.까닭 as string }) });
  }
  return 들;
}

/**
 * 체크포인트 — 목표마다 결과가 하나 있나, 진행 불가에 까닭이 있나, 「경로 확보」면 경로 검색이 「확인」 행만으로 길을 다 내나(폰에서 정말 통과한 행인가).
 * 못 지난 까닭 줄들 — 비면 지났다. 진행 불가 목표가 있어도 지난다(그 기능 단위의 케이스는 보류 줄이 된다)
 */
export function 체크포인트(목표들: 탐색목표[], 행들: 맵행[] | null): string[] {
  // 두 번째 작성도 기능 단위마다 목표가 있다 — 맵에 길이 있으면 폰 없이 「경로 확보」일 뿐이다(§3.10 차례 2)
  if (목표들.length === 0) return ['목표가 하나도 없다 — 표준 기획서의 기능 단위마다 목표를 적는다'];
  return 목표들.flatMap((g): string[] => {
    const 이름 = `「${줄자르기(g.기능, 40)}」`;
    if (g.결과 === null) return [`${이름} — 결과가 없다(「경로 확보」 또는 「진행 불가」와 까닭)`];
    if (g.결과 === '진행 불가') return g.까닭?.trim() ? [] : [`${이름} — 진행 불가 까닭이 없다`];
    const 목표 = 목표풀기(g.열쇠);
    if (목표 === null) return [`${이름} — 열쇠가 틀렸다(비었거나 자리가 둘 이상이거나 같은 상태 이름에 값이 둘)`];
    if (행들 === null) return [`${이름} — 조작 맵이 없어 길을 볼 수 없다`];
    const 출발 = 출발고르기(행들, g.출발);
    if ('까닭' in 출발) return [`${이름} — ${출발.까닭.replace('출발로 준다', '목표의 「출발」 칸에 적는다')}`];
    return 경로(행들, 목표, 출발.출발).다찾음 ? [] : [`${이름} — 경로 검색이 「확인」 행만으로 길을 다 못 낸다 — 폰에서 통과한 동작을 ${게임자리.새맵행} 에 적었나 본다`];
  });
}

const 까닭상한 = 5;
const 줄자르기 = (글: string, 상한: number) => (글.length > 상한 ? `${글.slice(0, 상한)}…` : 글);

/** 결과 줄 — 작성 결과 요약과 PR 머리에 같은 줄이 실린다. 공개 저장소의 PR 이라 계정 비밀번호가 섞였으면 진행 불가 까닭을 적지 않는다 */
export function 탐색줄(목표들: 탐색목표[], 비밀: readonly string[]): string {
  const 확보 = 목표들.filter((g) => g.결과 === '경로 확보').length;
  const 불가 = 목표들.filter((g) => g.결과 === '진행 불가');
  const 머리 = `탐색 플레이: 목표 ${String(목표들.length)}개 — 경로 확보 ${String(확보)} · 진행 불가 ${String(불가.length)}`;
  if (불가.length === 0) return 머리;
  // 자르기 전에 본다 — 자른 자리에 걸친 비밀번호 앞부분이 남지 않게
  if (계정섞였나(불가.flatMap((g) => [g.기능, g.까닭 ?? '']), 비밀)) return `${머리} — 까닭에 테스트 계정 비밀번호가 들어 있어 안 적음`;
  const 까닭들 = 불가.slice(0, 까닭상한).map((g) => `${줄자르기(g.기능, 40)}(${줄자르기(g.까닭 ?? '', 80)})`);
  return `${머리} — ${까닭들.join(' · ')}${불가.length > 까닭상한 ? ` 외 ${String(불가.length - 까닭상한)}개` : ''}`;
}

// 끝 보고에 싣는 돌발 팝업 행 상한 — 서버 끝내기 검사 · 실행 요청에 싣는 팝업 상한과 같다
const 팝업상한 = 100;

/**
 * 이번 작성이 적은 「확인」 돌발 팝업 행(game-route.json) — 체크포인트에서는 안 올리고 끝 보고(result.popupRows)에 실어, 그 PR 이 병합되면 서버가 맵에 올린다.
 * 줄은 PR 머리에 실린다 — 사람이 병합 전에 보는 목록이다. 맵에 있던 창을 다시 적은 것도 센다 (§3.10 「돌발 팝업 자동 닫기」 · GAME-F5-15)
 */
export function 병합팝업(새글: string | null, 비밀: readonly string[]): { 줄: string | null; 행들: Record<string, unknown>[] } {
  const 없음 = { 줄: null, 행들: [] };
  if (새글 === null) return 없음;
  let 몸: unknown;
  try {
    몸 = JSON.parse(새글);
  } catch {
    return 없음;
  }
  const 줄들 = (몸 as { rows?: unknown } | null)?.rows;
  const 팝업들 = (Array.isArray(줄들) ? (줄들 as unknown[]) : []).filter(
    (r): r is Record<string, unknown> => typeof r === 'object' && r !== null && (r as Record<string, unknown>).kind === 'POPUP' && (r as Record<string, unknown>).status === 'OK',
  );
  if (팝업들.length === 0) return 없음;
  // 서버가 행 하나만 틀려도 목록 전부를 거절한다 — 같은 규칙으로 먼저 걸러 PR 머리 목록과 싣는 목록을 맞춘다. 창 주소 · 닫는 법만 싣는다(빌드 · 칸은 병합 뒤 넣기에 쓰지 않는다)
  const 본것 = new Set<string>();
  const 행들: { kind: 'POPUP'; fromKey: string; action: string; status: 'OK' }[] = [];
  for (const r of 팝업들) {
    if (!팝업글인가(r.fromKey) || !팝업글인가(r.action)) continue;
    const 열쇠 = JSON.stringify([r.fromKey, r.action]);
    if (본것.has(열쇠)) continue;
    본것.add(열쇠);
    행들.push({ kind: 'POPUP', fromKey: r.fromKey, action: r.action, status: 'OK' });
  }
  const 틀림 = 팝업들.length - 행들.length;
  if (행들.length === 0) return { 줄: `돌발 팝업 행 ${String(팝업들.length)} — 꼴이 틀리거나 겹쳐 병합해도 안 올림`, 행들: [] };
  if (계정섞였나(행들.flatMap((r) => [r.fromKey, r.action]), 비밀)) return { 줄: `돌발 팝업 행 ${String(행들.length)} — 테스트 계정 비밀번호가 들어 있어 병합해도 안 올림`, 행들: [] };
  const 실을 = 행들.slice(0, 팝업상한);
  const 창들 = 실을.map((r) => r.fromKey);
  const 꼬리 = [
    행들.length > 팝업상한 ? ` · ${String(팝업상한)}개 넘는 ${String(행들.length - 팝업상한)}개는 안 올림` : '',
    틀림 > 0 ? ` · 꼴이 틀리거나 겹친 ${String(틀림)}개는 안 올림` : '',
  ].join('');
  return { 줄: `병합하면 올릴 돌발 팝업 행 ${String(실을.length)} — ${창들.slice(0, 20).join(', ')}${창들.length > 20 ? ` 외 ${String(창들.length - 20)}개` : ''}${꼬리}`, 행들: 실을 };
}

// 서버 조작 맵 글 칸 규칙(apps/admin/src/prd/gameRoute.ts 글인가 · 가르개)과 같다 — 한 행 한 줄이라 줄바꿈이 못 들고 NUL 은 jsonb 가 받지 않는다
const 팝업글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() === v && v !== '' && v.length <= 200 && !/\n|\r|\u0000/.test(v);

/** 자료 폴더의 game-route.json 에서 — 탐색끝줄과 끝 보고가 같이 읽는다 */
export const 병합팝업행 = (자료: string, 비밀: readonly string[]) => 병합팝업(안전히읽기(자료, 게임자리.새맵행, 4_000_000), 비밀);

/** 작성이 DONE 으로 끝날 때 result.popupRows 를 싣는 손 — 행이 없거나 다른 끝이면 그대로다 */
export function 팝업싣는손(손: 보고손, 행들: () => Record<string, unknown>[]): 보고손 {
  return {
    ...손,
    끝내기: (몸) => {
      const 들 = 행들();
      if (몸.status !== 'DONE' || 들.length === 0) return 손.끝내기(몸);
      const 결과 = typeof 몸.result === 'object' && 몸.result !== null ? (몸.result as Record<string, unknown>) : {};
      return 손.끝내기({ ...몸, result: { ...결과, popupRows: 들 } });
    },
  };
}

/**
 * 이번 작성이 적은 행(game-route.json)을 올린다. 돌발 팝업 행은 넣지도 지우지도 않는다 — 올리는 순간 다음 정식 실행부터 kit 이 그 창을 닫아,
 * 오류 창을 팝업으로 잘못 적으면 PR 을 보기도 전에 실패가 통과가 된다(2026-11-20 사용자). 팝업 행은 끝 보고에 실려 PR 병합 뒤 서버가 올린다(위 병합팝업 · GAME-F5-15). 이 작성의 돌려 보기는 자료 폴더의 행으로 쓴다.
 * 꼴이 틀려 서버가 거절하면(400) `틀림` 에 자리를 — 체크포인트는 이것으로 멈춘다(고쳐야 다음 작성이 맵을 쓴다).
 * 서버가 안 받는 그 밖의 경우는 줄에만 적고 간다 — 이 작성은 자료 폴더의 행으로 길을 찾는다(경로 검색이 같이 읽는다)
 */
/**
 * 테스트 고침은 다시 해 본 행에 그 작성이 깐 빌드를 단다 — 빌드를 실은 행만 「재확인 필요」를 푼다(도메인/게임 §3.10 「실패 자동 수정」 3 의 3 · §7 「조작 맵」).
 * 빌드 칸이 빈 「확인」 · 「진행 불가」 행에만 단다. 빌드가 없으면(빌드 없이 앱 파일 경로로 깔았다) 그대로다
 */
export async function 맵올리기(통로: 화면통로, 자료: string, 비밀: readonly string[], 빌드?: string): Promise<{ 줄: string | null; 틀림: string | null }> {
  const 글 = 안전히읽기(자료, 게임자리.새맵행, 4_000_000);
  if (글 === null && existsSync(join(자료, 게임자리.새맵행))) return { 줄: `조작 맵: ${게임자리.새맵행} 이 4MB 를 넘거나 일반 파일이 아니라 안 올림`, 틀림: `${게임자리.새맵행} 이 4MB 를 넘거나 일반 파일이 아니다` };
  if (글 === null) return { 줄: null, 틀림: null };
  let 몸: { rows?: unknown; remove?: unknown };
  try {
    몸 = JSON.parse(글) as typeof 몸;
  } catch {
    return { 줄: `조작 맵: ${게임자리.새맵행} 을 JSON 으로 못 읽어 안 올림`, 틀림: `${게임자리.새맵행} 을 JSON 으로 못 읽었다` };
  }
  const 팝업빼기 = (v: unknown) => (Array.isArray(v) ? v.filter((x) => (x as { kind?: unknown } | null)?.kind !== 'POPUP') : v);
  const 쓸빌드 = 올릴빌드(빌드);
  const 빌드없는행 = (r: unknown): r is Record<string, unknown> => {
    const 행 = typeof r === 'object' && r !== null ? (r as Record<string, unknown>) : null;
    return 행 !== null && (행.status === 'OK' || 행.status === 'BLOCKED') && (typeof 행.buildNo !== 'string' || 행.buildNo.trim() === '');
  };
  const 행들 = 팝업빼기(몸.rows);
  const 단수 = 쓸빌드 === undefined || !Array.isArray(행들) ? 0 : 행들.filter(빌드없는행).length;
  const 보낼 = { ...몸, rows: 단수 > 0 ? (행들 as unknown[]).map((r) => (빌드없는행(r) ? { ...r, buildNo: 쓸빌드 } : r)) : 행들, ...(몸.remove === undefined ? {} : { remove: 팝업빼기(몸.remove) }) };
  // 원문이 아니라 나가는 값을 본다 — 게임 지도 올리기(authoring-game 요소올리기)와 같다
  const 글자들 = (v: unknown): string[] => (typeof v === 'string' ? [v] : typeof v === 'object' && v !== null ? Object.entries(v).flatMap(([k, x]) => [k, ...글자들(x)]) : []);
  if (계정섞였나(글자들(보낼), 비밀)) return { 줄: '조작 맵: 테스트 계정 비밀번호가 들어 있어 안 올림', 틀림: `${게임자리.새맵행} 에 테스트 계정 비밀번호가 들어 있다` };
  try {
    const 답 = await 부른다(통로.주소기지, 통로.토큰, `/authoring/requests/${통로.번호}/game-route`, { method: 'PUT', body: 보낼 });
    const 수 = (v: unknown) => (Array.isArray(v) ? v.length : 0);
    if (답.status === 204) return { 줄: `조작 맵: 행 ${String(수(보낼.rows))}개 올림${수(보낼.remove) > 0 ? ` · ${String(수(보낼.remove))}개 지움` : ''}${단수 > 0 ? ` · 행 ${String(단수)}개에 빌드 ${쓸빌드 ?? ''}` : ''}`, 틀림: null };
    const 자리 = (답.몸 as { detail?: unknown } | null)?.detail;
    const 왜 = `서버 ${String(답.status)}${typeof 자리 === 'string' ? ` (${자리.slice(0, 100)})` : ''}`;
    return { 줄: `조작 맵: 못 올림 — ${왜}`, 틀림: 답.status === 400 ? `${게임자리.새맵행} 을 서버가 거절했다 — ${왜}` : null };
  } catch (e) {
    return { 줄: `조작 맵: 못 올림 — ${e instanceof Error ? e.message : String(e)}`, 틀림: null };
  }
}

/** 체크포인트를 돈다 — 맵 행을 올리고 맵 글을 다시 받은 뒤 목표를 본다. 지나면 결과 줄을 남겨(이어받은 실행이 탐색을 건너뛴다) 돌려준다. `더볼것` — 화면만은 배운 줄이 PRD 로 다 갔나도 본다(§3.10 「배운 것을 PRD · 테스트로」) */
export async function 체크포인트돌기(통로: 화면통로, 자료: string, 비밀: readonly string[], 더볼것: () => string[] = () => []): Promise<{ 줄: string } | { 거절: string }> {
  const 목표들 = 목표들읽기(안전히읽기(자료, 게임자리.탐색, 파일상한));
  const 올림 = await 맵올리기(통로, 자료, 비밀);
  // 다시 받은 맵 글에 서버가 합친 행이 든다. 못 받으면 앞 글에 자료 폴더의 행을 얹어 본다(경로 검색과 같다)
  const 왜 = await 글받기(통로, 자료, 'game-route', 게임자리.맵);
  if (왜 !== null) console.error(`[작성] ${String(통로.번호)}번 — 체크포인트 앞에 조작 맵을 다시 못 받았다(자료 폴더의 행으로 본다): ${왜}`);
  const 맵 = 맵행읽기(자료);
  const 못지남 = [
    ...(typeof 목표들 === 'string' ? [목표들] : 체크포인트(목표들, 맵?.행들 ?? null)),
    ...(올림.틀림 === null ? [] : [올림.틀림]),
    ...더볼것(),
  ];
  if (못지남.length > 0) return { 거절: `탐색 플레이 체크포인트를 못 지났다 — ${못지남.slice(0, 10).join(' / ')}${못지남.length > 10 ? ` 외 ${String(못지남.length - 10)}개` : ''}` };
  const 줄 = 탐색줄(목표들 as 탐색목표[], 비밀);
  try {
    새로쓰기(join(자료, 게임자리.탐색지남), 줄);
  } catch (e) {
    return { 거절: `${게임자리.탐색지남} 을 자료 폴더에 못 썼다 — ${e instanceof Error ? e.message : String(e)}` };
  }
  return { 줄 };
}

/** 작성 끝에 PR 머리에 싣는 줄 — 결과 줄 · 맵 다시 올리기(케이스 작성이 채운 함수 이름 · 테스트 고침이 다시 해 본 행은 빌드까지) · 병합하면 올릴 돌발 팝업(탐색하는 작성만 — 끝 보고에 싣는 것도 그 작성뿐이다). 탐색을 안 한 작성(미션만)은 빈 목록 */
export async function 탐색끝줄(통로: 화면통로, 자료: string, 비밀: readonly string[], 빌드?: string, 팝업싣나 = true): Promise<string[]> {
  const 지남 = 안전히읽기(자료, 게임자리.탐색지남, 파일상한)?.trim();
  const 올림 = await 맵올리기(통로, 자료, 비밀, 빌드);
  return [지남, 올림.줄, 팝업싣나 ? 병합팝업행(자료, 비밀).줄 : null].filter((x): x is string => x !== null && x !== undefined && x !== '');
}

/**
 * 탐색하는 작성 — 게임이고 케이스를 새로 쓰는 작성. 있는 케이스를 고치는 BTS 「테스트 수정」 · 「화면이 맞음」은 뺀다
 * (2026-11-20 사용자 — 케이스 하나를 고치려고 기능 단위 전체를 탐색하지 않는다. 고칠 때도 경로 검색은 쓴다)
 */
export const 탐색하나 = (것: { params?: unknown }, 게임: boolean): boolean =>
  게임 && 삭제요청읽기(것) === undefined && 테스트고침읽기(것) === undefined && 화면이맞음읽기(것) === undefined;

export interface 띄운결과 {
  돌린것: 돌린결과;
  크레딧으로: boolean;
  /** 앞서 띄운 자식들의 출력 — 토큰을 다 더해 알린다(크레딧 자식 · 탐색 세션) */
  앞낸것: string[];
  /** 체크포인트를 못 지났다 — 올리기 거절처럼 멈춘다 */
  거절?: string;
}
type 이어하기 = { 번호: number; 이유: string | null; 까닭: string | null };
type 한번결과 = { 돌린것: 돌린결과; 크레딧으로: boolean; 앞낸것: string | null };

/**
 * 자식을 띄운다. 게임 작성(탐색)은 둘로 나눈다 — 첫 세션은 탐색 플레이까지, 체크포인트를 지나면 케이스 작성은 새 세션(이어하기 절 「탐색 플레이를 마침」)이 맵과 파일만 받아 쓴다.
 * 시간 상한은 없다(2026-11-20 사용자 — 전체 상한을 뺀 2026-10-03 과 같은 까닭). 이미 지난 폴더(이어받음)면 첫 세션을 건너뛴다
 */
export async function 세션띄우기(o: {
  탐색: boolean;
  /** Android 앱 탐색(도메인/작성 §3.6 「★ 앱 탐색」) — 지남 표시 · 체크포인트 · 이름을 바꾼다. 없으면 게임 탐색 플레이 */
  갈래?: { 지남: string; 체크포인트: () => Promise<{ 줄: string } | { 거절: string }>; 이름: string };
  /** 화면만 — 첫 세션이 쓸 것이 하나도 없어 아무것도 안 썼나. 목표가 없는 것이 맞으니 체크포인트로 막지 않고 그대로 끝낸다(올리기가 「PRD 에 없는 화면 0」으로 닫는다) */
  쓸것없나?: () => boolean;
  /** 게임 탐색 체크포인트가 더 보는 것 — 비어 있지 않으면 못 지난다 */
  더볼것?: () => string[];
  통로: 화면통로;
  자료: string;
  비밀: readonly string[];
  이어하기?: 이어하기;
  한번: (이어하기: 이어하기 | undefined, 탐색?: 탐색단계) => Promise<한번결과>;
  거두기: () => Promise<boolean>;
  멈추라했다: () => boolean;
  알린다: (글: string) => void;
}): Promise<띄운결과> {
  const 펴기 = (r: 한번결과, 앞: string[] = []): 띄운결과 => ({ ...r, 앞낸것: [...앞, ...(r.앞낸것 === null ? [] : [r.앞낸것])] });
  if (!o.탐색) return 펴기(await o.한번(o.이어하기));
  const 지난줄 = 안전히읽기(o.자료, o.갈래?.지남 ?? 게임자리.탐색지남, 파일상한)?.trim();
  if (지난줄) return 펴기(await o.한번(o.이어하기, { 끝: 지난줄 }));
  const 첫 = await o.한번(o.이어하기, { 까지: true });
  // 멈춤 · 시간초과 · 끊김 · 못 띄움은 지금처럼 끝낸다 — 폴더가 남아 이어하기가 탐색부터 잇는다
  if (첫.돌린것.코드 === null || 끝낼상태(첫.돌린것, false) !== null) return 펴기(첫);
  if (!(await o.거두기()) || o.쓸것없나?.() === true) return 펴기(첫);
  const 판 = await (o.갈래?.체크포인트() ?? 체크포인트돌기(o.통로, o.자료, o.비밀, o.더볼것));
  if ('거절' in 판) return { ...펴기(첫), 거절: 판.거절 };
  if (o.멈추라했다()) return 펴기({ ...첫, 돌린것: { ...첫.돌린것, 멈춤으로죽음: true } });
  o.알린다(`${o.갈래?.이름 ?? '탐색 플레이'} 체크포인트를 지났다(${판.줄}) — 케이스 작성은 새 세션으로 띄운다`);
  const 둘 = await o.한번({ 번호: o.통로.번호, 이유: 'EXPLORED', 까닭: null }, { 끝: 판.줄 });
  const 앞 = [...(첫.앞낸것 === null ? [] : [첫.앞낸것]), 첫.돌린것.낸것];
  // 새 세션이 아예 안 떴으면 실패(폴더 지움)가 아니라 끊김으로 멈춘다 — 탐색한 것이 남아 이어하기가 케이스 작성부터 잇고, 첫 세션 토큰도 알린다
  if (둘.돌린것.코드 === null && !둘.돌린것.시간초과 && !둘.돌린것.멈춤으로죽음) return 펴기({ ...첫, 돌린것: { ...첫.돌린것, 코드: 1, 오류: 둘.돌린것.오류 } });
  return 펴기(둘, 앞);
}

/** 0 지남 · 1 못 지남 · 2 부를 수 없음 — 자식이 첫 세션을 끝내기 전에 부른다. 맵은 올리지 않고 자료 폴더의 행으로 본다 */
export function 실행(인자: string[]): number {
  const [자료] = 인자;
  if (자료 === undefined) {
    console.error('쓰는 법: npx tsx scripts/authoring-explore.ts <자료 폴더>');
    return 2;
  }
  const 목표들 = 목표들읽기(안전히읽기(자료, 게임자리.탐색, 파일상한));
  if (typeof 목표들 === 'string') {
    console.error(`[탐색 플레이] ${목표들}`);
    return 1;
  }
  const 맵 = 맵행읽기(자료);
  const 못지남 = [...체크포인트(목표들, 맵?.행들 ?? null), ...(맵?.틀림 ? [맵.틀림] : [])];
  for (const 줄 of 못지남) console.log(`못 지남: ${줄}`);
  console.log(못지남.length === 0 ? 탐색줄(목표들, []) : `[탐색 플레이] 체크포인트를 못 지났다 — ${String(못지남.length)}건을 고친다`);
  return 못지남.length === 0 ? 0 : 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = 실행(process.argv.slice(2));
}
