// 마법사 2단계 — 테스트 유형 카드 · AI 동시 사용자 산정 · 최대 가상 사용자 · 램프업 · 미리 보기 그래프 · 상세 설정 · 목표 TPS (도메인/성능 §3.9 「부하 설정」)

import { useState } from 'react';

import { use말 } from './i18n.js';
import { perfApi, type Basis, type Stage, type TestType, type 부하추천 } from './perfApi.js';
import { 구간만들기, 그래프점, 기본부하칸, 총초, 최대목표, 피크계산, type 부하칸 } from './perfView.js';
import { 기다림글자 } from './ui.js';
import { usePerfJob } from './usePerfJob.js';

export interface 이단계값 {
  testType: TestType;
  basis: Basis;
  칸: 부하칸;
  stages: Stage[];
}

export const 유형글자: Record<TestType, { 이름: string; 설명: string }> = {
  LOAD: { 이름: '부하 테스트', 설명: '목표 부하 유지' },
  STRESS: { 이름: '스트레스 테스트', 설명: '임계점 확인, 목표 초과 시 자동 중단' },
  SPIKE: { 이름: '스파이크 테스트', 설명: '순간 급증' },
  SOAK: { 이름: '내구성 테스트', 설명: '장시간 안정성 (메모리 누수 등)' },
};
const 유형들: TestType[] = ['LOAD', 'STRESS', 'SPIKE', 'SOAK'];

export function PerfStepLoad({ 값, 고침, serviceId, 쓰나, 더미 }: { 값: 이단계값; 고침: (값: 이단계값) => void; serviceId: number; 쓰나: boolean; 더미: boolean }) {
  const t = use말();
  // 칸을 고치면 구간을 다시 짓는다 — 「상세 설정」에서 고친 구간은 칸을 다시 고칠 때까지 남는다
  const 칸고침 = (덮: Partial<부하칸>, 유형 = 값.testType) => {
    const 칸 = { ...값.칸, ...덮 };
    고침({ ...값, testType: 유형, 칸, stages: 구간만들기(유형, 칸) });
  };
  const 단위 = 값.basis === 'TPS' ? t('목표 TPS') : t('최대 가상 사용자');
  const 유지칸 = 값.testType === 'LOAD' || 값.testType === 'SOAK';

  return (
    <>
      <section className="perf-panel" aria-labelledby="perf-k">
        <h2 id="perf-k">{t('테스트 유형')}</h2>
        <div className="perf-kinds" role="radiogroup" aria-label={t('테스트 유형')}>
          {유형들.map((유형) => (
            <label key={유형} className="perf-kind">
              <span>
                <input type="radio" name="perf-type" checked={값.testType === 유형} disabled={!쓰나} onChange={() => 칸고침({}, 유형)} />{' '}
                <b>{t(유형글자[유형].이름)}</b>
              </span>
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" className="perf-graph" style={{ height: 40 }}>
                <polyline points={그래프점(구간만들기(유형, 기본부하칸), 100, 38)} />
              </svg>
              <span className="perf-faint">{t(유형글자[유형].설명)}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="perf-panel" aria-labelledby="perf-l">
        <h2 id="perf-l">{t('부하 설정')}</h2>
        {쓰나 ? <AI산정 serviceId={serviceId} 스트레스={값.testType === 'STRESS'} 적용={(peakVus, maxVus) => 칸고침({ peakVus, maxVus })} /> : null}
        <div className="perf-fields">
          <label className="perf-field">
            {단위}
            <input type="number" min={1} value={값.칸.maxVus} disabled={!쓰나} onChange={(e) => 칸고침({ maxVus: Number(e.target.value) })} />
          </label>
          <label className="perf-field">
            {t('램프업 시간 (분)')}
            <input type="number" min={1} value={값.칸.rampMin} disabled={!쓰나} onChange={(e) => 칸고침({ rampMin: Number(e.target.value) })} />
          </label>
          {유지칸 ? (
            <label className="perf-field">
              {t('유지 시간 (분)')}
              <input type="number" min={1} value={값.칸.holdMin} disabled={!쓰나} onChange={(e) => 칸고침({ holdMin: Number(e.target.value) })} />
            </label>
          ) : null}
          <div className="perf-field">
            {t('자동 중단')}
            <span>{값.testType === 'STRESS' ? t('성능 목표 초과 시') : t('에러율 20% 이상이 10초 이어질 때')}</span>
          </div>
        </div>
        <svg
          viewBox="0 0 600 140"
          preserveAspectRatio="none"
          className="perf-graph"
          role="img"
          aria-label={t('{분}분 동안 최대 {수}까지 오르는 부하 그래프', { 분: Math.ceil(총초(값.stages) / 60), 수: 최대목표(값.stages) })}
        >
          <polyline points={그래프점(값.stages, 600, 140)} />
        </svg>
        <div className="perf-faint">{t('전체 {분}분 · 최대 {수}', { 분: Math.ceil(총초(값.stages) / 60), 수: 최대목표(값.stages) })}</div>
        <details>
          <summary>{t('상세 설정 (구간별 시간과 목표 직접 입력)')}</summary>
          <구간표 stages={값.stages} 쓰나={쓰나} 단위={단위} 고침={(stages) => 고침({ ...값, stages })} />
        </details>
        {더미 ? (
          <div className="perf-faint">{t('더미 클라이언트는 가상 사용자 수 기준으로만 걸 수 있습니다')}</div>
        ) : 쓰나 ? (
          <div className="perf-faint">
            {값.basis === 'VUS' ? t('가상 사용자 대신 목표 TPS로도 설정할 수 있습니다') : t('초당 요청 수로 부하를 겁니다')}{' '}
            <button type="button" className="perf-toggle" onClick={() => 고침({ ...값, basis: 값.basis === 'VUS' ? 'TPS' : 'VUS' })}>
              {값.basis === 'VUS' ? t('목표 TPS로 설정') : t('가상 사용자로 설정')}
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
}

function 구간표({ stages, 쓰나, 단위, 고침 }: { stages: Stage[]; 쓰나: boolean; 단위: string; 고침: (stages: Stage[]) => void }) {
  const t = use말();
  const 줄고침 = (i: number, 덮: Partial<Stage>) => 고침(stages.map((s, n) => (n === i ? { ...s, ...덮 } : s)));
  return (
    <div className="perf-well">
      <table className="perf-table">
        <thead>
          <tr>
            <th>{t('구간')}</th>
            <th>{t('시간 (초)')}</th>
            <th>{단위}</th>
            {쓰나 ? <th aria-label={t('삭제')} /> : null}
          </tr>
        </thead>
        <tbody>
          {stages.map((s, i) => (
            <tr key={i}>
              <td className="mono">{i + 1}</td>
              <td>
                <input className="perf-num" type="number" min={1} aria-label={t('{번호}구간 시간', { 번호: i + 1 })} value={s.durationSec} disabled={!쓰나} onChange={(e) => 줄고침(i, { durationSec: Number(e.target.value) })} />
              </td>
              <td>
                <input className="perf-num" type="number" min={0} aria-label={t('{번호}구간 목표', { 번호: i + 1 })} value={s.target} disabled={!쓰나} onChange={(e) => 줄고침(i, { target: Number(e.target.value) })} />
              </td>
              {쓰나 ? (
                <td>
                  <button type="button" className="btn ghost small" disabled={stages.length === 1} onClick={() => 고침(stages.filter((_, n) => n !== i))}>
                    {t('삭제')}
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {쓰나 ? (
        <div>
          <button type="button" className="btn ghost small" onClick={() => 고침([...stages, { durationSec: 60, target: stages.at(-1)?.target ?? 1 }])}>
            {t('구간 추가')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** AI 는 세 값과 근거만 찾고 계산은 admin 이 한다. 못 찾은 값은 사람이 채운다 (§3.9 「AI 동시 사용자 산정」) */
function AI산정({ serviceId, 스트레스, 적용 }: { serviceId: number; 스트레스: boolean; 적용: (peakVus: number, maxVus: number) => void }) {
  const t = use말();
  const [결과, set결과] = useState<부하추천 | null>(null);
  const [세값, set세값] = useState({ visitors: '', ratio: '', stay: '' });
  const 일 = usePerfJob<부하추천>((out) => {
    set결과(out);
    set세값({ visitors: 글(out.dailyVisitors), ratio: out.peakRatio === null ? '' : String(Math.round(out.peakRatio * 100)), stay: 글(out.avgStayMin) });
  });
  const 맡기기 = () => void 일.맡기기(() => perfApi.suggest(serviceId, 'LOAD'));

  if (결과 === null) {
    return (
      <div className="perf-well">
        <div className="perf-row">
          <span className="perf-ai">{t('AI 동시 사용자 산정')}</span>
          <span className="perf-faint">{t('기획서 비기능 요구사항과 가이드에서 방문자 수를 찾아 피크 동시 사용자를 셉니다')}</span>
          <div className="perf-acts">
            <button type="button" className="btn ghost small" disabled={일.도나} onClick={맡기기}>
              <기다림글자 중={일.도나} 평소={t('산정하기')} 기다림={t('찾는 중')} />
            </button>
          </div>
        </div>
        {일.오류 === null ? null : <p className="perf-err" role="alert">{일.오류}</p>}
      </div>
    );
  }

  const 수 = (s: string) => (s.trim() === '' ? null : Number(s));
  const 집중 = 수(세값.ratio);
  const 피크 = 피크계산(수(세값.visitors), 집중 === null ? null : 집중 / 100, 수(세값.stay), 결과.peakMinutes);
  const 최대 = 피크 === null ? null : 스트레스 ? 피크 * 5 : 피크;
  const 칸 = (이름: string, 키: keyof typeof 세값) => (
    <label className="perf-field">
      {이름}
      <input type="number" min={0} value={세값[키]} onChange={(e) => set세값({ ...세값, [키]: e.target.value })} />
    </label>
  );

  return (
    <div className="perf-well">
      <span>
        <span className="perf-ai">{t('AI 동시 사용자 산정')}</span>
      </span>
      {결과.basis.length === 0 ? <span className="perf-faint">{t('기획서에서 근거를 찾지 못했습니다. 세 값을 직접 적어 주세요')}</span> : null}
      {결과.basis.map((글, i) => (
        <span key={i} className="perf-faint">
          {t('근거: {글}', { 글 })}
        </span>
      ))}
      <div className="perf-fields">
        {칸(t('일 방문자 (명)'), 'visitors')}
        {칸(t('피크 집중률 (%)'), 'ratio')}
        {칸(t('평균 체류 (분)'), 'stay')}
      </div>
      <span className="mono">{t('일 방문자 × 피크 집중률 × 평균 체류 ÷ {분}분', { 분: 결과.peakMinutes })}</span>
      {피크 === null ? null : (
        <span>
          {t('피크 동시 사용자 약 {수}명', { 수: 피크.toLocaleString() })}
          {스트레스 ? <span className="perf-faint"> · {t('임계점을 확인하려고 피크의 5배인 {수}명까지 램프업', { 수: (피크 * 5).toLocaleString() })}</span> : null}
        </span>
      )}
      <div className="perf-row">
        <button type="button" className="btn small" disabled={피크 === null || 최대 === null} onClick={() => 피크 !== null && 최대 !== null && 적용(피크, 최대)}>
          {t('적용')}
        </button>
        <button type="button" className="btn ghost small" disabled={일.도나} onClick={맡기기}>
          <기다림글자 중={일.도나} 평소={t('다시 산정')} 기다림={t('찾는 중')} />
        </button>
      </div>
      {일.오류 === null ? null : <p className="perf-err" role="alert">{일.오류}</p>}
    </div>
  );
}

const 글 = (n: number | null) => (n === null ? '' : String(n));
