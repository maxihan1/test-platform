// 「다음 단계」의 테스트 반영하기 — 보류 판정 · 대상 서버 고르기 · 반영 버튼 (도메인/작성 §3.6 「★ 보류 케이스」 · §7 · DESIGN.md 「작성 상태」)
// AuthoringTodo 가 300줄에 닿아 뗐다

import { useState } from 'react';

import { api, type AuthoringCoverage, type AuthoringRow } from './api.js';
import { 값을채웠나 } from './AuthoringHeld.js';
import { 남은수, 일 } from './authoringTodoParts.js';
import { use말 } from './i18n.js';

interface Props {
  service: string;
  요청: AuthoringRow;
  표: string;
  /** **화면이 버튼을 안 그리는 것은 편의이지 방어가 아니다** — 서버 gate.ts 가 다시 막는다 */
  반영권한: boolean;
  보내는중: boolean;
  새줄로: (만든다: () => Promise<{ id: number }>) => void;
  /** 이 작성 실행의 셈 — 남은 요구가 있으면 반영을 눌러야 이어 작성할 수 있다고 알린다 */
  커버리지: AuthoringCoverage | null;
}

export function 반영단계({ service, 요청, 표, 반영권한, 보내는중, 새줄로, 커버리지 }: Props) {
  const t = use말();
  const [고른서버, set고른서버] = useState<string | null>(null);
  const held = 요청.held ?? [];
  const 남은 = 요청.heldOpen ?? 0;
  const 모름 = 요청.heldUnknown === true;
  // 대조 요청은 원본의 대상 서버를 물려받는다 — 고르면 서버가 BAD_ENV 로 거절한다. 남은 보류가 있으면 고를 때가 아니다
  const 서버고름 = 남은 === 0 && 요청.compare !== true && 값을채웠나(held);
  // 테스트 계정 있는 줄만 서버가 싣는다 — 운영 줄을 보이면 고른 뒤에야 BAD_ENV 로 막힌다
  const 줄들 = 요청.mergeEnvs ?? [];
  const 서버 = 줄들.includes(고른서버 ?? '') ? 고른서버 : (줄들[0] ?? null);
  const 서버없음 = 서버고름 && 서버 === null;
  const 남음 = 남은수(커버리지);

  return (
    <일 표={표} 제목={t('테스트 반영하기')} 설명={t('검토가 끝나면 PR을 합쳐 케이스 목록에 올립니다.')}>
      {반영권한 && 서버고름 && !서버없음 ? (
        <label className="held-env">
          {t('대상 서버')}
          <select value={서버 ?? ''} onChange={(e) => set고른서버(e.target.value)}>
            {줄들.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {반영권한 ? (
        <button
          className="btn"
          type="button"
          // 막는 것은 서버다(HELD_OPEN · HELD_UNKNOWN · BAD_ENV) — 여기서 막는 것은 누르기 전에 까닭을 보이려는 편의다
          disabled={보내는중 || 남은 > 0 || 모름 || 서버없음}
          onClick={() => 새줄로(() => api.createAuthoringMerge(service, 요청.id, 서버고름 ? (서버 ?? undefined) : undefined))}
        >
          {보내는중 ? t('반영하는 중') : t('테스트 반영하기')}
        </button>
      ) : (
        <span className="hint">{t('반영은 운영 권한이 있는 사람만 할 수 있습니다.')}</span>
      )}
      {모름 ? <p className="held-why">{t('보류 케이스를 읽지 못했습니다. 같은 자료로 다시 작성하세요.')}</p> : null}
      {남은 > 0 ? <p className="held-why">{t('보류 케이스 {수}건이 남아 있어 아직 반영할 수 없습니다.', { 수: 남은 })}</p> : null}
      {서버없음 ? <p className="held-why">{t('테스트 계정을 넣은 대상 서버가 없습니다. 설정 > 서비스에서 넣으세요.')}</p> : null}
      {/* 이어 작성은 플랫폼 반영만 인정한다(게이트 0) — GitHub 에서 직접 병합한 요청도 여기서 반영을 눌러야 한다.
          에이전트는 이미 병합된 PR 의 반영을 성공으로 닫는다 (도메인/작성 §3.6 「남은 요구로 이어 작성」) */}
      {남음 !== null && 남음.다음 + 남음.빠짐 > 0 ? (
        // 버튼 옆에 붙이면 두 줄로 꺾여 버튼과 엉킨다 — 한 문단으로 아래에 (2026-09-30 화면 확인)
        <p className="hint">{t('GitHub 에서 이미 병합했어도 여기서 반영을 눌러야 남은 요구를 이어 작성할 수 있습니다.')}</p>
      ) : null}
      {held.length > 0 && 남은 === 0 ? (
        <span className="hint">{t('반영하면 넣은 값을 테스트 코드에 적고, 값을 채운 케이스를 3번 돌려 모두 통과해야 합칩니다.')}</span>
      ) : null}
    </일>
  );
}
