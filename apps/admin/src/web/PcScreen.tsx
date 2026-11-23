// 윈도우 PC 항목의 움직이는 화면 — admin 이 흘린 VISION H.264 조각을 브라우저 WebCodecs 로 풀어 canvas 에 그린다 (도메인/게임 §3.10 「증적 · 결과」 · 도메인/실행 §7 「…/pc-screen」)

import { useEffect, useRef, useState } from 'react';

import { use말 } from './i18n.js';
import { use그림비율 } from './liveFit.js';
import { 머리를푼다, 잇는다, 조각을가른다, 코덱 } from './pcScreenFrames.js';

// 흐름이 끝나면(PC 를 놓기 직전 · VISION 재시작 · 브라우저가 밀려 끊김) 이만큼 쉬고 다시 붙는다.
// 한 장도 못 그리고 끝나기가 거듭되면(VISION 이 거절 · PC 를 놓음) 두 배씩 늘려 30초까지 — 서버가 VISION 을 2초마다 두드리지 않게
const 다시붙는ms = 2_000;
const 다시붙는최대ms = 30_000;

/** 검사가 바꿔 끼우게 객체에 둔다 */
export const PC화면통로 = {
  받기: (주소: string, signal: AbortSignal): Promise<Response> => fetch(주소, { cache: 'no-store', credentials: 'same-origin', signal }),
};

export function PC화면({ 주소, 기다림글 }: { 주소: string; 기다림글: string }) {
  const t = use말();
  const 그림판 = useRef<HTMLCanvasElement>(null);
  const [그림있음, set그림있음] = useState(false);
  const { 틀, set비 } = use그림비율();
  // WebCodecs 는 https(또는 localhost)에서만 열린다 — http 설치는 Chrome 이어도 못 푼다
  const 안전한곳 = window.isSecureContext !== false;
  const 풀수있음 = 안전한곳 && typeof VideoDecoder === 'function';

  useEffect(() => {
    if (!풀수있음) return;
    let 멈춤 = false;
    let 타이머: ReturnType<typeof setTimeout> | undefined;
    let 끊개: AbortController | undefined;
    let 못그린번 = 0;
    let 이번에그림 = false;
    const 그린다 = (장: VideoFrame): void => {
      이번에그림 = true;
      const 판 = 그림판.current;
      if (판 !== null && !멈춤) {
        if (판.width !== 장.displayWidth || 판.height !== 장.displayHeight) {
          판.width = 장.displayWidth;
          판.height = 장.displayHeight;
          set비(장.displayWidth / 장.displayHeight);
        }
        판.getContext('2d')?.drawImage(장, 0, 0);
        set그림있음(true);
      }
      장.close();
    };
    const 붙기 = async (): Promise<void> => {
      const 이번끊개 = new AbortController();
      끊개 = 이번끊개;
      이번에그림 = false;
      let 풀개: VideoDecoder | undefined;
      // 설정 조각(SPS · PPS)은 다음 키프레임 앞에 붙인다 — 그래야 풀개가 시작한다
      let 설정: Uint8Array | undefined;
      try {
        const res = await PC화면통로.받기(주소, 이번끊개.signal);
        const 읽개 = res.ok ? res.body?.getReader() : undefined;
        let 남은: Uint8Array = new Uint8Array(0);
        while (읽개 !== undefined && !멈춤) {
          const { done, value } = await 읽개.read();
          if (done) break;
          const 갈림 = 조각을가른다(잇는다(남은, value));
          남은 = 갈림.남은;
          for (const 조각 of 갈림.조각들) {
            const 장 = 머리를푼다(조각);
            if (장 === undefined) continue;
            if (장.종류 === 'config') {
              const 이름 = 코덱(장.영상);
              if (이름 === undefined) continue;
              // 설정이 바뀌면(창 크기) 풀개를 새로 — 옛것을 두면 쌓인다. 풀다 깨지면 끊고 다시 붙어 키프레임부터 받는다
              if (풀개 !== undefined && 풀개.state !== 'closed') 풀개.close();
              풀개 = new VideoDecoder({ output: 그린다, error: () => 이번끊개.abort() });
              풀개.configure({ codec: 이름, optimizeForLatency: true });
              설정 = 장.영상.slice();
              continue;
            }
            if (풀개?.state !== 'configured') continue;
            // 새 설정 뒤 첫 키프레임 전의 델타는 그릴 수 없다
            if (설정 !== undefined && 장.종류 !== 'key') continue;
            const 영상 = 설정 === undefined ? 장.영상 : 잇는다(설정, 장.영상);
            설정 = undefined;
            풀개.decode(new EncodedVideoChunk({ type: 장.종류 === 'key' ? 'key' : 'delta', timestamp: 장.시각 ?? 0, data: 영상 }));
          }
        }
      } catch {
        // 끊었거나 끊겼다 — 화면은 보는 것일 뿐이라 알리지 않고 다시 붙는다
      }
      if (풀개 !== undefined && 풀개.state !== 'closed') 풀개.close();
      if (멈춤) return;
      // 끊긴 화면을 「실시간」 칸에 멈춘 채 두지 않는다 — 다음 장이 올 때까지 기다림 글로 돌아간다
      set그림있음(false);
      못그린번 = 이번에그림 ? 0 : 못그린번 + 1;
      타이머 = setTimeout(() => void 붙기(), Math.min(다시붙는최대ms, 다시붙는ms * 2 ** 못그린번));
    };
    void 붙기();
    return () => {
      멈춤 = true;
      clearTimeout(타이머);
      끊개?.abort();
    };
  }, [주소, 풀수있음]);

  if (!안전한곳) return <p className="live-wait">{t('https 주소로 열어야 PC 화면이 보입니다')}</p>;
  if (!풀수있음) return <p className="live-wait">{t('이 브라우저에서는 PC 화면을 볼 수 없습니다. Chrome 이나 Edge 로 여세요')}</p>;
  return (
    <>
      {그림있음 ? null : <p className="live-wait">{기다림글}</p>}
      {/* 첫 장이 오기 전에도 canvas 는 있어야 그린다 — 숨겨만 둔다 */}
      <div className="live-shot" hidden={!그림있음} style={틀}>
        <canvas ref={그림판} aria-label={t('Windows PC 의 지금 화면')} />
      </div>
    </>
  );
}
