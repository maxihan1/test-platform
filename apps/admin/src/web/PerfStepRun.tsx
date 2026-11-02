// 마법사 4단계 — 대상 서버 · 부하 발생 에이전트 · 테스트 계정 · 서버 모니터링 · (부하 중 페이지 로딩 측정) · 실행 요약 (도메인/성능 §8.14)
// 「부하 중 페이지 로딩 측정」 칸은 웹 애플리케이션에만 선다(kind.ts 의 페이지성능)

import type { EnvRow } from './api.js';
import { use말 } from './i18n.js';
import type { PerfAgent } from './perfApi.js';
import { 실행상태 } from './SettingsPerfAgents.js';
import { Failed, Loading, type Async } from './ui.js';

export interface 사단계값 {
  env: string;
  agentIds: number[];
  monitorIds: number[];
  /** 부하 중 페이지 로딩 측정을 켠다 (웹 애플리케이션만) */
  pageCheck: boolean;
  /** 올릴 계정 CSV. 저장할 때 보내고 비운다 — 서버는 원문을 돌려주지 않는다(행 수만) */
  accountsCsv?: string;
}

export interface 요약줄 {
  이름: string;
  값: string;
}

/** CSV 를 고르자마자 행 수를 보인다. 첫 줄이 머리면 뺀다 — 서버 `계정줄들` 과 같은 규칙 (perf/scenarios.ts) */
export function 계정행수(csv: string): number {
  const 줄 = csv.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
  return 줄.length > 0 && /^(아이디|id|username|login)\s*,/i.test(줄[0] ?? '') ? 줄.length - 1 : 줄.length;
}

export function PerfStepRun({
  값,
  고침,
  envs,
  agents,
  저장된계정,
  요약,
  최대목표,
  쓰나,
  페이지칸,
}: {
  값: 사단계값;
  고침: (값: 사단계값) => void;
  envs: EnvRow[];
  agents: Async<{ agents: PerfAgent[] }>;
  저장된계정: number;
  요약: 요약줄[];
  최대목표: number;
  쓰나: boolean;
  /** 부하 중 페이지 로딩 측정 칸을 그릴지 — 웹 애플리케이션만 */
  페이지칸: boolean;
}) {
  const t = use말();
  if (agents.error !== null) return <Failed error={agents.error} />;
  if (agents.data === null) return <Loading />;
  const 부하 = agents.data.agents.filter((a) => a.mode === 'LOAD');
  const 감시 = agents.data.agents.filter((a) => a.mode === 'MONITOR');
  const 감당 = 부하.filter((a) => 값.agentIds.includes(a.id)).reduce((n, a) => n + (a.maxVus ?? 0), 0);
  const 바꾸기 = (목록: number[], id: number) => (목록.includes(id) ? 목록.filter((it) => it !== id) : [...목록, id]);
  const 계정수 = 값.accountsCsv === undefined ? 저장된계정 : 계정행수(값.accountsCsv);

  const 고르개 = (목록: PerfAgent[], 고른: number[], 키: 'agentIds' | 'monitorIds') => (
    <div className="perf-picks">
      {목록.map((a) => (
        <label key={a.id}>
          <input
            type="checkbox"
            checked={고른.includes(a.id)}
            // 끊긴 에이전트는 고를 수 없다 — 서버가 409 NO_AGENT 로 막는다. 이미 고른 것은 풀 수 있게 둔다
            disabled={!쓰나 || (a.status === 'OFFLINE' && !고른.includes(a.id))}
            onChange={() => 고침({ ...값, [키]: 바꾸기(고른, a.id) })}
          />{' '}
          {a.name} <span className="perf-faint">{t(실행상태(a))}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="perf-fields" style={{ alignItems: 'flex-start' }}>
      <section className="perf-panel" style={{ flex: '2 1 420px' }} aria-labelledby="perf-e">
        <h2 id="perf-e">{t('실행 설정')}</h2>
        <label className="perf-field">
          {t('대상 서버')}
          <select value={값.env} disabled={!쓰나} onChange={(e) => 고침({ ...값, env: e.target.value })}>
            <option value="">{t('고르기')}</option>
            {envs.map((it) => (
              <option key={it.env} value={it.env}>
                {it.env}
              </option>
            ))}
          </select>
        </label>
        <span className="perf-faint">{t('실서비스 서버로는 부하를 걸 수 없습니다')}</span>
        <div className="perf-field">
          {t('부하 발생 에이전트')}
          {부하.length === 0 ? <span className="perf-faint">{t('붙은 부하 발생 에이전트가 없습니다. 관리자가 설정 › 성능 에이전트에서 붙입니다')}</span> : 고르개(부하, 값.agentIds, 'agentIds')}
          {값.agentIds.length > 0 && 감당 < 최대목표 ? (
            <span className="perf-err">{t('고른 에이전트가 감당하는 가상 사용자는 {수}명입니다. 에이전트를 더 고르거나 부하를 줄여 주세요', { 수: 감당.toLocaleString() })}</span>
          ) : null}
        </div>
        <div className="perf-field">
          {t('테스트 계정')}
          <span>{계정수 === 0 ? t('없음 — 모든 가상 사용자가 같은 계정을 씁니다') : t('{수}개', { 수: 계정수.toLocaleString() })}</span>
          {쓰나 ? (
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label={t('테스트 계정 CSV 올리기')}
              onChange={(e) => {
                const 파일 = e.target.files?.[0];
                e.target.value = '';
                if (파일 !== undefined) void 파일.text().then((글) => 고침({ ...값, accountsCsv: 글 }));
              }}
            />
          ) : null}
          <span className="perf-faint">{t('한 줄에 아이디,비밀번호 · 가상 사용자마다 다른 계정으로 로그인합니다')}</span>
        </div>
        <div className="perf-field">
          {t('서버 모니터링')}
          {감시.length === 0 ? <span className="perf-faint">{t('이 프로젝트에 붙은 모니터링 에이전트가 없습니다')}</span> : 고르개(감시, 값.monitorIds, 'monitorIds')}
        </div>
        {페이지칸 ? (
          <div className="perf-field">
            <label>
              <input type="checkbox" checked={값.pageCheck} disabled={!쓰나} onChange={(e) => 고침({ ...값, pageCheck: e.target.checked })} /> {t('부하 중 페이지 로딩 측정')}
            </label>
            <span className="perf-faint">{t('가장 최근 페이지 성능 측정에서 쓴 페이지를 브라우저 2개가 30초마다 엽니다')}</span>
          </div>
        ) : null}
      </section>

      <section className="perf-panel" style={{ flex: '1 1 260px' }} aria-labelledby="perf-sum">
        <h2 id="perf-sum">{t('실행 요약')}</h2>
        <dl className="perf-sum">
          {요약.map((줄) => (
            <div key={줄.이름} style={{ display: 'contents' }}>
              <dt>{줄.이름}</dt>
              <dd>{줄.값}</dd>
            </div>
          ))}
        </dl>
        <div className="perf-well perf-faint">{t('본 테스트 전에 스모크 테스트(가상 사용자 1명, 1분)를 자동으로 돌립니다. 스크립트 오류가 있으면 여기서 중단합니다')}</div>
      </section>
    </div>
  );
}
