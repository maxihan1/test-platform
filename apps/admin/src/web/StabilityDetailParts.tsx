// 안정화 지표 오류 상세의 판들 — AI 요약 · 숫자 넷 · 발생 케이스 · 스택 트레이스 · 발생 케이스 추이 · 디바이스 (도메인/안정화 §8.19 「상세」 · 시안 6판)

import { useState } from 'react';

import { use말 } from './i18n.js';
import { use휴대폰 } from './phone.js';
import { 케이스주소 } from './route.js';
import type { 오류상세 } from './stabilityApi.js';
import { 날글자, 날짜보임, 상세점들, 상세틀, 추이그림, 케이스로묶기 } from './stabilityView.js';
import { Verdict } from './ui.js';

/** 없으면 판을 숨긴다 — 기존 종류인데 AI 요약이 한 번도 없었다 (§3.15 「상세의 AI 요약」) */
export function AI요약판({ 상세 }: { 상세: 오류상세 }) {
  const t = use말();
  const ai = 상세.ai;
  if (ai === null) return null;
  // 기존 종류는 앞 실행의 요약일 수 있다 — 어느 실행 글인지 붙인다
  const 꼬리표 = ai.runId === 상세.runId ? t('AI 작성') : t('AI 작성 · 실행 #{번호} 기준', { 번호: ai.runId });
  return (
    <section className="stab-panel dash-rise" aria-labelledby="stab-dai">
      <div className="stab-top">
        <h2 id="stab-dai">{t('AI 요약')}</h2>
        <span className="stab-aitag">{꼬리표}</span>
      </div>
      <p className="stab-headline">{ai.headline}</p>
      <div className="stab-ai3 even">
        <div className="stab-blk">
          <h3>{t('영향')}</h3>
          <span>{ai.impact}</span>
        </div>
        <div className="stab-blk">
          <h3>{t('이전 실행')}</h3>
          <span>{ai.previous}</span>
        </div>
        <div className="stab-blk">
          <h3>{t('원인 추정')}</h3>
          {/* AI 는 코드를 읽지 않는다 — 원인은 추정뿐이다 (§3.15 「지시문이 정하는 것」). PC 는 아랫줄, 휴대폰은 글 뒤에 붙는다 */}
          <span>
            {ai.cause}
            <span className="stab-faint stab-unver">{t('코드 미확인')}</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/** 발생 케이스 · 통과 판정 · 크래시 연결 · 발생 횟수. 웹은 크래시 연결 칸이 없다 — 견본에 디바이스가 없는 종류가 웹이다 (§8.19 「숫자 넷」) */
export function 상세숫자칸({ 상세 }: { 상세: 오류상세 }) {
  const t = use말();
  const k = 상세.kpis;
  const 웹 = 상세.source.startsWith('WEB_');
  const 칸들: [string, string, string][] = [
    [t('발생 케이스'), t('{수}건', { 수: k.cases }), t('{수}건 중', { 수: k.runCases })],
    [t('통과 판정'), t('{수}건', { 수: k.passCases }), t('판정은 통과 · 오류 발생')],
    ...(웹 ? [] : ([[t('크래시 연결'), t('{수}건', { 수: k.crashCases }), k.firstCrashTcId ?? '—']] as [string, string, string][])),
    [t('발생 횟수'), t('{수}회', { 수: k.hits }), t('이전 실행 {수}회', { 수: k.previousHits })],
  ];
  return (
    <div className={`stab-dk${칸들.length === 3 ? ' three' : ''}`}>
      {칸들.map(([이름, 값, 아래]) => (
        <div key={이름} className="stab-panel">
          <span className="stab-lab">{이름}</span>
          <span className="v">{값}</span>
          <span className="stab-faint">{아래}</span>
        </div>
      ))}
    </div>
  );
}

export function 발생케이스판({ 상세 }: { 상세: 오류상세 }) {
  const t = use말();
  const 휴대폰 = use휴대폰();
  return (
    <section className="stab-panel dash-rise" aria-labelledby="stab-docc">
      <div className="stab-top">
        <h2 id="stab-docc">{t('발생 케이스 · 단계')}</h2>
        {휴대폰 ? null : <span className="stab-faint">{t('재현 절차는 해당 케이스의 단계')}</span>}
      </div>
      <ul className="stab-occ">
        {케이스로묶기(상세.occurrences).map((c) => {
          // 단계를 모르면(앱 logcat 은 디바이스 시각이라 1차는 맞추지 않는다) 그 글을 뺀다
          const 끝 = [
            ...(c.단계.length === 0 ? [] : [t('{번호}단계 직후', { 번호: c.단계.join(' · ') })]),
            ...(c.크래시 ? [t('크래시 발생')] : []),
          ].join(' · ');
          return (
            <li key={c.tcId}>
              <Verdict status={c.통과 ? 'PASS' : 'FAIL'} />
              <a className="mono" href={케이스주소(c.tcId)}>
                {c.tcId}
              </a>
              <span className="stab-occ-name">{c.name}</span>
              {끝 === '' ? null : <span className="stab-faint">{끝}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 견본 셋을 `1 / 3` 으로 넘긴다. 웹은 메시지(네트워크면 메서드 · 주소 · 응답 코드)와 화면 주소다 (§8.19 「스택 트레이스」) */
export function 견본판({ 상세 }: { 상세: 오류상세 }) {
  const t = use말();
  const [몇째, set몇째] = useState(0);
  const 견본들 = 상세.samples;
  const 지금 = 견본들[몇째];
  return (
    <section className="stab-panel stab-dstack dash-rise" aria-labelledby="stab-dsample">
      <div className="stab-top">
        <h2 id="stab-dsample">{t('스택 트레이스')}</h2>
        {견본들.length > 1 ? (
          <div className="stab-pager">
            <button type="button" className="btn ghost small" aria-label={t('이전 견본')} disabled={몇째 === 0} onClick={() => set몇째(몇째 - 1)}>
              ‹
            </button>
            <span className="stab-faint">
              {몇째 + 1} / {견본들.length}
            </span>
            <button type="button" className="btn ghost small" aria-label={t('다음 견본')} disabled={몇째 === 견본들.length - 1} onClick={() => set몇째(몇째 + 1)}>
              ›
            </button>
          </div>
        ) : null}
      </div>
      {지금 === undefined ? (
        <p className="stab-wait">{t('견본이 없습니다')}</p>
      ) : (
        <>
          <pre className="stab-stack mono">{지금.text}</pre>
          <p className="stab-faint stab-from">{[지금.tcId, 지금.page ?? 지금.device].filter((글) => 글 !== null).join(' · ')}</p>
        </>
      )}
    </section>
  );
}

/** 최근 7일 발생 케이스 선 — 메인 추이와 같은 곡선 · 움직임이다 */
export function 상세추이판({ 상세 }: { 상세: 오류상세 }) {
  const t = use말();
  if (상세.trend.length === 0) return null;
  const 그림 = 추이그림(상세점들(상세.trend), 상세틀);
  const 끝 = 그림.점.at(-1)!;
  const 설명 = t('최근 7일 발생 케이스. {줄}', { 줄: 상세.trend.map((p) => t('{날} {수}건', { 날: 날글자(p.day), 수: p.cases })).join(', ') });
  const 글자 = { fontFamily: 'inherit' };
  return (
    <section className="stab-panel dash-rise" aria-labelledby="stab-dtrend">
      <div className="stab-top">
        <h2 id="stab-dtrend">{t('발생 케이스 추이')}</h2>
        <span className="stab-faint">{t('최근 7일')}</span>
      </div>
      <div className="stab-chart">
        <svg viewBox={`0 0 ${String(상세틀.폭)} ${String(상세틀.높이)}`} role="img" aria-label={설명}>
          <defs>
            <linearGradient id="stab-dg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--blue-1)" stopOpacity=".26" />
              <stop offset="1" stopColor="var(--blue-1)" stopOpacity=".02" />
            </linearGradient>
          </defs>
          {/* 꼭대기 · 바닥 눈금만 — 시안 Detail6 */}
          {[그림.눈금[0]!, 그림.눈금.at(-1)!].map((눈) => (
            <g key={눈.값}>
              <line x1={상세틀.왼 - 8} y1={눈.y} x2={상세틀.폭 - 12} y2={눈.y} stroke="var(--line)" />
              <text x={상세틀.왼 - 14} y={눈.y + 4} fill="var(--ink-faint)" fontSize={11} textAnchor="end" style={글자}>
                {눈.값}
              </text>
            </g>
          ))}
          <path className="dash-fade" d={그림.면} fill="url(#stab-dg)" />
          <path className="dash-draw" pathLength={1} d={그림.선} fill="none" stroke="var(--blue-1)" strokeWidth={2.25} strokeLinecap="round" />
          <circle cx={끝.x} cy={끝.y} r={4.5} fill="var(--blue-1)" stroke="var(--panel)" strokeWidth={2} />
          <text x={끝.x + 10} y={끝.y + 4} fill="var(--ink)" fontSize={12} fontWeight={700} style={글자}>
            {t('{수}건', { 수: 끝.residual })}
          </text>
          <g fill="var(--ink-faint)" fontSize={11} textAnchor="middle" style={글자}>
            {그림.점.map((p, i) =>
              날짜보임(i, 그림.점.length, true) ? (
                <text key={p.runId} x={p.x} y={상세틀.바닥 + 18} {...(i === 그림.점.length - 1 ? { fill: 'var(--ink)', fontWeight: 600 } : {})}>
                  {날글자(p.day)}
                </text>
              ) : null,
            )}
          </g>
        </svg>
      </div>
    </section>
  );
}

/** 앱 · 게임은 `Galaxy S23 · Android 14` + `Device VISION · N건`. 웹은 집계가 브라우저 이름을 안 남겨 판이 빈다 — 빈 판은 숨긴다 (§7) */
export function 디바이스판({ 상세 }: { 상세: 오류상세 }) {
  const t = use말();
  if (상세.devices.length === 0) return null;
  return (
    <section className="stab-panel dash-rise" aria-labelledby="stab-ddev">
      <div className="stab-top">
        <h2 id="stab-ddev">{t('디바이스')}</h2>
      </div>
      <ul className="stab-devs">
        {상세.devices.map((d) => (
          <li key={`${d.name}:${d.os ?? ''}`}>
            <span>{d.os === null ? d.name : `${d.name} · ${d.os}`}</span>
            <span className="stab-faint">{t('Device VISION · {수}건', { 수: d.cases })}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
