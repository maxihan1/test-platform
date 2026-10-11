// 에이전트가 작성을 끝냈을 때 서비스 Slack 으로 알린다. 보내는 방식은 실행 알림(execution/notify.ts)과 같다

import { 걸린시간, 슬랙으로 } from '../execution/notify.js';
import { 확인필요 } from '../prd/rules.js';
import { 지금판 } from '../prd/store.js';
import { 오류첫줄 } from './history.js';
import { db } from './store.js';

// 목록 줄 제목은 상태 문구라 화면 언어를 따라가는 클라이언트 몫이다. 서버(알림 통로 · Slack)는 어떤 요청인지만 말한다
export const 작성제목 = (뿌리종류: string): string => (뿌리종류 === 'EDIT' ? '케이스 고치기' : '테스트 작성');

export interface 알릴것 {
  status: 'DONE' | 'FAILED' | 'STOPPED';
  서비스이름: string;
  /** 화면에 보이는 번호(뿌리) */
  뿌리: number;
  제목: string;
  caseFiles: number | null;
  /** 지금 PRD 의 확인 필요 수. PRD 가 없으면 null */
  확인필요: number | null;
  ms: number | null;
  error: string | null;
  prUrl: string | null;
}

const 머리 = { DONE: '[완료]', FAILED: '[실패]', STOPPED: '[중단]' } as const;

export function 본문(a: 알릴것, publicUrl: string): string {
  const 줄 = [`${머리[a.status]} ${a.서비스이름} · 작성 요청 #${a.뿌리} · ${a.제목}`];

  // 칸이 없는 조각은 뺀다 — 없는 값을 0 이나 미상으로 적으면 틀린 말이 된다
  if (a.status === 'DONE') {
    const 조각 = [
      a.caseFiles === null ? null : `스크립트 파일 ${a.caseFiles}개`,
      a.확인필요 === null ? null : `PRD 확인 필요 ${a.확인필요}건`,
      a.ms === null ? null : `걸린 시간 ${걸린시간(a.ms)}`,
    ].filter((x) => x !== null);
    if (조각.length > 0) 줄.push(조각.join(' · '));
  }
  if (a.status === 'FAILED' && a.error !== null && a.error !== '') 줄.push(a.error);
  if (a.prUrl !== null) 줄.push(`PR ${a.prUrl}`);

  // 주소를 모르면 링크 줄을 뺀다 — 틀린 주소를 보내는 것보다 없는 편이 낫다
  if (publicUrl !== '') 줄.push('', `결과 보기 ${publicUrl.replace(/\/$/, '')}/#/authoring/${a.뿌리}`);
  return 줄.join('\n');
}

interface 끝난행 {
  name: string;
  service_id: string;
  slack_webhook: string | null;
  status: 알릴것['status'];
  progress: { caseFiles?: unknown } | null;
  pr_url: string | null;
  error: string | null;
  ms: string | null;
  root_kind: string;
}

/**
 * 끝낸 요청 하나를 알린다. 웹훅이 없으면 안 보낸다.
 * 보내기 실패는 작성 실패가 아니다 — 재시도하지 않는다. 던지는 쪽은 부른 곳이 로그로 남긴다
 */
export async function 작성끝알림(id: number, 뿌리번호: number): Promise<boolean> {
  const pool = await db();
  const r = await pool.query<끝난행>(
    `SELECT s.name, a.service_id, s.slack_webhook, a.status, a.progress, a.pr_url, a.error,
            EXTRACT(EPOCH FROM (a.finished_at - a.started_at)) * 1000 AS ms,
            (SELECT kind FROM authoring_request WHERE id = $2) AS root_kind
       FROM authoring_request a JOIN service s ON s.id = a.service_id
      WHERE a.id = $1`,
    [id, 뿌리번호],
  );
  const 행 = r.rows[0];
  if (행 === undefined || 행.slack_webhook === null || 행.slack_webhook === '') return false;

  const 판 = 행.status === 'DONE' ? await 지금판(Number(행.service_id)) : null;
  const 글 = 본문(
    {
      status: 행.status,
      서비스이름: 행.name,
      뿌리: 뿌리번호,
      제목: 작성제목(행.root_kind),
      caseFiles: typeof 행.progress?.caseFiles === 'number' ? 행.progress.caseFiles : null,
      확인필요: 판 === null ? null : 확인필요(판.items).count,
      ms: 행.ms === null ? null : Number(행.ms),
      error: 행.error === null ? null : 오류첫줄(행.error),
      prUrl: 행.pr_url,
    },
    process.env.PLATFORM_PUBLIC_URL ?? '',
  );
  return 슬랙으로(행.slack_webhook, 글);
}

const 보내는중 = new Set<Promise<void>>();

/** 뒤에서 나가는 알림이 다 끝나길 기다린다 — 테스트가 보낸 결과를 보기 전에 쓴다 */
export const 알림이끝나길기다린다 = async (): Promise<void> => {
  await Promise.all(보내는중);
};

/**
 * 끝내기 통로가 부른다. 기다리지 않는다 — Slack 이 느리거나 먹통이어도 에이전트의 끝내기 응답은 안 늦춘다.
 * 알림이 실패해도 끝내기는 이미 성립했으므로 로그만 남기고 삼킨다 (실행 알림과 같은 규칙).
 * 사람이 멈춘 것(USER)은 화면에서 이미 알고 있어 안 보낸다. 머지는 작성 완료가 아니라 반영이라 안 보낸다
 */
export function 끝냈다고알림(
  행: { id: number; kind: string },
  뿌리번호: number,
  stopReason: string | undefined,
  log: { error: (글: string) => void },
): void {
  if (행.kind === 'MERGE' || stopReason === 'USER') return;
  const 일 = 작성끝알림(행.id, 뿌리번호)
    .then(() => undefined)
    .catch((err: unknown) => {
      log.error(`[authoring] 작성 요청 ${행.id}의 Slack 알림을 보내지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    });
  보내는중.add(일);
  void 일.finally(() => 보내는중.delete(일));
}
