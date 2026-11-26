// E2E 조립 화면의 「저장」 단추와 확인 창 (DESIGN.md 「모달」 ①)
//
// 단추와 상자를 한 몸으로 둔다. ScenarioBuild 가 300줄에 닿아 단추 줄을 더 늘리지 않으려고 뗐다

import { useState } from 'react';

import { 확인창 } from './ConfirmBox.js';
import { use말 } from './i18n.js';

/** 저장할 때마다 서버에 새 버전이 남는다 — 누르기 전에 한 번 묻는다 (2026-11-26 사용자) */
export function 조립저장단추({ 이름, 잠금, 하는중, on저장 }: { 이름: string; 잠금: boolean; 하는중: boolean; on저장: () => void }) {
  const t = use말();
  const [묻나, set묻나] = useState(false);
  return (
    <>
      <button type="button" className="btn ghost" disabled={잠금} onClick={() => set묻나(true)}>
        {하는중 ? t('저장하는 중') : t('저장')}
      </button>
      {!묻나 ? null : (
        <확인창
          제목={t('「{이름}」 시나리오를 저장할까요?', { 이름: 이름.trim() })}
          확인={t('저장')}
          onClose={() => set묻나(false)}
          on확인={() => {
            set묻나(false);
            on저장();
          }}
        >
          <p>{t('지금 단계와 값 연결을 저장해 새 버전을 남깁니다. 저장한 버전은 버전 기록에서 복원할 수 있습니다')}</p>
        </확인창>
      )}
    </>
  );
}
