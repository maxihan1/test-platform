// 실행 창 바닥 칸 — 반복 횟수 · 끝나면 Slack 으로 알리기 (도메인/실행 §8.2 · §8.10) · 고친 채 닫을 때 묻는 버튼 줄
// RunPickModal 이 300줄을 넘어 떼어 냈다 (2026-10-12 휴대폰 값 접기)

import { useState } from 'react';

import { use말 } from './i18n.js';

/**
 * 값을 고친 채 Esc · 취소로 닫으려 하면 버튼 줄이 한 번 묻는다. 상자 안에 상자를 겹쳐 열지 않는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」).
 * 묻는 중의 Esc 는 「계속 고치기」다 — Esc 를 두 번 눌러 고친 값을 잃지 않게
 */
export function use닫기묻기(고쳤나: boolean, onClose: () => void) {
  const [묻나, set묻나] = useState(false);
  return {
    묻나,
    요청: () => (묻나 ? set묻나(false) : 고쳤나 ? set묻나(true) : onClose()),
    줄: (
      <닫기묻는줄 on계속={() => set묻나(false)} on닫기={onClose} />
    ),
  };
}

function 닫기묻는줄({ on계속, on닫기 }: { on계속: () => void; on닫기: () => void }) {
  const t = use말();
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
    <div className="mfoot">
      <label htmlFor="pick-repeat">{t('반복')}</label>
      {/* 새로 쓴 테스트가 매번 같은 결과를 내는지 여러 번 돌려 본다 (SPEC §3.2 · §5.2) */}
      <input
        type="text"
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
  );
}
