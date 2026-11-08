// 실행 창의 시험 실행 중 · 결과 모양과 중단 확인 창 (도메인/실행 §8.16 ③ ④ · 시안 A)
// 같은 창의 내용이 바뀐다 — 새 창을 겹치지 않는다. 겹치는 것은 작은 중단 확인 창 하나뿐이다. 결과 모양은 RunPickTrialDone 이다

import { useEffect, useRef, useState } from 'react';

import { api, type CaseRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { 분초, 시분 } from './perfRunView.js';
import type { 여러건시험 } from './RunPickTrial.js';
import { 결과바닥, 시험결과 } from './RunPickTrialDone.js';
import { 장면칸 } from './TrialLive.js';
import { 걸린글, 대기열알약, 도는단계줄들, 째글 } from './trialView.js';
import { PLATFORM_LABEL } from './ui.js';
import type { 지금시험 } from './useTrialQueue.js';

type 말 = (키: string, 값?: Record<string, string | number>) => string;

export function 시험제목(t: 말, 시험: 여러건시험): string {
  if (시험.보기 === 'done') return 시험.중단함 ? t('시험 실행 중단함') : t('시험 실행 결과');
  if (시험.중단함) return t('시험 실행을 중단하는 중');
  const 지금 = 시험.지금;
  return 지금 !== null && 지금.전체 > 1 ? t('시험 실행 · {차례} / {전체}', { 차례: 지금.차례, 전체: 지금.전체 }) : t('시험 실행');
}

/** 시험 실행 중 · 결과 창 맨 위 띠. 시작 확인 창의 회색 띠와 같은 말이다. 늦추는 동안은 오른쪽 끝에 그 사실을 적는다 */
function 띠({ 늦춤 }: { 늦춤: boolean }) {
  const t = use말();
  return (
    <p className="trial-band">
      <b>{t('시험 실행')}</b> {t('결과는 이 창에서만 보이고 실행 기록에 남지 않습니다')}
      {늦춤 ? <span className="r">{t('동작마다 1초 천천히')}</span> : null}
    </p>
  );
}

export function 시험화면({ 시험, 케이스들, env }: { 시험: 여러건시험; 케이스들: CaseRow[]; env: string }) {
  if (시험.보기 === 'running') return <진행 시험={시험} 케이스들={케이스들} />;
  return (
    <>
      <띠 늦춤={false} />
      <시험결과 시험={시험} 케이스들={케이스들} env={env} mobileOn={시험.mobileOn} />
    </>
  );
}

/**
 * 왼쪽은 대기열과 지금 케이스의 단계, 오른쪽은 장면 칸 (시안 A ③).
 * 폰 차례(모바일 웹 · Android 앱)면 장면 칸이 300px 폰 폭으로 줄고 왼쪽이 넓어진다 — 창 크기는 그대로다 (점검표 B14)
 */
function 진행({ 시험, 케이스들 }: { 시험: 여러건시험; 케이스들: CaseRow[] }) {
  const t = use말();
  const { 줄들, 지금, 도는중 } = 시험;
  // 누른 뒤 첫 시험이 시작되기 전에는 큐의 첫 칸(첫 케이스의 첫 디바이스)으로 칸을 연다
  const 첫 = 케이스들.flatMap((c) => (줄들[c.tcId] ?? []).map((칸) => 칸.platform))[0];
  const 디바이스 = 지금?.platform ?? 첫;
  const 폰 = 디바이스 === 'android' || 디바이스 === 'mobile';
  const 지금줄 = 지금 === null ? undefined : 줄들[지금.tcId]?.find((칸) => 칸.platform === 지금.platform)?.줄;
  // 장면 칸 머리에 케이스 이름을 또 쓰지 않는다 — 대기열이 적는다(점검표 D2). 가상 기기만 어디서 도는지 적는다
  const 부제 = 디바이스 === 'mobile' && 시험.mobileOn === 'server' ? t('가상 디바이스 · iPhone 14') : undefined;

  return (
    <>
      {/* Android 앱은 Appium 이라 늦추지 않는다 (러너 §5.2) */}
      <띠 늦춤={디바이스 !== 'android'} />
      <div className={폰 ? 'trial-run phone' : 'trial-run'}>
        <div className="trial-colL">
          <ul className="trial-queue" aria-label={t('시험 차례')}>
            {케이스들.map((c) => {
              const 칸들 = 줄들[c.tcId] ?? [];
              return (
                <li key={c.tcId} className={지금?.tcId === c.tcId ? 'cur' : undefined}>
                  <span className="id mono">{c.tcId}</span>
                  <span className="nm">
                    {/* 지금 도는 디바이스만 진하게 둔다 — 줄만 봐서는 PC 차례인지 모바일 차례인지 몰랐다 (점검표 U4) */}
                    {칸들.map((칸) => <span className={지금?.tcId === c.tcId && 칸.platform === 지금.platform ? 'tag on' : 'tag'} key={칸.platform}>{t(PLATFORM_LABEL[칸.platform])}</span>)}
                    <span className="nm-t">{c.name}</span>
                  </span>
                  <대기열알약칸 칸들={칸들} />
                </li>
              );
            })}
          </ul>
          <단계목록 지금={지금} 끝남={지금줄?.종류 === 'done'} />
        </div>
        <div className="trial-colR">
          {지금 === null ? (
            도는중 ? <장면칸 key="시작" 주소={null} 도는중 vision={null} 부제={부제} 폰만={첫 === 'android'} 모바일웹={첫 === 'mobile'} 늦춤글={false} 뼈대 /> : null
          ) : (
            <장면칸
              key={지금.trialId}
              주소={api.trialLive(지금.tcId, 지금.trialId)}
              도는중={지금줄?.종류 === 'run'}
              vision={지금.vision}
              부제={부제}
              폰만={지금.platform === 'android'}
              모바일웹={지금.platform === 'mobile'}
              늦춤글={false}
              뼈대
            />
          )}
        </div>
      </div>
    </>
  );
}

function 대기열알약칸({ 칸들 }: { 칸들: Parameters<typeof 대기열알약>[0] }) {
  const t = use말();
  if (칸들.length === 0) return null;
  const { 종류, 수 } = 대기열알약(칸들);
  const 글 =
    종류 === 'run' ? t('진행 중') : 종류 === 'pass' ? t('통과 {수}', { 수 }) : 종류 === 'fail' ? t('실패 {수}', { 수 }) : 종류 === 'wait' ? t('대기 {수}', { 수 }) : t('미실행 {수}', { 수 });
  return <span className={`pill ${종류}`}>{글}</span>;
}

/**
 * 지금 시험의 단계. 제목을 알면 처음부터 다 보이고 남은 단계는 흐리다. 모르면 받은 단계를 한 줄씩 늘린다 (§8.16 ③ · 점검표 B11).
 * 끝난 단계는 걸린 시간, 지금 단계는 `2초째`. 끝난 시험의 판정은 결과 화면이 맡는다
 *
 * 이 목록 칸의 scrollTop 만 옮긴다. scrollIntoView 는 둘레 칸(대기열이 든 왼쪽 칸)까지 굴려
 * 한 건이 끝날 때마다 왼쪽 칸이 맨 아래로 내려갔다 (2026-11-05 사용자 시험)
 */
function 단계목록({ 지금, 끝남 }: { 지금: 지금시험 | null; 끝남: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const 목록 = useRef<HTMLOListElement>(null);
  const 볼줄 = useRef<HTMLLIElement>(null);
  const 줄들 = 지금 === null ? [] : 도는단계줄들(지금.단계들, 지금.제목들);
  const 지금seq = 줄들.find((줄) => 줄.상태 === 'now')?.seq;

  useEffect(() => {
    const 칸 = 목록.current;
    const li = 볼줄.current;
    if (칸 === null || li === null) return;
    // 볼 줄의 아래 끝이 칸 아래 끝에 닿게 둔다 — 줄 위치는 칸(position: relative) 기준이다
    칸.scrollTop = Math.max(0, li.offsetTop + li.offsetHeight - 칸.clientHeight);
  }, [지금?.trialId, 지금seq]);

  if (줄들.length === 0) return <p className="trial-now-none">{t('첫 단계를 기다리는 중')}</p>;
  return (
    <ol className="trial-now-steps" ref={목록}>
      {줄들.map((줄) => {
        // 끝난 뒤 결과를 받기 전 마지막 단계도 「지금」으로 두면 멈춘 시계처럼 보인다 — 끝났으면 다 끝난 단계다
        const 상태 = 끝남 && 줄.상태 === 'now' ? 'done' : 줄.상태;
        return (
          <li key={줄.seq} ref={줄.seq === 지금seq ? 볼줄 : undefined} className={상태} aria-current={상태 === 'now' ? 'step' : undefined}>
            <span className="no">{줄.seq}</span>
            <span>{줄.title}</span>
            <span className="t">{줄.ms === undefined || 상태 === 'wait' ? '' : 상태 === 'now' ? 째글(줄.ms, 언어) : 걸린글(줄.ms, 언어)}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** 실행 중 바닥 — 왼쪽 「중단」, 그 곁에 시작 시각 · 경과. 결과 바닥은 RunPickTrialDone 이다 */
export function 시험바닥({ 시험, 케이스들, 정식, on실행, on닫기 }: { 시험: 여러건시험; 케이스들: CaseRow[]; 정식: boolean; on실행: () => void; on닫기: () => void }) {
  const t = use말();
  if (시험.보기 !== 'running') return <결과바닥 시험={시험} 케이스들={케이스들} 정식={정식} on실행={on실행} on닫기={on닫기} />;
  return (
    <>
      <button className="btn ghost trial-stop" onClick={시험.중단열기} disabled={시험.중단함}>
        {시험.중단함 ? t('중단하는 중') : t('중단§버튼')}
      </button>
      <경과 시작시각={시험.시작시각} />
    </>
  );
}

export function 경과({ 시작시각 }: { 시작시각: number }) {
  const t = use말();
  const [지금, set지금] = useState(() => Date.now());
  useEffect(() => {
    const 틱 = setInterval(() => set지금(Date.now()), 1000);
    return () => clearInterval(틱);
  }, []);
  return (
    <span className="note">
      {t('시작 {시각} · 경과 {경과}', { 시각: 시분(new Date(시작시각).toISOString()), 경과: 분초((지금 - 시작시각) / 1000) })}
    </span>
  );
}

/** 실행 창 위에 작게 겹친다. 떠 있어도 실행은 멈추지 않는다 — 단계 한가운데서 세우면 기다린 시간이 제한 시간에 들어가 실패한다 (시안 7판 ⑤) */
export function 중단확인({ 시험 }: { 시험: 여러건시험 }) {
  const t = use말();
  if (!시험.중단묻기) return null;
  const 모든칸 = Object.values(시험.줄들).flat();
  const 남은 = 모든칸.filter((칸) => 칸.줄.종류 === 'wait').length;
  const 끝난 = 모든칸.filter((칸) => 칸.줄.종류 === 'done').length;
  const 지금 = 시험.지금 !== null && 모든칸.some((칸) => 칸.줄.종류 === 'run') ? 시험.지금.tcId : null;
  const 첫줄 =
    지금 === null
      ? t('남은 {수}건은 실행하지 않습니다', { 수: 남은 })
      : 남은 > 0
        ? t('진행 중인 {케이스} 는 바로 멈추고 남은 {수}건은 실행하지 않습니다', { 케이스: 지금, 수: 남은 })
        : t('진행 중인 {케이스} 는 바로 멈춥니다', { 케이스: 지금 });
  return (
    <Modal
      제목={t('시험 실행을 중단할까요?')}
      onClose={시험.중단닫기}
      버튼={
        <>
          <button className="btn ghost" onClick={시험.중단닫기} data-first>
            {t('계속 실행')}
          </button>
          <button className="btn trial-stop-go" onClick={시험.중단}>
            {t('중단§버튼')}
          </button>
        </>
      }
    >
      <p>{첫줄}</p>
      {끝난 === 0 ? null : <p className="hint">{t('끝난 {수}건의 결과는 완료 창에 그대로 남습니다', { 수: 끝난 })}</p>}
      <p className="hint">{t('확인하는 동안에도 실행은 계속됩니다')}</p>
    </Modal>
  );
}
