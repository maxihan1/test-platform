// 호환성 세트의 디바이스 선택 상자 — 거르는 칩 · 검색 · 같은 모델은 1대만 · 사용 가능만 · 디바이스 표 (도메인/호환성 §8.17 ②-1)

import { useState } from 'react';

import type { CompatDevice, CompatSetDevice } from './compatApi.js';
import { 같은모델들, 디바이스요약글, 모델별하나만, 상태글자, 안드로이드, 요약, 인치글, 잠겼나, 해상도글, 형태글자, 형태로, type 형태 } from './compatView.js';
import { use말 } from './i18n.js';
import { Modal } from './Modal.js';

const 상태칸: Record<CompatDevice['state'], string> = { IDLE: 'compat-idle', OCCUPIED: 'compat-busy', MAINTENANCE: 'compat-off', OFFLINE: 'compat-off' };

/** 칩 한 줄 — 전체 하나와 값마다 하나. 하나만 고른다 */
function 칩줄<T extends string | number>({ 이름, 값들, 고른, 고침, 글 }: { 이름: string; 값들: T[]; 고른: T | null; 고침: (v: T | null) => void; 글: (v: T) => string }) {
  const t = use말();
  return (
    <div className="compat-chips" role="group" aria-label={이름}>
      <span>{이름}</span>
      <button type="button" className="compat-chip" aria-pressed={고른 === null} onClick={() => 고침(null)}>
        {t('전체')}
      </button>
      {값들.map((v) => (
        <button key={String(v)} type="button" className="compat-chip" aria-pressed={고른 === v} onClick={() => 고침(v)}>
          {글(v)}
        </button>
      ))}
    </div>
  );
}

export function CompatDevicePick({
  목록,
  처음고른,
  빠진,
  처음모델별,
  닫기,
  완료,
}: {
  목록: CompatDevice[];
  처음고른: string[];
  /** 세트에 있지만 팜 등록에서 빠진 디바이스. 목록에 없어도 여기서 뺄 수 있어야 한다 — 안 그러면 세트에서 영영 못 지운다 */
  빠진: CompatSetDevice[];
  처음모델별: boolean;
  닫기: () => void;
  완료: (고른: string[], 모델별: boolean) => void;
}) {
  const t = use말();
  const [고른, set고른] = useState<string[]>(처음고른);
  const [모델별, set모델별] = useState(처음모델별);
  const [가능만, set가능만] = useState(false);
  const [찾기, set찾기] = useState('');
  const [제조사, set제조사] = useState<string | null>(null);
  const [버전, set버전] = useState<number | null>(null);
  const [형, set형] = useState<형태 | null>(null);

  const 고른칸 = new Set(고른);
  // 등록에서 빠진 디바이스도 모델을 안다(세트 사본) — 같은 모델 둘을 서버가 거절하지 않게 같이 본다
  const 모델표 = [...목록, ...빠진];
  const 같은 = 모델별 ? 같은모델들(목록, 고른칸) : new Set<string>();
  const 고를수 = (d: CompatDevice) => !잠겼나(d) && !같은.has(d.serial);
  const 낱말 = 찾기.trim().toLowerCase();
  const 보일것 = 목록.filter(
    (d) =>
      (!가능만 || d.state === 'IDLE') &&
      (제조사 === null || d.manufacturer === 제조사) &&
      (버전 === null || 안드로이드(d.os) === 버전) &&
      (형 === null || 형태로(d) === 형) &&
      (낱말 === '' || `${d.marketName ?? ''} ${d.model}`.toLowerCase().includes(낱말)),
  );
  const 고를것 = 보일것.filter(고를수);
  const 다골랐나 = 고를것.length > 0 && 고를것.every((d) => 고른칸.has(d.serial));
  // 고른 차례가 실행 순서다 (§3.13 「호환성 세트」) — 새로 고른 것은 뒤에 붙는다
  const 바꾸기 = (serial: string, 켬: boolean) => set고른((앞) => (켬 ? [...앞, serial] : 앞.filter((s) => s !== serial)));
  const 고른디바이스 = 목록.filter((d) => 고른칸.has(d.serial));
  const 제조사들 = [...new Set(목록.map((d) => d.manufacturer).filter((m) => m !== ''))].sort();
  const 버전들 = [...new Set(목록.flatMap((d) => { const v = 안드로이드(d.os); return v === null ? [] : [v]; }))].sort((a, b) => b - a);

  return (
    <Modal
      제목={t('디바이스 선택')}
      onClose={닫기}
      바깥눌러닫기={false}
      버튼={
        <>
          <span className="compat-pick-sum">
            {/* 원격 접기가 없어 폴더블도 상태 하나다 — 점검 상태 수 = 디바이스 수 (§3.13 「디바이스 · 점검 상태」) */}
            <b>{t('{대}대 선택 · 점검 상태 {상태}개', { 대: 고른.length, 상태: 고른.length })}</b>
            {고른.length === 0 ? null : <span className="compat-faint"> {디바이스요약글(요약(고른디바이스), t).join(' · ')}</span>}
          </span>
          <button type="button" className="btn ghost" onClick={닫기}>
            {t('취소')}
          </button>
          <button type="button" className="btn" onClick={() => 완료(모델별 ? 모델별하나만(모델표, 고른) : 고른, 모델별)}>
            {t('선택 완료')}
          </button>
        </>
      }
    >
      <div className="compat-pick">
        <p className="compat-faint">{t('Device VISION 등록 디바이스 {수}대', { 수: 목록.length })}</p>
        <div className="compat-pick-tools">
          <input type="search" aria-label={t('기종 · 모델 검색')} placeholder={t('기종 · 모델 검색')} value={찾기} onChange={(e) => set찾기(e.target.value)} />
          <label>
            <input
              type="checkbox"
              checked={모델별}
              onChange={(e) => {
                set모델별(e.target.checked);
                if (e.target.checked) set고른((앞) => 모델별하나만(모델표, 앞));
              }}
            />
            {t('같은 모델은 1대만')}
          </label>
          <label>
            <input type="checkbox" checked={가능만} onChange={(e) => set가능만(e.target.checked)} />
            {t('사용 가능만')}
          </label>
        </div>
        <div className="compat-pick-chips">
          <칩줄 이름={t('제조사')} 값들={제조사들} 고른={제조사} 고침={set제조사} 글={(v) => v} />
          <칩줄 이름="Android" 값들={버전들} 고른={버전} 고침={set버전} 글={(v) => String(v)} />
          <칩줄 이름={t('형태')} 값들={['phone', 'foldable', 'tablet'] as 형태[]} 고른={형} 고침={set형} 글={(v) => t(형태글자[v])} />
        </div>
        <div className="compat-pick-table">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label={t('보이는 디바이스 모두 선택')}
                    checked={다골랐나}
                    disabled={고를것.length === 0}
                    onChange={(e) => {
                      const 켬 = e.target.checked;
                      // 같은 모델은 1대만이면 보이는 것 가운데서도 모델마다 하나만 더한다
                      set고른((앞) => {
                        if (!켬) return 앞.filter((s) => !고를것.some((d) => d.serial === s));
                        const 더 = [...앞, ...고를것.map((d) => d.serial).filter((s) => !앞.includes(s))];
                        return 모델별 ? 모델별하나만(모델표, 더) : 더;
                      });
                    }}
                  />
                </th>
                <th>{t('기종')}</th>
                <th>{t('모델')}</th>
                <th>{t('제조사')}</th>
                <th>Android</th>
                <th>{t('해상도')}</th>
                <th>{t('밀도')}</th>
                <th>{t('화면')}</th>
                <th>{t('형태')}</th>
                <th>{t('상태')}</th>
              </tr>
            </thead>
            <tbody>
              {빠진.map((d) => (
                <tr key={d.serial} className="dim">
                  <td>
                    <input type="checkbox" aria-label={`${d.name} ${d.model}`} checked={고른칸.has(d.serial)} onChange={(e) => 바꾸기(d.serial, e.target.checked)} />
                  </td>
                  <td>
                    <b>{d.name}</b>
                  </td>
                  <td className="mono">{d.model}</td>
                  <td colSpan={6}>-</td>
                  <td>
                    <span className="compat-off">{t('등록에서 빠짐')}</span>
                  </td>
                </tr>
              ))}
              {보일것.length === 0 && 빠진.length === 0 ? (
                <tr>
                  <td colSpan={10} className="compat-faint">
                    {t('조건에 맞는 디바이스가 없습니다')}
                  </td>
                </tr>
              ) : (
                보일것.map((d) => {
                  const 흐림 = !고를수(d);
                  const 기종 = d.marketName ?? '-';
                  return (
                    <tr key={d.serial} className={흐림 ? 'dim' : undefined}>
                      <td>
                        {/* 골라 둔 뒤 점검 중이 된 디바이스도 뺄 수는 있어야 한다 */}
                        <input type="checkbox" aria-label={`${기종} ${d.model}`} checked={고른칸.has(d.serial)} disabled={흐림 && !고른칸.has(d.serial)} onChange={(e) => 바꾸기(d.serial, e.target.checked)} />
                      </td>
                      <td>
                        <b>{기종}</b>
                        {같은.has(d.serial) ? <span className="compat-dup">{t('같은 모델')}</span> : null}
                      </td>
                      <td className="mono">{d.model}</td>
                      <td>{d.manufacturer || '-'}</td>
                      <td className="mono">{d.os || '-'}</td>
                      <td className="mono">{해상도글(d) || '-'}</td>
                      <td className="mono">{d.density ?? '-'}</td>
                      <td className="mono">{인치글(d)}</td>
                      <td>{t(형태글자[형태로(d)])}</td>
                      <td>
                        <span className={상태칸[d.state]}>{t(상태글자[d.state])}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
