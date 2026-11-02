// 정기 실행을 만든다 (SPEC 공통/6-인프라 §9.2). admin 이 1분마다 부르고, scripts/run-scheduled.ts 가 손으로 한 번 부른다.
// HTTP 를 거치지 않는다 — 로그인 없이 실행을 시키는 문을 내지 않으려고 admin 프로세스 안에서 만든다 (도메인/인증 §7 「인증 적용 범위」)

import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';

import { listCases } from '../catalog/store.js';

import { dispatch } from './dispatcher.js';
import { 앱케이스를뺀다 } from './location.js';
import { 종류별로나눈다 } from './runKind.js';
import { abortRun, createRun, MAX_ITEMS, RunInputError } from './store.js';

export interface 로그 {
  info: (말: string) => void;
  error: (말: string) => void;
}

export interface 만든정기실행 {
  runIds: number[];
  /** 종류 하나라도 못 만들었거나 돌릴 케이스가 없었다 */
  실패: boolean;
  /** 분배가 끝나면 풀린다. admin 은 안 기다리고 명령은 기다린다 */
  끝: Promise<void>;
}

const 이름 = { UI: 'UI 테스트', FN: '기능 테스트' } as const;

/** 빌드로 시작한 실행이면 싣는다 — 회귀는 정기 실행과 같은 두 실행이고, 스모크는 스모크 케이스만 담는다 (도메인/실행 §3.11) */
export interface 빌드로 {
  id: number;
  buildNo: string;
  stage: 'SMOKE' | 'FULL';
  /** 토큰을 발급한 사람 — 실행자다 */
  username: string;
  displayName: string;
}

/** 서비스 하나의 활성 케이스를 UI · 기능 실행 둘로 만들고 분배를 건다. 실패는 던지지 않고 로그에 남긴다 — 다른 종류 · 다른 서비스는 돈다 */
export async function 정기실행을만든다(prefix: string, env: string, 로그: 로그, 빌드?: 빌드로): Promise<만든정기실행> {
  const 꼬리 = 빌드 === undefined ? '[schedule]' : `[build ${빌드.buildNo}]`;
  const 목록 = await listCases({
    service: prefix,
    q: '',
    activeOnly: true,
    page: 1,
    pageSize: MAX_ITEMS,
    ...(빌드?.stage === 'SMOKE' && { smoke: true }),
  });
  if (목록.items.length === 0) {
    // 스모크 케이스가 없는 것은 흔하다(기본값이 꺼짐) — 부르는 쪽이 바로 회귀를 건다. 스캔 문제와 섞이지 않게 오류로 남기지 않는다
    if (빌드?.stage === 'SMOKE') {
      로그.info(`${꼬리} ${prefix} 스모크 케이스가 없다`);
      return { runIds: [], 실패: false, 끝: Promise.resolve() };
    }
    로그.error(`${꼬리} ${prefix} 서비스에 돌릴 활성 케이스가 없다. 스캔이 돌았는지 확인해라`);
    return { runIds: [], 실패: true, 끝: Promise.resolve() };
  }

  // 팜이 없으면 앱 케이스를 돌릴 곳이 없다 (§9.2)
  const { 남은, 뺀수 } = 앱케이스를뺀다(목록.items, process.env);
  if (뺀수 > 0) 로그.info(`${꼬리} ${prefix} android 케이스 ${String(뺀수)}건은 뺐다 — Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않다`);
  if (남은.length === 0) {
    로그.info(`${꼬리} ${prefix} 서비스에 돌릴 케이스가 없어 실행을 만들지 않았다`);
    return { runIds: [], 실패: false, 끝: Promise.resolve() };
  }

  const items = 남은.map((c) => ({
    tcId: c.tcId,
    platforms: c.platforms,
    // 빈 칸으로 보낸다. createRun 이 저장값 → 케이스 코드 기본값 순서로 채운다 — 사람이 채워야만 도는 케이스는 §4 K10 이 막는다
    params: {},
    expected: {},
  }));

  const 만든것: { runId: number; 보낼것: Awaited<ReturnType<typeof createRun>>['items'] }[] = [];
  let 실패 = false;
  // 실행 하나에 한 종류다 — 한쪽이 실패해도 다른 쪽은 돈다. 아침 Slack 도 둘이다 (SPEC 공통/4-데이터모델 「실행 종류」)
  for (const 묶음 of 종류별로나눈다(items)) {
    try {
      const { runId, items: 보낼것 } = await createRun({
        ...(빌드 === undefined
          ? {
              origin: 'SCHEDULED' as const,
              // 사람이 아니므로 사람 이름을 받지 않는다. 이름 칸도 박는다 — 비우면 「실행자 미상」으로 읽힌다 (SPEC §8.6)
              triggeredBy: '스케줄러',
              triggeredByName: '스케줄러',
            }
          : {
              origin: 'BUILD' as const,
              build: { id: 빌드.id, no: 빌드.buildNo, stage: 빌드.stage },
              triggeredBy: 빌드.username,
              triggeredByName: 빌드.displayName,
            }),
        env,
        // 반복은 테스트 코드를 검증하는 도구지 추이를 만드는 도구가 아니다 (SPEC §8.2)
        repeat: 1,
        // 새벽에 도는 것을 볼 사람이 없다. 아침에 Slack 에서 보는 것이 유일한 경로다 (SPEC §8.9)
        notifySlack: true,
        items: 묶음.items,
      });
      만든것.push({ runId, 보낼것 });
      로그.info(`${꼬리} ${prefix} 실행 ${String(runId)}(${이름[묶음.kind]})을 만들었다. 케이스 ${String(묶음.items.length)}건 · 항목 ${String(보낼것.length)}건`);
    } catch (err) {
      실패 = true;
      로그.error(`${꼬리} ${prefix} ${이름[묶음.kind]} 실행을 못 만들었다 — ${err instanceof RunInputError ? `${err.code}: ${err.message}` : String(err)}`);
    }
  }
  const runIds = 만든것.map((m) => m.runId);
  // 스모크는 둘 다 서야 「다 통과」를 따질 수 있다 — 하나라도 못 만들었으면 만든 것도 돌리지 않고 닫는다(부르는 쪽이 빌드를 지우고 CI 가 다시 부른다)
  if (실패 && 빌드?.stage === 'SMOKE') {
    for (const runId of runIds) await abortRun(runId);
    return { runIds: [], 실패, 끝: Promise.resolve() };
  }
  // 다 만든 뒤에 분배한다 — 앞 실행이 뒤 실행이 서기도 전에 끝나 스모크 뒤 판정이 반쪽만 보지 않게
  return { runIds, 실패, 끝: Promise.all(만든것.map((m) => dispatch(m.runId, m.보낼것))).then(() => undefined) };
}

/**
 * 지금 돌 서비스를 집는다 — 고르는 것과 「마지막으로 돈 때」를 적는 것이 한 문장이라 둘이 같은 서비스를 집지 않는다.
 * 조건은 활성 · 켜짐 · 그 시간대의 지금이 정한 시각부터 1시간 안(자정을 넘지 않는다) · 그 시간대의 오늘 아직 안 돌았다 (§9.2).
 * 지금은 DB 시계다 — 실행의 started_at 도 DB 가 적어서 「마지막 정기 실행」이 두 시계의 차이로 실행을 놓치지 않는다
 */
export async function 돌때가된서비스(
  // 검사만 넘긴다. 검사는 트랜잭션 연결도 넘겨 되돌린다 — 그 DB 의 다른 서비스 「마지막으로 돈 때」를 덮지 않게
  지금: Date | null = null,
  db?: Pick<PoolClient, 'query'>,
): Promise<{ prefix: string; env: string }[]> {
  const 손 = db ?? (await import('../db/index.js')).pool;
  const r = await 손.query<{ prefix: string; env: string }>(
    `WITH 기준 AS (SELECT COALESCE($1::timestamptz, now()) AS t)
     UPDATE service
        SET schedule_last = 기준.t
       FROM 기준
      WHERE is_active
        AND schedule_at IS NOT NULL
        AND (기준.t AT TIME ZONE schedule_tz)::time - schedule_at >= interval '0'
        AND (기준.t AT TIME ZONE schedule_tz)::time - schedule_at <  interval '1 hour'
        AND (schedule_last IS NULL
             OR (schedule_last AT TIME ZONE schedule_tz)::date < (기준.t AT TIME ZONE schedule_tz)::date)
      RETURNING prefix, schedule_env AS env`,
    [지금],
  );
  return r.rows;
}

/** 1분마다 부른다. 만들다 실패해도 그날은 다시 안 돈다 — 1분마다 같은 실패를 되풀이하지 않는다 (§9.2) */
export async function 정기실행점검(로그: 로그): Promise<void> {
  for (const { prefix, env } of await 돌때가된서비스()) {
    try {
      const { 끝 } = await 정기실행을만든다(prefix, env, 로그);
      void 끝.catch((err: unknown) => 로그.error(`[schedule] ${prefix} 분배가 깨졌다: ${err instanceof Error ? err.message : String(err)}`));
    } catch (err) {
      로그.error(`[schedule] ${prefix} 정기 실행을 못 만들었다: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

/**
 * admin 이 뜰 때 건다(app.ts 기동 경로 — 라우트를 띄우는 검사가 진짜 실행을 만들지 않게).
 * 시각과 마지막으로 돈 때가 DB 에 있어 재기동해도 1분 넘게 밀리지 않는다 —
 * 앞 판이 「admin 안에 스케줄러를 넣지 않는다」고 한 까닭(메모리 타이머가 재기동마다 흔들린다)이 여기서는 없다 (§9.2)
 */
export function 정기실행켜기(app: FastifyInstance): void {
  const 로그: 로그 = { info: (말) => app.log.info(말), error: (말) => app.log.error(말) };
  const 점검 = setInterval(() => {
    void 정기실행점검(로그).catch((err: unknown) =>
      로그.error(`[schedule] 점검이 깨졌다: ${err instanceof Error ? err.message : String(err)}`),
    );
  }, 60_000);
  app.addHook('onClose', async () => clearInterval(점검));
}
