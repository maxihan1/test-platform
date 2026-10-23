// E2E 마법사 본문 「시험 실행」 — 대상 서버 · 시험 실행 단추 · 끝까지 이어졌는지 · 멈춘 곳과 고칠 곳 · 값 연결이 쓰였는지 · 단계 줄 (도메인/시나리오 §8.11 「마법사」)

import type { ScenarioPart } from '@platform/kit';

import type { Platform } from './api.js';
import { 실패이유 } from './FailureWhy.js';
import { use말, use언어 } from './i18n.js';
import { 멈춘사유글자 } from './scenarioResultView.js';
import { 멈춘단계 } from './ScenarioResultNext.js';
import { TrialControls, TrialTab } from './ScenarioTrial.js';
import type { 재료들 } from './scenarioView.js';
import { 종류이름 } from './ScenarioWizardValues.js';
import { 가져올번호, 멈춘까닭, 연결들, 쓰였나 } from './scenarioWizardView.js';
import { PLATFORM_LABEL, seconds } from './ui.js';
import type { 시험상태 } from './useScenarioTrial.js';

interface Props {
  /** 지금 단계들로 돌린 시험만. 단계를 바꿨으면 부르는 쪽이 비운 상태를 넘긴다 */
  시험: 시험상태;
  서버들: { env: string; 없는곳: string[] }[];
  서버: string;
  on서버: (env: string) => void;
  /** 지난번 고른 서버를 미리 골라 둔 것인가 */
  미리: boolean;
  막는글: string | null;
  단계들: ScenarioPart[];
  디바이스: Platform;
  재료: 재료들;
  이름: (번호: number) => string;
  on시작: () => void;
  on간다: (곳: 'steps' | 'values') => void;
}

export function 시험칸(p: Props) {
  const t = use말();
  const 언어 = use언어();
  const 결과 = p.시험.단계 === 'done' ? p.시험.결과 : null;
  // 제한 시간 초과 · 러너 거절은 그 단계가 NA 로 온다 — 결과 화면과 같은 고르기로 멈춘 단계를 찾는다
  const 실패 = 결과 === null ? undefined : (멈춘단계(결과.parts) ?? undefined);
  const 연결 = 연결들(p.단계들);

  const 쓰임줄 =
    결과 === null || 연결.length === 0 ? null : (
      <ul className="scw-used">
        {연결.map(({ 받는번호, link, 자리 }) => {
          const 앞 = 가져올번호(link);
          return (
            <li key={`${받는번호}-${자리}`}>
              {앞 === null ? t('{번호}번', { 번호: 받는번호 }) : t('{받는}번 ← {앞}번', { 받는: 받는번호, 앞 })} · {t(종류이름[link.kind])} · {쓰였나(결과, 받는번호, link, 언어)}
            </li>
          );
        })}
      </ul>
    );
  const 고칠곳 = (
    <div className="scw-link-acts">
      <button type="button" className="btn ghost" onClick={() => p.on간다('steps')}>
        {t('단계로 가기')}
      </button>
      <button type="button" className="btn ghost" onClick={() => p.on간다('values')}>
        {t('값 연결로 가기')}
      </button>
    </div>
  );

  return (
    <div className="scw-trial">
      <div className="scw-row">
        <TrialControls 서버들={p.서버들} 서버={p.서버} on서버={p.on서버} 도는중={p.시험.단계 === 'running'} on시작={p.on시작} 다시={결과 !== null} />
      </div>
      {p.미리 ? <p className="hint">{t('지난번에 고른 서버를 미리 골라 두었습니다')}</p> : null}
      {p.막는글 === null ? null : (
        <p className="err" role="alert">
          {p.막는글}
        </p>
      )}
      {p.시험.단계 === 'failed' && p.시험.오류문장 !== null ? (
        <p className="err" role="alert">
          {p.시험.오류문장}
        </p>
      ) : null}
      <p className="scw-count">{t('{수}단계 · {디바이스}', { 수: p.단계들.length, 디바이스: t(PLATFORM_LABEL[p.디바이스]) })}</p>

      {결과 === null ? null : 결과.status === 'PASS' ? (
        <div className="scw-res pass" role="status">
          <b>{t('끝까지 이어졌습니다 · {수}단계 · {초}', { 수: p.단계들.length, 초: seconds(결과.durationMs, 언어) })}</b>
          {쓰임줄}
        </div>
      ) : (
        <div className="scw-res fail" role="status">
          <b>
            {실패 === undefined
              ? 멈춘사유글자(결과.error?.message ?? '', 언어)
              : t('{번호}번 「{이름}」에서 멈췄습니다', { 번호: 실패.seq, 이름: p.이름(실패.seq) })}
          </b>
          {실패 === undefined ? null : <실패이유 failure={멈춘까닭(실패)} />}
          <span className="scw-label">{t('이렇게 해 보세요')}</span>
          <ul>
            <li>{t('이 케이스만 따로 돌려 통과하는지 먼저 봅니다')}</li>
            <li>{t('넘겨받을 값이 비었는지 「값 연결」에서 확인합니다')}</li>
          </ul>
          {쓰임줄}
          {고칠곳}
        </div>
      )}
      <TrialTab 시험={p.시험} 단계들={p.단계들} 재료={p.재료} />
    </div>
  );
}
