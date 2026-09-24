// 사본을 만들고 치우고, 자식 claude 를 자리의 uid 로 띄우는 껍데기. 판단은 authoring-copy.ts 의 순수 함수에 있다
// 자리 uid 로 넘기는 일(chown·kill)은 root 일 때만 한다 — 맥에서는 사람 계정 하나로 돈다

import { chmodSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { type 계정, type 사본, type 파일모양, 남은사본, 부품링크, 사본제외, 사본준비, 사본자리 } from './authoring-copy.js';
import { type 돌린결과, 돌린다, 쉬기, 친다 } from './authoring-io.js';

/** 자리 uid 로 띄우는 것의 환경. 토큰을 하나도 안 싣는다 — 같은 uid 의 남은 것이 /proc 로 읽는다 */
const 빈환경 = { PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' };

/** 켤 때 바탕에 남은 사본을 지운다. 꺼지며 끊긴 건은 `멈춘것닫기` 가 실패로 닫았다 */
export function 남은사본치우기(바탕: string): void {
  mkdirSync(바탕, { recursive: true, mode: 0o755 });
  for (const 이름 of 남은사본(readdirSync(바탕))) {
    rmSync(join(바탕, 이름), { recursive: true, force: true });
    console.log(`[정리] 남은 사본을 지웠다: ${join(바탕, 이름)}`);
  }
}

/**
 * 사본을 만든다. 실패하면 까닭을 내고 만들던 것을 치운다. 뿌리는 root 0755, git 은 root 0700,
 * 트리·집·자료·gh·임시는 **자리 uid 만** 쓰고 읽는 0700 이다 — 다른 자리 자식이 못 들여다본다
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
  try {
    const 까닭 = await 만들기(자리, 원천, 원격주소, sha, 자식);
    if (까닭 === null) return { 자리 };
    사본치우기(자리);
    return { 까닭 };
  } catch (err) {
    사본치우기(자리);
    throw err;
  }
}

async function 만들기(자리: 사본, 원천: string, 원격주소: string, sha: string, 자식: 계정 | null): Promise<string | null> {
  rmSync(자리.뿌리, { recursive: true, force: true });
  mkdirSync(자리.뿌리, { recursive: true, mode: 0o755 });
  for (const 폴더 of [자리.트리, 자리.집, 자리.자료, 자리.gh, 자리.임시]) mkdirSync(폴더, { mode: 0o700 });
  mkdirSync(join(자리.집, '.claude'));
  // 자식이 관문(테스트 3회)을 돌리려면 셸이 열려 있어야 한다. 집이 작업마다 새것이라 매번 쓴다
  writeFileSync(join(자리.집, '.claude', 'settings.json'), '{"permissions":{"allow":["Bash(*)"]}}\n');

  for (const c of 사본준비(자리, 원천, 원격주소, sha)) {
    const r = await 돌린다(c.명령, c.인자, { cwd: 자리.뿌리, env: process.env, 제한: 300_000 });
    if (r.코드 !== 0) return `사본을 못 만들었다: ${c.인자.slice(0, 3).join(' ')} — ${첫줄(r)}`;
  }
  chmodSync(자리.git, 0o700);
  writeFileSync(join(자리.git, 'info', 'exclude'), 사본제외);
  const 원천부품 = join(원천, 'node_modules');
  mkdirSync(join(자리.트리, 'node_modules', '@platform'), { recursive: true });
  for (const [대상, 링크] of 부품링크(readdirSync(원천부품), 원천부품, 자리.트리)) symlinkSync(대상, 링크);

  if (자식 !== null) {
    for (const 폴더 of [자리.트리, 자리.집, 자리.자료, 자리.gh, 자리.임시]) {
      // -h 는 링크 자체만, -R 의 기본(-P)은 링크를 따라 들어가지 않는다
      const r = 친다('chown', ['-hR', `${자식.uid}:${자식.gid}`, 폴더], 자리.뿌리);
      if (!r.ok) return `사본을 자식에게 못 넘겼다: ${r.까닭}`;
    }
  }
  return null;
}

/**
 * 자리 uid 의 프로세스를 전부 죽이고 **다 죽었는지 본다.** 검사 전에 — 살아 있으면 검사한 뒤에 파일을 바꿔치기하고,
 * 같은 자리를 받은 다음 건의 environ(피그마 토큰)을 읽는다. 공용 임시 자리에 남긴 그 uid 의 파일도 지운다.
 * 못 거뒀으면 false — 부르는 쪽이 그 건을 실패로 닫고 사본을 남긴다
 */
export async function 자식거두기(자식: 계정 | null): Promise<boolean> {
  if (자식 === null) return true;
  const 그uid로 = { uid: 자식.uid, gid: 자식.gid, env: 빈환경 };
  for (let 시도 = 0; 시도 < 10; 시도 += 1) {
    // 그 uid 로 `kill -1` 을 치면 자기를 뺀 그 uid 의 것 전부에 간다(리눅스).
    // 남았는지는 `pgrep` 으로 본다 — `kill -0 -1` 은 권한 없는 남의 프로세스가 하나라도 있으면 성공이라 못 쓴다 (2026-09-24 실측)
    친다('kill', ['-9', '-1'], '/', undefined, 10_000, 그uid로);
    if (!친다('pgrep', ['-u', String(자식.uid)], '/', undefined, 10_000).ok) {
      친다('find', ['/tmp', '/var/tmp', '/dev/shm', '-xdev', '-user', String(자식.uid), '-delete'], '/', undefined, 60_000);
      return true;
    }
    await 쉬기(200);
  }
  console.error(`[남김] 자리 uid ${자식.uid} 의 프로세스를 못 거뒀다 — 그 건을 실패로 닫고 사본을 남긴다`);
  return false;
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

/** 자식 uid 로 띄울 때의 환경 — 준 것만 넘긴다 */
export function 자식빈환경(더할것: Record<string, string>): Record<string, string> {
  return { ...빈환경, ...더할것 };
}
