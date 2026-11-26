// QA 리포트의 리스크 문장 고치기와 거절 문장 — 애플리케이션 · 프로젝트 리포트가 같이 쓴다 (도메인/리포팅 §8.21). QaReport.tsx 가 300줄에 닿아 떼어 냈다

import { useState } from 'react';

import { ApiError } from './api.js';
import { 확인창 } from './ConfirmBox.js';
import { 오류속성, 칸오류, use첫오류 } from './FieldError.js';
import { use말, use언어, type 언어 } from './i18n.js';
import type { 리포트응답 } from './qaReportApi.js';
import { message, 기다림글자 } from './ui.js';

type 말 = ReturnType<typeof use말>;

/** 승인 통로의 거절 코드 — 같은 코드를 다른 화면(계정 승인 · 작성 반영)이 다른 뜻으로 써서 공용 표에 넣지 않는다 (§7 「승인 · 문장 고치기」) */
const 승인거절: Record<string, string> = {
  SELF_APPROVAL: '수행자는 승인할 수 없습니다',
  RUNNING: '진행 중인 실행이 완료되면 승인할 수 있습니다',
  AI_PENDING: 'AI 가 남은 리스크를 작성하는 중입니다. 작성이 완료되면 승인할 수 있습니다',
  ALREADY_APPROVED: '이미 승인된 리포트입니다',
  NOT_LATEST: '새 버전이 있습니다. 가장 최근 버전에서 승인할 수 있습니다',
  APPROVED: '승인된 버전은 수정할 수 없습니다',
};

export function 거절문장(e: unknown, t: 말, 언어: 언어): string {
  if (e instanceof ApiError && 승인거절[e.code] !== undefined) return t(승인거절[e.code]!);
  return message(e, 언어);
}

/** 리스크 문단 고치기 — 애플리케이션 리포트 「남은 리스크」 · 프로젝트 리포트 「지난 리포트 대비 리스크」가 같이 쓴다 */
export function 문장수정({ ai, 저장하기, 단추, 이름, on바뀜 }: { ai: 리포트응답['ai']; 저장하기: (글: string) => Promise<unknown>; 단추: string; 이름: string; on바뀜: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [열림, set열림] = useState(false);
  const [글, set글] = useState('');
  const [중, set중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const [눌렀나, set눌렀나] = useState(false);
  const [묻나, set묻나] = useState(false);
  const { 상자, 첫오류로 } = use첫오류();
  const 빈글 = 눌렀나 && 글.trim() === '' ? t('리스크 문장을 적어 주세요') : null;
  const 지금글 = ai !== null && !('failed' in ai) ? ai.current : '';

  if (!열림) {
    return (
      <button
        type="button"
        className="btn ghost"
        onClick={() => {
          set글(지금글);
          set오류(null);
          set눌렀나(false);
          set열림(true);
        }}
      >
        {단추}
      </button>
    );
  }
  const 저장누름 = () => {
    set눌렀나(true);
    if (글.trim() === '') return 첫오류로();
    set묻나(true);
  };
  const 저장 = async () => {
    set중(true);
    set오류(null);
    try {
      await 저장하기(글);
      set열림(false);
      on바뀜();
    } catch (e) {
      set오류(거절문장(e, t, 언어));
    } finally {
      set중(false);
    }
  };
  return (
    <div className="qar-edit" ref={상자}>
      <label htmlFor="qar-ai">{이름}</label>
      {/* 「기능 리스크」 · 「비기능 리스크」 줄은 묶음 머리다. 줄마다 「- 」로 쓰면 문서가 목록으로 그린다 */}
      <textarea id="qar-ai" value={글} maxLength={4000} rows={10} {...오류속성('qar-ai-err', 빈글)} onChange={(e) => set글(e.target.value)} />
      <칸오류 id="qar-ai-err" 사유={빈글} />
      <p className="hint">{t('AI 가 처음 쓴 글은 따로 남고 리포트에는 수정한 글이 들어갑니다')}</p>
      <div className="qar-acts">
        <button type="button" className="btn ghost" onClick={() => set열림(false)} disabled={중}>
          {t('취소')}
        </button>
        <button type="button" className="btn primary" onClick={저장누름} disabled={중}>
          <기다림글자 중={중} 평소={t('저장')} 기다림={t('저장하는 중')} />
        </button>
      </div>
      {오류 === null ? null : (
        <p className="qar-error" role="alert">
          {오류}
        </p>
      )}
      {!묻나 ? null : (
        <확인창
          제목={t('{이름} 문장을 저장할까요?', { 이름 })}
          확인={t('저장')}
          onClose={() => set묻나(false)}
          on확인={() => {
            set묻나(false);
            void 저장();
          }}
        >
          <p>{t('리포트에 수정한 문장이 들어가고 AI 가 처음 쓴 글은 따로 남습니다. 저장한 뒤에 다시 수정할 수 있습니다')}</p>
        </확인창>
      )}
    </div>
  );
}
