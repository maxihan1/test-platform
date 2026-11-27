// 앱 배우기 — Android 앱 작성이 기획서를 보기 전에 2시간 동안 배우기 세션을 이어 띄워 앱을 써 보며 배운다 (도메인/작성 §3.6 「★ 앱 배우기」 · APP-F5-03)
// 시간 · 교대 · 쪽지는 게임 배우기(authoring-learn.ts)와 같은 값이다. 세션끼리는 대화를 넘기지 않는다 — 세션이 끝날 때마다 배운 줄을 올리고 글을 다시 받는다
// 일찍 끝내기는 AI 의 말이 아니라 프로그램이 본다 — 장치 ①(배운 줄 없는 화면)이 지나고 열린 물음이 0 일 때만 2시간 전에 그친다
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { type 앱배운줄, 끝내도되나, 배운것올리기, 사람줄, 앱배움자리, 적은줄들, 지금배운것, 쪽지열쇠 } from './authoring-app-learned.js';
import type { 띄운결과 } from './authoring-explore.js';
import { type 한번결과, type 학습결과, 못뜬것은끊김, 학습값 } from './authoring-learn.js';
import { 상태쓰기, 상태읽기 } from './authoring-learn-io.js';
import { 끝낼상태 } from './authoring-progress.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { type 화면통로, 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';
import { 컨텍스트크기 } from './authoring-usage.js';

const 분 = 60_000;

/** 세션 하나에 주는 재료 — 프롬프트는 부르는 쪽이 짓는다(authoring-app-learn-prompt) */
export interface 앱세션거리 {
  남은분: number;
  빌드?: string;
  차례: number;
  못올림: string[];
  /** 앞 AI 가 남긴 쪽지(`note:쪽지`) */
  쪽지?: string;
  /** 이어 작성 · 반영 — 맡은 요구를 근거로 단 줄과 그 화면만 다시 본다 */
  부분?: { 열쇠: string[]; 화면: string[] };
  /** 세션을 띄울 때 남은 배운 줄 없는 화면 · 열린 물음 */
  남은화면: string[];
  열린: string[];
}

export interface 앱학습손 {
  통로: 화면통로;
  자료: string;
  비밀: readonly string[];
  /** 이어 작성 · 반영이 맡은 요구 번호 — 있으면 그 요구에 닿는 줄만 30분 한 세션 */
  번호들?: readonly string[];
  /** 폰을 잡을 길이 없으면 까닭 — 배우지 않는다 */
  못함: string | null;
  빌드: () => Promise<string | undefined>;
  프롬프트: (거리: 앱세션거리) => string;
  /** 글은 띄울 때마다 짓는다 — 크레딧이 도중에 떨어져 구독으로 이어 띄우면 남은 시간이 첫 자식 때와 다르다 */
  한번: (글짓기: () => string, 끊기: AbortSignal, 먹기: (줄: string) => void) => Promise<한번결과>;
  /** 앞 자식이 남긴 프로세스를 거둔다 — 폰은 작성 끝까지 쥔 채다(§3.6 「★ 앱 탐색」 결정 7) */
  거두기: () => Promise<boolean>;
  멈추라했다: () => boolean;
  알린다: (글: string) => void;
  지금?: () => number;
}

const 요구들 = (x: 앱배운줄): string[] => {
  const d = x.learned.data;
  const 요구 = typeof d === 'object' && d !== null && !Array.isArray(d) ? (d as { 요구?: unknown }).요구 : undefined;
  return [요구].flat().filter((n): n is string => typeof n === 'string');
};

/** 이어 작성 · 반영이 다시 볼 줄 — 맡은 요구 번호를 data.요구 에 단 줄과 그 화면 */
export function 맡은줄(줄들: readonly 앱배운줄[], 번호들: readonly string[]): { 열쇠: string[]; 화면: string[] } {
  const 들 = 줄들.filter((x) => 요구들(x).some((n) => 번호들.includes(n)));
  return { 열쇠: 들.map((x) => x.key), 화면: [...new Set(들.flatMap((x) => (x.screen === null ? [] : [x.screen])))] };
}

export async function 앱학습하기(o: 앱학습손): Promise<학습결과> {
  const 앞낸것: string[] = [];
  const 지금 = o.지금 ?? Date.now;
  // 앞 실행이 남긴 「정리하라」 알림이 다음 세션의 명령에 찍히지 않게
  const 알림지우기 = (): void => rmSync(join(o.자료, 앱배움자리.알림), { force: true });
  알림지우기();
  const 상태 = 상태읽기(o.자료, 앱배움자리.상태);
  if (상태.끝) return { 앞낸것 };
  const 건너뛴다 = (왜: string, 알릴것: boolean): 학습결과 => {
    o.알린다(`앱 배우기를 건너뛴다 — ${왜}`);
    if (알릴것) 상태쓰기(o.자료, { ...상태, 안함: 왜 }, 앱배움자리.상태);
    return { 앞낸것 };
  };
  if (o.못함 !== null) return 건너뛴다(o.못함, true);
  const 빌드 = await o.빌드();
  // 찾기 명령 `--check` 가 빌드가 바뀐 줄을 열린 물음으로 센다. 모르면 앞 실행이 남긴 빌드를 지운다 — 남기면 낡은 빌드로 모든 확인 줄이 열린 물음이 된다
  if (빌드 !== undefined) 새로쓰기(join(o.자료, 앱배움자리.빌드), 빌드);
  else rmSync(join(o.자료, 앱배움자리.빌드), { force: true });
  const 부분 = o.번호들 === undefined ? undefined : 맡은줄(지금배운것(o.자료), o.번호들);
  if (부분 !== undefined && 상태.쓴ms === 0 && 부분.열쇠.length === 0) return 건너뛴다('맡은 요구를 근거로 단 배운 줄이 없다', false);
  const 총 = 부분 === undefined ? 학습값.총_ms : 학습값.부분_ms;
  const 남은 = (): number => 총 - 상태.쓴ms;
  let 못올림: string[] = [];

  type 세션끝 = { 열쇠수: number } | { 끝: 띄운결과 };
  const 한세션 = async (): Promise<세션끝> => {
    const 제한 = 남은();
    const 알림 = (글: string): void => {
      try {
        새로쓰기(join(o.자료, 앱배움자리.알림), 글);
      } catch (e) {
        o.알린다(`정리하라는 알림을 못 남겼다 — ${e instanceof Error ? e.message : String(e)}`);
      }
    };
    const 끊기 = new AbortController();
    const 정리때 = setTimeout(() => 알림('세션 끝까지 5분 남았다 — 하던 것을 적고 쪽지(`note:쪽지`)를 고쳐 쓴 뒤 끝낸다'), Math.max(0, 제한 - 학습값.정리앞_ms));
    const 마감 = setTimeout(() => 끊기.abort(), 제한);
    let 알렸나 = false;
    const 먹기 = (줄: string): void => {
      const 크기 = 컨텍스트크기(줄);
      if (크기 === null) return;
      if (크기 >= 학습값.교대토큰) 끊기.abort();
      else if (크기 >= 학습값.정리토큰 && !알렸나) {
        알렸나 = true;
        알림('컨텍스트를 곧 다 쓴다(60% 에서 다음 AI 로 바뀐다) — 하던 것을 적고 쪽지(`note:쪽지`)를 고쳐 쓴 뒤 끝낸다(다음 세션은 배운 것만 보고 잇는다)');
      }
    };
    const 시작 = 지금();
    // 못 올린 채 남은 줄은 앞 세션 것이다 — 이 세션이 새로 적거나 바꾼 줄만 배운 것으로 센다
    const 적은지문 = (): Set<string> => new Set(적은줄들(안전히읽기(o.자료, 앱배움자리.적은, 4 * 1024 * 1024)).filter((e) => e.key !== 쪽지열쇠).map((e) => JSON.stringify(e)));
    const 앞적은 = 적은지문();
    const 글짓기 = (): string => {
      // 이어 띄운 자식은 컨텍스트가 새것이다
      알림지우기();
      알렸나 = false;
      const 쪽지 = 지금배운것(o.자료).find((x) => x.key === 쪽지열쇠)?.learned.text;
      const 끝 = 끝내도되나(o.자료, 빌드);
      return o.프롬프트({
        남은분: Math.max(1, Math.round((제한 - (지금() - 시작)) / 분)), ...(빌드 === undefined ? {} : { 빌드 }), 차례: 상태.세션 + 1, 못올림,
        ...(쪽지 === undefined ? {} : { 쪽지 }), ...(부분 === undefined ? {} : { 부분 }), 남은화면: 끝.남은화면, 열린: 끝.열린,
      });
    };
    const r = await o.한번(글짓기, 끊기.signal, 먹기).finally(() => (clearTimeout(정리때), clearTimeout(마감)));
    상태.쓴ms += 지금() - 시작;
    const 끝으로 = (돌린것 = r.돌린것): { 끝: 띄운결과 } => ({ 끝: { ...r, 돌린것, 앞낸것: r.앞낸것 === null ? [] : [r.앞낸것] } });
    if (!(await o.거두기())) return 끝으로();
    // 쪽지는 배운 줄이 아니다 — 세션마다 고쳐 쓰는 줄이라 세면 「빈손 두 번이면 그친다」가 안 걸린다. 올리기 전에 센다(올리면 파일이 지워진다)
    const 새수 = [...적은지문()].filter((x) => !앞적은.has(x)).length;
    const 올림 = await 배운것올리기(o.통로, o.자료, o.비밀);
    못올림 = 올림.못올림;
    상태.열쇠 = [...new Set([...상태.열쇠, ...올림.열쇠])];
    상태쓰기(o.자료, 상태, 앱배움자리.상태);
    for (const 왜 of 못올림) o.알린다(`앱 배우기 — ${왜}`);
    if (r.돌린것.마감으로끊김 !== true && (r.돌린것.코드 === null || 끝낼상태(r.돌린것, false) !== null)) return 끝으로();
    if (o.멈추라했다()) return 끝으로({ ...r.돌린것, 멈춤으로죽음: true });
    앞낸것.push(...(r.앞낸것 === null ? [] : [r.앞낸것]), r.돌린것.낸것);
    // 끝까지 간 세션만 센다 — 끊긴 세션을 세면 이어받았을 때 한 번도 안 배우고 끝난다
    상태.세션 += 1;
    상태쓰기(o.자료, 상태, 앱배움자리.상태);
    // ※ 알림은 「다음 AI 로 바뀐다」고 약속했다 — 그 뒤 끝낸 것은 스스로 끝낸 게 아니라 교대다. 남았으면 위 반복이 새 세션(새 대화)으로 잇고, 앱에는 헛이음 세기가 따로 없어 빈손으로만 센다
    o.알린다(`앱 배우기 세션 ${String(상태.세션)} 끝(${r.돌린것.마감으로끊김 === true ? '마감' : 알렸나 ? '※ 정리 알림 뒤 끝냄' : '스스로 끝냄'} · 지금까지 ${String(Math.round(상태.쓴ms / 분))}분) — 올린 줄 ${String(올림.열쇠.length)}`);
    return { 열쇠수: 새수 };
  };

  /** 늘 한 번은 띄운다 — crawl 이 세션 안에서 돌아 새 화면은 띄운 뒤에야 안다. 이어 작성 · 반영은 한 세션뿐이다 */
  const 더배우나 = (): boolean => {
    if (남은() < 학습값.최소_ms) return false;
    if (상태.세션 === 0) return true;
    if (부분 !== undefined) return false;
    const 끝 = 끝내도되나(o.자료, 빌드);
    return 끝.남은화면.length > 0 || 끝.열린.length > 0;
  };
  let 빈손 = 0;
  while (더배우나()) {
    const r = await 한세션();
    if ('끝' in r) {
      알림지우기();
      return { 끝: { ...r.끝, 돌린것: 못뜬것은끊김(r.끝.돌린것, 앞낸것) }, 앞낸것 };
    }
    빈손 = r.열쇠수 === 0 ? 빈손 + 1 : 0;
    if (빈손 >= 학습값.빈손상한) {
      o.알린다(`앱 배우기 — 한 줄도 못 배운 세션이 ${String(빈손)}번 이어져 그친다`);
      break;
    }
  }
  알림지우기();
  상태.끝 = true;
  // 2시간이 끝나도(빈손으로 그쳐도) 남았으면 막지 않고 PR 머리에 단다. 이어 작성 · 반영은 맡은 화면만 봐 세지 않는다
  if (부분 === undefined) 상태.남은화면 = 끝내도되나(o.자료, 빌드).남은화면;
  상태쓰기(o.자료, 상태, 앱배움자리.상태);
  return { 앞낸것 };
}

/** 작성 끝에 PR 머리에 싣는 줄 — 못 올린 배운 줄을 한 번 더 올리고, 사람이 움직일 것만 적는다. 배우지 않은 작성이면 빈 목록 */
export async function 앱학습끝줄(통로: 화면통로, 자료: string, 비밀: readonly string[]): Promise<string[]> {
  const 상태 = 상태읽기(자료, 앱배움자리.상태);
  if (상태.쓴ms === 0) return 상태.안함 === undefined ? [] : [`앱 배우기: 안 함 — ${상태.안함}`];
  const 올림 = existsSync(join(자료, 앱배움자리.적은)) ? await 배운것올리기(통로, 자료, 비밀) : { 열쇠: [], 못올림: [] };
  return [
    `앱 배우기: 세션 ${String(상태.세션)}번 · ${String(Math.round(상태.쓴ms / 분))}분`,
    ...올림.못올림.map((왜) => `앱 배우기: ${왜}`),
    ...사람줄(지금배운것(자료), new Set([...상태.열쇠, ...올림.열쇠]), 상태.남은화면 ?? []),
  ].map((줄) => (계정섞였나([줄], 비밀) ? `${줄.split(':')[0]!}: 테스트 계정 비밀번호가 들어 있어 안 적음` : 줄));
}
