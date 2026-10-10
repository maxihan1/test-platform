// 케이스 목록의 「이 결과 엑셀로」 버튼과 실패 알림 한 줄 (도메인/카탈로그 §8.1 「엑셀로 내려받기」)
// 링크가 아니라 fetch 로 받는다 — 링크면 403·500 이 새 화면에 JSON 원문으로 뜬다

import { useState, type ReactNode } from 'react';

import { api, type CaseQuery } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message, 받을이름, 파일로저장 } from './ui.js';

// 버튼은 검색 줄에, 알림은 목록 위에 선다 — 자리가 둘이라 조각 둘을 돌려준다
export function use엑셀받기(조건: CaseQuery, 건수: number | null): { 버튼: ReactNode; 알림: ReactNode } {
  const t = use말();
  const 언어 = use언어();
  const [받는중, set받는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);

  async function 받기() {
    set받는중(true);
    set오류(null);
    try {
      const { 파일, 머리 } = await api.caseExport(조건);
      파일로저장(파일, 받을이름(머리, `${조건.service}.xlsx`));
    } catch (err) {
      set오류(message(err, 언어));
    } finally {
      set받는중(false);
    }
  }

  return {
    버튼: (
      <button className="btn ghost case-export" onClick={() => void 받기()} disabled={받는중 || (건수 ?? 0) === 0}>
        {받는중 ? t('만드는 중…') : t('이 결과 엑셀로 ({건수}건)', { 건수: 건수 ?? 0 })}
      </button>
    ),
    알림:
      오류 === null ? null : (
        <div className="export-alert" role="alert">
          {오류}
        </div>
      ),
  };
}
