// 작성 요청의 실행 기록 표 — 번호는 하나, 이어서 작성 · 다시 작성은 차로 쌓인다 (도메인/작성 §7 「실행 기록」 · 시안 A)

import type { AuthoringRun } from './api.js';
import { 보임라벨, 중단이유라벨, type 보임 } from './authoringView.js';
import { use말, use언어 } from './i18n.js';
import { when } from './ui.js';

const 수 = new Intl.NumberFormat('en-US');

/** 이 실행이 어떻게 섰나 — 목록 줄도 최신 실행의 방식을 이것으로 적는다 */
export function 방식(실행: Pick<AuthoringRun, 'kind'> & { resumeFrom?: number | null }, t: (키: string) => string): string {
  if (실행.kind === 'MERGE') return t('머지');
  if (실행.kind === 'AUTHOR') return t('처음');
  return 실행.resumeFrom == null ? t('처음부터') : t('이어서');
}

function 상태보임(status: AuthoringRun['status']): 보임 {
  if (status === 'DRAFT') return 'draft';
  if (status === 'PENDING') return 'queued';
  if (status === 'RUNNING') return 'running';
  if (status === 'DONE') return 'done';
  if (status === 'STOPPED') return 'stopped';
  return 'failed';
}

export function AuthoringRuns({ runs }: { runs: AuthoringRun[] }) {
  const t = use말();
  const 언어 = use언어();
  // 한 번만 돈 요청은 기록이 곧 상태 카드다 — 같은 것을 두 번 그리지 않는다
  if (runs.length < 2) return null;

  const 결과 = (r: AuthoringRun): string => {
    const 이름 = 보임라벨(상태보임(r.status), 언어);
    if (r.status === 'STOPPED') return `${이름} — ${중단이유라벨(r.stopReason, 언어)}`;
    if (r.status === 'FAILED' && r.error !== null) return `${이름} — ${r.error}`;
    return 이름;
  };
  // 끊겨 센 토큰은 하한값이다 — 입력 칸에 한 번만 적는다
  const 토큰 = (r: AuthoringRun, 칸: 'input' | 'output' | 'cacheRead' | 'cacheWrite'): string => {
    if (r.tokens === null) return '—';
    const 값 = 수.format(r.tokens[칸]);
    return 칸 === 'input' && r.tokens.partial ? `${값} (${t('끊겨 하한')})` : 값;
  };

  return (
    <section className="authoring-panel authoring-runs" aria-label={t('실행 기록')}>
      <h3>
        {t('실행 기록')} · {t('{차}차', { 차: runs.length })}
      </h3>
      {/* 좁은 화면에서 아홉 칸이 쪼개지지 않게 표만 옆으로 구른다 (DESIGN.md 「반응형」) */}
      <div className="authoring-diffs-wrap">
        <table className="dhist" aria-label={t('실행 기록')}>
          <thead>
            <tr>
              <th>{t('차')}</th>
              <th>{t('방식')}</th>
              <th>{t('시작')}</th>
              <th>{t('결과')}</th>
              <th>{t('테스트')}</th>
              <th>{t('입력')}</th>
              <th>{t('출력')}</th>
              <th>{t('캐시 읽기')}</th>
              <th>{t('캐시 쓰기')}</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r, i) => (
              <tr key={r.id} className={i === 0 ? 'now' : undefined}>
                <td>{t('{차}차', { 차: runs.length - i })}</td>
                <td>{방식(r, t)}</td>
                <td>{when(r.startedAt ?? r.createdAt, 언어)}</td>
                <td>{결과(r)}</td>
                <td className="mono">{r.caseFiles === null ? '—' : String(r.caseFiles)}</td>
                <td className="mono">{토큰(r, 'input')}</td>
                <td className="mono">{토큰(r, 'output')}</td>
                <td className="mono">{토큰(r, 'cacheRead')}</td>
                <td className="mono">{토큰(r, 'cacheWrite')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
