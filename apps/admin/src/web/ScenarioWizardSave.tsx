// E2E 마법사 본문 「저장」 — 시나리오 이름 · 앞 단계 요약과 「수정」 · 저장한 뒤 다음 길 (도메인/시나리오 §8.11 「마법사」)

import type { ReactNode } from 'react';

import type { Platform } from './api.js';
import { use말, use언어 } from './i18n.js';
import { TrialControls } from './ScenarioTrial.js';
import type { 마법사단계 } from './ScenarioWizardHelp.js';
import { PLATFORM_LABEL, seconds } from './ui.js';
import type { 시험상태 } from './useScenarioTrial.js';

interface Props {
  이름: string;
  on이름: (이름: string) => void;
  /** AI 후보를 골랐으면 그 이름. 직접 골랐으면 null */
  후보이름: string | null;
  앱: string;
  디바이스: Platform;
  단계이름들: string[];
  연결수: number;
  이어받기: boolean;
  /** 지금 조립으로 돌린 시험. 단계를 바꿨으면 부르는 쪽이 비운 상태다 */
  시험: 시험상태;
  on수정: (곳: 마법사단계) => void;
  /** 저장하고 실행을 눌렀는데 대상 서버가 없을 때 여는 고르개. 안 열면 null */
  서버칸: { 서버들: { env: string; 없는곳: string[] }[]; 서버: string; on서버: (env: string) => void } | null;
  저장됨: { id: number; version: number; 이름: string } | null;
}

export function 저장칸(p: Props) {
  const t = use말();
  const 언어 = use언어();
  if (p.저장됨 !== null) {
    return (
      <div className="scw-res pass" role="status">
        <b>{t('「{이름}」 시나리오를 저장했습니다 · v{버전}', { 이름: p.저장됨.이름, 버전: p.저장됨.version })}</b>
        <span>{t('실행할 때마다 실행 기록과 리포트가 남습니다. 다음에 고칠 때는 조립 화면에서 바로 고칩니다')}</span>
        <div className="scw-link-acts">
          <a className="btn" href={`#/scenarios/${p.저장됨.id}`}>
            {t('조립 화면에서 열기')}
          </a>
          <a className="btn ghost" href="#/scenarios">
            {t('목록으로')}
          </a>
        </div>
      </div>
    );
  }
  const 결과 = p.시험.단계 === 'done' ? p.시험.결과 : null;
  const 시험줄 =
    결과 === null
      ? t('안 함')
      : 결과.status === 'PASS'
        ? t('통과 · {서버} · {초}', { 서버: p.시험.env, 초: seconds(결과.durationMs, 언어) })
        : t('{번호}번에서 멈춤 · {서버}', { 번호: 결과.parts.find((x) => x.status === 'FAIL')?.seq ?? 결과.parts.length, 서버: p.시험.env });
  const 줄들: { 곳: 마법사단계; 값: ReactNode }[] = [
    { 곳: 'start', 값: p.후보이름 === null ? t('직접 고름') : t('AI 추천 · {이름}', { 이름: p.후보이름 }) },
    { 곳: 'start', 값: `${p.앱} · ${t(PLATFORM_LABEL[p.디바이스])}` },
    {
      곳: 'steps',
      값: (
        <>
          {t('단계 {수}개', { 수: p.단계이름들.length })}
          <span className="wz-chips">
            {p.단계이름들.map((n, i) => (
              <span key={`${i}-${n}`} className="wz-chip">
                {n}
              </span>
            ))}
          </span>
        </>
      ),
    },
    { 곳: 'values', 값: [t('값 연결 {수}곳', { 수: p.연결수 }), ...(p.이어받기 ? [t('로그인 이어받기')] : [])].join(' · ') },
    { 곳: 'trial', 값: 시험줄 },
  ];
  const 이름표 = ['시작 방법', '애플리케이션', '단계§마법사', '값 연결', '시험 실행'];
  return (
    <>
      <div className="scw-field">
        <label className="scw-label" htmlFor="scw-name">
          {t('시나리오 이름')}
        </label>
        <input
          id="scw-name"
          type="text"
          autoComplete="off"
          value={p.이름}
          placeholder={t('예: 신규 회원 첫 주문')}
          aria-describedby="scw-name-hint"
          onChange={(e) => p.on이름(e.target.value)}
        />
        <span className="hint" id="scw-name-hint">
          {t('목록과 실행 기록에 보이는 이름입니다')}
        </span>
      </div>
      <dl className="scw-sum">
        {줄들.map((줄, i) => (
          <div key={이름표[i]}>
            <dt>{t(이름표[i]!)}</dt>
            <dd>{줄.값}</dd>
            <button type="button" className="btn ghost" aria-label={t('{이름} 수정', { 이름: t(이름표[i]!) })} onClick={() => p.on수정(줄.곳)}>
              {t('수정')}
            </button>
          </div>
        ))}
      </dl>
      {p.서버칸 === null ? null : (
        <div className="scw-row">
          <TrialControls {...p.서버칸} 도는중 on시작={() => undefined} />
        </div>
      )}
    </>
  );
}

