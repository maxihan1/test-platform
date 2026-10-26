// 결정 목록 ③ 「테스트를 새로 만들까요?」 항목 — 바뀐 요구 · 바뀐 API · 미검증 화면 · 미검증 API (도메인/작성 §3.6 「★ 결정 목록」 항목 표 · 「③ 은 열린 작성이 없을 때만」)
// AuthoringDecideItems.tsx 가 300줄을 넘어 뗐다

import { Fragment, type ReactNode } from 'react';

import { 로그인역할 } from '../prd/rules.js';
import type { EnvRow } from './api.js';
import { 고르개, 막힘줄, type 고름하기 } from './AuthoringDecideItems.js';
import type { 결정항목 } from './decideApi.js';
import { 다시쓸API, 바뀐요구수, type 고른값 } from './decideView.js';
import { use말 } from './i18n.js';

type 항목of<K extends 결정항목['kind']> = Extract<결정항목, { kind: K }>;

/** 크롤러가 적은 로그인 상태 「로그인:일반 회원」은 「일반 회원 로그인」으로 읽는다. 그 밖(「로그아웃」 등)은 그대로 */
function 상태글(state: string, t: ReturnType<typeof use말>): string {
  const 역할 = 로그인역할(state);
  return 역할 === null ? state : t('{역할} 로그인', { 역할 });
}

/** ③ 묶음 한 항목의 머리 — 질문 · 볼 것 · 고르개 · 기다림 · 대상 서버 */
export function 새로만들기({
  x,
  고른,
  on고름,
  open,
  envs,
  켜짐,
  같이,
}: {
  x: 항목of<'PRD_CHANGED' | 'API_CHANGED' | 'SCREENS' | 'APIS'>;
  고른: 고른값 | undefined;
  on고름: 고름하기;
  open: readonly number[];
  envs: readonly EnvRow[];
  /** ① 을 모두 「올린다」로 골랐나 — needsApply 항목만 본다 */
  켜짐: boolean;
  /** 문장을 바꾸는 고름이 있어 바뀐 요구가 같이 돈다 */
  같이: boolean;
}) {
  const t = use말();
  let 질문: string;
  let 볼것: ReactNode = null;
  if (x.kind === 'PRD_CHANGED') {
    const 수 = 바뀐요구수(x);
    질문 = 수 === null ? t('기획서에서 바뀐 요구의 테스트를 다시 만들까요?') : t('기획서에서 바뀐 요구 {수}건의 테스트를 다시 만들까요?', { 수 });
    볼것 = <바뀐요구들 x={x} />;
  } else if (x.kind === 'API_CHANGED') {
    const 다시 = 다시쓸API(x);
    질문 =
      다시 === null
        ? t('API 문서가 버전 {앞} 에서 {뒤} 로 바뀌었습니다. 바뀐 API 의 테스트를 다시 만들까요?', { 앞: x.fromVersion, 뒤: x.toVersion })
        : t('API 문서가 버전 {앞} 에서 {뒤} 로 바뀌었습니다. 바뀐 API {수}건의 테스트를 다시 만들까요?', { 앞: x.fromVersion, 뒤: x.toVersion, 수: 다시.length });
    볼것 =
      x.operations === null ? null : (
        <ul className="decide-list">
          {x.operations.map((o) => (
            <li key={`${o.method} ${o.path}`}>
              <span className="case-tag">{{ NEW: t('새 API'), CHANGED: t('바뀐 API'), REMOVED: t('없어진 API') }[o.change]}</span> <span className="prd-id">{o.method} {o.path}</span>
              {o.breaking ? <span className="hint"> · {t('기존 테스트가 실패할 수 있음')}</span> : null}
            </li>
          ))}
        </ul>
      );
  } else if (x.kind === 'SCREENS') {
    질문 = x.screens === null ? t('테스트가 확인하지 않은 화면의 테스트를 만들까요?') : t('테스트가 확인하지 않은 화면 {수}개의 테스트를 만들까요?', { 수: new Set(x.screens.map((s) => s.url)).size });
    // 같은 화면은 한 줄, 로그인 상태는 그 아래 (2026-10-26 시작 질문)
    const 화면별 = new Map<string, { name: string; states: string[] }>();
    for (const s of x.screens ?? []) {
      const 줄 = 화면별.get(s.url) ?? { name: '', states: [] };
      화면별.set(s.url, { name: 줄.name === '' ? s.name : 줄.name, states: [...줄.states, s.state] });
    }
    볼것 = (
      <ul className="decide-list">
        {[...화면별].map(([url, 줄]) => (
          <li key={url}>
            {줄.name === '' ? null : <>{줄.name} · </>}
            <span className="prd-id">{url}</span>
            <small className="hint decide-states">{줄.states.map((s) => 상태글(s, t)).join(' · ')}</small>
          </li>
        ))}
      </ul>
    );
  } else {
    질문 = x.apis === null ? t('테스트가 호출하지 않은 API') : t('테스트가 호출하지 않은 API {수}개', { 수: x.apis.length });
    볼것 = (
      <ul className="decide-list">
        {(x.apis ?? []).map((a) => (
          <li key={`${a.method} ${a.path}`}>{a.name ?? <span className="prd-id">{a.method} {a.path}</span>}</li>
        ))}
      </ul>
    );
  }
  // 대상 서버는 API 다시 작성 · 물려받을 대조가 없는 보완만 고른다. 실서비스 서버는 서버가 BAD_PICK 으로 막는다
  const 서버고름 = (x.kind === 'API_CHANGED' || (x.kind === 'SCREENS' && x.env === null)) && 고른 !== undefined && 고른.pick !== 'LATER';
  return (
    <div className="decide-item">
      <span className="decide-q">{질문}</span>
      {x.needsApply === true && 볼것 !== null && (x.kind === 'PRD_CHANGED' ? 바뀐요구수(x) === null : true) ? <small className="hint">{t('몇 건인지는 1번이 반영된 뒤에 셉니다')}</small> : null}
      {볼것}
      <고르개
        x={x}
        고른={같이 ? { pick: 'REDO' } : 고른}
        on고름={on고름}
        글들={[
          ['REDO', t('다시 만든다')],
          ['FIX', t('테스트 보완')],
        ]}
        꺼짐={!켜짐 || 같이}
        나중꺼짐={같이}
      />
      {켜짐 ? null : <small className="hint">{t('1번을 모두 「올린다」로 골라야 고를 수 있습니다')}</small>}
      {같이 ? <small className="hint">{t('기획서 문장이 바뀌어 바뀐 요구도 같이 다시 만듭니다')}</small> : null}
      {!서버고름 ? null : (
        <label className="decide-text">
          {t('대상 서버')}
          <select value={고른.env ?? ''} onChange={(e) => on고름(x.key, { ...고른, env: e.target.value })}>
            <option value="">{t('고르세요')}</option>
            {envs.map((e) => (
              <option key={e.env} value={e.env}>
                {e.env}
              </option>
            ))}
          </select>
        </label>
      )}
      <막힘줄 까닭={x.blockedBy} open={open} />
    </div>
  );
}

function 바뀐요구들({ x }: { x: 항목of<'PRD_CHANGED'> }) {
  const t = use말();
  const 종류: [string, typeof x.changed][] = [
    [t('바뀜'), x.changed],
    [t('새 항목'), x.added],
    [t('지움'), x.removed],
  ];
  return (
    <>
      <ul className="decide-list">
        {종류.flatMap(([이름, 줄들]) =>
          (줄들 ?? []).map((r) => (
            <li key={r.reqId}>
              <span className="case-tag">{이름}</span> <span className="prd-id">{r.reqId}</span> {r.text ?? r.oldText}
            </li>
          )),
        )}
      </ul>
      {x.scenarios.length === 0 ? null : (
        <small className="hint">
          {t('이번에 바뀌거나 지워질 수 있는 케이스를 쓰는 E2E 시나리오 {수}개', { 수: x.scenarios.length })}{' '}
          {x.scenarios.map((s, i) => (
            <Fragment key={s.id}>
              {i === 0 ? null : ' · '}
              <a href={`#/scenarios/${String(s.id)}`}>
                SC-{s.id} {s.name}
              </a>
            </Fragment>
          ))}
        </small>
      )}
    </>
  );
}
