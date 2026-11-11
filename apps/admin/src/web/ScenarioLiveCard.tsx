// E2E 정식 실행 결과 화면의 화면 카드 — 도는 동안 웹 단계 장면 · 앱 · 게임 단계 폰 장면과, 폰을 잡았으면 Device VISION 링크 (도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」 · WEB-F9-12)

import type { Platform } from '@platform/kit';
import { useEffect, useState } from 'react';

import { use말 } from './i18n.js';
import { scenarioApi } from './scenarioApi.js';
import { use장면 } from './TrialLive.js';
import { PLATFORM_LABEL } from './ui.js';

type 말 = ReturnType<typeof use말>;

/**
 * 칸 머리 꼬리표 — 보이는 장면이 어디서 오는지다. 폰 PNG 는 앱 · 게임 단계의 실제 폰이다.
 * 모바일 웹 장면은 폰을 잡았고 앱 장면을 아직 못 봤으면 실제 폰 Chrome, 아니면 서버의 흉내다 — 앱 · 게임 단계가 섞인 실행은 폰을 내내 쥐어도 웹 단계가 흉내로 돈다.
 * ponytail: 섞인 모바일 실행이 웹 단계부터 시작하면 첫 앱 장면 전까지 「실제 디바이스」로 보인다 — 응답에 실행 위치 칸이 생기면 그것으로 가른다.
 * android 시나리오의 웹 단계는 PC 창이라 꼬리표가 없다
 */
function 기기글(platform: Platform, 폰그림: boolean, 앱폰본적: boolean, 폰잡음: boolean, t: 말): string | null {
  if (폰그림) return t('실제 디바이스');
  if (platform === 'desktop') return t('서버 브라우저');
  if (platform === 'mobile') return 폰잡음 && !앱폰본적 ? t('실제 디바이스') : t('가상 디바이스 · iPhone 14');
  return null;
}

/** 보일 것이 없으면(화면 있는 단계 없음 · 폰 안 잡음 · 끝남) 아무것도 안 그린다 */
export function E2E화면카드({ runId, platform, live, vision }: { runId: number; platform: Platform; live: boolean; vision?: { url: string } }) {
  const t = use말();
  const { 그림, 폰그림, 비었나, 못닿음 } = use장면(live ? scenarioApi.runLive(runId) : null, true, false);
  // 앱 · 게임 단계의 폰 장면(PNG)을 한 번이라도 봤나 — 그 뒤 웹 장면은 흉내다
  const [앱폰본적, set앱폰본적] = useState(false);
  useEffect(() => {
    if (폰그림) set앱폰본적(true);
  }, [폰그림]);
  if (!live && vision === undefined) return null;
  const 폰잡음 = vision !== undefined;
  const 꼬리표 = 기기글(platform, 폰그림, 앱폰본적, 폰잡음, t);
  // 장면이 한 번 온 뒤의 「장면 없음」은 앱 · 게임 단계를 열고 첫 폰 장면을 기다리는 동안이다. 멈춘 화면으로 안 읽히게 흐리게 둔다 — 시험 실행 칸과 같다
  const 폰기다림 = 비었나 && 폰잡음;

  return (
    <section className="lc" aria-label={t('실시간 화면')}>
      <div className="live-head">
        <span className="pulse" aria-hidden="true" />
        <b>{t(PLATFORM_LABEL[platform])}</b>
        {꼬리표 === null ? null : <span className="lc-tag">{꼬리표}</span>}
        {vision === undefined ? null : (
          <a className="live-vision" href={vision.url} target="_blank" rel="noreferrer">
            Device VISION ↗
          </a>
        )}
      </div>
      {live ? (
        <div className="lc-scene">
          {그림 === null ? (
            <p className="live-wait">{못닿음 ? t('실행 서버와 연결이 끊겼습니다. 다시 연결하는 중입니다') : t('화면을 기다리고 있습니다')}</p>
          ) : (
            <div className={['live-shot', platform === 'mobile' || 폰그림 ? 'lc-phone' : '', 폰기다림 ? 'dim' : ''].filter(Boolean).join(' ')}>
              <img src={그림} alt={t('지금 화면')} />
              {폰기다림 ? <p className="live-over">{t('지금은 앱 단계라 디바이스에서 실행 중입니다')}</p> : null}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
