// 실패 카드의 BTS 등록 줄 — 보내는 중 · 등록 실패 + [다시 보내기] (도메인/BTS §8.15 「실행 결과 실패 카드」)
// 보낸 이슈는 판정 줄(RunFailJudge)이 「BTS DM-12 에서 확인 중」으로 단다. 여기는 보낸 뒤에는 아무것도 안 그린다

import { useEffect, useState } from 'react';

import { api, type FailureCase } from './api.js';
import { BTS이름 } from './btsName.js';
import { use말, use언어 } from './i18n.js';
import type { 판정 } from './role.js';
import { message } from './ui.js';

interface Props {
  c: FailureCase;
  runId: number;
  env: string;
  권한: 판정;
}

export function RunFailBts({ c, runId, env, 권한 }: Props) {
  const t = use말();
  const 언어 = use언어();
  const [다시세움, set다시세움] = useState(false);
  const [바쁨, set바쁨] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  // 카드 재료를 다시 읽어 새 값이 오면 그것이 이긴다
  useEffect(() => set다시세움(false), [c.bts]);
  const 칸 = c.bts;
  if (칸 === undefined || 칸 === null) return null;
  const 상태 = 다시세움 ? 'SENDING' : 칸.state;
  if (상태 === 'SENT') return null;

  async function 다시보내기() {
    set바쁨(true);
    set오류(null);
    try {
      await api.resendBts(runId, c.tcId, env);
      set다시세움(true);
    } catch (err) {
      set오류(message(err, 언어));
    }
    set바쁨(false);
  }

  return (
    <div className="fc-cause">
      <p className="fc-judged">
        {상태 === 'SENDING' ? t('{bts} 에 보내는 중', { bts: BTS이름 }) : t('{bts} 등록 실패 · {까닭}', { bts: BTS이름, 까닭: 칸.reason ?? '' })}
      </p>
      {상태 !== 'GAVE_UP' || !권한('실행') ? null : (
        <button type="button" className="btn small" disabled={바쁨} onClick={() => void 다시보내기()}>
          {t('다시 보내기')}
        </button>
      )}
      {오류 === null ? null : (
        <span className="note" role="alert">
          {오류}
        </span>
      )}
    </div>
  );
}
