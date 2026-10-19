// E2E 목록 줄의 「실행 불가」 · 「확인 필요」 까닭 — 목록 응답에는 참 · 거짓만 있어 그 줄의 상세 점검을 읽어 적는다 (도메인/시나리오 §8.11 「목록」)

import { use말, use언어 } from './i18n.js';
import { scenarioApi, type ScenarioDetail, type ScenarioRow } from './scenarioApi.js';
import { message, useAsync } from './ui.js';

type 말 = ReturnType<typeof use말>;
type RowPart = Pick<ScenarioRow, 'runnable'>;
type DetailPart = Pick<ScenarioDetail, 'parts' | 'checks'>;

/** 상세 점검 → 사람 말. 비활성 케이스가 없는데 못 돈다면 남는 까닭은 제한 시간 합 · 크기뿐이다 (도메인/시나리오 §7 「실행 요청」) */
export function 까닭글들(줄: RowPart, 상세: DetailPart, t: 말): string[] {
  const 글들 = 상세.checks.map((c) => {
    const 단계 = 상세.parts[c.seq - 1];
    const tcId = 단계?.kind === 'case' ? 단계.tcId : '';
    return c.reason === 'CASE_INACTIVE'
      ? t('{번호}번 단계 케이스가 비활성입니다 · {tcId}', { 번호: c.seq, tcId })
      : t('{번호}번 단계에서 건너뛰던 사전 단계가 케이스에서 없어졌습니다', { 번호: c.seq });
  });
  if (!줄.runnable && !상세.checks.some((c) => c.reason === 'CASE_INACTIVE')) {
    글들.push(t('단계 제한 시간 합이 60분을 넘거나 시나리오가 너무 커서 실행할 수 없습니다'));
  }
  return 글들;
}

export function ScenarioWhy({ 줄 }: { 줄: ScenarioRow }) {
  const t = use말();
  const 언어 = use언어();
  const 상세 = useAsync(() => scenarioApi.detail(줄.id), [줄.id, 줄.version]);
  if (상세.error !== null) return <small className="scn-why">{message(상세.error, 언어)}</small>;
  if (상세.data === null) return null;
  return (
    <>
      {까닭글들(줄, 상세.data, t).map((글) => (
        <small key={글} className="scn-why">
          {글}
        </small>
      ))}
    </>
  );
}
