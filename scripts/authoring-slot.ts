// 돌려 보기 브라우저 번호표 — 같은 컨테이너의 자식 · 보조가 다 같이 세는 자리를 받아야 Playwright 를 띄운다 (SPEC 도메인/작성 §3.6 「돌려 보기 명령」)
// 14644 는 보조 넷이 PC · 휴대폰 브라우저를 나란히 띄워 CPU 615% — 통과할 케이스도 30초 한도에 걸려 시간 초과가 브라우저 시간의 56%였다(PRD-F14-02)

import { chmodSync, closeSync, constants, existsSync, fchmodSync, ftruncateSync, linkSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeSync } from 'node:fs';
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

/**
 * 줄 표 — 기다리는 쪽마다 `.줄-<처음 선 시각>-<열쇠>` 하나, 안에는 주인 번호. 이름의 시각이 차례다.
 * 14670 은 1초마다 먼저 잡는 쪽이 가져가 주문 묶음이 30분 동안 한 건도 못 돌았다(PRD-F14-08)
 */
const 줄머리 = '.줄-';
/** 「남은 것」으로 돌아와 다시 부르기까지 — 이 안에 같은 열쇠로 다시 서면 앞 차례를 잇는다. 넘은 빈 표는 치운다 */
const 이을틈 = 3 * 60_000;

/** 시각은 15자리로 채워 이름순이 곧 차례다 */
const 표이름 = (시각: number, 열쇠: string) => `${줄머리}${String(시각).padStart(15, '0')}-${열쇠}`;

function 줄표들(폴더: string): { 열쇠: string; 경로: string }[] {
  return readdirSync(폴더)
    .filter((f) => f.startsWith(줄머리))
    .sort()
    .map((이름) => ({ 열쇠: 이름.slice(줄머리.length + 16), 경로: join(폴더, 이름) }));
}

/** 마지막으로 쓴 뒤 지난 시간 — 남이 막 치웠으면 아주 오래된 것으로 본다 */
function 나이(경로: string, 지금: number): number {
  try {
    return 지금 - statSync(경로).mtimeMs;
  } catch {
    return Infinity;
  }
}

/**
 * 표 주인 — 다시 부르기 전 빈 표(0) · 죽은 주인 · `낡음` 넘게 안 고친 표는 null.
 * 한 번 부를 때 기다림은 7분 30초 안이라, 그보다 훨씬 오래된 표의 「산 주인」은 같은 번호를 물려받은 다른 프로세스다(자리 파일과 같은 까닭)
 */
function 표주인(경로: string, 지금: number): number | null {
  try {
    const pid = Number(readFileSync(경로, 'utf8'));
    return Number.isInteger(pid) && pid > 0 && 살았나(pid) && 나이(경로, 지금) <= 낡음 ? pid : null;
  } catch {
    return null;
  }
}

/** 새 표 — 없어야 만든다(남이 심은 링크를 따라 쓰지 않는다). 있으면 EEXIST 를 그대로 던진다 */
function 새표쓰기(경로: string, pid: number): void {
  const fd = openSync(경로, 'wx');
  try {
    fchmodSync(fd, 0o644); // 다른 uid 가 주인 번호를 읽어 차례를 센다
    writeSync(fd, String(pid));
  } finally {
    closeSync(fd);
  }
}

/** 있는 표의 주인을 고쳐 쓴다 — 링크면 못 연다. 못 쓰면 false(그때는 새 표를 낸다) */
function 표고쳐쓰기(경로: string, pid: number): boolean {
  try {
    const fd = openSync(경로, constants.O_RDWR | constants.O_NOFOLLOW);
    try {
      ftruncateSync(fd, 0);
      writeSync(fd, String(pid), 0);
    } finally {
      closeSync(fd);
    }
    return true;
  } catch {
    return false;
  }
}

/** 줄에 선다 — 같은 열쇠의 빈 표가 `이을틈` 안이면 그 차례를 잇고, 아니면 맨 뒤에 새 표를 낸다 */
export function 줄서기(폴더: string, 열쇠: string, pid = process.pid, 지금 = Date.now()): string {
  자리폴더열기(폴더);
  const 옛 = 줄표들(폴더).find((t) => t.열쇠 === 열쇠 && 표주인(t.경로, 지금) === null);
  if (옛 !== undefined && 나이(옛.경로, 지금) <= 이을틈 && 표고쳐쓰기(옛.경로, pid)) return 옛.경로;
  // 같은 시각 · 열쇠가 이미 있을 때만 1ms 뒤로 민다. 권한 · 디스크 오류는 그대로 던진다 — 끝없이 돌면 마감도 못 지킨다(code-review)
  for (let 시각 = 지금; ; 시각++) {
    const 경로 = join(폴더, 표이름(시각, 열쇠));
    try {
      새표쓰기(경로, pid);
      return 경로;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw new Error(`브라우저 자리 줄 표를 못 만들었다 — ${경로}: ${String(e)}`);
    }
  }
}

/** 내 표 앞에 살아 있는 표가 몇인가 — 비운 표(다시 부르기 전)는 차례만 쥐고 남을 막지 않는다. 오래 빈 표는 여기서 치운다 */
function 앞사람수(폴더: string, 내표: string, 지금: number): number {
  let 수 = 0;
  for (const t of 줄표들(폴더)) {
    if (t.경로 === 내표) return 수;
    if (표주인(t.경로, 지금) !== null) 수++;
    else if (나이(t.경로, 지금) > 이을틈) rmSync(t.경로, { force: true });
  }
  return 수;
}

function 빈자리수(폴더: string, 수: number, 지금: number): number {
  let 빈 = 0;
  for (let i = 1; i <= 수; i++) {
    const 파일 = join(폴더, String(i));
    if (!existsSync(파일) || 버려졌나(파일, 지금)) 빈++;
  }
  return 빈;
}

/**
 * 줄 선 차례대로 `마감` 까지 1초마다 다시 잡아 본다. 기다린 시간은 부르는 쪽 예산에서 빠진다.
 * 앞에 살아 있는 표가 빈 자리보다 적을 때만 잡는다. 못 받고 마감이 되면 표를 비워 두어 — 곧 같은 `열쇠` 로 다시 부르면 앞 차례를 잇는다
 */
export async function 자리기다리기(마감: number, 폴더 = 자리폴더, 수 = 자리수(), 쉼 = 1_000, 열쇠 = `${String(process.pid)}-${String(Math.random()).slice(2, 10)}`): Promise<string | null> {
  const 내표 = 줄서기(폴더, 열쇠);
  for (;;) {
    const 지금 = Date.now();
    // 같은 열쇠로 겹쳐 부른 쪽이 먼저 받아 표를 지웠다 — 같은 이름으로 다시 세워 차례를 지킨다(없으면 모든 표 뒤로 밀린다)
    if (!existsSync(내표)) {
      try {
        새표쓰기(내표, process.pid);
      } catch {
        // 그사이 다시 생겼다
      }
    }
    if (앞사람수(폴더, 내표, 지금) < 빈자리수(폴더, 수, 지금)) {
      const 잡은 = 자리잡기(폴더, 수);
      if (잡은 !== null) {
        rmSync(내표, { force: true });
        return 잡은;
      }
    }
    if (Date.now() + 쉼 > 마감) {
      표고쳐쓰기(내표, 0);
      return null;
    }
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
