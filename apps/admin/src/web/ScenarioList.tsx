// E2E 시나리오 목록 화면. 시나리오를 훑고 대상 서버를 골라 바로 실행한다 (도메인/시나리오 §8.11 · 실행 §8.7)
//
// 줄 격자와 클래스는 ScenarioRunList 와 같다. 색은 판정만 낸다 — 확인 필요 · 실행 불가 · 미확정은 중립 칩이다.

import { Fragment, useState } from 'react';

import { type EnvRow, type 앱종류, type 모바일위치 } from './api.js';
import './e2eWindow.css';
import { 디바이스글 } from './e2eWindowView.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 종류 } from './kind.js';
import { 고른서버를적는다, 마지막서버 } from './layout.js';
import type { 판정 } from './role.js';
import { scenarioApi, type ScenarioRow } from './scenarioApi.js';
import { 치우기확인 } from './ScenarioListArchive.js';
import { ScenarioWhy } from './ScenarioListWhy.js';
import { 결과주소 } from './ScenarioResultNext.js';
import { ScenarioRunWindow } from './ScenarioRunWindow.js';
import { ScenarioStartConfirm } from './ScenarioStartConfirm.js';
import { 모바일실행위치, 폰실행위치 } from './ScenarioTrial.js';
import { Failed, Loading, message, useAsync, Verdict, when } from './ui.js';

type 마지막 = NonNullable<ScenarioRow['lastRun']>;

export function ScenarioList({ service, kind, envs, 할수 }: { service: string; kind?: 앱종류; envs: EnvRow[]; 할수: 판정 }) {
  const t = use말();
  const 언어 = use언어();
  const 쓰나 = 할수('실행');
  // 이 서비스에서 마지막에 고른 서버(하나뿐이면 그 서버)로 연다 — 기본값은 없다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  const [env, setEnv] = useState(() => {
    return 마지막서버(service, envs);
  });
  // 안내는 한 번에 한 줄 아래에만 둔다 — 앞 줄의 안내를 남기면 어느 줄 이야기인지 흐려진다
  const [안내, set안내] = useState<{ id: number; 글: string } | null>(null);
  const [돌리는중, set돌리는중] = useState<number | null>(null);
  // 모바일 시나리오의 정식 실행 위치. 기본은 서버 흉내다 — 실행 창과 같다 (도메인/실행 §3.2 「모바일 웹 실행 위치」)
  const [mobileOn, setMobileOn] = useState<모바일위치>('server');
  const [치울것, set치울것] = useState<ScenarioRow | null>(null);
  // 실행 단추는 바로 걸지 않고 시작 확인 상자를 먼저 띄운다. 걸린 실행은 같은 틀 창에서 지켜본다 (도메인/실행 §8.16 ⑥)
  const [확인, set확인] = useState<ScenarioRow | null>(null);
  const [실행창, set실행창] = useState<number | null>(null);
  // 삭제한 줄은 다시 받지 않고 화면에서 뺀다 — 다시 받기가 실패하면 목록 전체가 오류 화면으로 바뀐다
  const [치운, set치운] = useState<number[]>([]);
  const list = useAsync(() => scenarioApi.list(service), [service]);

  if (list.error !== null) return <Failed error={list.error} />;
  if (list.data === null) return <Loading />;
  const 줄들 = list.data.items.filter((it) => !치운.includes(it.id));

  // 새 시나리오는 마법사로 만든다. 빈 조립 화면은 마법사 머리의 「조립 화면으로」로 간다 (도메인/시나리오 §3.7 결정 15)
  const 새시나리오 = 쓰나 ? (
    <a className="btn" href="#/scenarios/new">
      {t('새 시나리오')}
    </a>
  ) : null;

  function 누름(줄: ScenarioRow) {
    if (env === '') {
      // 버튼을 잠그지 않고 누르면 사유를 보여준다 (SPEC §8.2)
      set안내({ id: 줄.id, 글: t('대상 서버를 선택하세요. 리포트에는 어느 서버에서 실행했는지가 꼭 남아야 합니다.') });
      return;
    }
    set안내(null);
    set확인(줄);
  }

  async function 실행(id: number, 모바일: boolean) {
    set돌리는중(id);
    try {
      // 고른 실행 위치는 모바일 시나리오에만 싣는다 — PC 시나리오에 남은 값이 따라가지 않게
      const { runId } = await scenarioApi.run(id, env, 모바일 ? mobileOn : 'server');
      set실행창(runId);
    } catch (err) {
      set안내({ id, 글: message(err, 언어) });
    } finally {
      set돌리는중(null);
    }
  }

  return (
    <>
      <Head
        제목={t('E2E 테스트')}
        부제={t('기능 테스트 스크립트를 차례로 실행해 흐름이 끊기지 않는지 확인합니다')}
        행동={새시나리오}
      />

      <div className="screen list-screen">
        {!쓰나 || 줄들.length === 0 ? null : (
          <div className="toolbar">
            {envs.length === 0 ? (
              <span className="err">{t('이 애플리케이션에 등록된 대상 서버가 없습니다. 설정에서 추가해야 실행할 수 있습니다')}</span>
            ) : (
              <>
                <label className="filter-label" htmlFor="sc-env">
                  {t('대상 서버')}
                </label>
                <select id="sc-env" value={env} onChange={(e) => { setEnv(e.target.value); 고른서버를적는다(service, e.target.value); }}>
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
            {/* 앱 · 게임 애플리케이션의 시나리오는 늘 폰 단계로 시작한다 — 목록의 실행은 정식 실행이라 시험 실행 줄은 뺀다 (§3.7 결정 16) */}
            {종류(kind).시나리오디바이스.includes('android') ? <폰실행위치 시험={false} /> : null}
            {줄들.some((it) => it.platform === 'mobile') ? <모바일실행위치 값={mobileOn} on바꿈={setMobileOn} /> : null}
          </div>
        )}

        <div className="rows-scroll">
          {줄들.length === 0 ? (
            <div className="empty">
              {t('아직 만든 시나리오가 없습니다')}
              <small>{t('기능 테스트 스크립트를 단계로 이어 붙여 만듭니다')}</small>
              {새시나리오 === null ? null : <div style={{ marginTop: '14px' }}>{새시나리오}</div>}
            </div>
          ) : (
            <>
              <표머리 />
              {줄들.map((it) => (
                <Fragment key={it.id}>
                  <시나리오줄
                    줄={it}
                    쓰나={쓰나}
                    돌리는중={돌리는중 === it.id}
                    on실행={() => 누름(it)}
                    on치우기={() => set치울것(it)}
                  />
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
      </div>

      {확인 === null ? null : (
        <ScenarioStartConfirm
          시나리오={`SC-${확인.id} ${확인.name}`}
          단계수={확인.partCount}
          디바이스={디바이스글(t, 확인.platform, mobileOn)}
          env={env}
          onClose={() => set확인(null)}
          on시작={() => {
            set확인(null);
            void 실행(확인.id, 확인.platform === 'mobile');
          }}
        />
      )}
      {실행창 === null ? null : <ScenarioRunWindow runId={실행창} 어디서="scenarios" on닫기={() => set실행창(null)} />}

      {치울것 === null ? null : (
        <치우기확인
          줄={치울것}
          onClose={() => set치울것(null)}
          on치움={() => {
            if (안내?.id === 치울것.id) set안내(null);
            set치운((앞) => [...앞, 치울것.id]);
            set치울것(null);
          }}
        />
      )}
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
  return (
    <>
      <Verdict status={지난.verdict} />
      {지난.unconfirmed ? <span className="case-tag">{t('미확정')}</span> : null}
    </>
  );
}

function 시나리오줄({
  줄,
  쓰나,
  돌리는중,
  on실행,
  on치우기,
}: {
  줄: ScenarioRow;
  쓰나: boolean;
  돌리는중: boolean;
  on실행: () => void;
  on치우기: () => void;
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
        {줄.runnable && !줄.needsCheck ? null : <ScenarioWhy 줄={줄} />}
        <small>
          {t('단계 {수}개', { 수: 줄.partCount })} · v{줄.version} ·{' '}
          {지난 === null ? t('실행 전') : 지난.finishedAt === null ? t('실행 중') : when(지난.finishedAt, 언어)}
        </small>
      </div>
      <div className="right runright">
        <div className="scenario-result">
          {지난 === null ? null : (
            <a href={결과주소(지난.runId, 'scenarios')}>
              <결과 지난={지난} />
            </a>
          )}
        </div>
        {/* 삭제는 되돌릴 수 없어 줄 끝 「⋯」 안에 둔다 — 줄에는 「실행」만 서서 누르려던 손이 「삭제」에 닿지 않는다 (점검표 D10 · 시나리오 §8.11). 못 도는 줄은 실행 자리에 수정이다 */}
        {!쓰나 || !줄.isActive ? null : (
          <div className="scn-row-acts">
            {줄.runnable ? (
              <button type="button" className="btn small ghost" disabled={돌리는중} onClick={on실행}>
                {t('실행')}
              </button>
            ) : (
              <a className="btn small ghost" href={`#/scenarios/${줄.id}`}>
                {t('수정')}
              </a>
            )}
            <details className="scn-more">
              <summary className="btn small ghost" aria-label={t('SC-{번호} 더 보기', { 번호: 줄.id })}>
                ⋯
              </summary>
              <div className="scn-more-menu">
                <button type="button" className="btn small ghost" disabled={돌리는중} onClick={on치우기}>
                  {t('삭제')}
                </button>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
