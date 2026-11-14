// 실행 결과 화면의 QA 리포트 고리 — 머리 「QA 리포트 열기」와 맨 위 한 줄 요약 띠 (도메인/리포팅 §8.21 「다른 화면의 고리」 · 2026-11-15 사용자 시안 A)
// 띠 글자는 리포트 첫 장 「결과 요약」과 같은 함수(reporting/qaReportWords.ts)로 짓는다 — 화면과 문서가 같은 숫자를 다른 말로 적지 않게

import { useEffect, useState } from 'react';

import { 결과글, 종류이름 } from '../reporting/qaReportWords.js';
import { ApiError } from './api.js';
import { use말 } from './i18n.js';
import { qaReportApi, 리포트이름, type 리포트응답 } from './qaReportApi.js';

/** 이 실행이 든 리포트의 마지막 버전. 도는 실행 · 아직 어느 리포트에도 안 든 실행은 없다(404) — 그때는 버튼도 띠도 안 그린다 */
export function use실행리포트(runId: number, 끝났나: boolean): 리포트응답 | null {
  const [리포트, set리포트] = useState<리포트응답 | null>(null);
  useEffect(() => {
    set리포트(null);
    if (!끝났나) return;
    let 살아있다 = true;
    qaReportApi
      .ofRun(runId)
      .then(({ id }) => qaReportApi.get(id))
      .then(
        (r) => {
          if (살아있다) set리포트(r);
        },
        (e: unknown) => {
          // 리포트가 없는 것은 오류가 아니다. 그 밖은 띠만 빠지고 결과 화면은 선다 — 까닭은 콘솔에 남긴다
          if (!(e instanceof ApiError && e.status === 404)) console.error(`[run ${String(runId)}] could not read its QA report; leaving out the summary band`, e);
        },
      );
    return () => {
      살아있다 = false;
    };
  }, [runId, 끝났나]);
  return 리포트;
}

export function 리포트열기({ 리포트 }: { 리포트: 리포트응답 | null }) {
  const t = use말();
  if (리포트 === null) return null;
  return (
    <a className="btn ghost" href={`#/qa-reports/${String(리포트.id)}`}>
      {t('QA 리포트 열기')}
    </a>
  );
}

// 안정화 결과 글은 세 줄(대표 숫자 · 출처별 · 오류 종류)이다 — 한 줄 띠에는 대표 숫자 줄만 싣는다
const 첫줄 = (글: string): string => 글.split('\n')[0] ?? 글;

export function 리포트띠({ 리포트 }: { 리포트: 리포트응답 | null }) {
  const t = use말();
  if (리포트 === null) return null;
  const s = 리포트.summary;
  const 묶음 = (이름: string, 줄들: (typeof s.results.functional)[number][] | (typeof s.results.nonFunctional)[number][]) => (
    <p className="rqa-cells">
      <span className="rqa-grp">{t(이름)}</span>
      {줄들.map((x) => (
        <span key={x.kind}>
          <b>{t(종류이름[x.kind])}</b> {첫줄(결과글(x))}
        </span>
      ))}
    </p>
  );
  return (
    <section className="rqa" aria-label={t('QA 리포트 결과 요약')}>
      <div className="rqa-head">
        <b>{t('{이름} QA 리포트', { 이름: 리포트이름(리포트, t) })}</b>
        {/* 승인은 판정이 아니라 판정 색 · 대표색을 쓰지 않는다 — 목록 칩과 같은 무채색 (DESIGN.md 원칙 1) */}
        <span className={리포트.approval === null ? 'qar-state wait' : 'qar-state ok'}>{리포트.approval === null ? t('승인 전') : t('승인됨')}</span>
        <span className="rqa-meta">
          {t('실행 {수}개', { 수: s.overview.runs })} · {t('버전 {버전}', { 버전: 리포트.version })}
        </span>
      </div>
      {묶음('기능 검증', s.results.functional)}
      {묶음('비기능 검증', s.results.nonFunctional)}
    </section>
  );
}
