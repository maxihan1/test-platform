// 정기 실행 마법사 2단계 「담을 테스트」 — 기능 · UI · E2E · 호환성 탭, 애플리케이션 선택, 케이스 검색 · 체크, 담은 테스트 목록 (도메인/정기실행 §8.20)

import { useEffect, useState } from 'react';

import { api, type ServiceRow } from './api.js';
import { use말 } from './i18n.js';
import type { 줄종류 } from './schedApi.js';
import { 줄열쇠, type 담은줄, type 후보 } from './schedForm.js';
import { Failed, Loading, useAsync } from './ui.js';

type 말 = ReturnType<typeof use말>;
const 탭이름: Record<줄종류, string> = { FN: '기능 테스트', UI: 'UI 테스트', E2E: 'E2E 테스트', COMPAT: '호환성 테스트' };

/** 기능 · UI 줄 이름 — 서버의 줄 이름(sched/check.ts 줄이름)과 같은 꼴을 화면 언어로 */
export function 줄글(x: 담은줄, t: 말): string {
  if (x.kind === 'E2E' || x.kind === 'COMPAT') return x.label;
  if (x.tcIds === null) return t(x.kind === 'FN' ? '기능 전체' : 'UI 전체');
  return x.tcIds.length === 1 ? x.tcIds[0]! : t('{번호} 외 {수}건', { 번호: x.tcIds[0]!, 수: x.tcIds.length - 1 });
}

function 케이스목록({ 앱, kind, 줄, on줄 }: { 앱: string; kind: 'FN' | 'UI'; 줄: 담은줄 | undefined; on줄: (tcIds: string[] | null) => void }) {
  const t = use말();
  const [q, setQ] = useState('');
  // 글자마다 묻지 않고 입력이 0.3초 멈추면 묻는다
  const [찾을, set찾을] = useState('');
  useEffect(() => {
    const 타이머 = setTimeout(() => set찾을(q.trim()), 300);
    return () => clearTimeout(타이머);
  }, [q]);
  const 쪽 = useAsync(() => api.cases({ service: 앱, kind, q: 찾을 === '' ? undefined : 찾을, page: 1 }), [앱, kind, 찾을]);
  const 전체 = 줄?.tcIds === null;
  const 고른 = new Set(줄?.tcIds ?? []);
  const 누름 = (tcId: string) => {
    const 다음 = new Set(고른);
    if (다음.has(tcId)) 다음.delete(tcId);
    else 다음.add(tcId);
    on줄(다음.size === 0 ? null : [...다음]);
  };
  return (
    <>
      <input className="sched-wiz-search" type="search" placeholder={t('번호 · 이름으로 검색')} value={q} disabled={전체} onChange={(e) => setQ(e.target.value)} />
      {쪽.error !== null ? <Failed error={쪽.error} /> : 쪽.data === null ? <Loading /> : null}
      <ul className="sched-wiz-cases">
        {(쪽.data?.items ?? []).map((c) => (
          <li key={c.tcId}>
            <label>
              <input type="checkbox" checked={전체 || 고른.has(c.tcId)} disabled={전체} onChange={() => 누름(c.tcId)} />
              <span className="mono">{c.tcId}</span> {c.name}
            </label>
          </li>
        ))}
      </ul>
      {쪽.data !== null && 쪽.data.total > 쪽.data.items.length ? (
        <small className="sched-wiz-hint">{t('{전체}건 중 {수}건을 표시합니다. 검색어로 범위를 좁혀 주세요', { 전체: 쪽.data.total, 수: 쪽.data.items.length })}</small>
      ) : null}
    </>
  );
}

export function 담기단계({ 후, 앱들, items, onItems }: { 후: 후보; 앱들: readonly ServiceRow[]; items: 담은줄[]; onItems: (items: 담은줄[]) => void }) {
  const t = use말();
  // 수정으로 열면 첫 줄의 탭 · 애플리케이션부터 보인다 — 안 그러면 담은 것이 없는 것처럼 빈 체크가 보인다
  const [탭, set탭] = useState<줄종류>(items[0]?.kind ?? 'FN');
  // UI 탭에는 API 애플리케이션이 없다 (§3.16 결정 2)
  const 고를앱들 = 후.services.filter((s) => 탭 !== 'UI' || s.kind !== 'API');
  const [고른앱, set고른앱] = useState<string | null>(items[0]?.service ?? null);
  const 앱 = 고를앱들.some((s) => s.prefix === 고른앱) ? 고른앱! : (고를앱들[0]?.prefix ?? null);
  const 앱정보 = 후.services.find((s) => s.prefix === 앱);
  const 열쇠들 = new Set(items.map(줄열쇠));

  const 넣기 = (x: 담은줄) => onItems(열쇠들.has(줄열쇠(x)) ? items.filter((y) => 줄열쇠(y) !== 줄열쇠(x)) : [...items, x]);
  /** 기능 · UI 한 줄을 갈아 끼운다 — tcIds 가 null 이면 「전체」, 빈 고름이면 줄을 뺀다 */
  const 케이스줄 = (kind: 'FN' | 'UI', service: string, tcIds: string[] | null | undefined) => {
    const 남은 = items.filter((y) => 줄열쇠(y) !== `${kind}|${service}`);
    onItems(tcIds === undefined ? 남은 : [...남은, { kind, service, tcIds, label: '' }]);
  };
  // 케이스 목록 통로는 케이스 read 가 있어야 한다 — 없으면 「전체」만 (§3.16 「세트」)
  const 케이스보나 = (앱들.find((s) => s.prefix === 앱)?.permissions.cases ?? 'none') !== 'none';
  const 지금줄 = items.find((y) => 줄열쇠(y) === `${탭}|${앱 ?? ''}`);

  return (
    <div className="sched-wiz-pick">
      <div className="sched-seg" role="tablist" aria-label={t('담을 테스트')}>
        {(['FN', 'UI', 'E2E', 'COMPAT'] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={탭 === k} aria-pressed={탭 === k} onClick={() => set탭(k)}>
            {t(탭이름[k])}
          </button>
        ))}
      </div>
      {탭 === 'E2E' ? null : (
        <label className="authoring-field">
          <span>{t('애플리케이션')}</span>
          <select value={앱 ?? ''} onChange={(e) => set고른앱(e.target.value)}>
            {고를앱들.map((s) => (
              <option key={s.prefix} value={s.prefix}>
                {s.prefix} {s.name}
                {s.kind === 'API' ? ' · API' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {(탭 === 'FN' || 탭 === 'UI') && 앱 !== null && 앱정보 !== undefined ? (
        <>
          <label className="sched-wiz-all">
            <input type="checkbox" checked={지금줄?.tcIds === null} onChange={(e) => 케이스줄(탭, 앱, e.target.checked ? null : undefined)} />
            <span>
              <strong>{t('전체 {수}건', { 수: 탭 === 'FN' ? 앱정보.fn : 앱정보.ui })}</strong>
              <small>{t('실행할 때의 활성 케이스 전부입니다. 신규 케이스도 들어갑니다')}</small>
            </span>
          </label>
          {케이스보나 ? <케이스목록 key={`${탭}|${앱}`} 앱={앱} kind={탭} 줄={지금줄} on줄={(ids) => 케이스줄(탭, 앱, ids ?? undefined)} /> : null}
        </>
      ) : null}
      {탭 === 'E2E' ? (
        <ul className="sched-wiz-cases">
          {후.scenarios.map((s) => (
            <li key={s.id}>
              <label>
                <input type="checkbox" checked={열쇠들.has(`E2E|${String(s.id)}`)} onChange={() => 넣기({ kind: 'E2E', service: s.service, tcIds: null, scenarioId: s.id, label: s.name })} />
                {s.name}
                {/* 저장은 되고 돌 때 빠진다(§3.16 「돌 때 빠지는 줄」) — 담기 전에 알린다 */}
                {s.runnable ? null : <span className="sched-tag">{t('실행 불가')}</span>}
                {s.path.map((p) => (
                  <span key={p} className="sched-tag">
                    {p}
                  </span>
                ))}
              </label>
            </li>
          ))}
          {후.scenarios.length === 0 ? <li className="sched-wiz-hint">{t('이 프로젝트에 E2E 시나리오가 없습니다')}</li> : null}
        </ul>
      ) : null}
      {탭 === 'COMPAT' ? (
        <ul className="sched-wiz-cases">
          {후.compatSets
            .filter((c) => c.service === 앱)
            .map((c) => (
              <li key={c.id}>
                <label>
                  <input type="checkbox" checked={열쇠들.has(`COMPAT|${String(c.id)}`)} onChange={() => 넣기({ kind: 'COMPAT', service: c.service, tcIds: null, compatSetId: c.id, label: c.name })} />
                  {c.name}
                </label>
              </li>
            ))}
          {후.compatSets.every((c) => c.service !== 앱) ? <li className="sched-wiz-hint">{t('이 애플리케이션에 호환성 세트가 없습니다')}</li> : null}
        </ul>
      ) : null}
      <section className="sched-wiz-basket" aria-label={t('담은 테스트')}>
        <h4>{t('담은 테스트 {수}개', { 수: items.length })}</h4>
        <ul>
          {items.map((x) => (
            <li key={줄열쇠(x)}>
              <span className="sched-app">{x.service}</span>
              <span>
                {t({ FN: '기능', UI: 'UI', E2E: 'E2E', COMPAT: '호환성' }[x.kind])} · {줄글(x, t)}
              </span>
              <button type="button" className="sched-link" aria-label={t('제거')} onClick={() => onItems(items.filter((y) => 줄열쇠(y) !== 줄열쇠(x)))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
