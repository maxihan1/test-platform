// 케이스 목록의 엑셀 받기와 실패 알림 한 줄 (도메인/카탈로그 §8.1 「엑셀로 내려받기」)
// 링크가 아니라 fetch 로 받는다 — 링크면 403·500 이 새 화면에 JSON 원문으로 뜬다.
// 단추는 머리의 「다운로드 ▾」 메뉴 안에 선다(2026-11-11 시안 B — 앞 판은 「이 결과 엑셀로 (N건)」 단추가 머리에 따로 섰다)

import { useState, type ReactNode } from 'react';

import { api, type CaseQuery } from './api.js';
import { use언어 } from './i18n.js';
import { message, 받을이름, 파일로저장 } from './ui.js';

// 메뉴는 화면 머리에, 알림은 목록 위에 선다 — 자리가 둘이라 조각을 따로 돌려준다
export function use엑셀받기(조건: CaseQuery): { 받기: () => void; 받는중: boolean; 알림: ReactNode } {
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
    받기: () => void 받기(),
    받는중,
    알림:
      오류 === null ? null : (
        <div className="export-alert" role="alert">
          {오류}
        </div>
      ),
  };
}
