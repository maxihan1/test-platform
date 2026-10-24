// 대시보드 「실패 유형」 칸 — 최근 창의 실패 · 미실행을 원인으로 나눠 건수와 몫을 보인다 (도메인/리포팅 §8.12 · DESIGN.md 「대시보드」)

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import type { 실패유형 } from '../reporting/failureType.js';

import { 실행목록주소, 이동속성, 창실패종류, type 이동재료 } from './DashboardPick.js';
import { use말 } from './i18n.js';

type 자료 = 대시보드응답;

/** 유형 이름 글자의 정본 — 결과 화면의 유형 칩 · 칩 줄도 이것을 쓴다 (도메인/실행 §8.3 「실패 유형으로 묶는다」) */
export const 실패유형이름: Record<실패유형, string> = {
  mismatch: '기대 결과 불일치',
  notFound: '요소 미검출',
  timeout: '타임아웃',
  environment: '환경 오류',
  other: '그 밖',
};

const 설명: Record<실패유형, string> = {
  mismatch: '확인 문장의 기대값과 실제 값이 다름',
  notFound: '화면에서 버튼 · 입력 칸을 끝내 찾지 못함',
  timeout: '제한 시간 안에 끝나지 않음',
  environment: '대상 서버 · 테스트 실행기에 닿지 못하거나 테스트 실행기가 거절함',
  other: '위 넷에 들지 않는 그 밖의 오류',
};

export function 실패유형칸({ 값, 이동 }: { 값: 자료; 이동?: 이동재료 }) {
  const t = use말();
  const { types, stopped } = 값.failureTypes;
  const 전체 = types.reduce((합, 유형) => 합 + 유형.fail + 유형.notRun, 0);
  const 몫 = (수: number): string => `${전체 === 0 ? 0 : (수 / 전체) * 100}%`;

  return (
    <section className="dash-flat dash-types">
      <div className="dash-ttl">
        <h2>
          {t('실패 유형')} <b className="num">{t('{수}건', { 수: 전체 })}</b>
        </h2>
        <span className="dash-axis">{t('최근 {일}일 실패 · 미실행의 원인', { 일: 값.window.days })}</span>
      </div>

      {/* 멈춘 미실행뿐이면 「없습니다」를 띄우지 않는다 — 통과율 칸에는 그 미실행이 보인다 */}
      {전체 === 0 ? (
        stopped > 0 ? null : (
          <p className="dash-calm good">
            <span aria-hidden="true">✓</span>
            <span>{t('최근 {일}일 실패 · 미실행이 없습니다', { 일: 값.window.days })}</span>
          </p>
        )
      ) : (
        <>
          {/* 판정 색 그대로 — 미실행을 실패 색으로 칠하면 러너 고장이 케이스 실패로 읽힌다 (리포팅 §8.5) */}
          <ul className="dash-key">
            <li>
              <i className="dash-sw f" aria-hidden="true" />
              {t('실패')}
            </li>
            <li>
              <i className="dash-sw n" aria-hidden="true" />
              {t('미실행')}
            </li>
          </ul>
          <ul className="dash-types-list">
            {types.map((유형) => {
              const 수 = 유형.fail + 유형.notRun;
              const 나눔 = t('실패 {수}', { 수: 유형.fail }) + ' · ' + t('미실행 {수}', { 수: 유형.notRun });
              return (
                <li key={유형.type}>
                  <span className="dash-types-head">
                    {/* 유형으로 거르는 조건은 실행 기록에 없다 — 실패한 실행 목록으로 보낸다 */}
                    {수 === 0 ? (
                      <span>{t(실패유형이름[유형.type])}</span>
                    ) : (
                      <a className="dash-link" href={실행목록주소(값.window.days, { state: 'failed' }, 창실패종류(값, true))} {...이동속성(이동)}>
                        {t(실패유형이름[유형.type])}
                      </a>
                    )}
                    <span>
                      <b className="num">{수}</b> <span className="dash-axis">{Math.round((수 / 전체) * 100)}%</span>
                    </span>
                  </span>
                  <span className="dash-bar" role="img" aria-label={나눔}>
                    <i className="f" style={{ width: 몫(유형.fail) }} />
                    <i className="n" style={{ width: 몫(유형.notRun) }} />
                  </span>
                  <span className="dash-types-note">{수 === 0 ? t(설명[유형.type]) : 나눔 + ' — ' + t(설명[유형.type])}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {stopped > 0 ? (
        <p className="dash-types-foot">{t('실행이 멈춰 돌지 못한 {수}건은 세지 않았습니다', { 수: stopped })}</p>
      ) : null}
    </section>
  );
}
