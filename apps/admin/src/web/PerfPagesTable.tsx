// 성능 테스트 › 페이지 성능 — 「페이지별 측정 결과」 표. 줄을 고르면 아래에 그 페이지의 워터폴이 선다 (도메인/성능 §8.14 · 시안 WebSpeed)

import { use말 } from './i18n.js';
import type { Compare, PageRow } from './perfPageApi.js';
import { 넘음, 비교값, 클글자 } from './perfPagesView.js';
import { 초글자 } from './perfRunView.js';

export function PerfPagesTable({ 줄들, 비교, 고른, on고름 }: { 줄들: PageRow[]; 비교: Compare | null; 고른: string | null; on고름: (url: string) => void }) {
  const t = use말();
  return (
    <section className="perf-panel" aria-labelledby="perf-pt">
      <div className="pp-title">
        <h2 id="perf-pt">{t('페이지별 측정 결과')}</h2>
        <span className="perf-faint">{t('목표 LCP 2.5초 · FCP 1.8초 · CLS 0.1 이하')}</span>
      </div>
      <div className="perf-table-box">
        <table className="perf-table pp-table" aria-label={t('페이지별 측정 결과')}>
          <thead>
            <tr>
              <th>{t('페이지')}</th>
              <th className="r">{t('LCP 단독')}</th>
              <th className="r">{t('LCP 부하 중')}</th>
              <th className="r">FCP</th>
              <th className="r">CLS</th>
              <th>{t('판정')}</th>
            </tr>
          </thead>
          <tbody>
            {줄들.map((줄) => {
              const 부하 = 비교값(비교, 줄.url);
              const 부하넘음 = 넘음.lcp(부하);
              return (
                <tr key={줄.url} className={줄.url === 고른 ? 'perf-open pp-row' : 'pp-row'} onClick={() => on고름(줄.url)}>
                  <td>
                    <button type="button" className="perf-toggle pp-pick" aria-pressed={줄.url === 고른}>
                      <span>{줄.name}</span> <span className="mono perf-faint">{줄.url}</span>
                    </button>
                  </td>
                  <td className={넘음.lcp(줄.lcpMs) ? 'r mono perf-err' : 'r mono'}>{초글자(줄.lcpMs, t)}</td>
                  <td className={부하넘음 ? 'r mono perf-err' : 'r mono'}>{초글자(부하, t)}</td>
                  <td className={넘음.fcp(줄.fcpMs) ? 'r mono perf-err' : 'r mono'}>{초글자(줄.fcpMs, t)}</td>
                  <td className={넘음.cls(줄.cls) ? 'r mono perf-err' : 'r mono'}>{클글자(줄.cls)}</td>
                  <td>
                    {줄.verdict === null ? (
                      '-'
                    ) : (
                      <>
                        <span className={줄.verdict === 'PASS' && !부하넘음 ? 'verdict v-pass' : 'verdict v-fail'}>
                          {줄.verdict === 'PASS' && !부하넘음 ? t('통과') : t('실패')}
                        </span>
                        {부하넘음 ? <span className="perf-faint"> {t('부하 중')}</span> : null}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {비교 === null ? null : (
        <div className="perf-faint">
          {t('부하 중 값: 성능 실행')} <a href={`#/perf/runs/${String(비교.runId)}`}>{비교.code}</a>
          {비교.vus === null ? null : t(', 가상 사용자 {수}명 시점', { 수: 비교.vus.toLocaleString('ko-KR') })}
        </div>
      )}
    </section>
  );
}
