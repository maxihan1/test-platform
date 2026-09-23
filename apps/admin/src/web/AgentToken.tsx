// 설정 > 계정 편집의 에이전트 토큰 발급·다시 발급·취소 부품과 한 번만 보이는 토큰 상자

import { useEffect, useRef, useState } from 'react';

import { api, type UserRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 오류문장 } from './SettingsService.js';

export interface 발급토큰 {
  username: string;
  token: string;
}

/**
 * 토큰은 **이 자리에서 한 번만** 보인다. TempPassword 와 같은 이유로 끌어오고 포커스를 옮긴다.
 * 복사 버튼은 두지 않는다 — clipboard API 는 http 서버에서 막혀 누른 사람만 헛돈다.
 */
export function AgentTokenBox({ 것, onClose }: { 것: 발급토큰; onClose: () => void }) {
  const t = use말();
  const 상자 = useRef<HTMLDivElement>(null);
  useEffect(() => {
    상자.current?.scrollIntoView({ block: 'center' });
    상자.current?.focus();
  }, [것.username, 것.token]);

  return (
    // `ref` 가 맨 앞이어야 한다 — SettingsPassword.tsx 의 같은 자리 주석
    <div ref={상자} className="set-pw" tabIndex={-1} role="alert" aria-live="assertive">
      <div>
        <b>{것.username}</b> {t('의 에이전트 토큰입니다. 선택해 복사하세요')}
      </div>
      <code>{것.token}</code>
      <div className="hint">
        {t('맥 에이전트 첫 실행에서 한 번 붙여넣습니다. 방법은 docs/SETUP.md 8절')}{' '}
        <b>{t('닫으면 다시 볼 수 없습니다')}</b>
      </div>
      <button className="btn ghost" onClick={onClose}>
        {t('적었습니다')}
      </button>
    </div>
  );
}

/** 할 수 없는 계정에는 흐리게가 아니라 아예 안 그린다 (SPEC §8.2) */
export function AgentToken({
  row,
  onIssued,
  onChanged,
}: {
  row: UserRow;
  onIssued: (것: 발급토큰) => void;
  onChanged: () => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const [확인, set확인] = useState<'reissue' | 'revoke' | null>(null);
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 작성 계정이 바뀌어 토큰만 남은 계정에도 그린다 — 안 그리면 남은 토큰을 아무도 못 지운다 (취소만 보인다)
  const 작성계정 = row.isAuthoringAgent === true && row.isActive;
  if (!작성계정 && row.hasAgentToken !== true) return null;

  async function 한다(일: () => Promise<void>) {
    set보내는중(true);
    setErr(null);
    try {
      await 일();
      set확인(null);
      onChanged();
    } catch (e) {
      setErr(오류문장(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  const 발급 = () =>
    한다(async () => {
      const { agentToken } = await api.issueAgentToken(row.username);
      onIssued({ username: row.username, token: agentToken });
    });
  const 취소 = () => 한다(() => api.revokeAgentToken(row.username));

  return (
    <div className="set-form">
      <div className="field">
        <span className="field-label">{t('에이전트 토큰')}</span>
        <div>
          {확인 === null ? (
            <>
              <span className="hint">{row.hasAgentToken === true ? t('토큰 있음') : t('토큰 없음')}</span>{' '}
              {row.hasAgentToken === true ? (
                <>
                  {작성계정 ? (
                    <>
                      <button className="btn ghost" disabled={보내는중} onClick={() => set확인('reissue')}>
                        {t('다시 발급')}
                      </button>{' '}
                    </>
                  ) : null}
                  <button className="btn ghost" disabled={보내는중} onClick={() => set확인('revoke')}>
                    {t('토큰 취소')}
                  </button>
                </>
              ) : (
                <button className="btn ghost" disabled={보내는중} onClick={() => void 발급()}>
                  {t('발급')}
                </button>
              )}
            </>
          ) : (
            // 결과를 먼저 말하고 확정 버튼은 글자가 다른 따로 된 버튼으로 둔다.
            // 같은 버튼을 두 번 누르게 하는 방식은 사용자가 헷갈렸다 (게이트 1)
            <div className="set-warn">
              {t('맥 에이전트가 지금 멈춥니다.')}{' '}
              {확인 === 'reissue' ? t('새 토큰을 맥에 다시 넣어야 합니다') : t('다시 발급할 때까지 작성이 멈춥니다')}{' '}
              <button
                className="btn ghost set-warn"
                disabled={보내는중}
                onClick={() => void (확인 === 'reissue' ? 발급() : 취소())}
              >
                {확인 === 'reissue' ? t('다시 발급한다') : t('취소한다')}
              </button>{' '}
              <button className="btn ghost" disabled={보내는중} onClick={() => set확인(null)}>
                {t('그만두기')}
              </button>
            </div>
          )}
        </div>
      </div>
      {err === null ? null : <div className="err">{err}</div>}
    </div>
  );
}
