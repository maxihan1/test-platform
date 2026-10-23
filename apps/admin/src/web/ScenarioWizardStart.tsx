// E2E 마법사 본문 「시작 방법」(카드 둘 · 애플리케이션 · 디바이스)과 「AI 추천」(확인하고 싶은 흐름 · 기다림 · 후보 카드) (도메인/시나리오 §8.11 「마법사」)

import type { Platform } from './api.js';
import { use말 } from './i18n.js';
import type { 앱줄 } from './scenarioView.js';
import { 체크그림 } from './SettingsWizardSteps.js';
import { PLATFORM_LABEL, PLATFORMS } from './ui.js';
import type { 흐름일 } from './useFlowSuggest.js';

export type 시작방법 = 'ai' | 'manual';

const 그림 = {
  ai: (
    <svg className="scw-ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5" />
    </svg>
  ),
  manual: (
    <svg className="scw-ic" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <path d="M6 8v8M11 6h9M11 12h6M11 18h9" />
    </svg>
  ),
};

const 카드들: { 값: 시작방법; 이름: string; 한줄: string; 예: string; 언제: string }[] = [
  {
    값: 'ai',
    이름: 'AI 추천으로 시작',
    한줄: 'AI 가 테스트와 요구사항을 읽고 흐름 후보를 골라 줍니다',
    예: '후보 2~3개 · 몇 분 걸립니다',
    언제: '무엇부터 이어야 할지 모를 때 고릅니다',
  },
  {
    값: 'manual',
    이름: '직접 고르기',
    한줄: '첫 단계부터 하나씩 이어 붙입니다',
    예: '이어지는 화면을 따라 다음 단계를 추천합니다',
    언제: '확인할 흐름이 이미 정해져 있을 때 고릅니다',
  },
];

export function 시작칸(p: {
  방법: 시작방법 | null;
  서비스: string;
  디바이스: Platform;
  앱들: readonly 앱줄[];
  on방법: (방법: 시작방법) => void;
  on서비스: (서비스: string) => void;
  on디바이스: (디바이스: Platform) => void;
}) {
  const t = use말();
  return (
    <>
      <div className="wz-kinds" role="group" aria-label={t('시작 방법')}>
        {카드들.map((c) => (
          <button key={c.값} type="button" className="wz-kind" aria-pressed={p.방법 === c.값} onClick={() => p.on방법(c.값)}>
            <span className="wz-kind-h">
              {그림[c.값]}
              {t(c.이름)}
            </span>
            <p>{t(c.한줄)}</p>
            <span className="wz-eg">{t(c.예)}</span>
            <span className="wz-what">{t(c.언제)}</span>
            <span className="wz-tick">{체크그림}</span>
          </button>
        ))}
      </div>
      <label className="scw-field">
        <span className="scw-label">{t('애플리케이션')}</span>
        <select value={p.서비스} onChange={(e) => p.on서비스(e.target.value)}>
          {p.앱들.map((a) => (
            <option key={a.prefix} value={a.prefix}>
              {a.name} · {a.prefix}
            </option>
          ))}
        </select>
        <span className="hint">{t('다른 애플리케이션의 케이스도 단계에서 섞을 수 있습니다')}</span>
      </label>
      <div className="scw-field">
        <span className="scw-label" id="scw-device">
          {t('디바이스')}
        </span>
        <div className="scw-opts" role="group" aria-labelledby="scw-device">
          {PLATFORMS.map((d) => (
            <button key={d} type="button" className="scw-opt" aria-pressed={p.디바이스 === d} onClick={() => p.on디바이스(d)}>
              {t(PLATFORM_LABEL[d])}
            </button>
          ))}
        </div>
        <span className="hint">{t('그 디바이스에서 도는 케이스만 단계로 고를 수 있습니다')}</span>
      </div>
    </>
  );
}

export function AI칸(p: {
  흐름: 흐름일;
  바람: string;
  on바람: (글: string) => void;
  고른후보: number | null;
  on후보: (i: number) => void;
  on다시: () => void;
  on직접: () => void;
}) {
  const t = use말();
  const { 흐름 } = p;
  const 결과 = 흐름.결과;
  const 후보들 = 결과?.status === 'DONE' ? 결과.candidates : null;
  const 직접단추 = (
    <button type="button" className="btn ghost" onClick={p.on직접}>
      {t('직접 고르기로 바꾸기')}
    </button>
  );
  return (
    <>
      <div className="scw-field">
        <label className="scw-label" htmlFor="scw-wish">
          {t('확인하고 싶은 흐름')} <span className="wz-badge">{t('선택§빈칸')}</span>
        </label>
        <div className="scw-row">
          <input
            id="scw-wish"
            type="text"
            autoComplete="off"
            maxLength={200}
            value={p.바람}
            placeholder={t('예: 쿠폰을 쓰고 결제까지')}
            onChange={(e) => p.on바람(e.target.value)}
          />
          <button type="button" className="btn ghost" disabled={흐름.도나} onClick={p.on다시}>
            {t('다시 추천받기')}
          </button>
        </div>
        <span className="hint">{t('적어 두면 그 흐름에 가까운 후보를 먼저 고릅니다')}</span>
      </div>

      {흐름.꺼짐 ? (
        <div className="scw-box" role="alert">
          <b>{t('AI 추천을 지금 쓸 수 없습니다')}</b>
          {직접단추}
        </div>
      ) : 흐름.오류 !== null || 결과?.status === 'FAILED' ? (
        <div className="scw-box" role="alert">
          <span className="err">{흐름.오류 ?? 결과?.error}</span>
          {직접단추}
        </div>
      ) : 흐름.도나 || 후보들 === null ? (
        <div className="scw-box scw-wait" role="status">
          <span className="scw-bar" aria-hidden="true">
            <i />
          </span>
          {결과 === null ? null : <b>{t('테스트 {테스트}건 · 화면 연결 {연결}건을 읽는 중입니다', { 테스트: 결과.material.cases, 연결: 결과.material.links })}</b>}
          <span className="hint">{t('작성 에이전트가 처리합니다. 보통 몇 분 걸립니다')}</span>
        </div>
      ) : (
        <div className="scw-cands" role="group" aria-label={t('흐름 후보')}>
          {후보들.map((c, i) => (
            <button key={c.name} type="button" className="scw-cand" aria-pressed={p.고른후보 === i} onClick={() => p.on후보(i)}>
              <span className="wz-tick">{체크그림}</span>
              <b>{c.name}</b>
              <span className="scw-why">{c.why}</span>
              <span className="wz-chips">
                {c.steps.map((s, j) => (
                  <span key={s.tcId} className="wz-chips">
                    {j === 0 ? null : (
                      <span className="wz-arrow" aria-hidden="true">
                        →
                      </span>
                    )}
                    <span className="wz-chip">{s.name}</span>
                  </span>
                ))}
              </span>
              <span className="hint">{t('단계 {단계}개 · 값 연결 {연결}곳 · 요구 {요구}건', { 단계: c.steps.length, 연결: c.links.length, 요구: c.reqIds.length })}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
