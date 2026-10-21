// 성능 테스트 › 실행 중 — 「페이지 로딩 (부하 중)」 칸. 페이지마다 가장 최근 LCP 를 단독 측정 값과 나란히 보인다 (도메인/성능 §8.14 · 시안 Run)

import { useEffect, useState } from 'react';

import { use말, use언어 } from './i18n.js';
import { perfApi } from './perfApi.js';
import type { Compare, PageRow } from './perfPageApi.js';
import { 넘음, 비교값, 페이지별최근 } from './perfPagesView.js';
import { 갱신간격, 초글자 } from './perfRunView.js';
import { message } from './ui.js';

export function PerfRunPageCheck({ runId }: { runId: number }) {
  const t = use말();
  const 언어 = use언어();
  const [줄들, set줄들] = useState<PageRow[]>([]);
  const [단독, set단독] = useState<Compare | null>(null);
  const [오류, set오류] = useState<string | null>(null);

  useEffect(() => {
    let 살음 = true;
    async function 한번() {
      try {
        const 받음 = await perfApi.pages(runId);
        if (!살음) return;
        set줄들(페이지별최근(받음.pages));
        set단독(받음.compare);
        set오류(null);
      } catch (err) {
        if (살음) set오류(message(err, 언어));
      }
    }
    void 한번();
    const 타이머 = setInterval(() => void 한번(), 갱신간격.ms);
    return () => {
      살음 = false;
      clearInterval(타이머);
    };
  }, [runId]);

  return (
    <section className="perf-panel" aria-labelledby="perf-w">
      <h2 id="perf-w">{t('페이지 로딩 (부하 중)')}</h2>
      {오류 === null ? null : <p className="perf-err" role="alert">{오류}</p>}
      {줄들.length === 0 ? <span className="perf-faint">{t('아직 받은 숫자가 없습니다')}</span> : null}
      {줄들.map((줄) => {
        const 초과 = 넘음.lcp(줄.lcpMs);
        const 혼자 = 비교값(단독, 줄.url);
        const 덧 = [초과 ? t('목표 2.5초 초과') : null, 혼자 === null ? null : t('단독 측정 {값}', { 값: 초글자(혼자, t) })].filter((글) => 글 !== null);
        return (
          <div className="perf-mrow" key={줄.url}>
            <div className="perf-mtop">
              <span>{t('{이름} LCP', { 이름: 줄.name })}</span>
              <span className={초과 ? 'mono perf-err' : 'mono'}>{초글자(줄.lcpMs, t)}</span>
            </div>
            {덧.length === 0 ? null : <div className="perf-faint">{덧.join(', ')}</div>}
          </div>
        );
      })}
    </section>
  );
}
