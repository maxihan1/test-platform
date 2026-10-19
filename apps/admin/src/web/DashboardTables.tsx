// 대시보드의 표 — 서비스별 품질 — 과 실행 중 줄 · 빈 안내. 표는 선으로만 가르고 판을 두르지 않는다 (DESIGN.md 원칙 2)

import type { 대시보드응답 } from '../reporting/dashboardResults.js';

import { 흐름글자, 짧은시각, 증감, 통과율 } from './dashboardView.js';
import { use말, use언어 } from './i18n.js';
import { 서비스를열며, 실행목록주소 } from './DashboardPick.js';
import { 아이콘 } from './icons.js';

type 자료 = 대시보드응답;

const 보이는실행수 = 2;
type 서비스줄 = 자료['byService'][number];

function 흐름라벨(흐름: 서비스줄['flow'], t: ReturnType<typeof use말>): string {
  const 셈 = { P: 0, F: 0, N: 0 };
  for (const 칸 of 흐름) 셈[칸] += 1;
  return [
    셈.P > 0 ? t('통과 {수}', { 수: 셈.P }) : '',
    셈.F > 0 ? t('실패 {수}', { 수: 셈.F }) : '',
    셈.N > 0 ? t('미실행 {수}', { 수: 셈.N }) : '',
  ]
    .filter((글) => 글 !== '')
    .join(' · ');
}

export function 서비스별표({ 값, 서비스열기 }: { 값: 자료; 서비스열기: (serviceId: number) => void }) {
  const t = use말();
  const 언어 = use언어();

  return (
    <section className="dash-flat dash-svc">
      <div className="dash-ttl">
        <h2>{t('애플리케이션별 품질')}</h2>
      </div>
      <div className="dash-scroll">
        <table className="dash-table">
          <thead>
            <tr>
              <th scope="col">{t('애플리케이션')}</th>
              <th scope="col" className="r">
                {t('통과율')}
              </th>
              <th scope="col" className="r">
                {t('직전 {일}일 대비', { 일: 값.window.days })}
              </th>
              <th scope="col">{t('최근 실행, 맨 앞이 최신')}</th>
              <th scope="col">{t('직전 실행과 견줌')}</th>
              <th scope="col" className="r">
                {t('마지막 실행')}
              </th>
            </tr>
          </thead>
          <tbody>
            {값.byService.map((서비스) => {
              const 이번 = 통과율(서비스.current);
              const 변화 = 증감(서비스.current, 서비스.previous);
              const 점 = 서비스.lastRun === null ? 'n' : 서비스.lastRun.fail > 0 ? 'f' : 'p';
              const 점글 =
                서비스.lastRun === null
                  ? t('마지막 실행이 없습니다')
                  : 서비스.lastRun.fail > 0
                    ? t('마지막 실행에 실패가 있습니다')
                    : t('마지막 실행에 실패가 없습니다');
              return (
                <tr key={서비스.serviceId}>
                  <td>
                    <span className="dash-name">
                      <i role="img" className={`dash-dot ${점}`} aria-label={점글} />
                      {/* 그 서비스의 실행 기록으로 간다. 목록은 고른 서비스 것만 보여 가기 전에 고른 서비스를 맞춘다 */}
                      <a className="dash-link" href={실행목록주소(값.window.days)} {...서비스를열며(서비스열기, 서비스.serviceId)}>
                        {서비스.serviceName}
                      </a>
                    </span>
                  </td>
                  <td className="r num dash-rate20">{이번 === null ? '—' : `${이번}%`}</td>
                  <td className="r dash-delta">
                    {변화 === null ? '—' : `${변화.방향 === 'up' ? '▲' : 변화.방향 === 'down' ? '▼' : '–'} ${변화.값}%p`}
                  </td>
                  <td>
                    {서비스.flow.length === 0 ? (
                      '—'
                    ) : (
                      <span className="spark dash-flow" role="img" aria-label={흐름라벨(서비스.flow, t)}>
                        {/* 서버는 오래된 것부터 준다. 막대는 케이스 목록 · 실패 카드처럼 맨 앞이 새 것이라 뒤집는다 (DESIGN 「최근 판정 흐름 막대」) */}
                        {[...서비스.flow].reverse().map((칸, 자리) => (
                          <i key={자리} className={흐름글자(칸)} />
                        ))}
                      </span>
                    )}
                  </td>
                  <td>
                    {서비스.newFailureCount > 0 ? (
                      <span className="dash-chip f">{t('신규 실패 {수}', { 수: 서비스.newFailureCount })}</span>
                    ) : null}
                    {서비스.resolvedCount > 0 ? (
                      <span className="dash-chip p">{t('해결 {수}', { 수: 서비스.resolvedCount })}</span>
                    ) : null}
                    {서비스.newFailureCount === 0 && 서비스.resolvedCount === 0 ? (
                      <span className="dash-chip">{서비스.compared ? t('변화 없음') : t('견줄 실행 없음')}</span>
                    ) : null}
                  </td>
                  <td className="r dash-when">
                    {서비스.lastRun === null ? '—' : 짧은시각(서비스.lastRun.finishedAt, 언어)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function 실행중줄({ 목록 }: { 목록: 자료['running'] }) {
  const t = use말();
  if (목록.length === 0) return null;
  const 더 = 목록.length - 보이는실행수;
  return (
    <div className="dash-live">
      <span className="dash-live-head">
        <span className="pulse" aria-hidden="true" />
        {t('실행 중 {수}건', { 수: 목록.length })}
      </span>
      {목록.slice(0, 보이는실행수).map((실행) => {
        const 통과 = Math.max(0, 실행.doneItems - 실행.failedItems);
        const 몫 = (수: number): string => `${실행.totalItems === 0 ? 0 : (수 / 실행.totalItems) * 100}%`;
        return (
          <a key={실행.runId} className="dash-live-item" href={`#/runs/${실행.runId}`}>
            <span className="dash-live-title">
              <span className="one-line">{실행.title}</span>
              <span className="mono">
                {실행.serviceName} · RUN {실행.runId}
              </span>
            </span>
            <span className="dash-live-count">
              <b className="num">{t('{끝난} / {전체}건', { 끝난: 실행.doneItems, 전체: 실행.totalItems })}</b>
              {실행.failedItems > 0 ? <span className="dash-live-fail">{t('실패 {수}', { 수: 실행.failedItems })}</span> : null}
            </span>
            <span className="dash-bar" aria-hidden="true">
              <i className="p" style={{ width: 몫(통과) }} />
              <i className="f" style={{ width: 몫(실행.failedItems) }} />
            </span>
          </a>
        );
      })}
      {/* 링크를 두지 않는다 — 실행 기록은 고른 서비스 것만 보여 다른 서비스의 도는 실행이 거기 없다 */}
      {더 > 0 ? <span className="dash-live-more">{t('외 {수}건', { 수: 더 })}</span> : null}
    </div>
  );
}

/**
 * 정기 실행을 켜는 설정 자리로 가는 링크 — 빈 안내판과 일별 칸의 안내 줄이 같이 쓴다.
 * 켜는 자리는 운영만 여는 설정이라 못 가는 사람에게는 부르는 쪽이 안 그린다 — 눌러도 이유만 보인다 (리포팅 §8.12 빈 상태)
 */
export function 정기실행켜는곳() {
  const t = use말();
  return (
    <a className="dash-sched" href="#/settings">
      {t('설정에서 정기 실행 켜기')}
    </a>
  );
}

export function 안내판({ 케이스갈수있나, 설정갈수있나 }: { 케이스갈수있나: boolean; 설정갈수있나: boolean }) {
  const t = use말();
  return (
    <section className="dash-slab dash-empty">
      <아이콘 이름="dashboard" />
      <h2>{t('아직 실행한 테스트가 없습니다')}</h2>
      <p>{t('테스트 스크립트를 실행하면 여기에 통과율 · 신규 실패 · 일별 결과가 쌓입니다')}</p>
      <p>
        {t('하루 한 번 정기 실행을 켜 두면 결과가 날마다 쌓여 추이가 보입니다')}
        {설정갈수있나 ? <정기실행켜는곳 /> : null}
      </p>
      {/* 케이스 자리가 없는 사람(실행 칸만 있는 사람)에게는 단추를 두지 않는다 — 눌러도 `갈자리` 가 곧바로 되돌린다 */}
      {케이스갈수있나 ? (
        <a className="btn" href="#/cases">
          {t('케이스 보기')}
        </a>
      ) : null}
    </section>
  );
}
