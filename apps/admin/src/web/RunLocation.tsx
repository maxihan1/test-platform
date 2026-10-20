// 실행 위치 한 줄 안내. Android 앱이 있는 실행에서만 보인다 (SPEC §8.2 · §8.10)

import { use말 } from './i18n.js';

/**
 * Android 앱 정식 실행은 늘 디바이스 팜에서 돈다 — 고를 값이 하나라 고르개가 아니라 안내 한 줄이고, 요청에는 아무것도 싣지 않는다 (2026-10-20 APP-F1-10)
 */
export function RunLocation({ android }: { android: boolean }) {
  const t = use말();

  if (!android) return null;

  return <div className="hint">{t('실행 위치 · 디바이스 팜')}</div>;
}
