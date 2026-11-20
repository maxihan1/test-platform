// 앱 작성 AI 가 상한 없는 crawl 을 명령 한 번 한도(10분)에 안 끊기게 부르는 명령 — 뒤에 띄우고 7분 30초씩 기다린다 (도메인/작성 §3.6 「★ 앱 탐색」 · APP-F4-06)
// 쓰는 법: npx tsx scripts/authoring-app-crawl.ts <자료 폴더> [--login <로그인 스크립트>] — 0 끝남 · 1 실패(다시 부르면 처음부터) · 2 부를 수 없음 · 3 아직 돈다(같은 명령을 다시)
// crawl 은 끝날 때 한 번에 결과를 써서 명령 한도에 끊기면 본 것이 안 남는다. 폰 돌려 보기(authoring-run3)와 같은 「3 이면 다시」 꼴이다
import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** 띄운 crawl 의 자리 — 결과 폴더(crawl/)는 crawl 이 시작할 때 지난 결과를 지우므로 따로 둔다 */
export const 크롤자리 = (자료: string) => {
  const 폴더 = join(자료, 'crawl-run');
  // 다시 띄움 표시는 폴더 밖이다 — 꺼져서 폴더를 지운 뒤에도 남아야 한 번만 저절로 다시 띄운다
  return { 폴더, pid: join(폴더, 'pid'), 끝: join(폴더, 'exit'), 로그: join(폴더, 'log'), 다시띄움: join(자료, 'crawl-run.restarted') };
};

/** crawl 인자 — 상한 없음(결정 7). 저장본은 에이전트가 받아 두었을 때만 — 없으면 전부 새 화면이다 */
export function 크롤인자(자료: string, 로그인?: string): string[] {
  const 저장본 = join(자료, 'kept', 'index.json');
  return [
    '-s=probe', 'crawl', '--max', '0', '--minutes', '0', '--out', join(자료, 'crawl'),
    ...(existsSync(저장본) ? ['--keep', 저장본] : []),
    ...(로그인 === undefined ? [] : ['--login', 로그인]),
  ];
}

// crawl 은 이 명령과 같은 uid 로 뜬다 — EPERM(남의 uid)은 그 번호를 다른 프로세스가 물려받은 것이라 꺼진 것으로 본다
const 살았나 = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const 끝줄 = (로그: string, n: number) => (existsSync(로그) ? readFileSync(로그, 'utf8').trimEnd().split('\n').slice(-n).join('\n') : '(로그 없음)');

export interface 돌기판 {
  /** 뒤에 띄울 명령 — 테스트가 바꾼다 */
  명령: string[];
  기다림_ms: number;
  쉬기: (ms: number) => Promise<void>;
}

const 기본판: 돌기판 = { 명령: ['npx', 'appium-cli'], 기다림_ms: 7.5 * 60_000, 쉬기: (ms) => new Promise((r) => setTimeout(r, ms)) };

/**
 * 한 번 부를 때 — 끝났으면 결과, 안 띄웠으면 띄우고, 돌면 기다린다. 끝난 crawl 은 그대로 둔다(다시 불러도 다시 안 돈다 — 이어하기도 같은 폴더를 넘겨받는다).
 * 실패하거나 도중에 꺼졌으면 자리를 지워 다음 부름이 처음부터 돈다
 */
export async function 돌기(자료: string, 로그인: string | undefined, 판: 돌기판 = 기본판): Promise<number> {
  const 자리 = 크롤자리(자료);
  const 끝봄 = (): number | null => {
    if (!existsSync(자리.끝)) return null;
    const 코드 = Number(readFileSync(자리.끝, 'utf8').trim());
    if (코드 === 0) {
      console.log(`[앱 crawl] 끝났다 — ${join(자료, 'crawl', 'list.json')} 을 읽는다\n${끝줄(자리.로그, 3)}`);
      return 0;
    }
    console.log(`[앱 crawl] 실패했다(종료 ${String(코드)}) — 다시 부르면 처음부터 돈다\n${끝줄(자리.로그, 20)}`);
    rmSync(자리.폴더, { recursive: true, force: true });
    return 1;
  };
  const 이미 = 끝봄();
  if (이미 !== null) return 이미;
  const 띄우기 = (): boolean => {
    mkdirSync(자리.폴더, { recursive: true });
    const 로그 = openSync(자리.로그, 'w');
    // sh 가 끝 코드를 파일로 남긴다 — 다음 부름은 이 명령의 자식이 아니라 코드를 못 받는다. setsid 로 띄워 이 명령이 끝나도 산다
    const 몸 = spawn('sh', ['-c', '"$@"; echo $? > "$0.tmp" && mv "$0.tmp" "$0"', 자리.끝, ...판.명령, ...크롤인자(자료, 로그인)], {
      detached: true, stdio: ['ignore', 로그, 로그],
    });
    closeSync(로그);
    if (몸.pid === undefined) {
      rmSync(자리.폴더, { recursive: true, force: true });
      console.log('[앱 crawl] crawl 을 못 띄웠다');
      return false;
    }
    몸.unref();
    writeFileSync(자리.pid, String(몸.pid));
    console.log(`[앱 crawl] 상한 없이 띄웠다 — 끝날 때까지 폰 · probe 세션을 건드리지 않는다`);
    return true;
  };
  if (!existsSync(자리.pid) && !띄우기()) return 1;
  let pid = Number(readFileSync(자리.pid, 'utf8').trim());
  const 시작 = Date.now();
  while (Date.now() - 시작 < 판.기다림_ms) {
    const 끝 = 끝봄();
    if (끝 !== null) return 끝;
    if (!살았나(pid)) {
      // 끝 파일을 쓰기 직전에 꺼졌을 수도 있다 — 한 번 더 본다
      const 다시 = 끝봄();
      if (다시 !== null) return 다시;
      rmSync(자리.폴더, { recursive: true, force: true });
      // 크레딧 → 구독으로 세션을 바꿀 때 에이전트가 자식 프로세스를 다 끈다 — 그때 꺼진 crawl 은 실패로 세지 않고 한 번만 저절로 다시 띄운다
      if (!existsSync(자리.다시띄움)) {
        writeFileSync(자리.다시띄움, '');
        console.log('[앱 crawl] crawl 이 도중에 꺼져 처음부터 다시 띄운다(한 번만)');
        if (!띄우기()) return 1;
        pid = Number(readFileSync(자리.pid, 'utf8').trim());
        continue;
      }
      console.log(`[앱 crawl] crawl 이 도중에 꺼졌다 — 다시 부르면 처음부터 돈다\n${끝줄(자리.로그, 20)}`);
      return 1;
    }
    await 판.쉬기(2_000);
  }
  console.log(`[앱 crawl] 아직 돈다 — 같은 명령을 다시 부른다. 그동안 폰 · probe 세션을 건드리지 않는다. 마지막 줄: ${끝줄(자리.로그, 1)}`);
  return 3;
}

/**
 * 에이전트가 작성 끝에 부른다 — 자식 uid 를 따로 두지 않은 맥(자식거두기가 아무것도 안 끈다)에서 뒤에 띄운 crawl 이 폰을 놓은 뒤에도 누르지 않게.
 * 서버(자식 uid)에서는 부르지 않는다 — 자식이 쓴 pid 파일로 root 가 남의 프로세스를 끌 수 있다
 */
export function 크롤끄기(자료: string): void {
  const pid = Number((existsSync(크롤자리(자료).pid) ? readFileSync(크롤자리(자료).pid, 'utf8') : '').trim());
  if (!Number.isInteger(pid) || pid <= 1) return;
  try {
    // setsid 로 띄워 pid 가 묶음 번호다 — 묶음째 끈다(sh 와 그 아래 appium-cli)
    process.kill(-pid, 'SIGKILL');
  } catch {
    // 이미 꺼졌다
  }
}

export async function 실행(인자: string[]): Promise<number> {
  const [자료, ...나머지] = 인자;
  const 앞 = 나머지.indexOf('--login');
  const 로그인 = 앞 < 0 ? undefined : 나머지[앞 + 1];
  if (자료 === undefined || !existsSync(자료) || 나머지.length !== (앞 < 0 ? 0 : 2) || 로그인 === '') {
    console.error('쓰는 법: npx tsx scripts/authoring-app-crawl.ts <자료 폴더> [--login <로그인 스크립트>]');
    return 2;
  }
  return 돌기(자료, 로그인);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await 실행(process.argv.slice(2));
}
