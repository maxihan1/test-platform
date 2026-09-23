// 작성 에이전트 껍데기들이 같이 쓰는 손 — 서버 부르기 · 보고 · 셸 없이 치기 · 간격 두고 다시 하기
// 한 건 처리(authoring-run)와 머지(authoring-merge)가 둘 다 쓴다. 판단은 여기 없다.

import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { 거절인가, 기다렸다다시인가, 보고간격 } from './authoring-rules.js';
import { 진짜main인자, 진짜main풀기, 한줄 } from './authoring-chain.js';

/**
 * 응답을 하나도 못 받은 연결 오류면 한 번 더 부른다. 서버에 거는 fetch 는 전부 이것을 지난다.
 * #3336 은 단계 보고 하나가 이것으로 서버에 못 닿아 다 만든 케이스를 버렸다
 */
export async function 한번더건다(한번: () => Promise<Response>): Promise<Response> {
  try {
    return await 한번();
  } catch (err) {
    // undici 는 연결 오류를 이 문구의 TypeError 로 던진다. 같은 TypeError 라도 잘못된 주소·헤더는
    // 다시 걸어도 같으므로 가른다. 시간 초과(TimeoutError)는 서버가 멈춘 것이라 다시 걸어도 시간만 더 쓴다
    if (!(err instanceof TypeError && err.message === 'fetch failed')) throw err;
    // ponytail: 나간 뒤 답만 끊긴 것과 구분이 안 된다 — 집기면 두 건을 집을 수 있다.
    // 첫 건은 다음 켤 때 멈춘 RUNNING 정리가 닫는다. 잦아지면 집기에 요청 키를 싣는다
    return await 한번();
  }
}

/** 서버에 내미는 열쇠. 맥은 비밀번호 로그인을 안 하고 에이전트 토큰만 든다 (SPEC 도메인/인증 §7) */
export function 인증헤더(토큰: string): { authorization: string } {
  return { authorization: `Bearer ${토큰}` };
}

/** 거절(401·403) 글. 토큰이 취소됐거나 계정이 바뀐 것이라 기다려도 안 풀린다 */
export const 거절글 =
  '서버가 거절했다. 에이전트 토큰이 취소·재발급됐거나, 계정이 비활성·등급 부족·서비스 미배정이다 — 다시 물어도 같다.\n' +
  '설정 > 계정에서 확인하고, 토큰을 다시 발급했으면 ~/.test-platform/agent-token 을 지운 뒤 다시 켜라.';

/** 서버에 거는 한 번. 거절이면 그 자리에서 던져 루프를 끊는다 */
export async function 부른다(
  주소: string,
  토큰: string,
  길: string,
  옵션: { method?: string; body?: unknown } = {},
): Promise<{ status: number; 몸: unknown }> {
  const 한번 = () =>
    fetch(`${주소}/api${길}`, {
      method: 옵션.method ?? 'GET',
      headers: {
        ...인증헤더(토큰),
        ...(옵션.body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(옵션.body === undefined ? {} : { body: JSON.stringify(옵션.body) }),
      // 응답이 끝내 안 오면 영원히 기다린다. 시도마다 새로 건다 — 나눠 쓰면 두 번째가 남은 시간만 받는다
      signal: AbortSignal.timeout(30_000),
    });

  const 답 = await 한번더건다(한번);

  if (거절인가(답.status)) throw new Error(`(${답.status}) ${거절글}`);
  const 몸 = 답.status === 204 ? null : await 답.json().catch(() => null);
  return { status: 답.status, 몸 };
}

/** 한 건에 대해 서버에 보고하는 손. 머지 처리도 같은 손을 쓴다 */
export type 보고손 = { 단계(글: string): Promise<unknown>; 끝내기(몸: Record<string, unknown>): Promise<unknown> };

export const 쉬기 = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function 보고손만들기(주소기지: string, 토큰: string, 서비스: string, id: number): 보고손 {
  const 뒤 = `?service=${encodeURIComponent(서비스)}`;
  return {
    단계: (글) =>
      부른다(주소기지, 토큰, `/authoring/requests/${id}/stage${뒤}`, { method: 'PATCH', body: { stage: 글 } }),
    // 보고 한 번을 잃으면 요청이 영원히 RUNNING 이다. 거절(401·403)만 빼고 몇 번 다시 보낸다.
    // `부른다` 가 끊긴 연결에 한 번씩 더 걸므로 최악이면 fetch 12번·약 8분이다 — 그동안 다음 건을 못 집는다
    끝내기: async (몸) => {
      for (let 시도 = 0; ; 시도 += 1) {
        let 실패: unknown;
        try {
          const 답 = await 부른다(주소기지, 토큰, `/authoring/requests/${id}/finish${뒤}`, { method: 'POST', body: 몸 });
          if (!기다렸다다시인가(답.status)) return 답;
          실패 = new Error(`끝났다는 보고에 서버가 ${답.status} 를 냈다`);
        } catch (err) {
          if (err instanceof Error && err.message.includes('서버가 거절했다')) throw err;
          실패 = err;
        }
        const 간격 = 보고간격(시도);
        if (간격 === null) throw 실패;
        console.error(`[기다림] ${id}번 보고가 실패했다. ${간격 / 1000}초 뒤 다시 보낸다.`);
        await 쉬기(간격);
      }
    },
  };
}

export interface 칠때 {
  /** 부모 환경 위에 얹는다 (`친다`) · 통째로 준다 (`돌린다`) */
  env?: Record<string, string | undefined>;
  uid?: number;
  gid?: number;
}

/**
 * 셸 없이 한 번 친다. 멈춘 git·gh 가 줄 전체를 붙잡지 않게 시간 제한을 건다.
 * **동기라 도는 동안 다른 서비스 루프도 선다** — 몇 초짜리만 여기로, 긴 것(clone·push·claude)은 `돌린다`
 */
export function 친다(명령: string, 인자: string[], cwd: string, input?: string, 제한 = 120_000, 선택: 칠때 = {}) {
  const env = 선택.env === undefined ? undefined : { ...process.env, ...선택.env };
  const r = spawnSync(명령, 인자, { cwd, input, encoding: 'utf8', timeout: 제한, env, uid: 선택.uid, gid: 선택.gid });
  // 시간 초과는 오류 글이 `spawnSync git ETIMEDOUT` 뿐이라 사람이 못 알아본다
  const 시간초과 = (r.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT';
  const 까닭 = 시간초과
    ? `시간 초과 — ${명령} 이 ${제한 / 1000}초 안에 안 끝났다`
    : (r.error?.message ?? (r.stderr ?? '').trim().split('\n')[0] ?? '');
  return { ok: r.status === 0 && r.error === undefined, 낸것: r.stdout ?? '', 까닭, 오류: r.stderr ?? '', 시간초과 };
}

/** 지금 도는 자식들. 거절로 에이전트가 나갈 때 남기지 않는다 — 남으면 구독 한도를 계속 쓴다 */
export const 도는자식 = new Set<ChildProcess>();

export interface 돌린결과 {
  /** 못 띄웠으면 null */
  코드: number | null;
  낸것: string;
  오류: string;
  시간초과: boolean;
}

/**
 * 비동기로 돌린다. 서비스 루프들이 동시에 돌려면 긴 일이 이벤트 루프를 붙잡으면 안 된다.
 * `env` 는 **통째로** 준다(부모 것을 안 얹는다) — 자식 claude 에 에이전트 토큰이 새지 않게.
 * `흘림` 이면 표준출력·오류를 모으면서 터미널에도 흘린다 — 사람이 도는 것을 봐야 한다
 */
export function 돌린다(
  명령: string,
  인자: string[],
  선택: 칠때 & { cwd: string; input?: string; 제한?: number; 흘림?: boolean },
): Promise<돌린결과> {
  return new Promise((resolve) => {
    let 낸것 = '';
    let 오류 = '';
    let 시간초과 = false;
    const 자식 = spawn(명령, 인자, { cwd: 선택.cwd, env: 선택.env, uid: 선택.uid, gid: 선택.gid });
    도는자식.add(자식);
    const 시계 = setTimeout(() => {
      시간초과 = true;
      자식.kill('SIGKILL');
    }, 선택.제한 ?? 120_000);
    자식.stdout.on('data', (조각: Buffer) => {
      낸것 += 조각.toString('utf8');
      if (선택.흘림) process.stdout.write(조각);
    });
    자식.stderr.on('data', (조각: Buffer) => {
      오류 += 조각.toString('utf8');
      if (선택.흘림) process.stderr.write(조각);
    });
    const 끝 = (코드: number | null) => {
      clearTimeout(시계);
      도는자식.delete(자식);
      resolve({ 코드, 낸것, 오류, 시간초과 });
    };
    자식.on('error', (err) => {
      오류 += err.message;
      끝(null);
    });
    자식.on('close', (코드) => 끝(코드));
    // 입력을 다 읽기 전에 죽는 자식이면 EPIPE 가 난다 — 그 자식의 종료 코드가 이미 말해 준다
    자식.stdin.on('error', () => undefined);
    자식.stdin.end(선택.input ?? '');
  });
}

/** 동시에 도는 작업 자리. 번호(0..상한-1)가 곧 자식 uid 의 자리다 (`authoring-copy` 의 `계정들`) */
export function 자리들(상한: number) {
  const 빈자리 = Array.from({ length: 상한 }, (_, k) => k);
  const 기다리는이: ((k: number) => void)[] = [];
  return {
    잡기(): Promise<number> {
      const k = 빈자리.shift();
      return k !== undefined ? Promise.resolve(k) : new Promise((resolve) => 기다리는이.push(resolve));
    },
    놓기(k: number): void {
      const 다음 = 기다리는이.shift();
      if (다음 !== undefined) 다음(k);
      else 빈자리.push(k);
    },
    도는수: () => 상한 - 빈자리.length,
  };
}

/** GitHub 이 말하는 main SHA 를 묻기만 한다. 서버 저장소에 아무것도 안 쓴다 — 작성은 사본에서 받는다 */
export function 진짜main묻기(cwd: string): { sha: string } | { 까닭: string } {
  const 물음 = 친다('git', 진짜main인자, cwd);
  const sha = 물음.ok ? 진짜main풀기(물음.낸것) : null;
  return sha === null ? { 까닭: `GitHub 의 main 을 못 읽었다: ${물음.까닭 || 물음.낸것.trim()}` } : { sha };
}

/** GitHub 이 말하는 main SHA. 로컬에 없으면 그 SHA 를 받아 둔다 — 판정·커밋수·작업방의 기준이 이것이다 */
export function 진짜main받기(cwd: string, 선택: 칠때 = {}): { sha: string } | { 까닭: string } {
  const 물음 = 진짜main묻기(cwd);
  if ('까닭' in 물음) return 물음;
  const { sha } = 물음;
  if (친다('git', ['cat-file', '-e', `${sha}^{commit}`], cwd).ok) return { sha };
  // 서버 저장소에 쓰므로 호스트 계정으로 받는다 — root 로 받으면 사람이 git pull 을 못 한다
  const 받기 = 친다('git', ['fetch', 'origin', sha], cwd, undefined, 120_000, 선택);
  return 받기.ok ? { sha } : { 까닭: `main(${sha}) 을 못 받았다: ${받기.까닭}` };
}

export type 판정기 = (파일들: string[], 기준: string, cwd: string, env?: Record<string, string>) => boolean;

/**
 * 「테스트만」 판정 스크립트를 **켤 때** 읽어 메모리에 고정한다. 자식은 맥의 파일을 쓸 수 있어서
 * 판정 때마다 파일을 읽으면 자식이 그것을 「늘 통과」로 바꿔 놓을 수 있다.
 * 판정할 때마다 새 임시 폴더에 써서 돌린다 — 고정 자리면 자식이 미리 바꿔 둘 수 있다.
 */
export function 판정기만들기(스크립트자리: string): 판정기 {
  const 내용 = readFileSync(스크립트자리, 'utf8');
  console.log(`[작성] 판정 스크립트를 고정했다: ${스크립트자리} sha256=${createHash('sha256').update(내용).digest('hex')}`);
  // env 는 사본의 GIT_DIR 이다 — 판정 스크립트가 치는 git 이 자식이 트리에 만든 .git 을 보면 안 된다
  return (파일들, 기준, cwd, env) => {
    // 스크립트가 스스로 realpath 로 비교하게 된 뒤로는 없어도 된다 — 해가 없어 둔다 (/var → /private/var)
    const 자리 = realpathSync(mkdtempSync(join(tmpdir(), 'authoring-judge-')));
    try {
      const 파일 = join(자리, 'cases-only.mjs');
      writeFileSync(파일, 내용);
      return 친다('node', [파일, 기준], cwd, `${파일들.join('\n')}\n`, 120_000, { env }).ok;
    } finally {
      rmSync(자리, { recursive: true, force: true });
    }
  };
}

type 실패 = { 까닭: string; 그만?: boolean };

/** 보고와 같은 간격으로 다시 해 본다. 끝내 안 되거나 `그만` 이 붙은 실패면 그 까닭을 낸다 */
export async function 다시하며<T>(설명: string, 한번: () => { 값: T } | 실패): Promise<{ 값: T } | 실패> {
  for (let 시도 = 0; ; 시도 += 1) {
    const 결과 = 한번();
    if ('값' in 결과 || 결과.그만 === true) return 결과;
    const 간격 = 보고간격(시도);
    if (간격 === null) return 결과;
    console.error(`[기다림] ${설명}이 실패했다 (${결과.까닭}). ${간격 / 1000}초 뒤 다시 한다.`);
    await 쉬기(간격);
  }
}

/**
 * 한 건을 통째로 감싼다. 예외(`JSON.parse` 포함)가 튀면 실패로 닫는다 — 안 닫으면 그 요청이 영원히 RUNNING 이다.
 * **이미 끝내기를 보냈으면 덮어쓰지 않는다** — DONE 보고·병합 뒤의 예외로 FAILED 를 보내면 된 일이 실패로 보인다.
 * 거절(401·403)은 닫은 뒤에도 다시 던진다 — 줄 돌기가 그걸 보고 멈춘다.
 */
export async function 닫으며(손: 보고손, 일: (손: 보고손) => Promise<void>): Promise<void> {
  let 끝냄 = false;
  const 감싼손: 보고손 = {
    단계: (글) => 손.단계(글),
    끝내기: (몸) => {
      끝냄 = true;
      return 손.끝내기(몸);
    },
  };
  try {
    await 일(감싼손);
  } catch (err) {
    console.error('[오류] 한 건 처리 중 예외:', err instanceof Error ? err.stack : String(err));
    if (!끝냄) {
      try {
        await 손.끝내기({ status: 'FAILED', error: 한줄(err) });
      } catch (닫기실패) {
        console.error(`[남김] 실패 보고도 못 했다: ${한줄(닫기실패)}`);
      }
    }
    if (err instanceof Error && err.message.includes('서버가 거절했다')) throw err;
  }
}
