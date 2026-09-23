// 작성 에이전트 껍데기들이 같이 쓰는 손 — 서버 부르기 · 보고 · 셸 없이 치기 · 간격 두고 다시 하기
// 한 건 처리(authoring-run)와 머지(authoring-merge)가 둘 다 쓴다. 판단은 여기 없다.

import { spawnSync } from 'node:child_process';
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

/** 셸 없이 한 번 친다. 멈춘 git·gh 가 줄 전체를 붙잡지 않게 시간 제한을 건다 */
export function 친다(명령: string, 인자: string[], cwd: string, input?: string, 제한 = 120_000) {
  const r = spawnSync(명령, 인자, { cwd, input, encoding: 'utf8', timeout: 제한 });
  // 시간 초과는 오류 글이 `spawnSync git ETIMEDOUT` 뿐이라 사람이 못 알아본다
  const 시간초과 = (r.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT';
  const 까닭 = 시간초과
    ? `시간 초과 — ${명령} 이 ${제한 / 1000}초 안에 안 끝났다`
    : (r.error?.message ?? (r.stderr ?? '').trim().split('\n')[0] ?? '');
  return { ok: r.status === 0 && r.error === undefined, 낸것: r.stdout ?? '', 까닭, 오류: r.stderr ?? '', 시간초과 };
}

/** GitHub 이 말하는 main SHA. 로컬에 없으면 그 SHA 를 받아 둔다 — 판정·커밋수·작업방의 기준이 이것이다 */
export function 진짜main받기(cwd: string): { sha: string } | { 까닭: string } {
  const 물음 = 친다('git', 진짜main인자, cwd);
  const sha = 물음.ok ? 진짜main풀기(물음.낸것) : null;
  if (sha === null) return { 까닭: `GitHub 의 main 을 못 읽었다: ${물음.까닭 || 물음.낸것.trim()}` };
  if (친다('git', ['cat-file', '-e', `${sha}^{commit}`], cwd).ok) return { sha };
  const 받기 = 친다('git', ['fetch', 'origin', sha], cwd);
  return 받기.ok ? { sha } : { 까닭: `main(${sha}) 을 못 받았다: ${받기.까닭}` };
}

export type 판정기 = (파일들: string[], 기준: string, cwd: string) => boolean;

/**
 * 「테스트만」 판정 스크립트를 **켤 때** 읽어 메모리에 고정한다. 자식은 맥의 파일을 쓸 수 있어서
 * 판정 때마다 파일을 읽으면 자식이 그것을 「늘 통과」로 바꿔 놓을 수 있다.
 * 판정할 때마다 새 임시 폴더에 써서 돌린다 — 고정 자리면 자식이 미리 바꿔 둘 수 있다.
 */
export function 판정기만들기(스크립트자리: string): 판정기 {
  const 내용 = readFileSync(스크립트자리, 'utf8');
  console.log(`[작성] 판정 스크립트를 고정했다: ${스크립트자리} sha256=${createHash('sha256').update(내용).digest('hex')}`);
  return (파일들, 기준, cwd) => {
    // 스크립트가 스스로 realpath 로 비교하게 된 뒤로는 없어도 된다 — 해가 없어 둔다 (/var → /private/var)
    const 자리 = realpathSync(mkdtempSync(join(tmpdir(), 'authoring-judge-')));
    try {
      const 파일 = join(자리, 'cases-only.mjs');
      writeFileSync(파일, 내용);
      return 친다('node', [파일, 기준], cwd, `${파일들.join('\n')}\n`).ok;
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
