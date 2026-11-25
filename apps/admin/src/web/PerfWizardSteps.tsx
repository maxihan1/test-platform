// 성능 시나리오 마법사의 위 단계 표시와 바닥 단추 — 끝낸 단계를 눌러 바로 간다 (도메인/성능 §8.14)

import { use말 } from './i18n.js';
import { 기다림글자 } from './ui.js';

export type 단계 = 1 | 2 | 3 | 4;

/** 서버를 기다리게 한 단추 — 머리의 임시 저장 · 바닥의 저장 · 실행 · 3단계 안의 AI 추천(자기 단추가 따로 알린다). 누른 단추만 글자가 바뀐다 */
export type 누른곳 = 'draft' | 'save' | 'run' | 'step';

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

export function PerfWizardFoot({ 지금, 쓰나, 하는중, on이전, on다음, on저장, on실행 }: { 지금: 단계; 쓰나: boolean; 하는중: 누른곳 | null; on이전: () => void; on다음: () => void; on저장: () => void; on실행: () => void }) {
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
          <button type="button" className="btn ghost" disabled={하는중 !== null} onClick={on저장}>
            <기다림글자 중={하는중 === 'save'} 평소={t('저장')} 기다림={t('저장하는 중')} />
          </button>
          <button type="button" className="btn" disabled={하는중 !== null} onClick={on실행}>
            <기다림글자 중={하는중 === 'run'} 평소={t('실행')} 기다림={t('시작하는 중')} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
