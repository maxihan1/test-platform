// 설정 › 계정 편집 서랍 바닥의 되돌리기 어려운 두 단추 — 비밀번호 재발급 · 비활성으로 내리기 (도메인/인증 §8.8 「계정」)
// 서랍 안이라 상자를 열지 않는다. 둘 다 결과를 먼저 적고 그 자리에서 한 번 더 받는다

import { useState } from 'react';

import { api, type UserRow } from './api.js';
import { use말 } from './i18n.js';

export function UserActions({
  row,
  나다,
  마지막운영,
  보내는중,
  한다,
  onDone,
  onPassword,
}: {
  row: UserRow;
  나다: boolean;
  마지막운영: boolean;
  보내는중: boolean;
  한다: (일: () => Promise<void>) => void;
  onDone?: () => void;
  onPassword?: (password: string) => void;
}) {
  const t = use말();
  // 되돌릴 수 없는 일이라 두 걸음으로 받는다. 저장 버튼 바로 옆이라 잘못 누르기 쉽다
  const [비번확인, set비번확인] = useState(false);
  const [비활성확인, set비활성확인] = useState(false);

  const 뒤집는다 = () => {
    set비활성확인(false);
    한다(async () => {
      await api.updateUser(row.username, { isActive: !row.isActive });
      onDone?.();
    });
  };

  return (
    <>
      {/* 자기 것을 재발급하면 세션 도장이 바뀌어 임시 비밀번호를 옮겨 적기 전에 로그아웃된다 */}
      {나다 ? (
        <span className="hint set-left">{t('자기 비밀번호는 맨 위 오른쪽 이름을 눌러 나오는 「비밀번호 변경」에서 변경합니다')}</span>
      ) : (
        // 되돌릴 수 없다. 왼쪽 끝으로 떼어 놓고 두 걸음으로 받는다
        <button
          className={`btn ghost set-left${비번확인 ? ' set-warn' : ''}`}
          disabled={보내는중}
          onClick={() => {
            if (!비번확인) {
              set비번확인(true);
              return;
            }
            set비번확인(false);
            한다(async () => {
              const { tempPassword } = await api.resetPassword(row.username);
              onPassword?.(tempPassword);
            });
          }}
        >
          {비번확인 ? t('한 번 더 누르면 지금 비밀번호가 무효가 됩니다') : t('비밀번호 재발급')}
        </button>
      )}
      {마지막운영 ? null : 비활성확인 && row.isActive ? (
        // 애플리케이션 비활성화와 같은 확인 줄이다 — 확정은 글자가 다른 따로 된 버튼으로 둔다
        <span className="set-warn set-ask">
          {t('비활성으로 내리면 이 계정은 바로 로그인할 수 없습니다. 다시 활성으로 변경할 수 있습니다')}{' '}
          <button className="btn ghost set-warn" disabled={보내는중} onClick={뒤집는다}>
            {t('비활성으로 내린다')}
          </button>{' '}
          <button className="btn ghost" disabled={보내는중} onClick={() => set비활성확인(false)}>
            {t('그만두기')}
          </button>
        </span>
      ) : (
        <button className="btn ghost" disabled={보내는중} onClick={() => (row.isActive ? set비활성확인(true) : 뒤집는다())}>
          {row.isActive ? t('비활성으로 내리기') : t('다시 활성으로')}
        </button>
      )}
    </>
  );
}
