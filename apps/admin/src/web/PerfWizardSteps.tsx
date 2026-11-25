// 성능 시나리오 마법사의 위 단계 표시와 바닥 단추 — 끝낸 단계를 눌러 바로 간다 (도메인/성능 §8.14)

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

export function PerfWizardFoot({ 지금, 쓰나, 하는중, on이전, on다음, on저장, on실행 }: { 지금: 단계; 쓰나: boolean; 하는중: boolean; on이전: () => void; on다음: () => void; on저장: () => void; on실행: () => void }) {
  const t = use말();
  return (
    <div className="perf-foot">
      {지금 === 1 ? (
        <a className="btn ghost" href="#/perf/scenarios">
          {t('목록으로')}
        </a>
      ) : (
        <button type="button" className="btn ghost" onClick={on이전}>
          {t('이전')}
        </button>
      )}
      {지금 < 4 ? (
        <button type="button" className="btn" onClick={on다음}>
          {t('다음')}
        </button>
      ) : 쓰나 ? (
        <div className="perf-row">
          <button type="button" className="btn ghost" disabled={하는중} onClick={on저장}>
            {t('저장')}
          </button>
          <button type="button" className="btn" disabled={하는중} onClick={on실행}>
            {t('실행')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
