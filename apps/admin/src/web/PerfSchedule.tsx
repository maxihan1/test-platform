// 성능 시나리오의 정기 실행 창 — 매일 정한 시각에 정한 대상 서버로 돈다. 켜고 끄는 것은 admin 만이다 (도메인/성능 §3.9 「실행 · 결과」)

import { useState } from 'react';

import type { EnvRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { perfApi, type 정기실행 } from './perfApi.js';
import { message } from './ui.js';

export function PerfSchedule({ scenarioId, envs, 지금, 바뀜, 닫기 }: { scenarioId: number; envs: EnvRow[]; 지금: 정기실행 | null; 바뀜: (값: 정기실행 | null) => void; 닫기: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [시각, set시각] = useState(지금?.at ?? '03:00');
  const [서버, set서버] = useState(지금?.env ?? '');
  const [하는중, set하는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);

  async function 보내기(값: 정기실행 | null) {
    set하는중(true);
    set오류(null);
    try {
      const { schedule } = await perfApi.setSchedule(scenarioId, 값);
      바뀜(schedule);
      닫기();
    } catch (err) {
      // 서버가 준 까닭(마법사 4단계를 저장하지 않았다 등)을 그대로 보인다
      set오류(message(err, 언어));
    } finally {
      set하는중(false);
    }
  }

  function 켜기() {
    if (!/^\d{2}:\d{2}$/.test(시각) || 서버 === '') {
      set오류(t('시각과 대상 서버를 골라 주세요'));
      return;
    }
    // 시간대는 브라우저 것을 보낸다 — 「매일 03:00」이 사람이 있는 곳의 03:00 이 되게
    void 보내기({ at: 시각, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, env: 서버 });
  }

  return (
    <Modal
      제목={t('정기 실행')}
      onClose={닫기}
      버튼={
        <>
          <button type="button" className="btn ghost" onClick={닫기}>
            {t('취소')}
          </button>
          {지금 === null ? null : (
            <button type="button" className="btn ghost" disabled={하는중} onClick={() => void 보내기(null)}>
              {t('끄기')}
            </button>
          )}
          <button type="button" className="btn" disabled={하는중} onClick={켜기}>
            {t('켜기')}
          </button>
        </>
      }
    >
      <div className="perf-fields">
        <label className="perf-field">
          {t('시각')}
          <input type="time" value={시각} onChange={(e) => set시각(e.target.value)} />
        </label>
        <label className="perf-field">
          {t('대상 서버')}
          <select value={서버} onChange={(e) => set서버(e.target.value)}>
            <option value="">{t('고르기')}</option>
            {envs.map((it) => (
              <option key={it.env} value={it.env} disabled={it.isProd === true}>
                {it.isProd === true ? t('{서버} · 부하 테스트 불가', { 서버: it.env }) : it.env}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="perf-faint">{t('매일 이 시각에 이 시나리오를 저장된 설정 그대로 돌립니다')}</p>
      {오류 === null ? null : <p className="perf-err" role="alert">{오류}</p>}
    </Modal>
  );
}
