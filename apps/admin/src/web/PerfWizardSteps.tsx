// 성능 시나리오 마법사의 위 단계 표시 — 끝낸 단계를 눌러 바로 간다 (도메인/성능 §8.14)

import { use말 } from './i18n.js';

export type 단계 = 1 | 2 | 3 | 4;

export interface 단계줄 {
  번호: 단계;
  이름: string;
  요약?: string;
}

export function PerfWizardSteps({ 단계들, 지금, 끝낸, on고름 }: { 단계들: 단계줄[]; 지금: 단계; 끝낸: number; on고름: (번호: 단계) => void }) {
  const t = use말();
  return (
    <ol className="perf-steps" aria-label={t('시나리오 만들기 단계')}>
      {단계들.map((d) => {
        const 끝났나 = d.번호 <= 끝낸;
        return (
          <li key={d.번호}>
            <button
              type="button"
              className={끝났나 && d.번호 !== 지금 ? 'done' : undefined}
              aria-current={d.번호 === 지금 ? 'step' : undefined}
              disabled={d.번호 !== 지금 && d.번호 > 끝낸 + 1}
              onClick={() => on고름(d.번호)}
            >
              <span className="perf-dot">{d.번호}</span>
              <span>
                {d.이름}
                {끝났나 && d.요약 !== undefined ? (
                  <>
                    <br />
                    <span className="perf-faint">{d.요약}</span>
                  </>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
