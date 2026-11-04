// 화면 맨 위에 잠깐 보이는 확인 · 안내 한 줄 — 비밀번호를 바꾼 뒤 · 링크의 애플리케이션을 못 봐 지금 것으로 연 때 (공통/5-화면공통 §8 「링크에 애플리케이션이 담긴다」)

import { useEffect } from 'react';

/**
 * 바꾼 뒤 화면이 직전 자리로 넘어가 변경 화면이 사라진다. 바뀌었다는 말은 넘어간 자리가 한다 — 링크 안내도 같은 자리 · 같은 모양이다
 * @param 글 옮긴 글. 부르는 쪽이 `t()` 로 옮긴다
 */
export function FlashNotice({ 글, onGone }: { 글: string; onGone: () => void }) {
  useEffect(() => {
    const 타이머 = window.setTimeout(onGone, 5000);
    return () => window.clearTimeout(타이머);
  }, [onGone]);

  return (
    <div className="pw-done" role="status">
      {글}
    </div>
  );
}
