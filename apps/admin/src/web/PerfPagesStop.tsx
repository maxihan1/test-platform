// 페이지 성능 측정 중 「측정 중단」 단추와 확인 상자 — 끝난 것은 화면이 묻던 대로 3초 안에 안다 (도메인/성능 §8.14)

import { useState } from 'react';

import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { perfApi } from './perfApi.js';
import { message } from './ui.js';

export function PerfPagesStop({ runId }: { runId: number }) {
  const t = use말();
  const 언어 = use언어();
  const [묻나, set묻나] = useState(false);
  const [멈추는중, set멈추는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);

  function 열기() {
    set오류(null);
    set묻나(true);
  }

  // 보내는 동안 닫히면 실패한 까닭이 안 보인다
  const 닫기 = () => {
    if (!멈추는중) set묻나(false);
  };

  async function 멈추기() {
    set멈추는중(true);
    set오류(null);
    try {
      await perfApi.stop(runId);
      // 멈추는중을 풀지 않는다 — 화면이 끝난 것을 알고 이 단추를 걷을 때까지 다시 누르지 못하게
      set묻나(false);
    } catch (err) {
      set오류(message(err, 언어));
      set멈추는중(false);
    }
  }

  return (
    <>
      <button type="button" className="btn ghost perf-stop" disabled={멈추는중} onClick={열기}>
        {멈추는중 ? t('중단하는 중') : t('측정 중단')}
      </button>
      {!묻나 ? null : (
        <Modal
          제목={t('측정을 중단할까요?')}
          onClose={닫기}
          버튼={
            <>
              <button type="button" className="btn ghost" disabled={멈추는중} onClick={닫기} data-first>
                {t('취소')}
              </button>
              <button type="button" className="btn" disabled={멈추는중} onClick={() => void 멈추기()}>
                {t('측정 중단')}
              </button>
            </>
          }
        >
          <p>{t('이번 측정 결과는 남지 않습니다')}</p>
          {오류 === null ? null : <p className="perf-err" role="alert">{오류}</p>}
        </Modal>
      )}
    </>
  );
}
