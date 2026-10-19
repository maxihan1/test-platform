// 「PRD 관리」 맨 위에서 열리는 새 요구 칸 — 카드들 아래에서 열려 스크롤도 안 되던 것을 위로 올렸다 (도메인/작성 §3.6 「사람이 고칠 때」 · 점검 8.5)

import { useEffect, useRef } from 'react';

import { use말 } from './i18n.js';
import type { 판짓기 } from './Prd.js';
import { prdApi, type PrdNow } from './prdApi.js';
import { PrdItemForm, 빈요구 } from './PrdItemForm.js';
import { 고친판 } from './prdView.js';

export function PrdNew({ service, now, 짓기, on닫기 }: { service: string; now: PrdNow; 짓기: 판짓기; on닫기: () => void }) {
  const t = use말();
  const 칸 = useRef<HTMLDivElement>(null);
  // jsdom 에는 scrollIntoView 가 없다
  useEffect(() => 칸.current?.scrollIntoView?.({ block: 'nearest' }), []);

  return (
    <div className="prd-new prd-new-top" ref={칸}>
      <h3>{t('새 요구')}</h3>
      <PrdItemForm
        새요구
        처음={빈요구()}
        기능들={[...new Set(now.items.map((x) => x.feature))]}
        on저장={async (x, 실패) => {
          const 됐나 = await 짓기((base) => prdApi.save(service, base, 고친판(now.items, null, x)), 실패);
          if (됐나) on닫기();
          return 됐나;
        }}
        on취소={on닫기}
      />
    </div>
  );
}
