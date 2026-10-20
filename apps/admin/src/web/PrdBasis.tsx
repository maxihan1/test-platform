// 요구 하나의 출처 목록 — 자료 · 위치 · 원문. 확인 필요 카드와 펼친 요구 줄이 같이 쓴다 (도메인/작성 §3.6 「사람이 고칠 때」)

import type { PrdBasis } from '@platform/kit';
import { Fragment } from 'react';

import { 직접작성, 화면에서 } from '../prd/rules.js';
import { use말 } from './i18n.js';

export function 근거목록({ basis }: { basis: PrdBasis[] }) {
  const t = use말();
  // 값은 그대로 두고 표시만 푼다. 자료 이름(문서 파일명 등)은 사람이 적은 그대로 보인다
  const 풀이: Record<string, string> = { [화면에서]: t('실제 화면에서 본 것'), [직접작성]: t('사람이 직접 적은 것') };
  return (
    <>
      <p className="hint">{t('이 요구사항을 어디서 읽었는지입니다')}</p>
      <dl className="prd-basis">
        {basis.map((b, i) => (
          <Fragment key={i}>
            <dt>
              {t('자료')}: {풀이[b.from] ?? b.from}
              {b.ref ? (
                <>
                  {' '}
                  · {t('위치')}: <span className="prd-id">{b.ref}</span>
                </>
              ) : null}
            </dt>
            <dd>
              {t('원문')}: 「{b.quote}」
            </dd>
          </Fragment>
        ))}
      </dl>
    </>
  );
}
