// 계정 메뉴 「디바이스 팜 토큰」 창 — 내가 누른 실행이 폰을 빌릴 토큰을 넣고 지운다 (SPEC 도메인/인증 §8.6 · 도메인/러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)

import { useEffect, useState } from 'react';

import { api, ApiError } from './api.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { message } from './ui.js';

// 서버가 거절한 까닭. 문장 정본이 여기다 (도메인/인증 §8.6)
const 거절말: Record<string, string> = {
  FARM_TOKEN_SHAPE: 'pat_ 로 시작하는 토큰이 아닙니다',
  FARM_TOKEN_INVALID: '통합계정이 받지 않는 토큰입니다 — 폐기했거나 기간이 끝났을 수 있습니다',
  FARM_TOKEN_NOT_YOURS: '다른 사람의 토큰입니다 — 내 계정에서 발급한 토큰만 넣을 수 있습니다',
  AUTH_UNREACHABLE: '통합계정에 닿지 못해 토큰을 확인하지 못했습니다 — 잠시 뒤 다시 저장합니다',
};

export function FarmToken({ onClose }: { onClose: () => void }) {
  const t = use말();
  const 언어 = use언어();
  // undefined 는 아직 모른다, null 은 안 넣었다
  const [끝넷, set끝넷] = useState<string | null | undefined>(undefined);
  const [새것, set새것] = useState('');
  const [오류, set오류] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .farmToken()
      .then((r) => set끝넷(r.farmToken?.last4 ?? null))
      .catch((err: unknown) => set오류(message(err, 언어)));
  }, [언어]);

  const 거절 = (err: unknown): string => {
    const 말 = err instanceof ApiError ? 거절말[err.code] : undefined;
    return 말 === undefined ? message(err, 언어) : t(말);
  };

  async function 저장(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    set오류(null);
    try {
      const r = await api.setFarmToken(새것);
      set끝넷(r.farmToken.last4);
      set새것('');
    } catch (err) {
      set오류(거절(err));
    } finally {
      setBusy(false);
    }
  }

  async function 지운다() {
    setBusy(true);
    set오류(null);
    try {
      await api.deleteFarmToken();
      set끝넷(null);
    } catch (err) {
      set오류(message(err, 언어));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      제목={t('디바이스 팜 토큰')}
      onClose={onClose}
      버튼={
        <button className="btn ghost" type="button" onClick={onClose}>
          {t('닫기')}
        </button>
      }
    >
      <p>{t('내가 누른 실행은 이 토큰으로 디바이스 팜의 폰을 빌립니다')}</p>
      <p className="hint">{t('통합계정 「내 계정」 화면에서 개인 액세스 토큰을 발급해 붙여 넣습니다')}</p>
      <p>
        {끝넷 === undefined ? t('불러오는 중입니다') : 끝넷 === null ? t('없음 — 서버 토큰으로 빌립니다') : t('넣음 (…{끝})', { 끝: 끝넷 })}
        {typeof 끝넷 === 'string' ? (
          <button className="btn ghost" type="button" disabled={busy} onClick={() => void 지운다()}>
            {t('토큰 지우기')}
          </button>
        ) : null}
      </p>
      <form onSubmit={(e) => void 저장(e)}>
        <div className="field">
          <label htmlFor="farm-token">{t('새 토큰')}</label>
          <input
            type="password"
            id="farm-token"
            autoComplete="off"
            placeholder="pat_…"
            maxLength={200}
            value={새것}
            onChange={(e) => set새것(e.target.value)}
            aria-invalid={오류 === null ? undefined : true}
            aria-describedby={오류 === null ? undefined : 'farm-token-err'}
          />
        </div>
        {오류 === null ? null : (
          <div className="err" id="farm-token-err" role="alert">
            {오류}
          </div>
        )}
        <button className="btn" type="submit" disabled={busy || 새것.trim() === ''}>
          {t('저장')}
        </button>
      </form>
    </Modal>
  );
}
