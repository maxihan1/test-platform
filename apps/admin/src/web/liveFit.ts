// 장면 그림 틀이 받은 그림의 가로세로 비율을 따르게 한다 — 기기 종류로 세로 · 가로를 짐작하지 않는다(가로 전용 게임 · 케이스 도중 화면 돌리기).
// CSS 가 --ar 로 칸에 남은 자리 안에서 비율을 지키는 가장 큰 크기를 잡는다 (trialLive.css 「그림 틀」)

import { useState, type CSSProperties, type SyntheticEvent } from 'react';

export function use그림비율() {
  const [비, set비] = useState<number | null>(null);
  return {
    /** 가로 ÷ 세로. 첫 그림 전에는 null */
    비,
    set비,
    // 비율을 알기 전에는 틀을 안 보이게 둔다 — 기본 16:10 틀이 한 장 보였다가 세로로 바뀌면 폰 테두리가 누웠다 서는 것처럼 깜빡인다.
    // 숨기되 자리는 그대로 둔다(visibility 로 숨기면 검사가 그림을 못 찾는다)
    틀: (비 === null ? { opacity: 0 } : { '--ar': String(비) }) as CSSProperties,
    /** img 의 onLoad 에 건다 */
    그림에서: (e: SyntheticEvent<HTMLImageElement>): void => {
      const { naturalWidth: 가로, naturalHeight: 세로 } = e.currentTarget;
      if (가로 > 0 && 세로 > 0) set비(가로 / 세로);
    },
  };
}
