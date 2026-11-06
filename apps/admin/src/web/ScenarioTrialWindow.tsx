// E2E 시험 실행 창 — 케이스 시험 실행과 같은 1180×744 틀에서 도는 중 → 결과로 넘어간다. 도는 중에 닫으면 한 번 묻고 시험을 멈춘다 (도메인/실행 §8.16 ⑥)

import type { ScenarioPart } from '@platform/kit';
import { useState } from 'react';

import type { Platform } from './api.js';
import { 시험이름줄들, 목록줄들 } from './e2eWindowView.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { 경과 } from './RunPickTrialRun.js';
import { scenarioApi } from './scenarioApi.js';
import { 멈춘사유글자 } from './scenarioResultView.js';
import { 오류칠, TrialRow } from './ScenarioTrial.js';
import type { 재료들 } from './scenarioView.js';
import { E2E진행몸, 점수알약 } from './ScenarioWindowParts.js';
import { 장면칸 } from './TrialLive.js';
import { 걸린글 } from './trialView.js';
import { PLATFORM_LABEL } from './ui.js';
import type { 시험상태 } from './useScenarioTrial.js';

export type 창시험 = 시험상태 & { 중단: () => Promise<void> };

interface Props {
  시험: 창시험;
  /** 돌린 때의 단계. 시험이 기억한 것이 있으면 그것을 쓴다 */
  단계들: ScenarioPart[];
  재료: 재료들;
  platform: Platform;
  /** 모바일 시나리오 — 폰을 잡으면 실제 폰 Chrome 이라 칸 이름이 폰 화면이다 */
  모바일웹: boolean;
  on닫기: () => void;
  on다시: () => void;
}

export function ScenarioTrialWindow({ 시험, 단계들, 재료, platform, 모바일웹, on닫기, on다시 }: Props) {
  const t = use말();
  const 언어 = use언어();
  const 돌린단계 = 시험.단계들 ?? 단계들;
  const 도는중 = 시험.단계 === 'running';
  const [묻기, set묻기] = useState<'stop' | 'close' | null>(null);

  // 도는 중 × · Esc 는 한 번 묻고 시험을 멈춘다. 이미 멈추는 중이면 묻지 않고 닫는다
  const 닫기요청 = () => {
    if (도는중 && !시험.중단함) set묻기('close');
    else on닫기();
  };

  return (
    <>
      <Modal
        제목={도는중 ? t('E2E 시험 실행') : t('E2E 시험 실행 결과')}
        틀={도는중 ? '실행 중' : '결과'}
        onClose={닫기요청}
        바깥눌러닫기={false}
        버튼={
          도는중 ? (
            <>
              <button type="button" className="btn ghost trial-stop e2e-foot-l" disabled={시험.중단함} onClick={() => set묻기('stop')}>
                {시험.중단함 ? t('중단하는 중') : t('중단§버튼')}
              </button>
              {시험.시작시각 === null ? null : <경과 시작시각={시험.시작시각} />}
            </>
          ) : (
            <>
              <button type="button" className="btn ghost" onClick={on닫기}>
                {t('닫기')}
              </button>
              <button type="button" className="btn" onClick={on다시}>
                {t('재실행')}
              </button>
            </>
          )
        }
      >
        <p className="trial-band">
          <b>{t('시험 실행')}</b> {t('결과는 이 창에서만 보이고 실행 기록에 남지 않습니다')}
          {/* Android 는 Appium 이라 늦추지 않는다 (러너 §5.2) */}
          {도는중 && platform !== 'android' ? <span className="r">{t('동작마다 1초 천천히')}</span> : null}
        </p>
        {/* 묻기가 끊겨도 창은 남아 다시 묻는다 — 끊긴 까닭은 띠 아래 한 줄 */}
        {도는중 && 시험.오류문장 !== null ? <p className="err">{시험.오류문장}</p> : null}
        {도는중 || 시험.결과 === null ? (
          <E2E진행몸
            줄들={목록줄들(시험이름줄들(돌린단계, 재료, 언어), 시험.지금단계들, 도는중)}
            경과ms={null}
            장면={(크게버튼) => (
              <장면칸
                key={시험.trialId ?? '시작'}
                주소={시험.trialId === null ? null : scenarioApi.trialLive(시험.trialId)}
                도는중={도는중}
                vision={시험.vision}
                폰이름={시험.폰이름}
                폰만={platform === 'android'}
                모바일웹={모바일웹}
                늦춤글={false}
                뼈대
                머리끝={크게버튼}
              />
            )}
          />
        ) : (
          <결과몸 시험={시험} 결과={시험.결과} 단계들={돌린단계} 재료={재료} platform={platform} />
        )}
      </Modal>
      {묻기 === null ? null : (
        <Modal
          // 닫기로 물으면 「닫으면 멈춘다」를 먼저 말한다 — E2E 시험은 닫으면 다시 볼 자리가 없다 (도메인/실행 §3.2 「E2E 시험 실행 창을 닫으면 시험을 멈춘다」)
          제목={묻기 === 'close' ? t('닫으면 시험 실행을 멈춥니다') : t('시험 실행을 중단할까요?')}
          onClose={() => set묻기(null)}
          버튼={
            <>
              <button type="button" className="btn ghost" onClick={() => set묻기(null)} data-first>
                {묻기 === 'close' ? t('계속 보기') : t('계속 실행')}
              </button>
              <button
                type="button"
                className="btn trial-stop-go"
                onClick={() => {
                  void 시험.중단();
                  if (묻기 === 'close') on닫기();
                  set묻기(null);
                }}
              >
                {묻기 === 'close' ? t('멈추고 닫기') : t('중단§버튼')}
              </button>
            </>
          }
        >
          <p>{t('진행 중인 단계는 바로 멈추고 남은 단계는 실행하지 않습니다')}</p>
          <p className="hint">{t('확인하는 동안에도 실행은 계속됩니다')}</p>
        </Modal>
      )}
    </>
  );
}

function 결과몸({ 시험, 결과, 단계들, 재료, platform }: { 시험: 창시험; 결과: NonNullable<시험상태['결과']>; 단계들: ScenarioPart[]; 재료: 재료들; platform: Platform }) {
  const t = use말();
  const 언어 = use언어();
  const 통과 = 결과.parts.filter((p) => p.status === 'PASS').length;
  const 실패 = 결과.parts.filter((p) => p.status === 'FAIL').length;
  return (
    <>
      <div className="trial-sum">
        <점수알약 통과={통과} 실패={실패} 안함={단계들.length - 통과 - 실패} />
        <span className="r">{[t(PLATFORM_LABEL[platform]), 시험.env, t('총 {시간}', { 시간: 걸린글(결과.durationMs, 언어) })].join(' · ')}</span>
      </div>
      {결과.error === undefined ? null : <p className={오류칠(결과.status)}>{멈춘사유글자(결과.error.message, 언어)}</p>}
      <ol className="scn-steps">
        {결과.parts.map((p) => (
          <TrialRow key={p.seq} part={p} 단계={단계들[p.seq - 1]} 재료={재료} trialId={시험.trialId} />
        ))}
      </ol>
    </>
  );
}
