// 안정화 지표 메인 화면 — 머리 · AI 실행 요약 · 잔여 오류 추이 · 오류 목록 (도메인/안정화 §8.19 · 시안 6판 A6 · A6m)

import { Fragment, useState } from 'react';

import type { ServiceRow } from './api.js';
import { Head } from './Head.js';
import { use말 } from './i18n.js';
import { 주소고치기 } from './leaveGuard.js';
import { stabilityApi, type 안정화응답 } from './stabilityApi.js';
import { 오류목록판 } from './StabilityErrors.js';
import { 요약판 } from './StabilitySummary.js';
import { 추이판 } from './StabilityTrend.js';
import { 날글자 } from './stabilityView.js';
import { Failed, Loading, useAsync } from './ui.js';

type 말 = ReturnType<typeof use말>;

/** `정기 실행 · 매일 03:00 · 11-12 실행 #3043 · #3044 · 케이스 128건 · 빌드 #22` — 실행 번호는 그 실행 결과 링크다 (§8.19 「머리」) */
function 부제({ 응답, t }: { 응답: 안정화응답; t: 말 }) {
  const { schedule, run } = 응답;
  const 정기 = schedule === null ? t('정기 실행 꺼짐') : t('정기 실행 · 매일 {시각}', { 시각: schedule.at });
  if (run === null) return <>{정기}</>;
  return (
    <>
      {정기} · {날글자(run.day)} {t('실행')}{' '}
      {/* 묶음의 두 실행(UI · 기능)을 다 건다 — 하나만 걸면 다른 쪽 케이스가 안 보인다 (STAB-F1-08 시작 질문 승인) */}
      {run.runIds.map((번호, i) => (
        <Fragment key={번호}>
          {i === 0 ? null : ' · '}
          <a href={`#/runs/${String(번호)}`}>#{번호}</a>
        </Fragment>
      ))}
      {' · '}
      {t('케이스 {수}건', { 수: run.cases })}
      {run.buildNo === null ? null : ' · '}
      {run.buildNo === null ? null : t('빌드 #{빌드}', { 빌드: run.buildNo })}
    </>
  );
}

export function Stability({ service, run }: { service: ServiceRow; run: number | undefined }) {
  const t = use말();
  const [고른, set고른] = useState<number | null>(run ?? null);
  const [기간, set기간] = useState<7 | 30>(7);
  const { data, error } = useAsync(() => stabilityApi.main(service.id, 고른, 기간), [service.id, 고른, 기간]);

  const 날고르기 = (번호: number) => {
    set고른(번호);
    // 다른 화면에 다녀와도 고른 날이 남는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
    주소고치기(`#/stability?run=${String(번호)}`);
  };

  const 고르개 =
    data === null || data.runs.length === 0 || data.run === null ? undefined : (
      <select className="stab-pick" aria-label={t('실행 날짜')} value={data.run.runId} onChange={(e) => 날고르기(Number(e.target.value))}>
        {data.runs.map((r) => (
          <option key={r.runId} value={r.runId}>
            {날글자(r.day)}
          </option>
        ))}
      </select>
    );

  return (
    <div className="stab">
      <Head 제목={t('안정화 지표')} 부제={data === null ? undefined : <부제 응답={data} t={t} />} 행동={고르개} />
      {error !== null ? (
        <Failed error={error} />
      ) : data === null ? (
        <Loading />
      ) : data.run === null ? (
        <section className="stab-panel stab-empty">
          <p className="stab-headline">{t('정기 실행 기록이 없습니다')}</p>
          <p className="stab-faint">{t('설정에서 정기 실행을 켜면 매일 집계합니다')}</p>
        </section>
      ) : (
        <>
          <요약판 요약={data.summary} run={data.run} />
          <추이판 응답={data} 기간={기간} on기간={set기간} />
          <오류목록판 줄들={data.errors} runId={data.run.runId} day={data.run.day} 이전있나={data.run.previous !== null} />
        </>
      )}
    </div>
  );
}
