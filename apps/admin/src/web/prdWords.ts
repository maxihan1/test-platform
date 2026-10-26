// 「PRD 관리」 · 「API 문서」가 같이 쓰는 낱말 훅 — 「N일째」 나이와 바뀜 · 새 항목 · 지움 종류 글자

import { use말 } from './i18n.js';
import type { 반영종류 } from './prdView.js';
import { 미확정나이 } from './unconfirmed.js';

/** 「N일째」 · 「오늘」. 시각이 없으면 안 적는다 */
export function use나이글(): (since: string | null | undefined) => string | null {
  const t = use말();
  return (since) => {
    if (since === null || since === undefined) return null;
    const 일 = 미확정나이(since);
    return 일 === 0 ? t('오늘') : t('{일}일째', { 일 });
  };
}

export function use반영종류글(): Record<반영종류, string> {
  const t = use말();
  return { changed: t('바뀜'), added: t('새 항목'), removed: t('지움') };
}
