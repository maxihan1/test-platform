// E2E 정식 실행을 걸기 전에 한 번 묻는 작은 확인 상자 — 케이스 실행의 시작 확인 창과 같은 생김새다 (도메인/시나리오 §8.11 · 실행 §8.16 ②)

import { use말 } from './i18n.js';
import { Modal } from './Modal.js';

interface Props {
  /** `SC-12 가입 흐름` */
  시나리오: string;
  /** 단계 수 — 이름 곁에 `· 8단계` 로 붙는다 (도메인/시나리오 §8.11 「이름표 줄」) */
  단계수: number;
  /** `PC` · `모바일 (실제 기기)` */
  디바이스: string;
  env: string;
  /** 시험 실행이면 기록이 안 남는다는 띠와 「시험 실행 시작」 단추다. `늦춤` 은 동작마다 1초 늦추는 디바이스인지 (Android 는 Appium 이라 아니다) */
  시험?: { 늦춤: boolean };
  onClose: () => void;
  on시작: () => void;
}

export function ScenarioStartConfirm({ 시나리오, 단계수, 디바이스, env, 시험, onClose, on시작 }: Props) {
  const t = use말();
  return (
    <Modal
      제목={시험 ? t('시험 실행을 시작할까요?') : t('정식 실행을 시작할까요?')}
      onClose={onClose}
      버튼={
        <>
          {/* 첫 포커스는 취소다 — 열자마자 Enter 한 번에 실행이 걸리지 않게 */}
          <button type="button" className="btn ghost" onClick={onClose} data-first>
            {t('취소')}
          </button>
          <button type="button" className="btn" onClick={on시작}>
            {시험 ? t('시험 실행 시작') : t('실행 시작')}
          </button>
        </>
      }
    >
      {시험 ? (
        <p className="start-band">
          {t('결과는 이 창에서만 보이고')} <b>{t('실행 기록 · 리포트에 남지 않습니다')}</b>
        </p>
      ) : (
        <p className="start-band rec">{t('완료되면 실행 기록 E2E 에 남고 리포트를 만들 수 있습니다')}</p>
      )}
      <dl className="start-what">
        <dt>{t('시나리오§이름')}</dt>
        <dd>
          {시나리오} · {t('{수}단계', { 수: 단계수 })}
        </dd>
        <dt>{t('디바이스')}</dt>
        <dd>{디바이스}</dd>
        <dt>{t('대상 서버')}</dt>
        <dd>{env}</dd>
      </dl>
      <p className="hint">
        {시험
          ? 시험.늦춤
            ? t('동작마다 1초씩 천천히 실행하고, 실행 화면을 실시간으로 보여 줍니다')
            : t('실행 화면을 실시간으로 보여 줍니다')
          : t('창을 닫아도 실행은 계속됩니다')}
      </p>
    </Modal>
  );
}
