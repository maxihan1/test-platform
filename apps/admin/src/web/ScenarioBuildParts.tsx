// E2E 조립 화면의 머리 조각(이름 · 저장 표시 · 디바이스 고르개)과 정식 실행 시작 확인 — ScenarioBuild.tsx 가 300줄을 넘어 떼어 냈다 (도메인/시나리오 §8.11)

import type { Platform } from '@platform/kit';

import { 디바이스글 } from './e2eWindowView.js';
import { use말, use언어 } from './i18n.js';
import { ScenarioStartConfirm } from './ScenarioStartConfirm.js';
import { 빈칸있는단계 } from './scenarioView.js';
import { PLATFORM_LABEL, when } from './ui.js';
import type { useScenarioDraft } from './useScenarioDraft.js';
import type { useScenarioRun } from './useScenarioRun.js';

type 초안 = ReturnType<typeof useScenarioDraft>;

/** 머리 아래 줄 — 이름 칸 · 마지막 저장 · 저장 안 된 변경 */
export function 조립부제({ 초안, 쓰나 }: { 초안: 초안; 쓰나: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const 최신 = 초안.버전들[0];
  return (
    <>
      <input
        type="text"
        className="scn-name-input"
        aria-label={t('시나리오 이름')}
        placeholder={t('시나리오 이름')}
        value={초안.이름}
        readOnly={!쓰나}
        onChange={(e) => {
          if (쓰나) 초안.set이름(e.target.value);
        }}
      />
      {최신 === undefined ? null : (
        <span>
          {t('v{버전} · {이름} 저장 · {시각}', {
            버전: 최신.version,
            이름: 최신.savedByName,
            시각: when(최신.savedAt, 언어),
          })}
        </span>
      )}
      {!초안.바뀜 ? null : <span className="case-tag">{t('저장 안 된 변경 있음')}</span>}
    </>
  );
}

export function 디바이스고르개({ 초안, 쓰나, 디바이스들 }: { 초안: 초안; 쓰나: boolean; 디바이스들: readonly Platform[] }) {
  const t = use말();
  return (
    <select
      aria-label={t('디바이스')}
      value={초안.디바이스}
      disabled={!쓰나 || 디바이스들.length < 2}
      onChange={(e) => 초안.set디바이스(디바이스들.find((p) => p === e.target.value) ?? 초안.디바이스)}
    >
      {디바이스들.map((p) => (
        <option key={p} value={p}>
          {t(PLATFORM_LABEL[p])}
        </option>
      ))}
    </select>
  );
}

/** 정식 실행 시작 확인 — 누르면 저장할 것을 저장하고 실행 창을 띄운다 (점검표 B19) */
export function 조립시작확인({
  id,
  초안,
  정식,
  서버,
  칸오류번호,
  onClose,
}: {
  id: number | null;
  초안: 초안;
  정식: ReturnType<typeof useScenarioRun>;
  서버: string;
  칸오류번호: number | null;
  onClose: () => void;
}) {
  const t = use말();
  const 막는번호 = 칸오류번호 ?? 빈칸있는단계(초안.단계들);
  return (
    <ScenarioStartConfirm
      시나리오={id === null ? 초안.이름 : `SC-${id} ${초안.이름}`.trim()}
      단계수={초안.단계들.length}
      디바이스={디바이스글(t, 초안.디바이스, 정식.위치.값)}
      env={서버}
      onClose={onClose}
      on시작={() => {
        onClose();
        void 정식.실행(서버, 초안.바뀜, 막는번호, () => 초안.저장(막는번호));
      }}
    />
  );
}
