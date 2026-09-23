// 작성 에이전트 껍데기들이 같이 쓰는 손 — 서버 부르기 · 보고 · 셸 없이 치기 · 간격 두고 다시 하기
// 한 건 처리(authoring-run)와 머지(authoring-merge)가 둘 다 쓴다. 판단은 여기 없다.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { 거절인가, 기다렸다다시인가, 보고간격 } from './authoring-agent.js';
import { 한줄 } from './authoring-chain.js';

/** 서버에 거는 한 번. 거절이면 그 자리에서 던져 루프를 끊는다 */
export async function 부른다(
  주소: string,
  쿠키: string,
  길: string,
  옵션: { method?: string; body?: unknown } = {},
): Promise<{ status: number; 몸: unknown }> {
  const 답 = await fetch(`${주소}/api${길}`, {
    method: 옵션.method ?? 'GET',
    headers: {
      cookie: 쿠키,
      ...(옵션.body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(옵션.body === undefined ? {} : { body: JSON.stringify(옵션.body) }),
    // 응답이 끝내 안 오면 영원히 기다린다. 끊긴 연결에 걸려도 여기서 끊고 부르는 쪽이 다시 보낸다
    signal: AbortSignal.timeout(30_000),
  });

  if (거절인가(답.status)) {
    throw new Error(
      `서버가 거절했다 (${답.status}). 세션이 끊겼거나 등급이 모자란다 — 다시 물어도 같다.\n` +
        '켤 때 쓴 계정이 operator 이고 그 서비스에 배정돼 있는지 확인하고 다시 켜라.',
    );
  }
  const 몸 = 답.status === 204 ? null : await 답.json().catch(() => null);
  return { status: 답.status, 몸 };
}

/** 한 건에 대해 서버에 보고하는 손. 머지 처리도 같은 손을 쓴다 */
export type 보고손 = { 단계(글: string): Promise<unknown>; 끝내기(몸: Record<string, unknown>): Promise<unknown> };

export const 쉬기 = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function 보고손만들기(주소기지: string, 쿠키: string, 서비스: string, id: number): 보고손 {
  const 뒤 = `?service=${encodeURIComponent(서비스)}`;
  return {
    단계: (글) =>
      부른다(주소기지, 쿠키, `/authoring/requests/${id}/stage${뒤}`, { method: 'PATCH', body: { stage: 글 } }),
    // 보고 한 번을 잃으면 요청이 영원히 RUNNING 이다. 거절(401·403)만 빼고 몇 번 다시 보낸다
    끝내기: async (몸) => {
      for (let 시도 = 0; ; 시도 += 1) {
        let 실패: unknown;
        try {
          const 답 = await 부른다(주소기지, 쿠키, `/authoring/requests/${id}/finish${뒤}`, { method: 'POST', body: 몸 });
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
  const 까닭 = r.error?.message ?? (r.stderr ?? '').trim().split('\n')[0] ?? '';
  return { ok: r.status === 0 && r.error === undefined, 낸것: r.stdout ?? '', 까닭, 오류: r.stderr ?? '' };
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
    // realpath 가 없으면 /var → /private/var 심링크 때문에 스크립트의 「직접 불렸나」 비교가 어긋나 무엇이든 통과한다
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

/** 보고와 같은 간격으로 다시 해 본다. 끝내 안 되면 마지막 까닭을 낸다 */
export async function 다시하며<T>(설명: string, 한번: () => { 값: T } | { 까닭: string }): Promise<{ 값: T } | { 까닭: string }> {
  for (let 시도 = 0; ; 시도 += 1) {
    const 결과 = 한번();
    if ('값' in 결과) return 결과;
    const 간격 = 보고간격(시도);
    if (간격 === null) return 결과;
    console.error(`[기다림] ${설명}이 실패했다 (${결과.까닭}). ${간격 / 1000}초 뒤 다시 한다.`);
    await 쉬기(간격);
  }
}

/**
 * 한 건을 통째로 감싼다. 예외(`JSON.parse` 포함)가 튀면 실패로 닫는다 — 안 닫으면 그 요청이 영원히 RUNNING 이다.
 * 거절(401·403)은 닫은 뒤에도 다시 던진다 — 줄 돌기가 그걸 보고 멈춘다.
 */
export async function 닫으며(손: 보고손, 일: () => Promise<void>): Promise<void> {
  try {
    await 일();
  } catch (err) {
    try {
      await 손.끝내기({ status: 'FAILED', error: 한줄(err) });
    } catch (닫기실패) {
      console.error(`[남김] 실패 보고도 못 했다: ${한줄(닫기실패)}`);
    }
    if (err instanceof Error && err.message.includes('서버가 거절했다')) throw err;
  }
}
