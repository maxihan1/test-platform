// 앱 대시보드 화면 — 서비스를 가로지르는 테스트 결과 (도메인/리포팅 §8.12 · DESIGN.md 「대시보드」)

import { useEffect, useMemo, useRef, useState } from 'react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { api, ApiError } from './api.js';
import { 날짜글자 } from './dashboardView.js';
import { 앱카드들 } from './DashboardApps.js';
import { E2E칸, 결정칸 } from './DashboardE2E.js';
import { 신규실패표 } from './DashboardFail.js';
import { 성능칸 } from './DashboardPerf.js';
import { 고르개, 조건을요청으로, 조건을주소로, 주소에서조건, type 대시보드조건, type 이동재료 } from './DashboardPick.js';
import { 실행중줄, 안내판 } from './DashboardTables.js';
import { 다섯칸 } from './DashboardTop.js';
import { 추적칸, 케이스칸 } from './DashboardTrace.js';
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
 * 프로젝트 · 기간을 바꾸면 다른 자료라 `loading` 부터 다시 받는다
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
  const 조건키 = `${프로젝트 ?? ''}:${조건.일}`;

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
  프로젝트,
}: {
  서비스열기: (serviceId: number) => void;
  케이스갈수있나: boolean;
  /** 정기 실행을 켜는 설정 자리에 갈 수 있나 — 안내 줄에 링크를 단다 (리포팅 §8.12 빈 상태) */
  설정갈수있나: boolean;
  /** 고른 프로젝트 번호. 대시보드는 그 프로젝트 안 애플리케이션 전부를 센다 (리포팅 §8.12 「프로젝트 요약」) */
  프로젝트: number | null;
}) {
  const t = use말();
  const 시간대 = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [조건, set조건] = useState(주소에서조건);
  // 기본값(14일)은 주소에 적지 않는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  use주소조건('#/dashboard', 조건을주소로(조건));
  const 읽음 = use대시보드(시간대, 조건, 프로젝트);
  // 칸이 다른 화면으로 갈 때 맞출 서비스. 대시보드는 프로젝트 요약이라 서비스 하나로 못 정하면 아무것도 안 바꾼다
  const 이동: 이동재료 = {
    서비스번호: 읽음.종류 === 'data' && 읽음.값.services.length === 1 ? (읽음.값.services[0]?.id ?? null) : null,
    서비스열기,
  };
  const 부제 =
    읽음.종류 !== 'data'
      ? undefined
      : t('애플리케이션 {수}개 · 최근 {일}일 · {날짜} 기준', {
          수: 읽음.값.project.apps.length,
          일: 읽음.값.window.days,
          날짜: 날짜글자(읽음.값.window.today),
        });

  return (
    <>
      <Head 제목={t('대시보드')} 부제={부제} 행동={<고르개 조건={조건} on바뀜={set조건} />} />
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
        <대시보드판 값={읽음.값} 이동={이동} 케이스갈수있나={케이스갈수있나} 설정갈수있나={설정갈수있나} />
      )}
    </>
  );
}

function 대시보드판({ 값, 이동, 케이스갈수있나, 설정갈수있나 }: { 값: 자료; 이동: 이동재료; 케이스갈수있나: boolean; 설정갈수있나: boolean }) {
  const { project } = 값;
  // 케이스 · PRD · 시나리오 · 성능 측정 · 결정할 것이 하나도 없는 프로젝트에 빈 칸 여럿을 늘어놓지 않는다 — PRD 초안만 있어도 결정 필요가 다음 할 일이라 칸을 보인다
  const { perf } = project;
  const 빈것 =
    project.apps.every((a) => a.cases.fn + a.cases.ui === 0 && (a.prd?.requirements ?? 0) === 0) &&
    project.e2e.total === 0 &&
    [perf.load, perf.pages, perf.app, perf.game].every((x) => x === null) &&
    project.decisionItems.length === 0;
  return (
    <div className="dash">
      <실행중줄 목록={값.running} />
      {빈것 ? (
        <안내판 케이스갈수있나={케이스갈수있나} 설정갈수있나={설정갈수있나} />
      ) : (
        <>
          <다섯칸 요약={project} />
          <div className="dash-two">
            <추적칸 요약={project} />
            <케이스칸 요약={project} />
          </div>
          <앱카드들 값={값} 서비스열기={이동.서비스열기} />
          <E2E칸 값={값} />
          <성능칸 성능={project.perf} 종류들={new Set(project.apps.map((a) => a.kind))} 실패유형={<실패유형칸 값={값} 이동={이동} />} />
          <div className="dash-two">
            <신규실패표 값={값} 이동={이동} />
            <결정칸 값={값} 서비스열기={이동.서비스열기} />
          </div>
        </>
      )}
    </div>
  );
}
