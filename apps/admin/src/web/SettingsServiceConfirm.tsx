// 설정 › 애플리케이션의 확인 창 자리 — 저장 단추와 비활성화 · 다시 활성화 구획 (DESIGN.md 「모달」 ①)
//
// SettingsService 가 300줄에 닿아 단추와 상자를 한 몸으로 뗐다

import { useState } from 'react';

import { 확인창 } from './ConfirmBox.js';
import { use말 } from './i18n.js';
import { 구획 } from './SettingsServiceParts.js';

/** 못 보내는 이유가 있으면 묻지 않는다 — 이유는 단추 아래 줄이 말한다. 저장도 서버를 바꾸므로 묻는다 (2026-11-26 사용자) */
export function 서비스저장단추({ 보내는중, 못보낸다, on저장 }: { 보내는중: boolean; 못보낸다: boolean; on저장: () => void }) {
  const t = use말();
  const [묻나, set묻나] = useState(false);
  return (
    <>
      <button className="btn" disabled={보내는중} onClick={() => (못보낸다 ? undefined : set묻나(true))}>
        {t('저장')}
      </button>
      {!묻나 ? null : (
        <확인창
          제목={t('애플리케이션 설정을 저장할까요?')}
          확인={t('저장')}
          onClose={() => set묻나(false)}
          on확인={() => {
            set묻나(false);
            on저장();
          }}
        >
          <p>{t('지금 화면의 값으로 애플리케이션 설정을 저장합니다. 다시 수정해 저장할 수 있습니다')}</p>
        </확인창>
      )}
    </>
  );
}

/** 저장과 다른 일이라 따로 둔다 — 적다 만 칸은 저장하지 않고 상태만 뒤집는다. 내릴 때도 다시 올릴 때도 묻는다 (2026-11-26 사용자) */
export function 활성구획({ 켜짐, 보내는중, on뒤집기 }: { 켜짐: boolean; 보내는중: boolean; on뒤집기: () => void }) {
  const t = use말();
  const [묻나, set묻나] = useState(false);
  return (
    <구획 제목={t('애플리케이션 비활성화')} 쓰임={t('비활성화하면 애플리케이션 선택 목록에서 사라집니다. 실행 기록과 케이스는 그대로 보관됩니다')} 경고>
      <div>
        <button className="btn ghost" disabled={보내는중} onClick={() => set묻나(true)}>
          {켜짐 ? t('비활성화') : t('다시 활성화')}
        </button>
      </div>
      {!묻나 ? null : (
        <확인창
          제목={켜짐 ? t('애플리케이션을 비활성화할까요?') : t('애플리케이션을 다시 활성화할까요?')}
          확인={켜짐 ? t('비활성화') : t('다시 활성화')}
          onClose={() => set묻나(false)}
          on확인={() => {
            set묻나(false);
            on뒤집기();
          }}
        >
          <p>
            {켜짐
              ? t('애플리케이션 선택 목록에서 사라집니다. 실행 기록과 케이스는 그대로 보관되고 다시 활성화할 수 있습니다')
              : t('애플리케이션 선택 목록에 다시 보입니다. 나중에 다시 비활성화할 수 있습니다')}
          </p>
        </확인창>
      )}
    </구획>
  );
}
