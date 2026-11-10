// 대시보드 「요구사항 추적(RTM)」 · 「테스트 케이스」 칸 — 요구사항마다 마지막 결과 · 커버리지 · 기능/UI · 설계 분포 (도메인/리포팅 §8.12 「프로젝트 요약」)

import { useState } from 'react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { 굴림숫자, 떠오름, 수글, 자람, 퍼센트 } from './DashboardTop.js';
import { use말, use언어 } from './i18n.js';
import { prdApi } from './prdApi.js';
import { message, 받을이름, 파일로저장 } from './ui.js';

type 요약 = 대시보드응답['project'];
type 앱 = 요약['apps'][number];
type PRD앱 = 앱 & { prd: NonNullable<앱['prd']> };

const 몫 = (수: number, 전체: number): string => `${전체 === 0 ? 0 : (수 * 100) / 전체}%`;

/** 추적표 엑셀은 애플리케이션마다다 — 하나면 바로 받고, 여럿이면 고르는 목록을 연다 */
function 추적표받기({ 앱들 }: { 앱들: PRD앱[] }) {
  const t = use말();
  const 언어 = use언어();
  const [열림, set열림] = useState(false);
  const [받는중, set받는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const 받기 = async (prefix: string) => {
    set열림(false);
    set받는중(true);
    set오류(null);
    try {
      const { 파일, 머리 } = await prdApi.rtmExport(prefix);
      파일로저장(파일, 받을이름(머리, `${prefix}-RTM.xlsx`));
    } catch (err) {
      set오류(message(err, 언어));
    } finally {
      set받는중(false);
    }
  };
  if (앱들.length === 0) return null;
  const 하나 = 앱들.length === 1 ? 앱들[0] : undefined;
  return (
    <span className="dash-menu">
      <button
        type="button"
        className="btn ghost small"
        disabled={받는중}
        aria-expanded={하나 === undefined ? 열림 : undefined}
        onClick={() => (하나 === undefined ? set열림(!열림) : void 받기(하나.prefix))}
      >
        {받는중 ? t('만드는 중') : t('추적표 엑셀')}
      </button>
      {열림 ? (
        <span className="dash-menu-list">
          {앱들.map((a) => (
            <button key={a.serviceId} type="button" className="btn ghost small" onClick={() => void 받기(a.prefix)}>
              {a.name}
            </button>
          ))}
        </span>
      ) : null}
      {오류 === null ? null : (
        <span className="dash-lab dash-error" role="alert">
          {오류}
        </span>
      )}
    </span>
  );
}

export function 추적칸({ 요약 }: { 요약: 요약 }) {
  const t = use말();
  const 앱들 = 요약.apps.filter((a): a is PRD앱 => a.prd !== null && a.prd.requirements > 0);
  const 합 = { req: 0, pass: 0, fail: 0, notRun: 0, none: 0 };
  for (const { prd } of 앱들) {
    합.req += prd.requirements;
    합.pass += prd.rtm.pass;
    합.fail += prd.rtm.fail;
    합.notRun += prd.rtm.notRun;
    합.none += prd.rtm.none;
  }
  const 커버 = 퍼센트(합.req - 합.none, 합.req);
  return (
    <section className="dash-panel dash-rise" style={떠오름(5)}>
      <div className="dash-h2">
        <h2>{t('요구사항 추적 (RTM)')}</h2>
        <span className="dash-lab">{t('요구사항마다 붙은 테스트의 마지막 결과')}</span>
        <추적표받기 앱들={앱들} />
      </div>
      {앱들.length === 0 ? (
        <p className="dash-calm">{t('아직 PRD 가 없습니다')}</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div className="num dash-big">
                {커버 === null ? '—' : <굴림숫자 글={커버} 늦춤={0.35} />}
                <span style={{ fontSize: 24 }}>%</span>
              </div>
              <div className="dash-lab">{t('커버리지 · 테스트가 있는 요구사항 {수} / {전체}', { 수: 수글(합.req - 합.none), 전체: 수글(합.req) })}</div>
            </div>
            <div className="dash-legend">
              <span><i className="p" />{t('통과 {수}', { 수: 수글(합.pass) })}</span>
              <span><i className="f" />{t('실패 {수}', { 수: 수글(합.fail) })}</span>
              <span><i className="n" />{t('일부 미실행 {수}', { 수: 수글(합.notRun) })}</span>
              <span><i className="none" />{t('테스트 없음 {수}', { 수: 수글(합.none) })}</span>
            </div>
          </div>
          <div>
            <div className="dash-rr head">
              <span>{t('애플리케이션')}</span>
              <span className="hide">PRD</span>
              <span className="hide">{t('요구사항')}</span>
              <span className="hide">{t('결과')}</span>
              <span className="r">{t('커버리지')}</span>
            </div>
            {앱들.map((a, i) => {
              const { rtm, requirements: 전체 } = a.prd;
              return (
                <div key={a.serviceId} className="dash-rr">
                  <span className="dash-cut" style={{ fontWeight: 600 }}>{a.name}</span>
                  <span className="mono dash-lab hide">v{a.prd.version}</span>
                  <span className="mono hide">{수글(전체)}</span>
                  <div
                    className="dash-stack dash-grow"
                    style={자람(i)}
                    role="img"
                    aria-label={[t('통과 {수}', { 수: rtm.pass }), t('실패 {수}', { 수: rtm.fail }), t('일부 미실행 {수}', { 수: rtm.notRun }), t('테스트 없음 {수}', { 수: rtm.none })].join(' · ')}
                  >
                    <i className="p" style={{ width: 몫(rtm.pass, 전체) }} />
                    <i className="f" style={{ width: 몫(rtm.fail, 전체) }} />
                    <i className="n" style={{ width: 몫(rtm.notRun, 전체) }} />
                  </div>
                  {/* 내림 — 덜 덮었는데 100 으로 읽히지 않게 */}
                  <span className="mono r">{Math.floor(((전체 - rtm.none) * 100) / 전체)}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

const 축들 = [
  ['normal', '정상'],
  ['error', '예외'],
  ['ui', 'UI'],
  ['boundary', '경계'],
] as const;

export function 케이스칸({ 요약 }: { 요약: 요약 }) {
  const t = use말();
  const 기능 = 요약.apps.reduce((n, a) => n + a.cases.fn, 0);
  const UI = 요약.apps.reduce((n, a) => n + a.cases.ui, 0);
  const 전체 = 기능 + UI;
  const 기능몫 = 전체 === 0 ? 0 : (기능 * 100) / 전체;
  const 축 = { normal: 0, error: 0, ui: 0, boundary: 0 };
  for (const a of 요약.apps) for (const [k] of 축들) 축[k] += a.prd?.axis[k] ?? 0;
  const 최대 = Math.max(1, ...Object.values(축));
  const 앱별 = 요약.apps.filter((a) => a.cases.fn + a.cases.ui > 0);
  return (
    <section className="dash-panel dash-rise" style={떠오름(6)}>
      <div className="dash-h2">
        <h2>{t('케이스')}</h2>
        <span className="dash-lab">{t('AI가 기획서로 작성')}</span>
      </div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="dash-donut">
          <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
            <circle cx="66" cy="66" r="54" fill="none" stroke="var(--well)" strokeWidth="16" />
            {전체 === 0 ? null : (
              <>
                <circle className="dash-ring" pathLength={100} cx="66" cy="66" r="54" fill="none" stroke="var(--blue-1)" strokeWidth="16" transform="rotate(-90 66 66)" style={{ strokeDashoffset: 100 - 기능몫 }} />
                <circle className="dash-ring" pathLength={100} cx="66" cy="66" r="54" fill="none" stroke="var(--blue-2)" strokeWidth="16" transform={`rotate(${-90 + 기능몫 * 3.6} 66 66)`} style={{ strokeDashoffset: 기능몫 }} />
              </>
            )}
          </svg>
          <span className="num">
            <굴림숫자 글={수글(전체)} 늦춤={0.45} />
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 160px' }}>
          <div className="dash-legend"><span><i className="b1" />{t('기능 테스트 {수}', { 수: 수글(기능) })}</span></div>
          <div className="dash-legend"><span><i className="b2" />{t('UI 테스트 {수}', { 수: 수글(UI) })}</span></div>
          <div className="dash-lab" style={{ marginTop: 4 }}>{앱별.map((a) => `${a.name} ${수글(a.cases.fn + a.cases.ui)}`).join(' · ')}</div>
        </div>
      </div>
      <div className="dash-axis">
        <div className="dash-lab">{t('테스트 설계 분포 · 요구사항과 케이스 연결 기준')}</div>
        {축들.map(([k, 이름], i) => (
          <div key={k} className="dash-ax">
            <span>{t(이름)}</span>
            <div className="dash-bar">
              <i className={`dash-grow${k === 'ui' ? ' b2' : ''}`} style={{ ...자람(i + 1), width: `${(축[k] * 100) / 최대}%` }} />
            </div>
            <span className="mono r">{수글(축[k])}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
