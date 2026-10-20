// API 케이스 절차의 응답 형식 검사 줄 — 확인 문장과 섞지 않고 따로 보인다 (도메인/API §3.8 「응답 모양 확인」)

import type { ShapeCheck } from '@platform/kit';

import { use말 } from './i18n.js';

export function ShapeChecks({ checks }: { checks: ShapeCheck[] | undefined }) {
  const t = use말();
  if (checks === undefined || checks.length === 0) return null;

  return (
    <div className="shape-checks">
      <div className="shape-label">{t('응답 형식 검사')}</div>
      {checks.map((c, index) => {
        const 글 = `${c.method} ${c.path} ${String(c.status)}`;
        // NO_SHAPE 는 통과로 세지만 문서에 모양이 없어 맞았다고 말할 수 없다 — 표시 없이 흐리게
        if (c.result === 'NO_SHAPE') {
          return (
            <div key={`${글}-${String(index)}`} className="shape-row shape-none">
              <span className="mono">{글}</span> {t('문서에 응답 형식 없음')}
            </div>
          );
        }
        const 통과 = c.result === 'PASS';
        return (
          <div key={`${글}-${String(index)}`} className="shape-row">
            <span className="shape-mark" style={{ color: `var(--${통과 ? 'pass' : 'fail'}-text)` }}>
              {통과 ? '✓' : '✗'}
            </span>{' '}
            <span className="mono">{글}</span> {통과 ? t('문서와 같습니다') : t('문서와 다릅니다')}
            {(c.problems ?? []).map((p, i) => (
              <div key={i} className="shape-problem">
                · {p}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
