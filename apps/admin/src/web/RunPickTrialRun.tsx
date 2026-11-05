// 실행 창의 시험 실행 중 · 완료 모양과 중단 확인 창 (도메인/실행 §8.10 · 시안 7판 ④ ⑤ ⑥)
// 같은 창의 내용이 바뀐다 — 새 창을 겹치지 않는다. 겹치는 것은 작은 중단 확인 창 하나뿐이다

import { useEffect, useRef, useState } from 'react';

import { api, type CaseRow, type Platform, type TrialResult } from './api.js';
import { 원문보기, 실패이유 } from './FailureWhy.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { 분초, 시분 } from './perfRunView.js';
import { type 여러건시험, 시험배지, 시험절차 } from './RunPickTrial.js';
import { 장면칸 } from './TrialLive.js';
import { PLATFORM_LABEL, seconds, Verdict } from './ui.js';
import type { 디바이스칸, 시험줄, 지금시험 } from './useTrialQueue.js';

type 말 = (키: string, 값?: Record<string, string | number>) => string;

/** 러너가 끊었거나 러너에 보내기 전에 닫았다 — admin 과 러너가 같은 모양으로 남긴다 (도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」) */
export const 중단됐나 = (r: TrialResult): boolean => r.status === 'NA' && r.error?.message === 'ABORTED';

export interface 결과칸 {
  케이스: CaseRow;
  platform: Platform;
  줄: 시험줄;
  /** 그 케이스에 디바이스가 둘 이상이라 줄에 디바이스 이름을 붙인다 */
  이름붙임: boolean;
}

/** 완료 창의 줄 — 케이스 × 디바이스 하나씩, 케이스 차례대로 */
export function 결과칸들(케이스들: CaseRow[], 줄들: Record<string, 디바이스칸[]>): 결과칸[] {
  return 케이스들.flatMap((케이스) => {
    const 칸들 = 줄들[케이스.tcId] ?? [];
    return 칸들.map((칸) => ({ 케이스, platform: 칸.platform, 줄: 칸.줄, 이름붙임: 칸들.length > 1 }));
  });
}

/** 통과 · 실패 · 실행 안 함. 중단한 것 · 미실행(NA) · 차례가 안 온 것 · 걸지 못한 것은 실행 안 함이다 */
export function 셈(칸들: 결과칸[]) {
  const 끝난 = 칸들.flatMap((칸) => (칸.줄.종류 === 'done' ? [칸.줄.결과] : []));
  const 통과 = 끝난.filter((r) => r.status === 'PASS').length;
  const 실패 = 끝난.filter((r) => r.status === 'FAIL').length;
  return { 통과, 실패, 안함: 칸들.length - 통과 - 실패 };
}

export function 시험제목(t: 말, 시험: 여러건시험): string {
  if (시험.보기 === 'done') return 시험.중단함 ? t('시험 실행 중단함') : t('시험 실행 완료');
  if (시험.중단함) return t('시험 실행을 중단하는 중');
  const 지금 = 시험.지금;
  return 지금 !== null && 지금.전체 > 1 ? t('시험 실행 중 · {차례} / {전체}', { 차례: 지금.차례, 전체: 지금.전체 }) : t('시험 실행 중');
}

/** 시험 실행 중 · 완료 창 맨 위 띠. 시작 확인 창의 회색 띠와 같은 말이다 */
function 띠() {
  const t = use말();
  return (
    <p className="trial-band">
      <b>{t('시험 실행')}</b> {t('결과는 이 창에서만 보이고 실행 기록에 남지 않습니다')}
    </p>
  );
}

export function 시험화면({ 시험, 케이스들, 한건 }: { 시험: 여러건시험; 케이스들: CaseRow[]; 한건: boolean }) {
  return 시험.보기 === 'running' ? <진행 시험={시험} 케이스들={케이스들} /> : <완료 시험={시험} 케이스들={케이스들} 한건={한건} />;
}

/** 왼쪽은 차례 목록과 지금 시험의 단계, 오른쪽은 실시간 칸 (시안 7판 ④) */
function 진행({ 시험, 케이스들 }: { 시험: 여러건시험; 케이스들: CaseRow[] }) {
  const t = use말();
  const { 줄들, 지금, 도는중 } = 시험;
  const 칸들 = 지금 === null ? [] : (줄들[지금.tcId] ?? []);
  const 지금줄 = 칸들.find((칸) => 칸.platform === 지금?.platform)?.줄;
  const 이름 = 지금 === null ? '' : (케이스들.find((c) => c.tcId === 지금.tcId)?.name ?? '');
  // 여러 번이면 몇째인지 앞에 달고, 디바이스가 둘 이상인 케이스면 지금 디바이스를 뒤에 단다 — 「2 / 4 · MKW-FN-014 장바구니 담기 · 모바일」 (도메인/실행 §8.10 「실시간 칸」)
  const 차례 = 지금 !== null && 지금.전체 > 1 ? [`${지금.차례} / ${지금.전체}`] : [];
  const 디바이스 = 지금 !== null && 칸들.length > 1 ? [t(PLATFORM_LABEL[지금.platform])] : [];
  const 부제 = 지금 === null ? '' : [...차례, [지금.tcId, 이름].filter((글) => 글 !== '').join(' '), ...디바이스].join(' · ');
  // 누른 뒤 첫 시험이 시작되기 전 — 칸을 먼저 열어 기다린다고 알린다. 큐는 첫 케이스의 첫 디바이스부터 돈다
  const 첫 = 케이스들.flatMap((c) => (줄들[c.tcId] ?? []).map((칸) => 칸.platform))[0];

  return (
    <>
      <띠 />
      <div className="pick-split trial-run">
        <div className="pick-main trial-runlist">
          <ul className="trial-queue" aria-label={t('시험 차례')}>
            {케이스들.map((c) => (
              <li key={c.tcId} className={지금?.tcId === c.tcId ? 'cur' : undefined}>
                <span className="id mono">{c.tcId}</span>
                <span className="nm">{c.name}</span>
                <시험배지 칸들={줄들[c.tcId]} />
              </li>
            ))}
          </ul>
          <단계목록 지금={지금} 줄={지금줄} />
        </div>
        <div className="pick-live">
          {지금 === null ? (
            도는중 ? <장면칸 key="시작" 주소={null} 도는중 vision={null} 폰만={첫 === 'android'} 모바일웹={첫 === 'mobile'} /> : null
          ) : (
            <장면칸
              key={지금.trialId}
              주소={api.trialLive(지금.tcId, 지금.trialId)}
              도는중={지금줄?.종류 === 'run'}
              vision={지금.vision}
              부제={부제}
              폰만={지금.platform === 'android'}
              모바일웹={지금.platform === 'mobile'}
            />
          )}
        </div>
      </div>
    </>
  );
}

/**
 * 지금 시험의 단계 — 물을 때마다 받은 단계를 쌓고 마지막 줄이 지금 단계다. 목록이 그 줄로 저절로 내려간다.
 * 그 시험이 끝나면 결과가 모든 단계를 채운다 — 묻는 사이 빠진 짧은 단계도 그때 보인다
 *
 * 이 목록 칸의 scrollTop 만 옮긴다. scrollIntoView 는 둘레 칸(차례 목록이 든 왼쪽 칸)까지 굴려
 * 한 건이 끝날 때마다 왼쪽 칸이 맨 아래로 내려갔다 (2026-11-05 사용자 시험). 끝난 결과로 바뀔 때는 실패 단계로만 옮긴다
 */
function 단계목록({ 지금, 줄 }: { 지금: 지금시험 | null; 줄: 시험줄 | undefined }) {
  const t = use말();
  const 언어 = use언어();
  const 목록 = useRef<HTMLOListElement>(null);
  const 볼줄 = useRef<HTMLLIElement>(null);
  const 단계수 = 지금?.단계들.length ?? 0;
  const 끝 = 지금?.단계들[단계수 - 1];

  useEffect(() => {
    const 칸 = 목록.current;
    const li = 볼줄.current;
    if (칸 === null || li === null) return;
    // 볼 줄의 아래 끝이 칸 아래 끝에 닿게 둔다 — 줄 위치는 칸(position: relative) 기준이다
    칸.scrollTop = Math.max(0, li.offsetTop + li.offsetHeight - 칸.clientHeight);
  }, [지금?.trialId, 단계수, 줄?.종류]);

  if (줄?.종류 === 'done' && 줄.결과.steps.length > 0) {
    const 실패 = 줄.결과.steps.find((step) => step.status === 'FAIL');
    return (
      <ol className="trial-now-steps" ref={목록}>
        {줄.결과.steps.map((step) => (
          <li key={step.seq} ref={step === 실패 ? 볼줄 : undefined} className={step.status === 'FAIL' ? 'failed' : 'done'}>
            <span className="no">{step.seq}</span>
            <span>{step.title}</span>
            <Verdict status={step.status} />
          </li>
        ))}
      </ol>
    );
  }
  if (지금 === null || 끝 === undefined) return <p className="trial-now-none">{t('첫 단계를 기다리는 중')}</p>;
  return (
    <ol className="trial-now-steps" ref={목록}>
      {지금.단계들.map((step) => (
        <li key={step.seq} ref={step === 끝 ? 볼줄 : undefined} className={step === 끝 ? 'now' : 'done'} aria-current={step === 끝 ? 'step' : undefined}>
          <span className="no">{step.seq}</span>
          <span>{step.title}</span>
          <span className="t">{step === 끝 ? t('{시간} 경과', { 시간: seconds(step.elapsedMs, 언어) }) : '✓'}</span>
        </li>
      ))}
    </ol>
  );
}

/** 통과 · 실패 · 실행 안 함과 케이스 × 디바이스마다 한 줄. 실패면 몇째 단계에서 왜 실패했는지 붙인다 (시안 7판 ⑥) */
function 완료({ 시험, 케이스들, 한건 }: { 시험: 여러건시험; 케이스들: CaseRow[]; 한건: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const 칸들 = 결과칸들(케이스들, 시험.줄들);
  const 수 = 셈(칸들);

  return (
    <>
      <띠 />
      <div className="trial-score">
        <div className="p"><b>{수.통과}</b><span>{t('통과')}</span></div>
        <div className="f"><b>{수.실패}</b><span>{t('실패')}</span></div>
        <div className="s"><b>{수.안함}</b><span>{t('실행 안 함')}</span></div>
      </div>
      <ul className="trial-res">
        {칸들.map((칸) => (
          <li key={`${칸.케이스.tcId}-${칸.platform}`} className={칸.줄.종류 === 'done' && 칸.줄.결과.status === 'FAIL' ? 'bad' : undefined}>
            <span className="id mono">{칸.케이스.tcId}</span>
            <span className="nm">{칸.이름붙임 ? `${칸.케이스.name} · ${t(PLATFORM_LABEL[칸.platform])}` : 칸.케이스.name}</span>
            <span className="dur">{칸.줄.종류 === 'done' ? seconds(칸.줄.결과.durationMs, 언어) : ''}</span>
            <판정 줄={칸.줄} />
            <까닭 줄={칸.줄} />
          </li>
        ))}
      </ul>
      {한건 ? <시험절차 칸들={시험.줄들[케이스들[0]?.tcId ?? '']} /> : null}
    </>
  );
}

function 판정({ 줄 }: { 줄: 시험줄 }) {
  const t = use말();
  if (줄.종류 !== 'done') return <span className="verdict v-na">{t('실행 안 함')}</span>;
  if (중단됐나(줄.결과)) return <span className="verdict v-na">{t('중단')}</span>;
  return <Verdict status={줄.결과.status} />;
}

function 까닭({ 줄 }: { 줄: 시험줄 }) {
  const t = use말();
  if (줄.종류 === 'notice') return <div className="why">{줄.글}</div>;
  if (줄.종류 !== 'done' || 줄.결과.status === 'PASS' || 중단됐나(줄.결과)) return null;
  const 깨진 = 줄.결과.steps.find((s) => s.status === 'FAIL');
  // 서버는 한 줄을 항목 오류에서 먼저 고른다 — 원문도 항목 오류와 실패 단계 오류를 다 접어 둔다(같으면 하나)
  const 원문 = [...new Set([줄.결과.error?.message, 깨진?.error?.message].map((글) => 글?.trim() ?? '').filter((글) => 글 !== ''))].join('\n\n');
  // 서버가 준 안내 문장(러너에 못 닿음 따위)은 한 줄과 같다 — 같은 글을 접어 한 번 더 두지 않는다
  return (
    <div className="why">
      {깨진 === undefined ? null : <b>{t('{번호}단계 · {제목}', { 번호: 깨진.seq, 제목: 깨진.title })}</b>}
      <실패이유 failure={줄.실패} />
      <원문보기 글={원문 === 줄.실패?.reason ? null : 원문} />
    </div>
  );
}

/** 실행 중 바닥 — 시작 시각 · 경과와 「중단」 하나. 완료 바닥 — 닫기 · 실패 다시 시험 · 실행 */
export function 시험바닥({ 시험, 케이스들, env, 정식, on실행 }: { 시험: 여러건시험; 케이스들: CaseRow[]; env: string; 정식: boolean; on실행: () => void }) {
  const t = use말();
  const 언어 = use언어();
  if (시험.보기 === 'running') {
    return (
      <>
        <경과 시작시각={시험.시작시각} />
        <button className="btn ghost trial-stop" onClick={시험.중단열기} disabled={시험.중단함}>
          {시험.중단함 ? t('중단하는 중') : t('중단§버튼')}
        </button>
      </>
    );
  }
  const 칸들 = 결과칸들(케이스들, 시험.줄들);
  const 실패 = 칸들.filter((칸) => 칸.줄.종류 === 'done' && 칸.줄.결과.status === 'FAIL');
  const 디바이스 = [...new Set(칸들.map((칸) => 칸.platform))].map((p) => t(PLATFORM_LABEL[p]));
  const 총 = 칸들.reduce((합, 칸) => 합 + (칸.줄.종류 === 'done' ? 칸.줄.결과.durationMs : 0), 0);
  return (
    <>
      <span className="note">{[...디바이스, env, t('총 {시간}', { 시간: seconds(총, 언어) })].join(' · ')}</span>
      <button className="btn ghost" onClick={시험.값으로}>
        {t('닫기')}
      </button>
      {실패.length === 0 ? null : (
        <button className="btn ghost" onClick={() => 시험.실패다시(실패.map((칸) => ({ tcId: 칸.케이스.tcId, platform: 칸.platform })))}>
          {t('실패 {수}건 다시 시험', { 수: 실패.length })}
        </button>
      )}
      {/* 같은 케이스 · 같은 값으로 정식 실행을 건다 — 시작 확인 창을 거친다 (시안 7판 ⑥) */}
      {!정식 ? null : (
        <button className="btn" onClick={on실행}>
          {t('실행')}
        </button>
      )}
    </>
  );
}

function 경과({ 시작시각 }: { 시작시각: number }) {
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
