// 결과 화면 맨 위 요약 띠 — 통과율 도넛 · 실패 수 · 판정별 보기 · 직전 실행 대비 (도메인/실행 §8.3)

import type { ItemStatus, RunCounts, RunInsights } from './api.js';
import { 도넛조각 } from './dashboardView.js';
import { use말, use언어 } from './i18n.js';
import { 그중미확정글 } from './unconfirmed.js';

const 칸수 = (insights: RunInsights, 판정: '새로깨짐' | '계속깨짐' | '고쳐짐'): number =>
  insights.케이스들.filter((c) => c.판정 === 판정).length;

/**
 * 그리기만 한다. 견줌 자료는 부르는 쪽이 들고 온다 — null 이면 아직 못 받았거나 견줄 앞이 없는 것이라 대비 칸을 통째로 뺀다.
 * 통과율은 미확정까지 모든 항목을 센다. 미확정은 「그중 N건」 한 줄로만 알린다 (§3.2).
 */
export function RunSummary({
  counts,
  insights,
  판정,
  on판정,
}: {
  counts: RunCounts;
  insights: RunInsights | null;
  판정: ItemStatus | 'ALL';
  on판정: (v: ItemStatus | 'ALL') => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const 전체 = counts.pass + counts.fail + counts.na;
  const 조각들 = 도넛조각({ pass: counts.pass, fail: counts.fail, notRun: counts.na });
  const 미확정 = 그중미확정글(counts, 언어);
  const 앞 = insights?.previous ?? null;

  const 칸들 = [
    { 값: 'ALL', 종류: 'a', 이름: t('전체'), 수: 전체 },
    { 값: 'PASS', 종류: 'p', 이름: t('통과'), 수: counts.pass },
    { 값: 'FAIL', 종류: 'f', 이름: t('실패'), 수: counts.fail },
    { 값: 'NA', 종류: 'n', 이름: t('미실행'), 수: counts.na },
  ] as const;

  return (
    <section className="rs">
      {/* 한 단 · 두 단 전환은 이 안쪽 격자가 받는다 — 컨테이너 쿼리는 자기 자신이 아니라 조상 그릇의 폭만 보기 때문에
          그릇인 `.rs` 가 직접 격자이면 바깥 그릇 폭으로 판정된다 */}
      <div className="rs-grid">
        <div className="rs-rate">
          <div className="rs-donut">
            <svg viewBox="0 0 152 152" aria-hidden="true" focusable="false">
              <g transform="rotate(-90 76 76)">
                <circle className="rs-track" cx="76" cy="76" r="68" />
                {/* 조각 셋을 늘 그린다 — 길이 0 인 조각이 나중에 생겨도 그 조각만 다시 그려지지 않게 한다 */}
                {(['p', 'f', 'n'] as const).map((종류) => {
                  const 조각 = 조각들.find((것) => 것.종류 === 종류);
                  const 길이 = 조각?.길이 ?? 0;
                  return (
                    <circle
                      key={종류}
                      className={`rs-seg ${종류}`}
                      cx="76"
                      cy="76"
                      r="68"
                      pathLength={100}
                      strokeDasharray={`${길이} ${100 - 길이}`}
                      strokeDashoffset={-(조각?.시작 ?? 0)}
                    />
                  );
                })}
              </g>
            </svg>
            <div className="rs-donut-center">
              <span className="rs-big num">
                {전체 === 0 ? (
                  '—'
                ) : (
                  <>
                    {((counts.pass / 전체) * 100).toFixed(1)}
                    <span className="rs-pct">%</span>
                  </>
                )}
              </span>
              <span className="rs-axis">{t('통과율')}</span>
            </div>
          </div>
          <div className="rs-lines">
            {counts.fail > 0 ? (
              <span className="verdict v-fail rs-fails">{t('실패 {수}건', { 수: counts.fail })}</span>
            ) : (
              <span className="rs-fails none">{t('실패 {수}건', { 수: 0 })}</span>
            )}
            <span className="rs-of">
              {전체 === 0
                ? t('항목 없음')
                : t('항목 {전체}건 중 {통과}건 통과', { 전체, 통과: counts.pass })}
            </span>
            {미확정 === '' ? null : <span className="rs-axis">{미확정}</span>}
          </div>
        </div>

        <div className="rs-filter">
          <span className="rs-axis">{t('판정별 보기 · 항목 수')}</span>
          <div role="group" aria-label={t('판정별 보기 · 항목 수')} className="rs-fbtns">
            {칸들.map((칸) => (
              <button
                key={칸.값}
                type="button"
                className="rs-fbtn"
                aria-pressed={판정 === 칸.값}
                onClick={() => on판정(칸.값)}
              >
                <span className={`rs-k ${칸.종류}`}>{칸.이름}</span>
                <span className="rs-n num">{칸.수}</span>
              </button>
            ))}
          </div>
        </div>

        {insights === null || 앞 === null ? null : (
          <div className="rs-diff">
            <span className="rs-axis">{t('직전 실행 RUN {번호} 대비', { 번호: 앞.runId })}</span>
            <div className="rs-stats">
              <div className="rs-stat">
                <span className="rs-k f">{t('신규 실패')}</span>
                <span className="rs-n num">{칸수(insights, '새로깨짐')}</span>
              </div>
              <div className="rs-stat">
                <span className="rs-k">{t('연속 실패')}</span>
                <span className="rs-n num">{칸수(insights, '계속깨짐')}</span>
              </div>
              <div className="rs-stat">
                <span className="rs-k p">{t('해결')}</span>
                <span className="rs-n num">{칸수(insights, '고쳐짐')}</span>
              </div>
            </div>
            {/* 주소를 바꿨다는 사실은 접거나 숨기지 않는다 — 다른 서버에서 돈 결과를 같은 조건으로 읽게 된다 (SPEC §6) */}
            {!insights.주소바뀜 ? null : (
              <span className="rs-note na">{t('직전 실행은 다른 주소에서 실행됐습니다')}</span>
            )}
            {insights.빠진건수 === 0 ? null : (
              <span className="rs-note">
                {t('직전 실행에 있었으나 이번에 실행되지 않은 케이스 {건수}건', { 건수: insights.빠진건수 })}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
