// 대시보드 「성능 테스트」 — 부하 테스트(숫자 · 초 그래프 · 서버 모니터링) · 페이지 성능 · 앱 성능 · 게임 성능 (도메인/리포팅 §8.12 「프로젝트 요약」)

import type { ReactNode } from 'react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { 굴림숫자, 떠오름, 수글, 자람 } from './DashboardTop.js';
import { 날짜글자 } from './dashboardView.js';
import { use말 } from './i18n.js';

type 성능 = 대시보드응답['project']['perf'];
type 부하 = NonNullable<성능['load']>;
type 기기 = NonNullable<성능['app']>;
type 말 = ReturnType<typeof use말>;

const 판정칩 = ({ v, t }: { v: 'PASS' | 'FAIL'; t: 말 }) => <span className={`dash-chip ${v === 'PASS' ? 'p' : 'f'} dash-r`}>{t(v === 'PASS' ? '통과' : '실패')}</span>;
const 날 = (iso: string | null): string => (iso === null ? '' : 날짜글자(iso.slice(0, 10)));
const 값글 = (v: number | null, 단위 = ''): string => (v === null ? '—' : `${수글(v)}${단위}`);

const 높이 = 170;
const 바닥 = 162;
const 꼭대기 = 40;

/** 초 단위 그래프 — 가상 사용자 면 · 초당 요청 선(파란 단계) · 95% 응답시간 선(대표색). 셋은 저마다의 최대값으로 높이를 맞춘다 */
function 부하그래프({ 줄들, t }: { 줄들: 부하['series']; t: 말 }) {
  if (줄들.length < 2) return null;
  const 끝 = 줄들[줄들.length - 1]!.sec || 1;
  const x = (sec: number) => ((sec * 640) / 끝).toFixed(1);
  const 선 = (값: (r: 부하['series'][number]) => number | null): string => {
    const 최대 = Math.max(1, ...줄들.map((r) => 값(r) ?? 0));
    return 줄들
      .filter((r) => 값(r) !== null)
      .map((r, i) => `${i === 0 ? 'M' : 'L'}${x(r.sec)} ${(바닥 - ((값(r) ?? 0) / 최대) * (바닥 - 꼭대기)).toFixed(1)}`)
      .join(' ');
  };
  const 사용자선 = 선((r) => r.vus);
  const p95들 = 줄들.flatMap((r) => (r.p95Ms === null ? [] : [r.p95Ms]));
  return (
    <>
      <svg viewBox={`0 0 640 ${높이}`} width="100%" height={높이} role="img" aria-label={t('{초}초 동안 가상 사용자 · 초당 요청 · 95% 응답시간', { 초: 끝 })}>
        <defs>
          <linearGradient id="dash-vg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--blue-1)" stopOpacity=".28" />
            <stop offset="1" stopColor="var(--blue-1)" stopOpacity=".02" />
          </linearGradient>
        </defs>
        {[꼭대기, (꼭대기 + 바닥) / 2, 바닥].map((y) => (
          <line key={y} x1="0" y1={y} x2="640" y2={y} stroke="var(--line)" />
        ))}
        <path className="dash-fade" d={`${사용자선} L640 ${높이} L0 ${높이} Z`} fill="url(#dash-vg)" />
        <path className="dash-draw" pathLength={1} d={선((r) => r.rps)} fill="none" stroke="var(--blue-1)" strokeWidth="2" />
        <path className="dash-draw" pathLength={1} d={선((r) => r.p95Ms)} fill="none" stroke="var(--accent)" strokeWidth="1.6" />
      </svg>
      <div className="dash-legend">
        <span><i className="b3" />{t('가상 사용자 (최대 {수})', { 수: Math.max(...줄들.map((r) => r.vus)) })}</span>
        <span><i className="b1" />{t('초당 요청 수')}</span>
        <span>
          <i className="acc" />
          {t('95% 응답시간')}
          {p95들.length === 0 ? '' : ` (${String(Math.min(...p95들))}~${String(Math.max(...p95들))}ms)`}
        </span>
        <span className="mono">{t('0초 ── {초}초', { 초: 끝 })}</span>
      </div>
    </>
  );
}

function 모니터링({ 호스트, t }: { 호스트: 부하['hosts']; t: 말 }) {
  const 칸들: [string, string, number | null][] = [
    ['CPU', 호스트?.cpu == null ? '—' : `${String(호스트.cpu)}%`, 호스트?.cpu ?? null],
    [t('메모리'), 호스트?.mem == null ? '—' : `${String(호스트.mem)}%`, 호스트?.mem ?? null],
    [t('디스크'), 값글(호스트?.diskKbps ?? null, 'KB/s'), null],
    [t('네트워크'), 값글(호스트?.netKbps ?? null, 'KB/s'), null],
  ];
  return (
    <>
      <div className="dash-h2" style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
        <span className="dash-lab">{호스트 === null ? t('서버 모니터링') : t('서버 모니터링 · 부하 중 최대값')}</span>
        {호스트 === null ? <span className="dash-lab dash-r">{t('모니터링 에이전트 연결 전')}</span> : null}
      </div>
      <div className="dash-mon" style={{ paddingTop: 0, borderTop: 0 }}>
        {칸들.map(([이름, 글, 몫], i) => (
          <div key={이름}>
            <div className="hd">
              <span className="dash-lab">{이름}</span>
              <span className="mono">{글}</span>
            </div>
            <div className="dash-bar" style={{ height: 6 }}>
              {몫 === null ? null : <i className="dash-grow" style={{ ...자람(i + 1), width: `${Math.min(100, 몫)}%` }} />}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function 부하칸({ 부하, t }: { 부하: 부하 | null; t: 말 }) {
  return (
    <section className="dash-panel dash-rise" style={떠오름(11)}>
      <div className="dash-h2">
        <h2>{t('부하 테스트')}</h2>
        {부하 === null ? null : (
          <>
            <span className="dash-lab">
              {부하.serviceName} · {부하.scenarioName} · <span className="mono">#{부하.runId}</span> · {날(부하.startedAt)}
            </span>
            <판정칩 v={부하.verdict} t={t} />
          </>
        )}
      </div>
      {부하 === null ? (
        <p className="dash-calm">{t('부하 테스트 기록 없음')}</p>
      ) : (
        <>
          <div className="dash-k4">
            <div>
              <div className="dash-lab">{t('최대 동시 사용자')}</div>
              <div className="v num">{부하.peakVus === null ? '—' : <굴림숫자 글={수글(부하.peakVus)} 늦춤={0.6} />}</div>
            </div>
            <div>
              <div className="dash-lab">{t('최대 TPS')}</div>
              <div className="v num">{부하.maxTps === null ? '—' : <굴림숫자 글={수글(부하.maxTps)} 늦춤={0.68} />}</div>
            </div>
            <div>
              <div className="dash-lab">{t('95% 응답시간')}</div>
              <div className="v num">{부하.p95Ms === null ? '—' : <><굴림숫자 글={수글(부하.p95Ms)} 늦춤={0.76} />ms</>}</div>
              {부하.targets.p95Ms === null ? null : <div className="dash-lab">{t('목표 {값}', { 값: `${수글(부하.targets.p95Ms)}ms` })}</div>}
            </div>
            <div>
              <div className="dash-lab">{t('에러율')}</div>
              <div className="v num">{값글(부하.errorRate, '%')}</div>
              {부하.targets.errorRate === null ? null : <div className="dash-lab">{t('목표 {값}', { 값: `${String(부하.targets.errorRate)}%` })}</div>}
            </div>
          </div>
          <부하그래프 줄들={부하.series} t={t} />
          <모니터링 호스트={부하.hosts} t={t} />
        </>
      )}
    </section>
  );
}

function 페이지칸({ 페이지, t }: { 페이지: 성능['pages']; t: 말 }) {
  const 목표 = 페이지?.targets;
  const 칸 = (v: number | null, 한계: number | null | undefined, 글: string) => (
    <td className={v !== null && 한계 != null && v > 한계 ? 'mono bad' : 'mono'}>{v === null ? '—' : 글}</td>
  );
  return (
    <section className="dash-panel dash-rise" style={떠오름(12)}>
      <div className="dash-h2">
        <h2>{t('페이지 성능')}</h2>
        {페이지 === null ? null : <span className="dash-lab dash-r">{t('{이름} · 페이지마다 최근 측정', { 이름: 페이지.serviceName })}</span>}
      </div>
      {페이지 === null || 페이지.rows.length === 0 ? (
        <p className="dash-calm">{t('페이지 성능 측정 기록 없음')}</p>
      ) : (
        <table className="dash-pg">
          <thead>
            <tr>
              <th scope="col">{t('페이지')}</th>
              <th scope="col">LCP</th>
              <th scope="col">FCP</th>
              <th scope="col">CLS</th>
            </tr>
          </thead>
          <tbody>
            {페이지.rows.map((r) => (
              <tr key={r.url}>
                <td className="mono dash-cut" title={r.url}>{r.url}</td>
                {칸(r.lcpMs, 목표?.lcpMs, `${수글(r.lcpMs ?? 0)}ms`)}
                {칸(r.fcpMs, 목표?.fcpMs, `${수글(r.fcpMs ?? 0)}ms`)}
                {칸(r.cls, 목표?.cls, String(r.cls))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** 앱 · 게임 성능 카드 — 측정이 없으면 숨기지 않고 「값 없음」으로 빈 칸을 보인다 */
function 기기칸({ 제목, 측정, 칸들, 넓게, 차례, t }: { 제목: string; 측정: 기기 | null; 칸들: [string, string][]; 넓게: boolean; 차례: number; t: 말 }) {
  return (
    <section className={`dash-panel dash-rise${넓게 ? ' wide' : ''}`} style={떠오름(차례)}>
      <div className="dash-h2">
        <h2>{제목}</h2>
        {측정 === null ? <span className="dash-chip n dash-r">{t('값 없음')}</span> : <판정칩 v={측정.verdict} t={t} />}
      </div>
      <div className="dash-lab">{측정 === null ? t('최근 측정 기록이 없습니다') : [측정.serviceName, 측정.device, 날(측정.startedAt)].filter(Boolean).join(' · ')}</div>
      <div className={`dash-devf${넓게 ? ' four' : ''}${측정 === null ? ' none' : ''}`}>
        {칸들.map(([이름, 값]) => (
          <div key={이름}>
            <div className="dash-lab">{이름}</div>
            <div className="v num">{측정 === null ? '—' : 값}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function 성능칸({ 성능, 종류들, 실패유형 }: { 성능: 성능; 종류들: Set<string>; 실패유형: ReactNode }) {
  const t = use말();
  const 앱있나 = 종류들.has('APP');
  const 게임있나 = 종류들.has('GAME');
  const 둘다 = 앱있나 && 게임있나;
  const a = 성능.app;
  const g = 성능.game;
  return (
    <>
      <div className="dash-sec dash-rise" style={떠오름(10)}>
        <h2>{t('성능 테스트')}</h2>
        <span className="dash-lab">{t('서버 · 웹 클라이언트 · 앱과 게임 클라이언트')}</span>
      </div>
      <div className={종류들.has('SCREEN') ? 'dash-perf2' : ''}>
        <부하칸 부하={성능.load} t={t} />
        {종류들.has('SCREEN') ? <페이지칸 페이지={성능.pages} t={t} /> : null}
      </div>
      <div className="dash-three">
        {앱있나 ? (
          <기기칸
            제목={t('앱 성능')}
            측정={a}
            넓게={!둘다}
            차례={13}
            t={t}
            칸들={[
              [t('CPU 평균'), a?.avgCpu == null ? '—' : `${String(a.avgCpu)}%`],
              [t('메모리 최대'), 값글(a?.maxMemMb ?? null, 'MB')],
              [t('앱 실행 시간'), a?.launchMs == null ? '—' : t('{초}초', { 초: (a.launchMs / 1000).toFixed(1) })],
              [t('프레임 드랍률'), a?.jankPct == null ? '—' : `${String(a.jankPct)}%`],
            ]}
          />
        ) : null}
        {게임있나 ? (
          <기기칸
            제목={t('게임 성능')}
            측정={g}
            넓게={!둘다}
            차례={14}
            t={t}
            칸들={[
              [t('FPS 평균'), 값글(g?.avgFps ?? null)],
              ['1% Low FPS', 값글(g?.low1Fps ?? null)],
              [t('프리징'), g?.freezeCount == null ? '—' : t('{수}회', { 수: g.freezeCount })],
              [t('디바이스 온도'), g?.maxTempC == null ? '—' : `${String(g.maxTempC)}℃`],
            ]}
          />
        ) : null}
        <div style={앱있나 || 게임있나 ? undefined : { gridColumn: '1 / -1' }}>{실패유형}</div>
      </div>
    </>
  );
}
