// E2E 시나리오 목록 화면. 시나리오를 훑고 대상 서버를 골라 바로 실행한다 (도메인/시나리오 §8.11 · 실행 §8.7)
//
// 줄 격자와 클래스는 ScenarioRunList 와 같다. 색은 판정만 낸다 — 확인 필요 · 실행 불가 · 미확정은 중립 칩이다.

import { Fragment, useState } from 'react';

import { ApiError, type EnvRow, type 앱종류 } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 종류 } from './kind.js';
import { 고른서버를적는다, 마지막서버 } from './layout.js';
import { Modal } from './Modal.js';
import type { 판정 } from './role.js';
import { scenarioApi, type ScenarioRow } from './scenarioApi.js';
import { ScenarioWhy } from './ScenarioListWhy.js';
import { 결과주소 } from './ScenarioResultNext.js';
import { 폰실행위치 } from './ScenarioTrial.js';
import { Failed, Loading, message, useAsync, Verdict, when } from './ui.js';

type 마지막 = NonNullable<ScenarioRow['lastRun']>;

export function ScenarioList({ service, 앱종류, envs, 할수 }: { service: string; 앱종류?: 앱종류; envs: EnvRow[]; 할수: 판정 }) {
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
  const [치울것, set치울것] = useState<ScenarioRow | null>(null);
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

  async function 실행(id: number) {
    if (env === '') {
      // 버튼을 잠그지 않고 누르면 사유를 보여준다 (SPEC §8.2)
      set안내({ id, 글: t('대상 서버를 고르세요. 리포트에는 어느 서버에서 실행했는지가 꼭 남아야 합니다.') });
      return;
    }
    set안내(null);
    set돌리는중(id);
    try {
      const { runId } = await scenarioApi.run(id, env);
      window.location.hash = 결과주소(runId, 'scenarios');
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
            {종류(앱종류).시나리오디바이스.includes('android') ? <폰실행위치 시험={false} /> : null}
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
                    on실행={() => void 실행(it.id)}
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

// 서버는 지우지 않고 목록에서 빼지만(archive) 되살리는 통로가 없어 쓰는 사람에게는 삭제다. 누르기 전에 한 번 묻는다 (DESIGN.md 「모달」 ①)
function 치우기확인({ 줄, onClose, on치움 }: { 줄: ScenarioRow; onClose: () => void; on치움: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [치우는중, set치우는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  // 요청이 나간 뒤에는 닫지 못하게 한다 — 닫혀도 요청은 끝까지 가서 「취소」가 거짓말이 된다
  const 닫기 = () => {
    if (!치우는중) onClose();
  };
  return (
    <Modal
      제목={t('SC-{번호} 시나리오를 삭제할까요?', { 번호: 줄.id })}
      onClose={닫기}
      바깥눌러닫기={!치우는중}
      버튼={
        <>
          <button type="button" className="btn ghost" disabled={치우는중} onClick={닫기}>
            {t('취소')}
          </button>
          <button
            type="button"
            className="btn"
            disabled={치우는중}
            onClick={() => {
              set치우는중(true);
              set오류(null);
              void scenarioApi
                .archive(줄.id)
                .then(on치움)
                .catch((err: unknown) => {
                  // 이미 없는 시나리오면 목록에서 빼는 것이 맞다 — 남겨 두면 눌러도 같은 오류만 되풀이된다
                  if (err instanceof ApiError && err.status === 404) {
                    on치움();
                    return;
                  }
                  set오류(message(err, 언어));
                  set치우는중(false);
                });
            }}
          >
            {치우는중 ? t('삭제하는 중') : t('삭제')}
          </button>
        </>
      }
    >
      <p>
        {줄.name}
        <br />
        {t('지난 실행 기록과 리포트는 그대로 남습니다.')}
        <br />
        {t('삭제한 시나리오는 되살릴 수 없습니다.')}
      </p>
      {오류 === null ? null : <p className="err">{오류}</p>}
    </Modal>
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
        {!쓰나 || !줄.runnable || !줄.isActive ? null : (
          <button type="button" className="btn small ghost" disabled={돌리는중} onClick={on실행}>
            {t('실행')}
          </button>
        )}
        {/* 못 도는 줄은 실행 자리에 수정을 둔다 — 까닭을 읽은 사람이 다음에 할 일이 그것이다 */}
        {!쓰나 || 줄.runnable || !줄.isActive ? null : (
          <a className="btn small ghost" href={`#/scenarios/${줄.id}`}>
            {t('수정')}
          </a>
        )}
        {/* 실행 불가 줄도 삭제한다 — 못 도는 시나리오가 가장 먼저 지울 거리다 */}
        {!쓰나 || !줄.isActive ? null : (
          <button type="button" className="btn small ghost" disabled={돌리는중} onClick={on치우기}>
            {t('삭제')}
          </button>
        )}
      </div>
    </div>
  );
}
