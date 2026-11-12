// 안정화 지표 「잔여 오류 추이」 판 — 숫자 넷(웹은 셋) · 일별 그래프 · 7일/30일 (도메인/안정화 §8.19 · 시안 6판 · 대시보드 12판 꼴)

import { useState } from 'react';

import { use말 } from './i18n.js';
import { use휴대폰 } from './phone.js';
import type { 안정화응답, 집계실행 } from './stabilityApi.js';
import { PC틀, 날글자, 날짜보임, 추이그림, 폰틀 } from './stabilityView.js';

type 말 = ReturnType<typeof use말>;

function 숫자칸들({ run, t }: { run: 집계실행; t: 말 }) {
  const 앞 = run.previous;
  const 없음 = t('이전 실행 없음');
  const 칸들: [string, string, string][] = [
    [t('오류 발생 케이스'), t('{수}건', { 수: run.errorCases }), 앞 === null ? 없음 : t('이전 실행 {수}건', { 수: 앞.errorCases })],
    [t('잔여 오류'), t('{수}종', { 수: run.residual }), 앞 === null ? 없음 : t('이전 실행 {수}종', { 수: 앞.residual })],
    // 웹에는 크래시가 없다 — 칸을 빼고 셋만 둔다 (§8.19 「잔여 오류 추이 판」)
    ...(run.crashes === null
      ? []
      : ([[t('크래시'), t('{수}회', { 수: run.crashes }), 앞?.crashes == null ? 없음 : t('이전 실행 {수}회', { 수: 앞.crashes })]] as [string, string, string][])),
    [t('해결'), t('{수}종', { 수: run.resolved }), t('해결 확인 {수}종', { 수: run.confirmed })],
  ];
  return (
    <div className={`stab-k${칸들.length === 3 ? ' three' : ''}`}>
      {칸들.map(([이름, 값, 아래]) => (
        <div key={이름}>
          <span className="stab-lab">{이름}</span>
          <span className="v">{값}</span>
          <span className="stab-faint">{아래}</span>
        </div>
      ))}
    </div>
  );
}

function 그래프({ 점들, t }: { 점들: 안정화응답['trend']; t: 말 }) {
  const 휴대폰 = use휴대폰();
  const [가리킨, set가리킨] = useState<number | null>(null);
  if (점들.length === 0) return null;
  const 틀 = 휴대폰 ? 폰틀 : PC틀;
  const 그림 = 추이그림(점들, 틀);
  const 끝 = 그림.점.at(-1)!;
  // 눈금 선이 첫 점보다 앞에서 시작하는 거리 — 휴대폰은 왼쪽 여백이 좁아 눈금 숫자가 잘리지 않게 줄인다
  const 띄움 = 휴대폰 ? 8 : 20;
  const 사이 = 그림.점.length > 1 ? (틀.오른 - 틀.왼) / (그림.점.length - 1) : 틀.오른 - 틀.왼;
  const 글자 = { fontFamily: 'inherit' };
  const 설명 = t('잔여 오류와 신규 오류 일별 추이. {줄}', {
    줄: 점들.map((p) => t('{날} 잔여 오류 {잔여}종 · 신규 오류 {신규}종', { 날: 날글자(p.day), 잔여: p.residual, 신규: p.newErrors })).join(', '),
  });
  const 고른 = 가리킨 === null ? null : 그림.점[가리킨];
  // 카드는 점 오른쪽에 서고, 오른쪽 끝에 가까우면 왼쪽으로 넘긴다
  const 카드폭 = 휴대폰 ? 130 : 150;
  const 카드x = 고른 === null || 고른 === undefined ? 0 : 고른.x + 16 + 카드폭 > 틀.폭 ? 고른.x - 16 - 카드폭 : 고른.x + 16;
  return (
    <div className="stab-chart">
      <svg viewBox={`0 0 ${String(틀.폭)} ${String(틀.높이)}`} role="img" aria-label={설명} onMouseLeave={() => set가리킨(null)}>
        <defs>
          <linearGradient id="stab-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--blue-1)" stopOpacity=".26" />
            <stop offset="1" stopColor="var(--blue-1)" stopOpacity=".02" />
          </linearGradient>
        </defs>
        <g stroke="var(--line)">
          {그림.눈금.map((눈) => (
            <line key={눈.값} x1={틀.왼 - 띄움} y1={눈.y} x2={틀.폭 - 띄움} y2={눈.y} />
          ))}
        </g>
        <g fill="var(--ink-faint)" fontSize={휴대폰 ? 10.5 : 11} textAnchor="end" style={글자}>
          {그림.눈금.map((눈) => (
            <text key={눈.값} x={틀.왼 - 띄움 - (휴대폰 ? 6 : 8)} y={눈.y + 4}>
              {눈.값}
            </text>
          ))}
        </g>
        <g className="dash-fade" fill="var(--blue-3)">
          {그림.점
            .filter((p) => p.newErrors > 0)
            .map((p) => (
              <rect key={p.runId} x={p.x - 틀.막대폭 / 2} y={p.막대y} width={틀.막대폭} height={틀.바닥 - p.막대y} rx={3} />
            ))}
        </g>
        <path className="dash-fade" d={그림.면} fill="url(#stab-g)" />
        <path className="dash-draw" pathLength={1} d={그림.선} fill="none" stroke="var(--blue-1)" strokeWidth={2.5} strokeLinecap="round" />
        {고른 === null || 고른 === undefined ? null : (
          <>
            <line x1={고른.x} y1={틀.위} x2={고른.x} y2={틀.바닥} stroke="var(--line-2)" />
            <circle cx={고른.x} cy={고른.y} r={5} fill="var(--blue-1)" stroke="var(--panel)" strokeWidth={2.5} />
          </>
        )}
        <circle cx={끝.x} cy={끝.y} r={6} fill="var(--blue-1)" stroke="var(--panel)" strokeWidth={2.5} />
        <text x={끝.x + 12} y={끝.y + 5} fill="var(--ink)" fontSize={휴대폰 ? 12.5 : 14} fontWeight={700} style={글자}>
          {t('{수}종', { 수: 끝.residual })}
        </text>
        <g fill="var(--ink-faint)" fontSize={휴대폰 ? 10.5 : 12} textAnchor="middle" style={글자}>
          {그림.점.map((p, i) =>
            날짜보임(i, 그림.점.length, 휴대폰) ? (
              <text key={p.runId} x={p.x} y={틀.바닥 + 22} {...(i === 그림.점.length - 1 ? { fill: 'var(--ink)', fontWeight: 600 } : {})}>
                {날글자(p.day)}
              </text>
            ) : null,
          )}
        </g>
        <g fontSize={휴대폰 ? 10 : 11} fontWeight={600} textAnchor="middle" style={글자}>
          {그림.점
            .filter((p) => p.buildChanged && p.buildNo !== null)
            .map((p) => {
              const 글 = 휴대폰 ? `#${p.buildNo!}` : t('#{빌드} 적용', { 빌드: p.buildNo! });
              const 폭 = 휴대폰 ? 40 : 56;
              return (
                <g key={p.runId}>
                  <rect x={p.x - 폭 / 2} y={틀.바닥 + 32} width={폭} height={휴대폰 ? 16 : 18} rx={9} fill="var(--accent-soft)" />
                  <text x={p.x} y={틀.바닥 + (휴대폰 ? 44 : 45)} fill="var(--link)">
                    {글}
                  </text>
                </g>
              );
            })}
        </g>
        {고른 === null || 고른 === undefined ? null : (
          <g style={글자} pointerEvents="none">
            <rect x={카드x} y={틀.위 + 18} width={카드폭} height={74} rx={8} fill="var(--panel)" stroke="var(--line)" />
            <text x={카드x + 14} y={틀.위 + 38} fill="var(--ink-muted)" fontSize={12}>
              {고른.buildNo === null ? 날글자(고른.day) : t('{날} · 빌드 #{빌드}', { 날: 날글자(고른.day), 빌드: 고른.buildNo })}
            </text>
            <circle cx={카드x + 19} cy={틀.위 + 57} r={4} fill="var(--blue-1)" />
            <text x={카드x + 29} y={틀.위 + 61} fill="var(--ink)" fontSize={13} fontWeight={600}>
              {t('잔여 오류 {수}종', { 수: 고른.residual })}
            </text>
            <rect x={카드x + 15} y={틀.위 + 74} width={8} height={8} rx={2} fill="var(--blue-3)" />
            <text x={카드x + 29} y={틀.위 + 82} fill="var(--ink)" fontSize={13}>
              {t('신규 오류 {수}종', { 수: 고른.newErrors })}
            </text>
          </g>
        )}
        {/* 마우스를 올리는 자리 — 점마다 세로 띠 하나 */}
        {그림.점.map((p, i) => (
          <rect key={p.runId} x={p.x - 사이 / 2} y={0} width={사이} height={틀.바닥} fill="transparent" onMouseEnter={() => set가리킨(i)} />
        ))}
      </svg>
      <div className="dash-legend stab-legend">
        <span>
          <i style={{ background: 'var(--blue-1)' }} />
          {t('잔여 오류')}
        </span>
        <span>
          <i style={{ background: 'var(--blue-3)' }} />
          {t('신규 오류')}
        </span>
        <span>
          <i style={{ background: 'var(--accent-soft)', border: '1px solid var(--line-2)' }} />
          {t('빌드 적용일')}
        </span>
      </div>
    </div>
  );
}

export function 추이판({ 응답, 기간, on기간 }: { 응답: 안정화응답; 기간: 7 | 30; on기간: (d: 7 | 30) => void }) {
  const t = use말();
  if (응답.run === null) return null;
  return (
    <section className="stab-panel dash-rise" aria-labelledby="stab-trend">
      <div className="stab-top">
        <h2 id="stab-trend">{t('잔여 오류 추이')}</h2>
        <div className="stab-seg" role="group" aria-label={t('기간')}>
          {([7, 30] as const).map((d) => (
            <button key={d} type="button" aria-pressed={기간 === d} className={기간 === d ? 'on' : ''} onClick={() => on기간(d)}>
              {t('{수}일', { 수: d })}
            </button>
          ))}
        </div>
      </div>
      <숫자칸들 run={응답.run} t={t} />
      <그래프 점들={응답.trend} t={t} />
    </section>
  );
}
