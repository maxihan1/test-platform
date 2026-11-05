// 실행 창의 「테스트 실행」 조각 — 케이스 줄마다 붙는 결과 배지 · 오른쪽 실시간 칸 (도메인/실행 §8.10)
// 한 건 · 여러 건이 같은 큐(useTrialQueue)로 돈다. 한 건짜리 화면의 따로 된 조각(TestRun)은 2026-10-09 에 합쳤다

import { Fragment, useEffect, type ReactNode } from 'react';

import { api, type CaseRow, type TrialResult } from './api.js';
import { use말, use언어 } from './i18n.js';
import { type 고친값표, 실행항목 } from './pickRun.js';
import { 장면칸 } from './TrialLive.js';
import { PLATFORM_LABEL, seconds, Verdict } from './ui.js';
import { type 디바이스칸, type 시험줄, type 지금시험, useTrialQueue } from './useTrialQueue.js';

/**
 * 실행 창의 「시험 실행」 상태와 동작을 한 벌로 든다. 위에서 고른 대상 서버로 서버 러너에서 돈다 —
 * 열 주소 칸은 2026-11-03 TMO 에 걷었다(서버가 대상 서버 이름으로 주소를 찾는다 · 도메인/실행 §8.10).
 * `알림` 은 창의 한 줄이다 — 도는 중에 또 누른 말은 큐가 끝나면 걷는다. 안 걷으면 끝난 뒤에도 옛 안내가 남는다
 */
export function use여러건시험(옵션: {
  케이스들: CaseRow[];
  고친값: 고친값표;
  env: string;
  알림: (바꿈: (전: string | null) => string | null) => void;
}) {
  const { 케이스들, 고친값, env, 알림 } = 옵션;
  const t = use말();
  const 큐 = useTrialQueue();
  const 바쁨글 = t('이미 시험 실행이 돌고 있습니다');

  useEffect(() => {
    if (!큐.도는중) 알림((전) => (전 === 바쁨글 ? null : 전));
  }, [큐.도는중]);

  return {
    줄들: 큐.줄들,
    도는중: 큐.도는중,
    지금: 큐.지금,
    누름: () => {
      // 버튼은 죽이지 않는다. 도는 중에 또 누르면 사유를 말한다 (DESIGN.md)
      if (큐.도는중) return 알림(() => 바쁨글);
      // 한 건 창에서 디바이스를 다 끄면 돌릴 것이 없다. 빈 채로 보내면 큐가 아무것도 안 돌고 끝나 눌러도 반응이 없어 보인다
      if (케이스들.some((c) => c.platforms.length === 0)) return 알림(() => t('실행할 디바이스를 하나 이상 선택하세요.'));
      if (env === '') return 알림(() => t('시험 실행할 대상 서버를 선택하세요.'));
      void 큐.시작(실행항목(케이스들, 고친값), env);
    },
  };
}

/**
 * 창 본문을 왼쪽(지금 창 그대로)과 오른쪽 실시간 칸으로 가른다 — 시안 A 나란히 (도메인/실행 §8.2 「케이스 테스트 실행」 「실시간 칸」).
 * 칸이 그려질 때만 둘로 갈린다(trialLive.css 의 :has). 테스트 실행을 안 누른 창은 지금과 같다.
 * 감싸는 틀은 늘 같다 — 누를 때 틀이 바뀌면 값 칸이 새로 그려져 쓰던 글자를 잃는다
 */
export function 시험나눔({
  시험,
  케이스들,
  children,
}: {
  시험: { 줄들: Record<string, 디바이스칸[]>; 도는중: boolean; 지금: 지금시험 | null };
  케이스들: CaseRow[];
  children: ReactNode;
}) {
  const t = use말();
  const { 줄들, 도는중, 지금 } = 시험;
  // 여러 번이면 몇째인지 앞에 달고, 디바이스가 둘 이상인 케이스면 지금 디바이스를 뒤에 단다 — 「2 / 4 · MKW-FN-014 장바구니 담기 · 모바일」
  const 이름 = 지금 === null ? '' : (케이스들.find((c) => c.tcId === 지금.tcId)?.name ?? '');
  const 칸들 = 지금 === null ? [] : (줄들[지금.tcId] ?? []);
  const 차례 = 지금 !== null && 지금.전체 > 1 ? [`${지금.차례} / ${지금.전체}`] : [];
  const 디바이스 = 지금 !== null && 칸들.length > 1 ? [t(PLATFORM_LABEL[지금.platform])] : [];
  const 부제 = 지금 === null ? '' : [...차례, [지금.tcId, 이름].filter((글) => 글 !== '').join(' '), ...디바이스].join(' · ');
  return (
    <div className="pick-split">
      <div className="pick-main">{children}</div>
      <div className="pick-live">
        {지금 === null ? (
          // 누른 뒤 첫 시험이 시작되기 전 — 칸을 먼저 열어 기다린다고 알린다. 큐는 첫 케이스의 첫 디바이스부터 돈다
          도는중 ? <장면칸 key="시작" 주소={null} 도는중 vision={null} 폰만={케이스들[0]?.platforms[0] === 'android'} /> : null
        ) : (
          <장면칸
            key={지금.trialId}
            주소={api.trialLive(지금.tcId, 지금.trialId)}
            도는중={칸들.find((칸) => 칸.platform === 지금.platform)?.줄.종류 === 'run'}
            vision={지금.vision}
            부제={부제}
            폰만={지금.platform === 'android'}
            모바일웹={지금.platform === 'mobile'}
          />
        )}
      </div>
    </div>
  );
}

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

  return (
    <span className="trial-badge">
      {머리}
      <Verdict status={줄.결과.status} />
      <span className="dur">{seconds(줄.결과.durationMs, 언어)}</span>
      {/* 러너에 못 닿은 사정도 서버가 준 문장을 그대로 낸다 */}
      {줄.결과.error === undefined ? null : <span className="err">{줄.결과.error.message}</span>}
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
          {step.error === undefined ? null : <span className="err">{step.error.message}</span>}
        </li>
      ))}
    </ol>
  );
}
