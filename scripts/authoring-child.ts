// 사본을 만들고 치우고, 자식 claude 를 자리의 uid 로 띄우는 껍데기. 판단은 authoring-copy.ts 의 순수 함수에 있다
// 자리 uid 로 넘기는 일(chown·kill)은 root 일 때만 한다 — 맥에서는 사람 계정 하나로 돈다

import { chmodSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { 명령 } from './authoring-chain.js';
import { type 계정, type 사본, type 파일모양, 남은사본, 사본제외, 사본준비, 사본자리 } from './authoring-copy.js';
import { type 돌린결과, 돌린다, 친다 } from './authoring-io.js';

/** 켤 때 바탕에 남은 사본을 지운다. 꺼지며 끊긴 건은 `멈춘것닫기` 가 실패로 닫았다 */
export function 남은사본치우기(바탕: string): void {
  mkdirSync(바탕, { recursive: true, mode: 0o755 });
  for (const 이름 of 남은사본(readdirSync(바탕))) {
    rmSync(join(바탕, 이름), { recursive: true, force: true });
    console.log(`[정리] 남은 사본을 지웠다: ${join(바탕, 이름)}`);
  }
}

/**
 * 사본을 만든다. 실패하면 까닭. 뿌리는 root 0755, git 은 root 0700,
 * 트리·집·자료·gh 는 **자리 uid 만** 쓰고 읽는 0700 이다 — 다른 자리 자식이 못 들여다본다
 */
export async function 사본만들기(
  번호: number,
  바탕: string,
  원천: string,
  원격주소: string,
  sha: string,
  자식: 계정 | null,
): Promise<{ 자리: 사본 } | { 까닭: string }> {
  const 자리 = 사본자리(번호, 바탕);
  rmSync(자리.뿌리, { recursive: true, force: true });
  mkdirSync(자리.뿌리, { recursive: true, mode: 0o755 });
  for (const 폴더 of [자리.트리, 자리.집, 자리.자료, 자리.gh]) mkdirSync(폴더, { mode: 0o700 });
  mkdirSync(join(자리.집, '.claude'));
  // 자식이 관문(테스트 3회)을 돌리려면 셸이 열려 있어야 한다. 집이 작업마다 새것이라 매번 쓴다
  writeFileSync(join(자리.집, '.claude', 'settings.json'), '{"permissions":{"allow":["Bash(*)"]}}\n');

  const 명령들: 명령[] = 사본준비(자리, 원천, 원격주소, sha);
  for (const c of 명령들) {
    const r = await 돌린다(c.명령, c.인자, { cwd: 자리.뿌리, env: process.env, 제한: 300_000 });
    if (r.코드 !== 0) return { 까닭: `사본을 못 만들었다: ${c.인자.slice(0, 3).join(' ')} — ${첫줄(r)}` };
  }
  chmodSync(자리.git, 0o700);
  writeFileSync(join(자리.git, 'info', 'exclude'), 사본제외);
  symlinkSync(join(원천, 'node_modules'), join(자리.트리, 'node_modules'));

  if (자식 !== null) {
    for (const 폴더 of [자리.트리, 자리.집, 자리.자료, 자리.gh]) {
      const r = 친다('chown', ['-hR', `${자식.uid}:${자식.gid}`, 폴더], 자리.뿌리);
      if (!r.ok) return { 까닭: `사본을 자식에게 못 넘겼다: ${r.까닭}` };
    }
  }
  return { 자리 };
}

/** 자리 uid 의 프로세스를 전부 죽인다. 검사 **전에** — 남겨 두면 검사한 뒤에 파일을 바꿔치기한다 */
export function 자식거두기(자식: 계정 | null): void {
  if (자식 === null) return;
  // 그 uid 로 `kill -1` 을 치면 그 uid 가 신호를 보낼 수 있는 것, 곧 자기 것 전부가 죽는다. 자기도 죽어 종료 코드는 안 본다
  친다('kill', ['-9', '-1'], '/', undefined, 10_000, { uid: 자식.uid, gid: 자식.gid });
}

/** 트리 안 파일의 모양. 읽기 전에 `파일거부사유` 에 넘긴다 */
export function 모양보기(트리: string, 경로: string): 파일모양 {
  const 자리 = join(트리, 경로);
  let 정보;
  try {
    정보 = lstatSync(자리);
  } catch {
    return { 경로, 종류: '없음', 실제: null };
  }
  const 종류 = 정보.isSymbolicLink() ? '링크' : 정보.isFile() ? '파일' : '그밖';
  let 실제: string | null = null;
  try {
    실제 = realpathSync(자리);
  } catch {
    실제 = null;
  }
  return { 경로, 종류, 실제 };
}

function 첫줄(r: 돌린결과): string {
  if (r.시간초과) return '시간 초과';
  return r.오류.trim().split('\n').pop() ?? '';
}

export function 트리실제(자리: 사본): string {
  return realpathSync(자리.트리);
}

export function 사본치우기(자리: 사본): void {
  rmSync(자리.뿌리, { recursive: true, force: true });
}
