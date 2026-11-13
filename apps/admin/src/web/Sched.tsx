// 정기 실행 화면 — 왼쪽 세트 카드 · 오른쪽 월 · 주 · 일 달력. 프로젝트 공통이다 (도메인/정기실행 §8.20 · 시안 B)

import { useEffect, useMemo, useState } from 'react';

import type { ServiceRow } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { schedApi, type 세트 } from './schedApi.js';
import { 기간, 달력, 칸창, type 보기 } from './SchedCalendar.js';
import { 세트카드들, 짧은날 } from './SchedCards.js';
import { 날더하기, 시간대로, 실행주소, 주시작, 칩들, type 칩 } from './schedView.js';
import { SchedWizard } from './SchedWizard.js';
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

export function Sched({ service, 앱들, 쓰나 }: { service: ServiceRow; 앱들: readonly ServiceRow[]; 쓰나: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const [보기, set보기] = useState(처음보기);
  const [기준, set기준] = useState(() => 시간대로(new Date(), 브라우저시간대()).날);
  const [고른, set고른] = useState(null as number | null);
  const [열린, set열린] = useState(null as 칩 | null);
  const [오류, set오류] = useState(null as string | null);
  // 열린 마법사 — 세트가 null 이면 신규 (§8.20 「마법사」)
  const [마법사, set마법사] = useState(null as { 세트: 세트 | null } | null);
  const [저장말, set저장말] = useState(null as string | null);
  const [from, to] = 기간(보기, 기준);
  const 세트목록 = useAsync(() => schedApi.sets(service.projectId), [service.projectId]);
  // 받은 기간을 같이 들고 있는다 — 다른 달로 넘긴 직후 앞 달 회차로 새 달을 그리지 않게
  const 회차목록 = useAsync(async () => ({ from, to, ...(await schedApi.calendar(service.projectId, from, to)) }), [service.projectId, from, to]);
  const 회차맞음 = 회차목록.data?.from === from && 회차목록.data.to === to;
  // 다시 읽을 때마다 새로 잰다 — 창을 오래 열어 둬도 지난 시각을 「예정」으로 그리지 않게
  const 지금 = useMemo(() => new Date(), [세트목록.data, 회차목록.data]);
  const 오늘 = 시간대로(지금, 브라우저시간대()).날;
  // 오늘이 보이는 동안 1분마다 다시 읽는다 — 회차는 서버의 1분 점검이 세우고 닫아서, 안 읽으면 시작한 회차가 「예정」으로 남는다
  const 오늘보임 = from <= 오늘 && 오늘 <= to;
  const 세트다시 = 세트목록.reload;
  const 회차다시 = 회차목록.reload;
  useEffect(() => {
    if (!오늘보임) return undefined;
    const 타이머 = setInterval(() => void Promise.all([세트다시(), 회차다시()]), 60_000);
    return () => clearInterval(타이머);
  }, [오늘보임, 세트다시, 회차다시]);

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

  // 저장하면 창을 닫고 달력을 다음 실행 날짜로 옮긴다 (§8.20 5단계)
  const 저장됨 = (이름: string, 다음: string | null, at: string) => {
    set마법사(null);
    if (다음 !== null) set기준(다음);
    set저장말(다음 === null ? t('「{이름}」 세트를 저장했습니다', { 이름 }) : t('「{이름}」 세트를 저장했습니다 · 다음 실행 {날} {시각}', { 이름, 날: 짧은날(다음), 시각: at }));
    void Promise.all([세트목록.reload(), 회차목록.reload()]);
  };
  const 신규단추 = 쓰나 ? (
    <button type="button" className="btn" onClick={() => set마법사({ 세트: null })}>
      {t('+ 신규 세트')}
    </button>
  ) : null;
  const 창 =
    마법사 === null ? null : (
      <SchedWizard
        projectId={service.projectId}
        세트={마법사.세트}
        세트들={세트들}
        앱들={앱들}
        // 저장이 일부만 되고 닫혔을 수 있다(만든 뒤 기준 정하기가 실패) — 닫을 때 목록을 다시 읽는다
        onClose={() => {
          set마법사(null);
          void 세트목록.reload();
        }}
        on저장={저장됨}
      />
    );

  const 부제 = t('{프로젝트} 프로젝트 · 애플리케이션 {수}개의 세트를 한 달력에 모았습니다', { 프로젝트: service.projectName, 수: 앱들.length });
  // 목록을 읽기 전에는 「+ 신규 세트」를 세우지 않는다 — 그 자리에는 창이 안 서서 눌러도 반응이 없다
  const 빈머리 = <Head 제목={t('정기 실행')} 부제={부제} />;
  const 머리 = <Head 제목={t('정기 실행')} 부제={부제} 행동={신규단추} />;
  if (세트목록.error !== null) return (<div className="sched">{빈머리}<Failed error={세트목록.error} /></div>);
  if (세트목록.data === null) return (<div className="sched">{빈머리}<Loading /></div>);
  if (세트들.length === 0)
    return (
      <div className="sched">
        {머리}
        <section className="sched-empty">
          <h2>{t('아직 세트가 없습니다')}</h2>
          <p>{t('이미 만든 테스트를 선택해 정해진 시각에 실행합니다')}</p>
          {신규단추}
        </section>
        {창}
      </div>
    );

  return (
    <div className="sched">
      {머리}
      {오류 === null ? null : <Failed error={오류} />}
      {저장말 === null ? null : (
        <p className="sched-saved" role="status">
          {저장말}
        </p>
      )}
      <div className="sched-body">
        <세트카드들 세트들={세트들} 고른={고른} 지금={지금} 쓰나={쓰나} on고르기={set고른} on날보기={날보기} on켜기={(s) => void 켜기(s)} on수정={(s) => set마법사({ 세트: s })} />
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
      {열린 === null ? null : (
        <칸창
          c={열린}
          onClose={() => set열린(null)}
          on수정={
            쓰나 && 열린.상태 === 'plan'
              ? () => {
                  set열린(null);
                  set마법사({ 세트: 열린.세트 });
                }
              : undefined
          }
        />
      )}
      {창}
    </div>
  );
}
