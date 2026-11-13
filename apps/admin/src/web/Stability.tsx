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

/**
 * 날짜 고르개. 목록은 가장 최근 집계에서 30일이라 주소로 연 더 옛 실행은 목록에 없다 — 그 실행을 맨 아래 하나 더 둔다(안 그러면 고르개가 엉뚱한 날을 보인다).
 * 같은 날 집계가 둘 이상이면(대상 서버가 둘) 실행 번호를 붙여 가른다
 */
function 날고르개({ 응답, 고름, t }: { 응답: 안정화응답; 고름: (번호: number) => void; t: 말 }) {
  const run = 응답.run!;
  const 줄들 = 응답.runs.some((r) => r.runId === run.runId) ? 응답.runs : [...응답.runs, { runId: run.runId, day: run.day }];
  const 겹친날 = new Set(줄들.filter((r, i) => 줄들.findIndex((x) => x.day === r.day) !== i).map((r) => r.day));
  return (
    <select className="stab-pick" aria-label={t('실행 날짜')} value={run.runId} onChange={(e) => 고름(Number(e.target.value))}>
      {줄들.map((r) => (
        <option key={r.runId} value={r.runId}>
          {겹친날.has(r.day) ? `${날글자(r.day)} · #${String(r.runId)}` : 날글자(r.day)}
        </option>
      ))}
    </select>
  );
}

export function Stability({ service, run, days }: { service: ServiceRow; run: number | undefined; days: 7 | 30 }) {
  const t = use말();
  const [고른, set고른] = useState<number | null>(run ?? null);
  const [기간, set기간] = useState<7 | 30>(days);
  const { data, error } = useAsync(() => stabilityApi.main(service.id, 고른, 기간), [service.id, 고른, 기간]);

  // 다른 화면에 다녀와도 고른 날 · 창이 남는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」). 다시 그리지 않으려고 기록을 쌓지 않고 고친다
  const 주소남기기 = (번호: number | null, 창: 7 | 30) => {
    const 조건 = [...(번호 === null ? [] : [`run=${String(번호)}`]), ...(창 === 30 ? ['days=30'] : [])];
    주소고치기(조건.length === 0 ? '#/stability' : `#/stability?${조건.join('&')}`);
  };
  const 날고르기 = (번호: number) => {
    set고른(번호);
    주소남기기(번호, 기간);
  };
  const 창고르기 = (창: 7 | 30) => {
    set기간(창);
    주소남기기(고른, 창);
  };

  const 고르개 = data === null || data.run === null ? undefined : <날고르개 응답={data} 고름={날고르기} t={t} />;

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
          <p className="stab-faint">{t('정기 실행 메뉴에서 안정화 기준 세트를 정하면 매일 집계합니다')}</p>
        </section>
      ) : (
        <>
          <요약판 요약={data.summary} run={data.run} tz={data.schedule?.tz} />
          <추이판 응답={data} 기간={기간} on기간={창고르기} />
          <오류목록판 줄들={data.errors} runId={data.run.runId} day={data.run.day} 이전있나={data.run.previous !== null} />
        </>
      )}
    </div>
  );
}
