// 실패 카드 판정 줄 자리의 자동 수정 한 줄 — 옮긴 사람 · 이슈 · PR · 다시 실행 · 날짜 (도메인/BTS §8.15 「자동 수정 표시」 B)

import { Fragment, type ReactNode } from 'react';

import type { 카드자동수정, 카드자동수정중 } from './api.js';
import { use말, use언어 } from './i18n.js';
import { PLATFORM_LABEL, 월일 } from './ui.js';

const 판정말 = { PASS: 'Pass', FAIL: 'Fail', NA: 'Not tested' } as const;

export function RunFailFix({ fix }: { fix: 카드자동수정 }) {
  const t = use말();
  const 언어 = use언어();
  const pr번호 = fix.prUrl?.match(/\/pull\/(\d+)/)?.[1];
  return (
    <div className="fc-cause">
      <span className="fc-cause-label">{t('자동 수정')}</span>
      <p className="fc-judged">
        {fix.issueKey === null || fix.issueUrl === null ? (
          <>
            {t('조작 실패를 에이전트가 자동 수정했어요')}
            {fix.requestId === null ? null : (
              <>
                {' — '}
                <a href={`#/authoring/${fix.requestId}`}>{t('작성 요청 #{번호}', { 번호: fix.requestId })}</a>
              </>
            )}
          </>
        ) : (
          <>
            {t('테스트 수정 요청으로 자동 수정했어요')} — {fix.movedBy === null ? null : `${fix.movedBy} · `}
            <a href={fix.issueUrl} target="_blank" rel="noreferrer">
              Issue Bunker {fix.issueKey}
            </a>
          </>
        )}
        {fix.prUrl === null ? null : (
          <>
            {' → '}
            <a href={fix.prUrl} target="_blank" rel="noreferrer">
              {pr번호 === undefined ? t('변경 내용 보기') : `PR #${pr번호}`}
            </a>{' '}
            {fix.merge === 'PERSON' ? t('사람이 반영') : t('자동 반영')}
          </>
        )}
        {fix.rerunId === null ? null : (
          <>
            {' → '}
            {fix.rerunPage ? <a href={`#/runs/${fix.rerunId}`}>RUN {fix.rerunId}</a> : `RUN ${fix.rerunId}`}{' '}
            {fix.devices.map((d) => `${t(PLATFORM_LABEL[d.platform])} ${t(판정말[d.status])}`).join(' · ')}
          </>
        )}{' '}
        ({월일(fix.at, 언어)})
      </p>
    </div>
  );
}

/** 있는 것만 ` → A · B` 로 잇는다 — 없는 자리에 화살표나 구분점이 매달리지 않게 */
function 이음(...것: (ReactNode | null)[]): ReactNode {
  const 있음 = 것.filter((x) => x !== null);
  if (있음.length === 0) return null;
  return (
    <>
      {' → '}
      {있음.map((x, i) => (
        <Fragment key={i}>
          {i === 0 ? null : ' · '}
          {x}
        </Fragment>
      ))}
    </>
  );
}

/** 게임 실패 자동 수정이 도는 중이거나 통과 못 하고 끝난 카드의 한 줄 — 판정 줄 위에 선다 (도메인/게임 §3.10 「실패 자동 수정」 7) */
export function RunFailFixing({ fix }: { fix: 카드자동수정중 }) {
  const t = use말();
  const 언어 = use언어();
  const pr번호 = fix.prUrl?.match(/\/pull\/(\d+)/)?.[1];
  const 요청 =
    fix.requestId === null ? null : <a href={`#/authoring/${fix.requestId}`}>{t('작성 요청 #{번호}', { 번호: fix.requestId })}</a>;
  const pr =
    fix.prUrl === null ? null : (
      <a href={fix.prUrl} target="_blank" rel="noreferrer">
        {pr번호 === undefined ? t('변경 내용 보기') : `PR #${pr번호}`}
      </a>
    );
  const 실행 = fix.rerunId === null ? null : fix.rerunPage ? <a href={`#/runs/${fix.rerunId}`}>RUN {fix.rerunId}</a> : `RUN ${fix.rerunId}`;
  let 글: React.ReactNode;
  switch (fix.state) {
    case 'FIXING':
      글 = <>{t('에이전트가 테스트를 수정하는 중이에요')} — {요청}</>;
      break;
    case 'WAIT_MERGE':
      글 = fix.needsPerson ? (
        <>
          {t('수정한 테스트를 사람이 반영해야 해요')}
          {fix.personWhy.length === 0 ? null : ` — ${fix.personWhy.join(' · ')}`}
          {이음(pr, <a href="#/authoring?todo=1">{t('테스트 작성 › 결정 필요에서 반영')}</a>)}
        </>
      ) : (
        <>{t('수정한 테스트를 반영하는 중이에요')}{이음(pr)}</>
      );
      break;
    case 'RERUNNING':
      글 = <>{t('수정한 테스트를 다시 실행하는 중이에요')}{이음(pr, 실행)}</>;
      break;
    case 'FAILED':
      글 = <>{t('수정했지만 다시 실행에서도 실패했어요')}{이음(pr, 실행)}</>;
      break;
    case 'FLAKY':
      글 = t('다시 실행하니 통과해서 수정하지 않았어요');
      break;
    default:
      글 = fix.reason === null ? t('그만뒀어요') : t('그만뒀어요 · {까닭}', { 까닭: fix.reason });
  }
  return (
    <div className="fc-cause">
      <span className="fc-cause-label">{t('자동 수정')}</span>
      <p className="fc-judged">
        {글} ({월일(fix.at, 언어)})
      </p>
    </div>
  );
}
