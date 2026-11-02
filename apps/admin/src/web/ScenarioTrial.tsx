// E2E 시나리오 시험 실행의 화면 조각 — 머리의 대상 서버 · 버튼, 왼쪽 요약, 오른쪽 시험 결과 탭 (도메인/시나리오 §8.11)

import type { ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';

import { use말, use언어 } from './i18n.js';
import { scenarioApi, type TrialResult } from './scenarioApi.js';
import { PartTrace } from './ScenarioResultPart.js';
import { 멈춘사유글자 } from './scenarioResultView.js';
import { 가리킴빈곳, 종류글, 카드요약, type 재료들 } from './scenarioView.js';
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

/**
 * 앱 · 게임 단계가 있는 시나리오의 실행 위치 안내. 정식 실행은 늘 디바이스 팜이라 고를 것이 없어 안내 한 줄이다.
 * 시험 실행은 내 컴퓨터 러너가 켜져 있으면 거기 꽂은 폰에서 돈다 (도메인/시나리오 §3.7 결정 16)
 */
export function 폰실행위치({ 시험 = true }: { 시험?: boolean }) {
  const t = use말();
  return (
    <div className="hint">
      {t('실행 위치 · Device VISION')}
      <div>{t('시나리오 하나 동안 빈 폰을 한 번 잡고 다 돌면 놓습니다. 화면 영상과 logcat 은 통과하지 못한 실행에 남습니다')}</div>
      {시험 ? <div>{t('시험 실행은 내 컴퓨터 테스트 실행기가 켜져 있으면 거기 꽂은 폰에서, 꺼져 있으면 Device VISION 에서 돕니다')}</div> : null}
    </div>
  );
}

export function TrialControls({
  서버들,
  서버,
  on서버,
  도는중,
  on시작,
  다시 = false,
}: {
  /** 없는곳이 있으면 그 이름은 못 고른다 — 든 애플리케이션 가운데 그 이름의 대상 서버가 없는 곳 (도메인/시나리오 §3.7 결정 13) */
  서버들: { env: string; 없는곳?: string[] }[];
  서버: string;
  on서버: (env: string) => void;
  도는중: boolean;
  on시작: () => void;
  /** 끝난 시험이 있으면 단추가 「다시 돌리기」다 — 마법사 (도메인/시나리오 §8.11 「마법사」) */
  다시?: boolean;
}) {
  const t = use말();
  return (
    <>
      <select aria-label={t('대상 서버')} value={서버} onChange={(e) => on서버(e.target.value)}>
        <option value="">{t('선택하세요')}</option>
        {서버들.map((s) => (
          <option key={s.env} value={s.env} disabled={(s.없는곳?.length ?? 0) > 0}>
            {(s.없는곳?.length ?? 0) === 0 ? s.env : t('{서버} · {앱}에 없음', { 서버: s.env, 앱: s.없는곳!.join(', ') })}
          </option>
        ))}
      </select>
      {/* 옆의 「실행」과 무엇이 다른지 단추에서 알 수 있게 한다 */}
      <button type="button" className="btn ghost" title={t('기록 · 리포트가 남지 않습니다')} disabled={도는중} onClick={on시작}>
        {도는중 ? t('시험 실행 중') : 다시 ? t('다시 돌리기') : t('시험 실행')}
      </button>
    </>
  );
}

// 실패 색은 FAIL 일 때만이다. 시간 초과 · 러너 거절 같은 NA 는 판정 없음 색이다
const 오류칠 = (status: ScenarioExecuteResponse['status']) => (status === 'NA' ? 'scn-trial-na' : 'scn-trial-fail');

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
      ? t('{번호}번에서 멈춤', { 번호: 실패.seq })
      : 결과.status === 'PASS'
        ? t('모두 통과')
        : 멈춘사유글자(결과.error?.message ?? '', 언어);
  return (
    <div className="scn-trial-sum">
      <p>{t('시험 실행 · {서버} · {초}', { 서버: 시험.env, 초: seconds(결과.durationMs, 언어) })}</p>
      {문장 === '' ? null : <p className={결과.status === 'PASS' ? undefined : 오류칠(결과.status)}>{문장}</p>}
      <button type="button" className="btn ghost" onClick={on자세히}>
        {t('자세히')}
      </button>
    </div>
  );
}

export function TrialTab({ 시험, 단계들, 재료 }: { 시험: 시험상태; 단계들: ScenarioPart[]; 재료: 재료들 }) {
  const t = use말();
  const 언어 = use언어();
  const 결과 = 시험.결과;
  const 돌린단계 = 시험.단계들 ?? 단계들;
  return (
    <div className="scn-trial">
      <p className="scn-trial-intro">
        {t('시험 실행은 기록에 남지 않고 리포트도 만들지 않습니다. 저장하지 않은 변경 내용으로도 실행해 볼 수 있습니다')}
      </p>
      {시험.단계 === 'running' ? (
        <p className="scn-trial-intro" role="status">
          {t('시험 실행 중입니다')}
        </p>
      ) : 시험.단계 !== 'done' || 결과 === null ? (
        <p className="scn-trial-intro">{t('아직 시험 실행을 하지 않았습니다')}</p>
      ) : (
        <>
          {결과.error === undefined ? null : <p className={오류칠(결과.status)}>{멈춘사유글자(결과.error.message, 언어)}</p>}
          <ol className="scn-steps">
            {결과.parts.map((p) => (
              <TrialRow key={p.seq} part={p} 단계={돌린단계[p.seq - 1]} 재료={재료} trialId={시험.trialId} />
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function TrialRow({
  part,
  단계,
  재료,
  trialId,
}: {
  part: TrialResult['parts'][number];
  단계: ScenarioPart | undefined;
  재료: 재료들;
  trialId: string | null;
}) {
  const t = use말();
  const 언어 = use언어();
  const 종류 = 단계?.kind;
  // 실행 결과 화면의 단계 줄과 같은 이름이다. 재료가 없으면 번호만 보인다
  const 이름 =
    단계 === undefined ? null : 단계.kind === 'case' ? (
      <>
        <b className="scn-id">{단계.tcId}</b> <span>{재료.get(단계.tcId)?.name ?? ''}</span>
      </>
    ) : (
      <span>{카드요약(단계, undefined, 언어)}</span>
    );
  const 안돌았다 = part.status === 'NA' && part.error?.message === 'NOT_RUN';
  const 적용됨 = (종류 === 'mock' || 종류 === 'unmock') && part.status === 'PASS';
  const 사유 = 멈춘사유글자(part.error?.message ?? '', 언어);
  // 사진은 실패한 절차의 순번으로 저장된다. 부품 번호와 다르다
  const 실패절차 = part.steps.find((s) => s.status === 'FAIL');
  return (
    <li className="scn-part">
      <div className="scn-part-head">
        <span className="scn-seq">{part.seq}</span>
        {종류 === undefined ? null : <span className="tech-tag">{t(종류글[종류])}</span>}
        {이름 === null ? null : <span className="scn-name">{이름}</span>}
        <span className="scn-end">
          {적용됨 ? (
            <span className="tech-tag">{t('적용됨')}</span>
          ) : 안돌았다 ? (
            <span className="scn-notrun">{t('– 실행 안 됨')}</span>
          ) : (
            <Verdict status={part.status} />
          )}
          {안돌았다 ? null : <span className="scn-dur">{seconds(part.durationMs, 언어)}</span>}
        </span>
      </div>
      {part.status !== 'FAIL' || 사유 === '' ? null : <pre className="scn-error">{사유}</pre>}
      {part.status !== 'FAIL' || part.trace === undefined ? null : <PartTrace trace={part.trace} />}
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
