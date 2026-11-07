// 테스트 실행 › 호환성 — 세트 목록 (도메인/호환성 §8.17 ①). 줄 끝 「실행」은 시작 확인 창(CompatStart)을 연다

import { useState } from 'react';

import type { EnvRow } from './api.js';
import { compatApi, type CompatSetRow } from './compatApi.js';
import { 결과주소 } from './CompatRunWindow.js';
import { CompatStart } from './CompatStart.js';
import { 커버율 } from './compatView.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { Failed, Loading, useAsync, when } from './ui.js';

/** 세트 줄 · 세트 화면 주소. 애플리케이션을 담는다 — 받은 링크를 다른 애플리케이션을 고른 사람이 열어도 그 세트의 애플리케이션으로 연다 (공통/5-화면공통 §8 「링크에 애플리케이션이 담긴다」) */
export const 세트주소 = (id: number | 'new', 접두사: string) => `#/compat/${String(id)}?service=${encodeURIComponent(접두사)}`;

/** 시안 `자동 선택 8 · 직접 추가 1`. 직접 추가가 자동 선택에도 들면 자동 선택 쪽으로 센다 (§3.13 「호환성 세트」) */
const 케이스글 = (자동수: number, 직접수: number, t: (키: string, 값?: Record<string, number>) => string) =>
  직접수 === 0 ? t('자동 선택 {수}', { 수: 자동수 }) : t('자동 선택 {자동} · 직접 추가 {직접}', { 자동: 자동수, 직접: 직접수 });

function 최근실행({ run, service }: { run: CompatSetRow['lastRun']; service: string }) {
  const t = use말();
  const 언어 = use언어();
  if (run === null) return <span className="compat-faint">{t('실행 이력 없음')}</span>;
  // 0 은 안 보인다 (§8.17 ①)
  const 알약들 = [
    { 수: run.confirmed, 글: '결함 확정 {수}', 칸: 'compat-bad' },
    { 수: run.pending, 글: '미판정 {수}', 칸: 'compat-tag' },
    { 수: run.unchecked, 글: '미점검 {수}', 칸: 'compat-tag' },
  ].filter((x) => x.수 > 0);
  return (
    <>
      <a className="mono" href={결과주소(run.runId, service)}>
        {when(run.startedAt, 언어)}
      </a>
      {알약들.length === 0 ? null : (
        <div className="compat-pills">
          {알약들.map((x) => (
            <span key={x.글} className={x.칸}>
              {t(x.글, { 수: x.수 })}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

export function CompatSets({ serviceId, service, envs, 쓰나 }: { serviceId: number; service: string; envs: readonly EnvRow[]; 쓰나: boolean }) {
  const t = use말();
  const [돌릴, set돌릴] = useState<number | null>(null);
  // 자동 선택은 세트와 상관없이 애플리케이션마다 하나다(직접 추가와 따로 센다) — 빈 직접 추가로 한 번 미리 세어 수를 얻는다
  // 미리 셈이 실패해도 목록은 선다 — 자동 선택 수만 빠진다
  const 목록 = useAsync(() => Promise.all([compatApi.sets(serviceId), compatApi.preview(serviceId, []).catch(() => null)]), [serviceId]);

  if (목록.error !== null) return <Failed error={목록.error} />;
  if (목록.data === null) return <Loading />;
  const [{ sets: 줄들 }, 셈] = 목록.data;
  const 자동 = new Set((셈?.auto ?? []).map((a) => a.tcId));

  return (
    <>
      <Head
        위치={t('테스트 실행')}
        제목={t('호환성')}
        부제={t('Device VISION 디바이스별로 테스트 실행 화면을 AI 가 점검해 UI 결함을 찾습니다')}
        행동={
          쓰나 ? (
            <a className="btn" href={세트주소('new', service)}>
              {t('세트 만들기')}
            </a>
          ) : undefined
        }
      />
      <div className="screen">
        {줄들.length === 0 ? (
          <div className="empty">
            {t('아직 만든 호환성 세트가 없습니다')}
            <small>{t('세트에 디바이스를 담으면 케이스는 화면 커버리지가 가장 높은 최소 조합으로 자동 선택합니다')}</small>
          </div>
        ) : (
          <div className="compat-panel">
            <table className="compat-table compat-list">
              <thead>
                <tr>
                  <th>{t('세트')}</th>
                  <th>{t('디바이스')}</th>
                  <th>{t('케이스')}</th>
                  <th>{t('화면 커버리지')}</th>
                  <th>{t('최근 실행')}</th>
                  {쓰나 ? <th aria-label={t('실행')} /> : null}
                </tr>
              </thead>
              <tbody>
                {줄들.map((s) => (
                  <tr key={s.id}>
                    <td data-label={t('세트')}>
                      <a className="compat-name" href={세트주소(s.id, service)}>
                        {s.name}
                      </a>
                      <div className="compat-faint">{s.onePerModel ? t('모델별 1대') : t('직접 선택')}</div>
                    </td>
                    <td data-label={t('디바이스')}>
                      {t('{수}대', { 수: s.devices.length })}
                      <div className="compat-faint">{s.devices.slice(0, 3).map((d) => d.name).join(' · ')}{s.devices.length > 3 ? ' ' + t('외 {수}대', { 수: s.devices.length - 3 }) : ''}</div>
                    </td>
                    <td data-label={t('케이스')}>{셈 === null ? t('직접 추가 {수}', { 수: s.addedCases.length }) : 케이스글(셈.auto.length, s.addedCases.filter((c) => !자동.has(c)).length, t)}</td>
                    <td data-label={t('화면 커버리지')}>
                      <span className="mono">
                        {s.coverage.covered} / {s.coverage.total}
                      </span>{' '}
                      <span className="compat-faint">({커버율(s.coverage)}%)</span>
                      {s.coverage.total > s.coverage.covered ? (
                        <div className="compat-pills">
                          <span className="compat-tag">{t('미커버 화면 {수}', { 수: s.coverage.total - s.coverage.covered })}</span>
                        </div>
                      ) : null}
                    </td>
                    <td data-label={t('최근 실행')}>
                      <최근실행 run={s.lastRun} service={service} />
                    </td>
                    {쓰나 ? (
                      <td className="compat-go">
                        <button type="button" className="btn" aria-label={t('{세트} 실행', { 세트: s.name })} onClick={() => set돌릴(s.id)}>
                          {t('실행')}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="compat-faint compat-note">{t('케이스는 실행할 때마다 화면 커버리지가 가장 높은 최소 조합으로 자동 선택합니다 · 결과는 「실행 기록 › 호환성」에 남습니다')}</p>
      </div>
      {돌릴 === null ? null : (
        <CompatStart
          setId={돌릴}
          service={service}
          envs={envs}
          닫기={() => {
            set돌릴(null);
            void 목록.reload();
          }}
        />
      )}
    </>
  );
}
