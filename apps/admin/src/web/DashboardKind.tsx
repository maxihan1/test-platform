// 대시보드 종류별 칸 — 애플리케이션 하나를 골랐을 때 브라우저 · 기기 · 창 · 엔드포인트마다 결과 (도메인/리포팅 §8.12 「종류별 칸」 · DESIGN.md 「대시보드」)

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { use말 } from './i18n.js';

type 종류칸 = NonNullable<대시보드응답['byKind']>;

const 제목: Record<종류칸['kind'], string> = {
  SCREEN: '브라우저별 결과',
  APP: '기기별 결과',
  GAME: '창별 결과',
  API: '엔드포인트별 결과',
};

// 러너 브라우저가 Chromium 하나라 디바이스 이름 뒤에 붙인다
const 웹이름: Record<string, string> = { desktop: 'PC · Chromium', mobile: '모바일 · Chromium' };
const 모름: Record<종류칸['kind'], string> = { SCREEN: '디바이스 정보 없음', APP: '기기 정보 없음', GAME: '창 정보 없음', API: '엔드포인트 정보 없음' };
// 막대 칸에서는 단위를 모르는 줄을 막대로 안 세우고 칸 아래 한 줄로 센다 — 실제 기기 · 창과 같은 막대로 서면 「기기 정보 없음 0%」가 기기 하나처럼 읽혔다 (2026-10-31 시험 f14)
const 모름줄: Record<Exclude<종류칸['kind'], 'API'>, string> = {
  SCREEN: '디바이스 정보 없는 결과 {건}건',
  APP: '기기 정보 없는 결과 {건}건',
  GAME: '창 정보 없는 결과 {건}건',
};

const 전체 = (줄: 종류칸['rows'][number]) => 줄.pass + 줄.fail + 줄.notRun;

/** 95% 응답 글자 — 1초부터는 초로 줄인다 */
export function 응답시간(ms: number | null): string {
  if (ms === null) return '—';
  return ms < 1000 ? `${String(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function 종류칸({ 칸, 일 }: { 칸: 종류칸; 일: number }) {
  const t = use말();
  const 이름 = (label: string | null): string =>
    label === null ? t(모름[칸.kind]) : 칸.kind === 'SCREEN' ? t(웹이름[label] ?? label) : label;
  // 칸 아래 한 줄 — 셀 것이 없으면 안 띄운다 (§8.12 「종류별 칸」)
  const 모바일 = 칸.onlyFail.find((x) => x.label === 'mobile');
  const 아래줄 =
    칸.fps !== null
      ? t('게임 성능 측정 {회}회 · 평균 FPS {평균} · {선} 아래로 떨어짐 {번}회', {
          회: 칸.fps.runs,
          평균: 칸.fps.avg,
          선: 칸.fps.below,
          번: 칸.fps.drops,
        })
      : 칸.kind === 'SCREEN'
        ? 모바일 === undefined
          ? null
          : t('모바일에서만 실패한 케이스 {건}건', { 건: 모바일.count })
        : 칸.onlyFail.length === 0
          ? null
          : 칸.onlyFail.map((x) => t('{기기} 에서만 실패한 케이스 {건}건', { 기기: x.label, 건: x.count })).join(', ');

  const 막대줄 = 칸.rows.filter((줄) => 줄.label !== null);
  const 모른줄 = 칸.kind === 'API' ? undefined : 칸.rows.find((줄) => 줄.label === null);

  return (
    <section className="dash-flat dash-kind">
      <div className="dash-ttl">
        <h2>{t(제목[칸.kind])}</h2>
        <span className="dash-axis">{t('최근 {일}일', { 일 })}</span>
      </div>
      {칸.rows.length === 0 ? (
        <p className="dash-calm">{t('최근 {일}일 결과가 없습니다', { 일 })}</p>
      ) : 칸.kind === 'API' ? (
        <table className="dash-table">
          <thead>
            <tr>
              <th>{t('엔드포인트')}</th>
              <th className="r">{t('95% 응답')}</th>
              <th className="r">{t('통과')}</th>
            </tr>
          </thead>
          <tbody>
            {칸.rows.map((줄) => {
              const [method, ...경로] = (줄.label ?? '').split(' ');
              return (
                <tr key={줄.label ?? ''}>
                  <td>
                    {줄.label === null ? (
                      이름(null)
                    ) : (
                      <>
                        <span className="dash-meth mono">{method}</span> <span className="mono">{경로.join(' ')}</span>
                      </>
                    )}
                  </td>
                  <td className="r num">{응답시간(줄.p95Ms)}</td>
                  <td className="r num">
                    {줄.pass}/{전체(줄)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <ul className="dash-kind-list">
          {막대줄.map((줄) => {
            const 퍼센트 = Math.round((줄.pass / 전체(줄)) * 100);
            return (
              <li key={줄.label ?? ''}>
                <span className="one-line">{이름(줄.label)}</span>
                <span className="dash-kind-bar" aria-hidden="true">
                  <i className={퍼센트 < 80 ? 'lo' : undefined} style={{ width: `${String(퍼센트)}%` }} />
                </span>
                <b className="num">{퍼센트}%</b>
              </li>
            );
          })}
        </ul>
      )}
      {모른줄 === undefined || 칸.kind === 'API' ? null : (
        <p className="dash-calm dash-kind-note">{t(모름줄[칸.kind], { 건: 전체(모른줄) })}</p>
      )}
      {아래줄 === null ? null : <p className="dash-calm dash-kind-note">{아래줄}</p>}
    </section>
  );
}
