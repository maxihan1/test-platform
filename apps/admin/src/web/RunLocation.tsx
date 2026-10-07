// 실행 위치(로컬 / 디바이스 팜) 고르개. Android 앱이 있는 실행에서만 보인다 (SPEC §8.2 · §8.10)

import { useId } from 'react';

import { use말 } from './i18n.js';

/**
 * 고를 수 있는 값이 「로컬」 하나뿐이라 상태를 두지 않는다 — 요청에는 호출한 쪽이 상수 `'local'` 을 싣는다.
 * 디바이스 팜은 아직 없어 막아 두고, 이유를 title 이 아니라 화면 글자(「준비 중」)로 보인다.
 */
export function RunLocation({ android }: { android: boolean }) {
  const t = use말();
  const 팜글자 = useId();
  const 이름 = useId();

  if (!android) return null;

  return (
    <div className="sec">
      <div className="sec-h">{t('실행 위치')}</div>
      <div className="checks">
        <label>
          <input type="radio" name={이름} defaultChecked />
          {t('로컬')}
        </label>
        <label>
          <input type="radio" name={이름} disabled aria-describedby={팜글자} />
          {t('디바이스 팜')}
        </label>
        {/* 라벨 밖에 둔다. 안에 넣으면 라벨 이름이 「디바이스 팜준비 중」이 된다.
            모양은 케이스 목록의 「미확정」과 같은 중립 테두리 배지다 — 판정이 아니라 상태 표시라서 (DESIGN 「비활성」) */}
        <span id={팜글자} className="case-tag">
          {t('준비 중')}
        </span>
      </div>
    </div>
  );
}
