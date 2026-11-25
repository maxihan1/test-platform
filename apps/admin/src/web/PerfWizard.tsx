// 성능 시나리오 만들기 · 고치기 — 네 단계 마법사 (도메인/성능 §8.14 · 시안 캔버스 버전 14 「고른 시안」 B)
// 고칠 때는 끝낸 단계를 눌러 바로 간다. 「실행」을 누르면 그 실행의 화면(#/perf/runs/번호)으로 간다

import { useEffect, useState } from 'react';

import type { ServiceRow, User } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 종류 } from './kind.js';
import { 고른서버를적는다 } from './layout.js';
import { perfApi, type PerfScenario, type ScenarioBody } from './perfApi.js';
import { PerfSchedule } from './PerfSchedule.js';
import { PerfStartConfirm, 부하확인줄 } from './PerfStartConfirm.js';
import { PerfStepLoad, 유형글자 } from './PerfStepLoad.js';
import { PerfStepRun } from './PerfStepRun.js';
import { PerfStepScenario, type 일단계값 } from './PerfStepScenario.js';
import { PerfStepTargets } from './PerfStepTargets.js';
import { 저장꼴 } from './PerfTxDetail.js';
import { 넘길까닭, 최대목표 } from './perfView.js';
import { 처음값 } from './perfWizardInit.js';
import { 조건붙인주소, 떠나기로했다, 떠나기상자, 주소고치기, 주소조건 } from './leaveGuard.js';
import { 할수있나 } from './role.js';
import { Failed, Loading, message, useAsync } from './ui.js';
import { use단계주소 } from './useWizardStep.js';

type 단계 = 1 | 2 | 3 | 4;

export function PerfWizard({ id, 띠서비스, user }: { id: number | null; 띠서비스: ServiceRow | null; user: User }) {
  const t = use말();
  // 만드는 중 띠를 바꿔도 처음 애플리케이션에 만든다 — E2E 시나리오 조립과 같은 규칙 (main.tsx scenarioNew)
  const [처음띠] = useState(띠서비스);
  // 처음 저장한 시나리오를 새로고침으로 다시 열 때를 위해 주소의 id= 도 본다(경로는 `new` 그대로)
  const [주소번호] = useState(() => {
    const 글 = 주소조건().get('id');
    return 글 !== null && /^\d{1,10}$/.test(글) ? Number(글) : null;
  });
  const 읽을번호 = id ?? 주소번호;
  const 읽음 = useAsync(() => (읽을번호 === null ? Promise.resolve(null) : perfApi.scenario(읽을번호)).then((s) => ({ s })), [읽을번호]);
  if (읽음.error !== null) return <Failed error={읽음.error} />;
  if (읽음.data === null) return <Loading />;
  const 시나리오 = 읽음.data.s;
  // 고칠 때는 그 시나리오의 애플리케이션을 쓴다 — 띠에서 다른 것을 골라도 남의 대상 서버가 섞이지 않게
  const service = 시나리오 === null ? 처음띠 : (user.services.find((it) => it.id === 시나리오.serviceId) ?? null);
  if (service === null) return <div className="empty">{t('애플리케이션을 먼저 선택해 주세요')}</div>;
  return <마법사 시나리오={시나리오} service={service} user={user} />;
}

function 마법사({ 시나리오, service, user }: { 시나리오: PerfScenario | null; service: ServiceRow; user: User }) {
  const t = use말();
  const 언어 = use언어();
  const 쓰나 = 할수있나(user, service.prefix, '실행');
  // 웹이 아닌 애플리케이션은 칸이 없다 — 저장된 값이 남아 있어도 켜서 보내지 않는다
  const 웹 = 종류(service.kind).페이지성능;
  // 정기 실행은 admin 만 켜고 끈다 (도메인/성능 §3.9)
  const 관리자 = 할수있나(user, service.prefix, '설정');
  const [정기, set정기] = useState(시나리오?.schedule ?? null);
  const [정기창, set정기창] = useState(false);
  const [처음] = useState(처음값(시나리오, service));
  const [일, set일] = useState(처음.일);
  const [이, set이] = useState(처음.이);
  const [삼, set삼] = useState(처음.삼);
  const [사, set사] = useState(처음.사);
  // 마지막으로 저장한 네 단계 값. 이것과 다르면 떠나기 전에 묻는다
  const [저장본, set저장본] = useState(() => JSON.stringify([처음.일, 처음.이, 처음.삼, 처음.사]));
  const [번호, set번호] = useState<number | null>(시나리오?.id ?? null);
  const [버전, set버전] = useState<number | null>(시나리오?.version ?? null);
  const [저장된계정, set저장된계정] = useState(시나리오?.accountsRows ?? 0);
  const [초안, set초안] = useState<number | undefined>(undefined);
  const [지금, set지금] = useState<단계>(1);
  // 고칠 때는 처음부터 네 단계를 다 끝낸 것으로 본다 (§8.14 「끝낸 단계를 눌러 바로 간다」)
  const [끝낸, set끝낸] = useState<number>(시나리오 === null ? 0 : 4);
  const [알림, set알림] = useState<{ 글: string; 오류: boolean } | null>(null);
  const [하는중, set하는중] = useState(false);
  const [묻나, set묻나] = useState(false);
  const agents = useAsync(() => perfApi.agents(service.projectId), [service.projectId]);
  const 더미들 = useAsync(() => perfApi.dummyClients(service.id), [service.id]);
  const 더미 = 일.방식 === 'DUMMY';
  // 더미 클라이언트 실행은 부하 중 페이지 측정을 못 한다 — 서버가 400 으로 거절한다
  const 페이지칸 = 웹 && !더미;
  const 넘길재료 = { name: 일.name, txCount: 일.transactions.length, dummy: 더미, dummyPicked: 일.더미번호 !== null, stages: 이.stages };
  // 뒤로 가기 · 앞으로 가기 · 손으로 고친 주소도 다음 버튼과 같은 검사를 지난다 — 앞으로는 통과하는 데까지만 간다.
  // 처음 저장해 적은 번호(id=)도 이 마법사가 들고 있다 — 앞 단계 칸으로 뒤로 가도 같은 화면이라 쓴 값이 남고 다시 저장해도 둘이 안 생긴다
  const 스스로 = use단계주소(
    지금,
    (i) => {
      let 갈곳 = Math.min(4, Math.max(1, i));
      for (let s = 지금; s < 갈곳; s++) {
        if (넘길까닭(s as 1 | 2 | 3, 넘길재료, 언어) !== null) {
          갈곳 = s;
          break;
        }
      }
      set지금(갈곳 as 단계);
      return 갈곳;
    },
    1,
    ['id'],
  );
  // 더미 클라이언트는 동시 사용자 기준으로만 돈다 — TPS 로 잡아 둔 채 넘어오면 VUS 로 되돌린다
  // 저장한 번호를 주소에 적어 둔다 — 새로고침하면 저장한 시나리오를 이어 연다. 경로는 그대로 `new` 라 화면이 다시 뜨지 않는다
  useEffect(() => {
    // 저장하고 실행으로 넘어가는 중이면(주소가 이미 다른 화면) 건드리지 않는다
    if (번호 === null || !window.location.hash.startsWith('#/perf/scenarios/') || 주소조건().get('id') === String(번호)) return;
    const 조건 = Object.fromEntries(주소조건());
    주소고치기(조건붙인주소(window.location.hash.split('?')[0]!, { ...조건, id: String(번호) }));
  }, [번호, 지금]);
  const 일고침 = (값: 일단계값) => {
    set일(값);
    if (값.방식 === 'DUMMY' && 이.basis === 'TPS') set이({ ...이, basis: 'VUS' });
  };

  const 본문 = (): ScenarioBody => ({
    ...(더미 && 일.더미번호 !== null ? { dummyClient: 일.더미번호 } : { transactions: 일.transactions.map(저장꼴) }),
    load: { basis: 이.basis, stages: 이.stages, testType: 이.testType },
    targets: 삼.targets,
    run: { env: 사.env, agentIds: 사.agentIds, monitorIds: 사.monitorIds, ...이.칸, degradeAlert: 삼.degradeAlert, pageCheck: 페이지칸 && 사.pageCheck },
  });

  /** 1단계가 비어 저장할 수 없으면 거기로 보내고 참 */
  function 저장막힘(): boolean {
    const 까닭 = 넘길까닭(1, 넘길재료, 언어);
    if (까닭 === null) return false;
    스스로(1);
    set지금(1);
    set알림({ 글: 까닭, 오류: true });
    return true;
  }

  /** 저장하고 시나리오 번호를 돌려준다. 실패하면 알림을 띄우고 null */
  async function 저장(): Promise<number | null> {
    if (저장막힘()) return null;
    set하는중(true);
    set알림(null);
    try {
      let id = 번호;
      if (id === null) {
        const r = await perfApi.create(service.id, 일.name.trim(), 본문(), 초안);
        id = r.id;
        set버전(r.version);
        set번호(id);
      }
      if (번호 !== null || 사.accountsCsv !== undefined) {
        const r = await perfApi.save(id, 본문(), { accountsCsv: 사.accountsCsv, draftJobId: 번호 === null ? undefined : 초안 });
        set버전(r.version);
      }
      if (사.accountsCsv !== undefined) {
        const 읽은 = await perfApi.scenario(id);
        set저장된계정(읽은.accountsRows);
        set사({ ...사, accountsCsv: undefined });
      }
      set초안(undefined);
      set저장본(JSON.stringify([일, 이, 삼, { ...사, accountsCsv: undefined }]));
      set알림({ 글: t('저장했습니다'), 오류: false });
      return id;
    } catch (err) {
      set알림({ 글: message(err, 언어), 오류: true });
      return null;
    } finally {
      set하는중(false);
    }
  }

  /** 칸 검사를 다 지난 뒤에 묻는다. 저장은 확인한 뒤다 — 취소하면 아무것도 안 남는다 */
  function 실행누름() {
    if (사.env === '' || 사.agentIds.length === 0) {
      set알림({ 글: t('대상 서버와 부하 발생 에이전트를 선택해 주세요'), 오류: true });
      return;
    }
    if (저장막힘()) return;
    set알림(null);
    set묻나(true);
  }

  async function 실행() {
    set묻나(false);
    const id = await 저장();
    if (id === null) return;
    set하는중(true);
    try {
      고른서버를적는다(service.prefix, 사.env);
      const { runId } = await perfApi.run({ scenarioId: id, env: 사.env, testType: 이.testType, basis: 이.basis, stages: 이.stages, targets: 삼.targets, agentIds: 사.agentIds, monitorIds: 사.monitorIds, ...(페이지칸 && 사.pageCheck ? { pageCheck: true } : {}) });
      떠나기로했다();
      window.location.hash = `#/perf/runs/${String(runId)}`;
    } catch (err) {
      set알림({ 글: message(err, 언어), 오류: true });
    } finally {
      set하는중(false);
    }
  }

  function 다음() {
    if (지금 === 4) return;
    const 까닭 = 넘길까닭(지금, 넘길재료, 언어);
    if (까닭 !== null) {
      set알림({ 글: 까닭, 오류: true });
      return;
    }
    set알림(null);
    set끝낸(Math.max(끝낸, 지금));
    set지금((지금 + 1) as 단계);
  }

  const 최대 = 최대목표(이.stages);
  const 단위 = 이.basis === 'TPS' ? t('TPS') : t('명');
  const 단계들: { 번호: 단계; 이름: string; 요약?: string }[] = [
    { 번호: 1, 이름: t('시나리오'), 요약: 더미 ? t('더미 클라이언트') : t('트랜잭션 {수}개', { 수: 일.transactions.length }) },
    { 번호: 2, 이름: t('부하 설정'), 요약: t('{유형}, 최대 {수}{단위}', { 유형: t(유형글자[이.testType].이름), 수: 최대.toLocaleString(), 단위 }) },
    { 번호: 3, 이름: t('성능 목표'), 요약: t('{수}개', { 수: 삼.targets.length }) },
    { 번호: 4, 이름: t('실행') },
  ];

  const 요약 = 부하확인줄(t, {
    시나리오: 더미 ? t('{이름} (더미 클라이언트)', { 이름: 일.name }) : t('{이름} (트랜잭션 {수}개)', { 이름: 일.name, 수: 일.transactions.length }),
    유형: 이.testType,
    stages: 이.stages,
    단위,
    목표수: 삼.targets.length,
    env: 사.env,
  });

  return (
    <>
      <떠나기상자 막나={JSON.stringify([일, 이, 삼, 사]) !== 저장본} />
      <Head
        위치={t('성능 테스트')}
        제목={일.name.trim() === '' ? t('새 시나리오') : 일.name}
        부제={버전 === null ? t('새 시나리오') : t('버전 {버전}', { 버전 })}
        행동={
          <>
            {관리자 && 번호 !== null ? (
              <>
                {정기 === null ? null : <span className="perf-faint">{t('매일 {시각} · {서버}', { 시각: 정기.at, 서버: 정기.env })}</span>}
                <button type="button" className="btn ghost" onClick={() => set정기창(true)}>
                  {t('정기 실행')}
                </button>
              </>
            ) : null}
            {쓰나 ? (
              <button type="button" className="btn ghost" disabled={하는중} onClick={() => void 저장()}>
                {t('임시 저장')}
              </button>
            ) : null}
          </>
        }
      />
      {!묻나 ? null : <PerfStartConfirm 종류="LOAD" 줄들={요약} 안내={t('시나리오를 저장하고 대상 서버에 부하가 발생합니다. 실행 화면에서 중단할 수 있습니다')} onClose={() => set묻나(false)} on시작={() => void 실행()} />}
      {정기창 && 번호 !== null ? <PerfSchedule scenarioId={번호} envs={service.envs} 지금={정기} 바뀜={set정기} 닫기={() => set정기창(false)} /> : null}
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ol className="perf-steps" aria-label={t('시나리오 만들기 단계')}>
          {단계들.map((d) => {
            const 끝났나 = d.번호 <= 끝낸;
            return (
              <li key={d.번호}>
                <button
                  type="button"
                  className={끝났나 && d.번호 !== 지금 ? 'done' : undefined}
                  aria-current={d.번호 === 지금 ? 'step' : undefined}
                  disabled={d.번호 !== 지금 && d.번호 > 끝낸 + 1}
                  onClick={() => set지금(d.번호)}
                >
                  <span className="perf-dot">{d.번호}</span>
                  <span>
                    {d.이름}
                    {끝났나 && d.요약 !== undefined ? (
                      <>
                        <br />
                        <span className="perf-faint">{d.요약}</span>
                      </>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {지금 === 1 ? <PerfStepScenario 값={일} 고침={일고침} service={service} 새것={번호 === null} 쓰나={쓰나} 초안받음={set초안} 더미들={더미들.data?.clients ?? []} 더미오류={더미들.error === null ? null : message(더미들.error, 언어)} /> : null}
        {지금 === 2 ? <PerfStepLoad 값={이} 고침={set이} serviceId={service.id} 쓰나={쓰나} 더미={더미} /> : null}
        {지금 === 3 ? <PerfStepTargets 값={삼} 고침={set삼} serviceId={service.id} 트랜잭션들={더미 ? [] : 일.transactions.map((tx) => tx.name)} 쓰나={쓰나} 저장하고번호={저장} /> : null}
        {지금 === 4 ? (
          <PerfStepRun
            값={사}
            고침={set사}
            envs={service.envs}
            agents={agents}
            저장된계정={저장된계정}
            최대목표={최대}
            쓰나={쓰나}
            페이지칸={페이지칸}
            요약={요약}
          />
        ) : null}

        {알림 === null ? null : (
          <p className={알림.오류 ? 'perf-err' : undefined} role={알림.오류 ? 'alert' : 'status'}>
            {알림.글}
          </p>
        )}
        <div className="perf-foot">
          {지금 === 1 ? (
            <a className="btn ghost" href="#/perf/scenarios">
              {t('목록으로')}
            </a>
          ) : (
            <button type="button" className="btn ghost" onClick={() => set지금((지금 - 1) as 단계)}>
              {t('이전')}
            </button>
          )}
          {지금 < 4 ? (
            <button type="button" className="btn" onClick={다음}>
              {t('다음')}
            </button>
          ) : 쓰나 ? (
            <div className="perf-row">
              <button type="button" className="btn ghost" disabled={하는중} onClick={() => void 저장()}>
                {t('저장')}
              </button>
              <button type="button" className="btn" disabled={하는중} onClick={실행누름}>
                {t('실행')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
