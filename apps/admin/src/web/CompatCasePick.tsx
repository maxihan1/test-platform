// 호환성 세트의 「케이스 추가」 창 — 폰에서 도는 활성 케이스를 찾아 여러 건 고른다 (도메인/호환성 §8.17 ② · §3.13 「자동 선택」 고를 수 있는 케이스)

import { useEffect, useState } from 'react';

import { api, type CaseRow, type Platform } from './api.js';
import { use말 } from './i18n.js';
import { Modal } from './Modal.js';
import { Failed, Loading, useAsync } from './ui.js';

export function CompatCasePick({
  service,
  platform,
  이미,
  닫기,
  완료,
}: {
  service: string;
  /** 웹은 모바일 웹(실제 폰 Chrome), 앱 · 게임은 Android 케이스만 호환성에서 돈다 */
  platform: Platform;
  /** 자동 선택 · 직접 추가에 이미 든 케이스. 목록에서 뺀다 */
  이미: ReadonlySet<string>;
  닫기: () => void;
  완료: (고른: CaseRow[]) => void;
}) {
  const t = use말();
  const [찾기, set찾기] = useState('');
  // 글자마다 부르지 않는다 — 치기를 멈추고 0.3초 뒤에 찾는다
  const [찾을말, set찾을말] = useState('');
  useEffect(() => {
    const 잠시 = window.setTimeout(() => set찾을말(찾기.trim()), 300);
    return () => window.clearTimeout(잠시);
  }, [찾기]);
  const [고른, set고른] = useState<CaseRow[]>([]);
  const 목록 = useAsync(() => api.cases({ service, platform, q: 찾을말, page: 1 }), [service, platform, 찾을말]);
  const 줄들 = (목록.data?.items ?? []).filter((c) => !이미.has(c.tcId));
  const 골랐나 = (tcId: string) => 고른.some((c) => c.tcId === tcId);

  return (
    <Modal
      제목={t('케이스 추가')}
      onClose={닫기}
      바깥눌러닫기={false}
      버튼={
        <>
          <button type="button" className="btn ghost" onClick={닫기}>
            {t('취소')}
          </button>
          <button type="button" className="btn" disabled={고른.length === 0} onClick={() => 완료(고른)}>
            {t('{수}건 추가', { 수: 고른.length })}
          </button>
        </>
      }
    >
      <div className="compat-case-pick">
        <input type="search" aria-label={t('케이스 번호 · 이름 검색')} placeholder={t('케이스 번호 · 이름 검색')} value={찾기} onChange={(e) => set찾기(e.target.value)} />
        {목록.error !== null ? (
          <Failed error={목록.error} />
        ) : 목록.data === null ? (
          <Loading />
        ) : 줄들.length === 0 ? (
          <p className="compat-faint">{t('더할 수 있는 케이스가 없습니다')}</p>
        ) : (
          <ul>
            {줄들.map((c) => (
              <li key={c.tcId}>
                <label>
                  <input
                    type="checkbox"
                    checked={골랐나(c.tcId)}
                    onChange={(e) => set고른((앞) => (e.target.checked ? [...앞, c] : 앞.filter((x) => x.tcId !== c.tcId)))}
                  />
                  <span className="mono">{c.tcId}</span>
                  <span>{c.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {/* 한 쪽(50건)만 보인다 — 더 있으면 찾기로 좁힌다 */}
        {목록.data !== null && 목록.data.total > 목록.data.items.length ? <p className="compat-faint">{t('{수}건 가운데 앞의 일부만 보입니다. 찾기로 좁혀 주세요', { 수: 목록.data.total })}</p> : null}
      </div>
    </Modal>
  );
}
