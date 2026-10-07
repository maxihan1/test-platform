// 실패 카드 안의 디바이스 칸 — 머리(변화 · 회차 · 소요 · 흐름 막대)와 사전조건 · 입력 · 절차 본문 (실행 §8.3)

import { api, type FailureDevice, type RunItemDetail, type RunItemSummary } from './api.js';
import { 회차요약 } from './group.js';
import { use말, use언어 } from './i18n.js';
import { 증거본문 } from './ItemExpand.js';
import { PLATFORM_LABEL, seconds, Verdict } from './ui.js';
import { 판정흐름, 흐름칸수 } from './Summary.js';

/** 오류 문장의 대표 길이. 서버 insights 의 대표 문장과 같다 (리포팅 §7) */
const 오류길이 = 120;

/**
 * 확인 문장 없이 깨진 항목만 오류의 첫 줄을 낸다.
 * 원문 전체는 상세에만 둔다 — 스택 · 주소에 비밀값이 섞일 수 있다 (실행 §8.3 「원문 오류는 목록에 쓰지 않는다」)
 */
function 오류줄(item: RunItemDetail): string | null {
  if (item.steps.some((step) => step.assertions.some((a) => a.status === 'FAIL'))) return null;
  const 첫줄 = (item.error?.message.split('\n')[0] ?? '').trim();
  if (첫줄 === '') return null;
  return 첫줄.length > 오류길이 ? `${첫줄.slice(0, 오류길이)}…` : 첫줄;
}

/**
 * 같은 절차의 같은 확인이 같은 실제 값으로 깨진 디바이스를 한 칸으로 묶는다.
 * 소요 · 흐름은 서명에 안 넣는다 — 디바이스마다 나란히 보인다.
 */
export function 같은실패끼리(devices: FailureDevice[]): FailureDevice[][] {
  const 묶음 = new Map<string, FailureDevice[]>();
  for (const d of devices) {
    const 서명 = JSON.stringify([
      d.item.params,
      d.item.steps.map((s) => [s.title, s.status, s.assertions.map((a) => [a.statement, a.status, a.expected, a.actual])]),
      오류줄(d.item),
    ]);
    묶음.set(서명, [...(묶음.get(서명) ?? []), d]);
  }
  return [...묶음.values()];
}

export function RunFailDevice({ devices, env, items }: { devices: FailureDevice[]; env: string; items: RunItemSummary[] }) {
  const t = use말();
  const 언어 = use언어();
  const 대표 = devices[0]!.item;
  const 오류 = 오류줄(대표);
  // 묶인 칸은 디바이스마다 화면이 다를 수 있다 — 절차는 한 번만 그리고 화면은 이름을 달아 나란히 놓는다
  const 묶임 = devices.length > 1;
  // 회차가 여럿이면 소요는 그 디바이스 회차의 평균이다 (§8.3 회차 요약). 회차 항목은 실행 응답에서 온다
  const 소요글 = (d: FailureDevice): string => {
    if (d.attempts <= 1) return seconds(d.item.durationMs, 언어);
    const 칸 = items.filter((i) => i.tcId === d.item.tcId && i.platform === d.platform && typeof i.unconfirmed !== 'string');
    const 평균 = 칸.length === 0 ? d.item.durationMs : 회차요약(칸).평균소요ms;
    return t('{시간} 평균', { 시간: seconds(평균, 언어) });
  };

  return (
    <div className="fc-dev">
      <div className="fc-devh">
        <b>{devices.map((d) => PLATFORM_LABEL[d.platform]).join(' · ')}</b>
        <Verdict status="FAIL" />
      </div>

      {devices.map((d) => {
        const 변화 = 변화글(d, t);
        return (
          <div key={d.platform} className="fc-meta">
            {devices.length > 1 ? <span className="fc-name">{PLATFORM_LABEL[d.platform]}</span> : null}
            {변화 === null ? null : <span className={d.change === '새로깨짐' ? 'fc-tag fc-new' : 'fc-tag'}>{변화}</span>}
            {d.attempts > 1 ? (
              <span>{t('{회수}회 중 {실패}회 실패', { 회수: d.attempts, 실패: d.failedAttempts })}</span>
            ) : null}
            <span>{소요글(d)}</span>
            <span className="fc-flow">
              <판정흐름 recent={d.recent} 앞말={t('{서버} 서버 · 이 실행까지', { 서버: env })} />
            </span>
            <a className="fc-detail" href={`#/runs/${String(d.item.runId)}/items/${String(d.item.historyId)}`}>
              {t('상세')}
            </a>
          </div>
        );
      })}

      {오류 === null ? null : (
        <div className="fc-err">
          <span className="fc-k">{t('실행이 멈춘 사유')}</span>
          {오류}
        </div>
      )}

      <증거본문 item={대표} 화면숨김={묶임} />

      {!묶임 ? null : (
        <div className="fc-shots">
          {devices.flatMap((d) =>
            d.item.steps
              // capture:true 로 찍은 통과 절차 화면을 「실패 시점 화면」이라 부르면 안 된다 — 실패한 절차 것만
              .filter((step) => step.screenshotPath !== undefined && step.status === 'FAIL')
              .map((step) => (
                <figure key={`${d.platform}-${String(step.seq)}`} className="fc-shot">
                  <figcaption>{PLATFORM_LABEL[d.platform]}</figcaption>
                  <a href={api.screenshot(d.item.runId, d.item.historyId, step.seq)} target="_blank" rel="noreferrer">
                    <img
                      src={api.screenshot(d.item.runId, d.item.historyId, step.seq)}
                      alt={t('{디바이스} {절차} 실패 시점 화면', { 디바이스: PLATFORM_LABEL[d.platform], 절차: step.title })}
                      loading="lazy"
                    />
                  </a>
                </figure>
              )),
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 변화 글자. 연속 실패는 계속깨짐일 때만 낸다 — 앞 실행에 그 케이스가 없어 견줄 앞이 없으면
 * 막대에 실패가 이어져도 글자를 안 낸다 (서버가 그때 streak 를 null 로 준다)
 */
function 변화글(d: FailureDevice, t: (키: string, 값?: Record<string, string | number>) => string): string | null {
  if (d.change === '새로깨짐') return t('신규 실패');
  if (d.change !== '계속깨짐' || d.streak === null) return null;
  // 막대가 칸 수만큼 다 차고 전부 실패면 더 앞에서도 이어졌을 수 있다
  const 이상 = d.streak === d.recent.length && d.recent.length >= 흐름칸수;
  return t(이상 ? '연속 실패 {회}회 이상' : '연속 실패 {회}회', { 회: d.streak });
}
