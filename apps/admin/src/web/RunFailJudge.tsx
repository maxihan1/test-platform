// 실패 카드 맨 아래 「실패 원인」 줄 — 「화면이 맞음」 · 「버그」 버튼과 누른 뒤의 판정 한 줄 (도메인/리포팅 「실패 요구사항」)

import { useEffect, useState } from 'react';

import { api, ApiError, type FailureCase, type FailureJudgment } from './api.js';
import { 요청오류문장 } from './errorText.js';
import { use말, use언어 } from './i18n.js';
import { prdApi } from './prdApi.js';
import { 케이스서비스, type 판정 } from './role.js';
import { message, when } from './ui.js';

interface Props {
  c: FailureCase;
  runId: number;
  권한: 판정;
  /** 눌러서 서버가 판정을 남겼을 때. 부르는 쪽이 카드 재료를 다시 읽어 사람 이름 · 요청 번호를 서버 값으로 맞춘다 */
  on남김: () => void;
}

export function RunFailJudge({ c, runId, 권한, on남김 }: Props) {
  const t = use말();
  const 언어 = use언어();
  const 서비스 = 케이스서비스(c.tcId);
  const [직접, set직접] = useState<FailureJudgment>(null);
  const [바쁨, set바쁨] = useState(false);
  const [오류, set오류] = useState<{ 글: string; 요청들: number[] } | null>(null);
  // 방금 누른 것은 서버 값이 올 때까지 바로 보이고, 카드 재료를 다시 읽어 새 값이 오면 그것이 이긴다
  useEffect(() => set직접(null), [c.judgment]);
  const 지금 = 직접 ?? c.judgment;

  // 덮는 요구 가운데 판에 있는 번호가 없으면 고칠 곳이 없다
  const 화면맞음가능 = 서비스 !== null && 권한('작성요청') && c.reqs.some((r) => r.text !== null) && 지금?.kind !== 'SCREEN';
  const 버그가능 = 권한('실행') && 지금 === null;
  if (!화면맞음가능 && !버그가능 && 지금 === null) return null;

  async function 누름(일: () => Promise<FailureJudgment>) {
    set바쁨(true);
    set오류(null);
    try {
      set직접(await 일());
      on남김();
    } catch (err) {
      // 열린 반영이 있으면 서버가 그 요청 번호들을 준다 — 글자로 오면 「12,15」다 (PrdTodo 와 같다)
      const 열린 = err instanceof ApiError && err.code === 'APPLY_OPEN' ? err.message.split(',').map(Number).filter(Number.isSafeInteger) : [];
      set오류({ 글: 열린.length > 0 ? 요청오류문장('APPLY_OPEN', 언어) : message(err, 언어), 요청들: 열린 });
    }
    set바쁨(false);
  }

  const 화면이맞음 = () =>
    누름(async () => {
      const { id } = await prdApi.apply(서비스 ?? '', { screenRight: { runId, tcId: c.tcId } });
      return { kind: 'SCREEN', requestId: id, byName: '', at: new Date().toISOString() };
    });
  const 버그 = () =>
    누름(async () => {
      const { byName, at } = await api.markBug(runId, c.tcId);
      return { kind: 'BUG', byName, at };
    });

  return (
    <div className="fc-cause">
      <span className="fc-cause-label">{t('실패 원인')}</span>
      {지금 === null ? null : (
        <p className="fc-judged">
          {지금.kind === 'SCREEN' ? (
            <>
              {t('화면이 맞음')} · <a href={`#/authoring/${String(지금.requestId)}`}>{t('작성 요청 #{번호}', { 번호: 지금.requestId })}</a>
            </>
          ) : (
            t('버그')
          )}
          {지금.byName === '' ? '' : ` · ${지금.byName}`} · {when(지금.at, 언어)}
        </p>
      )}
      {!화면맞음가능 ? null : (
        <button type="button" className="btn small" disabled={바쁨} onClick={() => void 화면이맞음()}>
          {지금?.kind === 'BUG' ? t('화면이 맞음으로 바꾸기') : t('화면이 맞음')}
        </button>
      )}
      {!버그가능 ? null : (
        <button type="button" className="btn small ghost" disabled={바쁨} onClick={() => void 버그()}>
          {t('버그')}
        </button>
      )}
      {오류 === null ? null : (
        <span className="note" role="alert">
          {오류.글}
          {오류.요청들.map((번호) => (
            <a key={번호} href={`#/authoring/${String(번호)}`}>
              {' '}
              {t('#{번호} 요청 보기', { 번호 })}
            </a>
          ))}
        </span>
      )}
    </div>
  );
}
