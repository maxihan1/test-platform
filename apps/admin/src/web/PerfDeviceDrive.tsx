// 기기 성능 측정 시작의 「조작 방식」 — 케이스로 잴지 직접 플레이할지. 앱 · 모바일 게임 · PC 게임마다 설명이 다르다 (도메인/성능 §8.14 「기기 성능」). PerfDeviceStart.tsx 가 300줄을 넘어 떼어 냈다

import { use말 } from './i18n.js';
import type { 조작 } from './perfDeviceApi.js';

export function PerfDeviceDrive({ 조작, on조작, 쓰나, 게임, PC }: { 조작: 조작; on조작: (값: 조작) => void; 쓰나: boolean; 게임: boolean; PC: boolean }) {
  const t = use말();
  const 조작칸 = (값: 조작, 이름: string, 설명: string) => (
    <label className={조작 === 값 ? 'pd-kind on' : 'pd-kind'}>
      <input type="radio" name="pd-drive" checked={조작 === 값} disabled={!쓰나} onChange={() => on조작(값)} />
      <span>
        <b>{t(이름)}</b>
        <br />
        <span className="perf-faint">{t(설명)}</span>
      </span>
    </label>
  );

  return (
    <section className="perf-panel" aria-labelledby="pd-m">
      <h2 id="pd-m">{t('조작 방식')}</h2>
      <div className="pd-kinds" role="radiogroup" aria-label={t('조작 방식')}>
        {PC
          ? 조작칸('GAME', '게임 케이스', '선택한 게임 케이스를 PC 에서 반복 실행하며 측정합니다. Device VISION 에 연결된 PC 한 대를 씁니다')
          : 게임
            ? 조작칸('GAME', '게임 케이스', '선택한 게임 케이스를 디바이스마다 반복 실행하며 측정합니다. Device VISION 에 연결된 디바이스만 쓸 수 있습니다')
            : 조작칸('APPIUM', 'Appium 케이스', '선택한 Android 앱 케이스를 디바이스마다 반복 실행하며 측정합니다. Device VISION 에 연결된 디바이스만 쓸 수 있습니다')}
        {PC
          ? 조작칸('MANUAL', '직접 플레이', '실행 빌드를 설치하고 게임을 켜 둡니다. Device VISION 에 연결된 PC 앞에 앉아 플레이하는 동안 기록합니다')
          : 조작칸('MANUAL', '직접 플레이', 'Device VISION 에 연결된 디바이스를 손에 들고 플레이하는 동안 기록합니다')}
      </div>
    </section>
  );
}
