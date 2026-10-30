// 디바이스 팜이 찍어 둔 폰 화면 영상과 logcat 을 실패 카드 · 항목 상세에 붙인다 (도메인/러너 §5.2 「디바이스 팜 접속 방식」)

import { useState } from 'react';

import { api, type 팜파일 } from './api.js';
import { use말 } from './i18n.js';

const MB = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

export const 팜영상인가 = (f: 팜파일): boolean => f.name.endsWith('.mp4');

/**
 * @param 주소 파일 이름으로 원본 주소를 만든다 — 앱 항목과 E2E 시나리오(시나리오에 한 벌)가 통로만 다르다
 * @param 보일 실패 카드의 증거 칸은 영상 · logcat 을 탭으로 나눠 한쪽만 그린다
 */
export function 팜증적({ 주소, files, 보일 }: { 주소: (name: string) => string; files: 팜파일[]; 보일?: 'video' | 'log' }) {
  const t = use말();
  if (files.length === 0) return null;
  const 영상 = 보일 === 'log' ? [] : files.filter(팜영상인가);
  const 로그 = 보일 === 'video' ? [] : files.filter((f) => !f.name.endsWith('.mp4'));
  return (
    <div className="farm-ev">
      {영상.length === 0 ? null : (
        <div className="farm-ev-row">
          <span className="farm-ev-label">{t('화면 영상')}</span>
          {영상.map((f, i) => (
            // 한 조각이 100MB 를 넘는다 — 누르기 전에는 받지 않는다
            <video
              key={f.name}
              className="farm-ev-video"
              controls
              preload="none"
              src={주소(f.name)}
              aria-label={t('화면 영상 {번호}', { 번호: i + 1 })}
            />
          ))}
        </div>
      )}
      {로그.map((f) => (
        <a key={f.name} className="farm-ev-file" href={주소(f.name)} download={f.name}>
          {t('{파일} 받기 ({크기})', { 파일: f.name, 크기: MB(f.bytes) })}
        </a>
      ))}
    </div>
  );
}

/**
 * 통과한 앱 · 게임 항목의 영상 — 러너가 영상을 받아 두지 않아 누를 때 팜에서 그대로 받아 온다. 한 조각이 100MB 를 넘어 누르기 전에는 받지 않는다.
 * 팜이 30일 안에 지웠거나 못 닿으면 서버가 404 에 사람이 읽을 한 줄을 준다 — 영상 태그는 그 글을 못 읽어 같은 주소를 다시 불러 읽는다
 */
export function 통과영상({ runId, historyId }: { runId: number; historyId: number }) {
  const t = use말();
  const [열림, set열림] = useState(false);
  const [까닭, set까닭] = useState<string | null>(null);
  const 주소 = api.farmVideo(runId, historyId);
  const 까닭을읽는다 = (): void => {
    // 200 이면 영상 몸통(100MB 넘게)이라 읽지 않고 끊는다 — 까닭 글은 404 에만 있다
    void fetch(주소)
      .then(async (res) => {
        if (res.ok) {
          await res.body?.cancel();
          return undefined;
        }
        return ((await res.json()) as { detail?: unknown }).detail;
      })
      .catch(() => undefined)
      .then((detail) => set까닭(typeof detail === 'string' ? detail : t('영상을 열지 못했습니다')));
  };
  return (
    <div className="farm-ev">
      <div className="farm-ev-row">
        <span className="farm-ev-label">{t('화면 영상')}</span>
        {까닭 !== null ? (
          <span className="hint">{까닭}</span>
        ) : 열림 ? (
          <video className="farm-ev-video" controls autoPlay src={주소} aria-label={t('화면 영상')} onError={까닭을읽는다} />
        ) : (
          <button type="button" className="btn ghost" onClick={() => set열림(true)}>
            {t('영상 보기')}
          </button>
        )}
      </div>
    </div>
  );
}
