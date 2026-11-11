// 케이스 서랍 맨 위 「자동 수정 기록」 상자 — Issue Bunker 테스트 수정 바퀴의 가장 늦은 줄 (도메인/BTS §8.15 「자동 수정 표시」 A)

import { api, type 자동수정상세 } from './api.js';
import { use말, use언어 } from './i18n.js';
import { PLATFORM_LABEL, useAsync, 월일 } from './ui.js';

const 판정말 = { PASS: '통과', FAIL: '실패', NA: '미실행' } as const;

/** PASSED 가 아닌 줄의 지금 상태 한 줄 */
function 상태글(줄: 자동수정상세, t: ReturnType<typeof use말>): string {
  switch (줄.state) {
    case 'FIXING':
      return t('테스트를 수정하는 중');
    case 'WAIT_MERGE':
      if (줄.needsPerson) return t('반영을 기다리는 중 — 사람 확인이 필요해요');
      return 줄.merge === 'AUTO' ? t('자동 반영하는 중') : t('반영을 기다리는 중');
    case 'RERUNNING':
      return t('다시 실행하는 중');
    case 'FAILED':
      return 줄.rerunId === null ? t('수정 후에도 실패했어요') : t('수정 후에도 실패했어요 · RUN {번호}', { 번호: 줄.rerunId });
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
  const 이슈 = (
    <a href={줄.issueUrl} target="_blank" rel="noreferrer">
      Issue Bunker {줄.issueKey}
    </a>
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
        <dd>
          {줄.movedBy === null ? null : `${줄.movedBy} · `}
          {이슈} {t('「테스트 수정」')}
        </dd>
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
                  (<a href={`#/runs/${줄.rerunId}`}>RUN {줄.rerunId}</a>)
                </>
              )}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
