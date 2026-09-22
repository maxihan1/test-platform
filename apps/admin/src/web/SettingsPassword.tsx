// 임시 비밀번호를 한 번만 보여주는 상자 (SPEC §8.8)
// 시스템이 만들어 한 번만 보여준다 — 사람이 타이핑해서 넘기지 않는다

import { useEffect, useRef } from 'react';

import { use말 } from './i18n.js';

export interface 임시 {
  username: string;
  password: string;
}

/**
 * 임시 비밀번호는 **이 자리에서 한 번만** 보인다 (SPEC §8.8).
 *
 * 그리자마자 화면 안으로 끌어오고 포커스를 옮긴다 — 계정이 열 명만 돼도 이 상자가
 * 스크롤 밖에 그려져서, 누른 사람은 **아무 일도 안 일어난 줄 안다.**
 * 그 사이 옛 비밀번호는 이미 죽어 있어 본인은 영문도 모르고 로그인이 막힌다.
 */
export function TempPassword({ 것, onClose }: { 것: 임시; onClose: () => void }) {
  const t = use말();
  const 상자 = useRef<HTMLDivElement>(null);
  useEffect(() => {
    상자.current?.scrollIntoView({ block: 'center' });
    상자.current?.focus();
  }, [것.username, 것.password]);

  return (
    // `ref` 가 맨 앞이어야 한다. 따옴표 둘 사이에 한국어 이름이 끼면
    // messages.test.ts 의 소스 훑기가 그것을 화면 글자로 읽고 빨간불을 낸다
    <div ref={상자} className="set-pw" tabIndex={-1} role="alert" aria-live="assertive">
      <div>
        <b>{것.username}</b> {t('의 임시 비밀번호는')} <code>{것.password}</code> {t('입니다')}
      </div>
      <div className="hint">
        {t('지금 적어서 본인에게 전합니다.')} <b>{t('닫으면 다시 볼 수 없습니다')}</b>{' '}
        {t('— 잊으면 다시 만듭니다')}
      </div>
      <button className="btn ghost" onClick={onClose}>
        {t('적었습니다')}
      </button>
    </div>
  );
}

