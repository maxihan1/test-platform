// 정식 실행 진행 창의 화면 카드 — 도는 항목마다 실시간 장면과, 실제 기기면 Device VISION 링크 (도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」 · 시안 7판 ⑦)

import { useState } from 'react';

import { api, type RunItemSummary, type 항목진행 } from './api.js';
import { use말, use언어 } from './i18n.js';
import type { RunDetail, 도는것 } from './runProgress.js';
import { 시간글자 } from './remainText.js';
import { use장면 } from './TrialLive.js';
import { PLATFORM_LABEL } from './ui.js';

// 동시에 도는 항목이 기본 둘(EXECUTION_CONCURRENCY)이라 카드도 둘까지다. 넘는 것은 이름 줄로 남는다
const 카드최대 = 2;

type 말 = ReturnType<typeof use말>;

/** 칸 머리 꼬리표. Android 앱은 늘 VISION 폰이라 링크가 대신 말한다 */
function 기기글({ 항목, 절차 }: 도는것, t: 말): string | null {
  if (항목.platform === 'desktop') return t('서버 브라우저');
  if (절차?.vision !== undefined) return t('실제 기기');
  return 항목.platform === 'mobile' ? t('가상 기기 · iPhone 14') : null;
}

function 장면({ runId, historyId, 폰 }: { runId: number; historyId: number; 폰: boolean }) {
  const t = use말();
  // 정식 실행에는 Appium 장면이 없다 — android 는 live 가 늘 false 라 여기까지 안 온다
  const { 그림, 못닿음 } = use장면(api.itemLive(runId, historyId), true, false);
  if (그림 === null) return <p className="live-wait">{못닿음 ? t('실행 서버와 연결이 끊겼습니다. 다시 연결하는 중입니다') : t('화면을 기다리고 있습니다')}</p>;
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
  const 화면있음 = 절차?.live === true;

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
      </div>
      {화면있음 ? (
        <div className="lc-scene">
          <장면 runId={runId} historyId={항목.historyId} 폰={항목.platform !== 'desktop'} />
          <button type="button" className="btn small ghost lc-zoom" onClick={on크게} aria-pressed={크게}>
            {크게 ? t('작게 보기') : t('크게 보기')}
          </button>
        </div>
      ) : null}
      <div className="lc-foot">
        <div className="lc-st">
          <b className="one-line">
            {항목.tcId} {항목.tcName}
          </b>
          {/* 경과와 제한을 나란히 둬야 「느린 것」과 「멈춘 것」이 갈린다 (게이트 1 화면 규칙) */}
          {절차 === null ? null : (
            <span className="lim">
              {t('{시간} 경과', { 시간: 시간글자(절차.elapsedMs, 언어) })} / {t('제한 {시간}', { 시간: 시간글자(절차.timeoutMs, 언어) })}
            </span>
          )}
        </div>
        {절차 === null ? null : (
          <span className="hint one-line">{t('{번호}단계 · {제목}', { 번호: 절차.seq, 제목: 절차.title })}</span>
        )}
      </div>
    </section>
  );
}

/** 도는 항목 앞 둘의 카드. 「크게 보기」를 누르면 그 카드만 남아 창을 채운다 */
function 화면카드들({ runId, 것들 }: { runId: number; 것들: 도는것[] }) {
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

/** 지금 도는 항목 하나. 이름 줄과 절차 줄이 한 덩어리다 */
function 도는줄({ 항목, 절차 }: { 항목: RunItemSummary; 절차: 항목진행 | null }) {
  const t말 = use말();
  const 언어 = use언어();

  return (
    <div className="pre">
      <div className="one-line">
        {항목.tcId} {항목.tcName}
      </div>
      {/* 절차를 모를 때는 줄을 **아예 두지 않는다.** 빈 자리를 잡아 두면 2초마다 다시 묻는 이 화면에서
          절차가 왔다 갔다 할 때 상자 높이가 같이 튄다. 이름 줄과 붙여 둬서 덩어리만 짧아진다 */}
      {절차 === null ? null : (
        <div className="now-step">
          <span className="one-line">
            {t말('{번호}단계 · {제목}', { 번호: 절차.seq, 제목: 절차.title })}
          </span>
          {/* 분모 없는 순번은 진행이 아니라 그냥 번호로 읽힌다. 진행을 실제로 말하는 것은
              2초마다 바뀌는 경과라 순번보다 크게 두고, 제한과 나란히 둬야
              「느린 것」과 「멈춘 것」이 갈린다 (게이트 1 화면 규칙) */}
          <b>{t말('{시간} 경과', { 시간: 시간글자(절차.elapsedMs, 언어) })}</b>
          <span className="lim">/ {t말('제한 {시간}', { 시간: 시간글자(절차.timeoutMs, 언어) })}</span>
        </div>
      )}
    </div>
  );
}

/** 「진행 중」 묶음 — 앞 둘은 화면 카드, 동시 실행을 늘려 셋째부터 오면 이름 줄로 남긴다 */
export function 진행중카드들({ runId, 것들 }: { runId: number; 것들: 도는것[] }) {
  return (
    <>
      <화면카드들 runId={runId} 것들={것들} />
      {것들.slice(카드최대).map(({ 항목, 절차 }) => (
        <도는줄 key={항목.historyId} 항목={항목} 절차={절차} />
      ))}
    </>
  );
}

/**
 * 도는 동안 맨 위 주황 띠 — 시험 실행의 회색 띠와 색으로 갈라 「기록이 남는다」를 알린다 (시안 7판 ⑦).
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
