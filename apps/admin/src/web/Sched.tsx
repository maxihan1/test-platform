// 정기 실행 화면 — 왼쪽 세트 카드 · 오른쪽 월 · 주 · 일 달력. 프로젝트 공통이다 (도메인/정기실행 §8.20 · 시안 B)

import { useMemo, useState } from 'react';

import type { ServiceRow } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { schedApi, type 세트 } from './schedApi.js';
import { 기간, 달력, 칸창, type 보기 } from './SchedCalendar.js';
import { 세트카드들 } from './SchedCards.js';
import { 날더하기, 시간대로, 실행주소, 주시작, 칩들, type 칩 } from './schedView.js';
import { Failed, Loading, useAsync } from './ui.js';

const 보기키 = 'sched-view';

/** 브라우저가 마지막에 고른 보기 (§3.16 결정 12). 저장소가 막힌 창에서도 월로 열린다 */
function 처음보기(): 보기 {
  try {
    const 값 = localStorage.getItem(보기키);
    return 값 === 'week' || 값 === 'day' ? 값 : 'month';
  } catch {
    return 'month';
  }
}

const 브라우저시간대 = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

function 제목글(보기: 보기, 기준: string, 언어: string): string {
  const 날 = new Date(`${기준}T00:00:00Z`);
  if (보기 === 'month') return new Intl.DateTimeFormat(언어, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(날);
  const 짧게 = new Intl.DateTimeFormat(언어, { month: 'long', day: 'numeric', timeZone: 'UTC' });
  if (보기 === 'week') return [주시작(기준), 날더하기(주시작(기준), 6)].map((날) => 짧게.format(new Date(날 + 'T00:00:00Z'))).join(' ~ ');
  return new Intl.DateTimeFormat(언어, { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(날);
}

/** 한 칸 앞뒤 — 월은 그달 1일로 옮겨 31일이 없는 달을 건너뛰지 않게 한다 */
function 옮기기(보기: 보기, 기준: string, 쪽: 1 | -1): string {
  if (보기 === 'month') {
    const [해, 달] = 기준.split('-').map(Number) as [number, number];
    const 새 = new Date(Date.UTC(해, 달 - 1 + 쪽, 1));
    return 새.toISOString().slice(0, 10);
  }
  return 날더하기(기준, (보기 === 'week' ? 7 : 1) * 쪽);
}

export function Sched({ service, 앱수, 쓰나 }: { service: ServiceRow; 앱수: number; 쓰나: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const [보기, set보기] = useState(처음보기);
  const [기준, set기준] = useState(() => 시간대로(new Date(), 브라우저시간대()).날);
  const [고른, set고른] = useState(null as number | null);
  const [열린, set열린] = useState(null as 칩 | null);
  const [오류, set오류] = useState(null as string | null);
  const [from, to] = 기간(보기, 기준);
  const 세트목록 = useAsync(() => schedApi.sets(service.projectId), [service.projectId]);
  // 받은 기간을 같이 들고 있는다 — 다른 달로 넘긴 직후 앞 달 회차로 새 달을 그리지 않게
  const 회차목록 = useAsync(async () => ({ from, to, ...(await schedApi.calendar(service.projectId, from, to)) }), [service.projectId, from, to]);
  const 회차맞음 = 회차목록.data?.from === from && 회차목록.data.to === to;
  // 다시 읽을 때마다 새로 잰다 — 창을 오래 열어 둬도 지난 시각을 「예정」으로 그리지 않게
  const 지금 = useMemo(() => new Date(), [세트목록.data, 회차목록.data]);
  const 오늘 = 시간대로(지금, 브라우저시간대()).날;

  const 세트들 = 세트목록.data?.items ?? [];
  const 표 = useMemo(() => {
    const 전체 = 칩들(세트들, 회차목록.data?.occurrences ?? [], from, to, 지금);
    if (고른 === null) return 전체;
    return new Map([...전체].map(([날, 줄]) => [날, 줄.filter((c) => c.세트.id === 고른)]));
  }, [세트들, 회차목록.data, from, to, 지금, 고른]);

  const 보기고르기 = (새: 보기) => {
    set보기(새);
    try {
      localStorage.setItem(보기키, 새);
    } catch {
      // 저장소가 막힌 창 — 이번 화면에서만 기억한다
    }
  };
  const 날보기 = (날: string) => {
    set기준(날);
    보기고르기('day');
  };
  // 지난 칸에 실행이 하나면 창 없이 그 실행으로 간다 (§8.20 「칸 창」)
  const 열기 = (c: 칩) => {
    const 실행 = c.회차?.runs ?? [];
    if (c.상태 !== 'plan' && 실행.length === 1) window.location.hash = 실행주소(실행[0]!.kind, 실행[0]!.runId);
    else set열린(c);
  };
  const 켜기 = async (세트: 세트) => {
    set오류(null);
    try {
      await schedApi.setOn(세트.id, !세트.isOn);
      await Promise.all([세트목록.reload(), 회차목록.reload()]);
    } catch (e) {
      set오류(e instanceof Error ? e.message : String(e));
    }
  };

  const 부제 = t('{프로젝트} 프로젝트 · 애플리케이션 {수}개의 세트를 한 달력에 모았습니다', { 프로젝트: service.projectName, 수: 앱수 });
  const 머리 = <Head 제목={t('정기 실행')} 부제={부제} />;
  if (세트목록.error !== null) return (<div className="sched">{머리}<Failed error={세트목록.error} /></div>);
  if (세트목록.data === null) return (<div className="sched">{머리}<Loading /></div>);
  if (세트들.length === 0)
    return (
      <div className="sched">
        {머리}
        <section className="sched-empty">
          <h2>{t('아직 세트가 없습니다')}</h2>
          <p>{t('이미 만든 테스트를 선택해 정해진 시각에 실행합니다')}</p>
        </section>
      </div>
    );

  return (
    <div className="sched">
      {머리}
      {오류 === null ? null : <Failed error={오류} />}
      <div className="sched-body">
        <세트카드들 세트들={세트들} 고른={고른} 지금={지금} 쓰나={쓰나} on고르기={set고른} on날보기={날보기} on켜기={(s) => void 켜기(s)} />
        <div className="sched-main">
          <div className="sched-bar">
            <div className="sched-seg" role="group" aria-label={t('보기')}>
              {(['month', 'week', 'day'] as const).map((b) => (
                <button key={b} type="button" aria-pressed={보기 === b} onClick={() => 보기고르기(b)}>
                  {t({ month: '월', week: '주', day: '일' }[b])}
                </button>
              ))}
            </div>
            <div className="sched-nav">
              <button type="button" className="btn small ghost" aria-label={t('이전')} onClick={() => set기준(옮기기(보기, 기준, -1))}>
                ◀
              </button>
              <strong>{제목글(보기, 기준, 언어)}</strong>
              <button type="button" className="btn small ghost" aria-label={t('다음')} onClick={() => set기준(옮기기(보기, 기준, 1))}>
                ▶
              </button>
              <button type="button" className="btn small ghost" onClick={() => set기준(오늘)}>
                {t('오늘§달력')}
              </button>
            </div>
          </div>
          <div className="sched-cal">
            {회차목록.error === null ? null : <Failed error={회차목록.error} />}
            {회차목록.error === null && !회차맞음 ? <Loading /> : null}
            {회차목록.error === null && 회차맞음 ? <달력 보기={보기} 기준={기준} 오늘={오늘} 세트들={세트들} 표={표} on열기={열기} on날={날보기} /> : null}
          </div>
        </div>
      </div>
      {열린 === null ? null : <칸창 c={열린} onClose={() => set열린(null)} />}
    </div>
  );
}
