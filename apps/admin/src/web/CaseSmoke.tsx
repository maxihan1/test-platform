// 케이스 목록의 스모크 표시 — 줄의 칩 하나. 「스모크만」 거르기는 필터 판(CaseListFilterBar.tsx)이다 (도메인/카탈로그 §8.1 「스모크」)

import { useState } from 'react';

import { api, type CaseRow } from './api.js';
import { 확인창 } from './ConfirmBox.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

/**
 * 케이스명 옆 스모크 칩. 고칠 수 있으면(on바뀜 있음) 버튼이고, 없으면 켜진 것만 글자 꼬리표다.
 * 사람이 고친 값이 없으면(smokeSet null) 누를 때 반대로 켜고 끄고, 있으면 코드 값으로 되돌린다.
 * 서버를 바꾸는 누름이라 상자로 한 번 묻는다 — 목록 줄의 칩이라 어느 케이스인지 제목에 적는다
 */
export function 스모크칩({ row, on바뀜 }: { row: CaseRow; on바뀜?: () => Promise<unknown> }) {
  const t = use말();
  const 언어 = use언어();
  const [오류, set오류] = useState<string | null>(null);
  const [보내는중, set보내는중] = useState(false);
  const [묻나, set묻나] = useState(false);
  const smoke = row.smoke ?? false;
  const 직접 = row.smokeSet != null;
  const 글 = <>{smoke ? '● ' : '○ '}{t('스모크')}{직접 ? <> · {t('직접')}</> : null}</>;
  // 「AI 값과 다르다」고는 안 쓴다 — 응답에 코드 값이 없어 다시 스캔해 같아졌는지 모른다
  const 뜻 = 직접 ? t('직접 수정한 값입니다. 다시 누르면 AI 가 정한 값으로 돌아갑니다') : undefined;
  // 꺼진 칩은 줄에 올릴 때만 보인다. 직접 꺼 둔 것은 되돌릴 길이라 늘 보인다
  const 클래스 = `smoke-chip ${smoke ? 'smoke-on' : 직접 ? 'smoke-off smoke-set' : 'smoke-off'}`;

  // 목록을 다시 읽을 때까지 막는다 — 그 전에 또 누르면 옛 row 로 보낼 값을 정해 「되돌리기」가 안 된다
  async function 누르기() {
    set오류(null);
    set보내는중(true);
    try {
      await api.setSmoke(row.tcId, 직접 ? null : !smoke);
      await on바뀜?.();
    } catch (e) {
      set오류(message(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  if (on바뀜 === undefined) return smoke ? <span className={클래스} title={뜻}>{글}</span> : null;
  // 세 갈래의 말을 미리 골라 둔다 — 누르는 순간의 row 로 상자를 열어 두고, 목록을 다시 읽어도 열린 상자 말이 안 바뀌게
  const 묻는말 = 직접
    ? {
        제목: t('{아이디} 케이스의 스모크를 AI 가 정한 값으로 다시 적용할까요?', { 아이디: row.tcId }),
        본문: t('손으로 수정한 스모크 표시를 삭제하고 AI 가 정한 값으로 변경합니다'),
        단추: t('AI 값 적용'),
      }
    : smoke
      ? {
          제목: t('{아이디} 케이스의 스모크를 끌까요?', { 아이디: row.tcId }),
          본문: t('이 케이스의 스모크 표시를 끄고 케이스 목록을 다시 읽습니다. 같은 단추를 다시 누르면 다시 켜집니다'),
          단추: t('스모크 끄기'),
        }
      : {
          제목: t('{아이디} 케이스의 스모크를 켤까요?', { 아이디: row.tcId }),
          본문: t('이 케이스를 스모크 테스트로 표시하고 케이스 목록을 다시 읽습니다. 같은 단추를 다시 누르면 표시가 풀립니다'),
          단추: t('스모크 켜기'),
        };
  return (
    <>
      <button type="button" className={클래스} aria-pressed={smoke} aria-label={t('{아이디} 스모크', { 아이디: row.tcId })} title={뜻} disabled={보내는중} onClick={() => set묻나(true)}>
        {글}
      </button>
      {오류 === null ? null : <span className="smoke-error" role="alert">{오류}</span>}
      {!묻나 ? null : (
        <확인창
          제목={묻는말.제목}
          확인={묻는말.단추}
          onClose={() => set묻나(false)}
          on확인={() => {
            set묻나(false);
            void 누르기();
          }}
        >
          <p>{묻는말.본문}</p>
        </확인창>
      )}
    </>
  );
}
