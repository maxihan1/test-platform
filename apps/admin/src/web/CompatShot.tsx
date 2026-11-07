// 의심 화면 그림 위에 비전이 짚은 네모를 그린다 — 실행 중 창의 작은 그림과 결과 카드가 같이 쓴다 (도메인/호환성 §8.17 ③ · ④)

import { useState } from 'react';

import { type CompatIssue, 그림주소 } from './compatApi.js';
import { 네모자리 } from './compatRunView.js';
import { use말 } from './i18n.js';

/** box 는 원본 픽셀 근사값이라 그림을 받은 뒤 원본 크기로 퍼센트 자리를 셈한다. 그림이 없으면(팜 받기 실패) 빈 칸에 까닭을 적는다 */
export function CompatShot({ runId, screenId, issues, 이름, 작게 = false }: { runId: number; screenId: number; issues: readonly CompatIssue[]; 이름: string; 작게?: boolean }) {
  const t = use말();
  const [크기, set크기] = useState<{ w: number; h: number } | null>(null);
  const [없음, set없음] = useState(false);
  return (
    <div className={작게 ? 'cr-shot small' : 'cr-shot'}>
      {없음 ? (
        <span className="cr-shot-none">{t('화면 그림을 받지 못했습니다')}</span>
      ) : (
        <>
          <img
            src={그림주소(runId, screenId)}
            alt={이름}
            loading="lazy"
            onLoad={(e) => set크기({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onError={() => set없음(true)}
          />
          {크기 === null
            ? null
            : issues.map((i, n) => {
                const 자리 = 네모자리(i.box, 크기.w, 크기.h);
                return 자리 === null ? null : <span key={n} className="cr-mark" style={자리} aria-hidden="true" />;
              })}
        </>
      )}
    </div>
  );
}
