// 실행 위치 한 줄 안내. Android 앱이 있는 실행에서만 보인다 (SPEC §8.2 · §8.10)

import { use말 } from './i18n.js';

/**
 * 고를 수 있는 값이 「로컬」 하나뿐이라 고르개가 아니라 안내 한 줄이다 — 요청에는 호출한 쪽이 상수 `'local'` 을 싣는다.
 * 디바이스 팜은 아직 없어 화면에 두지 않는다. 있는 척하는 라디오는 「왜 못 고르지」만 묻게 한다
 */
export function RunLocation({ android }: { android: boolean }) {
  const t = use말();

  if (!android) return null;

  return <div className="hint">{t('실행 위치 · 로컬')}</div>;
}
