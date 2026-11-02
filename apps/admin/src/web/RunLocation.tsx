// 실행 위치 한 줄 안내. Android 앱이 있는 실행 · Android 앱 애플리케이션에서만 보인다 (SPEC §8.2 · §8.10)

import type { 앱종류 } from './api.js';
import { use말 } from './i18n.js';
import { 종류 } from './kind.js';

/**
 * Android 앱 정식 실행은 늘 디바이스 팜에서 돈다 — 고를 값이 하나라 고르개가 아니라 안내 한 줄이고, 요청에는 아무것도 싣지 않는다 (2026-10-20 APP-F1-10).
 * Android 앱 애플리케이션은 고른 케이스와 상관없이 늘 띄우고 팜이 하는 일을 한 줄 덧붙인다 (도메인/러너 §5.2 종류 표)
 */
export function RunLocation({ android, 앱종류 }: { android: boolean; 앱종류?: 앱종류 }) {
  const t = use말();
  const 늘 = 종류(앱종류).실행위치늘;

  if (!android && 늘 === null) return null;

  return (
    <div className="hint">
      {t('실행 위치 · Device VISION')}
      {늘 === null ? null : <div>{t(늘)}</div>}
    </div>
  );
}
