// 실행 창 바닥 칸 — 반복 횟수 · 끝나면 Slack 으로 알리기 (도메인/실행 §8.2 · §8.10)
// RunPickModal 이 300줄을 넘어 떼어 냈다 (2026-10-12 휴대폰 값 접기)

import { use말 } from './i18n.js';

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
