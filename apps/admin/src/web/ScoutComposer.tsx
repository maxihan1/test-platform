// Scout 입력 줄 — 글 칸 · 🎤 · 보내기 / 중단, 듣는 동안의 안내 줄 (도메인/챗봇 §8.18 「입력」 · 공통 상태 ②)

import type { RefObject } from 'react';

import { use말 } from './i18n.js';
import type { use음성 } from './useVoice.js';

const 글최대 = 2000;

export function ScoutComposer({
  칸,
  글,
  set글,
  보내기,
  보낼수,
  도는중,
  중단,
  음성,
}: {
  칸: RefObject<HTMLTextAreaElement | null>;
  글: string;
  set글: (글: string) => void;
  보내기: (글: string) => void;
  보낼수: boolean;
  도는중: boolean;
  중단: () => void;
  음성: ReturnType<typeof use음성>;
}) {
  const t = use말();
  return (
    <>
      <div className="scout-comp">
        <label className="sr-only" htmlFor="scout-q">
          {t('질문')}
        </label>
        <textarea
          id="scout-q"
          ref={칸}
          className={음성.듣는중 ? 'live' : undefined}
          // 듣는 동안 들은 말이 칸을 다시 채운다 — 그새 친 글이 덮여 사라지지 않게 듣는 동안은 치지 않는다
          readOnly={음성.듣는중}
          rows={Math.min(5, 글.split('\n').length)}
          maxLength={글최대}
          placeholder={t('질문을 입력하세요')}
          value={글}
          onChange={(e) => set글(e.target.value)}
          onKeyDown={(e) => {
            // 한글 조합 중의 Enter 는 글자를 마무리하는 키다 — 보내지 않는다. Safari 는 isComposing 없이 keyCode 229 로만 알린다
            if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === 229) return;
            e.preventDefault();
            보내기(글);
          }}
        />
        {/* 들은 말은 칸을 채우기만 한다 — 확인하고 보내는 것은 사람이다 */}
        {!음성.쓸수 ? null : 음성.듣는중 ? (
          <button type="button" className="scout-mic on" aria-label={t('음성 입력 종료')} onClick={음성.끝}>
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <button type="button" className="scout-mic" aria-label={t('음성으로 입력')} onClick={() => 음성.시작(글, 글최대)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
        )}
        {도는중 ? (
          <button type="button" className="scout-stop" onClick={중단}>
            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
            </svg>
            {t('중단§Scout')}
          </button>
        ) : (
          <button type="button" className="scout-send" aria-label={t('보내기')} disabled={글.trim() === '' || !보낼수} onClick={() => 보내기(글)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>
      {음성.듣는중 ? (
        <div className="scout-listen" role="status">
          <span className="scout-bars" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          {t('듣는 중 · 말을 마치면 확인 후 보내세요')}
        </div>
      ) : null}
    </>
  );
}
