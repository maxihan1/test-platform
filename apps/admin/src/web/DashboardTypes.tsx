// 대시보드 「실패 유형」 칸 — 최근 창의 실패 · 미실행을 원인으로 나눠 건수와 몫을 보인다 (도메인/리포팅 §8.12 · DESIGN.md 「대시보드」)

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import type { 실패유형 } from '../reporting/failureType.js';

import { 실행목록주소, 이동속성, 창실패종류, type 이동재료 } from './DashboardPick.js';
import { 떠오름, 자람 } from './DashboardTop.js';
import { use말 } from './i18n.js';

type 자료 = 대시보드응답;

/** 유형 이름 글자의 정본 — 결과 화면의 유형 칩 · 칩 줄도 이것을 쓴다 (도메인/실행 §8.3 「실패 유형으로 묶는다」) */
export const 실패유형이름: Record<실패유형, string> = {
  mismatch: '기대 결과 불일치',
  notFound: '요소를 찾지 못함',
  timeout: '타임아웃',
  environment: '환경 오류',
  other: '그 밖',
};

const 설명: Record<실패유형, string> = {
  mismatch: '확인 문장의 기대 결과와 실제 값이 다름',
  notFound: '화면에서 버튼 · 입력 칸을 결국 찾지 못함',
  timeout: '제한 시간 안에 완료되지 않음',
  environment: '대상 서버 · 테스트 실행기에 닿지 못하거나 테스트 실행기가 거절함',
  other: '위 넷에 들지 않는 그 밖의 오류',
};

export function 실패유형칸({ 값, 이동 }: { 값: 자료; 이동?: 이동재료 }) {
  const t = use말();
  const { types, stopped } = 값.failureTypes;
  const 전체 = types.reduce((합, 유형) => 합 + 유형.fail + 유형.notRun, 0);
  // 막대는 가장 많은 유형을 꽉 채운다 — 전체로 나누면 유형 다섯이 다 짧아 비교가 안 보인다
  const 최대 = Math.max(1, ...types.map((유형) => 유형.fail + 유형.notRun));
  const 몫 = (수: number): string => `${(수 / 최대) * 100}%`;

  return (
    <section className="dash-panel dash-rise" style={떠오름(15)}>
      <div className="dash-h2">
        <h2>{t('실패 유형')}</h2>
        <span className="dash-lab dash-r">{t('최근 {일}일', { 일: 값.window.days })}</span>
      </div>

      {/* 멈춘 미실행뿐이면 「없습니다」를 띄우지 않는다 — 멈춘 수 한 줄만 둔다 */}
      {전체 === 0 ? (
        stopped > 0 ? null : <p className="dash-calm good">{t('최근 {일}일 실패 · 미실행이 없습니다', { 일: 값.window.days })}</p>
      ) : (
        <>
          <div className="dash-ft">
            {types.map((유형, i) => {
              const 수 = 유형.fail + 유형.notRun;
              const 나눔 = t('실패 {수}', { 수: 유형.fail }) + ' · ' + t('미실행 {수}', { 수: 유형.notRun });
              return (
                <div key={유형.type} className="dash-ftr" title={t(설명[유형.type])}>
                  <div className="hd">
                    {/* 유형으로 거르는 조건은 실행 기록에 없다 — 실패한 실행 목록으로 보낸다 */}
                    {수 === 0 ? (
                      <span>{t(실패유형이름[유형.type])}</span>
                    ) : (
                      <a className="dash-link" href={실행목록주소(값.window.days, { state: 'failed' }, 창실패종류(값, true))} {...이동속성(이동)}>
                        {t(실패유형이름[유형.type])}
                      </a>
                    )}
                    <span className="mono">{t('{수}건', { 수 })}</span>
                  </div>
                  {/* 판정 색 그대로 — 미실행을 실패 색으로 칠하면 러너 고장이 케이스 실패로 읽힌다 (리포팅 §8.5) */}
                  <span className="dash-stack dash-grow" style={자람(i + 2)} role="img" aria-label={나눔}>
                    <i className="f" style={{ width: 몫(유형.fail) }} />
                    <i className="n" style={{ width: 몫(유형.notRun) }} />
                  </span>
                </div>
              );
            })}
          </div>
          <div className="dash-legend">
            <span><i className="f" />{t('실패')}</span>
            <span><i className="n" />{t('미실행')}</span>
          </div>
        </>
      )}
      {stopped > 0 ? <p className="dash-lab">{t('실행이 중단되어 실행되지 못한 {수}건은 집계하지 않았습니다', { 수: stopped })}</p> : null}
    </section>
  );
}
