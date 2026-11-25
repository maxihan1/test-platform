// 성능 실행 · 측정 · 녹화를 시작하기 전에 한 번 묻는 작은 확인 상자 — 케이스 · E2E 시작 확인과 같은 생김새다 (도메인/성능 §8.14 「시작 확인」)

import { Fragment } from 'react';

import { use말 } from './i18n.js';
import { Modal } from './Modal.js';
import type { Stage, TestType } from './perfApi.js';
import type { 기기설정 } from './perfDeviceApi.js';
import { 조작글 } from './perfDeviceView.js';
import type { 말 } from './perfRunView.js';
import { 유형글자 } from './PerfStepLoad.js';
import { 총초, 최대목표 } from './perfView.js';

export interface 확인줄 {
  이름: string;
  값: string;
}

/** 부하 마법사 4단계의 실행 요약과 시작 확인이 같은 줄을 쓴다. 예상 시간은 스모크 테스트 몫 1분을 더한 것이다 */
export function 부하확인줄(t: 말, 값: { 시나리오: string; 유형: TestType; stages: readonly Stage[]; 단위: string; 목표수: number; env: string }): 확인줄[] {
  const 분 = Math.ceil(총초(값.stages) / 60);
  return [
    { 이름: t('시나리오'), 값: 값.시나리오 },
    { 이름: t('테스트 유형'), 값: t(유형글자[값.유형].이름) },
    { 이름: t('부하'), 값: t('최대 {수}{단위}, 전체 {분}분', { 수: 최대목표(값.stages).toLocaleString(), 단위: 값.단위, 분 }) },
    { 이름: t('성능 목표'), 값: t('{수}개', { 수: 값.목표수 }) },
    { 이름: t('대상 서버'), 값: 값.env === '' ? t('선택 안 함') : 값.env },
    { 이름: t('예상 소요 시간'), 값: t('최대 {분}분', { 분: 분 + 1 }) },
  ];
}

interface Props {
  종류: 'LOAD' | 'MEASURE' | 'RECORD';
  줄들: 확인줄[];
  /** 맨 아래 한 줄 — 시작하면 무엇이 매이는지 · 어디서 중단하는지 */
  안내: string;
  onClose: () => void;
  on시작: () => void;
}

/** 앱 · 게임 「측정 시작」과 결과의 「다시 실행」이 같은 상자를 쓴다 */
export function 기기시작확인({
  값,
  onClose,
  on시작,
}: {
  값: Pick<기기설정, 'drive' | 'caseIds' | 'durationSec' | 'repeat' | 'package'> & { 자동수: number; 디바이스들: string[]; env: string };
  onClose: () => void;
  on시작: () => void;
}) {
  const t = use말();
  return (
    <PerfStartConfirm
      종류="MEASURE"
      줄들={[
        { 이름: t('조작 방식'), 값: [조작글(값, t), ...(값.자동수 === 0 ? [] : [t('자동 포함 {수}건', { 수: 값.자동수 })])].join(' · ') },
        값.drive === 'MANUAL' ? { 이름: t('측정 시간'), 값: t('{수}분', { 수: Math.round(값.durationSec / 60) }) } : { 이름: t('반복'), 값: t('{수}회', { 수: 값.repeat }) },
        { 이름: t('디바이스'), 값: 값.디바이스들.join(', ') },
        { 이름: t('앱 패키지 이름'), 값: 값.package },
        { 이름: t('대상 서버'), 값: 값.env },
      ]}
      안내={t('완료될 때까지 디바이스를 할당합니다. 실행 화면에서 중단할 수 있습니다')}
      onClose={onClose}
      on시작={on시작}
    />
  );
}

export function PerfStartConfirm({ 종류, 줄들, 안내, onClose, on시작 }: Props) {
  const t = use말();
  return (
    <Modal
      제목={종류 === 'LOAD' ? t('부하 테스트를 시작할까요?') : 종류 === 'MEASURE' ? t('성능 측정을 시작할까요?') : t('녹화를 시작할까요?')}
      onClose={onClose}
      버튼={
        <>
          {/* 첫 포커스는 취소다 — 열자마자 Enter 한 번에 실행이 걸리지 않게 */}
          <button type="button" className="btn ghost" onClick={onClose} data-first>
            {t('취소')}
          </button>
          <button type="button" className="btn" onClick={on시작}>
            {종류 === 'LOAD' ? t('실행 시작') : 종류 === 'MEASURE' ? t('측정 시작') : t('녹화 시작')}
          </button>
        </>
      }
    >
      {종류 === 'RECORD' ? (
        <p className="start-band">
          <b>{t('실행 기록 · 리포트에 남지 않습니다')}</b>
        </p>
      ) : (
        <p className="start-band rec">{t('완료되면 실행 기록 성능에 남습니다')}</p>
      )}
      <dl className="start-what">
        {줄들.map((줄) => (
          <Fragment key={줄.이름}>
            <dt>{줄.이름}</dt>
            <dd>{줄.값}</dd>
          </Fragment>
        ))}
      </dl>
      <p className="hint">{안내}</p>
    </Modal>
  );
}
