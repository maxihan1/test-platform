// 요구 하나의 출처 목록 — 자료(파일)마다 상자 하나, 그 안에 위치 · 원문 (도메인/작성 §3.6 「사람이 고칠 때」)
// 2026-11-27 사용자 — 이전 버전은 줄마다 「자료: 파일 이름 · 위치: … 원문: …」을 되풀이해 길게 늘어졌다

import type { PrdBasis } from '@platform/kit';

import { 직접작성, 화면에서 } from '../prd/rules.js';
import { use말 } from './i18n.js';

export function 근거목록({ basis }: { basis: PrdBasis[] }) {
  const t = use말();
  // 값은 그대로 두고 표시만 푼다. 자료 이름(문서 파일명 등)은 사람이 적은 그대로 보인다
  const 풀이: Record<string, string> = { [화면에서]: t('실제 화면에서 본 것'), [직접작성]: t('사람이 직접 적은 것') };
  if (basis.length === 0) return <p className="prd-none">{t('출처가 없습니다')}</p>;
  const 자료별 = new Map<string, PrdBasis[]>();
  for (const b of basis) 자료별.set(b.from, [...(자료별.get(b.from) ?? []), b]);
  return (
    <div className="prd-src">
      {[...자료별].map(([자료, 줄들]) => (
        <div className="prd-src-box" key={자료}>
          <div className="prd-src-file">
            <span>{풀이[자료] ?? 자료}</span>
            <small>{t('{건수}곳', { 건수: 줄들.length })}</small>
          </div>
          <ul>
            {/* 위치가 없는 출처(직접 적은 것 등)는 원문이 줄을 다 쓴다 — 빈 위치 칸이 원문 앞에 남았다 */}
            {줄들.map((b, i) => (
              <li key={i} className={b.ref ? undefined : 'no-ref'}>
                {b.ref ? <span className="prd-id">{b.ref}</span> : null}
                <span>{b.quote}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
