// 마법사 3단계 — 성능 목표 표 · 목표 추가 · AI 추천 · 성능 저하 알림 · AI 추천 근거 (도메인/성능 §3.9 「성능 목표」 · §8.14)

import { use말 } from './i18n.js';
import { perfApi, type Target, type 목표추천 } from './perfApi.js';
import { 목표방향, 저장값, 화면값 } from './perfView.js';
import { 기다림글자 } from './ui.js';
import { usePerfJob } from './usePerfJob.js';

export interface 삼단계값 {
  targets: Target[];
  aiBasis: string[];
  degradeAlert: boolean;
}

const 지표글자: Record<Target['metric'], { 이름: string; 단위: string }> = {
  P95: { 이름: '95% 응답시간', 단위: '초' },
  ERROR_RATE: { 이름: '에러율', 단위: '%' },
  TPS: { 이름: 'TPS', 단위: '건/초' },
};
const 지표들: Target['metric'][] = ['P95', 'ERROR_RATE', 'TPS'];

export function PerfStepTargets({
  값,
  고침,
  serviceId,
  트랜잭션들,
  쓰나,
  저장하고번호,
}: {
  값: 삼단계값;
  고침: (값: 삼단계값) => void;
  serviceId: number;
  트랜잭션들: string[];
  쓰나: boolean;
  /** AI 추천은 저장된 시나리오의 트랜잭션을 읽는다 (perf/aiRoutes.ts TARGETS). 아직 안 저장했으면 먼저 저장한다 */
  저장하고번호: () => Promise<number | null>;
}) {
  const t = use말();
  const 일 = usePerfJob<목표추천>((out) => 고침({ ...값, targets: out.targets, aiBasis: out.basis }));
  // 사람이 고친 줄은 근거가 「직접 입력」이 된다 (§3.9 「근거 꼬리표」)
  const 줄고침 = (i: number, 덮: Partial<Target>) =>
    고침({ ...값, targets: 값.targets.map((tg, n) => (n === i ? { ...tg, ...덮, source: 'MANUAL', reqId: undefined } : tg)) });

  async function 추천() {
    const id = await 저장하고번호();
    if (id !== null) await 일.맡기기(() => perfApi.suggest(serviceId, 'TARGETS', id));
  }

  return (
    <>
      <section className="perf-panel" aria-labelledby="perf-g">
        <div className="perf-row">
          <h2 id="perf-g">{t('성능 목표')}</h2>
          <span className="perf-faint">{t('기획서 수치 우선, 없으면 AI 추천값. 값을 고치면 근거가 「직접 입력」으로 바뀝니다')}</span>
          {쓰나 ? (
            <div className="perf-acts">
              <button type="button" className="btn ghost small" disabled={일.도나} onClick={() => void 추천()}>
                <기다림글자 중={일.도나} 평소={t('AI 추천')} 기다림={t('찾는 중')} />
              </button>
            </div>
          ) : null}
        </div>
        {일.오류 === null ? null : <p className="perf-err" role="alert">{일.오류}</p>}
        {값.targets.length === 0 ? (
          <div className="empty">{t('아직 성능 목표가 없습니다. 목표가 없으면 판정 없이 숫자만 남습니다')}</div>
        ) : (
          <div className="perf-table-box">
            <table className="perf-table">
              <thead>
                <tr>
                  <th>{t('지표')}</th>
                  <th>{t('대상')}</th>
                  <th>{t('목표')}</th>
                  <th>{t('근거')}</th>
                  {쓰나 ? <th aria-label={t('삭제')} /> : null}
                </tr>
              </thead>
              <tbody>
                {값.targets.map((tg, i) => (
                  <tr key={i}>
                    <td>
                      <select
                        aria-label={t('{번호}번째 목표 지표', { 번호: i + 1 })}
                        value={tg.metric}
                        disabled={!쓰나}
                        onChange={(e) => {
                          const metric = e.target.value as Target['metric'];
                          줄고침(i, { metric, op: 목표방향[metric], value: 저장값(metric, 화면값(tg)) });
                        }}
                      >
                        {지표들.map((m) => (
                          <option key={m} value={m}>
                            {t(지표글자[m].이름)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select aria-label={t('{번호}번째 목표 대상', { 번호: i + 1 })} value={tg.scope ?? ''} disabled={!쓰나} onChange={(e) => 줄고침(i, { scope: e.target.value === '' ? undefined : e.target.value })}>
                        <option value="">{t('전체')}</option>
                        {/* 지운 트랜잭션을 가리키는 목표도 그대로 보인다 — 몰래 「전체」로 바뀌면 판정 기준이 달라진다 */}
                        {[...new Set([...트랜잭션들, ...(tg.scope === undefined ? [] : [tg.scope])])].map((이름) => (
                          <option key={이름} value={이름}>
                            {이름}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <label className="mono">
                        {tg.op === '<=' ? '≤' : '≥'}{' '}
                        <input
                          className="perf-num"
                          type="number"
                          min={0}
                          step="any"
                          aria-label={t('{번호}번째 목표 값', { 번호: i + 1 })}
                          value={화면값(tg)}
                          disabled={!쓰나}
                          onChange={(e) => 줄고침(i, { value: 저장값(tg.metric, Number(e.target.value)) })}
                        />{' '}
                        {t(지표글자[tg.metric].단위)}
                      </label>
                    </td>
                    <td>
                      <span className={tg.source === 'AI' ? 'perf-ai' : 'perf-tag'}>{t(근거글자[tg.source])}</span>
                      {tg.reqId === undefined ? null : <span className="perf-faint mono"> {tg.reqId}</span>}
                    </td>
                    {쓰나 ? (
                      <td>
                        <button type="button" className="btn ghost small" aria-label={t('{번호}번째 목표 삭제', { 번호: i + 1 })} onClick={() => 고침({ ...값, targets: 값.targets.filter((_, n) => n !== i) })}>
                          {t('삭제')}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {쓰나 ? (
          <div>
            <button type="button" className="btn ghost small" onClick={() => 고침({ ...값, targets: [...값.targets, { metric: 'P95', op: '<=', value: 2000, source: 'MANUAL' }] })}>
              {t('목표 추가')}
            </button>
          </div>
        ) : null}
        <label className="perf-row">
          <input type="checkbox" checked={값.degradeAlert} disabled={!쓰나} onChange={(e) => 고침({ ...값, degradeAlert: e.target.checked })} />
          <span>
            {t('성능 저하 알림')}
            <br />
            <span className="perf-faint">{t('이전 실행보다 95% 응답시간이 20% 넘게 늘면 알립니다')}</span>
          </span>
        </label>
      </section>

      {값.aiBasis.length === 0 ? null : (
        <section className="perf-panel" aria-label={t('AI 추천 근거')}>
          <div>
            <span className="perf-ai">{t('AI 추천 근거')}</span>
          </div>
          <ul>
            {값.aiBasis.map((글, i) => (
              <li key={i}>{글}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

const 근거글자: Record<Target['source'], string> = { PRD: '기획서', AI: 'AI 추천', MANUAL: '직접 입력' };
