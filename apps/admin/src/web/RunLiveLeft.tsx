// 정식 실행 진행 창의 왼쪽 칸 — 숫자 한 덩어리 → 진행 중 → 끝남 → 대기 (도메인/실행 §8.16 ⑤ · 점검표 D7)
// 앞 판은 숫자 · 「11/12 완료」 · 남은 시간 · 「진행 중」이 한 줄씩 쌓여 화면 카드가 접힌 아래로 밀렸다

import type { ReactNode } from 'react';

import type { RunItemSummary } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 실행남은글 } from './remainText.js';
import { 짧은단계글 } from './RunLiveCards.js';
import type { RunDetail, 진행 } from './runProgress.js';
import { PLATFORM_LABEL, STATUS_LABEL } from './ui.js';
import { 그중미확정글 } from './unconfirmed.js';

// 5000건짜리 실행도 2초마다 다시 그린다 — 끝남 · 대기는 앞 몇 줄만 그리고 나머지는 수로 말한다
const 줄최대 = 30;

/** 판정 알약 하나 — 0 은 점선 회색이라 실패가 없을 때 빨간색이 안 보인다 (시안 A ④ · trialResult.css) */
export function 셈알약({ 종류, 이름, 수 }: { 종류: 'pass' | 'fail' | 'na'; 이름: string; 수: number }) {
  return (
    <span className={수 === 0 ? 'pill zero' : `pill ${종류}`}>
      {이름} <b>{수}</b>
    </span>
  );
}

const 알약종류 = { PASS: 'pass', FAIL: 'fail', NA: 'na' } as const;

function 줄({ 항목, 오른쪽, 흐림 = false }: { 항목: RunItemSummary; 오른쪽: ReactNode; 흐림?: boolean }) {
  const t = use말();
  return (
    <li className={흐림 ? 'wait' : undefined}>
      <span className="mono">{항목.tcId}</span>
      <span className="dv">{t(PLATFORM_LABEL[항목.platform])}</span>
      {오른쪽}
    </li>
  );
}

function 묶음({ 이름, 수, children }: { 이름: string; 수: number; children: ReactNode }) {
  if (수 === 0) return null;
  return (
    <>
      <div className="ih">
        {이름} {수}
      </div>
      <ul>{children}</ul>
    </>
  );
}

function 넘침({ 수 }: { 수: number }) {
  const t = use말();
  return 수 <= 0 ? null : <p className="hint more">{t('외 {건수}건', { 건수: 수 })}</p>;
}

export function 진행왼쪽({ data, 진행: 지금, 남은ms }: { data: RunDetail; 진행: 진행; 남은ms: number | null }) {
  const t = use말();
  const 언어 = use언어();
  const { 막대, 끝난수, 전체수, 지금도는것들, 끝난것들, 대기것들 } = 지금;
  const 미확정 = 그중미확정글(data.counts, 언어);

  return (
    <div className="rl-left">
      <div className="rl-prog">
        {/* 전체수가 0 이면 막대를 안 그린다 — 칸이 다 폭 0 이라 회색 빈 띠만 남는다 (RunResult.tsx 와 같은 판단) */}
        {전체수 === 0 ? null : (
          <div className="rl-bar" aria-hidden="true">
            <i style={{ flex: 막대.통과, background: 'var(--pass)' }} />
            <i style={{ flex: 막대.실패, background: 'var(--fail)' }} />
            <i style={{ flex: 막대.미실행, background: 'var(--na)' }} />
            <i style={{ flex: 막대.남은것, background: 'var(--well)' }} />
          </div>
        )}
        <div className="rl-row">
          <span>{t('{끝난} / {전체} 완료', { 끝난: 끝난수, 전체: 전체수 })}</span>
          <span className="hint">{실행남은글(남은ms, Date.now(), 언어)}</span>
        </div>
        {/* 색만으로 판정을 전하지 않는다 — 알약마다 글자와 수를 같이 적는다 (§8.9) */}
        <div className="rl-pills">
          <셈알약 종류="pass" 이름={t('통과')} 수={막대.통과} />
          <셈알약 종류="fail" 이름={t('실패')} 수={막대.실패} />
          <셈알약 종류="na" 이름={t('미실행')} 수={막대.미실행} />
        </div>
        {미확정 === '' ? null : <p className="hint">{미확정}</p>}
      </div>
      <div className="rl-items">
        <묶음 이름={t('진행 중')} 수={지금도는것들.length}>
          {지금도는것들.map(({ 항목, 절차 }) => (
            <줄 key={항목.historyId} 항목={항목} 오른쪽={<span className="pill run">{짧은단계글(절차, t) ?? t('진행 중')}</span>} />
          ))}
        </묶음>
        <묶음 이름={t('종료')} 수={끝난것들.length}>
          {끝난것들.slice(0, 줄최대).map((항목) => (
            <줄 key={항목.historyId} 항목={항목} 오른쪽={<span className={`pill ${알약종류[항목.status]}`}>{t(STATUS_LABEL[항목.status])}</span>} />
          ))}
        </묶음>
        <넘침 수={끝난것들.length - 줄최대} />
        <묶음 이름={t('대기')} 수={대기것들.length}>
          {대기것들.slice(0, 줄최대).map((항목) => (
            <줄 key={항목.historyId} 항목={항목} 흐림 오른쪽={<span className="pill wait">{t('대기')}</span>} />
          ))}
        </묶음>
        <넘침 수={대기것들.length - 줄최대} />
      </div>
    </div>
  );
}
