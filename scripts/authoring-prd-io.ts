// 표준 기획서 옮기기의 껍데기 — 자식 앞에서 지금 판을 자료 폴더에 두고, 자식 뒤에서 결과를 읽어 대조하고 서버에 올린다
// 판단은 authoring-prd.ts 에 있다. 실패해도 케이스 PR 은 막지 않고 PR 본문 머리 줄로 남긴다 (도메인/작성 §3.6 「★ 표준 기획서」 「옮기기」)

import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { PrdItem } from '@platform/kit/types';

import { 본문상한 } from '../apps/admin/src/prd/rules.js';
import { 비밀섞였나 } from './authoring-chain.js';
import type { 사본 } from './authoring-copy.js';
import { 거절글, 부른다 } from './authoring-io.js';
import type { 원장 } from './authoring-ledger.js';
import { 대조줄들, 옮긴것읽기, 옮기기대조, 판줄들, 판합치기 } from './authoring-prd.js';
import { 계정섞였나, 글모두 } from './authoring-reverse.js';
import { 산출물읽기 } from './authoring-upload-reverse.js';

type 서버 = { 주소기지: string; 토큰: string };

/** 자식 프롬프트의 표준 기획서 절 재료 */
export interface 표준기획서입력 {
  지금판: string;
  결과: string;
  판: number;
  항목수: number;
}

const 결과이름 = 'prd.json';

/** 거절(401 · 403)만 다시 던진다 — 줄 돌기가 그걸 보고 멈춘다. 그 밖은 머리 줄로 남기고 케이스는 올린다 */
function 거절말고(err: unknown): string {
  if (err instanceof Error && err.message.includes(거절글)) throw err;
  return err instanceof Error ? err.message : String(err);
}

const 통로 = (번호: number, 서비스: string) => `/authoring/requests/${String(번호)}/prd?service=${encodeURIComponent(서비스)}`;

async function 지금판읽기(서버: 서버, 서비스: string, 번호: number): Promise<{ version: number; items: PrdItem[] } | { 까닭: string }> {
  const 답 = await 부른다(서버.주소기지, 서버.토큰, 통로(번호, 서비스));
  const 몸 = 답.몸 as { version?: unknown; items?: unknown } | null;
  if (답.status !== 200 || typeof 몸?.version !== 'number' || !Array.isArray(몸.items)) return { 까닭: String(답.status) };
  return { version: 몸.version, items: 몸.items as PrdItem[] };
}

/** 자식을 띄우기 전에 부른다. 못 받으면 옮기지 않는다 — 옮기기는 작성을 막지 않는다 */
export async function 판받기(서버: 서버, 서비스: string, 번호: number, 자료폴더: string): Promise<{ 입력: 표준기획서입력 } | { 줄: string }> {
  try {
    const 판 = await 지금판읽기(서버, 서비스, 번호);
    if ('까닭' in 판) return { 줄: `⚠️ 표준 기획서 지금 판을 못 읽어 옮기지 않았다 (${판.까닭})` };
    const 지금판 = join(자료폴더, 'prd-current.json');
    // 이어받은 폴더면 앞 자식이 이 이름에 링크를 심어 뒀을 수 있다 — 지우고 새로 만든다(링크를 따라가 남의 파일에 쓰지 않게)
    rmSync(지금판, { force: true });
    writeFileSync(지금판, JSON.stringify(판, null, 2), { mode: 0o644, flag: 'wx' });
    return { 입력: { 지금판, 결과: join(자료폴더, 'out', 결과이름), 판: 판.version, 항목수: 판.items.length } };
  } catch (err) {
    return { 줄: `⚠️ 표준 기획서 지금 판을 못 읽어 옮기지 않았다: ${거절말고(err)}` };
  }
}

/** 자식이 정상으로 끝난 뒤 · PR 을 만들기 전에 부른다. 돌려준 줄이 PR 본문 머리에 실린다 */
export async function 옮기기올리기(
  서버: 서버,
  서비스: string,
  번호: number,
  자리: 사본,
  원장값: 원장 | { 없음: string },
  비밀: { 피그마?: string; 계정?: string | null },
): Promise<string[]> {
  // 자식이 쓴 파일이라 링크 · 크기를 보고 읽는다(역방향 산출물과 같은 손)
  const 파일 = 산출물읽기(자리, 결과이름, 본문상한);
  if ('사유' in 파일) return [`⚠️ ${파일.사유}`];
  if (파일.몸 === null) return [`⚠️ 표준 기획서 결과(out/${결과이름})가 없다 — 옮기지 않았다`];
  const 글 = 파일.몸.toString('utf8');
  let 몸: unknown;
  try {
    몸 = JSON.parse(글);
  } catch {
    return ['⚠️ 표준 기획서 결과를 못 읽었다 — JSON 이 아니다'];
  }
  // 날 글자와 푼 값을 둘 다 본다 — JSON 이스케이프가 따옴표 · 역슬래시 든 비밀번호를 가린다. 올리면 「PRD 관리」 · 워드에 보인다
  const 글들 = [글, ...글모두(몸)];
  if (비밀섞였나(글들, 비밀.피그마) || 계정섞였나(글들, 비밀.계정)) return ['⚠️ 표준 기획서 결과에 비밀값이 들어 있다 — 올리지 않았다'];
  const 옮긴 = 옮긴것읽기(몸, 서비스);
  if ('사유' in 옮긴) return [`⚠️ 표준 기획서 결과를 못 읽었다 — ${옮긴.사유}`];
  const 대조 = 대조줄들('없음' in 원장값 ? 원장값 : 옮기기대조(원장값.항목, 옮긴));
  try {
    // 자식 앞에서 받은 판이 아니라 지금 판에 합친다 — 자식이 도는 동안 같은 서비스의 다른 작성이 올린 항목 ·
    // 사람이 고친 항목을 옛 판으로 덮어 지우지 않게. 서버는 보내지 않은 번호를 지운다(§7 에이전트 `POST …/:id/prd`)
    const 판 = await 지금판읽기(서버, 서비스, 번호);
    if ('까닭' in 판) return [`⚠️ 표준 기획서를 못 올렸다 — 지금 판을 못 읽었다 (${판.까닭})`, ...대조];
    const 합친 = 판합치기(판.items, 옮긴);
    const 답 = await 부른다(서버.주소기지, 서버.토큰, 통로(번호, 서비스), { method: 'POST', body: { baseVersion: 판.version, items: 합친.items } });
    const 받음 = 답.몸 as { version?: unknown; keptByPerson?: unknown; error?: unknown; detail?: unknown } | null;
    if (답.status !== 200 || typeof 받음?.version !== 'number') {
      const 까닭 = [받음?.error, 받음?.detail].filter((v) => typeof v === 'string').join(' ');
      return [`⚠️ 표준 기획서를 못 올렸다 (${String(답.status)}${까닭 === '' ? '' : ` ${까닭}`})`, ...대조];
    }
    const 사람것 = Array.isArray(받음.keptByPerson) ? 받음.keptByPerson.filter((v): v is string => typeof v === 'string') : [];
    return [...판줄들(받음.version, 옮긴, 합친, 사람것), ...대조];
  } catch (err) {
    return [`⚠️ 표준 기획서를 못 올렸다: ${거절말고(err)}`, ...대조];
  }
}
