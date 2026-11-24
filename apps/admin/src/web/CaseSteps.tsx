// 케이스 상세 칸의 「시험 절차」 — 마지막 실행의 절차를 디바이스마다 보인다 (도메인/카탈로그 §8.1 「상세 칸」). CaseDetail 이 300줄을 넘어 뗐다

import type { Platform } from '@platform/kit/types';

import { api, type CaseRow, type LastResult, type RunItemDetail } from './api.js';
import { keyOf, type LastMap } from './catalogView.js';
import { 실패이유 } from './FailureWhy.js';
import { use말, use언어 } from './i18n.js';
import { 막혔나, use막힘사유 } from './proc.js';
import { PLATFORM_LABEL, seconds, STATUS_LABEL, Verdict, when } from './ui.js';

/** 결과 — 고른 디바이스의 마지막 결과(없으면 실행한 적이 없다). 절차 — undefined 는 받는 중, null 은 받기 실패 */
export function 시험절차칸({
  row,
  마지막,
  결과,
  절차,
  고른기기,
  on기기,
}: {
  row: CaseRow;
  마지막: LastMap;
  결과: LastResult | undefined;
  절차: RunItemDetail | null | undefined;
  고른기기: Platform | null;
  on기기: (p: Platform) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const 막힘사유 = use막힘사유();
  const 돈기기 = row.platforms.filter((p) => 마지막[keyOf(row.tcId, p)] !== undefined);
  return (
    <div className="dsec">
      <div className="dlabel">
        {t('시험 절차')}
        {결과 === undefined ? null : (
          <span className="dfrom">{t('RUN {번호} · {때}', { 번호: 결과.runId, 때: when(결과.finishedAt, 언어) })}</span>
        )}
      </div>
      {/* 디바이스마다 절차가 다르다 — 첫 디바이스 것만 보이면 모바일만 깨진 케이스가 통과로 읽혔다(점검 7.7) */}
      {돈기기.length < 2 ? null : (
        <div className="case-devs" role="group" aria-label={t('디바이스')}>
          {돈기기.map((p) => {
            const 판정 = 마지막[keyOf(row.tcId, p)]!.status;
            return (
              <button
                type="button"
                key={p}
                className={판정 === 'FAIL' ? 'chip chip-fail' : 'chip'}
                aria-pressed={고른기기 === p}
                onClick={() => on기기(p)}
              >
                {t(PLATFORM_LABEL[p])} {t(STATUS_LABEL[판정])}
              </button>
            );
          })}
        </div>
      )}
      {/* Blocked 면 절차가 안 돌았다 — 왜인지 절차 위에 적는다. 막은 케이스 번호가 없는 드문 줄은 글자만 선다 */}
      {결과 === undefined || !막혔나(결과) ? null : (
        <p className="case-blocked">
          <b>Blocked</b> {막힘사유(결과, 마지막)}
        </p>
      )}
      {결과 === undefined ? (
        <p className="hint">{t('아직 실행한 적이 없습니다. 한 번 실행하면 절차가 여기에 남습니다')}</p>
      ) : 절차 === undefined ? (
        <p className="hint">{t('절차를 불러오는 중입니다')}</p>
      ) : 절차 === null ? (
        <p className="hint">{t('절차를 불러오지 못했습니다')}</p>
      ) : (
        <ol className="dsteps">
          {절차.steps.map((단계) => (
            <li key={단계.seq} className={단계.status === 'FAIL' ? 'dstep-fail' : undefined}>
              <span className="n mono">{단계.seq}</span>
              <span className="t">{단계.title}</span>
              <Verdict status={단계.status} />
              <span className="d mono">{seconds(단계.durationMs, 언어)}</span>
              {/* 응답에 사유와 실패 화면이 다 있는데 안 그렸다(점검 7.9). 원문은 항목 상세에서 본다 */}
              {단계.status !== 'FAIL' ? null : (
                <span className="dstep-why">
                  <실패이유 failure={절차.failure} />
                  {단계.screenshotPath == null ? null : (
                    <a href={api.screenshot(절차.runId, 절차.historyId, 단계.seq)} target="_blank" rel="noreferrer">
                      {t('실패 화면 보기')}
                    </a>
                  )}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
