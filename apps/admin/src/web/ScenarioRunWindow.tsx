// E2E 정식 실행 창 — 정식 실행을 걸면 같은 1180×744 틀에서 도는 중 → 결과로 넘어간다. 닫아도 실행은 계속된다 (도메인/실행 §8.16 ⑥)

import { useEffect, useRef, useState } from 'react';

import { 알림바뀜 } from './api.js';
import { 정식이름줄들, 목록줄들 } from './e2eWindowView.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { RunAbortModal } from './RunAbortModal.js';
import { scenarioApi, type ScenarioRunPart, type ScenarioRunResult } from './scenarioApi.js';
import { 멈춘사유글자 } from './scenarioResultView.js';
import { 결과주소, type 들어온곳 } from './ScenarioResultNext.js';
import { E2E진행몸, use경과, 점수알약 } from './ScenarioWindowParts.js';
import { 장면칸 } from './TrialLive.js';
import { 걸린글 } from './trialView.js';
import { Failed, PLATFORM_LABEL, useAsync, Verdict } from './ui.js';
import { 단계쌓기, type 쌓인단계 } from './useTrialQueue.js';
import { 본것으로적는다 } from './runState.js';
import { use창실행알림 } from './viewedRun.js';

const 묻는간격 = 2000;

export function ScenarioRunWindow({ runId, 어디서, on닫기 }: { runId: number; 어디서: 들어온곳; on닫기: () => void }) {
  const t = use말();
  const 언어 = use언어();
  // 창이 떠 있는 동안 알림 줄은 이 실행의 끝을 따로 알리지 않는다 — 창이 알린다
  use창실행알림(runId);
  const res = useAsync(() => scenarioApi.result(runId), [runId]);
  const data = res.data;
  const 도는중 = data === null || data.status === 'RUNNING';
  const [쌓임, set쌓임] = useState<쌓인단계[]>([]);
  const [중단묻기, set중단묻기] = useState(false);
  const [멈추는중, set멈추는중] = useState(false);
  const 진행을봤다 = useRef(false);
  const reload = res.reload;
  const 시작 = data === null ? null : Date.parse(data.startedAt);
  const 경과ms = use경과(시작);

  useEffect(() => {
    if (!도는중) return;
    // 지금 단계는 덤이다 — 못 읽어도 목록은 결과 응답으로 그려지고 다음 물음에서 다시 읽는다
    const 단계읽기 = () =>
      void scenarioApi
        .step(runId)
        .then((단계) => set쌓임((앞) => 단계쌓기(앞, 단계 === null ? undefined : { ...단계, title: '' })))
        .catch(() => undefined);
    단계읽기();
    const 타이머 = setInterval(() => {
      reload();
      단계읽기();
    }, 묻는간격);
    return () => clearInterval(타이머);
  }, [도는중, reload, runId]);

  // 도는 걸 본 창이 끝을 보면 맨 위 알림 줄이 바로 다시 묻게 한다 — 앞 판은 「실행 중 · 3초 지남」으로 멈춰 있었다
  useEffect(() => {
    if (data === null) return;
    if (data.status === 'RUNNING') 진행을봤다.current = true;
    else if (진행을봤다.current) {
      진행을봤다.current = false;
      window.dispatchEvent(new Event(알림바뀜));
    }
  }, [data]);

  // 끝난 것을 창에서 본 뒤 닫으면 알림 줄이 같은 끝을 또 알리지 않는다 — 케이스 진행 창(RunWatch)과 같다 (점검표 D8)
  const 닫는다 = () => {
    if (!도는중) 본것으로적는다(runId);
    on닫기();
  };
  const 이름들 = 정식이름줄들(data?.parts ?? [], 언어);
  const 제목 = 도는중 ? t('E2E 실행 중 · RUN {번호}', { 번호: runId }) : t('E2E 실행이 끝났습니다 · RUN {번호}', { 번호: runId });

  return (
    <>
      <Modal
        제목={제목}
        틀={도는중 ? '실행 중' : '결과'}
        onClose={닫는다}
        바깥눌러닫기={false}
        버튼={
          도는중 ? (
            <>
              <button type="button" className="btn ghost trial-stop" disabled={data === null} onClick={() => set중단묻기(true)}>
                {t('실행 중단')}
              </button>
              <span className="e2e-foot-mid">{t('닫아도 실행은 계속되고 끝나면 알림이 옵니다')}</span>
              <button type="button" className="btn ghost" onClick={on닫기}>
                {t('닫기')}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn ghost" onClick={닫는다}>
                {t('닫기')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  닫는다();
                  window.location.hash = 결과주소(runId, 어디서);
                }}
              >
                {t('결과 보기')}
              </button>
            </>
          )
        }
      >
        {res.error !== null && data === null ? (
          <Failed error={res.error} />
        ) : (
          <>
            <p className="start-band rec e2e-band">
              <b>{t('정식 실행')}</b>{' '}
              {도는중
                ? t('끝나면 실행 기록에 남고 리포트를 만들 수 있습니다 · RUN {번호}', { 번호: runId })
                : t('실행 기록 E2E 에 남았습니다 · RUN {번호}', { 번호: runId })}
            </p>
            {도는중 ? (
              <E2E진행몸
                줄들={목록줄들(이름들, 쌓임, true)}
                경과ms={경과ms}
                장면={(크게버튼) =>
                  data !== null && data.live !== true ? (
                    <장면없음 data={data} 머리끝={크게버튼} />
                  ) : (
                    <장면칸
                      key={runId}
                      주소={data === null ? null : scenarioApi.runLive(runId)}
                      도는중
                      vision={data?.vision?.url ?? null}
                      폰이름={data?.vision?.name ?? null}
                      부제={data === null ? t('서버 브라우저') : 어디서도는지(data, t)}
                      모바일웹={data?.platform === 'mobile'}
                      늦춤글={false}
                      뼈대
                      머리끝={크게버튼}
                    />
                  )
                }
              />
            ) : (
              data === null ? null : <결과몸 data={data} />
            )}
          </>
        )}
      </Modal>
      {!중단묻기 ? null : (
        <RunAbortModal
          runId={runId}
          e2e
          멈추는중={멈추는중}
          on멈추는중={set멈추는중}
          onClose={() => set중단묻기(false)}
          on멈춤={() => {
            set중단묻기(false);
            reload();
          }}
        />
      )}
    </>
  );
}

type 말 = ReturnType<typeof use말>;

/** 칸 머리 둘째 글 — 디바이스와 어디서 도는지. 실제 폰은 Device VISION 이다 */
function 어디서도는지(data: ScenarioRunResult, t: 말): string {
  const 어디 =
    data.platform === 'desktop' ? t('서버 브라우저') : data.platform === 'mobile' ? (data.vision !== undefined ? t('실제 기기') : t('가상 기기 · iPhone 14')) : t('Device VISION 폰');
  return `${t(PLATFORM_LABEL[data.platform])} · ${어디}`;
}

/** 웹 단계가 없는 실행 — 보여 줄 장면은 없고 폰을 잡았으면 Device VISION 링크만 선다 */
function 장면없음({ data, 머리끝 }: { data: ScenarioRunResult; 머리끝: React.ReactNode }) {
  const t = use말();
  return (
    <section className="trial-live" aria-label={t('실시간 화면')}>
      <div className="live-head">
        <b>{t('실시간 화면')}</b>
        <span className="live-sub">{어디서도는지(data, t)}</span>
        {data.vision?.name === undefined ? null : <span className="live-phone">{data.vision.name}</span>}
        {data.vision === undefined ? null : (
          <a className="btn small ghost live-vision" href={data.vision.url} target="_blank" rel="noreferrer">
            {t('Device VISION 에서 보기 ↗')}
          </a>
        )}
        {머리끝}
      </div>
      <p className="live-wait">{t('지금은 보여 줄 화면이 없습니다')}</p>
    </section>
  );
}

/** 안 돈 이유 — 앞 단계 탓으로 안 돈 것은 판정 자리에 `실행 안 함` 이고, 사람이 멈춘 것 · 시간 초과 같은 NA 는 사유를 적는다 */
function 사유(p: ScenarioRunPart, 언어: ReturnType<typeof use언어>): string | null {
  if (p.status === 'FAIL') return p.failure?.reason ?? p.error?.message.split('\n')[0] ?? null;
  if (p.status === 'NA' && p.error != null && p.error.message !== 'NOT_RUN') return 멈춘사유글자(p.error.message, 언어);
  return null;
}

function 결과몸({ data }: { data: ScenarioRunResult }) {
  const t = use말();
  const 언어 = use언어();
  const 통과 = data.parts.filter((p) => p.status === 'PASS').length;
  const 실패 = data.parts.filter((p) => p.status === 'FAIL').length;
  const 이름들 = 정식이름줄들(data.parts, 언어);
  const 총 = data.finishedAt === null ? null : Date.parse(data.finishedAt) - Date.parse(data.startedAt);
  return (
    <>
      <div className="trial-sum">
        <점수알약 통과={통과} 실패={실패} 안함={data.parts.length - 통과 - 실패} />
        <span className="r">{[t(PLATFORM_LABEL[data.platform]), data.env, ...(총 === null ? [] : [t('총 {시간}', { 시간: 걸린글(총, 언어) })])].join(' · ')}</span>
      </div>
      <ol className="e2e-res">
        {data.parts.map((p, i) => {
          const 이유 = 사유(p, 언어);
          return (
            <li key={p.seq} className={p.status === 'FAIL' ? 'bad' : undefined}>
              <span className="no">{p.seq}</span>
              <span>
                <span className="mono e2e-tail">{이름들[i]?.꼬리}</span> {이름들[i]?.제목}
              </span>
              <span className="dur">{p.durationMs === null || (p.status === 'NA' && p.error?.message === 'NOT_RUN') ? '' : 걸린글(p.durationMs, 언어)}</span>
              {p.status === 'NA' && p.error?.message === 'NOT_RUN' ? <span className="e2e-faint">{t('실행 안 함')}</span> : <Verdict status={p.status} />}
              {이유 === null ? null : <span className="why">{이유}</span>}
            </li>
          );
        })}
      </ol>
    </>
  );
}
