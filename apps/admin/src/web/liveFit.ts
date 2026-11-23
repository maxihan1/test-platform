// 장면 그림 틀이 받은 그림의 가로세로 비율을 따르게 한다 — 기기 종류로 세로 · 가로를 짐작하지 않는다(가로 전용 게임 · 케이스 도중 화면 돌리기).
// CSS 가 --ar 로 칸에 남은 자리 안에서 비율을 지키는 가장 큰 크기를 잡는다 (trialLive.css 「그림 틀」)

import { useState, type CSSProperties, type SyntheticEvent } from 'react';

export function use그림비율() {
  const [비, set비] = useState<number | null>(null);
  return {
    /** 가로 ÷ 세로. 첫 그림 전에는 null */
    비,
    set비,
    틀: 비 === null ? undefined : ({ '--ar': String(비) } as CSSProperties),
    /** img 의 onLoad 에 건다 */
    그림에서: (e: SyntheticEvent<HTMLImageElement>): void => {
      const { naturalWidth: 가로, naturalHeight: 세로 } = e.currentTarget;
      if (가로 > 0 && 세로 > 0) set비(가로 / 세로);
    },
  };
}
