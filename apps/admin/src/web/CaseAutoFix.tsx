// 케이스 서랍 맨 위 「자동 수정 기록」 상자 — 테스트 수정 바퀴의 가장 늦은 줄 (도메인/BTS §8.15 「자동 수정 표시」 A · 게임 실패 자동 수정 — 도메인/게임 §3.10 「실패 자동 수정」 7)

import { api, type 자동수정상세 } from './api.js';
import { use말, use언어 } from './i18n.js';
import { PLATFORM_LABEL, useAsync, 월일 } from './ui.js';

const 판정말 = { PASS: 'Pass', FAIL: 'Fail', NA: 'Not tested' } as const;
export const 조작실패말 = { notFound: '요소를 찾지 못함', timeout: '타임아웃' } as const;

/** PASSED 가 아닌 줄의 지금 상태 한 줄 */
function 상태글(줄: 자동수정상세, t: ReturnType<typeof use말>): string {
  switch (줄.state) {
    case 'FIXING':
      return t('테스트를 수정하는 중');
    case 'WAIT_MERGE':
      if (줄.needsPerson && 줄.personWhy.length > 0) return t('반영을 기다리는 중 — 사람 확인이 필요해요 · {까닭}', { 까닭: 줄.personWhy.join(' · ') });
      if (줄.needsPerson) return t('반영을 기다리는 중 — 사람 확인이 필요해요');
      return 줄.merge === 'AUTO' ? t('자동 반영하는 중') : t('반영을 기다리는 중');
    case 'RERUNNING':
      return t('다시 실행하는 중');
    case 'FAILED':
      return 줄.rerunId === null ? t('수정 후에도 실패했어요') : t('수정 후에도 실패했어요 · RUN {번호}', { 번호: 줄.rerunId });
    case 'FLAKY':
      return t('다시 실행하니 통과해서 수정하지 않았어요');
    default:
      return 줄.reason === null ? t('그만뒀어요') : t('그만뒀어요 · {까닭}', { 까닭: 줄.reason });
  }
}

/** 목록 줄에 autoFix 가 있을 때만 그린다 — 없는 케이스마다 상세를 다시 부르지 않는다 */
export function 자동수정상자({ tcId }: { tcId: string }) {
  const t = use말();
  const 언어 = use언어();
  const 받음 = useAsync(() => api.caseFix(tcId), [tcId]);
  const 줄 = 받음.data?.autoFix;
  if (받음.error !== null) return <p className="hint">{t('자동 수정 기록을 불러오지 못했습니다')}</p>;
  if (줄 == null) return null;
  // 게임 실패 자동 수정은 이슈가 없다 — 요청한 쪽은 서버(Agent)이고 시작은 그 실행의 조작 실패다
  const 요청 =
    줄.issueKey === null || 줄.issueUrl === null ? (
      <>
        Agent · {줄.failedRun === null ? null : <a href={`#/runs/${줄.failedRun}`}>RUN {줄.failedRun}</a>} {t('조작 실패')}
        {줄.failure === null ? null : ` (${t(조작실패말[줄.failure])})`}
        {줄.requestId === null ? null : (
          <>
            {' · '}
            <a href={`#/authoring/${줄.requestId}`}>{t('작성 요청 #{번호}', { 번호: 줄.requestId })}</a>
          </>
        )}
      </>
    ) : (
      <>
        {줄.movedBy === null ? null : `${줄.movedBy} · `}
        <a href={줄.issueUrl} target="_blank" rel="noreferrer">
          Issue Bunker {줄.issueKey}
        </a>{' '}
        {t('「테스트 수정」')}
      </>
    );
  const pr번호 = 줄.prUrl?.match(/\/pull\/(\d+)/)?.[1];
  return (
    <div className="dsec fix-box">
      <div className="dlabel">
        {t('자동 수정 기록')}
        <span className="dfrom">{월일(줄.at, 언어)}</span>
      </div>
      <dl>
        <dt>{t('요청§자동수정')}</dt>
        <dd>{요청}</dd>
        {줄.state !== 'PASSED' ? (
          <>
            <dt>{t('상태')}</dt>
            <dd>{상태글(줄, t)}</dd>
          </>
        ) : (
          <>
            {줄.summary === null ? null : (
              <>
                <dt>{t('수정§자동수정')}</dt>
                <dd>{줄.summary}</dd>
              </>
            )}
            <dt>{t('반영§자동수정')}</dt>
            <dd>
              {줄.merge === 'PERSON' ? t('사람이 반영') : t('자동 반영')}
              {줄.prUrl === null ? null : (
                <>
                  {' · '}
                  <a href={줄.prUrl} target="_blank" rel="noreferrer">
                    {t('변경 내용 보기')}
                  </a>
                  {pr번호 === undefined ? null : ` (PR #${pr번호})`}
                </>
              )}
            </dd>
            <dt>{t('확인§자동수정')}</dt>
            <dd>
              {줄.devices.map((d) => `${t(PLATFORM_LABEL[d.platform])} ${t(판정말[d.status])}`).join(' · ')}
              {줄.rerunId === null ? null : (
                <>
                  {' '}
                  ({줄.rerunPage ? <a href={`#/runs/${줄.rerunId}`}>RUN {줄.rerunId}</a> : `RUN ${줄.rerunId}`})
                </>
              )}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
