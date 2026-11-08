// 실행 창의 시험 실행 결과 — 한 줄 알약 점수 · 케이스 × 디바이스 줄 · 실패 카드와 그 바닥 (도메인/실행 §8.16 ④ · 시안 A ④)
// 실행 중 모양(RunPickTrialRun)이 300줄을 넘어 떼어 냈다

import { useState } from 'react';

import type { CaseRow, Platform, TrialResult, 모바일위치 } from './api.js';
import { 원문보기, 실패이유 } from './FailureWhy.js';
import { use말, use언어 } from './i18n.js';
import type { 여러건시험 } from './RunPickTrial.js';
import { show } from './ItemSteps.js';
import { 걸린글, 결과단계줄들 } from './trialView.js';
import { PLATFORM_LABEL, STATUS_LABEL, Verdict } from './ui.js';
import type { 디바이스칸, 시험줄 } from './useTrialQueue.js';

/** 러너가 끊었거나 러너에 보내기 전에 닫았다 — admin 과 러너가 같은 모양으로 남긴다 (도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」) */
export const 중단됐나 = (r: TrialResult): boolean => r.status === 'NA' && r.error?.message === 'ABORTED';

export interface 결과칸 {
  케이스: CaseRow;
  platform: Platform;
  줄: 시험줄;
}

/** 결과 줄 — 케이스 × 디바이스 하나씩, 케이스 차례대로 */
export function 결과칸들(케이스들: CaseRow[], 줄들: Record<string, 디바이스칸[]>): 결과칸[] {
  return 케이스들.flatMap((케이스) => (줄들[케이스.tcId] ?? []).map((칸) => ({ 케이스, platform: 칸.platform, 줄: 칸.줄 })));
}

/** 통과 · 실패 · 미실행. 중단한 것 · 미실행(NA) · 차례가 안 온 것 · 걸지 못한 것은 미실행이다 */
export function 셈(칸들: 결과칸[]) {
  const 끝난 = 칸들.flatMap((칸) => (칸.줄.종류 === 'done' ? [칸.줄.결과] : []));
  const 통과 = 끝난.filter((r) => r.status === 'PASS').length;
  const 실패 = 끝난.filter((r) => r.status === 'FAIL').length;
  return { 통과, 실패, 안함: 칸들.length - 통과 - 실패 };
}

/** 사람이 기다린 시간 — 늦춘 1초도 든다. 옛 줄(걸린ms 없음)만 러너 값을 쓴다 (§8.16 ④ · 점검표 B12) */
const 걸린ms = (줄: 시험줄): number => (줄.종류 !== 'done' ? 0 : (줄.걸린ms ?? 줄.결과.durationMs));
const 실패했나 = (줄: 시험줄): boolean => 줄.종류 === 'done' && 줄.결과.status === 'FAIL';

function 실패칸들(칸들: 결과칸[]): 결과칸[] {
  return 칸들.filter((칸) => 실패했나(칸.줄));
}

function 총걸린ms(칸들: 결과칸[]): number {
  return 칸들.reduce((합, 칸) => 합 + 걸린ms(칸.줄), 0);
}

export function 시험결과({ 시험, 케이스들, env, mobileOn }: { 시험: 여러건시험; 케이스들: CaseRow[]; env: string; mobileOn: 모바일위치 }) {
  const t = use말();
  const 언어 = use언어();
  const 칸들 = 결과칸들(케이스들, 시험.줄들);
  const 수 = 셈(칸들);
  // 둘째 실패 카드부터 단계 목록을 접는다 — 펼친 것만 여기 든다
  const [편, set편] = useState<ReadonlySet<string>>(new Set());
  const 첫실패 = 실패칸들(칸들)[0];
  const 디바이스 = [...new Set(칸들.map((칸) => 칸.platform))].map((p) =>
    p === 'mobile' ? `${t(PLATFORM_LABEL[p])}(${t(mobileOn === 'vision' ? '실제 디바이스' : '가상 디바이스')})` : t(PLATFORM_LABEL[p]),
  );
  const 총 = 총걸린ms(칸들);

  return (
    <>
      <div className="trial-sum">
        {/* 0 은 점선 회색이다 — 앞 판은 큰 칸 셋이라 어둡게에서 실패 0 칸이 탁한 빨강으로 무거웠다 (점검표 B18) */}
        <span className={수.통과 === 0 ? 'pill zero' : 'pill pass'}>{t('통과')} <b>{수.통과}</b></span>
        <span className={수.실패 === 0 ? 'pill zero' : 'pill fail'}>{t('실패')} <b>{수.실패}</b></span>
        <span className={수.안함 === 0 ? 'pill zero' : 'pill na'}>{t('미실행')} <b>{수.안함}</b></span>
        <span className="r">{[...디바이스, env, t('총 {시간}', { 시간: 걸린글(총, 언어) })].join(' · ')}</span>
      </div>
      <ul className="trial-res">
        {칸들.map((칸) => {
          const 열쇠 = `${칸.케이스.tcId}-${칸.platform}`;
          const 실패 = 실패했나(칸.줄);
          return (
            <li key={열쇠} className={실패 ? 'bad' : undefined}>
              <div className="top">
                <span className="id mono">{칸.케이스.tcId}</span>
                <span className="nm">{칸.케이스.name}</span>
                <span className="tag">{t(PLATFORM_LABEL[칸.platform])}</span>
                <span className="dur">{칸.줄.종류 === 'done' ? 걸린글(걸린ms(칸.줄), 언어) : ''}</span>
                <판정 줄={칸.줄} />
              </div>
              <까닭 줄={칸.줄} 펼침={칸 === 첫실패 || 편.has(열쇠)} on펼침={() => set편((전) => new Set([...전, 열쇠]))} on접음={() => set편((전) => new Set([...전].filter((k) => k !== 열쇠)))} 첫={칸 === 첫실패} />
            </li>
          );
        })}
      </ul>
    </>
  );
}

function 판정({ 줄 }: { 줄: 시험줄 }) {
  const t = use말();
  if (줄.종류 !== 'done') return <span className="verdict v-na">{t('미실행')}</span>;
  if (중단됐나(줄.결과)) return <span className="verdict v-na">{t('중단')}</span>;
  return <Verdict status={줄.결과.status} />;
}

const 값최대 = 60;

/** 실패한 확인에서 기대와 실제 값 한 줄. 긴 값은 자른다. 값이 둘 다 없으면 줄을 안 그린다 (점검표 U1) */
function 받은값({ 단계 }: { 단계: TrialResult['steps'][number] | undefined }) {
  const t = use말();
  const 언어 = use언어();
  const 확인 = 단계?.assertions.find((a) => a.status === 'FAIL');
  if (확인 === undefined || (확인.actual === undefined && 확인.expected === undefined)) return null;
  const 자름 = (값: unknown): string => {
    const 글 = show(값, 언어);
    return 글.length > 값최대 ? `${글.slice(0, 값최대)}…` : 글;
  };
  return <span className="got">{t('기대 {기대} · 실제 {실제}', { 기대: 자름(확인.expected), 실제: 자름(확인.actual) })}</span>;
}

/**
 * 실패 카드 안 — ① 몇째 단계 · 제목 · 유형 ② 한국어 한 줄 ③ 원문 보기 하나 ④ 단계 목록 (§8.16 ④ · 점검표 D14 · B4).
 * 실패 순간 화면 고리는 없다 — 시험 실행 사진을 화면이 열 통로가 서버에 없다(점검표 D15 · 범위 밖)
 */
function 까닭({ 줄, 펼침, 첫, on펼침, on접음 }: { 줄: 시험줄; 펼침: boolean; 첫: boolean; on펼침: () => void; on접음: () => void }) {
  const t = use말();
  if (줄.종류 === 'notice') return <div className="why"><span>{줄.글}</span></div>;
  if (줄.종류 !== 'done' || 줄.결과.status === 'PASS' || 중단됐나(줄.결과)) return null;
  const 깨진 = 줄.결과.steps.find((s) => s.status === 'FAIL');
  // 서버는 한 줄을 항목 오류에서 먼저 고른다 — 원문도 항목 오류와 실패 단계 오류를 다 접어 둔다(같으면 하나)
  const 원문 = [...new Set([줄.결과.error?.message, 깨진?.error?.message].map((글) => 글?.trim() ?? '').filter((글) => 글 !== ''))].join('\n\n');
  const 단계들 = 결과단계줄들(줄.결과, 줄.제목들);
  return (
    <>
      <div className="why">
        {깨진 === undefined ? null : <b>{t('{번호}단계 · {제목}', { 번호: 깨진.seq, 제목: 깨진.title })}</b>}
        <실패이유 failure={줄.실패} />
        <받은값 단계={깨진} />
        <div className="lk">
          {/* 서버가 준 안내 문장(러너에 못 닿음 따위)은 한 줄과 같다 — 같은 글을 접어 한 번 더 두지 않는다 */}
          <원문보기 글={원문 === 줄.실패?.reason ? null : 원문} />
          {첫 || 단계들.length === 0 ? null : (
            <button type="button" className="linklike" aria-expanded={펼침} onClick={펼침 ? on접음 : on펼침}>
              {펼침 ? t('단계 접기 ▴') : t('단계 펼치기 ▾')}
            </button>
          )}
        </div>
      </div>
      {!펼침 || 단계들.length === 0 ? null : (
        <ol className="trial-res-steps">
          {단계들.map((s) => (
            <li key={s.seq} className={s.status === 'FAIL' ? 'f' : undefined}>
              <span className="n">{s.seq}</span>
              <span>{s.title}</span>
              <span className={s.status === null ? 'sk' : s.status === 'PASS' ? 'ok' : s.status === 'FAIL' ? 'ng' : 'sk'}>
                {s.status === null ? t('실행 안 함') : t(STATUS_LABEL[s.status])}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

/** 결과 바닥 — 왼쪽 「← 준비로 돌아가기」, 오른쪽 닫기 · 실패 N건 다시 시험 · 재실행 (§8.16 ④ · 점검표 B10 · B15a) */
export function 결과바닥({ 시험, 케이스들, 정식, on실행, on닫기 }: { 시험: 여러건시험; 케이스들: CaseRow[]; 정식: boolean; on실행: () => void; on닫기: () => void }) {
  const t = use말();
  const 실패 = 실패칸들(결과칸들(케이스들, 시험.줄들));
  return (
    <>
      <button type="button" className="linklike trial-back" onClick={시험.값으로}>
        {t('← 준비로 돌아가기')}
      </button>
      <button className="btn ghost" onClick={on닫기}>
        {t('닫기')}
      </button>
      {실패.length === 0 ? null : (
        <button className="btn ghost" onClick={() => 시험.실패다시(실패.map((칸) => ({ tcId: 칸.케이스.tcId, platform: 칸.platform })))}>
          {t('실패 {수}건 다시 시험', { 수: 실패.length })}
        </button>
      )}
      {/* 같은 케이스 · 같은 값으로 정식 실행을 건다 — 시작 확인 창을 거친다 */}
      {!정식 ? null : (
        <button className="btn" onClick={on실행}>
          {t('다시 실행')}
        </button>
      )}
    </>
  );
}
