// 실행 위치 덩이 — 디바이스마다 어디서 도는지 한 줄. 모바일 웹만 서버 흉내 · 실제 폰을 고른다 (도메인/실행 §8.2 「실행할 때 같이 고르는 것」 · 시안 A)

import { useId } from 'react';

import type { 모바일위치, 앱종류 } from './api.js';
import { use말 } from './i18n.js';
import { 종류 } from './kind.js';
import { PLATFORM_LABEL } from './ui.js';

/** 모바일 웹 줄의 값과 바꾸기. 고를 케이스에 모바일이 없으면 넘기지 않는다 — 그 줄이 안 선다 */
export interface 모바일고르개 {
  값: 모바일위치;
  on바꿈: (값: 모바일위치) => void;
  /** 실제 폰을 골랐을 때 덧붙이는 글. 없으면 케이스 글 — 시나리오는 폰을 시나리오에 한 번 잡아 글이 다르다 */
  덧붙임?: string;
}

/**
 * Android 앱 정식 실행은 늘 디바이스 팜에서 돈다 — 고를 값이 하나라 그 줄은 안내이고, 요청에는 아무것도 싣지 않는다 (2026-10-20 APP-F1-10).
 * Android 앱 · 게임 애플리케이션은 고른 케이스와 상관없이 늘 띄우고 팜이 하는 일을 한 줄 덧붙인다 (도메인/러너 §5.2 종류 표).
 * 모바일 웹은 기본이 서버 흉내다 — 폰이 적어 기본을 실제 폰으로 두면 앱 · 게임 실행이 줄줄이 기다린다 (도메인/실행 §3.2 「모바일 웹 실행 위치」)
 */
export function RunLocation({ android, 앱종류, 모바일 }: { android: boolean; 앱종류?: 앱종류; 모바일?: 모바일고르개 }) {
  const t = use말();
  // 한 화면에 둘이 서도(E2E 목록 · 실행 창) 라디오 묶음이 섞이지 않게 이름을 따로 짓는다
  const 이름 = useId();
  const 늘 = 종류(앱종류).실행위치늘;
  const 앱줄 = android || 늘 !== null;

  if (!앱줄 && 모바일 === undefined) return null;

  return (
    <div className="run-loc">
      {모바일 === undefined ? null : (
        <>
          <span className="run-loc-k" id={이름}>
            {t('모바일 웹')}
          </span>
          <div className="run-loc-v">
            <div className="run-loc-radios" role="radiogroup" aria-labelledby={이름}>
              <label>
                <input type="radio" name={이름} checked={모바일.값 === 'server'} onChange={() => 모바일.on바꿈('server')} />
                {t('서버 (iPhone 14 흉내)')}
              </label>
              <label>
                <input type="radio" name={이름} checked={모바일.값 === 'vision'} onChange={() => 모바일.on바꿈('vision')} />
                {t('Device VISION (실제 폰 Chrome)')}
              </label>
            </div>
            {/* 실제 폰도 Android 앱처럼 항목마다 빈 폰을 잡고 놓는다 — 같은 글이다 */}
            {모바일.값 === 'vision' ? <span className="hint">{t(모바일.덧붙임 ?? '케이스마다 빈 폰을 하나씩 잡고 끝나면 놓습니다. 화면 영상과 logcat 은 통과하지 못한 항목에 남습니다')}</span> : null}
          </div>
        </>
      )}
      {!앱줄 ? null : (
        <>
          <span className="run-loc-k">{t(늘 === null ? PLATFORM_LABEL.android : 종류(앱종류).이름)}</span>
          <div className="run-loc-v">
            <span>Device VISION</span>
            {늘 === null ? null : <span className="hint">{t(늘)}</span>}
          </div>
        </>
      )}
    </div>
  );
}
