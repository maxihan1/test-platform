// 케이스 목록의 이어 불러오기 끝줄과 목차 따라가기 (도메인/카탈로그 §8.1 「이어 불러오기」 · 「목차」 — 2026-11-11 시안 B)
// 「이전 · 다음」을 걷어 낸 자리다. 바닥에 닿으면 저절로 받고, 키보드로 온 사람을 위해 「더 보기」 단추도 같은 일을 한다

import { useEffect, useRef, useState, type RefObject } from 'react';

import { use말 } from './i18n.js';
import { use목차위치 } from './ListToc.js';

interface 이어받는목록 {
  error: string | null;
  받는중: boolean;
  더있나: boolean;
  더받기: () => Promise<boolean>;
}

/** 목록 맨 아래 줄 — 이것이 상자 바닥 근처에 보이면 다음 쪽을 받는다. 실패하면 까닭과 다시 받기를 둔다 */
export function 목록끝({ 받은, 전체, 목록 }: { 받은: number; 전체: number; 목록: 이어받는목록 }) {
  const t = use말();
  const 끝 = useRef<HTMLDivElement>(null);
  const { 더받기 } = 목록;
  useEffect(() => {
    const el = 끝.current;
    // jsdom 처럼 지켜보기가 없는 곳은 「더 보기」 단추로만 받는다
    if (el === null || typeof IntersectionObserver === 'undefined') return;
    // 기준은 화면(root 없음)이다 — 조상 스크롤 상자가 자른 부분은 안 보이는 것으로 친다. 상자를 기준으로 하면 휴대폰(페이지가 구른다)에서 늘 보여 끝까지 줄줄이 받았다
    const 지켜보기 = new IntersectionObserver((줄들) => {
      if (줄들.some((줄) => 줄.isIntersecting)) void 더받기();
    }, { rootMargin: '0px 0px 200px 0px' });
    지켜보기.observe(el);
    return () => 지켜보기.disconnect();
  }, [더받기, 받은]);

  return (
    <div className="list-end" ref={끝}>
      {목록.error !== null ? (
        <>
          <span className="list-end-bad">{목록.error}</span>{' '}
          <button type="button" className="linklike" onClick={() => void 더받기()}>
            {t('다시 불러오기')}
          </button>
        </>
      ) : 목록.받는중 ? (
        t('불러오는 중')
      ) : 목록.더있나 ? (
        <button type="button" className="linklike" onClick={() => void 더받기()}>
          {t('{전체}건 중 {수}건 · 더 보기', { 전체, 수: 받은 })}
        </button>
      ) : null}
    </div>
  );
}

/**
 * 목차를 누르면 그 묶음으로 간다. 아직 안 받은 쪽에 있으면 닿을 때까지 다음 쪽을 받는다 —
 * 서버가 기능 묶음 차례로 주므로 앞 묶음을 다 받으면 그 묶음이 온다. 더 받을 것이 없으면 멈춘다
 */
export function use목차따라가기(상자: RefObject<HTMLElement | null>, 목록: 이어받는목록, 받은: number) {
  const 위치 = use목차위치(상자, 받은);
  const [찾는, set찾는] = useState<string | null>(null);
  useEffect(() => {
    if (찾는 === null) return;
    if (위치.가기(찾는) || !목록.더있나 || 목록.error !== null) {
      set찾는(null);
      return;
    }
    if (!목록.받는중) void 목록.더받기();
  }, [찾는, 받은, 목록.더있나, 목록.받는중, 목록.error]);
  return {
    지금: 찾는 ?? 위치.지금,
    가기: (열쇠: string) => {
      if (!위치.가기(열쇠)) set찾는(열쇠);
    },
  };
}
