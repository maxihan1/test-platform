// 앱 대시보드 화면 — 서비스를 가로지르는 테스트 결과 (도메인/리포팅 §8.12 · DESIGN.md 「대시보드」)

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { api, ApiError } from './api.js';
import { 날짜글자, 도넛조각, 몫퍼센트, use올라가기, 안쪽고리길이, 증감, 통과율 } from './dashboardView.js';
import { 서비스별표, 신규실패표, 실행중줄, 안내판 } from './DashboardTables.js';
import { 일별막대, 실패히트맵, 통과율선 } from './DashboardCharts.js';
import { 요구커버리지 } from './DashboardCoverage.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { Loading, message } from './ui.js';

type 자료 = 대시보드응답;

/** 오류는 둘로 가른다 — 시간대 이름을 서버가 모르는 400(받은 값을 싣는다)과 그 밖 */
type 읽음 =
  | { 종류: 'loading' }
  | { 종류: 'error'; 틀린시간대: string | null; 글: string }
  | { 종류: 'data'; 값: 자료 };

/** 도는 실행 줄을 새로 받는 간격. 집계는 무거워 열 때와 실행이 끝났을 때만 받는다 (§8.12 「새로 고침」) */
const 새로고침간격 = 15_000;

const 합 = (c: 자료['passRate']['current']): number => c.pass + c.fail + c.notRun;

/**
 * 열 때 집계를 한 번 · 도는 실행이 있으면 15초마다 실행 중 줄만 · 줄에서 빠진 실행이 있으면 집계를 한 번 더.
 * **화면을 갈아엎지 않는다** — 다시 받아도 `loading` 으로 돌아가지 않아 칸이 새로 그려지지 않고 등장 움직임이 다시 안 돈다
 */
function use대시보드(시간대: string): 읽음 {
  const 언어 = use언어();
  const [읽음, set읽음] = useState<읽음>({ 종류: 'loading' });
  const 최근 = useRef<자료 | null>(null);
  const 살아있다 = useRef(true);

  useEffect(() => {
    살아있다.current = true;
    return () => {
      살아있다.current = false;
    };
  }, []);

  const 전체읽기 = (처음: boolean): void => {
    api
      .dashboard(시간대)
      .then((값) => {
        if (!살아있다.current) return;
        최근.current = 값;
        set읽음({ 종류: 'data', 값 });
      })
      .catch((err: unknown) => {
        if (!살아있다.current) return;
        if (!처음) {
          console.error('[dashboard] reloading the summary failed; keeping the previous values', err);
          return;
        }
        // 400 은 시간대 이름을 서버가 모를 때다. 서버가 받은 값을 detail 로 돌려준다 (도메인/리포팅 §8.12)
        const 틀림 = err instanceof ApiError && err.status === 400 && err.code === 'INVALID_REQUEST';
        set읽음({
          종류: 'error',
          틀린시간대: 틀림 ? (err.message === '' ? 시간대 : err.message) : null,
          글: message(err, 언어),
        });
      });
  };

  useEffect(() => {
    전체읽기(true);
  }, [시간대]);

  const 도는중 = 읽음.종류 === 'data' && 읽음.값.running.length > 0;
  useEffect(() => {
    if (!도는중) return undefined;
    const 타이머 = setInterval(() => {
      api
        .dashboard(시간대, 'running')
        .then(({ running }) => {
          const 앞 = 최근.current;
          if (!살아있다.current || 앞 === null) return;
          const 끝난것이있다 = 앞.running.some((전) => !running.some((지금) => 지금.runId === 전.runId));
          최근.current = { ...앞, running };
          set읽음({ 종류: 'data', 값: 최근.current });
          if (끝난것이있다) 전체읽기(false);
        })
        .catch((err: unknown) => {
          console.error('[dashboard] refreshing the running line failed; keeping the previous line', err);
        });
    }, 새로고침간격);
    return () => clearInterval(타이머);
  }, [도는중, 시간대]);

  return 읽음;
}

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

function 통과율칸({ 값, children }: { 값: 자료; children?: ReactNode }) {
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
            <span />
          </li>
        </ul>
        {값.unconfirmed > 0 ? <p className="dash-axis">{t('미확정 {수}건은 따로 셉니다', { 수: 값.unconfirmed })}</p> : null}
      </div>
      {children}
    </판칸>
  );
}

export function Dashboard() {
  const t = use말();
  const 시간대 = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const 읽음 = use대시보드(시간대);

  const 값 = 읽음.종류 === 'data' ? 읽음.값 : null;
  const 부제 =
    값 === null
      ? undefined
      : t('서비스 {수}개 · 최근 {일}일 · {날짜} 기준', {
          수: 값.services.length,
          일: 값.window.days,
          날짜: 날짜글자(값.window.today),
        });

  return (
    <>
      <Head 제목={t('품질 현황')} 부제={부제} />
      {읽음.종류 === 'loading' ? (
        <div className="screen">
          <Loading />
        </div>
      ) : 읽음.종류 === 'error' ? (
        <div className="screen">
          <div className="empty dash-error" role="alert">
            {읽음.틀린시간대 === null
              ? 읽음.글
              : t('이 브라우저의 시간대 「{시간대}」를 서버가 알아보지 못해 현황을 불러오지 못했습니다', {
                  시간대: 읽음.틀린시간대,
                })}
          </div>
        </div>
      ) : (
        <div className="dash">
          <실행중줄 목록={읽음.값.running} />
          {/* 한 번도 안 돈 서비스에 빈 칸 여섯을 늘어놓지 않는다. 미확정만 있어도 돈 것이다 */}
          {합(읽음.값.passRate.current) + 합(읽음.값.passRate.previous) === 0 && 읽음.값.unconfirmed === 0 ? (
            <안내판 />
          ) : (
            // 순서가 화면 읽기 순서다. 넓은 화면 배치는 CSS 격자가 자리로 옮긴다
            <div className="dash-board">
              <신규실패표 값={읽음.값} />
              <통과율칸 값={읽음.값}>
                <통과율선 값={읽음.값} />
              </통과율칸>
              <서비스별표 값={읽음.값} />
              <판칸 클래스="dash-daily" 제목={t('일별 테스트 결과')} 보조={t('막대 위 숫자는 실패 건수')}>
                <일별막대 값={읽음.값} />
              </판칸>
              <판칸 클래스="dash-heat" 제목={t('실패 히트맵')} 보조={t('최근 {일}일 실패가 많은 케이스', { 일: 읽음.값.window.days })}>
                <실패히트맵 값={읽음.값} />
              </판칸>
              <판칸 클래스="dash-cov" 제목={t('요구사항 커버리지')} 보조={t('마지막 작성 기준')}>
                <요구커버리지 값={읽음.값} />
              </판칸>
            </div>
          )}
        </div>
      )}
    </>
  );
}
