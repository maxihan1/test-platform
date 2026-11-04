// 스스로 비밀번호를 바꾼 뒤 돌아간 자리에서 잠깐 보이는 확인 한 줄. 링크의 애플리케이션을 못 봐 지금 것으로 연 안내도 같은 자리 · 같은 모양이다

import { useEffect } from 'react';

import { use말 } from './i18n.js';

/**
 * 바꾼 뒤 화면이 직전 자리로 넘어가 변경 화면이 사라진다. 바뀌었다는 말은 넘어간 자리가 한다
 * @param 글 다른 안내를 띄울 때 옮긴 글. 없으면 비밀번호 확인 줄이다
 */
export function PasswordNotice({ onGone, 글 }: { onGone: () => void; 글?: string }) {
  const t = use말();

  useEffect(() => {
    const 타이머 = window.setTimeout(onGone, 5000);
    return () => window.clearTimeout(타이머);
  }, [onGone]);

  return (
    <div className="pw-done" role="status">
      {글 ?? t('비밀번호를 바꿨습니다')}
    </div>
  );
}
