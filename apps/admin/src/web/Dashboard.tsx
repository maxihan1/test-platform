// 앱 대시보드 화면 — 서비스를 가로지르는 테스트 결과 (도메인/리포팅 §8.12 · DESIGN.md 「대시보드」)

import { useEffect, useMemo, useRef, useState } from 'react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { api, ApiError } from './api.js';
import { 날짜글자 } from './dashboardView.js';
import { 서비스별표, 신규실패표, 실행중줄, 안내판 } from './DashboardTables.js';
import { 일별막대, 실패히트맵, 통과율선 } from './DashboardCharts.js';
import { 요구커버리지 } from './DashboardCoverage.js';
import { 통과율칸, 판칸, 합 } from './DashboardRate.js';
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

/**
 * 열 때 집계를 한 번 · 도는 실행이 있으면 15초마다 실행 중 줄만 · 줄에서 빠진 실행이 있으면 집계를 한 번 더.
 * **화면을 갈아엎지 않는다** — 다시 받아도 `loading` 으로 돌아가지 않아 칸이 새로 그려지지 않고 등장 움직임이 다시 안 돈다
 */
function use대시보드(시간대: string): 읽음 {
  const 언어 = use언어();
  const [읽음, set읽음] = useState<읽음>({ 종류: 'loading' });
  const 최근 = useRef<자료 | null>(null);
  const 살아있다 = useRef(true);
  // 집계를 다시 받다 실패하면 「실행이 끝났다」 신호가 사라진다. 도는 실행이 없으면 타이머도 꺼지므로 상태로 들어 타이머를 살려 둔다
  const 다시받아야함 = useRef(false);
  const [재시도, set재시도] = useState(false);
  // 집계는 무겁다. 서버가 느릴 때 15초마다 겹쳐 부르면 탭마다 부하를 보태고 늦게 온 옛 응답이 새것을 덮는다
  const 집계받는중 = useRef(false);

  useEffect(() => {
    살아있다.current = true;
    return () => {
      살아있다.current = false;
    };
  }, []);

  const 전체읽기 = (처음: boolean): void => {
    if (집계받는중.current) return;
    집계받는중.current = true;
    api
      .dashboard(시간대)
      .finally(() => {
        집계받는중.current = false;
      })
      .then((값) => {
        if (!살아있다.current) return;
        최근.current = 값;
        다시받아야함.current = false;
        set재시도(false);
        set읽음({ 종류: 'data', 값 });
      })
      .catch((err: unknown) => {
        if (!살아있다.current) return;
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
    전체읽기(true);
  }, [시간대]);

  const 도는중 = 읽음.종류 === 'data' && 읽음.값.running.length > 0;
  const 타이머필요 = 도는중 || 재시도;
  useEffect(() => {
    if (!타이머필요) return undefined;
    const 타이머 = setInterval(() => {
      if (다시받아야함.current) {
        전체읽기(false);
        return;
      }
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
  }, [타이머필요, 시간대]);

  return 읽음;
}

export function Dashboard({
  서비스열기,
  케이스갈수있나,
  작성서비스,
}: {
  서비스열기: (serviceId: number) => void;
  케이스갈수있나: boolean;
  작성서비스: { id: number; name: string }[];
}) {
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
            <안내판 케이스갈수있나={케이스갈수있나} />
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
                <요구커버리지 값={읽음.값} 서비스열기={서비스열기} 작성서비스={작성서비스} />
              </판칸>
            </div>
          )}
        </div>
      )}
    </>
  );
}
