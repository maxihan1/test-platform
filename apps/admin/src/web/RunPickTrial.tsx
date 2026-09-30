// 여러 건 실행 창의 「테스트 실행」 조각 — 열 주소 칸과 케이스 줄마다 붙는 결과 배지 (도메인/실행 §8.10)

import { use말, use언어 } from './i18n.js';
import { seconds, Verdict } from './ui.js';
import type { 시험줄 } from './useTrialQueue.js';

/** 브라우저를 여는 주소. 대상 서버 주소가 기본이고 사람이 고칠 수 있다. 기록에 안 남는다는 말이 늘 붙는다 */
export function 열주소칸({
  값,
  오류,
  onChange,
}: {
  값: string;
  오류: boolean;
  onChange: (값: string) => void;
}) {
  const t = use말();

  return (
    <div className="mhead trialurl">
      <label htmlFor="pick-trial-url">{t('열 주소')}</label>
      <input id="pick-trial-url" type="text" value={값} onChange={(e) => onChange(e.target.value)} />
      <span className="hint">{t('실행 기록에 남지 않습니다 · 24시간 뒤 사라집니다')}</span>
      {오류 ? <span className="err">{t('열 주소는 http:// 또는 https:// 로 시작해야 합니다')}</span> : null}
    </div>
  );
}

/** 케이스 줄 오른쪽 끝의 한 칸. 아직 안 돌렸으면 아무것도 안 그린다 */
export function 시험배지({ 줄 }: { 줄: 시험줄 | undefined }) {
  const t = use말();
  const 언어 = use언어();
  if (줄 === undefined) return null;

  if (줄.종류 === 'wait') return <span className="trial-badge dim">{t('대기')}</span>;
  if (줄.종류 === 'run') return <span className="trial-badge dim">{t('실행 중')}</span>;
  if (줄.종류 === 'notice') return <span className="trial-badge err">{줄.글}</span>;

  return (
    <span className="trial-badge">
      <Verdict status={줄.결과.status} />
      <span className="dur">{seconds(줄.결과.durationMs, 언어)}</span>
      {/* 러너에 못 닿은 사정도 서버가 준 문장을 그대로 낸다 */}
      {줄.결과.error === undefined ? null : <span className="err">{줄.결과.error.message}</span>}
    </span>
  );
}
