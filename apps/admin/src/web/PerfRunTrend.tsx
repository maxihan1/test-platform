// 성능 결과의 시간대별 추이(서버 모니터링 CPU 줄 겹침)와 트랜잭션별 결과 — 이전 실행과 견준 「성능 저하」 (도메인/성능 §3.9 · §8.14)

import { use말 } from './i18n.js';
import { PerfChart } from './PerfChart.js';
import { perfApi, type 실행상세 } from './perfApi.js';
import { 가장큰값, 목표대상, 증가율, 초글자, 퍼센트글자, 전체줄 } from './perfRunView.js';
import { useAsync } from './ui.js';

const CPU색 = ['var(--fail-text)', 'var(--chart-2)', 'var(--na-text)'];

export function PerfRunTrend({ run, 자동중단 }: { run: 실행상세; 자동중단: boolean }) {
  const t = use말();
  const 숫자 = useAsync(() => Promise.all([perfApi.series(run.id), perfApi.hosts(run.id)]), [run.id]);
  const 전체 = 전체줄(숫자.data?.[0].series ?? []);
  const 끝 = 전체.at(-1)?.sec ?? 0;
  const p95목표 = run.config.targets.find((x) => x.metric === 'P95' && 목표대상(x) === null);
  const 위 = Math.max(1000, Math.ceil((가장큰값(전체.map((줄) => 줄.p95Ms), p95목표?.value ?? 0) * 1.1) / 1000) * 1000);
  const 최대사용자 = 가장큰값(전체.map((줄) => 줄.vus), Math.max(1, run.config.maxVus));
  const 간격 = Math.max(1, Math.ceil(전체.length / 300));
  const 점 = (값: (줄: (typeof 전체)[number]) => number) => 전체.filter((_, i) => i % 간격 === 0).map((줄) => ({ x: 줄.sec, y: 값(줄) }));
  const 감시 = (숫자.data?.[1].hosts ?? []).filter((줄) => run.config.monitorIds.includes(줄.agentId));
  const 감시번호들 = [...new Set(감시.map((줄) => 줄.agentId))];

  return (
    <>
      {전체.length === 0 ? null : (
        <section className="perf-panel" aria-labelledby="perf-trend">
          <h2 id="perf-trend">{t('시간대별 추이')}</h2>
          <PerfChart
            라벨={t('가상 사용자와 95% 응답시간 추이 그래프')}
            최대X={Math.max(끝, 1)}
            왼쪽눈금={[초글자(위, t), 초글자(위 / 2, t), t('{수}초', { 수: 0 })]}
            선들={[
              { 이름: t('95% 응답시간'), 색: 'var(--ink)', 점들: 점((줄) => 줄.p95Ms), 최대Y: 위, 굵게: true },
              { 이름: t('가상 사용자'), 색: 'var(--chart-2)', 점들: 점((줄) => 줄.vus), 최대Y: 최대사용자 },
            ]}
            목표={p95목표 === undefined ? undefined : { 이름: t('목표 {값}', { 값: 초글자(p95목표.value, t) }), 값: p95목표.value, 최대Y: 위 }}
            세로선={자동중단 ? { x: 끝, 색: 'var(--fail)' } : undefined}
          />
          {감시번호들.length === 0 ? null : (
            <PerfChart
              높이={60}
              라벨={t('서버 모니터링 CPU 그래프')}
              최대X={Math.max(끝, 1)}
              선들={감시번호들.map((번호, i) => {
                const 줄들 = 감시.filter((줄) => 줄.agentId === 번호);
                return { 이름: `${줄들[0]?.agentName ?? ''} CPU`, 색: CPU색[i % CPU색.length]!, 점들: 줄들.map((줄) => ({ x: 줄.sec, y: 줄.cpu })), 최대Y: 100 };
              })}
            />
          )}
        </section>
      )}

      {run.transactions.length === 0 ? null : (
        <section className="perf-panel" aria-labelledby="perf-tx">
          <h2 id="perf-tx">
            {t('트랜잭션별 결과')}
            {run.comparePoint === null ? '' : ' ' + t('(가상 사용자 {수}명 시점)', { 수: run.comparePoint.toLocaleString('ko-KR') })}
          </h2>
          <div className="perf-table-box">
            <table className="perf-table">
              <thead>
                <tr>
                  <th>{t('트랜잭션')}</th>
                  <th className="r">{t('95% 응답시간')}</th>
                  <th className="r">{t('에러율')}</th>
                  <th className="r">{t('이전 실행')}</th>
                  <th>{t('변화')}</th>
                </tr>
              </thead>
              <tbody>
                {run.transactions.map((줄) => {
                  const 늘어난 = 증가율(줄.p95Ms, 줄.prevP95Ms);
                  return (
                    <tr key={줄.tx}>
                      <td>{줄.tx}</td>
                      <td className={줄.degraded ? 'r mono perf-chg' : 'r mono'}>{초글자(줄.p95Ms, t)}</td>
                      <td className="r mono">{퍼센트글자(줄.errorRate)}</td>
                      <td className="r mono">{초글자(줄.prevP95Ms, t)}</td>
                      <td>
                        {줄.prevP95Ms === null ? (
                          <span className="perf-faint">-</span>
                        ) : 줄.degraded ? (
                          <>
                            {늘어난 === null ? null : <span className="perf-chg">{t('{수}% 증가', { 수: 늘어난 })}</span>} <span className="perf-chg">{t('성능 저하')}</span>
                          </>
                        ) : (
                          <span className="perf-faint">{t('변화 없음')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
