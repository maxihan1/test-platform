// 실행 창 바닥 칸 — 결과가 남는 곳 · 반복 횟수 · 끝나면 Slack 으로 알리기 · 건수 풀이 · 테스트 실행과 실행 버튼 (도메인/실행 §8.2 · §8.10) · 고친 채 닫을 때 묻는 버튼 줄
// RunPickModal 이 300줄을 넘어 떼어 냈다 (2026-10-12 휴대폰 값 접기)

import { useState } from 'react';

import { use말 } from './i18n.js';

/**
 * 값을 고친 채 Esc · 취소로 닫으려 하면 버튼 줄이 한 번 묻는다. 상자 안에 상자를 겹쳐 열지 않는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」).
 * 묻는 중의 Esc 는 「계속 고치기」다 — Esc 를 두 번 눌러 고친 값을 잃지 않게
 *
 * @param 저장하고닫기 저장할 권한이 있으면 준다 — 「저장하고 닫기」를 같이 묻는다 (도메인/실행 §8.10). 저장에 실패하면 창이 사유를 보이도록 묻기를 먼저 거둔다
 */
export function use닫기묻기(고쳤나: boolean, onClose: () => void, 저장하고닫기?: () => void) {
  const [묻나, set묻나] = useState(false);
  return {
    묻나,
    요청: () => (묻나 ? set묻나(false) : 고쳤나 ? set묻나(true) : onClose()),
    줄: (
      <닫기묻는줄
        on계속={() => set묻나(false)}
        on닫기={onClose}
        on저장닫기={저장하고닫기 === undefined ? undefined : () => { set묻나(false); 저장하고닫기(); }}
      />
    ),
  };
}

function 닫기묻는줄({ on계속, on닫기, on저장닫기 }: { on계속: () => void; on닫기: () => void; on저장닫기: (() => void) | undefined }) {
  const t = use말();
  if (on저장닫기 !== undefined) {
    return (
      <>
        <span className="note" role="status">
          {t('고친 입력값이 저장되지 않았습니다')}
        </span>
        <button className="btn ghost" onClick={on계속}>
          {t('계속 고치기')}
        </button>
        <button className="btn ghost" onClick={on닫기}>
          {t('저장 안 하고 닫기')}
        </button>
        <button className="btn" onClick={on저장닫기}>
          {t('저장하고 닫기')}
        </button>
      </>
    );
  }
  return (
    <>
      {/* 오류가 아니라 묻는 글이라 실패 색을 쓰지 않는다 (DESIGN.md 원칙 1) */}
      <span className="note" role="status">
        {t('고친 값이 사라집니다')}
      </span>
      <button className="btn" onClick={on계속}>
        {t('계속 고치기')}
      </button>
      <button className="btn ghost" onClick={on닫기}>
        {t('닫기')}
      </button>
    </>
  );
}

interface Props {
  repeat: string;
  on반복: (값: string) => void;
  /** 서비스에 Slack 웹훅이 있나 */
  slack칸: boolean;
  notifySlack: boolean;
  onSlack: (켬: boolean) => void;
}

export function 반복과알림({ repeat, on반복, slack칸, notifySlack, onSlack }: Props) {
  const t = use말();
  return (
    <>
    {/* 누르기 전에 결과를 어디서 찾을지 적는다 (도메인/실행 §8.10). 한 건이 앞 실행에 「다시 실행」으로 붙는 글은 서버가 붙인 뒤(WEB-F7-11 · 12) */}
    <div className="mdest">
      <span className="one-label">{t('결과가 남는 곳')}</span>
      <span>{t('실행 기록에 새 RUN 으로 남습니다')}</span>
    </div>
    <div className="mfoot">
      <label htmlFor="pick-repeat">{t('반복')}</label>
      {/* 새로 쓴 테스트가 매번 같은 결과를 내는지 여러 번 돌려 본다 (SPEC §3.2 · §5.2) */}
      {/* 숫자 칸이어도 상태는 글자 그대로다. 비웠다가 다시 치는 중의 빈 값이 1 로 되돌아가면 지울 수가 없다 */}
      <input
        type="number"
        min={1}
        step={1}
        id="pick-repeat"
        value={repeat}
        onChange={(e) => on반복(e.target.value)}
      />
      {/* 웹훅이 없는 서비스에서는 칸 자체를 그리지 않는다. 흐리게 두지 않는다 (SPEC §8.2) */}
      {!slack칸 ? null : (
        <label className="check-inline" htmlFor="pick-slack">
          <input
            type="checkbox"
            id="pick-slack"
            checked={notifySlack}
            onChange={(e) => onSlack(e.target.checked)}
          />
          {t('끝나면 Slack 으로 알리기')}
        </label>
      )}
    </div>
    </>
  );
}

/** 창 바닥 줄의 「실행 항목이 N건 생깁니다」. 곱셈 꼴로 풀어 어디서 나온 수인지 보인다 (도메인/실행 §8.2) */
export function 건수풀이(
  t: (키: string, 값?: Record<string, string | number>) => string,
  재료: { 케이스: number; 디바이스: number | null; 디바이스합: number },
  반복: number,
  건수: number,
): string {
  return 재료.디바이스 === null
    ? t('케이스 {케이스} (디바이스 합계 {합}) × 반복 {반복} = {건수}번', { 케이스: 재료.케이스, 합: 재료.디바이스합, 반복, 건수 })
    : t('케이스 {케이스} × 디바이스 {디바이스} × 반복 {반복} = {건수}번', { 케이스: 재료.케이스, 디바이스: 재료.디바이스, 반복, 건수 });
}

/**
 * 테스트 실행과 실행. 버튼 아래에 기록이 남는지를 화면 글자로 적는다 — 말풍선(title)만으로는 누르기 전에 못 읽는다.
 * 설명은 버튼 밖에 둔다. 안에 넣으면 버튼 이름이 길어져 다른 자리가 이름으로 못 찾는다
 */
export function 실행버튼들({
  on시험,
  on실행,
  실행막힘,
  거는중,
}: {
  on시험: () => void;
  on실행: () => void;
  실행막힘: boolean;
  거는중: boolean;
}) {
  const t = use말();
  return (
    <>
      <span className="foot-act">
        <button className="btn ghost" onClick={on시험}>
          {t('▶ 테스트 실행')}
        </button>
        <span className="hint">{t('기록·리포트가 남지 않습니다')}</span>
      </span>
      {/* 상한은 서버도 같은 것을 본다. 화면만 막으면 직접 찌르는 요청을 못 막는다 (SPEC §8.2) */}
      {/* 도는 동안 글자가 바뀌고 눌리지 않는다. 안 그러면 두 번째 누름이 조용히 무시된다 */}
      <span className="foot-act">
        <button className="btn" onClick={on실행} disabled={실행막힘 || 거는중}>
          {거는중 ? t('실행을 시작하는 중') : t('실행')}
        </button>
        <span className="hint">{t('기록이 남습니다')}</span>
      </span>
    </>
  );
}
