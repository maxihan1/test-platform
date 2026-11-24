// 실행 결과 (SPEC §8.3). 머리 · 단추 · 증적 줄을 그리고 본문(요약 한 줄 · 실행 차례 표)은 RunResultBody 가 맡는다
// POST /api/runs는 끝나기 전에 돌아온다. status가 FINISHED가 될 때까지 화면이 다시 묻는다 (SPEC §7.1)

import { useEffect, useRef, useState } from 'react';

import { api, ApiError, type RunInsights as 비교 } from './api.js';
import { Head } from './Head.js';
import { use증적, 증적만들기버튼들, 증적알림과목록 } from './EvidenceSection.js';
import { use말, use언어 } from './i18n.js';
import { use주소조건, 주소덮기, 주소조건 } from './leaveGuard.js';
import { 실행판정, type 판정하기 } from './runJudge.js';
import { type 보기바꿈, 바꾼보기, 보기읽기, 보기조건 } from './runResultView.js';
import { 진행상황 } from './runProgress.js';
import { 시간글자, 실행남은글 } from './remainText.js';
import { RunAbortModal } from './RunAbortModal.js';
import { RunProgressModal } from './RunProgressModal.js';
import { 실패다시실행 } from './RerunFailed.js';
import { 한건자리, 한건인가 } from './RunSingleDone.js';
import { 결과본문, 도는집계 } from './RunResultBody.js';
import { 다른빌드알림 } from './RunBuild.js';
import { 실행명 } from './runName.js';
import { 목록조건읽기, 실행길 } from './RunNav.js';
import { 케이스서비스 } from './role.js';
import { ScenarioResult } from './ScenarioResult.js';
import { RunPrepFailed } from './RunPrepFailed.js';
import { use실행리포트, 리포트띠, 리포트열기 } from './RunQaReport.js';
import { 끝났다고알릴까, 도는중, 멈출수있나, 본것으로적는다, 상태라벨, 실행자이름, 준비실패 } from './runState.js';
import { Failed, Loading, PLATFORM_LABEL, useAsync, 실행디바이스들 } from './ui.js';
import { useRunProgress } from './useRunProgress.js';
import { 지켜보는실행, 지켜본다 } from './runWatchStore.js';
import { use보는실행알림 } from './viewedRun.js';

interface 결과바깥 {
  runId: number;
  판정하기: 판정하기;
}

function 케이스결과({ runId, 판정하기, on시나리오 }: 결과바깥 & { on시나리오?: () => void }) {
  const t = use말();
  const 언어 = use언어();
  // 거르개 · 쪽 · 펼친 줄은 주소에 담는다. 실행 기록에서 넘어올 때 걸어 둔 조건(`list=`)도 같이 남겨야 새로고침 뒤에 「← 실행 기록」이 그 조건으로 돌아간다
  const [보기, set보기] = useState(() => 보기읽기(주소조건()));
  // 다른 화면의 고리가 「이 줄을 펴서 열라」고 보낸 케이스(`tc=`) — 그 줄로 화면을 옮긴다
  const [열카드] = useState(() => 주소조건().get('tc') ?? undefined);
  const [목록조건] = useState(목록조건읽기);
  use주소조건(`#/runs/${String(runId)}`, { ...보기조건(보기), ...(목록조건 === '' ? {} : { list: 목록조건 }) });
  function 바꾸기(바꿀: 보기바꿈) {
    set보기((앞) => 바꾼보기(앞, 바꿀));
  }
  // 휴대폰에서는 부제를 한 줄(번호 · 대상 서버 · 소요 · 상태)로 줄이고 나머지는 눌러서 편다 — 다 적으면 세 줄을 넘겨 결과가 화면 밖으로 밀린다 (2026-11-24 사용자)
  const [정보펼침, set정보펼침] = useState(false);
  const [멈출까, set멈출까] = useState(false);
  const [멈추는중, set멈추는중] = useState(false);
  const [끝났다고알릴까말까, set알릴까] = useState(false);
  // 갱신 전 상태를 들고 있어야 「도는 중이던 것이 끝났다」를 알 수 있다.
  // 화면에 안 나오는 값이라 `useRef` 로 둔다 — 그리는 값이면 `useState` 여야 한다 (2026-09-21 사고)
  const 앞선상태 = useRef<string | null>(null);

  // 호환성 실행은 결과 화면이 따로다 — 옛 알림 · 받은 링크(#/runs/<번호>)로 와도 그리로 옮긴다 (도메인/호환성 §7 `COMPAT_RUN`)
  const run = useAsync(() => api.run(runId).catch((e: unknown) => {
    if (e instanceof ApiError && e.code === 'SCENARIO_RUN') on시나리오?.();
    if (e instanceof ApiError && e.code === 'COMPAT_RUN') window.location.replace(`#/compat/runs/${String(runId)}`);
    throw e;
  }), [runId]);
  const data = run.data;
  // 한 건 실행은 결과 화면이 없다(insights · failures 가 404) — 그 번호의 주소로 와도 붙은 실행의 그 케이스나 케이스 상세로 옮긴다 (도메인/실행 §7 `GET /api/runs/:runId`)
  const 한건 = data !== null && 한건인가(data);
  useEffect(() => {
    if (data === null || !한건) return;
    // 도는 한 건의 진행 · 멈추기는 진행 창이 맡는다(§8.9) — 주소로 온 사람이 멈출 길을 잃지 않게 열어 둔다
    if (도는중(data.status)) 지켜본다({ runId: data.runId, 열림: true });
    let 살아있음 = true;
    void 한건자리(data, 열카드).then((주소) => {
      if (살아있음) 주소덮기(주소);
    });
    return () => {
      살아있음 = false;
    };
  }, [한건]);
  // ABORTED 를 빠뜨리면 사람이 멈춘 실행에서 2초마다 영원히 다시 묻는다 (SPEC §8.3)
  const running = data !== null && 도는중(data.status);

  // 다른 실행으로 옮기면 앞선 상태를 잊는다. 안 그러면 도는 중이던 RUN 을 보다가
  // 이미 끝난 RUN 으로 옮겼을 때 「도는 중 → 끝남」으로 읽혀 모달이 잘못 뜬다
  useEffect(() => {
    앞선상태.current = null;
    set알릴까(false);
  }, [runId]);

  // 그 실행 결과 화면을 보고 있는 사람에게만 모달이 뜬다 (SPEC §8.9).
  // 다른 화면에 있는 사람은 §8 알림 줄이 받는다. 진행 창 · 알약으로 지켜보던 실행이면 바깥 틀(RunWatch)이 완료 창을 띄운다 — 둘이 뜨지 않게 비킨다
  useEffect(() => {
    if (data === null) return;
    const 전 = 앞선상태.current;
    앞선상태.current = data.status;
    if (전 !== null && 끝났다고알릴까({ 전, 후: data.status, runId: data.runId }) && 지켜보는실행()?.runId !== data.runId) set알릴까(true);
  }, [data?.status, data?.runId]);
  const reload = run.reload;

  // 증적 문서도 뒤에서 만들어진다. PENDING 행이 남아 있으면 계속 물어야
  // 「만드는 중입니다」가 완성으로 바뀐다 — 안 그러면 버튼이 그 자리에 굳는다
  const 만드는문서있나 = data !== null && data.evidence.some((it) => it.status === 'PENDING');

  // 실행은 뒤에서 이어진다. 끝날 때까지만 다시 묻고 끝나면 멈춘다
  useEffect(() => {
    if (!running && !만드는문서있나) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [running, 만드는문서있나, reload]);

  const { 진행목록, 남은ms } = useRunProgress(running, runId);

  const 증적칸 = use증적(data, 실행판정(판정하기, data), reload);

  // 끝났을 때 한 번만 부른다 — 요약 띠와 옆 칸이 나눠 쓴다. 아직 도는 중이면 판정이 안 들어간 항목이
  // `NA` 로 읽혀 앞 실행이 깨졌던 것이 전부 「고쳐짐」으로 보인다. 실패해도 결과는 그대로 선다 (도메인/실행 §8.3)
  const 끝났나 = data !== null && !running && !한건;
  const 견줌 = useAsync<비교 | null>(() => (끝났나 ? api.insights(runId) : Promise.resolve(null)), [runId, 끝났나]);
  // 이 실행이 든 빌드의 QA 리포트 — 머리 버튼과 맨 위 띠가 나눠 쓴다 (도메인/리포팅 §8.21 「다른 화면의 고리」)
  const 리포트 = use실행리포트(runId, 끝났나);

  if (run.error !== null) return <Failed error={run.error} />;
  if (data === null || 한건) return <Loading />;

  const 디바이스들 = 실행디바이스들(data.items);
  // 몇 건 끝났고 얼마 남았나는 머리에 늘 둔다 — 누르면 진행 상자가 무엇이 도는지까지 편다 (도메인/실행 §8.9 · 점검 2.14).
  // 앞 판은 이 수가 저절로 뜨는 상자에만 있었고 머리에는 「진행 중 98건」(안 끝난 전부)이 있었다
  const 진행 = running ? 진행상황(data, 진행목록) : null;
  const 진행글 =
    진행 === null
      ? null
      : [t('{끝난} / {전체} 완료', { 끝난: 진행.끝난수, 전체: 진행.전체수 }), 실행남은글(남은ms, Date.now(), 언어)].join(' · ');
  const 종류 = data.kind === 'UI' ? t('UI 테스트') : data.kind === 'FN' ? t('기능 테스트') : null;
  const 소요 =
    data.finishedAt === null
      ? null
      : 시간글자(Math.max(0, new Date(data.finishedAt).getTime() - new Date(data.startedAt).getTime()), 언어);

  // 실행 정보는 이 한 줄이 전부다 — 앞 판은 같은 값을 옆 칸에 또 적었고 좁은 창에서 그 칸이 맨 아래로 묻혔다 (도메인/실행 §8.3 · 점검 2.2)
  const 부제 = (
    <span className={정보펼침 ? 'run-meta open' : 'run-meta'}>
      <span className="rm-key">RUN {data.runId}</span>
      {/* 실행 하나에 한 종류다 — 사이드바가 종류를 모르는 화면이라 머리에 적는다 (PR #132) */}
      {종류 === null ? null : <span> · {종류}</span>}
      {/* 알림은 서비스 전체에서 오고 결과는 고른 서비스와 상관없이 열린다 — 어느 서비스 실행인지 적는다 */}
      <span> · {data.serviceName}</span>
      {/* 시작 시각 · 시작 방식은 제목(실행명)이 말한다 — 같은 값을 두 번 적지 않는다 */}
      {data.buildNo == null ? null : <span> · {t('빌드 {번호}', { 번호: data.buildNo })}</span>}
      <span className="rm-key"> · {t('대상 서버 {서버}', { 서버: data.env })}</span>
      {data.baseUrl === '' ? null : <span>{` (${data.baseUrl})`}</span>}
      <span> · {t('실행자 {이름}', { 이름: 실행자이름(data, 언어) })}</span>
      {소요 === null ? null : <span className="rm-key"> · {소요}</span>}
      {디바이스들.length === 0 ? null : <span> · {디바이스들.map((p) => PLATFORM_LABEL[p]).join(' · ')}</span>}
      {/* 도는 동안의 상태는 바로 아래 진행 글이 맡는다 — 「진행 중」을 또 적지 않는다 */}
      {/* 휴대폰의 한 줄에는 끝까지 못 돈 상태(중단 · 준비 실패)만 남긴다 — 「완료」는 소요 시간이 말한다 */}
      {running ? null : <span className={data.status === 'FINISHED' ? undefined : 'rm-key'}> · {상태라벨(data.status, 언어)}</span>}
      <button type="button" className="rm-more" aria-expanded={정보펼침} aria-label={t(정보펼침 ? '접기' : '펼치기')} onClick={() => set정보펼침(!정보펼침)}>
        {정보펼침 ? '▴' : '▾'}
      </button>
    </span>
  );

  const 행동 = (
          <div className="tally">
          {/* 끝난 실행의 집계 숫자는 요약 띠가 맡는다 — 같은 숫자를 두 번 두지 않는다 (도메인/실행 §8.3).
              도는 동안에는 요약 띠가 없어 여기 남는다. 판정 숫자를 버튼보다 앞에 둔다 —
              좁은 화면에서 접히면 뒤엣것이 아랫줄로 밀리는데 휴대폰에서 먼저 볼 것은 끝났나다(공통/5 §8 「휴대폰 화면」) */}
          {진행글 === null ? null : (
            <button type="button" className="btn ghost run-progress" aria-haspopup="dialog" onClick={() => 지켜본다({ runId: data.runId, 열림: true })}>
              {진행글}
            </button>
          )}
          {running ? <도는집계 counts={data.counts} /> : null}
          {/* 되돌릴 수 없으므로 누르면 한 번 더 묻는다 (SPEC §8.3) */}
          {!멈출수있나(data.status, 실행판정(판정하기, data)) ? null : (
            <button className="btn ghost" onClick={() => set멈출까(true)} disabled={멈추는중}>
              {t('실행 중단')}
            </button>
          )}
          <리포트열기 리포트={리포트} />
            <증적만들기버튼들 칸={증적칸} />
            {running ? null : (
              <실패다시실행 runId={data.runId} items={data.items} env={data.env} 시작={data.startedAt} 된다={data.status !== 준비실패 && 실행판정(판정하기, data)('실행')} 자동수정={data.autoFixedCases} />
            )}
          </div>
  );

  // 증적 안내·사유·문서 목록을 **머리 줄 안에서** 한 줄로 그린다 (2026-09-22).
  // 블록으로 두면 130px 을 먹어 케이스 목록에 32px 밖에 안 남았다
  const 증적줄 = <증적알림과목록 칸={증적칸} 한줄로 />;
  // 실행이 쓴 판과 그 서버의 문서가 다르면 한 줄로 알린다 — 판단은 사람 몫이라 경고색을 쓰지 않는다 (도메인/API §3.8 「API 문서와 판」)
  const 문서줄 =
    data.apiDocNote === 'DIFFERS' ? (
      <div className="hint">{t('이 서버의 API 문서가 기준 서버 문서(버전 {버전})와 다릅니다. 배포 전일 수 있습니다', { 버전: data.apiDocVersion ?? '' })}</div>
    ) : data.apiDocNote === 'FETCH_FAILED' ? (
      <div className="hint">{t('API 문서를 받지 못했습니다')}</div>
    ) : null;
  const 빌드줄 = <다른빌드알림 buildNo={data.buildNo} apps={data.installedApps} />;

  return (
    <>
      {/* 결과 화면은 목록과 따로 선다 — 목록으로 돌아가는 길과 옆 실행으로 넘어가는 길을 머리 위에 둔다 (도메인/실행 §8.7 「목록 화면과 결과 화면을 따로」) */}
      <실행길 runId={data.runId} 목록={data.kind === 'UI' ? 'ui' : 'fn'} 접두사={케이스서비스(data.items[0]?.tcId ?? '')} />
      {/* 제목과 주 행동은 본문 면 바깥에 선다 (SPEC §8). 큰 제목은 실행명(언제 · 어떻게 · 무엇을)이고 번호는 부제 맨 앞에 작게 둔다 (점검 2.22) */}
      <Head
        클래스="run-head"
        제목={실행명(data, 언어, t)}
        부제={
          <>
            {부제}
            {증적줄}
            {문서줄}
            {빌드줄}
          </>
        }
        행동={행동}
      />

      <리포트띠 리포트={리포트} />

      {/* 도는 동안에도 같은 표다 — 판정 칸이 「진행 중」이고 요약 한 줄은 끝난 뒤에 선다 (도메인/실행 §8.3) */}
      {data.status === 준비실패 ? (
        <RunPrepFailed prepNote={data.prepNote} />
      ) : (
        <결과본문 data={data} running={running} insights={견줌.data} 판정하기={판정하기} 견줌오류={견줌.error} 보기={보기} 바꾸기={바꾸기} 열카드={열카드} />
      )}

      {/* 진행 창은 바깥 틀(RunWatch)이 든다 — 닫으면 알약이 되어 화면을 옮겨도 남는다. 여기 남은 것은
          지켜보지 않던 실행이 보는 동안 끝났을 때의 완료 상자다 (도메인/실행 §8.9) */}
      {!끝났다고알릴까말까 ? null : (
        <RunProgressModal
          data={data}
          진행목록={진행목록}
          onClose={() => {
            // 닫으면 「알림 봤다」로 적는다 — 새로고침해도 다시 안 뜬다 (SPEC §8.9)
            본것으로적는다(data.runId);
            set알릴까(false);
          }}
        />
      )}

      {!멈출까 ? null : (
        <RunAbortModal
          runId={data.runId}
          멈추는중={멈추는중}
          on멈추는중={set멈추는중}
          onClose={() => set멈출까(false)}
          on멈춤={() => {
            set멈출까(false);
            reload();
          }}
        />
      )}
    </>
  );
}

// 번호마다 새로 선다(App 의 key 가 아니라 여기서 건다) — 「이전 실행」으로 옮기면 앞 실행의 거르개가 남지 않고 그 주소의 조건을 읽는다
export function RunResult(props: 결과바깥) {
  return <결과갈래 key={props.runId} {...props} />;
}

function 결과갈래(props: 결과바깥) {
  const [시나리오, set시나리오] = useState<number | null>(null); // 시나리오 실행 번호는 404 SCENARIO_RUN 으로 알려 준다 — 갈래를 바깥에 둬 훅 순서를 지킨다
  // 머리가 진행을 적으니 알림 줄은 이 실행의 도는 줄을 뺀다 (공통/5-화면공통 §8 「알림」)
  use보는실행알림(props.runId);
  if (시나리오 === props.runId) return <ScenarioResult runId={props.runId} 판정하기={props.판정하기} />;
  return <케이스결과 {...props} on시나리오={() => set시나리오(props.runId)} />;
}
