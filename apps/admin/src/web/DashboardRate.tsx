// 앱 대시보드의 칸 틀(판칸)과 통과율 칸 — 도넛 · 큰 숫자 · 세 줄 (DESIGN.md 「대시보드」)

import type { ReactNode } from 'react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { 도넛조각, 몫퍼센트, use올라가기, 안쪽고리길이, 증감, 통과율 } from './dashboardView.js';
import { use말 } from './i18n.js';

type 자료 = 대시보드응답;

export const 합 = (c: 자료['passRate']['current']): number => c.pass + c.fail + c.notRun;

/**
 * 판 하나(통과율 · 일별 · 히트맵 · 커버리지). 그래프는 `children` 으로 꽂는다 —
 * 칸 제목 · 판 모양 · 격자 자리는 여기가 맡고 안의 그림은 부르는 쪽이 맡는다
 */
export function 판칸({
  클래스,
  제목,
  보조,
  children,
}: {
  클래스: string;
  제목: string;
  보조?: string;
  children?: ReactNode;
}) {
  return (
    <section className={`dash-slab ${클래스}`}>
      <div className="dash-ttl">
        <h2>{제목}</h2>
        {보조 === undefined ? null : <span className="dash-axis">{보조}</span>}
      </div>
      {children}
    </section>
  );
}

export function 통과율칸({ 값, children }: { 값: 자료; children?: ReactNode }) {
  const t = use말();
  const { current, previous } = 값.passRate;
  const 전체 = 합(current);
  const 퍼센트 = 통과율(current);
  const 보임 = use올라가기(퍼센트 ?? 0);
  const 일 = 값.window.days;
  const 조각들 = 도넛조각(current);
  const 안쪽 = 안쪽고리길이(previous);
  const 앞통과율 = 통과율(previous);
  const 변화 = 증감(current, previous);

  const 변화글 =
    변화 !== null
      ? 변화.방향 === 'up'
        ? t('▲ {값}%p 직전 {일}일 대비', { 값: 변화.값, 일 })
        : 변화.방향 === 'down'
          ? t('▼ {값}%p 직전 {일}일 대비', { 값: 변화.값, 일 })
          : t('– 직전 {일}일과 같습니다', { 일 })
      : 합(previous) === 0
        ? t('직전 {일}일 실행 없음', { 일 })
        : t('최근 {일}일 실행 없음', { 일 });

  const 줄들 = [
    { 종류: 'p', 이름: t('통과'), 수: current.pass },
    { 종류: 'f', 이름: t('실패'), 수: current.fail },
    { 종류: 'n', 이름: t('미실행'), 수: current.notRun },
  ];

  return (
    <판칸 클래스="dash-rate" 제목={t('통과율')} 보조={t('최근 {일}일 판정 {수}건', { 일, 수: 전체 })}>
      <div className="dash-rate-body">
        <div className="dash-donut">
          <svg viewBox="0 0 220 220" aria-hidden="true" focusable="false">
            <g transform="rotate(-90 110 110)">
              <circle className="dash-track" cx="110" cy="110" r="100" />
              <g className="dash-ring">
                {/* 조각 셋을 늘 그린다 — 길이 0 인 조각이 나중에 생겨 새로 붙으면 그 조각만 다시 그려진다 */}
                {(['p', 'f', 'n'] as const).map((종류) => {
                  const 조각 = 조각들.find((것) => 것.종류 === 종류);
                  const 길이 = 조각?.길이 ?? 0;
                  return (
                    <circle
                      key={종류}
                      className={`dash-seg ${종류}`}
                      cx="110"
                      cy="110"
                      r="100"
                      pathLength={100}
                      strokeDasharray={`${길이} ${100 - 길이}`}
                      strokeDashoffset={-(조각?.시작 ?? 0)}
                    />
                  );
                })}
              </g>
              <circle className="dash-track thin" cx="110" cy="110" r="76" />
              {안쪽 === null ? null : (
                <circle
                  className="dash-ring-inner"
                  cx="110"
                  cy="110"
                  r="76"
                  pathLength={100}
                  strokeDasharray={`${안쪽} ${100 - 안쪽}`}
                />
              )}
            </g>
          </svg>
          <div className="dash-donut-center">
            <span className="dash-big num">
              {퍼센트 === null ? (
                '—'
              ) : (
                <>
                  {보임}
                  <span className="dash-pct">%</span>
                </>
              )}
            </span>
            <span className="dash-delta-line">{변화글}</span>
          </div>
        </div>
        <ul className="dash-lines">
          {줄들.map((줄) => {
            const 몫 = 몫퍼센트(줄.수, 전체);
            return (
              <li key={줄.종류}>
                <i className={`dash-sw ${줄.종류}`} aria-hidden="true" />
                <span>{줄.이름}</span>
                <b className="num">{줄.수}</b>
                <span className="dash-axis r">{몫 === null ? '—' : `${몫}%`}</span>
              </li>
            );
          })}
          <li className="dash-prev">
            <i className="dash-sw prev" aria-hidden="true" />
            <span>{t('직전 {일}일', { 일 })}</span>
            <b className="num">{앞통과율 === null ? '—' : `${앞통과율}%`}</b>
          </li>
        </ul>
        {값.unconfirmed > 0 ? <p className="dash-axis">{t('미확정 {수}건은 따로 셉니다', { 수: 값.unconfirmed })}</p> : null}
      </div>
      {children}
    </판칸>
  );
}
