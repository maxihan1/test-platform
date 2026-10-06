// E2E 실행 결과의 단계 한 줄. 판정만 판정 색을 쓰고 모킹 구간 세로선 · 응답 코드는 중립 색이다 (도메인/시나리오 §8.11)

import { useState, type ReactNode } from 'react';

import { use말, use언어 } from './i18n.js';
import { 가린값들, 한줄로 } from './mask.js';
import { scenarioApi, type ScenarioRunPart } from './scenarioApi.js';
import { 값연결글, 건너뜀번호 } from './scenarioResultView.js';
import { 카드요약, 종류글 } from './scenarioView.js';
import { seconds, Verdict } from './ui.js';

function 세부({ 라벨, children }: { 라벨: string; children: ReactNode }) {
  return (
    <div className="scn-detail">
      <span className="scn-k">{라벨}</span>
      <div className="scn-v">{children}</div>
    </div>
  );
}

export function ScenarioResultPart({ part, parts, runId }: { part: ScenarioRunPart; parts: ScenarioRunPart[]; runId: number }) {
  const t = use말();
  const 언어 = use언어();
  // 처음 모양만 판정이 정한다. 사람이 누르면 그 뒤는 사람 몫이고, 도는 중에 실패가 뒤늦게 와도 따라 열린다
  const [손, set손] = useState<boolean | null>(null);
  const 열림 = 손 ?? part.status === 'FAIL';

  const 케이스 = part.part.kind === 'case' ? part.part : null;
  const 적용됨 = (part.kind === 'mock' || part.kind === 'unmock') && part.status === 'PASS';
  const 안돌았다 = part.status === 'NA' && part.error?.message === 'NOT_RUN';
  const 모킹구간 = part.mocks.length > 0 && part.kind !== 'mock';
  const 모킹안탐 = 모킹구간 && part.kind === 'api';
  const 입력 = 케이스 === null ? '' : 한줄로({ ...케이스.params, ...part.bound }, part.paramSchema, 언어);
  const 이름 = part.kind === 'case' ? (
    <>
      <b className="scn-id">{part.tcId}</b> <span>{part.tcName}</span>
    </>
  ) : (
    <span>{카드요약(part.part, undefined, 언어)}</span>
  );

  return (
    <li className={모킹구간 ? 'scn-part mocked' : 'scn-part'}>
      <div className="scn-part-head">
        <span className="scn-seq">{part.seq}</span>
        <span className="tech-tag">{t(종류글[part.kind])}</span>
        <span className="scn-name">{이름}</span>
        {part.unconfirmed === null ? null : <span className="case-tag">{t('미확정')}</span>}
        {모킹안탐 ? <span className="tech-tag">{t('모킹되지 않음')}</span> : null}
        {케이스 !== null && 케이스.carryOver === false ? <span className="tech-tag">{t('단독 실행')}</span> : null}
        <span className="scn-end">
          {적용됨 ? (
            <span className="tech-tag">{t('적용됨')}</span>
          ) : 안돌았다 ? (
            <span className="scn-notrun">{t('– 실행 안 됨')}</span>
          ) : (
            <Verdict status={part.status} />
          )}
          {part.durationMs === null ? null : <span className="scn-dur">{seconds(part.durationMs, 언어)}</span>}
        </span>
      </div>

      {!모킹구간 ? null : (
        <p className="scn-mock-note">
          {모킹안탐 ? t('이 단계의 API 호출은 모킹되지 않습니다') : t('모킹이 적용된 상태로 실행했습니다 — {무늬}', { 무늬: part.mocks.join(', ') })}
        </p>
      )}

      {입력 === '' ? null : <세부 라벨={t('입력값')}>{입력}</세부>}
      {part.skippedSteps.length === 0 ? null : (
        <세부 라벨={t('건너뜀')}>
          {part.skippedSteps.map((제목) => {
            const 번호 = 건너뜀번호(parts, part.seq, 제목);
            return (
              <div key={제목}>
                {번호 === null
                  ? t('준비 「{제목}」 건너뜀', { 제목 })
                  : t('준비 「{제목}」 — {번호}번에서 이미 실행', { 제목, 번호 })}
              </div>
            );
          })}
        </세부>
      )}
      {케이스?.links === undefined || 케이스.links.length === 0 ? null : (
        <세부 라벨={t('값 연결')}>
          {케이스.links.map((link, i) => {
            // 서버가 이미 가렸어도 한 번 더 — 서버 가리기에 빈틈이 생겨도 화면에 원문이 안 뜨게 (§7)
            const { 종류, 글 } = 값연결글(link, 가린값들(part.bound, part.paramSchema), 언어);
            return (
              <div key={i}>
                <span className="tech-tag">{종류}</span> <span>{글}</span>
              </div>
            );
          })}
        </세부>
      )}
      {part.cleanup.length === 0 ? null : (
        <세부 라벨={t('정리')}>
          {part.cleanup.map((c, i) => (
            <div key={i}>
              {c.error === undefined
                ? t('마지막에 실행 {메서드} {주소} → {코드}', { 메서드: c.method, 주소: c.url, 코드: c.status ?? '—' })
                : t('마지막에 실행 {메서드} {주소} — {오류}', { 메서드: c.method, 주소: c.url, 오류: c.error })}
            </div>
          ))}
        </세부>
      )}
      {part.unconfirmed === null ? null : <세부 라벨={t('미확정')}>{part.unconfirmed}</세부>}
      {part.status !== 'NA' || 안돌았다 || part.error === null || part.error.message === '' ? null : (
        <세부 라벨={t('실행이 멈춘 사유')}>{part.error.message}</세부>
      )}
      {part.status !== 'FAIL' || part.error === null || part.error.message === '' ? null : (
        <pre className="scn-error">{part.error.message}</pre>
      )}

      {part.steps.length === 0 ? null : (
        <>
          <button type="button" className="btn ghost scn-toggle" aria-expanded={열림} onClick={() => set손(!열림)}>
            {t('절차 {수}', { 수: part.steps.length })}
          </button>
          {!열림 ? null : (
            <ul className="scn-proc">
              {part.steps.map((s) => (
                <li key={s.seq}>
                  <span>{s.title}</span>
                  {s.skipped === true ? <span className="scn-skip">{t('건너뜀')}</span> : <Verdict status={s.status} />}
                  {s.status !== 'FAIL' ? null : (
                    <a className="scn-shot" href={scenarioApi.runShot(runId, s.seq)} target="_blank" rel="noreferrer">
                      {t('실패 화면 보기')}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  );
}
