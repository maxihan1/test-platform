// 대시보드 「실패 히트맵」 — 실패가 많은 케이스 × 최근 창의 날 칸. 케이스는 서비스를 알 때 케이스 상세로 내려간다 (도메인/리포팅 §8.12)

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { 날짜줄, 범례, 창날들 } from './DashboardCharts.js';
import { 이동속성, type 이동재료 } from './DashboardPick.js';
import { use말, use언어 } from './i18n.js';
import { 케이스주소 } from './route.js';

type 자료 = 대시보드응답;

export function 실패히트맵({ 값, 이동 }: { 값: 자료; 이동?: 이동재료 }) {
  const t = use말();
  const 언어 = use언어();
  const 날들 = 창날들(값, 언어);
  const 비었다 = 값.heatmap.length === 0;
  // 케이스 목록은 고른 서비스 것만 보인다 — 어느 서비스 케이스인지 알 때만 누른다
  const 누를수있다 = !비었다 && 이동?.서비스번호 != null;
  const 줄들 = 비었다 ? [{ tcId: '', tcName: '', cells: 날들.map(() => 0 as const) }] : 값.heatmap;
  const 칸이름 = (실패: 0 | 1 | 2, 날짜: string): string =>
    실패 === 0
      ? t('{날짜} 실패 없음', { 날짜 })
      : 실패 === 1
        ? t('{날짜} 실패 1회', { 날짜 })
        : t('{날짜} 실패 2회 이상', { 날짜 });

  return (
    <>
      <범례
        항목들={[
          ['h0', '0'],
          ['h1', '1'],
          ['h2', t('2 이상')],
        ]}
      />
      <div className="dash-heat-scroll">
        <div
          role={누를수있다 ? 'group' : 'img'}
          className="dash-heat-grid"
          aria-label={
            비었다
              ? t('최근 {일}일 실패한 케이스가 없습니다', { 일: 값.window.days })
              : t('최근 {일}일 실패가 많은 케이스 {수}개의 날짜별 실패 횟수. 가장 많은 것은 {TC}', {
                  일: 값.window.days,
                  수: 값.heatmap.length,
                  TC: 값.heatmap[0]!.tcId,
                })
          }
        >
          {줄들.map((줄) => (
            <div key={줄.tcId} className="dash-heat-row">
              <span className="dash-heat-head">
                {!누를수있다 ? (
                  <>
                    <span className="mono">{줄.tcId}</span>
                    <span className="dash-heat-name" title={줄.tcName}>
                      {줄.tcName}
                    </span>
                  </>
                ) : (
                  <a className="dash-link dash-heat-link" href={케이스주소(줄.tcId)} title={줄.tcName} {...이동속성(이동)}>
                    <span className="mono">{줄.tcId}</span>
                    <span className="dash-heat-name">{줄.tcName}</span>
                  </a>
                )}
              </span>
              {줄.cells.map((실패, 칸) => (
                <i key={날들[칸]?.day ?? 칸} className={`h${실패}`} title={`${줄.tcId} ${칸이름(실패, 날들[칸]?.날짜 ?? '')}`.trim()} />
              ))}
            </div>
          ))}
          <날짜줄 클래스="dash-heat-days" 날들={날들} />
        </div>
      </div>
      {비었다 ? <p className="dash-calm">{t('최근 {일}일 실패한 케이스가 없습니다', { 일: 값.window.days })}</p> : null}
    </>
  );
}
