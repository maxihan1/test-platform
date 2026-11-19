// 새 작성 첫 단계의 PC 게임 칸 — 지원 패드 체크와 Windows 빌드 한 줄 (도메인/게임 §3.10 「윈도우 PC」 「지원 패드」 · 진행판 GAME-F4-06)

import type { 패드 } from './api.js';
import { use말 } from './i18n.js';

/** PC 게임이면 App 이 애플리케이션 줄에서 채워 넘긴다. 모바일 게임 · 다른 종류는 undefined */
export interface PC게임 {
  /** 애플리케이션에 남은 지원 패드 — 앞 작성에서 체크한 것. 체크를 이것으로 채워 연다 */
  패드: 패드[];
  /** 최신 Windows 빌드 번호. null 이면 작성 AI 가 PC 에 깔 빌드가 없어 시작을 막는다 */
  빌드: string | null;
}

export const 패드차례: readonly { 값: 패드; 이름: string }[] = [
  { 값: 'ps5', 이름: 'PS5' },
  { 값: 'ps4', 이름: 'PS4' },
  { 값: 'switch', 이름: 'Switch' },
  { 값: 'xbox', 이름: 'Xbox' },
];

export const 빌드없음말 = 'Windows 빌드가 없어 작성을 시작할 수 없습니다';

export function 패드칸({ pc, 고른, on고름, disabled }: { pc: PC게임; 고른: 패드[]; on고름: (next: 패드[]) => void; disabled: boolean }) {
  const t = use말();
  // 차례는 늘 PS5 · PS4 · Switch · Xbox 다 — 누른 차례대로 보내면 같은 체크인데 저장값이 달라 보인다
  const 바꾼다 = (값: 패드, 켬: boolean) => on고름(패드차례.map((it) => it.값).filter((it) => (it === 값 ? 켬 : 고른.includes(it))));
  return (
    <section className="wiz-new-pads" aria-labelledby="wiz-new-pads-h">
      <div className="wiz-new-pads-head">
        <strong id="wiz-new-pads-h">{t('지원 패드')}</strong>
        <small>{t('체크한 패드마다 「버튼 그림이 화면에 뜨나」 케이스를 한 번씩 실행합니다. 나머지 케이스는 키보드로 한 번 실행합니다')}</small>
      </div>
      <div className="wiz-new-pad-row">
        {패드차례.map((it) => (
          <label key={it.값} className="wiz-new-pad">
            <input type="checkbox" checked={고른.includes(it.값)} disabled={disabled} onChange={(e) => 바꾼다(it.값, e.target.checked)} />
            {it.이름}
          </label>
        ))}
      </div>
      {pc.빌드 === null ? (
        <p className="error-text" role="alert">
          {t(빌드없음말)} — {t('CI 가 Windows 빌드(zip)를 업로드하면 작성할 수 있습니다')}
        </p>
      ) : (
        <small className="wiz-new-hint">{t('작성 AI 가 Windows PC 에 빌드 {빌드} 를 설치해 화면을 읽습니다', { 빌드: pc.빌드 })}</small>
      )}
    </section>
  );
}
