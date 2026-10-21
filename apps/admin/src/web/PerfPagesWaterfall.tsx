// 성능 테스트 › 페이지 성능 — 고른 페이지의 로딩 워터폴과 그 페이지 AI 분석 (도메인/성능 §8.14 · 시안 WebSpeed)

import { use말 } from './i18n.js';
import type { PageRow } from './perfPageApi.js';
import { 워터폴막대 } from './perfPagesView.js';
import { 초글자 } from './perfRunView.js';

export function PerfPagesWaterfall({ 줄 }: { 줄: PageRow }) {
  const t = use말();
  const 막대들 = 워터폴막대(줄);
  const lcp = 초글자(줄.lcpMs, t);
  const 읽어줄글 = t('{목록}이 차례로 걸려 LCP가 {값}인 그림', {
    목록: 막대들.map((막대) => `${막대.이름} ${초글자(막대.durationMs, t)}`).join(', '),
    값: lcp,
  });
  const 분석 = 줄.ai ?? [];

  return (
    <section className="perf-panel" aria-labelledby="perf-wf">
      <h2 id="perf-wf">{t('{이름} 로딩 워터폴', { 이름: 줄.name })}</h2>
      {막대들.length === 0 ? (
        <span className="perf-faint">{t('받은 리소스가 없습니다')}</span>
      ) : (
        <div className="pp-wf" role="img" aria-label={읽어줄글}>
          {막대들.map((막대, i) => (
            <div key={`${막대.이름}${String(i)}`} style={{ display: 'contents' }}>
              <span className="pp-wf-name" title={막대.이름}>
                {막대.이름}
              </span>
              <div className="pp-track">
                <span className={막대.뜨거움 ? 'hot' : undefined} style={{ left: `${막대.왼쪽.toFixed(1)}%`, width: `${막대.너비.toFixed(1)}%` }} />
              </div>
              <span className={막대.뜨거움 ? 'mono pp-hot-num' : 'mono'}>{초글자(막대.durationMs, t)}</span>
            </div>
          ))}
          <span className="pp-lab">LCP</span>
          <span className="perf-faint pp-wf-end">
            {줄.lcpElement === null ? lcp : t('{값} (LCP 요소: {요소})', { 값: lcp, 요소: 줄.lcpElement })}
          </span>
          <span />
        </div>
      )}
      {분석.length === 0 ? null : (
        <>
          <div>
            <span className="perf-ai">{t('AI 분석')}</span>
          </div>
          <ul className="perf-ai-list">
            {분석.map((항목) => (
              <li key={항목}>{항목}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
