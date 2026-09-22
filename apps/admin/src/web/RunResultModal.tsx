// 실행 하나의 결과를 목록 위 상자로 띄운다 (SPEC §8.7 「결과 보기는 상자로 연다」, 2026-09-22)
//
// **왜 상자인가** — 화면을 통째로 갈아타면 돌아올 때 검색 조건이 풀리고 보던 자리를 잃는다.
// 실행이 쌓이면 조건을 걸어 찾게 되므로 그 손실이 매번 난다.
//
// **주소(`#/runs/:runId`)는 그대로 살아 있다.** Slack 알림이 그 주소를 쓰고(§8.9)
// 사이드바의 진행 중 카드도 그리로 간다 — 화면으로 옮겨가는 버튼은 없앴지만 그 주소로
// 직접 오는 길은 남아 있다 (2026-09-22 ② — 상자가 그 화면과 같은 내용을 전부 담게 되면서
// 「화면으로 열기」가 상자 안에 상자 밖 정보가 또 있다는 착각을 줬다)

import { Modal } from './Modal.js';
import type { 등급 } from './role.js';
import { RunResult } from './RunResult.js';
import { use말 } from './i18n.js';

export function RunResultModal({
  runId,
  role,
  onClose,
}: {
  runId: number;
  role: 등급;
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
      {/* `상자안` 이 진행·완료 상자를 막고, 머리·필터는 고정한 채 케이스 줄만 스크롤하게 한다.
          가두개가 겹치면 빠져나올 길이 없다 */}
      <RunResult runId={runId} role={role} 상자안 />
    </Modal>
  );
}
