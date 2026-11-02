// 기기 성능 측정 시작의 「측정 기기」 — AI 사양별 추천 · 「추천 적용」 · 기기 표 (도메인/성능 §8.14 「기기 성능」 · §7 「기기 추천」)

import { useState } from 'react';

import { use말 } from './i18n.js';
import { perfApi } from './perfApi.js';
import type { 고를기기, 기기자리, 기기추천 } from './perfDeviceApi.js';
import { usePerfJob } from './usePerfJob.js';

/** 한 번에 잴 수 있는 기기 수 (§7 「측정 요청」) */
export const 기기상한 = 5;

export const 기기키 = (d: { serial: string; where: 기기자리 }): string => `${d.where}:${d.serial}`;

export function PerfDevicePick({
  serviceId,
  기기들,
  고른,
  고침,
  팜만,
  쓰나,
}: {
  serviceId: number;
  기기들: 고를기기[] | null;
  /** 기기키 목록 */
  고른: string[];
  고침: (고른: string[]) => void;
  /** Appium · 게임 케이스는 팜 폰만 잰다 — 내 컴퓨터 러너 폰은 고를 수 없다 */
  팜만: boolean;
  쓰나: boolean;
}) {
  const t = use말();
  const [추천, set추천] = useState<기기추천 | null>(null);
  const 일 = usePerfJob<기기추천>(set추천);
  const 고를수 = (d: 고를기기) => d.status === 'IDLE' && !(팜만 && d.where === 'LOCAL');
  const 모델 = (serial: string) => 기기들?.find((d) => d.serial === serial && d.where === 'FARM')?.model ?? serial;

  return (
    <section className="perf-panel" aria-labelledby="pd-d">
      <h2 id="pd-d">{t('측정 기기')}</h2>
      {쓰나 ? (
        <div className="perf-well perf-row">
          <span className="perf-ai">{t('AI 추천')}</span>
          {추천 !== null ? (
            <>
              <span>
                {t('사양별 대표 기기 {수}대: {목록}', { 수: 추천.devices.length, 목록: 추천.devices.map((d) => `${모델(d.serial)}(${d.why})`).join(', ') })}
              </span>
              <button type="button" className="btn ghost small" onClick={() => 고침(추천.devices.slice(0, 기기상한).map((d) => 기기키({ serial: d.serial, where: 'FARM' })))}>
                {t('추천 적용')}
              </button>
            </>
          ) : (
            <>
              <span className={일.오류 === null ? 'perf-faint' : 'perf-err'}>
                {일.도나 ? t('AI 가 디바이스 팜 기기 목록에서 사양별로 고르는 중입니다') : (일.오류 ?? t('디바이스 팜 기기 목록에서 고사양 · 중사양 · 저사양 대표 기기를 고릅니다'))}
              </span>
              <button type="button" className="btn ghost small" disabled={일.도나} onClick={() => void 일.맡기기(() => perfApi.suggestDevices(serviceId))}>
                {t('추천 받기')}
              </button>
            </>
          )}
        </div>
      ) : null}
      {기기들 === null ? (
        <span className="perf-faint">{t('기기 목록을 읽는 중입니다')}</span>
      ) : 기기들.length === 0 ? (
        <span className="perf-faint">{t('고를 수 있는 기기가 없습니다. 디바이스 팜이나 내 컴퓨터 테스트 실행기가 켜져 있는지 확인해 주세요')}</span>
      ) : (
        <div className="perf-table-box">
          <table className="perf-table" aria-label={t('측정 기기')}>
            <thead>
              <tr>
                <th>{t('선택')}</th>
                <th>{t('기기')}</th>
                <th>{t('위치')}</th>
                <th>{t('Android')}</th>
                <th>{t('상태')}</th>
              </tr>
            </thead>
            <tbody>
              {기기들.map((d) => {
                const 키 = 기기키(d);
                const 골랐나 = 고른.includes(키);
                const 막힘 = !쓰나 || !고를수(d) || (!골랐나 && 기기상한 <= 고른.length);
                return (
                  <tr key={키} className={고를수(d) ? undefined : 'pd-off'}>
                    <td>
                      <input
                        type="checkbox"
                        checked={골랐나}
                        disabled={막힘 && !골랐나}
                        aria-label={t('{기기} 선택', { 기기: d.model })}
                        onChange={() => 고침(골랐나 ? 고른.filter((x) => x !== 키) : [...고른, 키])}
                      />
                    </td>
                    <td>
                      {d.model} <span className="mono perf-faint">{d.serial}</span>
                    </td>
                    <td>{d.where === 'FARM' ? t('디바이스 팜') : t('내 컴퓨터')}</td>
                    <td className="mono">{d.os}</td>
                    <td>{d.status === 'BUSY' ? t('다른 실행에서 사용 중') : 팜만 && d.where === 'LOCAL' ? t('케이스로 잴 때는 디바이스 팜 폰만') : t('사용 가능')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <span className="perf-faint">{t('한 번에 {수}대까지 나란히 잽니다', { 수: 기기상한 })}</span>
    </section>
  );
}
