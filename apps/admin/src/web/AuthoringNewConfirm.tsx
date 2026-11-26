// 새 작성 마법사의 확인 창 두 자리 — 가이드 저장 후 다음 · 테스트 작성 시작 (DESIGN.md 「모달」 ①)
//
// 단추와 상자를 한 몸으로 둔다. AuthoringNew 가 300줄에 닿아 단추 줄을 더 늘리지 않으려고 뗐다

import { useState } from 'react';

import { 확인창 } from './ConfirmBox.js';
import { use말 } from './i18n.js';
import { 기다림글자 } from './ui.js';

/** 가이드를 저장하면 서버에 새 판이 생긴다 — 누르기 전에 한 번 묻는다 (2026-11-26 사용자) */
export function 가이드저장다음({ 바뀜, busy, 대기, on저장 }: { 바뀜: boolean; busy: boolean; 대기: boolean; on저장: () => void }) {
  const t = use말();
  const [묻나, set묻나] = useState(false);
  return (
    <>
      <button className="btn" type="button" disabled={!바뀜 || busy || 대기} onClick={() => set묻나(true)}>
        {t('저장 후 다음')}
      </button>
      {!묻나 ? null : (
        <확인창
          제목={t('가이드를 저장하고 다음 단계로 넘어갈까요?')}
          확인={t('저장')}
          onClose={() => set묻나(false)}
          on확인={() => {
            set묻나(false);
            on저장();
          }}
        >
          <p>{t('편집한 가이드를 저장하고 다음 단계로 넘어갑니다. 저장한 가이드는 나중에 다시 수정할 수 있습니다')}</p>
        </확인창>
      )}
    </>
  );
}

/** 작성 요청을 만들어 대기열에 넣는다 — 누르기 전에 한 번 묻는다 (2026-11-26 사용자) */
export function 작성시작({ 못보낸다, 보내는중, on보낸다 }: { 못보낸다: boolean; 보내는중: boolean; on보낸다: () => void }) {
  const t = use말();
  const [묻나, set묻나] = useState(false);
  return (
    <>
      <button className="btn" type="button" disabled={못보낸다 || 보내는중} onClick={() => set묻나(true)}>
        <기다림글자 중={보내는중} 평소={t('테스트 작성 시작')} 기다림={t('시작하는 중')} />
      </button>
      {!묻나 ? null : (
        <확인창
          제목={t('테스트 작성을 시작할까요?')}
          확인={t('작성 시작')}
          onClose={() => set묻나(false)}
          on확인={() => {
            set묻나(false);
            on보낸다();
          }}
        >
          <p>{t('작성 요청을 만들어 대기열에 넣고 작성을 시작합니다. 시작한 작성은 중단할 수 있고 보관 기간 안에는 이어서 작성할 수 있습니다')}</p>
        </확인창>
      )}
    </>
  );
}
