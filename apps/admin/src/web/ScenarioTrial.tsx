// E2E 시나리오 시험 실행의 화면 조각 — 머리의 대상 서버 · 버튼, 왼쪽 요약, 오른쪽 시험 결과 탭 (도메인/시나리오 §8.11)

import type { ScenarioPart, ScenarioPartResult } from '@platform/kit';

import type { EnvRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { scenarioApi } from './scenarioApi.js';
import { 가리킴빈곳, 종류글 } from './scenarioView.js';
import { seconds, Verdict } from './ui.js';
import type { 시험상태 } from './useScenarioTrial.js';

/** 서버를 부르기 전에 걸러 낼 사유. 서버가 같은 것을 400 으로 거절하지만 그 문장은 영어 원문이다 */
export function 시험막는글(
  t: (키: string, 값?: { 번호: number }) => string,
  서버: string,
  단계들: ScenarioPart[],
  칸오류번호: number | null,
): string | null {
  if (서버 === '') return t('시험 실행할 대상 서버를 먼저 고릅니다');
  if (단계들.length === 0) return t('단계를 하나 이상 넣어야 시험 실행할 수 있습니다');
  if (가리킴빈곳(단계들).length > 0) return t('가져올 단계를 다시 골라야 시험 실행할 수 있습니다');
  if (칸오류번호 !== null) return t('{번호}번 단계의 잘못 적은 칸을 고쳐야 시험 실행할 수 있습니다', { 번호: 칸오류번호 });
  return null;
}

export function TrialControls({
  서버들,
  서버,
  on서버,
  도는중,
  on시작,
}: {
  서버들: EnvRow[];
  서버: string;
  on서버: (env: string) => void;
  도는중: boolean;
  on시작: () => void;
}) {
  const t = use말();
  return (
    <>
      <select aria-label={t('대상 서버')} value={서버} onChange={(e) => on서버(e.target.value)}>
        <option value="">{t('선택하세요')}</option>
        {서버들.map((s) => (
          <option key={s.env} value={s.env}>
            {s.env}
          </option>
        ))}
      </select>
      <button type="button" className="btn ghost" disabled={도는중} onClick={on시작}>
        {도는중 ? t('시험 실행 중') : t('시험 실행')}
      </button>
    </>
  );
}

export function TrialSummary({ 시험, on자세히 }: { 시험: 시험상태; on자세히: () => void }) {
  const t = use말();
  const 언어 = use언어();
  if (시험.단계 === 'running') {
    return (
      <p className="scn-trial-sum" role="status">
        {t('시험 실행 중입니다')}
      </p>
    );
  }
  if (시험.단계 !== 'done' || 시험.결과 === null) return null;
  const 결과 = 시험.결과;
  const 실패 = 결과.parts.find((p) => p.status === 'FAIL');
  const 문장 =
    실패 !== undefined
      ? t('{번호}번에서 실패', { 번호: 실패.seq })
      : 결과.status === 'PASS'
        ? t('모두 통과')
        : (결과.error?.message ?? '');
  return (
    <div className="scn-trial-sum">
      <p>{t('시험 실행 · {서버} · {초}', { 서버: 시험.env, 초: seconds(결과.durationMs, 언어) })}</p>
      {문장 === '' ? null : <p className={결과.status === 'PASS' ? undefined : 'scn-trial-fail'}>{문장}</p>}
      <button type="button" className="btn ghost" onClick={on자세히}>
        {t('자세히')}
      </button>
    </div>
  );
}

export function TrialTab({ 시험, 단계들 }: { 시험: 시험상태; 단계들: ScenarioPart[] }) {
  const t = use말();
  const 결과 = 시험.결과;
  return (
    <div className="scn-trial">
      <p className="scn-trial-intro">
        {t('시험 실행은 기록에 남지 않고 증적도 만들지 않습니다. 저장하지 않은 변경 내용으로도 실행해 볼 수 있습니다')}
      </p>
      {시험.단계 === 'running' ? (
        <p className="scn-trial-intro" role="status">
          {t('시험 실행 중입니다')}
        </p>
      ) : 시험.단계 !== 'done' || 결과 === null ? (
        <p className="scn-trial-intro">{t('아직 시험 실행을 하지 않았습니다')}</p>
      ) : (
        <>
          {결과.error === undefined ? null : <p className="scn-trial-fail">{결과.error.message}</p>}
          <ol className="scn-steps">
            {결과.parts.map((p) => (
              <TrialRow key={p.seq} part={p} 종류={단계들[p.seq - 1]?.kind} trialId={시험.trialId} />
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function TrialRow({
  part,
  종류,
  trialId,
}: {
  part: ScenarioPartResult;
  종류: ScenarioPart['kind'] | undefined;
  trialId: string | null;
}) {
  const t = use말();
  const 언어 = use언어();
  const 안돌았다 = part.status === 'NA' && part.error?.message === 'NOT_RUN';
  const 사유 = part.error?.message ?? '';
  // 사진은 실패한 절차의 순번으로 저장된다. 부품 번호와 다르다
  const 실패절차 = part.steps.find((s) => s.status === 'FAIL');
  return (
    <li className="scn-part">
      <div className="scn-part-head">
        <span className="scn-seq">{part.seq}</span>
        {종류 === undefined ? null : <span className="tech-tag">{t(종류글[종류])}</span>}
        <span className="scn-end">
          {안돌았다 ? <span className="scn-notrun">{t('– 실행 안 됨')}</span> : <Verdict status={part.status} />}
          {안돌았다 ? null : <span className="scn-dur">{seconds(part.durationMs, 언어)}</span>}
        </span>
      </div>
      {part.status !== 'FAIL' || 사유 === '' ? null : <pre className="scn-error">{사유}</pre>}
      {part.status !== 'NA' || 안돌았다 || 사유 === '' ? null : (
        <div className="scn-detail">
          <span className="scn-k">{t('실행이 멈춘 사유')}</span>
          <div className="scn-v">{사유}</div>
        </div>
      )}
      {part.status !== 'FAIL' || 실패절차 === undefined || trialId === null || 종류 !== 'case' ? null : (
        <a className="scn-shot" href={scenarioApi.trialShot(trialId, 실패절차.seq)} target="_blank" rel="noreferrer">
          {t('실패 화면 보기')}
        </a>
      )}
    </li>
  );
}
