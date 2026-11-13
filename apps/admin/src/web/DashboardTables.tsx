// 대시보드의 실행 중 줄과 빈 안내 한 장 (도메인/리포팅 §8.12)

import type { 대시보드응답 } from '../reporting/dashboardResults.js';

import { use말 } from './i18n.js';
import { 아이콘 } from './icons.js';

type 자료 = 대시보드응답;

const 보이는실행수 = 2;

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
            <span className="dash-stack" aria-hidden="true">
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
 * 정기 실행 메뉴로 가는 링크. 세트는 실행 write 가 만들어 못 만드는 사람에게는 부르는 쪽이 안 그린다 (리포팅 §8.12 빈 상태 · 도메인/정기실행 §8.20)
 */
export function 정기실행켜는곳() {
  const t = use말();
  return (
    <a className="dash-sched" href="#/sched">
      {t('정기 실행 세트 만들기')}
    </a>
  );
}

export function 안내판({ 케이스갈수있나, 세트만들수있나 }: { 케이스갈수있나: boolean; 세트만들수있나: boolean }) {
  const t = use말();
  return (
    <section className="dash-panel dash-empty">
      <아이콘 이름="dashboard" />
      <h2>{t('아직 테스트가 없습니다')}</h2>
      <p>{t('기획서로 테스트를 작성하고 실행하면 여기에 요구사항 추적 · 실행 결과 · 성능이 쌓입니다')}</p>
      <p>
        {t('하루 한 번 정기 실행을 켜 두면 결과가 날마다 쌓여 추이가 보입니다')}
        {세트만들수있나 ? <정기실행켜는곳 /> : null}
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
