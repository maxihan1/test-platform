// 성능 테스트 › 실행 기록 — 표 하나. 번호를 누르면 도는 중이면 실행 중 화면, 끝났으면 결과 화면이 열린다 (도메인/성능 §8.14 · 시안 A)

import { useState } from 'react';

import { Head, use지금앱 } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 기기성능이름 } from './kind.js';
import { perfApi, type 측정수치 } from './perfApi.js';
import { 메모리글자, 한자리 } from './perfDeviceView.js';
import { 실행상태글자 } from './PerfScenarioList.js';
import { type 말, 명글자, 분초, 시각글, 사유이름, 초글자, 측정자리, 퍼센트글자, 판정꼴, 판정이름, 판정종류 } from './perfRunView.js';
import { 유형글자 } from './PerfStepLoad.js';
import { Failed, Loading, useAsync } from './ui.js';

/** 페이지 · 기기 줄의 핵심 수치 한 줄 — 결과 화면 숫자 칸과 같은 이름이다 (§8.14 「실행 기록」 · 시안 11판) */
function 수치글(kind: string, 게임: boolean, m: 측정수치 | null, t: 말): string {
  if (m === null) return '-';
  const 칸 = (이름: string, 값: number | null | undefined, 글: (n: number) => string) => (값 === null || 값 === undefined ? null : `${t(이름)} ${글(값)}`);
  const 칸들 =
    kind === 'PAGE'
      ? [칸('LCP 평균', m.lcpAvgMs, (n) => 초글자(n, t))]
      : 게임
        ? [칸('평균 FPS', m.avgFps, (n) => String(한자리(n))), 칸('프레임 드랍', m.jankPct, 퍼센트글자)]
        : [칸('CPU 평균', m.avgCpu, 퍼센트글자), 칸('메모리 최대', m.maxMemMb, 메모리글자)];
  const 글 = 칸들.filter((x): x is string => x !== null).join(' · ');
  return 글 === '' ? '-' : 글;
}

const 거르개들: { 값: 판정종류 | ''; 이름: string }[] = [
  { 값: '', 이름: '전체' },
  { 값: 'PASS', 이름: '통과' },
  { 값: 'FAIL', 이름: '실패' },
  { 값: 'STOP', 이름: '중단' },
  { 값: 'ERROR', 이름: '오류' },
];

export function PerfRunList({ serviceId }: { serviceId: number }) {
  const t = use말();
  const 언어 = use언어();
  const 앱종류 = use지금앱()?.kind;
  const 기기성능 = 기기성능이름(앱종류);
  const [시나리오, set시나리오] = useState<number | undefined>(undefined);
  const [판정, set판정] = useState<판정종류 | ''>('');
  const 시나리오들 = useAsync(() => perfApi.scenarios(serviceId), [serviceId]);
  const 목록 = useAsync(() => perfApi.runs(serviceId, 시나리오), [serviceId, 시나리오]);

  const 줄들 = (목록.data?.runs ?? []).filter((줄) => 판정 === '' || 판정종류(줄) === 판정);
  const 부하있음 = 줄들.some((줄) => 측정자리(줄.kind) === null);

  return (
    <>
      <Head
        위치={t('성능 테스트')}
        제목={t('실행 기록')}
        행동={
          <div className="perf-row">
            <label className="perf-field perf-inline">
              {t('시나리오')}
              <select value={시나리오 === undefined ? '' : String(시나리오)} onChange={(e) => set시나리오(e.target.value === '' ? undefined : Number(e.target.value))}>
                <option value="">{t('전체')}</option>
                {(시나리오들.data?.scenarios ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="perf-field perf-inline">
              {t('판정')}
              <select value={판정} onChange={(e) => set판정(e.target.value as 판정종류 | '')}>
                {거르개들.map((g) => (
                  <option key={g.값} value={g.값}>
                    {t(g.이름)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      />
      <div className="screen">
        {목록.error !== null ? (
          <Failed error={목록.error} />
        ) : 목록.data === null ? (
          <Loading />
        ) : 줄들.length === 0 ? (
          <div className="empty">{t('아직 성능 테스트 실행이 없습니다')}</div>
        ) : (
          <div className="perf-panel">
            <div className="perf-table-box">
              <table className="perf-table" aria-label={t('성능 실행 목록')}>
                <thead>
                  <tr>
                    <th>{t('번호')}</th>
                    <th>{t('종류')}</th>
                    <th>{t('시나리오')}</th>
                    <th>{t('테스트 유형 · 대상 서버')}</th>
                    <th>{t('시작')}</th>
                    <th className="r">{t('걸린 시간')}</th>
                    <th>{t('판정')}</th>
                    {/* 측정 줄만 있으면 부하 테스트 칸 머리 셋 아래에 측정 수치가 걸린다 — 한 칸 「핵심 수치」로 (2026-10-31 시험 f19) */}
                    {부하있음 ? (
                      <>
                        <th className="r">{t('최대 동시 사용자')}</th>
                        <th className="r">{t('95% 응답시간')}</th>
                        <th className="r">{t('에러율')}</th>
                      </>
                    ) : (
                      <th colSpan={3}>{t('핵심 수치')}</th>
                    )}
                    <th>{t('이전 실행 대비')}</th>
                  </tr>
                </thead>
                <tbody>
                  {줄들.map((줄) => {
                    const 꼴 = 판정종류(줄);
                    // 페이지 · 기기 측정은 결과를 그 화면이 보인다 (§8.14). 이름 칸은 빈 글이라 화면 이름을 대신 적는다
                    const 자리 = 측정자리(줄.kind);
                    const 주소 = 자리 === null ? `#/perf/runs/${String(줄.id)}` : `${자리}?run=${String(줄.id)}`;
                    return (
                      <tr key={줄.id}>
                        <td>
                          <a className="mono" href={주소}>
                            {`PRF-${String(줄.id).padStart(4, '0')}`}
                          </a>
                        </td>
                        <td>
                          <span className="perf-tag">{t(자리 === null ? '부하 테스트' : 자리 === '#/perf/pages' ? '페이지 성능' : 기기성능)}</span>
                        </td>
                        <td>
                          {/* 측정에는 시나리오가 없다 — 「측정 결과」 고리는 번호 고리와 같은 곳이라 뺀다 (f19) */}
                          {자리 === null ? 줄.title : <span className="perf-faint">-</span>} {줄.origin === 'SCHEDULED' ? <span className="perf-tag">{t('정기')}</span> : null}
                        </td>
                        <td>{줄.testType === null ? 줄.env : `${t(유형글자[줄.testType].이름)} · ${줄.env}`}</td>
                        <td className="perf-faint">{시각글(줄.startedAt, 언어)}</td>
                        <td className="r mono">{줄.durationSec === null ? '-' : 분초(줄.durationSec)}</td>
                        <td>
                          {꼴 === 'LIVE' ? (
                            <>
                              <span className="perf-pulse" aria-hidden="true" />
                              {t(실행상태글자[줄.status] ?? '실행 중')}
                            </>
                          ) : (
                            <>
                              <span className={`verdict ${판정꼴[꼴]}`}>{판정이름(꼴, t)}</span>
                              {꼴 === 'STOP' && 줄.stopReason !== null ? <div className="perf-faint">{사유이름(줄.stopReason, t)}</div> : null}
                            </>
                          )}
                        </td>
                        {자리 === null ? (
                          <>
                            <td className="r mono">{명글자(줄.summary.peakVus, t)}</td>
                            <td className="r mono">{초글자(줄.summary.p95Ms, t)}</td>
                            <td className="r mono">{퍼센트글자(줄.summary.errorRate)}</td>
                          </>
                        ) : (
                          // 측정 실행에는 동시 사용자 · 응답시간이 없다 — 세 칸을 합쳐 그 측정의 핵심 수치를 적는다
                          <td colSpan={3} className="mono">
                            {수치글(줄.kind, 앱종류 === 'GAME', 줄.measures, t)}
                          </td>
                        )}
                        <td>{줄.degraded === null ? <span className="perf-faint">-</span> : 줄.degraded ? <span className="perf-chg">{t('성능 저하')}</span> : <span className="perf-faint">{t('변화 없음')}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* 판 안 표 아래에 둔다 — 판 밖이면 아래 테두리 위에 붙었고, 기록이 0건일 때는 누를 번호가 없어 안 띄운다 (2026-10-31 시험 f11) */}
            <p className="perf-faint">{t('번호를 누르면 실행 중이면 실행 중 화면, 끝났으면 결과 화면이 열립니다')}</p>
          </div>
        )}
      </div>
    </>
  );
}
