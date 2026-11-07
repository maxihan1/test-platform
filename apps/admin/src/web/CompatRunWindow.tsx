// 호환성 실행 중 창 — 실행 창 한 틀에서 실행 중 → 결과로 넘어간다. 닫아도 실행은 계속된다 (도메인/호환성 §8.17 ③ · 실행 §8.16)

import { useEffect, useRef, useState } from 'react';

import { 알림바뀜 } from './api.js';
import { compatApi, type CompatRunDevice, type CompatRunResult } from './compatApi.js';
import { 요약띠 } from './CompatResultParts.js';
import { CompatShot } from './CompatShot.js';
import { 상태글자, 상태별의심, 케이스차례, 순서설명, 지금상태, 진행, 최근의심 } from './compatRunView.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { RunAbortModal } from './RunAbortModal.js';
import { 본것으로적는다 } from './runState.js';
import { use경과 } from './ScenarioWindowParts.js';
import { 걸린글 } from './trialView.js';
import { Failed, Loading, useAsync } from './ui.js';
import { use창실행알림 } from './viewedRun.js';

const 묻는간격 = 2000;

/** 결과 주소. 애플리케이션을 담는다 — 띠가 그 실행의 애플리케이션으로 바뀌어 판정 권한 · 세트 링크가 그 실행 것이 된다 (공통/5-화면공통 §8 「링크에 애플리케이션이 담긴다」) */
export const 결과주소 = (runId: number, service: string) => `#/compat/runs/${String(runId)}?service=${encodeURIComponent(service)}`;

function 지금카드({ d, 의심수 }: { d: CompatRunDevice; 의심수: number }) {
  const t = use말();
  const 언어 = use언어();
  const 시작 = d.now?.startedAt == null ? null : Date.parse(d.now.startedAt);
  const 경과 = use경과(시작);
  const 막대 = (끝난: number, 전체: number) => (
    <div className="cr-mini" aria-hidden="true">
      <i style={{ width: `${String(전체 === 0 ? 0 : Math.round((끝난 * 100) / 전체))}%` }} />
    </div>
  );
  return (
    <div className="cr-now">
      <div className="cr-now-head">
        <b className="mono">
          {d.seq}. {d.model}
        </b>
        <span className="compat-faint">{[d.name, d.os === null ? null : `Android ${d.os}`].filter(Boolean).join(' · ')}</span>
        <span className="cr-state now">{t(상태글자[d.state])}</span>
      </div>
      <p>
        {t('케이스 {끝난} / {전체}', { 끝난: 케이스차례(d), 전체: d.cases.total })}
        {d.now === null ? null : (
          <>
            {' · '}
            <span className="mono">{d.now.tcId}</span> {d.now.name}
            {시작 === null ? null : ' · ' + t('{시간}째', { 시간: 걸린글(경과, 언어) })}
          </>
        )}
      </p>
      {막대(d.cases.done, d.cases.total)}
      <p>
        {t('AI 점검 {끝난} / {전체}장', { 끝난: d.checks.done, 전체: d.checks.total })} <span className="compat-faint">{t('케이스 완료 시 점검 대기열에 추가')}</span>
        {의심수 === 0 ? null : ' · ' + t('결함 의심 {수}', { 수: 의심수 })}
      </p>
      {막대(d.checks.done, d.checks.total)}
    </div>
  );
}

function 진행몸({ data }: { data: CompatRunResult }) {
  const t = use말();
  const 셈 = 진행(data, Date.now());
  const 의심 = 상태별의심(data.cards.filter((c) => c.verdict !== 'NOT_DEFECT'));
  const 지금 = 지금상태(data.devices);
  const 최근 = 최근의심(data.cards);
  const 이름 = new Map(data.rows.map((r) => [r.key, r.name]));
  const 모델 = new Map(data.devices.map((d) => [d.seq, d.model]));
  return (
    <div className="cr-body">
      <div className="cr-left">
        <div className="cr-bar" aria-hidden="true">
          <i style={{ width: `${String(셈.전체 === 0 ? 0 : Math.round((셈.끝난 * 100) / 셈.전체))}%` }} />
        </div>
        <p>
          {t('점검 상태 {끝난} / {전체} 완료', { 끝난: 셈.끝난, 전체: 셈.전체 })}
          {셈.남은분 === null ? null : ' · ' + t('남은 시간 약 {분}분', { 분: 셈.남은분 })}
        </p>
        <div className="compat-pills">
          <span className="cr-state">{t('완료 {수}', { 수: 셈.끝난 })}</span>
          {셈.실행중 === 0 ? null : <span className="cr-state now">{t('실행 중 {수}', { 수: 셈.실행중 })}</span>}
          {셈.점검중 === 0 ? null : <span className="cr-state">{t('AI 점검 중 {수}', { 수: 셈.점검중 })}</span>}
          {셈.대기 === 0 ? null : <span className="cr-state">{t('대기 {수}', { 수: 셈.대기 })}</span>}
          {셈.의심 === 0 ? null : <span className="compat-tag">{t('UI 결함 의심 {수}', { 수: 셈.의심 })}</span>}
        </div>
        {지금 === null ? null : <지금카드 d={지금} 의심수={의심.get(지금.seq) ?? 0} />}
        <h3 className="cr-sub">{t('실행 순서')}</h3>
        <ol className="cr-queue">
          {data.devices.map((d) => (
            <li key={d.seq} aria-current={d.seq === 지금?.seq ? 'step' : undefined}>
              <span className="mono compat-faint">{d.seq}</span>
              <b className="mono">{d.model}</b>
              <span className="compat-faint">{순서설명(d, 의심.get(d.seq) ?? 0, t)}</span>
              <span className={d.state === 'RUNNING' ? 'cr-state now' : 'cr-state'}>{t(상태글자[d.state])}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="cr-right">
        <section className="cr-live" aria-label={t('실시간 화면')}>
          <h3 className="cr-sub">{지금 === null ? t('실시간 화면') : t('{모델} 실시간 화면 · Device VISION', { 모델: 지금.model })}</h3>
          {/* 호환성은 장면을 찍지 않는다 — 폰 화면은 VISION 링크가 연다. 모바일 웹 장면은 아직 없다 (§8.17 ③) */}
          {지금?.vision != null ? (
            <a className="btn ghost" href={지금.vision} target="_blank" rel="noreferrer">
              {t('Device VISION 에서 폰 화면 보기')} ↗
            </a>
          ) : (
            <p className="compat-faint">{지금 === null ? t('다음 디바이스를 기다리는 중입니다') : t('폰 화면은 Device VISION 에서 봅니다')}</p>
          )}
        </section>
        <section aria-label={t('최근 UI 결함 의심 화면')}>
          <h3 className="cr-sub">{t('최근 UI 결함 의심 화면')}</h3>
          {최근.length === 0 ? (
            <p className="compat-faint">{t('아직 결함 의심 화면이 없습니다')}</p>
          ) : (
            <div className="cr-thumbs">
              {최근.map((c) => (
                <figure key={c.screenId}>
                  <CompatShot runId={data.run.runId} screenId={c.screenId} issues={c.issues} 이름={이름.get(c.key) ?? c.key} 작게 />
                  <figcaption>
                    {이름.get(c.key) ?? c.key}
                    <span className="mono compat-faint">{모델.get(c.seq) ?? ''}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          <p className="compat-faint">{t('결함 판정은 결과 화면에서 합니다')}</p>
        </section>
      </div>
    </div>
  );
}

export function CompatRunWindow({ runId, service, 닫기 }: { runId: number; service: string; 닫기: () => void }) {
  const t = use말();
  const 언어 = use언어();
  // 창이 떠 있는 동안 알림 줄은 이 실행의 끝을 따로 알리지 않는다 — 창이 알린다
  use창실행알림(runId);
  const res = useAsync(() => compatApi.run(runId), [runId]);
  const data = res.data;
  const 도는중 = data === null || data.run.state === 'RUNNING';
  const reload = res.reload;
  const [중단묻기, set중단묻기] = useState(false);
  const [멈추는중, set멈추는중] = useState(false);
  const 진행을봤다 = useRef(false);

  useEffect(() => {
    if (!도는중) return;
    const 타이머 = setInterval(() => void reload(), 묻는간격);
    return () => clearInterval(타이머);
  }, [도는중, reload]);

  // 도는 걸 본 창이 끝을 보면 맨 위 알림 줄이 바로 다시 묻게 한다 (E2E 실행 창과 같다)
  useEffect(() => {
    if (data === null) return;
    if (data.run.state === 'RUNNING') 진행을봤다.current = true;
    else if (진행을봤다.current) {
      진행을봤다.current = false;
      window.dispatchEvent(new Event(알림바뀜));
    }
  }, [data]);

  const 닫는다 = () => {
    if (!도는중) 본것으로적는다(runId);
    닫기();
  };
  const 제목 =
    data === null
      ? t('호환성 실행 · RUN {번호}', { 번호: runId })
      : 도는중
        ? t('{세트} · 호환성 실행 중', { 세트: data.run.title })
        : data.run.state === 'ABORTED'
          ? t('{세트} · 호환성 실행이 중단됐습니다', { 세트: data.run.title })
          : t('{세트} · 호환성 실행이 끝났습니다', { 세트: data.run.title });
  const 총 = data?.run.finishedAt == null ? null : Date.parse(data.run.finishedAt) - Date.parse(data.run.startedAt);

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
              <span className="e2e-foot-mid">{t('닫아도 실행은 계속되고 끝나면 알림이 옵니다 · 중단 시 점검을 마친 화면까지 결과에 남습니다')}</span>
              <button type="button" className="btn ghost" onClick={닫기}>
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
                  window.location.hash = 결과주소(runId, service);
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
        ) : data === null ? (
          <Loading />
        ) : 도는중 ? (
          <진행몸 data={data} />
        ) : (
          <div className="cr-done">
            <p>
              {[t('대상 서버 {서버}', { 서버: data.run.env }), ...(총 === null || Number.isNaN(총) ? [] : [t('총 {시간}', { 시간: 걸린글(총, 언어) })])].join(' · ')}
            </p>
            <요약띠 counts={data.counts} />
            <p className="compat-faint">{t('결함 판정은 결과 화면에서 합니다')}</p>
          </div>
        )}
      </Modal>
      {!중단묻기 ? null : (
        <RunAbortModal
          runId={runId}
          멈추는중={멈추는중}
          on멈추는중={set멈추는중}
          onClose={() => set중단묻기(false)}
          on멈춤={() => {
            set중단묻기(false);
            void reload();
          }}
        />
      )}
    </>
  );
}
