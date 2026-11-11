// 준비 실패 실행의 결과 칸 — 항목 목록 대신 안내 한 줄과 준비 실패 까닭 (도메인/실행 §3.2 「실행 전 준비」 「화면 · 집계」)

import { use말 } from './i18n.js';

export function RunPrepFailed({ prepNote, 칸안 }: { prepNote: string | null | undefined; 칸안: boolean }) {
  const t = use말();
  return (
    <div className={칸안 ? 'screen pane-results' : 'screen'}>
      <div className="empty">
        <p>{t('테스트 데이터 준비에 실패해 테스트를 실행하지 않았습니다')}</p>
        {/* 까닭은 서버가 가린 응답 원문이라 옮기지 않는다 */}
        {prepNote == null ? null : <p className="hint">{prepNote}</p>}
      </div>
    </div>
  );
}
