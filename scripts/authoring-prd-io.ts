// 표준 기획서 껍데기 — 자식 앞에서 지금 판을 자료 폴더에 두고, 자식 뒤에서 결과를 읽어 대조하고 서버에 올린 뒤 표의 임시 번호를 바꿔 적는다
// 판단은 authoring-prd.ts 에 있다. 케이스가 표준 기획서 번호를 읽으므로 못 올리면 올리기 거절이다 (도메인/작성 §3.6 「작성은 표준 기획서만 읽는다」)

import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { PrdItem } from '@platform/kit/types';

import { 본문상한 } from '../apps/admin/src/prd/rules.js';
import { 비밀섞였나 } from './authoring-chain.js';
import type { 사본 } from './authoring-copy.js';
import { 거절글, 부른다 } from './authoring-io.js';
import { type 원장, 번호바꾸기 } from './authoring-ledger.js';
import type { 기준결정 } from './authoring-ledger-check.js';
import { type 기준표, 기준결정만들기, 옛표줄들, 표번호바꾸기 } from './authoring-ledger-io.js';
import { type 옮긴것, 대조줄들, 보낼항목, 새번호맞추기, 옛번호지도, 옮긴것읽기, 옮기기대조, 판줄들, 판합치기, 표준원장 } from './authoring-prd.js';
import { 계정섞였나, 글모두, 비밀가리기 } from './authoring-reverse.js';
import { 산출물읽기 } from './authoring-upload-reverse.js';

export type 서버 = { 주소기지: string; 토큰: string };

/** 자식 프롬프트의 표준 기획서 절 재료 */
export interface 표준기획서입력 {
  지금판: string;
  결과: string;
  판: number;
  항목수: number;
}

/** 자식 앞에서 받은 판 — 올릴 때 기준 판(baseVersion)이다. 그 뒤 사람이 지운 번호는 서버가 되살리지 않고 돌려준다 */
export interface 앞판 {
  version: number;
  번호들: string[];
  /** 비밀번호를 가린 항목 — 자식에게 주는 원장 사본을 이것으로 만든다 */
  items: PrdItem[];
}

export const 결과이름 = 'prd.json';

/** 거절(401 · 403)만 다시 던진다 — 줄 돌기가 그걸 보고 멈춘다. 그 밖은 까닭 글로 돌려준다 */
export function 거절말고(err: unknown): string {
  if (err instanceof Error && err.message.includes(거절글)) throw err;
  return err instanceof Error ? err.message : String(err);
}

export const 통로 = (번호: number, 서비스: string) => `/authoring/requests/${String(번호)}/prd?service=${encodeURIComponent(서비스)}`;

type 판 = { version: number; items: PrdItem[] };

/** 지금 판과 기준 판(「반영 안 됨」의 기준 — 반영 요청이 쓴다). 기준 판 모양이 틀리면 없는 것으로 본다 */
export async function 지금판읽기(서버: 서버, 서비스: string, 번호: number): Promise<(판 & { base: 판 | null }) | { 까닭: string }> {
  const 답 = await 부른다(서버.주소기지, 서버.토큰, 통로(번호, 서비스));
  const 몸 = 답.몸 as { version?: unknown; items?: unknown; base?: { version?: unknown; items?: unknown } | null } | null;
  if (답.status !== 200 || typeof 몸?.version !== 'number' || !Array.isArray(몸.items)) return { 까닭: String(답.status) };
  const base = typeof 몸.base?.version === 'number' && Array.isArray(몸.base.items) ? { version: 몸.base.version, items: 몸.base.items as PrdItem[] } : null;
  return { version: 몸.version, items: 몸.items as PrdItem[], base };
}

/**
 * 자식을 띄우기 전에 부른다. 작성은 표준 기획서만 읽으므로 못 받으면 까닭 — 부르는 쪽이 요청을 실패로 끝낸다.
 * 역방향이면 비밀번호를 가려 쓴다 — 자료 폴더 가리기(먼저가리기)보다 뒤에 쓰는 파일이라서다. 안 가리면 자식이 베껴 옮기기가 매번 막힌다
 */
export async function 판받기(
  서버: 서버,
  서비스: string,
  번호: number,
  자료폴더: string,
  비밀?: string | null,
): Promise<{ 입력: 표준기획서입력; 앞판: 앞판; 기준판: 판 | null } | { 까닭: string }> {
  try {
    const 판 = await 지금판읽기(서버, 서비스, 번호);
    if ('까닭' in 판) return { 까닭: `표준 기획서 지금 판을 못 읽었다 (${판.까닭})` };
    const 지금판 = join(자료폴더, 'prd-current.json');
    // 글 값만 가린다 — JSON 글을 통째로 가리면 비밀번호가 키 · 숫자와 같을 때(「text」 · 「1234」) 깨진 JSON 이 돼 작성이 멈춘다
    const 가리기 = (_k: string, v: unknown) => (typeof v === 'string' ? 비밀가리기(v, 비밀) : v);
    const 가린글 = JSON.stringify({ version: 판.version, items: 판.items }, 가리기, 2);
    // 이어받은 폴더면 앞 자식이 이 이름에 링크를 심어 뒀을 수 있다 — 지우고 새로 만든다(링크를 따라가 남의 파일에 쓰지 않게)
    rmSync(지금판, { force: true });
    writeFileSync(지금판, 가린글, { mode: 0o644, flag: 'wx' });
    return {
      입력: { 지금판, 결과: join(자료폴더, 'out', 결과이름), 판: 판.version, 항목수: 판.items.length },
      앞판: { version: 판.version, 번호들: 판.items.map((i) => i.reqId), items: (JSON.parse(가린글) as { items: PrdItem[] }).items },
      // 옛 문장도 반영 계획 사본으로 자식에게 간다 — 같은 손으로 가린다
      기준판: 판.base === null ? null : (JSON.parse(JSON.stringify(판.base, 가리기)) as 판),
    };
  } catch (err) {
    return { 까닭: `표준 기획서 지금 판을 못 읽었다: ${거절말고(err)}` };
  }
}

/**
 * 이어받은 폴더에 앞 자식이 쓴 결과 파일 — 원장 사본에 그 임시 번호를 이어 싣는다. 없거나 못 읽으면 undefined.
 * 앞 실행이 올린 뒤 번호를 바꿔 적기 전에 멈췄으면 그 항목은 이미 판에 있다(문장으로 번호를 물려받는다) — 표와 결과 파일의 임시 번호를
 * 그 번호로 먼저 바꿔 둔다. 안 바꾸면 원장은 받은 번호 · 표는 임시 번호라 자식이 관문 0 을 못 넘긴다. 자식은 아직 안 떴다
 */
export function 앞결과(자리: 사본, 지금: readonly PrdItem[], 서비스: string): unknown {
  const 파일 = 산출물읽기(자리, 결과이름, 본문상한);
  if ('사유' in 파일 || 파일.몸 === null) return undefined;
  const 글 = 파일.몸.toString('utf8');
  let 몸: unknown;
  try {
    몸 = JSON.parse(글);
  } catch {
    return undefined;
  }
  const 옮긴 = 옮긴것읽기(몸, 서비스);
  if ('사유' in 옮긴) return 몸;
  const 맞춤 = new Map(판합치기(지금, 옮긴).items.flatMap((i) => (i.reqId !== undefined && i.임시 !== undefined ? [[i.임시, i.reqId] as const] : [])));
  if (맞춤.size === 0 || 표번호바꾸기(자리.트리, 서비스, 맞춤) !== null) return 몸;
  const 새글 = 번호바꾸기(글, 맞춤);
  writeFileSync(join(자리.자료, 'out', 결과이름), 새글);
  return JSON.parse(새글) as unknown;
}

/**
 * 자식이 쓴 결과 파일을 읽는다 — 옮기기와 화면이 맞음이 같은 손을 쓴다. 파일이 없으면 null.
 * 링크 · 크기를 보고 읽고(역방향 산출물과 같은 손) 비밀값이 들면 거절이다 — 올리면 「PRD 관리」 · 워드에 보인다
 */
export function 결과읽기(자리: 사본, 서비스: string, 비밀: { 피그마?: string; 계정?: string | null }): { 글: string; 옮긴: 옮긴것 } | { 거절: string } | null {
  const 파일 = 산출물읽기(자리, 결과이름, 본문상한);
  if ('사유' in 파일) return { 거절: 파일.사유 };
  if (파일.몸 === null) return null;
  const 글 = 파일.몸.toString('utf8');
  let 몸: unknown;
  try {
    몸 = JSON.parse(글);
  } catch {
    return { 거절: '표준 기획서 결과를 못 읽었다 — JSON 이 아니다' };
  }
  // 날 글자와 푼 값을 둘 다 본다 — JSON 이스케이프가 따옴표 · 역슬래시 든 비밀번호를 가린다
  const 글들 = [글, ...글모두(몸)];
  if (비밀섞였나(글들, 비밀.피그마) || 계정섞였나(글들, 비밀.계정)) return { 거절: '표준 기획서 결과에 비밀값이 들어 있다 — 결과 파일에서 지워라' };
  const 옮긴 = 옮긴것읽기(몸, 서비스);
  return '사유' in 옮긴 ? { 거절: `표준 기획서 결과를 못 읽었다 — ${옮긴.사유}` } : { 글, 옮긴 };
}

/**
 * 자식이 정상으로 끝난 뒤 · 올리기 전에 부른다. 돌려준 줄이 PR 본문 머리에 실리고, 원장 · 기준은 올리기 판정이 쓴다.
 * **못 올리면 `거절`** — 표가 표준 기획서 번호(임시 번호 포함)에 매여 있어 판 없이 PR 을 세우면 표가 없는 요구를 가리킨다.
 * 이어하기가 결과 파일을 고쳐 다시 올린다 (2026-10-10 시작 질문)
 */
export async function 옮기기올리기(
  서버: 서버,
  서비스: string,
  번호: number,
  자리: 사본,
  앞: 앞판,
  원본원장: 원장 | { 없음: string },
  비밀: { 피그마?: string; 계정?: string | null },
  기준: 기준표 | null,
  /** 서비스 테스트 폴더 — 옛 표를 옮겼으면 남은 옛 케이스 파일을 본다 */
  폴더: string,
): Promise<{ 줄: string[]; 원장: 원장 | { 없음: string }; 기준: 기준결정 } | { 거절: string; 줄: string[] }> {
  const 읽음 = 결과읽기(자리, 서비스, 비밀);
  if (읽음 === null) return { 거절: `표준 기획서 결과(out/${결과이름})가 없다`, 줄: [] };
  if ('거절' in 읽음) return { 거절: 읽음.거절, 줄: [] };
  const { 글, 옮긴 } = 읽음;
  // 워드에 PDF · 피그마가 섞이면 원장은 있어도 그 자료 몫은 대조하지 못한다 — 그 사실도 남긴다. 화면만은 원본이 없어 대조할 것이 없다
  const 대조 = '없음' in 원본원장
    ? 대조줄들(원본원장)
    : [...대조줄들(옮기기대조(원본원장.항목, 옮긴)), ...(원본원장.빠진자료.length > 0 ? 대조줄들({ 없음: 원본원장.빠진자료.join(' · ') }) : [])];
  const 못함 = (까닭: string) => ({ 거절: `표준 기획서를 못 올렸다 — ${까닭}`, 줄: 대조 });
  try {
    // 자식 앞에서 받은 판이 아니라 지금 판에 합친다 — 자식이 도는 동안 같은 서비스의 다른 작성이 올린 항목 ·
    // 사람이 고친 항목을 옛 판으로 덮어 지우지 않게. 서버는 보내지 않은 번호를 지운다(§7 에이전트 `POST …/:id/prd`).
    // 기준 판은 자식 앞 판이다 — 그 사이 사람이 지운 번호를 서버가 되살리지 않고 「사람이 고친 항목」으로 돌려준다
    const 판 = await 지금판읽기(서버, 서비스, 번호);
    if ('까닭' in 판) return 못함(`지금 판을 못 읽었다 (${판.까닭})`);
    const 합친 = 판합치기(판.items, 옮긴, new Set(앞.번호들));
    const 답 = await 부른다(서버.주소기지, 서버.토큰, 통로(번호, 서비스), { method: 'POST', body: { baseVersion: 앞.version, items: 보낼항목(합친.items) } });
    const 받음 = 답.몸 as { version?: unknown; keptByPerson?: unknown; error?: unknown; detail?: unknown } | null;
    if (답.status !== 200 || typeof 받음?.version !== 'number') {
      const 까닭 = [받음?.error, 받음?.detail].filter((v) => typeof v === 'string').join(' ');
      return 못함(`${String(답.status)}${까닭 === '' ? '' : ` ${까닭}`}`);
    }
    // 새 번호는 저장된 판에서 문장으로 짝지어 읽는다(응답에는 번호가 없다 — 계약 변경 없이)
    const 저장 = await 지금판읽기(서버, 서비스, 번호);
    if ('까닭' in 저장) return 못함(`올린 판(${String(받음.version)})을 다시 못 읽어 새 번호를 모른다 (${저장.까닭})`);
    const 맞춤 = 새번호맞추기(합친.items, 저장.items);
    if ('사유' in 맞춤) return 못함(맞춤.사유);
    // 표와 결과 파일의 임시 번호를 바꿔 적는다 — 이어하기가 이 파일을 다시 올려도 같은 번호를 가리키게.
    // 결과 파일은 위 산출물읽기가 일반 파일 · 폴더 안임을 봤고 자식은 거둬졌다 — 제자리에 써 자식 것으로 남긴다
    const 표막힘 = 표번호바꾸기(자리.트리, 서비스, 맞춤, true);
    if (표막힘 !== null) return 못함(표막힘);
    if (맞춤.size > 0) writeFileSync(join(자리.자료, 'out', 결과이름), 번호바꾸기(글, 맞춤));
    // 원장은 자식이 본 것과 같게 — 자식 앞 판에 결과 파일을 합친 항목에 받은 번호를 단다. 저장된 판으로 만들면 사람이 남긴 항목 ·
    // 그 사이 다른 저장이 차례를 밀어 칸 번호(원장 차례로 매긴다)가 어긋난다 (2026-10-10 코드 검토)
    const 항목들 = 판합치기(앞.items, 옮긴).items.map((i) => (i.임시 !== undefined && 맞춤.has(i.임시) ? { ...i, reqId: 맞춤.get(i.임시) } : i));
    const 원장값 = 표준원장(항목들);
    const 사람것 = Array.isArray(받음.keptByPerson) ? 받음.keptByPerson.filter((v): v is string => typeof v === 'string') : [];
    return {
      줄: [...판줄들(받음.version, 옮긴, 합친, 사람것), ...대조, ...(기준 === null ? [] : 옛표줄들(자리.트리, 서비스, 폴더, 기준.표글))],
      원장: 원장값,
      기준: 기준결정만들기(기준 === null ? null : { ...기준, 접두사: 서비스 }, '없음' in 원장값 ? [] : 원장값.항목.map((h) => h.번호), 옛번호지도(항목들)),
    };
  } catch (err) {
    return 못함(거절말고(err));
  }
}
