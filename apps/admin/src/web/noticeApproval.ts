// 알림 서랍의 「승인 전 QA 리포트」 줄 — 서랍에만 서고 본문 위 줄 · 토스트에는 안 선다 (SPEC 공통/5-화면공통 §8 「알림」)

import type { NoticeApproval } from './api.js';
import { t, type 언어 } from './i18n.js';
import { 리포트이름 } from './qaReportApi.js';

export interface 승인줄 {
  열쇠: string;
  머리: string;
  서비스: string;
  열기: string;
  갱신때: string;
}

/** 읽음 목록의 열쇠. 실행 · 작성 열쇠(`run:` · `authoring:`)와 겹치지 않는다 */
export function 승인열쇠(a: NoticeApproval): string {
  return `qa_report:${String(a.reportId)}`;
}

export function 승인줄만들기(a: NoticeApproval, 언어: 언어): 승인줄 {
  const 이름 = 리포트이름(a, (키, 값) => t(키, 언어, 값));
  return {
    열쇠: 승인열쇠(a),
    머리: t('{이름} QA 리포트 · 승인 전', 언어, { 이름 }),
    서비스: a.serviceName,
    열기: `#/qa-reports/${String(a.reportId)}`,
    갱신때: a.updatedAt,
  };
}

export function 승인안읽은수(approvals: readonly NoticeApproval[], 읽음: ReadonlySet<string>): number {
  return approvals.filter((a) => !읽음.has(승인열쇠(a))).length;
}

/** 서랍에 설 승인 전 줄 — 손이 가야 하는 줄이라 실행 · 작성 거르개에는 안 서고 「전체」와 안 읽었을 때의 「안 읽음」에만 선다. 서버가 새것 먼저 준다 */
export function 서랍승인목록(approvals: readonly NoticeApproval[], 읽음: ReadonlySet<string>, 거르개: string): NoticeApproval[] {
  if (거르개 === 'all') return [...approvals];
  if (거르개 === 'unread') return approvals.filter((a) => !읽음.has(승인열쇠(a)));
  return [];
}
