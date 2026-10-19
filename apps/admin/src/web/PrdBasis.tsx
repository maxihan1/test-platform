// 요구 하나의 근거 목록 — 자료 이름 · 원본 번호 · 인용 문장. 확인 필요 카드와 펼친 요구 줄이 같이 쓴다 (도메인/작성 §3.6 「사람이 고칠 때」)

import type { PrdBasis } from '@platform/kit';
import { Fragment } from 'react';

export function 근거목록({ basis }: { basis: PrdBasis[] }) {
  return (
    <dl className="prd-basis">
      {basis.map((b, i) => (
        <Fragment key={i}>
          <dt>
            {b.from}
            {b.ref === undefined ? null : (
              <>
                {' '}
                · <span className="prd-id">{b.ref}</span>
              </>
            )}
          </dt>
          <dd>「{b.quote}」</dd>
        </Fragment>
      ))}
    </dl>
  );
}
