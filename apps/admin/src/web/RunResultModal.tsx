// E2E 실행 하나의 결과를 목록 위 상자로 띄운다 (도메인/실행 §8.7 「결과 보기는 상자로 연다」, 2026-09-22)
//
// **UI · 기능 실행 기록은 2026-10-19 ⑫ 에 상자를 걷고 오른쪽 결과 칸(RunList)으로 옮겼다.** E2E 탭은 A안이 바꾸지 않아
// 이 상자가 남았다 — 손질은 진행판 WEB-F4-11. 그래서 시나리오 결과만 그린다.
//
// **주소(`#/runs/:runId`)는 그대로 살아 있다.** Slack 알림이 그 주소를 쓰고(§8.9) 사이드바의 진행 중 카드도 그리로 간다

import { Modal } from './Modal.js';
import type { 판정 } from './role.js';
import { use말 } from './i18n.js';
import { ScenarioResult } from './ScenarioResult.js';

export function RunResultModal({
  runId,
  할수,
  onClose,
}: {
  runId: number;
  할수: 판정;
  onClose: () => void;
}) {
  const t = use말();

  return (
    <Modal
      제목={`RUN ${String(runId)}`}
      onClose={onClose}
      넓게
      버튼={
        <button className="btn" onClick={onClose}>
          {t('닫기')}
        </button>
      }
    >
      {/* `상자안` 이 제목 · 닫기만 고정한 채 그 아래 전부를 한 칸으로 스크롤하게 한다 */}
      <ScenarioResult runId={runId} 판정하기={() => 할수} 상자안 />
    </Modal>
  );
}
