// E2E 시나리오 목록 줄의 「삭제」 확인 상자 — ScenarioList.tsx 가 300줄을 넘어 떼어 냈다 (도메인/시나리오 §8.11)

import { useState } from 'react';

import { ApiError } from './api.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { scenarioApi, type ScenarioRow } from './scenarioApi.js';
import { message } from './ui.js';

// 서버는 지우지 않고 목록에서 빼지만(archive) 되살리는 통로가 없어 쓰는 사람에게는 삭제다. 누르기 전에 한 번 묻는다 (DESIGN.md 「모달」 ①)
export function 치우기확인({ 줄, onClose, on치움 }: { 줄: ScenarioRow; onClose: () => void; on치움: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [치우는중, set치우는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  // 요청이 나간 뒤에는 닫지 못하게 한다 — 닫혀도 요청은 끝까지 가서 「취소」가 거짓말이 된다
  const 닫기 = () => {
    if (!치우는중) onClose();
  };
  return (
    <Modal
      제목={t('SC-{번호} 시나리오를 삭제할까요?', { 번호: 줄.id })}
      onClose={닫기}
      바깥눌러닫기={!치우는중}
      버튼={
        <>
          <button type="button" className="btn ghost" disabled={치우는중} onClick={닫기}>
            {t('취소')}
          </button>
          <button
            type="button"
            className="btn"
            disabled={치우는중}
            onClick={() => {
              set치우는중(true);
              set오류(null);
              void scenarioApi
                .archive(줄.id)
                .then(on치움)
                .catch((err: unknown) => {
                  // 이미 없는 시나리오면 목록에서 빼는 것이 맞다 — 남겨 두면 눌러도 같은 오류만 되풀이된다
                  if (err instanceof ApiError && err.status === 404) {
                    on치움();
                    return;
                  }
                  set오류(message(err, 언어));
                  set치우는중(false);
                });
            }}
          >
            {치우는중 ? t('삭제하는 중') : t('삭제')}
          </button>
        </>
      }
    >
      <p>
        {줄.name}
        <br />
        {t('지난 실행 기록과 리포트는 그대로 남습니다.')}
        <br />
        {t('삭제한 시나리오는 되살릴 수 없습니다.')}
      </p>
      {오류 === null ? null : <p className="err">{오류}</p>}
    </Modal>
  );
}
