// 실행에 고정한 빌드 번호 한 조각과 「다른 빌드가 깔려 있었다」 한 줄 — 실행 기록 줄 · 실행 결과 머리가 같이 쓴다 (도메인/실행 §3.11 「실행에 빌드 번호를 남긴다」)

import type { RunSummary, 폰에깔린앱 } from './api.js';
import { use말, type 값들 } from './i18n.js';

const 시작방식글 = { MANUAL: '직접 실행', SCHEDULED: '정기 실행', RERUN: '실패 다시 실행', BUILD: '빌드 실행' } as const;

/**
 * 시작 방식 · 빌드 번호 조각(앞에 ` · ` 가 붙는다). 빌드 실행은 시작 방식을 적지 않는다 — 실행자가 이미 「빌드 · <이름>」이다.
 * 사람 · 정기 실행도 그 줄의 최신 빌드를 고정해 빌드 번호가 붙는다
 */
export function 시작빌드글(run: Pick<RunSummary, 'origin' | 'buildNo'>, t: (키: string, 값?: 값들) => string): string {
  const 방식 = run.origin === undefined || run.origin === 'BUILD' ? '' : ` · ${t(시작방식글[run.origin])}`;
  return run.buildNo == null ? 방식 : 방식 + ' · ' + t('빌드 {번호}', { 번호: run.buildNo });
}

/**
 * 폰이 읽은 빌드 코드(versionCode) 가운데 실행 빌드 번호와 다른 것. 앱 판(versionName)은 빌드마다 안 바뀌는 일이 많아 견주지 않는다.
 * 빌드 코드를 못 읽은 폰은 견줄 것이 없어 뺀다 — 경고가 늘 뜨면 아무도 안 읽는다
 */
export function 다른빌드들(buildNo: string | null | undefined, apps: 폰에깔린앱[] | undefined): string[] {
  if (buildNo == null) return [];
  return [...new Set((apps ?? []).flatMap((a) => (a.appBuild === null || a.appBuild === buildNo ? [] : [a.appBuild])))];
}

export function 다른빌드알림({ buildNo, apps }: { buildNo?: string | null; apps?: 폰에깔린앱[] }) {
  const t = use말();
  const 다른 = 다른빌드들(buildNo, apps);
  if (다른.length === 0 || buildNo == null) return null;
  return (
    // API 문서 줄과 달리 경고색이다 — 다른 빌드에서 돈 결과라 통과 · 실패를 그대로 믿으면 안 된다
    <div className="set-warn" role="note">
      {t('다른 빌드가 깔려 있었습니다 — 실행한 빌드 {빌드} · 폰에 깔린 빌드 {깔린}', { 빌드: buildNo, 깔린: 다른.join(', ') })}
    </div>
  );
}
