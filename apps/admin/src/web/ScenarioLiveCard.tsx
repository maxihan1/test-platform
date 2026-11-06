// E2E 정식 실행 결과 화면의 화면 카드 — 도는 동안 웹 단계 장면과, 폰을 잡았으면 Device VISION 링크 (도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」 · WEB-F9-12)

import type { Platform } from '@platform/kit';

import { use말 } from './i18n.js';
import { scenarioApi } from './scenarioApi.js';
import { use장면 } from './TrialLive.js';
import { PLATFORM_LABEL } from './ui.js';

type 말 = ReturnType<typeof use말>;

/**
 * 칸 머리 꼬리표 — 보이는 장면이 어디서 오는지다. 앱 · 게임 단계가 섞인 실행은 폰을 시나리오 내내 쥐어도 웹 장면은 서버 브라우저다.
 * 실제 폰 Chrome 모바일 실행은 장면이 없고 VISION 링크만 선다. android 시나리오의 웹 단계는 PC 창이라 꼬리표가 없다
 */
function 기기글(platform: Platform, live: boolean, 폰잡음: boolean, t: 말): string | null {
  if (platform === 'desktop') return t('서버 브라우저');
  if (platform === 'mobile') return 폰잡음 && !live ? t('실제 기기') : t('가상 기기 · iPhone 14');
  return null;
}

function 장면({ runId, 폰, 폰잡음 }: { runId: number; 폰: boolean; 폰잡음: boolean }) {
  const t = use말();
  // 정식 실행은 앱 · 게임 단계의 폰 장면을 안 찍는다 — 장면은 늘 브라우저 JPEG 다
  const { 그림, 비었나, 못닿음 } = use장면(scenarioApi.runLive(runId), true, false);
  if (그림 === null) return <p className="live-wait">{못닿음 ? t('실행 서버와 연결이 끊겼습니다. 다시 연결하는 중입니다') : t('화면을 기다리고 있습니다')}</p>;
  // 웹 장면이 한 번 온 뒤의 「장면 없음」은 앱 · 게임 단계뿐이다(창 하나). 멈춘 화면으로 안 읽히게 흐리게 두고 폰에서 돈다고 알린다 — 시험 실행 칸과 같다
  const 폰단계 = 비었나 && 폰잡음;
  return (
    <div className={['live-shot', 폰 ? 'lc-phone' : '', 폰단계 ? 'dim' : ''].filter(Boolean).join(' ')}>
      <img src={그림} alt={t('지금 화면')} />
      {폰단계 ? <p className="live-over">{t('지금은 앱 단계라 폰에서 실행 중입니다')}</p> : null}
    </div>
  );
}

/** 보일 것이 없으면(웹 단계 없음 · 폰 안 잡음 · 끝남) 아무것도 안 그린다 */
export function E2E화면카드({ runId, platform, live, vision }: { runId: number; platform: Platform; live: boolean; vision?: { url: string } }) {
  const t = use말();
  if (!live && vision === undefined) return null;
  const 꼬리표 = 기기글(platform, live, vision !== undefined, t);

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
          <장면 runId={runId} 폰={platform === 'mobile'} 폰잡음={vision !== undefined} />
        </div>
      ) : null}
    </section>
  );
}
