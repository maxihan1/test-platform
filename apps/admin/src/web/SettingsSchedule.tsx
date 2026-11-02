// 설정 > 서비스의 「정기 실행」 구획 안 칸 — 매일 정한 시각에 이 서비스의 스크립트를 한 번 돌린다 (도메인/인증 §8.8 · 공통/6-인프라 §9.2)

import type { ScheduleSetting } from './api.js';
import { 짧은시각 } from './dashboardView.js';
import { use말, use언어 } from './i18n.js';
import { 처음대상서버 } from './settingsView.js';

export function ScheduleFields({
  값,
  저장된,
  바꾼다,
  대상서버들,
  마지막,
}: {
  값: ScheduleSetting | null;
  /** 서버에 저장돼 있는 것. 끄고 다시 켜면 이것으로 돌아온다 — 처음 값으로 덮으면 시각 · 시간대 · 대상 서버가 말없이 바뀐다 */
  저장된: ScheduleSetting | null;
  바꾼다: (값: ScheduleSetting | null) => void;
  /** 지금 적힌 대상 서버 줄의 이름들. 저장 전의 것이라 방금 더한 줄도 고를 수 있다 */
  대상서버들: string[];
  마지막: { at: string; runIds: number[] } | null;
}) {
  const t = use말();
  const 언어 = use언어();
  // 처음 켤 때 이 브라우저의 시간대로 정한다. 이미 켜 둔 것은 저장된 시간대 그대로다 — 다른 시간대 사람이 고쳐도 시각이 밀리지 않게
  const 켠다 = () =>
    바꾼다(저장된 ?? { at: '03:00', tz: Intl.DateTimeFormat().resolvedOptions().timeZone, env: 처음대상서버(대상서버들) });
  return (
    <>
      <label className="check-inline" htmlFor="sf-sched-on">
        <input id="sf-sched-on" type="checkbox" checked={값 !== null} onChange={(e) => (e.target.checked ? 켠다() : 바꾼다(null))} />
        {t('매일 돌리기')}
      </label>
      {값 === null ? null : (
        <>
          <div className="field">
            <label htmlFor="sf-sched-at">{t('시각')}</label>
            <div>
              <input id="sf-sched-at" className="narrow" type="time" value={값.at} onChange={(e) => 바꾼다({ ...값, at: e.target.value })} />
              <div className="hint">{t('{시간대} 기준', { 시간대: 값.tz })}</div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="sf-sched-env">{t('대상 서버')}</label>
            {/* 고른 것이 목록에서 사라졌으면 그대로 보여 준다 — 조용히 첫 줄로 바뀌면 다른 서버를 두드린다. 저장은 못보내는이유가 막는다 */}
            <select id="sf-sched-env" className="narrow" value={값.env} onChange={(e) => 바꾼다({ ...값, env: e.target.value })}>
              {대상서버들.includes(값.env) ? null : <option value={값.env}>{값.env}</option>}
              {대상서버들.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>
          <div className="hint">
            {t('정한 시각부터 1시간 안에 사용 중인 스크립트를 UI·기능 테스트로 한 번씩 실행하고 Slack 웹훅이 있으면 결과를 알립니다. 그 시간에 서버가 꺼져 있으면 그날은 건너뜁니다')}
          </div>
        </>
      )}
      <div className="field">
        <span className="field-label">{t('마지막 정기 실행')}</span>
        {마지막 === null ? (
          <span className="val">{t('아직 실행한 적이 없습니다')}</span>
        ) : (
          <span className="val">
            {짧은시각(마지막.at, 언어)}
            {마지막.runIds.map((runId) => (
              <a key={runId} className="sched-run" href={`#/runs/${String(runId)}`}>
                RUN {runId}
              </a>
            ))}
          </span>
        )}
      </div>
    </>
  );
}
