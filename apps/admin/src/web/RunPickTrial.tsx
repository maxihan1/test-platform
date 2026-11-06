// 실행 창의 「시험 실행」 조각 — 창이 세 모양을 오가는 상태 · 케이스 줄마다 붙는 결과 배지 · 한 건 창의 절차 목록 (도메인/실행 §8.10)
// 한 건 · 여러 건이 같은 큐(useTrialQueue)로 돈다. 한 건짜리 화면의 따로 된 조각(TestRun)은 2026-10-09 에 합쳤다

import { Fragment, useEffect, useState } from 'react';

import type { CaseRow, Platform, RunRequestItem, TrialResult, 모바일위치 } from './api.js';
import { 원문보기 } from './FailureWhy.js';
import { use말, use언어 } from './i18n.js';
import { type 고친값표, 실행항목 } from './pickRun.js';
import { 걸린글 } from './trialView.js';
import { PLATFORM_LABEL, Verdict } from './ui.js';
import { type 디바이스칸, type 시험줄, useTrialQueue } from './useTrialQueue.js';

/** 실행 창이 지금 보이는 것 — 값을 고치는 창 · 시험 실행 중 · 완료 (시안 7판 ② ④ ⑥) */
export type 창보기 = 'edit' | 'running' | 'done';

/**
 * 실행 창의 「시험 실행」 상태와 동작을 한 벌로 든다. 위에서 고른 대상 서버로 서버 러너에서 돈다 —
 * 열 주소 칸은 2026-11-03 TMO 에 걷었다(서버가 대상 서버 이름으로 주소를 찾는다 · 도메인/실행 §8.10).
 * 시작 확인 창(시험 · 정식)과 중단 확인 창이 떠 있는지도 여기서 든다 — 창 하나가 세 모양을 오가서다.
 * `알림` 은 창의 한 줄이다 — 값 창에서 누른 것에 대한 답이다
 */
export function use여러건시험(옵션: {
  케이스들: CaseRow[];
  고친값: 고친값표;
  env: string;
  /** 모바일 웹 실행 기기 — mobile 칸만 그 값으로 돈다 */
  mobileOn: 모바일위치;
  알림: (바꿈: (전: string | null) => string | null) => void;
}) {
  const { 케이스들, 고친값, env, mobileOn, 알림 } = 옵션;
  const t = use말();
  const 큐 = useTrialQueue();
  const [보기, set보기] = useState<창보기>('edit');
  const [확인, set확인] = useState<'trial' | 'formal' | null>(null);
  const [중단묻기, set중단묻기] = useState(false);
  const [시작시각, set시작시각] = useState(0);

  // 다 돌았다 — 같은 창이 완료 모양이 된다. 중단을 묻는 사이 끝났으면 묻기를 닫는다 (시안 7판 ⑤)
  useEffect(() => {
    if (큐.도는중) return;
    set중단묻기(false);
    set보기((전) => (전 === 'running' ? 'done' : 전));
  }, [큐.도는중]);

  function 건다(항목들: RunRequestItem[]) {
    set확인(null);
    알림(() => null);
    set시작시각(Date.now());
    set보기('running');
    void 큐.시작(항목들, env, mobileOn);
  }

  return {
    /** 결과 줄의 「모바일(가상 기기)」 — 결과 창에서는 바꿀 수 없어 지금 값이 돈 값이다 */
    mobileOn,
    줄들: 큐.줄들,
    도는중: 큐.도는중,
    지금: 큐.지금,
    중단함: 큐.중단함,
    보기,
    확인,
    중단묻기,
    시작시각,
    /** 값 창의 「시험 실행」 — 걸기 전에 시작 확인 창을 띄운다 */
    누름: () => {
      if (env === '') return 알림(() => t('시험 실행할 대상 서버를 선택하세요.'));
      set확인('trial');
    },
    시작: () => 건다(실행항목(케이스들, 고친값)),
    /** 완료 창의 「실패 N건 다시 시험」 — 실패한 케이스 × 디바이스만 다시 돈다. 한 번 확인했으니 묻지 않는다 */
    실패다시: (실패: { tcId: string; platform: Platform }[]) =>
      건다(
        실행항목(
          케이스들.flatMap((c) => {
            const 디바이스 = 실패.filter((칸) => 칸.tcId === c.tcId).map((칸) => 칸.platform);
            return 디바이스.length === 0 ? [] : [{ ...c, platforms: 디바이스 }];
          }),
          고친값,
        ),
      ),
    정식묻기: () => set확인('formal'),
    확인닫기: () => set확인(null),
    중단열기: () => set중단묻기(true),
    중단닫기: () => set중단묻기(false),
    중단: () => {
      set중단묻기(false);
      큐.중단();
    },
    /** 결과 「← 준비로 돌아가기」 — 값 창으로 돌아가 고쳐서 다시 돌린다. 결과 배지는 줄에 남는다. 「닫기」는 창을 닫는다 (§8.16 ④ · 점검표 B10) */
    값으로: () => set보기('edit'),
  };
}

export type 여러건시험 = ReturnType<typeof use여러건시험>;

/**
 * 케이스 줄 오른쪽 끝의 한 칸. 아직 안 돌렸으면 아무것도 안 그린다.
 * 디바이스가 둘 이상이면 칸마다 이름을 단다 — 「PC 통과 3초 · 모바일 실행 중」. 하나뿐이면 이름 없이 결과만 둔다
 */
export function 시험배지({ 칸들 }: { 칸들: 디바이스칸[] | undefined }) {
  const t = use말();
  if (칸들 === undefined || 칸들.length === 0) return null;
  if (칸들.length === 1) return <한칸배지 줄={칸들[0]!.줄} />;
  // 줄은 칸 수가 정해진 grid 라 배지 여럿을 한 칸에 묶는다. 따로 두면 뒤 단추가 다음 줄로 밀린다
  return (
    <span className="trial-badges">
      {칸들.map((칸) => (
        <한칸배지 key={칸.platform} 줄={칸.줄} 이름={t(PLATFORM_LABEL[칸.platform])} />
      ))}
    </span>
  );
}

function 한칸배지({ 줄, 이름 }: { 줄: 시험줄; 이름?: string }) {
  const t = use말();
  const 언어 = use언어();
  const 머리 = 이름 === undefined ? null : <span className="trial-dev">{이름}</span>;

  if (줄.종류 === 'wait') return <span className="trial-badge dim">{머리}{t('대기')}</span>;
  if (줄.종류 === 'run') return <span className="trial-badge dim">{머리}{t('실행 중')}</span>;
  if (줄.종류 === 'notice') return <span className="trial-badge err">{머리}{줄.글}</span>;
  if (줄.종류 === 'skip') return <span className="trial-badge dim">{머리}{t('실행 안 함')}</span>;

  // 러너 오류 원문은 줄에 넣지 않는다 — 영어 원문이 줄 폭을 먹어 케이스 이름 칸이 한 글자 폭으로 눌렸다. 까닭은 완료 창 실패 줄이 적는다 (2026-11-05 WEB-F9-10).
  // 단계 없이 끝난 미실행만 서버 안내 문장(러너에 닿지 못함 따위)을 둔다 — 값 창으로 돌아와도 까닭이 남게. 폭은 .trial-badge.err 가 묶는다
  const 안내 = 줄.결과.status === 'NA' && 줄.결과.steps.length === 0 ? 줄.결과.error?.message : undefined;
  return (
    <span className="trial-badge">
      {머리}
      <Verdict status={줄.결과.status} />
      {/* 사람이 기다린 시간을 초 단위로 — 결과 창과 같은 값이다 (§8.16 ④ · 점검표 B12 · B15f) */}
      <span className="dur">{걸린글(줄.걸린ms ?? 줄.결과.durationMs, 언어)}</span>
      {안내 === undefined ? null : <span className="trial-badge err">{안내}</span>}
    </span>
  );
}

/**
 * 한 건 창에서는 배지 아래에 절차마다 판정을 펼친다 — 한 건짜리 화면의 테스트 실행이 보여 주던 것이다.
 * 여러 건이면 줄이 길어져 배지만 둔다 (도메인/실행 §8.10). 디바이스가 둘 이상이면 끝난 디바이스마다 이름 머리를 달고 차례로 편다
 */
export function 시험절차({ 칸들 }: { 칸들: 디바이스칸[] | undefined }) {
  const t = use말();
  const 끝난 = (칸들 ?? []).flatMap((칸) => (칸.줄.종류 === 'done' ? [{ platform: 칸.platform, 결과: 칸.줄.결과 }] : []));
  const 이름 = (칸들?.length ?? 0) > 1;
  return (
    <>
      {끝난.map(({ platform, 결과 }) => (
        <Fragment key={platform}>
          {이름 ? <p className="trial-steps-head">{t(PLATFORM_LABEL[platform])}</p> : null}
          <절차목록 결과={결과} />
        </Fragment>
      ))}
    </>
  );
}

function 절차목록({ 결과 }: { 결과: TrialResult }) {
  return (
    <ol className="trial-steps">
      {결과.steps.map((step) => (
        <li key={step.seq} className={step.status === 'FAIL' ? 'trial-step fail' : 'trial-step'}>
          <Verdict status={step.status} />
          <span>{step.title}</span>
          <원문보기 글={step.error?.message} />
        </li>
      ))}
    </ol>
  );
}
