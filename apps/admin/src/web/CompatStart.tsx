// 호환성 세트 실행 — 시작 확인 창(대상 서버 · 디바이스 · 케이스 수 · 예상 시간)과 누른 뒤의 실행 창 (도메인/호환성 §8.17 ① · ② · ③)

import { useState } from 'react';

import { ApiError, type EnvRow } from './api.js';
import { compatApi } from './compatApi.js';
import { CompatRunWindow } from './CompatRunWindow.js';
import { t as 번역, use말, use언어 } from './i18n.js';
import { 고른서버를적는다, 마지막서버 } from './layout.js';
import { Modal } from './Modal.js';
import { Failed, Loading, message, useAsync } from './ui.js';

/**
 * @param on시작 실행을 세운 뒤 — 세트 목록이 최근 실행 칸을 새로 읽는다
 */
export function CompatStart({ setId, service, envs, 닫기, on시작 }: { setId: number; service: string; envs: readonly EnvRow[]; 닫기: () => void; on시작?: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const 세트 = useAsync(() => compatApi.set(setId), [setId]);
  const [하는중, set하는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const [runId, setRunId] = useState<number | null>(null);
  const [env, setEnv] = useState(() => 마지막서버(service, envs));

  if (runId !== null) return <CompatRunWindow runId={runId} service={service} 닫기={닫기} />;

  async function 시작() {
    set하는중(true);
    set오류(null);
    try {
      const { runId: 새번호 } = await compatApi.start(setId, env);
      고른서버를적는다(service, env);
      on시작?.();
      setRunId(새번호);
    } catch (err) {
      // 실행의 NO_DEVICE 는 「고르세요」가 아니라 세트의 디바이스가 팜에 없다는 뜻이다 (§7 「실행」)
      set오류(err instanceof ApiError && err.code === 'NO_DEVICE' ? 번역('세트의 디바이스가 Device VISION 에 하나도 없습니다. 세트에서 디바이스를 다시 선택합니다', 언어) : message(err, 언어));
    } finally {
      set하는중(false);
    }
  }

  const 상세 = 세트.data;
  const 자동 = new Set((상세?.auto ?? []).map((a) => a.tcId));
  const 케이스수 = 상세 === null ? 0 : 상세.auto.length + 상세.addedCases.filter((c) => !자동.has(c)).length;

  return (
    <Modal
      제목={t('호환성 실행')}
      onClose={닫기}
      // 시작 확인이 실행 창 한 틀의 준비 단계다 — 누르면 같은 크기의 창이 실행 중으로 넘어간다 (실행 §8.16 「틀」 · 시안 ③ 머리)
      틀="준비"
      바깥눌러닫기={false}
      버튼={
        <>
          <button type="button" className="btn ghost" onClick={닫기}>
            {t('취소')}
          </button>
          <button type="button" className="btn" disabled={상세 === null || env === '' || 하는중} onClick={() => void 시작()}>
            {하는중 ? t('실행을 만드는 중') : t('실행')}
          </button>
        </>
      }
    >
      {세트.error !== null ? (
        <Failed error={세트.error} />
      ) : 상세 === null ? (
        <Loading />
      ) : (
        <div className="cr-start">
          <p className="cr-start-name">{상세.name}</p>
          <label className="cr-field">
            <span>{t('대상 서버')}</span>
            {envs.length === 0 ? (
              <span className="compat-faint">{t('설정에서 대상 서버를 먼저 넣습니다')}</span>
            ) : (
              <select value={env} onChange={(e) => setEnv(e.target.value)}>
                <option value="">{t('선택하세요')}</option>
                {envs.map((e) => (
                  <option key={e.env} value={e.env}>
                    {e.env}
                  </option>
                ))}
              </select>
            )}
          </label>
          <dl className="cr-facts">
            <dt>{t('디바이스')}</dt>
            <dd>{t('{수}대', { 수: 상세.devices.length })}</dd>
            <dt>{t('케이스')}</dt>
            <dd>
              {t('{수}건', { 수: 케이스수 })} <span className="compat-faint">{t('실행할 때 자동 선택을 다시 계산합니다')}</span>
            </dd>
            <dt>{t('예상 소요 시간')}</dt>
            <dd>{t('테스트 약 {분}분 · AI 점검 완료까지 약 {점검}분 추가', { 분: 상세.estimate.testMinutes, 점검: 상세.estimate.checkMinutes })}</dd>
          </dl>
          <p className="compat-faint">{t('순차 실행이라 대기 중인 디바이스는 다른 테스트에 쓸 수 있습니다')}</p>
          {오류 === null ? null : (
            <p className="compat-err" role="alert">
              {오류}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
