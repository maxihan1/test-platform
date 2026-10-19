// E2E 시나리오 값 연결의 「요청 고르기」 재료 — 서비스 지도의 API 목록을 서비스마다 한 번만 받는다

import { useEffect, useState } from 'react';

import type { 지도API } from '../prd/apiMap.js';
import { ApiError } from './api.js';
import { prdApi } from './prdApi.js';

/** 받은 지도. 아직 받는 중이거나 못 받았으면 null — 고르개 없이 손으로 적는 칸만 둔다 */
export function useServiceApis(서비스: string, 필요: boolean): 지도API[] | null {
  const [시도, set시도] = useState<{ 서비스: string; apis: 지도API[] | null } | null>(null);
  const 시도함 = 시도?.서비스 === 서비스;

  useEffect(() => {
    if (!필요 || 서비스 === '' || 시도함) return;
    let 취소 = false;
    void (async () => {
      let apis: 지도API[] | null = null;
      try {
        apis = (await prdApi.apis(서비스)).apis;
      } catch (err) {
        // 이 고르개는 거들기라 못 받아도 손으로 적으면 된다 — 화면에 띄우지 않고 「고르개 없음」으로 둔다.
        // 작성 보기 권한이 없는 것(403)은 늘 있는 일이고, 그 밖은 서버가 아픈 것이라 남긴다
        if (!(err instanceof ApiError && err.status === 403)) console.error('[scenario build] loading the service map failed; leaving the request picker out', 서비스, err);
      }
      if (!취소) set시도({ 서비스, apis });
    })();
    return () => {
      취소 = true;
    };
  }, [필요, 서비스, 시도함]);

  return 시도함 ? (시도?.apis ?? null) : null;
}
