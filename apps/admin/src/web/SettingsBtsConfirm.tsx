// 설정 › BTS 연결 화면의 확인 창 자리 — 배포 알림 토큰 발급 · 다시 발급 단추와 저장하고 자동 설정 확인 창 (DESIGN.md 「모달」 ①)
//
// SettingsBts 가 300줄에 닿아 단추와 상자를 한 몸으로 뗐다

import { useState } from 'react';

import { BTS이름 } from './btsName.js';
import { 확인창 } from './ConfirmBox.js';
import { use말 } from './i18n.js';
import { Modal } from './Modal.js';

/** 처음 발급도 서버에 토큰을 만든다 — 다시 발급처럼 늘 묻는다 (2026-11-26 사용자) */
export function 배포토큰단추({ 처음, on발급 }: { 처음: boolean; on발급: () => void }) {
  const t = use말();
  const [묻기, set묻기] = useState(false);
  const 닫기 = () => set묻기(false);
  const 발급 = () => {
    set묻기(false);
    on발급();
  };
  return (
    <>
      <button type="button" className="btn ghost" onClick={() => set묻기(true)}>
        {처음 ? t('발급') : t('다시 발급')}
      </button>
      {!묻기 ? null : 처음 ? (
        <확인창 제목={t('배포 알림 토큰을 발급할까요?')} 확인={t('발급')} onClose={닫기} on확인={발급}>
          <p>{t('deploy.sh 에 넣을 배포 알림 토큰을 만들어 원문을 한 번만 보여 줍니다. 원문을 놓치면 다시 발급해야 하고, 옛 토큰은 복원할 수 없습니다')}</p>
        </확인창>
      ) : (
        <Modal
          제목={t('배포 알림 토큰 다시 발급')}
          onClose={닫기}
          버튼={
            <>
              <button type="button" className="btn ghost" data-first onClick={닫기}>
                {t('취소')}
              </button>
              <button type="button" className="btn danger" onClick={발급}>
                {t('다시 발급')}
              </button>
            </>
          }
        >
          <p>{t('다시 발급하면 deploy.sh 에 넣어 둔 토큰은 바로 쓸 수 없습니다. 새 한 줄로 교체해야 배포 알림이 다시 옵니다')}</p>
        </Modal>
      )}
    </>
  );
}

export function 저장설정확인({ onClose, on확인 }: { onClose: () => void; on확인: () => void }) {
  const t = use말();
  return (
    <확인창 제목={t('연결을 저장하고 {bts} 자동 설정을 만들까요?', { bts: BTS이름 })} 확인={t('저장하고 자동 설정')} onClose={onClose} on확인={on확인}>
      <p>
        {t('연결 정보와 상태 매핑을 저장하고, 내 통합계정 권한으로 {bts} 에 웹훅 · 규칙 · 보드 칸 · 이슈 필드를 만듭니다. 이미 있는 항목은 만들지 않고 수정합니다', {
          bts: BTS이름,
        })}
      </p>
    </확인창>
  );
}
