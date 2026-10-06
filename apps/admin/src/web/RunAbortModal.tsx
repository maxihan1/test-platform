// 실행 결과 화면에서 「실행 중단」을 누르면 한 번 더 묻는 확인 상자 (SPEC §8.3)

import { useState } from 'react';

import { api } from './api.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { message } from './ui.js';

export function RunAbortModal({
  runId,
  멈추는중,
  on멈추는중,
  onClose,
  on멈춤,
}: {
  runId: number;
  멈추는중: boolean;
  on멈추는중: (값: boolean) => void;
  onClose: () => void;
  on멈춤: () => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const [멈춤오류, set멈춤오류] = useState<string | null>(null);
  return (
    <Modal
      제목={t('RUN {번호} 을 멈출까요?', { 번호: runId })}
      onClose={onClose}
      버튼={
        <>
          <button className="btn ghost" onClick={onClose}>
            {t('아니오')}
          </button>
          <button
            className="btn"
            disabled={멈추는중}
            onClick={() => {
              on멈추는중(true);
              set멈춤오류(null);
              void api
                .abortRun(runId)
                .then(on멈춤)
                .catch((err: unknown) => set멈춤오류(message(err, 언어)))
                .finally(() => on멈추는중(false));
            }}
          >
            {멈추는중 ? t('중단하는 중') : t('중단§버튼')}
          </button>
        </>
      }
    >
      <p>
        {t('아직 시작하지 않은 항목은 대기줄에서 빼고, 이미 돌고 있는 항목은 끊습니다.')}
        <br />
        {t('되돌릴 수 없습니다.')}
      </p>
      {멈춤오류 === null ? null : <p className="err">{멈춤오류}</p>}
    </Modal>
  );
}
