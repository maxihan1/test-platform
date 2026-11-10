// 대시보드 맨 위 다섯 칸과 굴리는 숫자 — PRD · 테스트 케이스 · 최근 실행 결과 · E2E · 성능 (도메인/리포팅 §8.12 「프로젝트 요약」)

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { use말 } from './i18n.js';
import { 아이콘, type 아이콘이름 } from './icons.js';

type 요약 = 대시보드응답['project'];
type 셈 = { pass: number; fail: number; notRun: number };

/** 천 단위 쉼표. 언어마다 다른 꼴이면 같은 숫자가 다르게 굴러 「1.234」로 읽힌다 */
export const 수글 = (n: number): string => n.toLocaleString('en-US');
/** 소수 한 자리에서 내린다 — 덜 덮었는데(99.96%) 「100.0」으로 읽히지 않게 */
export const 퍼센트 = (분자: number, 분모: number): string | null => (분모 === 0 ? null : (Math.floor((분자 * 1000) / 분모) / 10).toFixed(1));
export const 합 = (c: 셈): number => c.pass + c.fail + c.notRun;
export const 더하기 = (셈들: 셈[]): 셈 =>
  셈들.reduce((a, b) => ({ pass: a.pass + b.pass, fail: a.fail + b.fail, notRun: a.notRun + b.notRun }), { pass: 0, fail: 0, notRun: 0 });

/** 칸 차례 등장 · 막대 자람의 늦춤 — 차례마다 55 · 60ms 씩 (DESIGN.md 원칙 4 「대시보드 예외」) */
export const 떠오름 = (차례: number) => ({ animationDelay: `${String(차례 * 55)}ms` });
export const 자람 = (차례: number) => ({ animationDelay: `${String(300 + 차례 * 60)}ms` });

const 줄 = Array.from({ length: 20 }, (_, k) => k % 10);

/**
 * 자리마다 0~9 가 돌다 멈추는 숫자. 오른쪽 자리부터 0.09초씩 늦게 멈춘다 (DESIGN.md 원칙 4 「대시보드 예외」).
 * 읽는 글자는 숨긴 한 덩어리로 따로 둔다 — 도는 띠의 숫자 스무 개를 화면 읽기가 다 읽지 않게
 */
export function 굴림숫자({ 글, 늦춤 = 0 }: { 글: string; 늦춤?: number }) {
  const 글자들 = [...글];
  return (
    <span className="dash-roll">
      <span className="sr-only">{글}</span>
      {글자들.map((자, i) => {
        const 늦게 = `${(늦춤 + (글자들.length - 1 - i) * 0.09).toFixed(2)}s`;
        return /[0-9]/.test(자) ? (
          <span key={i} className="dg" aria-hidden="true">
            <span className="col" style={{ transform: `translateY(-${10 + Number(자)}em)`, animationDelay: 늦게 }}>
              {줄.map((n, k) => (
                <span key={k}>{n}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} aria-hidden="true">
            {자}
          </span>
        );
      })}
    </span>
  );
}

function 칸({ 차례, 그림, 이름, 값, 단위, 보조 }: { 차례: number; 그림: 아이콘이름; 이름: string; 값: string | null; 단위?: string; 보조: string }) {
  return (
    <div className="dash-panel dash-stat dash-rise" style={떠오름(차례)}>
      <span className="ic" aria-hidden="true">
        <아이콘 이름={그림} />
      </span>
      <span className="nm">{이름}</span>
      <span className="v num">
        {값 === null ? '—' : <굴림숫자 글={값} 늦춤={0.1 + 차례 * 0.08} />}
        {값 === null || 단위 === undefined ? null : <small>{단위}</small>}
      </span>
      <span className="dash-lab">{보조}</span>
    </div>
  );
}

export function 다섯칸({ 요약 }: { 요약: 요약 }) {
  const t = use말();
  const PRD있는 = 요약.apps.flatMap((a) => (a.prd === null ? [] : [a.prd]));
  const 기능 = 요약.apps.reduce((n, a) => n + a.cases.fn, 0);
  const UI = 요약.apps.reduce((n, a) => n + a.cases.ui, 0);
  const 마지막 = 더하기(요약.apps.map((a) => a.last));
  const { e2e } = 요약;
  const 부하 = 요약.perf.load;
  return (
    <section className="dash-stats" aria-label={t('프로젝트 요약')}>
      <div className="dash-track" aria-hidden="true" />
      <칸
        차례={0}
        그림="prd"
        이름="PRD"
        값={PRD있는.length === 0 ? null : 수글(PRD있는.reduce((n, p) => n + p.requirements, 0))}
        보조={t('기획서 {수}개 · 확인 필요 {확인}', {
          수: PRD있는.filter((p) => p.version > 0).length,
          확인: PRD있는.reduce((n, p) => n + p.needsCheck, 0),
        })}
      />
      <칸 차례={1} 그림="cases" 이름={t('케이스')} 값={수글(기능 + UI)} 보조={t('기능 {기능} · UI {UI}', { 기능: 수글(기능), UI: 수글(UI) })} />
      <칸
        차례={2}
        그림="run"
        이름={t('최근 실행 결과')}
        값={퍼센트(마지막.pass, 합(마지막))}
        단위="%"
        보조={t('통과율 · 실패 {수}', { 수: 수글(마지막.fail) })}
      />
      <칸
        차례={3}
        그림="scenarios"
        이름={t('E2E 시나리오')}
        값={퍼센트(e2e.pass, 합(e2e))}
        단위="%"
        보조={t('통과 {통과} · 실패 {실패} · 시나리오 {수}개', { 통과: e2e.pass, 실패: e2e.fail, 수: e2e.total })}
      />
      <칸
        차례={4}
        그림="perf"
        이름={t('성능 · 95% 응답시간')}
        값={부하?.p95Ms == null ? null : 수글(부하.p95Ms)}
        단위="ms"
        보조={
          부하 === null
            ? t('부하 테스트 기록 없음')
            : t('에러율 {에러} · 최대 TPS {TPS}', {
                에러: 부하.errorRate === null ? '—' : `${String(부하.errorRate)}%`,
                TPS: 부하.maxTps === null ? '—' : 수글(부하.maxTps),
              })
        }
      />
    </section>
  );
}
