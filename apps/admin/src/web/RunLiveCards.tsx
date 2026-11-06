// 정식 실행 진행 창의 화면 카드 — 도는 항목마다 실시간 장면과, 실제 기기면 기기 이름 · Device VISION 링크 (도메인/실행 §8.16 ⑤ · 시안 A ⑤)

import { useState } from 'react';

import { api, type 항목진행 } from './api.js';
import { use말, use언어, type 언어 } from './i18n.js';
import type { RunDetail, 도는것 } from './runProgress.js';
import { 시간글자 } from './remainText.js';
import { use장면 } from './TrialLive.js';
import { PLATFORM_LABEL } from './ui.js';

// 동시에 도는 항목이 기본 둘(EXECUTION_CONCURRENCY)이라 카드도 둘까지다. 넘는 것은 왼쪽 「진행 중」 줄에만 선다
const 카드최대 = 2;

type 말 = ReturnType<typeof use말>;

/** 러너가 첫 단계를 알렸나 — 보내고 아직 안 알린 항목은 단계 칸이 없다 (2026-11-06 WEB-F9-14) */
function 단계(절차: 항목진행 | null): (항목진행 & { seq: number; title: string }) | null {
  if (절차 === null || 절차.seq === undefined || 절차.title === undefined) return null;
  return { ...절차, seq: 절차.seq, title: 절차.title };
}

/**
 * `3 / 5단계 · 제목` — 저장한 단계 제목이 지금 단계와 맞을 때만 분모를 붙인다.
 * 어긋나면 저장값을 버린다(도메인/실행 §3.2 「단계 목록은 처음부터 다 보인다」) — 동적으로 만든 단계면 전체 수가 틀린다
 */
function 전체단계수(절차: 항목진행 & { seq: number; title: string }): number | null {
  const 제목들 = 절차.stepTitles;
  return 제목들 !== undefined && 제목들[절차.seq - 1] === 절차.title ? 제목들.length : null;
}

export function 단계글(절차: 항목진행 & { seq: number; title: string }, t: 말): string {
  const 전체 = 전체단계수(절차);
  return 전체 === null
    ? t('{번호}단계 · {제목}', { 번호: 절차.seq, 제목: 절차.title })
    : t('{번호} / {전체}단계 · {제목}', { 번호: 절차.seq, 전체, 제목: 절차.title });
}

/** 왼쪽 「진행 중」 줄의 짧은 단계 글 — `3단계` · `3 / 5단계`. 아직 안 알렸으면 null */
export function 짧은단계글(절차: 항목진행 | null, t: 말): string | null {
  const 지금 = 단계(절차);
  if (지금 === null) return null;
  const 전체 = 전체단계수(지금);
  return 전체 === null ? t('{번호}단계', { 번호: 지금.seq }) : t('{번호} / {전체}단계', { 번호: 지금.seq, 전체 });
}

/**
 * 「2초 / 제한 30초」 — 앞 시간은 항목 경과다. 단계 경과는 단계마다 0초로 돌아가 항목 제한과 짝이 안 맞았다(점검표 B13).
 * 옛 응답처럼 항목 경과가 없으면 단계 경과로 물러선다
 */
export function 제한경과글(절차: 항목진행 | null, 언어: 언어, t: 말): string | null {
  const 경과 = 절차?.itemElapsedMs ?? 절차?.elapsedMs;
  if (절차 === null || 경과 === undefined) return null;
  return t('{경과} / 제한 {제한}', { 경과: 시간글자(경과, 언어), 제한: 시간글자(절차.timeoutMs, 언어) });
}

/** 칸 머리 꼬리표 — 어디서 도는지. 실제 폰이면 그 폰 이름, 팜이 이름을 안 줬으면 「실제 기기」 */
function 기기글({ 항목, 절차 }: 도는것, t: 말): string | null {
  if (항목.platform === 'desktop') return t('서버 브라우저');
  if (절차?.vision !== undefined) return 절차.vision.name ?? t('실제 기기');
  return 항목.platform === 'mobile' ? t('가상 기기 · iPhone 14') : null;
}

/** 첫 단계 전 발 글 — 브라우저를 여는 4~5초 · 폰을 잡는 동안 카드가 멈춘 것처럼 보이지 않게 (점검표 B1 · B2) */
function 첫단계전글({ 항목, 절차 }: 도는것, t: 말): string {
  if (항목.platform !== 'android') return t('브라우저를 여는 중');
  return 절차?.vision === undefined ? t('사용할 폰을 찾는 중') : t('앱을 여는 중');
}

function 장면({ runId, historyId, 폰 }: { runId: number; historyId: number; 폰: boolean }) {
  const t = use말();
  const { 그림, 못닿음 } = use장면(api.itemLive(runId, historyId), true, false);
  if (그림 === null) return <p className="live-wait">{못닿음 ? t('실행 서버와 연결이 끊겼습니다. 다시 연결하는 중입니다') : t('브라우저를 여는 중')}</p>;
  return (
    <div className={폰 ? 'live-shot lc-phone' : 'live-shot'}>
      <img src={그림} alt={t('지금 화면')} />
    </div>
  );
}

function 카드({ runId, 것, 크게, on크게 }: { runId: number; 것: 도는것; 크게: boolean; on크게: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const { 항목, 절차 } = 것;
  const 꼬리표 = 기기글(것, t);
  // 장면을 찍는 항목인지는 admin 메모리의 열쇠가 정한다 — 디바이스로 짐작하지 않는다 (도메인/실행 §7 progress 의 live)
  const 화면있음 = 절차?.live === true;
  const 지금단계 = 단계(절차);
  const 시간 = 제한경과글(절차, 언어, t);

  return (
    <section className={크게 ? 'lc big' : 'lc'} aria-label={`${항목.tcId} ${t('실시간 화면')}`}>
      <div className="live-head">
        <span className="pulse" aria-hidden="true" />
        <b>{t(PLATFORM_LABEL[항목.platform])}</b>
        {꼬리표 === null ? null : <span className="lc-tag">{꼬리표}</span>}
        {절차?.vision === undefined ? null : (
          <a className="live-vision" href={절차.vision.url} target="_blank" rel="noreferrer">
            Device VISION ↗
          </a>
        )}
        {화면있음 ? (
          <button type="button" className="btn small ghost lc-zoom" onClick={on크게} aria-pressed={크게}>
            {크게 ? t('작게 보기') : t('크게 보기')}
          </button>
        ) : null}
      </div>
      <div className="lc-scene">
        {화면있음 ? (
          <장면 runId={runId} historyId={항목.historyId} 폰={항목.platform !== 'desktop'} />
        ) : (
          // 정식 실행은 앱 폰 장면을 찍지 않는다 — 폰 화면은 VISION 링크가 연다 (도메인/실행 §3.2 「정식 실행 화면」).
          // 단계가 이미 도는데 장면이 없으면 admin 이 다시 떠 장면 열쇠를 잃은 것이다 — 「여는 중」이라 하면 멈춘 것처럼 읽힌다
          <p className="live-wait">
            {절차?.vision !== undefined ? t('폰 화면은 Device VISION 에서 봅니다') : 지금단계 === null ? 첫단계전글(것, t) : t('지금은 보여 줄 화면이 없습니다')}
          </p>
        )}
      </div>
      <div className="lc-foot">
        <div className="lc-st">
          <b className="one-line">{지금단계 === null ? 첫단계전글(것, t) : 단계글(지금단계, t)}</b>
          {/* 경과와 제한을 나란히 둬야 「느린 것」과 「멈춘 것」이 갈린다 (게이트 1 화면 규칙) */}
          {시간 === null ? null : <span className="lim">{시간}</span>}
        </div>
        <span className="hint one-line">
          <span className="mono">{항목.tcId}</span> {항목.tcName}
        </span>
      </div>
    </section>
  );
}

/** 도는 항목 앞 둘의 카드 — 처음부터 보인다(점검표 D7). 「크게 보기」를 누르면 그 카드만 남아 칸을 채운다 */
export function 화면카드들({ runId, 것들 }: { runId: number; 것들: 도는것[] }) {
  const [크게, set크게] = useState<number | null>(null);
  const 보일것 = 것들.slice(0, 카드최대);
  // 크게 보던 항목이 끝나면 저절로 둘로 돌아온다
  const 큰것 = 보일것.find((것) => 것.항목.historyId === 크게);
  const 그릴것 = 큰것 === undefined ? 보일것 : [큰것];

  return (
    <div className={그릴것.length > 1 ? 'livecards two' : 'livecards'}>
      {그릴것.map((것) => (
        <카드
          key={것.항목.historyId}
          runId={runId}
          것={것}
          크게={큰것 !== undefined}
          on크게={() => set크게(큰것 === undefined ? 것.항목.historyId : null)}
        />
      ))}
    </div>
  );
}

/**
 * 도는 동안 맨 위 주황 띠 — 시험 실행의 회색 띠와 색으로 갈라 「기록이 남는다」를 알린다 (시안 A ⑤).
 * 한 건 실행은 실행 기록에 줄이 없어 붙을 실행이나 케이스 상세로 말한다 — 시작 확인 창과 같은 갈래다
 */
export function 기록띠({ data }: { data: RunDetail }) {
  const t말 = use말();
  const 글 =
    data.origin !== 'SINGLE'
      ? t말('끝나면 실행 기록에 RUN {번호} 로 남습니다', { 번호: data.runId })
      : data.rerunOf === null || data.rerunOf === undefined
        ? t말('끝나면 이 케이스 상세에 남습니다')
        : t말('끝나면 RUN {번호} 결과에 다시 실행으로 추가됩니다', { 번호: data.rerunOf });
  return (
    <p className="start-band rec">
      <b>{t말('정식 실행')}</b> {글}
    </p>
  );
}
