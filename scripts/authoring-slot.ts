// 돌려 보기 브라우저 번호표 — 같은 컨테이너의 자식 · 보조가 다 같이 세는 자리를 받아야 Playwright 를 띄운다 (SPEC 도메인/작성 §3.6 「돌려 보기 명령」)
// 14644 는 보조 넷이 PC · 휴대폰 브라우저를 나란히 띄워 CPU 615% — 통과할 케이스도 30초 한도에 걸려 시간 초과가 브라우저 시간의 56%였다(PRD-F14-02)

import { chmodSync, closeSync, fchmodSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { setTimeout as 쉬기 } from 'node:timers/promises';

/**
 * 자식마다 TMPDIR 이 따로라 고정 경로에 둔다. 컨테이너에서는 에이전트가 root 로 미리 연다(자리폴더열기) —
 * 자식 uid 가 만들면 그 자식을 거둘 때 `find /tmp -user <uid> -delete` 가 남의 자리가 든 폴더를 지우려다 실패해 에이전트가 멈춘다
 */
export const 자리폴더 = '/tmp/authoring-browser-slots';
/** CPU 3개마다 1개 (2026-10-22 사용자) — 도커 CPU 8개 · 이 맥 8코어 모두 2개 */
export const 자리수 = (cpu = availableParallelism()): number => Math.max(1, Math.floor(cpu / 3));
/** 한 번 잡으면 Playwright 한 번(최대 7분 30초)만 쥔다. 이보다 오래된 자리는 주인 번호가 다른 프로세스에 재사용됐어도 치운다 */
const 낡음 = 15 * 60_000;

/**
 * 자식 uid 가 서로 다르다 — 남의 자리 파일도 치울 수 있게 아무나 쓰는 폴더로 연다(자식 umask 077 을 넘긴다).
 * root 는 자식이 먼저 심어 둔 것(링크 · 남의 폴더)을 지우고 새로 만든다 — 링크를 따라가 엉뚱한 폴더를 0777 로 열지 않게.
 * /tmp 는 sticky 라 root 가 만든 폴더를 자식이 바꿔치기하지 못한다
 */
export function 자리폴더열기(폴더 = 자리폴더, root = false): void {
  if (root) {
    const root폴더 = () => {
      const 정보 = lstatSync(폴더, { throwIfNoEntry: false });
      return 정보?.isDirectory() === true && 정보.uid === 0;
    };
    if (!root폴더()) {
      rmSync(폴더, { recursive: true, force: true });
      mkdirSync(폴더, { recursive: true }); // 다른 건이 막 만들었어도 된다
      if (!root폴더()) throw new Error(`${폴더} 를 지운 사이에 누가 다른 것을 심었다`);
    }
  } else mkdirSync(폴더, { recursive: true });
  try {
    chmodSync(폴더, 0o777);
  } catch {
    // 남이 연 폴더다 — 연 쪽이 이미 0777 로 열었다
  }
}

function 살았나(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM'; // 다른 uid 의 살아 있는 프로세스
  }
}

/** 주인이 죽었거나 낡은 자리 — 못 읽으면(막 지워졌다) 비었다고 보고 다시 잡아 본다 */
function 버려졌나(파일: string, 지금: number): boolean {
  try {
    const pid = Number(readFileSync(파일, 'utf8'));
    return !Number.isInteger(pid) || pid <= 0 || !살았나(pid) || 지금 - statSync(파일).mtimeMs > 낡음;
  } catch {
    return true;
  }
}

/**
 * 빈 자리 하나를 잡아 그 파일을, 다 찼으면 null. 번호를 다 쓴 임시 파일을 하드링크로 거는 것이라 잡기는 원자적이고 남이 반쯤 쓴 번호를 읽지 않는다.
 * ponytail: 버려진 자리를 둘이 동시에 치우면 둘 다 잡을 수 있다 — 진 쪽이 끝날 때까지 브라우저가 하나 더 뜬다(놓을 때 주인 번호를 봐 남의 자리는 안 지운다). 잦으면 flock 으로
 */
export function 자리잡기(폴더 = 자리폴더, 수 = 자리수(), pid = process.pid): string | null {
  자리폴더열기(폴더);
  const 임시 = join(폴더, `.잡는중-${pid}`);
  rmSync(임시, { force: true });
  const fd = openSync(임시, 'wx'); // 남이 심은 링크를 따라 쓰지 않는다
  try {
    fchmodSync(fd, 0o644); // 다른 uid 의 자식이 주인 번호를 읽어야 버려진 자리를 안다
    writeSync(fd, String(pid));
  } finally {
    closeSync(fd);
  }
  try {
    for (let i = 1; i <= 수; i++) {
      const 파일 = join(폴더, String(i));
      for (let 시도 = 0; 시도 < 2; 시도++) {
        try {
          linkSync(임시, 파일);
          return 파일;
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
        }
        if (!버려졌나(파일, Date.now())) break;
        rmSync(파일, { force: true });
      }
    }
    return null;
  } finally {
    rmSync(임시, { force: true });
  }
}

/** `마감` 까지 1초마다 다시 잡아 본다. 기다린 시간은 부르는 쪽 예산에서 빠진다 */
export async function 자리기다리기(마감: number, 폴더 = 자리폴더, 수 = 자리수(), 쉼 = 1_000): Promise<string | null> {
  for (;;) {
    const 잡은 = 자리잡기(폴더, 수);
    if (잡은 !== null || Date.now() + 쉼 > 마감) return 잡은;
    await 쉬기(쉼);
  }
}

/** 내 번호가 적힌 자리만 지운다 — 버려진 줄 알고 남이 치우고 다시 잡은 자리를 지우면 자리 수를 넘겨 띄운다 */
export function 자리놓기(파일: string, pid = process.pid): void {
  try {
    if (readFileSync(파일, 'utf8') === String(pid)) rmSync(파일, { force: true });
  } catch {
    // 이미 없다
  }
}
