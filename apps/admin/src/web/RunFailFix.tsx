// 실패 카드 판정 줄 자리의 자동 수정 한 줄 — 옮긴 사람 · 이슈 · PR · 다시 실행 · 날짜 (도메인/BTS §8.15 「자동 수정 표시」 B)

import type { 카드자동수정 } from './api.js';
import { use말, use언어 } from './i18n.js';
import { PLATFORM_LABEL, 월일 } from './ui.js';

const 판정말 = { PASS: '통과', FAIL: '실패', NA: '미실행' } as const;

export function RunFailFix({ fix }: { fix: 카드자동수정 }) {
  const t = use말();
  const 언어 = use언어();
  const pr번호 = fix.prUrl?.match(/\/pull\/(\d+)/)?.[1];
  return (
    <div className="fc-cause">
      <span className="fc-cause-label">{t('자동 수정')}</span>
      <p className="fc-judged">
        {t('테스트 수정 요청으로 자동 수정했어요')} — {fix.movedBy === null ? null : `${fix.movedBy} · `}
        <a href={fix.issueUrl} target="_blank" rel="noreferrer">
          Issue Bunker {fix.issueKey}
        </a>
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
            <a href={`#/runs/${fix.rerunId}`}>RUN {fix.rerunId}</a>{' '}
            {fix.devices.map((d) => `${t(PLATFORM_LABEL[d.platform])} ${t(판정말[d.status])}`).join(' · ')}
          </>
        )}{' '}
        ({월일(fix.at, 언어)})
      </p>
    </div>
  );
}
