// 긴 자식(clone·push·claude)을 비동기로 띄우는 손 — 시간 제한과 사람이 누른 멈춤 신호로 죽일 수 있다
// authoring-io 가 300줄을 넘어 떼어 냈다. 부르는 쪽은 authoring-io 에서 그대로 받는다

import { type ChildProcess, spawn } from 'node:child_process';

import type { 칠때 } from './authoring-io.js';

/** 지금 도는 자식들. 거절로 에이전트가 나갈 때 남기지 않는다 — 남으면 구독 한도를 계속 쓴다 */
export const 도는자식 = new Set<ChildProcess>();

export interface 돌린결과 {
  /** 못 띄웠으면 null */
  코드: number | null;
  낸것: string;
  오류: string;
  시간초과: boolean;
  /** 멈출 신호로 죽였다 — 사람이 「작성 중단」을 눌렀다 (작성 §7 「중단 · 폐기 · 진척」) */
  멈춤으로죽음: boolean;
}

/**
 * 비동기로 돌린다. 서비스 루프들이 동시에 돌려면 긴 일이 이벤트 루프를 붙잡으면 안 된다.
 * `env` 는 **통째로** 준다(부모 것을 안 얹는다) — 자식 claude 에 에이전트 토큰이 새지 않게.
 * `흘림` 이면 표준출력·오류를 모으면서 터미널에도 흘린다 — 사람이 도는 것을 봐야 한다
 */
export function 돌린다(
  명령: string,
  인자: string[],
  선택: 칠때 & {
    cwd: string;
    input?: string;
    제한?: number;
    /**
     * 출력이 이만큼 없을 때만 죽인다 — 주면 `제한` 대신 쓴다. 작성 자식은 전체 시간이 아니라 응답 없음으로 멈춘다
     * (작성 §7 TIMEOUT · 2026-10-03 사용자 — 120분 제한이 시간에 쫓긴 자식이 검사를 줄이게 만들었다)
     */
    조용한제한?: number;
    흘림?: boolean;
    흘림줄?: (줄: string) => string | null;
    신호?: AbortSignal;
  },
): Promise<돌린결과> {
  return new Promise((resolve) => {
    let 낸것 = '';
    let 오류 = '';
    let 시간초과 = false;
    let 멈춤으로죽음 = false;
    // 흘림줄이 있으면 표준출력을 줄로 잘라 고른 것만 흘린다. 조각이 줄 가운데서 끊기므로 남은 반쪽을 들고 있다
    let 반쪽 = '';
    const 자식 = spawn(명령, 인자, {
      cwd: 선택.cwd,
      env: 선택.env,
      uid: 선택.uid,
      gid: 선택.gid,
    });
    도는자식.add(자식);
    const 죽이기 = () => {
      시간초과 = true;
      자식.kill('SIGKILL');
    };
    let 시계 = setTimeout(죽이기, 선택.조용한제한 ?? 선택.제한 ?? 120_000);
    // 조용한 제한이면 출력이 올 때마다 시계를 다시 맞춘다
    const 깨우기 = () => {
      if (선택.조용한제한 === undefined) return;
      clearTimeout(시계);
      시계 = setTimeout(죽이기, 선택.조용한제한);
    };
    // 이미 스스로 끝난 자식에 온 신호는 멈춤이 아니다 — 코드 0 으로 끝난 것을 중단으로 적으면 만든 케이스를 버린다
    const 멈추기 = () => {
      if (자식.exitCode !== null || 자식.signalCode !== null) return;
      멈춤으로죽음 = true;
      자식.kill('SIGKILL');
    };
    if (선택.신호?.aborted) 멈추기();
    else 선택.신호?.addEventListener('abort', 멈추기, { once: true });
    자식.stdout.on('data', (조각: Buffer) => {
      깨우기();
      const 글 = 조각.toString('utf8');
      낸것 += 글;
      if (선택.흘림줄 !== undefined) {
        const 줄들 = (반쪽 + 글).split('\n');
        반쪽 = 줄들.pop() ?? '';
        for (const 줄 of 줄들) {
          const 흘릴것 = 선택.흘림줄(줄);
          if (흘릴것 !== null) process.stdout.write(`${흘릴것}\n`);
        }
      } else if (선택.흘림) process.stdout.write(조각);
    });
    자식.stderr.on('data', (조각: Buffer) => {
      오류 += 조각.toString('utf8');
      if (선택.흘림) process.stderr.write(조각);
    });
    let 끝남 = false;
    const 끝 = (코드: number | null) => {
      if (끝남) return;
      끝남 = true;
      clearTimeout(시계);
      선택.신호?.removeEventListener('abort', 멈추기);
      도는자식.delete(자식);
      resolve({ 코드, 낸것, 오류, 시간초과, 멈춤으로죽음 });
    };
    자식.on('error', (err) => {
      오류 += err.message;
      끝(null);
    });
    자식.on('close', (코드) => 끝(코드));
    // 자손(Chromium·백그라운드 셸)이 출력 통로를 쥐고 남으면 close 가 안 온다 — 끝난 뒤 조금 기다렸다 통로를 닫고 끝낸다.
    // 리눅스 sh(dash)는 `sh -c 'x'` 에서 x 를 따로 띄워 CI 에서 드러났다 (2026-09-24). 남은 자손은 거두기가 죽인다
    자식.stdout.on('end', () => {
      // 줄바꿈 없이 끝난 마지막 줄 — 사용량은 낸것에 이미 있고 로그만 빠진다
      const 흘릴것 = 반쪽 === '' ? null : (선택.흘림줄?.(반쪽) ?? null);
      if (흘릴것 !== null) process.stdout.write(`${흘릴것}\n`);
    });
    자식.on('exit', (코드) => {
      setTimeout(() => {
        자식.stdout.destroy();
        자식.stderr.destroy();
        끝(코드);
      }, 500).unref();
    });
    // 입력을 다 읽기 전에 죽는 자식이면 EPIPE 가 난다 — 그 자식의 종료 코드가 이미 말해 준다
    자식.stdin.on('error', () => undefined);
    자식.stdin.end(선택.input ?? '');
  });
}
