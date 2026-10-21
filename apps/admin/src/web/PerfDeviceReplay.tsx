// 기기 성능 결과의 「녹화 화면과 측정값」 — 기기 탭 · 녹화 화면 · AI가 표시한 장면 · 구간 띠 · 그래프. 재생 위치가 그래프 세로선과 같이 움직인다 (도메인/성능 §8.14 · 시안 Dev-Result-B)

import { useRef, useState } from 'react';

import { use말 } from './i18n.js';
import { PerfChart } from './PerfChart.js';
import { 영상주소, type 기기결과, type 기기목표, type 기기숫자, type 측정지표 } from './perfDeviceApi.js';
import { 점들, 조각찾기 } from './perfDeviceView.js';
import { 눈금최대, 분초 } from './perfRunView.js';

/** 구간 띠 색 — 구간 이름 차례로 돌려 쓴다. 회색 셋이라 뜻이 없다 */
const 띠색 = ['var(--line-2)', 'var(--ink-faint)', 'var(--ink-muted)'];

interface 줄그림 {
  항목: 측정지표;
  이름: string;
  값: (줄: 기기숫자) => number | null;
  /** 이 그래프에 겹쳐 그릴 목표 지표 */
  목표?: 기기목표['metric'];
}

const 그림들: 줄그림[] = [
  { 항목: 'FPS', 이름: 'FPS', 값: (줄) => 줄.fps, 목표: 'AVG_FPS' },
  { 항목: 'JANK', 이름: '프레임 드랍', 값: (줄) => 줄.jankPct },
  { 항목: 'TEMP', 이름: '기기 온도', 값: (줄) => 줄.tempC, 목표: 'MAX_TEMP' },
  { 항목: 'CPU', 이름: 'CPU', 값: (줄) => 줄.cpu },
  { 항목: 'MEM', 이름: '메모리', 값: (줄) => 줄.memMb, 목표: 'MAX_MEM' },
  { 항목: 'BATTERY', 이름: '배터리', 값: (줄) => 줄.batteryPct },
];

export function PerfDeviceReplay({ runId, 결과, 항목, 목표들, 처음기기 }: { runId: number; 결과: 기기결과; 항목: 측정지표[]; 목표들: 기기목표[]; 처음기기: string }) {
  const t = use말();
  const [기기, set기기] = useState(처음기기);
  const [재생초, set재생초] = useState<number | null>(null);
  const [조각, set조각] = useState<{ serial: string; name: string } | null>(null);
  const 영상 = useRef<HTMLVideoElement | null>(null);
  // 장면을 누르면 조각을 바꾼 뒤 그 안의 초로 간다 — 조각이 바뀌면 영상이 다시 읽힌 뒤에 옮겨야 한다
  const 갈초 = useRef<number | null>(null);

  const 줄들 = 결과.metrics.filter((줄) => 줄.serial === 기기).sort((a, b) => a.sec - b.sec);
  const 끝초 = Math.max(1, ...줄들.map((줄) => 줄.sec));
  const 장면들 = 결과.markers.filter((m) => m.serial === 기기).sort((a, b) => a.sec - b.sec);
  const 구간들 = 결과.segments.filter((s) => s.serial === 기기);
  const 구간이름 = [...new Set(구간들.map((s) => s.segment))];
  const 영상있음 = 결과.videos.some((v) => v.serial === 기기);
  const 지금조각 = 조각?.serial === 기기 ? 조각.name : (조각찾기(결과.videos, 기기, 0)?.name ?? null);
  const 조각시작 = 결과.videos.find((v) => v.serial === 기기 && v.name === 지금조각)?.startSec ?? 0;
  const 모델 = (serial: string) => 결과.devices.find((d) => d.serial === serial)?.model ?? serial;

  function 가기(sec: number) {
    set재생초(sec);
    const 곳 = 조각찾기(결과.videos, 기기, sec);
    if (곳 === null) return;
    if (곳.name !== 지금조각) {
      갈초.current = 곳.안초;
      set조각({ serial: 기기, name: 곳.name });
      return;
    }
    if (영상.current !== null) 영상.current.currentTime = 곳.안초;
  }

  return (
    <section className="perf-panel" aria-labelledby="pd-v">
      <div className="perf-row">
        <h2 id="pd-v">{t('녹화 화면과 측정값')}</h2>
        <div className="pd-tabs" role="tablist" aria-label={t('기기')}>
          {결과.devices.map((d) => (
            <button key={d.serial} type="button" role="tab" aria-selected={d.serial === 기기} className={d.serial === 기기 ? 'on' : undefined} onClick={() => {
                set기기(d.serial);
                set재생초(null);
              }}>
              {d.model}
            </button>
          ))}
        </div>
      </div>
      <div className="pd-split">
        {영상있음 && 지금조각 !== null ? (
          <video
            ref={영상}
            key={지금조각}
            className="pd-video"
            controls
            preload="metadata"
            src={영상주소(runId, 기기, 지금조각)}
            aria-label={t('{기기} 녹화 화면', { 기기: 모델(기기) })}
            onLoadedMetadata={(e) => {
              if (갈초.current === null) return;
              e.currentTarget.currentTime = 갈초.current;
              갈초.current = null;
            }}
            onTimeUpdate={(e) => set재생초(조각시작 + e.currentTarget.currentTime)}
          />
        ) : (
          <div className="pd-video pd-novideo">{t('녹화 화면이 없습니다')}</div>
        )}
        <div className="pd-marks">
          <span className="perf-faint">{t('AI가 표시한 장면')}</span>
          {장면들.length === 0 ? <span className="perf-faint">{t('표시한 장면이 없습니다')}</span> : null}
          {장면들.map((m) => (
            <button key={`${String(m.sec)}${m.label}`} type="button" className={재생초 !== null && Math.abs(재생초 - m.sec) < 2 ? 'pd-mark on' : 'pd-mark'} onClick={() => 가기(m.sec)}>
              <span className="mono">{분초(m.sec)}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      {구간들.length === 0 ? null : (
        <div className="pd-lane">
          <span className="perf-faint">{t('구간')}</span>
          <svg viewBox="0 0 600 12" preserveAspectRatio="none" className="pd-band" role="img" aria-label={t('구간 {목록}', { 목록: 구간이름.join(', ') })}>
            {구간들.map((s) => (
              <rect key={`${String(s.loop)}${s.segment}${String(s.fromSec)}`} x={(s.fromSec / 끝초) * 600} y={0} width={Math.max(1, ((s.toSec - s.fromSec + 1) / 끝초) * 600)} height={12} style={{ fill: 띠색[구간이름.indexOf(s.segment) % 띠색.length] }}>
                <title>{[s.loop === null ? null : t('{수}회차', { 수: s.loop }), s.segment].filter((x) => x !== null).join(' ')}</title>
              </rect>
            ))}
          </svg>
        </div>
      )}
      {그림들
        .filter((g) => 항목.includes(g.항목))
        .map((g) => {
          const 선 = 점들(줄들, g.값);
          const 목표 = g.목표 === undefined ? undefined : 목표들.find((x) => x.metric === g.목표);
          const 위 = 눈금최대(...선.map((p) => p.y), 목표?.value ?? 0);
          return (
            <div key={g.항목} className="pd-lane">
              <span className="perf-faint">{t(g.이름)}</span>
              <PerfChart
                선들={[{ 이름: t(g.이름), 색: 'var(--ink)', 점들: 선, 최대Y: 위 }]}
                최대X={끝초}
                높이={g.항목 === 'FPS' ? 120 : 60}
                라벨={t('{기기} {지표} 추이', { 기기: 모델(기기), 지표: t(g.이름) })}
                {...(목표 === undefined ? {} : { 목표: { 이름: t('목표'), 값: 목표.value, 최대Y: 위 } })}
                {...(재생초 === null ? {} : { 세로선: { x: 재생초, 색: 'var(--accent)' } })}
              />
            </div>
          );
        })}
    </section>
  );
}
