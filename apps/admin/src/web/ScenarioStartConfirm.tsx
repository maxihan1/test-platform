// E2E 정식 실행을 걸기 전에 한 번 묻는 작은 확인 상자 — 케이스 실행의 시작 확인 창과 같은 생김새다 (도메인/시나리오 §8.11 · 실행 §8.16 ②)

import { use말 } from './i18n.js';
import { Modal } from './Modal.js';

interface Props {
  /** `SC-12 가입 흐름` */
  시나리오: string;
  /** `PC` · `모바일 (실제 기기)` */
  디바이스: string;
  env: string;
  onClose: () => void;
  on시작: () => void;
}

export function ScenarioStartConfirm({ 시나리오, 디바이스, env, onClose, on시작 }: Props) {
  const t = use말();
  return (
    <Modal
      제목={t('정식 실행을 시작할까요?')}
      onClose={onClose}
      버튼={
        <>
          {/* 첫 포커스는 취소다 — 열자마자 Enter 한 번에 실행이 걸리지 않게 */}
          <button type="button" className="btn ghost" onClick={onClose} data-first>
            {t('취소')}
          </button>
          <button type="button" className="btn" onClick={on시작}>
            {t('실행 시작')}
          </button>
        </>
      }
    >
      <p className="start-band rec">{t('끝나면 실행 기록 E2E 에 남고 리포트를 만들 수 있습니다')}</p>
      <dl className="start-what">
        <dt>{t('시나리오§이름')}</dt>
        <dd>{시나리오}</dd>
        <dt>{t('디바이스')}</dt>
        <dd>{디바이스}</dd>
        <dt>{t('대상 서버')}</dt>
        <dd>{env}</dd>
      </dl>
      <p className="hint">{t('창을 닫아도 실행은 계속됩니다')}</p>
    </Modal>
  );
}
