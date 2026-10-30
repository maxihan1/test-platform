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
const 모름: Record<종류칸['kind'], string> = { SCREEN: '디바이스 정보 없음', APP: '기기 정보 없음', GAME: '창 정보 없음', API: '' };

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
                <tr key={줄.label}>
                  <td>
                    <span className="dash-meth mono">{method}</span> <span className="mono">{경로.join(' ')}</span>
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
          {칸.rows.map((줄) => {
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
    </section>
  );
}
