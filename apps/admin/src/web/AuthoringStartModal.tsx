// 「테스트 작성 시작」을 누른 직후 뜨는 상자 — 접수 확인과 Status 카드. 닫아도 작성은 계속된다 (DESIGN.md 「모달」 ① · 「작성 상태」)

import { useEffect } from 'react';

import { api, type AuthoringRow } from './api.js';
import { AuthoringStatusCard } from './AuthoringStatusCard.js';
import { 끝났나 } from './authoringView.js';
import { use말 } from './i18n.js';
import { Modal } from './Modal.js';
import { Failed, Loading, useAsync } from './ui.js';

export function AuthoringStartModal({ service, id, onClose }: { service: string; id: number; onClose: () => void }) {
  const t = use말();
  const 것 = useAsync<AuthoringRow>(() => api.authoringRequest(service, id), [service, id]);
  const reload = 것.reload;
  const 도는중 = 것.data !== null && !끝났나(것.data.status);

  // 상세 페이지와 같은 주기다. 끝나면 멈춘다 — 열어 둔 채 자리를 떠도 서버를 계속 두드리지 않는다
  useEffect(() => {
    if (!도는중) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [도는중, reload]);

  return (
    <Modal
      제목={t('테스트 작성을 시작했습니다')}
      onClose={onClose}
      버튼={
        <>
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              window.location.hash = `#/authoring/${String(id)}`;
              onClose();
            }}
          >
            {t('상세 페이지로')}
          </button>
          <button className="btn" type="button" onClick={onClose}>
            {t('닫기')}
          </button>
        </>
      }
    >
      <div className="start-ok">
        <span className="tick" aria-hidden="true">
          ✓
        </span>
        <div>
          <b>{t('#{번호} 요청이 접수됐습니다.', { 번호: id })}</b>
          <small>{t('창을 닫아도 작성은 계속됩니다. 테스트 작성 목록의 #{번호} 줄을 누르면 언제든 다시 볼 수 있습니다.', { 번호: id })}</small>
        </div>
      </div>
      {것.error !== null ? <Failed error={것.error} /> : 것.data === null ? <Loading /> : <AuthoringStatusCard 요청={것.data} 지금={Date.now()} service={service} />}
    </Modal>
  );
}
