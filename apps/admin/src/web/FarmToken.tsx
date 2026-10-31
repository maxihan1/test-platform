// 계정 메뉴 「디바이스 팜 토큰」 창 — 내가 누른 실행이 폰을 빌릴 토큰을 넣고 지운다 (SPEC 도메인/인증 §8.6 · 도메인/러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)

import { useEffect, useState } from 'react';

import { api, ApiError } from './api.js';
import { BTS이름 } from './btsName.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { message } from './ui.js';

// 서버가 거절한 까닭. 문장 정본이 여기다 (도메인/인증 §8.6)
const 거절말: Record<string, string> = {
  FARM_TOKEN_SHAPE: 'pat_ 로 시작하는 토큰이 아닙니다',
  FARM_TOKEN_INVALID: '통합계정이 받지 않는 토큰입니다 — 폐기했거나 기간이 끝났을 수 있습니다',
  FARM_TOKEN_NOT_YOURS: '다른 사람의 토큰입니다 — 내 계정에서 발급한 토큰만 넣을 수 있습니다',
  AUTH_UNREACHABLE: '통합계정에 닿지 못해 토큰을 확인하지 못했습니다 — 잠시 뒤 저장을 다시 눌러 주세요',
};

export function FarmToken({ onClose }: { onClose: () => void }) {
  const t = use말();
  const 언어 = use언어();
  // undefined 는 아직 모른다, null 은 안 넣었다
  const [끝넷, set끝넷] = useState<string | null | undefined>(undefined);
  const [새것, set새것] = useState('');
  const [오류, set오류] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 지금 토큰을 버리는 두 일은 창 안 줄로 한 번 묻는다 — 이 창(②) 위에 확인 창을 겹치지 않는다 (DESIGN.md 「휴대폰의 창」)
  const [묻는것, set묻는것] = useState<'바꾸기' | '지우기' | null>(null);

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

  function 저장누름(e: React.FormEvent) {
    e.preventDefault();
    if (typeof 끝넷 === 'string') set묻는것('바꾸기');
    else void 저장();
  }

  async function 저장() {
    set묻는것(null);
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
    set묻는것(null);
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
      제목={t('통합계정 토큰')}
      onClose={onClose}
      버튼={
        <button className="btn ghost" type="button" onClick={onClose}>
          {t('닫기')}
        </button>
      }
    >
      <p>{t('내가 누른 실행이 디바이스 팜의 폰을 빌릴 때와 {bts} 자동 설정을 할 때 이 토큰을 씁니다', { bts: BTS이름 })}</p>
      <p className="hint">{t('통합계정 「내 계정」 화면에서 개인 액세스 토큰을 발급해 붙여 넣습니다')}</p>
      <p>
        {/* 읽기가 실패하면 아래 오류 줄이 까닭을 말한다 — 불러오는 중으로 남겨 두지 않는다 */}
        {끝넷 === undefined ? (오류 === null ? t('불러오는 중입니다') : null) : 끝넷 === null ? t('없음 — 서버 토큰으로 빌립니다') : t('넣음 (…{끝})', { 끝: 끝넷 })}
        {typeof 끝넷 === 'string' ? (
          <button className="btn ghost" type="button" disabled={busy} onClick={() => set묻는것('지우기')}>
            {t('토큰 지우기')}
          </button>
        ) : null}
      </p>
      {묻는것 === null || typeof 끝넷 !== 'string' ? null : (
        <div className="farm-ask">
          <span>
            {묻는것 === '바꾸기'
              ? t('지금 토큰(…{끝})을 버리고 새 토큰으로 바꿀까요?', { 끝: 끝넷 })
              : t('지금 토큰(…{끝})을 지울까요? 지우면 서버 토큰으로 빌립니다', { 끝: 끝넷 })}
          </span>
          <button className="btn ghost small" type="button" onClick={() => set묻는것(null)}>
            {t('아니오')}
          </button>
          <button className="btn small" type="button" disabled={busy} onClick={() => void (묻는것 === '바꾸기' ? 저장() : 지운다())}>
            {묻는것 === '바꾸기' ? t('바꾸기') : t('토큰 지우기')}
          </button>
        </div>
      )}
      <form onSubmit={저장누름}>
        <div className="field">
          <label htmlFor="farm-token">{t('새 토큰')}</label>
          <input
            type="password"
            id="farm-token"
            autoComplete="off"
            placeholder="pat_…"
            maxLength={200}
            value={새것}
            onChange={(e) => {
              set새것(e.target.value);
              if (묻는것 === '바꾸기') set묻는것(null);
            }}
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
