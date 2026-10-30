// 실행 창 케이스마다 입력값 칸 아래의 출처 줄 — 저장값 · 코드 기본값, 고치면 「이번 실행에만 · 이 값 저장 · 되돌리기」 (도메인/실행 §8.10)
// 한 건 · 여러 건 창이 같이 쓴다. 저장은 창이 한다 — 「저장하고 닫기」도 같은 저장을 거친다

import { useState } from 'react';

import { api, type CaseRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { when } from './ui.js';
import type { useRunPickValues, 출처상태 } from './useRunPickValues.js';

/**
 * 고친 값을 저장값으로 저장한다 — 줄의 「이 값 저장」과 「저장하고 닫기」가 같이 쓴다 (도메인/실행 §8.10 · §8.2).
 * 명세에 안 맞는 케이스가 있으면 하나도 저장하지 않는다. 앞 케이스만 저장되고 멈추면 무엇이 남았는지 알 수 없다
 */
export function use입력값저장(
  값: ReturnType<typeof useRunPickValues>,
  on다시읽기: ((tcId: string) => void) | undefined,
  on실패: (err: unknown) => void,
  on틀림: (tcIds: string[]) => void,
) {
  const [저장중, set저장중] = useState(false);

  async function 저장(tcIds: string[]): Promise<boolean> {
    const 틀린 = tcIds.filter((tcId) => 값.오류[tcId] !== undefined);
    if (틀린.length > 0) {
      on틀림(틀린);
      return false;
    }
    set저장중(true);
    try {
      for (const tcId of tcIds) {
        await api.saveInput(tcId, 값.저장할값(tcId));
        값.저장됨(tcId);
        on다시읽기?.(tcId);
      }
      return true;
    } catch (err) {
      on실패(err);
      return false;
    } finally {
      set저장중(false);
    }
  }

  return { 저장중, 저장 };
}

export function 출처줄({
  케이스,
  상태,
  저장된다,
  저장중,
  on저장,
  on되돌리기,
}: {
  케이스: CaseRow;
  상태: 출처상태;
  /** 케이스 쓰기 권한 — 없으면 「이 값 저장」을 그리지 않는다 (인증 §3.5) */
  저장된다: boolean;
  저장중: boolean;
  on저장: () => void;
  on되돌리기: () => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const saved = 케이스.savedInput ?? undefined;

  if (상태 === 'savedNow') {
    return (
      <p className="prow-src" role="status">
        {t('저장값으로 저장했습니다.')}
      </p>
    );
  }
  if (상태 === 'source') {
    return (
      <p className="prow-src">
        {saved === undefined ? t('코드 기본값') : t('저장값 · {누가} · {언제}', { 누가: saved.savedBy, 언제: when(saved.savedAt, 언어) })}
      </p>
    );
  }
  // 저장값은 팀 모두와 정기 실행에 바로 쓰여 저절로 저장하지 않는다 — 고친 값은 사람이 고를 때까지 이번 실행에만 간다
  return (
    <p className="prow-src changed">
      <span>{saved === undefined ? t('코드 기본값과 다릅니다 · 이번 실행에만 씁니다') : t('저장값과 다릅니다 · 이번 실행에만 씁니다')}</span>
      {!저장된다 ? null : (
        <button type="button" className="btn small" onClick={on저장} disabled={저장중}>
          {t('이 값 저장')}
        </button>
      )}
      <button type="button" className="btn small ghost" onClick={on되돌리기} disabled={저장중}>
        {t('되돌리기')}
      </button>
    </p>
  );
}
