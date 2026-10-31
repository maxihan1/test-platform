// 앱 대시보드 화면 — 서비스를 가로지르는 테스트 결과 (도메인/리포팅 §8.12 · DESIGN.md 「대시보드」)

import { useEffect, useMemo, useRef, useState } from 'react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { api, ApiError, type 앱종류 } from './api.js';
import { 날짜글자 } from './dashboardView.js';
import { 고르개, 조건을요청으로, 조건을주소로, 주소에서조건, type 대시보드조건, type 이동재료 } from './DashboardPick.js';
import { 신규실패표 } from './DashboardFail.js';
import { 서비스별표, 실행중줄, 안내판 } from './DashboardTables.js';
import { 일별막대, 통과율선 } from './DashboardCharts.js';
import { 실패히트맵 } from './DashboardHeat.js';
import { 요구커버리지 } from './DashboardCoverage.js';
import { 종류칸 } from './DashboardKind.js';
import { AI품질줄, 검토할것 } from './DashboardReview.js';
import { 통과율칸, 판칸, 합 } from './DashboardRate.js';
import { 실패유형칸 } from './DashboardTypes.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { use주소조건 } from './leaveGuard.js';
import { Loading, message } from './ui.js';

type 자료 = 대시보드응답;

/** 오류는 둘로 가른다 — 시간대 이름을 서버가 모르는 400(받은 값을 싣는다)과 그 밖 */
type 읽음 =
  | { 종류: 'loading' }
  | { 종류: 'error'; 틀린시간대: string | null; 글: string }
  | { 종류: 'data'; 값: 자료 };

/** 도는 실행 줄을 새로 받는 간격. 집계는 무거워 열 때와 실행이 끝났을 때만 받는다 (§8.12 「새로 고침」) */
const 새로고침간격 = 15_000;

/**
 * 열 때 집계를 한 번 · 도는 실행이 있으면 15초마다 실행 중 줄만 · 줄에서 빠진 실행이 있으면 집계를 한 번 더.
 * **화면을 갈아엎지 않는다** — 다시 받아도 `loading` 으로 돌아가지 않아 칸이 새로 그려지지 않고 등장 움직임이 다시 안 돈다.
 * 프로젝트 · 서비스 · 기간을 바꾸면 다른 자료라 `loading` 부터 다시 받는다
 */
function use대시보드(시간대: string, 조건: 대시보드조건, 프로젝트: number | null): 읽음 {
  const 언어 = use언어();
  const [읽음, set읽음] = useState<읽음>({ 종류: 'loading' });
  const 최근 = useRef<자료 | null>(null);
  const 살아있다 = useRef(true);
  // 집계를 다시 받다 실패하면 「실행이 끝났다」 신호가 사라진다. 도는 실행이 없으면 타이머도 꺼지므로 상태로 들어 타이머를 살려 둔다
  const 다시받아야함 = useRef(false);
  const [재시도, set재시도] = useState(false);
  // 집계는 무겁다. 서버가 느릴 때 15초마다 겹쳐 부르면 탭마다 부하를 보태고 늦게 온 옛 응답이 새것을 덮는다
  const 집계받는중 = useRef(false);
  // 조건을 바꾸면 옛 조건의 응답이 늦게 와 새 응답을 덮을 수 있다. 가장 나중에 보낸 요청의 응답만 받는다
  const 요청번호 = useRef(0);
  const 요청조건 = { ...조건을요청으로(조건), ...(프로젝트 === null ? {} : { project: 프로젝트 }) };
  const 조건키 = `${프로젝트 ?? ''}:${조건.서비스 ?? ''}:${조건.일}`;

  useEffect(() => {
    살아있다.current = true;
    return () => {
      살아있다.current = false;
    };
  }, []);

  const 전체읽기 = (처음: boolean): void => {
    if (!처음 && 집계받는중.current) return;
    집계받는중.current = true;
    const 내번호 = (요청번호.current += 1);
    api
      .dashboard(시간대, undefined, 요청조건)
      .finally(() => {
        if (내번호 === 요청번호.current) 집계받는중.current = false;
      })
      .then((값) => {
        if (!살아있다.current || 내번호 !== 요청번호.current) return;
        최근.current = 값;
        다시받아야함.current = false;
        set재시도(false);
        set읽음({ 종류: 'data', 값 });
      })
      .catch((err: unknown) => {
        if (!살아있다.current || 내번호 !== 요청번호.current) return;
        if (!처음) {
          console.error('[dashboard] reloading the summary failed; keeping the previous values and retrying on the next tick', err);
          다시받아야함.current = true;
          set재시도(true);
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
    최근.current = null;
    다시받아야함.current = false;
    set재시도(false);
    set읽음({ 종류: 'loading' });
    전체읽기(true);
  }, [시간대, 조건키]);

  const 도는중 = 읽음.종류 === 'data' && 읽음.값.running.length > 0;
  const 타이머필요 = 도는중 || 재시도;
  useEffect(() => {
    if (!타이머필요) return undefined;
    const 타이머 = setInterval(() => {
      if (다시받아야함.current) {
        전체읽기(false);
        return;
      }
      const 보낸번호 = 요청번호.current;
      api
        .dashboard(시간대, 'running', 요청조건)
        .then(({ running }) => {
          const 앞 = 최근.current;
          if (!살아있다.current || 앞 === null || 보낸번호 !== 요청번호.current) return;
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
  }, [타이머필요, 시간대, 조건키]);

  return 읽음;
}

export function Dashboard({
  서비스열기,
  케이스갈수있나,
  설정갈수있나,
  작성서비스,
  프로젝트,
  열린서비스 = null,
}: {
  서비스열기: (serviceId: number) => void;
  케이스갈수있나: boolean;
  /** 정기 실행을 켜는 설정 자리에 갈 수 있나 — 안내 줄에 링크를 단다 (리포팅 §8.12 빈 상태) */
  설정갈수있나: boolean;
  작성서비스: { id: number; name: string; kind?: 앱종류 }[];
  /** 헤더에서 고른 프로젝트 번호. 그 안의 애플리케이션만 모은다 (리포팅 §8.12) */
  프로젝트: number | null;
  /** 왼쪽 애플리케이션 줄에서 고른 애플리케이션 번호. 대시보드는 이것으로 열리고 따라간다 (2026-10-31 시험 d4) */
  열린서비스?: number | null;
}) {
  const t = use말();
  const 시간대 = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [조건, set조건] = useState(주소에서조건(열린서비스));
  // 기본값(전체 서비스 · 14일)은 주소에 적지 않는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  // 프로젝트를 바꾸면 고른 애플리케이션은 다른 프로젝트 것이라 비운다. 그리는 중에 맞춰야 옛 번호로 한 번 더 받지 않는다
  const [앞프로젝트, set앞프로젝트] = useState(프로젝트);
  // 서비스 고르개의 재료는 서버가 준 「그 프로젝트 안에서 볼 수 있는 서비스 전부」다(고른 서비스로는 안 좁힌다). 읽는 동안에는 앞에서 받은 목록을 쓴다
  const 앞서비스들 = useRef<자료['services']>([]);
  // 왼쪽 줄에서 애플리케이션을 바꾸면 대시보드도 그것을 본다. 고르개에서 「전체」를 골라 둔 것은 왼쪽 줄이 안 바뀌는 한 그대로다
  const [앞열린, set앞열린] = useState(열린서비스);
  // 칸의 고리(가운데 단추로 새 탭에 여는 것 포함)가 바꾼 왼쪽 줄은 따라가지 않는다 — 따라가면 「전체」를 보던 이 탭이 그 애플리케이션으로 좁혀졌다
  const 고리로연 = useRef<number | null>(null);
  const 고리로열기 = (번호: number): void => {
    고리로연.current = 번호;
    서비스열기(번호);
  };
  if (앞프로젝트 !== 프로젝트 || 앞열린 !== 열린서비스) {
    set앞열린(열린서비스);
    const 고리것 = 고리로연.current !== null && 고리로연.current === 열린서비스 && 앞프로젝트 === 프로젝트;
    고리로연.current = null;
    if (!고리것) set조건((앞) => (앞.서비스 === 열린서비스 ? 앞 : { ...앞, 서비스: 열린서비스 }));
    if (앞프로젝트 !== 프로젝트) {
      set앞프로젝트(프로젝트);
      // 앞 프로젝트의 목록을 남기면 읽는 동안 고르개에 다른 프로젝트 서비스가 떠서 고를 수 있다
      앞서비스들.current = [];
    }
  }
  use주소조건('#/dashboard', 조건을주소로(조건, 열린서비스));
  // 고르개에서 애플리케이션 하나를 고르면 왼쪽 줄도 그것으로 바꾼다 — 둘이 다르면 사이드바는 웹인데 대시보드는 앱인 화면이 됐다
  const 고름 = (새: 대시보드조건): void => {
    set조건(새);
    if (새.서비스 !== null && 새.서비스 !== 조건.서비스) 서비스열기(새.서비스);
  };
  // 주소가 왼쪽 줄과 다른 애플리케이션을 들고 왔으면(즐겨찾기 · 공유 주소) 왼쪽 줄을 그리로 맞춘다
  useEffect(() => {
    if (조건.서비스 !== null && 조건.서비스 !== 열린서비스) 서비스열기(조건.서비스);
  }, []);
  const 읽음 = use대시보드(시간대, 조건, 프로젝트);

  const 값 = 읽음.종류 === 'data' ? 읽음.값 : null;
  if (값 !== null) 앞서비스들.current = 값.services;
  const 서비스들 = 값 === null ? 앞서비스들.current : 값.services;
  useEffect(() => {
    // 주소의 서비스가 볼 수 있는 목록에 없으면(권한이 없거나 지워진 번호) 전체로 돌린다 — 빈 현황이 「데이터 없음」으로 읽히지 않게
    if (값 !== null && 조건.서비스 !== null && !값.services.some((서비스) => 서비스.id === 조건.서비스)) {
      set조건((앞) => ({ ...앞, 서비스: null }));
    }
  }, [값?.services]);
  // 칸이 다른 화면으로 갈 때 맞출 서비스. 서비스를 고르지 않았어도 볼 수 있는 서비스가 하나뿐이면 그것이다
  const 이동: 이동재료 = {
    서비스번호: 조건.서비스 ?? (서비스들.length === 1 ? (서비스들[0]?.id ?? null) : null),
    서비스열기: 고리로열기,
  };
  const 고른서비스 = 조건.서비스 === null ? undefined : 서비스들.find((서비스) => 서비스.id === 조건.서비스);
  const 부제 =
    값 === null
      ? undefined
      : 고른서비스 === undefined
        ? t('애플리케이션 {수}개 · 최근 {일}일 · {날짜} 기준', {
            수: 값.services.length,
            일: 값.window.days,
            날짜: 날짜글자(값.window.today),
          })
        : t('{이름} · 최근 {일}일 · {날짜} 기준', {
            이름: 고른서비스.name,
            일: 값.window.days,
            날짜: 날짜글자(값.window.today),
          });

  return (
    <>
      <Head 제목={t('대시보드')} 부제={부제} 행동={<고르개 조건={조건} 서비스들={서비스들} on바뀜={고름} />} />
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
          <검토할것 값={읽음.값} 이동={이동} 서비스열기={고리로열기} />
          <AI품질줄 값={읽음.값.aiQuality} />
          {/* 한 번도 안 돈 서비스에 빈 칸 여섯을 늘어놓지 않는다. 미확정도 통과율 숫자에 들어 있다 */}
          {합(읽음.값.passRate.current) + 합(읽음.값.passRate.previous) === 0 ? (
            <안내판 케이스갈수있나={케이스갈수있나} 설정갈수있나={설정갈수있나} />
          ) : (
            // 순서가 화면 읽기 순서다. 넓은 화면 배치는 CSS 격자가 자리로 옮긴다
            <div className={읽음.값.byKind === null ? 'dash-board' : 'dash-board has-kind'}>
              {/* 위 두 칸은 왼쪽 · 오른쪽 기둥이 따로 쌓인다 — 한 격자 줄에 두면 짧은 쪽(회귀 0건)이 긴 쪽 높이만큼 비었다 (2026-10-31 시험 d6) */}
              <div className="dash-top">
                <div className="dash-col">
                  <신규실패표 값={읽음.값} 이동={이동} />
                  <서비스별표 값={읽음.값} 서비스열기={고리로열기} />
                </div>
                <div className="dash-col">
                  <통과율칸 값={읽음.값}>
                    <통과율선 값={읽음.값} />
                  </통과율칸>
                  {읽음.값.byKind === null ? null : <종류칸 칸={읽음.값.byKind} 일={읽음.값.window.days} />}
                </div>
              </div>
              <판칸 클래스="dash-daily" 제목={t('일별 테스트 결과')} 보조={t('막대 위 숫자는 실패 건수')}>
                <일별막대 값={읽음.값} 설정갈수있나={설정갈수있나} 이동={이동} />
              </판칸>
              <판칸 클래스="dash-heat" 제목={t('실패 히트맵')} 보조={t('최근 {일}일 실패가 많은 케이스', { 일: 읽음.값.window.days })}>
                <실패히트맵 값={읽음.값} 이동={이동} />
              </판칸>
              <실패유형칸 값={읽음.값} 이동={이동} />
              <판칸 클래스="dash-cov" 제목={t('요구사항 커버리지')} 보조={t('마지막 작성 기준')}>
                <요구커버리지
                  값={읽음.값}
                  서비스열기={고리로열기}
                  작성서비스={조건.서비스 === null ? 작성서비스 : 작성서비스.filter((서비스) => 서비스.id === 조건.서비스)}
                />
              </판칸>
            </div>
          )}
        </div>
      )}
    </>
  );
}
