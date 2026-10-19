// 작성 상세의 「만든 케이스」 표 — 에이전트가 PR 파일에서 센 목록이라 GitHub 에 안 가고 이름 · 확인 내용 · 요구를 본다 (도메인/작성 §7 finish result.cases · 점검 12.2)

import type { AuthoringMadeCase } from './api.js';
import { use말 } from './i18n.js';
import { PRD항목주소, 케이스주소 } from './route.js';

export function AuthoringCases({ cases, prUrl, 등록됨 }: { cases: AuthoringMadeCase[] | null; prUrl: string | null; 등록됨: boolean }) {
  const t = use말();
  // 목록을 싣기 전의 에이전트가 만든 요청 — 없다고 단정하지 않고 PR 로 보낸다
  if (cases === null) {
    if (prUrl === null) return null;
    return (
      <section className="authoring-panel" aria-label={t('만든 케이스')}>
        <h3>{t('만든 케이스')}</h3>
        <p className="hint">
          {t('이 요청은 만든 케이스 목록을 남기지 않았습니다')} ·{' '}
          <a href={prUrl} target="_blank" rel="noreferrer">
            {t('PR 에서 보기')}
          </a>
        </p>
      </section>
    );
  }
  if (cases.length === 0) return null;
  return (
    <section id="made-cases" className="authoring-panel" aria-labelledby="made-cases-title">
      <h3 id="made-cases-title">
        {t('만든 케이스')} <span className="hint">{t('{수}건', { 수: cases.length })}</span>
      </h3>
      <div className="authoring-diffs-wrap">
        <table className="dhist" aria-label={t('만든 케이스')}>
          <thead>
            <tr>
              <th>{t('케이스')}</th>
              <th />
              <th>{t('확인 내용')}</th>
              <th>{t('요구사항')}</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.tcId}>
                <td>
                  {/* 반영 전에는 카탈로그에 없어 고리가 빈 상세로 간다 */}
                  {등록됨 ? (
                    <a className="mono" href={케이스주소(c.tcId)}>
                      {c.tcId}
                    </a>
                  ) : (
                    <span className="mono">{c.tcId}</span>
                  )}
                  <br />
                  {c.name}
                </td>
                <td>
                  <span className={c.change === 'NEW' ? 'status-chip done' : 'status-chip quiet'}>
                    {c.change === 'NEW' ? t('새로') : t('바뀜')}
                  </span>
                </td>
                <td>
                  {c.verifies[0] ?? '—'}
                  {c.verifies.length > 1 ? (
                    <details className="made-more">
                      <summary>{t('외 {수}개', { 수: c.verifies.length - 1 })}</summary>
                      <ul>
                        {c.verifies.slice(1).map((v, i) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </td>
                <td>
                  {c.reqs.length === 0
                    ? '—'
                    : c.reqs.map((r) => (
                        <a key={r} className="mono made-req" href={PRD항목주소(r)}>
                          {r}
                        </a>
                      ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
