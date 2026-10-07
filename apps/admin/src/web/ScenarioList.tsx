// E2E 시나리오 목록 화면. 시나리오를 훑고 대상 서버를 골라 바로 실행한다 (도메인/시나리오 §8.11 · 실행 §8.7)
//
// 줄 격자와 클래스는 ScenarioRunList 와 같다. 색은 판정만 낸다 — 확인 필요 · 실행 불가 · 미확정 포함은 중립 칩이다.

import { Fragment, useState } from 'react';

import type { EnvRow } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import type { 판정 } from './role.js';
import { scenarioApi, type ScenarioRow } from './scenarioApi.js';
import { Failed, Loading, message, useAsync, Verdict, when } from './ui.js';

type 마지막 = NonNullable<ScenarioRow['lastRun']>;

export function ScenarioList({ service, envs, 할수 }: { service: string; envs: EnvRow[]; 할수: 판정 }) {
  const t = use말();
  const 언어 = use언어();
  const 쓰나 = 할수('실행');
  const [env, setEnv] = useState('');
  // 안내는 한 번에 한 줄 아래에만 둔다 — 앞 줄의 안내를 남기면 어느 줄 이야기인지 흐려진다
  const [안내, set안내] = useState<{ id: number; 글: string } | null>(null);
  const [돌리는중, set돌리는중] = useState<number | null>(null);
  const list = useAsync(() => scenarioApi.list(service), [service]);

  if (list.error !== null) return <Failed error={list.error} />;
  if (list.data === null) return <Loading />;

  const 새시나리오 = 쓰나 ? (
    <a className="btn" href="#/scenarios/new">
      {t('새 시나리오')}
    </a>
  ) : null;
  const 미확정섞임 = list.data.items.some((it) => it.lastRun?.verdict === 'PASS' && it.lastRun.unconfirmed);

  async function 실행(id: number) {
    if (env === '') {
      // 버튼을 잠그지 않고 누르면 사유를 보여준다 (SPEC §8.2)
      set안내({ id, 글: t('대상 서버를 고르세요. 증적에는 어느 서버에서 실행했는지가 꼭 남아야 합니다.') });
      return;
    }
    set안내(null);
    set돌리는중(id);
    try {
      const { runId } = await scenarioApi.run(id, env);
      window.location.hash = `#/runs/${runId}`;
    } catch (err) {
      set안내({ id, 글: message(err, 언어) });
    } finally {
      set돌리는중(null);
    }
  }

  return (
    <>
      <Head
        제목={t('E2E 시나리오')}
        부제={t('기능 테스트 케이스를 차례로 실행해 흐름이 끊기지 않는지 확인합니다')}
        행동={새시나리오}
      />

      <div className="screen list-screen">
        {!쓰나 || list.data.items.length === 0 ? null : (
          <div className="toolbar">
            {envs.length === 0 ? (
              <span className="err">{t('이 서비스에 등록된 대상 서버가 없습니다. 설정에서 추가해야 실행할 수 있습니다')}</span>
            ) : (
              <>
                <label className="filter-label" htmlFor="sc-env">
                  {t('대상 서버')}
                </label>
                <select id="sc-env" value={env} onChange={(e) => setEnv(e.target.value)}>
                  {/* 기본값이 없다. 반드시 고른다 (SPEC §8.2) */}
                  <option value="">{t('선택하세요')}</option>
                  {envs.map((it) => (
                    <option key={it.env} value={it.env}>
                      {it.env}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}

        <div className="rows-scroll">
          {list.data.items.length === 0 ? (
            <div className="empty">
              {t('아직 만든 시나리오가 없습니다')}
              <small>{t('기능 테스트 케이스를 단계로 이어 붙여 만듭니다')}</small>
              {새시나리오 === null ? null : <div style={{ marginTop: '14px' }}>{새시나리오}</div>}
            </div>
          ) : (
            <>
              <표머리 />
              {list.data.items.map((it) => (
                <Fragment key={it.id}>
                  <시나리오줄 줄={it} 쓰나={쓰나} 돌리는중={돌리는중 === it.id} on실행={() => void 실행(it.id)} />
                  {안내?.id !== it.id ? null : (
                    <div className="err scenario-note" role="status">
                      {안내.글}
                    </div>
                  )}
                </Fragment>
              ))}
            </>
          )}
        </div>

        {!미확정섞임 ? null : (
          <p className="scenario-foot">
            {t('「통과 · 미확정 포함」은 기대값을 화면에서 읽은 케이스가 섞인 결과라 정식 통과로 세지 않습니다')}
          </p>
        )}
      </div>
    </>
  );
}

function 표머리() {
  const t = use말();
  return (
    <div className="rowhead runhead" role="row">
      <span aria-hidden="true" />
      <span role="columnheader">{t('번호')}</span>
      <span role="columnheader">{t('이름')}</span>
      <span role="columnheader">{t('결과')}</span>
    </div>
  );
}

function 결과({ 지난 }: { 지난: 마지막 }) {
  const t = use말();
  if (지난.verdict === null) return <>{t('실행 중')}</>;
  if (지난.verdict === 'PASS' && 지난.unconfirmed) return <span className="case-tag">{t('통과 · 미확정 포함')}</span>;
  return <Verdict status={지난.verdict} />;
}

function 시나리오줄({
  줄,
  쓰나,
  돌리는중,
  on실행,
}: {
  줄: ScenarioRow;
  쓰나: boolean;
  돌리는중: boolean;
  on실행: () => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const 지난 = 줄.lastRun;

  return (
    <div className="row">
      <div className="gutter" style={{ background: 'var(--line-2)' }} />
      <div className="tcid">SC-{줄.id}</div>
      <div className="title">
        <a className="scn-row-name" href={`#/scenarios/${줄.id}`}>
          {줄.name}
        </a>
        {!줄.needsCheck ? null : <span className="case-tag">{t('확인 필요')}</span>}
        {줄.runnable ? null : <span className="case-tag">{t('실행 불가')}</span>}
        <small>
          {t('단계 {수}개', { 수: 줄.partCount })} · v{줄.version} ·{' '}
          {지난 === null ? t('실행 전') : 지난.finishedAt === null ? t('실행 중') : when(지난.finishedAt, 언어)}
        </small>
      </div>
      <div className="right runright">
        <div className="scenario-result">
          {지난 === null ? null : (
            <a href={`#/runs/${지난.runId}`}>
              <결과 지난={지난} />
            </a>
          )}
        </div>
        {!쓰나 || !줄.runnable || !줄.isActive ? null : (
          <button type="button" className="btn small ghost" disabled={돌리는중} onClick={on실행}>
            {t('실행')}
          </button>
        )}
      </div>
    </div>
  );
}
