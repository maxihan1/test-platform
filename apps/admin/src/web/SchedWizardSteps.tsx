// 정기 실행 마법사 3 · 4 · 5단계 본문 — 대상 서버 · 실행 주기 · 확인. 값과 저장은 SchedWizard 가 든다 (도메인/정기실행 §8.20 「마법사」)

import type { ServiceRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import type { 세트 } from './schedApi.js';
import { 요일글 } from './SchedCards.js';
import { 요일차례, type 덮을값, type 마법사값, type 반복 } from './schedForm.js';

export function 서버단계({ 실행앱, 앱들, envs, on서버, 섞임 }: { 실행앱: readonly string[]; 앱들: readonly ServiceRow[]; envs: Record<string, string>; on서버: (앱: string, env: string) => void; 섞임: boolean }) {
  const t = use말();
  return (
    <>
      <ul className="sched-wiz-envs">
        {실행앱.map((p) => {
          const 앱 = 앱들.find((s) => s.prefix === p);
          const 줄들 = 앱?.envs ?? [];
          return (
            <li key={p}>
              <span>
                <span className="sched-app">{p}</span> {앱?.name ?? ''}
              </span>
              {줄들.length === 0 ? (
                <span className="error-text">{t('이 애플리케이션에 대상 서버가 없습니다. 설정에서 추가해 주세요')}</span>
              ) : (
                <select aria-label={t('{앱} 대상 서버', { 앱: p })} value={envs[p] ?? ''} onChange={(e) => on서버(p, e.target.value)}>
                  {줄들.map((e) => (
                    <option key={e.env} value={e.env}>
                      {e.env} · {e.baseUrl}
                    </option>
                  ))}
                </select>
              )}
            </li>
          );
        })}
      </ul>
      {섞임 ? <p className="sched-wiz-hint">{t('다른 애플리케이션 단계는 시작 애플리케이션과 같은 이름의 대상 서버에서 실행합니다')}</p> : null}
      <p className="sched-wiz-hint">{t('실서비스 서버를 선택하면 저장되지 않습니다')}</p>
    </>
  );
}

const 반복이름: Record<반복, string> = { daily: '매일', days: '요일 선택', once: '1회' };

export function 언제단계({ v, on값, tz, 겹침, 호환성 }: { v: 마법사값; on값: (덮: 덮을값) => void; tz: string; 겹침: readonly 세트[]; 호환성: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const 요일누름 = (d: number) => on값({ days: v.days.includes(d) ? v.days.filter((x) => x !== d) : [...v.days, d] });
  return (
    <>
      <div className="sched-seg" role="group" aria-label={t('반복')}>
        {(['daily', 'days', 'once'] as const).map((r) => (
          <button key={r} type="button" aria-pressed={v.반복 === r} onClick={() => on값({ 반복: r })}>
            {t(반복이름[r])}
          </button>
        ))}
      </div>
      {v.반복 === 'days' ? (
        <div className="sched-wiz-days" role="group" aria-label={t('요일')}>
          {요일차례.map((d) => (
            <button key={d} type="button" className="btn small ghost" aria-pressed={v.days.includes(d)} onClick={() => 요일누름(d)}>
              {요일글(`2026-11-0${String(d === 0 ? 8 : d + 1)}`, 언어)}
            </button>
          ))}
        </div>
      ) : null}
      {v.반복 === 'once' ? (
        <label className="authoring-field">
          <span>{t('날짜')}</span>
          <input type="date" value={v.onceOn} onChange={(e) => on값({ onceOn: e.target.value })} />
        </label>
      ) : null}
      <label className="authoring-field">
        <span>{t('시각')}</span>
        <input type="time" value={v.at} onChange={(e) => on값({ at: e.target.value === '' ? v.at : e.target.value })} />
        <small>{t('{시간대} 기준', { 시간대: tz })}</small>
      </label>
      {겹침.map((s) => (
        <p key={s.id} className="sched-wiz-note">
          {s.avgMinutes === null
            ? t('「{이름}」({시각})와 시간이 겹칠 수 있습니다. 겹치면 먼저 시작한 세트가 완료된 뒤 실행합니다', { 이름: s.name, 시각: s.at })
            : t('「{이름}」({시각} · 평균 소요 {분}분)와 시간이 겹칠 수 있습니다. 겹치면 먼저 시작한 세트가 완료된 뒤 실행합니다', { 이름: s.name, 시각: s.at, 분: s.avgMinutes })}
        </p>
      ))}
      {호환성 ? <p className="sched-wiz-note">{t('호환성 테스트는 디바이스별로 차례대로 실행한 뒤 AI 점검까지 진행해 2~3시간 걸릴 수 있습니다')}</p> : null}
    </>
  );
}

export function 확인단계({ 줄들, 기준칸, 기준, on기준 }: { 줄들: [string, string][]; 기준칸: boolean; 기준: boolean; on기준: (값: boolean) => void }) {
  const t = use말();
  return (
    <>
      <dl className="sched-wiz-sum">
        {줄들.map(([이름, 값]) => (
          <div key={이름}>
            <dt>{이름}</dt>
            <dd>{값}</dd>
          </div>
        ))}
      </dl>
      {기준칸 ? (
        <label className="sched-wiz-all">
          <input type="checkbox" checked={기준} onChange={(e) => on기준(e.target.checked)} />
          <span>
            <strong>{t('안정화 지표에 사용')}</strong>
            <small>{t('안정화 기준 세트는 애플리케이션당 하나입니다. 안정화 지표는 이 세트의 실행 결과만 집계합니다')}</small>
          </span>
        </label>
      ) : null}
    </>
  );
}
