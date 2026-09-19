// 임시 비밀번호를 한 번만 보여주는 상자 (SPEC §8.8)
// 시스템이 만들어 한 번만 보여준다 — 사람이 타이핑해서 넘기지 않는다

import { useEffect, useRef } from 'react';

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
  const 상자 = useRef<HTMLDivElement>(null);
  useEffect(() => {
    상자.current?.scrollIntoView({ block: 'center' });
    상자.current?.focus();
  }, [것.username, 것.password]);

  return (
    <div className="set-pw" ref={상자} tabIndex={-1} role="alert" aria-live="assertive">
      <div>
        <b>{것.username}</b> 의 임시 비밀번호는 <code>{것.password}</code> 입니다
      </div>
      <div className="hint">
        지금 적어서 본인에게 전합니다. <b>닫으면 다시 볼 수 없습니다</b> — 잊으면 다시 만듭니다
      </div>
      <button className="btn ghost" onClick={onClose}>
        적었습니다
      </button>
    </div>
  );
}

