// 게임 배우기의 기록과 올리기 — 자료 폴더의 학습 기록 · 배운 줄과 조작 맵 행 올리기 · 작성 끝에 PR 머리에 싣는 줄 (도메인/게임 §3.10 「게임 배우기」)
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { 맵올리기 } from './authoring-explore.js';
import { type 배운것, 요소종류 } from '../apps/admin/src/prd/gameKinds.js';
import { 근거들, 바뀜, 적은줄들, 지금지도, 지도읽기 } from './authoring-game-find.js';
import { 게임자리, 글받기, 요소상한, 지도상한 } from './authoring-game.js';
import { 부른다 } from './authoring-io.js';
import { 글자들, 사람줄 } from './authoring-learn-map.js';
import { 옮김읽기, 이을번호 } from './authoring-learn-prd.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { type 화면통로, 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

const 분 = 60_000;

/** 에이전트가 자료 폴더에 남기는 기록 — 이어받은 실행이 쓴 시간을 잇고, 끝났으면 건너뛴다 */
export interface 학습상태 {
  쓴ms: number;
  세션: number;
  끝: boolean;
  안함?: string;
  시험?: string;
  /** 이번 작성이 올린 열쇠 — PR 머리의 사람이 볼 줄은 이 가운데서만 싣는다 */
  열쇠: string[];
}

export function 상태읽기(자료: string): 학습상태 {
  const 없음: 학습상태 = { 쓴ms: 0, 세션: 0, 끝: false, 열쇠: [] };
  try {
    const 몸 = JSON.parse(안전히읽기(자료, 게임자리.학습, 1_000_000) ?? 'null') as Partial<학습상태> | null;
    if (몸 === null) return 없음;
    const 수 = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
    return {
      쓴ms: 수(몸.쓴ms),
      세션: 수(몸.세션),
      끝: 몸.끝 === true,
      ...(typeof 몸.안함 === 'string' ? { 안함: 몸.안함 } : {}),
      ...(typeof 몸.시험 === 'string' ? { 시험: 몸.시험 } : {}),
      열쇠: Array.isArray(몸.열쇠) ? 몸.열쇠.filter((k): k is string => typeof k === 'string') : [],
    };
  } catch {
    return 없음;
  }
}
export const 상태쓰기 = (자료: string, 상태: 학습상태): void => 새로쓰기(join(자료, 게임자리.학습), JSON.stringify(상태));

/**
 * 적은 줄을 서버 지도에 올리고 지도 글을 다시 받는다. 다시 받기까지 되어야 적은 파일을 지운다 — 먼저 지우면 다음 세션의 지도에서 이번 줄이 사라진다.
 * 조작 맵에 적은 행도 같이 올린다. 못 올려도 다음 세션은 적은 파일을 얹어 본다
 */
export async function 배움올리기(통로: 화면통로, 자료: string, 비밀: readonly string[]): Promise<{ 열쇠: string[]; 못올림: string[] }> {
  const 맵 = await 맵올리기(통로, 자료, 비밀);
  const 못올림 = 맵.틀림 === null ? [] : [맵.틀림];
  const 글 = 안전히읽기(자료, 게임자리.배운글, 요소상한);
  if (글 === null) return { 열쇠: [], 못올림: existsSync(join(자료, 게임자리.배운글)) ? [...못올림, `${게임자리.배운글} 이 4MB 를 넘거나 일반 파일이 아니다`] : 못올림 };
  const elements = 적은줄들(글);
  if (elements.length === 0) return { 열쇠: [], 못올림 };
  if (계정섞였나(글자들(elements), 비밀)) return { 열쇠: [], 못올림: [...못올림, '배운 줄에 테스트 계정 비밀번호가 들어 있다'] };
  try {
    const 답 = await 부른다(통로.주소기지, 통로.토큰, `/authoring/requests/${통로.번호}/game-elements`, { method: 'PUT', body: { elements } });
    if (답.status !== 204) {
      const 자리 = (답.몸 as { detail?: unknown } | null)?.detail;
      return { 열쇠: [], 못올림: [...못올림, `배운 줄을 서버가 안 받았다(${답.status}${typeof 자리 === 'string' ? ` ${자리.slice(0, 100)}` : ''})`] };
    }
  } catch (e) {
    return { 열쇠: [], 못올림: [...못올림, `배운 줄을 못 올렸다 — ${e instanceof Error ? e.message : String(e)}`] };
  }
  const 왜 = await 글받기(통로, 자료, 'game-map', 게임자리.지도);
  if (왜 === null) rmSync(join(자료, 게임자리.배운글), { force: true });
  return { 열쇠: elements.map((e) => e.key), 못올림: 왜 === null ? 못올림 : [...못올림, `올린 뒤 지도를 다시 못 받았다 — ${왜}`] };
}

const 요구번호꼴 = /^[A-Z][A-Z0-9]*-REQ-\d{3}$/;

/**
 * 표준 기획서를 올린 뒤(임시 번호가 받은 번호로 바뀐 뒤) 옮김 표의 번호를 배운 줄에 단다 — 안 달면 다음 반영이 이미 배운 요구를 30분 다시 배우고, 화면만이 같은 줄을 또 옮긴다.
 * 번호와 안 옮긴 까닭을 배운 값(`요구` · `안옮김` 칸)에도 남긴다 — 사람이 요구를 지우면 서버가 근거를 떼어, 남은 것이 없으면 다음 화면만이 그 요구를 되살린다. 게임이 만든 종류는 서버가 근거를 안 받아 이 칸뿐이다.
 * 배운 것은 지도에서 읽은 그대로 같이 보낸다 — 빼고 보내면 서버가 기획서 값을 지운다. 「기획서가 바뀜」이 붙은 줄은 건드리지 않는다(근거를 실으면 그 표시가 비어 다음 세션이 옛 값을 못 고친다).
 * 못 달아도 작성은 간다 — PR 머리 줄에만 적는다
 */
export async function 번호달기(통로: 화면통로, 자료: string, 접두사: string, 화면만: boolean): Promise<string[]> {
  const 표 = 옮김읽기(안전히읽기(자료, 게임자리.옮김, 요소상한));
  const 못달음 = (왜: string): string[] => [`배운 줄에 요구 번호: 못 달았음 — ${왜}`];
  if (표.틀림 !== null) return 못달음(표.틀림);
  if (표.옮김.size + 표.안옮김.size === 0) return [];
  // 이번에 올린 요소(game-elements.json)의 근거까지 든 지도에 더한다 — 서버는 근거를 통째로 바꾼다
  const 왜 = await 글받기(통로, 자료, 'game-map', 게임자리.지도);
  const 글 = 왜 === null ? 안전히읽기(자료, 게임자리.지도, 지도상한) : null;
  if (글 === null) return 못달음(`지도를 다시 못 받았다${왜 === null ? '' : `(${왜})`}`);
  const 지금 = 지도읽기(글);
  const 이을 = 이을번호(자료, 접두사, 지금, 표);
  const elements = 지금.줄들.flatMap((x): { kind: string; key: string; name: string; learned: 배운것; reqIds?: string[] }[] => {
    const 번호들 = (이을.get(x.key) ?? []).filter((n) => 요구번호꼴.test(n));
    // 대조 · 첫 작성의 까닭(기획서 밖 기능)을 남기면 화면만이 그 줄을 영영 안 옮긴다
    const 까닭 = 화면만 ? 표.안옮김.get(x.key) : undefined;
    if (x.learned === null || x.kind === 'KIND' || 바뀜(x) !== null || (번호들.length === 0 && 까닭 === undefined)) return [];
    const 있던 = 근거들(x);
    const reqIds = [...new Set([...있던, ...번호들])].slice(0, 50);
    const d = x.learned.data;
    // 잰 값이 칸 묶음일 때만 남길 자리가 있다
    const 칸 = d === undefined || (typeof d === 'object' && d !== null && !Array.isArray(d)) ? (d as { 요구?: unknown } | undefined) ?? {} : null;
    const 남긴 = [칸?.요구].flat().filter((n): n is string => typeof n === 'string');
    const 요구 = [...new Set([...남긴, ...번호들])];
    const data = 칸 === null ? d : { ...칸, ...(번호들.length > 0 ? { 요구 } : {}), ...(까닭 === undefined ? {} : { 안옮김: 까닭.slice(0, 200) }) };
    const learned = { ...x.learned, ...(data === undefined ? {} : { data }) };
    const 근거더함 = Object.hasOwn(요소종류, x.kind) && reqIds.length > 있던.length;
    if (!근거더함 && JSON.stringify(learned) === JSON.stringify(x.learned)) return [];
    return [{ kind: x.kind, key: x.key, name: x.name, learned, ...(근거더함 ? { reqIds } : {}) }];
  });
  if (elements.length === 0) return [];
  try {
    const 답 = await 부른다(통로.주소기지, 통로.토큰, `/authoring/requests/${통로.번호}/game-elements`, { method: 'PUT', body: { elements } });
    if (답.status === 204) return [];
    const 자리 = (답.몸 as { detail?: unknown } | null)?.detail;
    return 못달음(`서버 ${답.status}${typeof 자리 === 'string' ? ` ${자리.slice(0, 100)}` : ''}`);
  } catch (e) {
    return 못달음(e instanceof Error ? e.message : String(e));
  }
}

/** 작성 끝에 PR 머리에 싣는 줄 — 못 올린 배운 줄을 한 번 더 올리고, 시험 성적 · 버그 후보 · 사람에게 물을 것만 적는다. 배우지 않은 작성이면 빈 목록 */
export async function 학습끝줄(통로: 화면통로, 자료: string, 비밀: readonly string[]): Promise<string[]> {
  const 상태 = 상태읽기(자료);
  if (상태.쓴ms === 0) return 상태.안함 === undefined ? [] : [`게임 학습: 안 함 — ${상태.안함}`];
  const 올림 = 안전히읽기(자료, 게임자리.배운글, 요소상한) === null ? { 열쇠: [], 못올림: [] } : await 배움올리기(통로, 자료, 비밀);
  const 지도 = 지금지도(자료);
  return [
    `게임 학습: 세션 ${상태.세션}번 · ${Math.round(상태.쓴ms / 분)}분 — 시험: ${상태.시험 ?? '못 봄'}`,
    ...올림.못올림.map((왜) => `게임 학습: ${왜}`),
    ...(지도 === null ? [] : 사람줄(지도, new Set([...상태.열쇠, ...올림.열쇠]), 비밀)),
  ].map((줄) => (계정섞였나([줄], 비밀) ? `${줄.split(':')[0]!}: 테스트 계정 비밀번호가 들어 있어 안 적음` : 줄));
}
