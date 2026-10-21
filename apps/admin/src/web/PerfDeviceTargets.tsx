// 기기 성능 측정 시작의 「성능 목표」 표 — 지표 · 목표 · 근거 · 삭제. 부등호는 지표에 매여 있어 고르지 않는다 (도메인/성능 §7 「기기 성능 목표 한 줄」)

import { use말 } from './i18n.js';
import type { 기기목표, 기기지표 } from './perfDeviceApi.js';
import { 지표차례, 지표표 } from './perfDeviceView.js';

/** 칸에 적는 단위 — 앱 실행 시간은 초로 적고 ms 로 보낸다 */
const 단위: Record<기기지표, { 글: string; 배: number }> = {
  AVG_FPS: { 글: 'FPS', 배: 1 },
  LOW1_FPS: { 글: 'FPS', 배: 1 },
  MAX_TEMP: { 글: '도', 배: 1 },
  MAX_MEM: { 글: 'MB', 배: 1 },
  LAUNCH_MS: { 글: '초', 배: 1000 },
};

const 근거글자: Record<기기목표['source'], string> = { PRD: '기획서', AI: 'AI 추천', MANUAL: '직접 입력' };

export function PerfDeviceTargets({ 목표들, 고침, 쓰나 }: { 목표들: 기기목표[]; 고침: (목표들: 기기목표[]) => void; 쓰나: boolean }) {
  const t = use말();
  const 남은 = 지표차례.filter((m) => !목표들.some((목표) => 목표.metric === m));
  const 바꾸기 = (i: number, 줄: 기기목표) => 고침(목표들.map((x, j) => (j === i ? 줄 : x)));

  return (
    <section className="perf-panel" aria-labelledby="pd-g">
      <h2 id="pd-g">{t('성능 목표')}</h2>
      {목표들.length === 0 ? <span className="perf-faint">{t('정한 목표가 없으면 판정 없이 숫자만 남습니다')}</span> : null}
      <div className="perf-table-box">
        <table className="perf-table">
          <thead>
            <tr>
              <th>{t('지표')}</th>
              <th>{t('목표')}</th>
              <th>{t('근거')}</th>
              <th aria-label={t('삭제')} />
            </tr>
          </thead>
          <tbody>
            {목표들.map((목표, i) => {
              const 이름 = t(지표표[목표.metric].이름);
              const { 글, 배 } = 단위[목표.metric];
              return (
                <tr key={목표.metric}>
                  <td>
                    <select
                      value={목표.metric}
                      disabled={!쓰나}
                      aria-label={t('{이름} 지표', { 이름 })}
                      onChange={(e) => {
                        const m = e.target.value as 기기지표;
                        바꾸기(i, { ...목표, metric: m, op: 지표표[m].op, source: 'MANUAL' });
                      }}
                    >
                      {[목표.metric, ...남은].map((m) => (
                        <option key={m} value={m}>
                          {t(지표표[m].이름)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <label className="pd-goal mono">
                      {목표.op === '>=' ? '≥' : '≤'}
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={목표.value / 배}
                        disabled={!쓰나}
                        aria-label={t('{이름} 목표', { 이름 })}
                        onChange={(e) => 바꾸기(i, { ...목표, value: Math.max(0, Number(e.target.value)) * 배, source: 'MANUAL' })}
                      />
                      {t(글)}
                    </label>
                  </td>
                  <td>
                    <span className={목표.source === 'MANUAL' ? 'perf-tag' : 'perf-ai'}>{t(근거글자[목표.source])}</span>
                  </td>
                  <td>
                    {쓰나 ? (
                      <button type="button" className="btn ghost small" aria-label={t('{이름} 목표 삭제', { 이름 })} onClick={() => 고침(목표들.filter((_, j) => j !== i))}>
                        {t('삭제')}
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {쓰나 && 남은.length > 0 ? (
        <div>
          <button
            type="button"
            className="btn ghost small"
            onClick={() => {
              const m = 남은[0]!;
              고침([...목표들, { metric: m, op: 지표표[m].op, value: 0, source: 'MANUAL' }]);
            }}
          >
            {t('목표 추가')}
          </button>
        </div>
      ) : null}
    </section>
  );
}
