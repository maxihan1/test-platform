// 설정 › 계정 편집 서랍 바닥의 단추들 — 비밀번호 재발급 · 비활성으로 내리기 · 계정 추가/저장 (도메인/인증 §8.8 「계정」)
// 재발급은 그 자리에서 두 번 누른다. 비활성 · 다시 활성화 · 저장은 서버를 바꾸므로 서랍 위에 확인 창을 띄운다 (2026-11-26 사용자)

import { useState } from 'react';

import { api, type UserRow } from './api.js';
import { 확인창 } from './ConfirmBox.js';
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
  const [활성묻기, set활성묻기] = useState(false);

  const 뒤집는다 = () => {
    set활성묻기(false);
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
      {마지막운영 ? null : (
        <button className="btn ghost" disabled={보내는중} onClick={() => set활성묻기(true)}>
          {row.isActive ? t('비활성으로 내리기') : t('다시 활성화')}
        </button>
      )}
      {!활성묻기 ? null : (
        <확인창
          제목={row.isActive ? t('「{이름}」 계정을 비활성으로 내릴까요?', { 이름: row.displayName }) : t('「{이름}」 계정을 다시 활성화할까요?', { 이름: row.displayName })}
          확인={row.isActive ? t('비활성으로 내리기') : t('다시 활성화')}
          onClose={() => set활성묻기(false)}
          on확인={뒤집는다}
        >
          <p>{row.isActive ? t('이 계정은 바로 로그인할 수 없게 됩니다. 다시 활성화할 수 있습니다') : t('이 계정은 바로 로그인할 수 있게 됩니다. 다시 비활성으로 내릴 수 있습니다')}</p>
        </확인창>
      )}
    </>
  );
}

/** 계정을 만들거나 고치면 서버가 바뀐다 — 못 보내는 이유가 없을 때만 한 번 묻는다. SettingsUser 가 300줄에 닿아 여기 둔다 */
export function 계정저장단추({ 새것, 막힘, 못보낸다, on저장 }: { 새것: boolean; 막힘: boolean; 못보낸다: boolean; on저장: () => void }) {
  const t = use말();
  const [묻나, set묻나] = useState(false);
  return (
    <>
      <button className="btn" disabled={막힘} onClick={() => (못보낸다 ? undefined : set묻나(true))}>
        {새것 ? t('계정 추가') : t('저장')}
      </button>
      {!묻나 ? null : (
        <확인창
          제목={새것 ? t('계정을 추가할까요?') : t('계정 정보를 저장할까요?')}
          확인={새것 ? t('계정 추가') : t('저장')}
          onClose={() => set묻나(false)}
          on확인={() => {
            set묻나(false);
            on저장();
          }}
        >
          <p>
            {새것
              ? t('적은 값으로 계정을 만들고 시스템이 만든 임시 비밀번호를 한 번만 보여 줍니다. 만든 계정은 삭제할 수 없고 비활성으로만 내릴 수 있습니다')
              : t('이름 · 등급 · 대시보드 · 프로젝트 배정을 저장합니다. 다시 수정해 저장할 수 있습니다')}
          </p>
        </확인창>
      )}
    </>
  );
}
