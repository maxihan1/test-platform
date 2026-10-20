// 디바이스 팜이 찍어 둔 폰 화면 영상과 logcat 을 실패 카드 · 항목 상세에 붙인다 (도메인/러너 §5.2 「디바이스 팜 접속 방식」)

import { api, type 팜파일 } from './api.js';
import { use말 } from './i18n.js';

const MB = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

export function 팜증적({ runId, historyId, files }: { runId: number; historyId: number; files: 팜파일[] }) {
  const t = use말();
  if (files.length === 0) return null;
  const 영상 = files.filter((f) => f.name.endsWith('.mp4'));
  const 로그 = files.filter((f) => !f.name.endsWith('.mp4'));
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
              src={api.farmFile(runId, historyId, f.name)}
              aria-label={t('화면 영상 {번호}', { 번호: i + 1 })}
            />
          ))}
        </div>
      )}
      {로그.map((f) => (
        <a key={f.name} className="farm-ev-file" href={api.farmFile(runId, historyId, f.name)} download={f.name}>
          {t('{파일} 받기 ({크기})', { 파일: f.name, 크기: MB(f.bytes) })}
        </a>
      ))}
    </div>
  );
}
