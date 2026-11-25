// 기기 성능 측정 시작의 「측정 항목」 — 지표 체크칸 · 수집 간격 · 화면 녹화 (도메인/성능 §8.14 「기기 성능」). PerfDeviceStart.tsx 가 300줄에 닿아 떼어 냈다

import { 오류묶음, 칸오류 } from './FieldError.js';
import { use말 } from './i18n.js';
import type { 측정지표 } from './perfDeviceApi.js';
import { 측정항목 } from './perfDeviceView.js';

export function PerfDeviceMetrics({
  항목,
  on항목,
  간격,
  on간격,
  녹화,
  on녹화,
  쓰나,
  사유,
}: {
  항목: 측정지표[];
  on항목: (항목: 측정지표[]) => void;
  간격: 1 | 2 | 5;
  on간격: (간격: 1 | 2 | 5) => void;
  녹화: boolean;
  on녹화: (녹화: boolean) => void;
  쓰나: boolean;
  /** 「측정 시작」을 이 칸이 막았을 때의 까닭 */
  사유: string | null;
}) {
  const t = use말();
  return (
    <section className="perf-panel" aria-labelledby="pd-k">
      <h2 id="pd-k">{t('측정 항목')}</h2>
      <div className="pd-checks" {...오류묶음('pd-metrics-err', 사유)}>
        {측정항목.map(([m, 이름]) => (
          <label key={m}>
            <input type="checkbox" checked={항목.includes(m)} disabled={!쓰나} onChange={() => on항목(항목.includes(m) ? 항목.filter((x) => x !== m) : [...항목, m])} />
            {t(이름)}
          </label>
        ))}
      </div>
      <칸오류 id="pd-metrics-err" 사유={사유} />
      <div className="perf-row">
        <label className="perf-field">
          {t('수집 간격')}
          <select value={간격} disabled={!쓰나} onChange={(e) => on간격(Number(e.target.value) as 1 | 2 | 5)}>
            {[1, 2, 5].map((초) => (
              <option key={초} value={초}>
                {t('{수}초', { 수: 초 })}
              </option>
            ))}
          </select>
        </label>
        <label className="perf-row">
          <input type="checkbox" checked={녹화} disabled={!쓰나} onChange={() => on녹화(!녹화)} />
          {t('화면 녹화')}
          <span className="perf-faint">{t('FPS가 떨어진 장면을 녹화 화면으로 확인')}</span>
        </label>
      </div>
      <span className="perf-faint">{t('앱 실행 시간은 측정을 시작할 때 디바이스마다 한 번 잽니다')}</span>
    </section>
  );
}
