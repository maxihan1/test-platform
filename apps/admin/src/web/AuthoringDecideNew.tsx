// 결정 목록 「테스트 업데이트」 탭 항목 — 바뀐 요구 · 바뀐 API · 미검증 API(미검증 화면은 AuthoringDecideScreens.tsx) (도메인/작성 §3.6 「★ 결정 목록」 항목 표 · 「③ 은 열린 작성이 없을 때만」)
// AuthoringDecideItems.tsx 가 300줄을 넘어 뗐다

import { Fragment, type ReactNode } from 'react';

import type { EnvRow } from './api.js';
import { 고르개, 막힘줄, type 고름하기 } from './AuthoringDecideItems.js';
import type { 결정항목 } from './decideApi.js';
import { 다시쓸API, 바뀐요구수, 켜졌나, type 고른값 } from './decideView.js';
import { use말 } from './i18n.js';
import { 고른서버를적는다, 마지막서버 } from './layout.js';

type 항목of<K extends 결정항목['kind']> = Extract<결정항목, { kind: K }>;

/** ③ 묶음 한 항목의 머리 — 질문 · 볼 것 · 고르개 · 기다림 · 대상 서버 */
export function 새로만들기({
  service,
  x,
  고른,
  on고름,
  open,
  envs,
}: {
  service: string;
  x: 항목of<'PRD_CHANGED' | 'API_CHANGED' | 'APIS'>;
  고른: 고른값 | undefined;
  on고름: 고름하기;
  open: readonly number[];
  envs: readonly EnvRow[];
}) {
  const t = use말();
  let 질문: string;
  let 볼것: ReactNode = null;
  if (x.kind === 'PRD_CHANGED') {
    const 수 = 바뀐요구수(x);
    질문 = 수 === null ? t('기획서에서 변경된 요구의 테스트를 다시 만들까요?') : t('기획서에서 변경된 요구 {수}건의 테스트를 다시 만들까요?', { 수 });
    볼것 = <바뀐요구들 x={x} />;
  } else if (x.kind === 'API_CHANGED') {
    const 다시 = 다시쓸API(x);
    질문 =
      다시 === null
        ? t('API 문서가 버전 {앞} 에서 {뒤} 로 변경되었습니다. 변경된 API 의 테스트를 다시 만들까요?', { 앞: x.fromVersion, 뒤: x.toVersion })
        : t('API 문서가 버전 {앞} 에서 {뒤} 로 변경되었습니다. 변경된 API {수}건의 테스트를 다시 만들까요?', { 앞: x.fromVersion, 뒤: x.toVersion, 수: 다시.length });
    볼것 =
      x.operations === null ? null : (
        <ul className="decide-list">
          {x.operations.map((o) => (
            <li key={`${o.method} ${o.path}`}>
              <span className="case-tag">{{ NEW: t('새 항목'), CHANGED: t('변경'), REMOVED: t('지움') }[o.change]}</span> <span className="prd-id">{o.method} {o.path}</span>
              {o.breaking ? <span className="hint"> · {t('기존 테스트가 실패할 수 있음')}</span> : null}
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
  // 대상 서버는 API 다시 작성만 고른다(미검증 화면은 AuthoringDecideScreens.tsx). 실서비스 서버는 서버가 BAD_PICK 으로 막는다
  // 열린 작성이 있으면 서버가 셈을 null 로 준다 — 반영 대기만 남았으면 고를 수 있지만 숫자는 반영 뒤에 센다
  const 셈모름 = x.kind === 'PRD_CHANGED' ? 바뀐요구수(x) === null : x.kind === 'API_CHANGED' ? x.operations === null : x.apis === null;
  const 서버필요 = x.kind === 'API_CHANGED';
  const 서버고름 = 서버필요 && 고른 !== undefined;
  const 켜짐 = 켜졌나(x);
  return (
    <div className="decide-item">
      <span className="decide-q">{질문}</span>
      {x.needsApply === true && 셈모름 ? <small className="hint">{t('몇 건인지는 승인한 테스트가 반영된 뒤에 집계합니다')}</small> : null}
      {볼것}
      <고르개
        x={x}
        고른={고른}
        on고름={on고름}
        글들={[
          ['REDO', t('재작성')],
        ]}
        꺼짐={!켜짐}
        // 대상 서버는 마지막에 고른 것을 미리 고른다 — 다른 실행 창과 같다(⑫-2). 안 고른 채면 진행에 안 들어간다
        처음값={서버필요 ? { env: 마지막서버(service, envs) } : {}}
      />
      {켜짐 ? null : <small className="hint">{t('승인 대기를 먼저 처리해 주세요')}</small>}
      {!서버고름 ? null : (
        <label className="decide-text">
          {t('대상 서버')}
          <select
            value={고른.env ?? ''}
            onChange={(e) => {
              고른서버를적는다(service, e.target.value);
              on고름(x.key, { ...고른, env: e.target.value });
            }}
          >
            <option value="">{t('서버 선택')}</option>
            {envs.map((e) => (
              <option key={e.env} value={e.env}>
                {e.env}
              </option>
            ))}
          </select>
          {(고른.env ?? '') === '' ? <small className="hint">{t('대상 서버를 선택하면 진행에 들어갑니다')}</small> : null}
        </label>
      )}
      {/* 미검증 API 는 고르개가 없어 서버가 까닭을 안 단다 — 열린 작성 때문에 못 센 것은 같은 줄로 알린다 */}
      <막힘줄 까닭={x.kind === 'APIS' && x.apis === null ? 'AUTHORING_OPEN' : x.blockedBy} open={open} />
    </div>
  );
}

function 바뀐요구들({ x }: { x: 항목of<'PRD_CHANGED'> }) {
  const t = use말();
  const 종류: [string, typeof x.changed][] = [
    [t('변경'), x.changed],
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
          {t('이번 반영으로 변경되거나 삭제될 수 있는 케이스를 쓰는 E2E 시나리오 {수}개', { 수: x.scenarios.length })}{' '}
          {x.scenarios.map((s, i) => (
            <Fragment key={s.id}>
              {i === 0 ? null : ' · '}
              <a href={`#/scenarios/${String(s.id)}`}>
                SC-{s.id} {s.name}
              </a>
            </Fragment>
          ))}
          {/* 병합 뒤 사라진 절차는 「확인 필요」, 지운 케이스는 「실행 불가」라 무엇을 할지까지 적는다 (작성 §3.6 「고친 요구만 다시 작성」) */}
          {' · '}
          {t('반영한 뒤 시험 실행으로 확인하고 삭제한 케이스는 다른 케이스로 변경합니다')}
        </small>
      )}
    </>
  );
}
