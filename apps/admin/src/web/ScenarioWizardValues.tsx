// E2E 마법사 본문 「값 연결」 — 로그인 이어받기 · 서비스 지도에서 찾은 값 연결 카드(맞아요 · 직접 수정 · 삭제) · 케이스 단계마다 입력값 (도메인/시나리오 §8.11 「마법사」)

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { ScenarioLink, ScenarioPart } from '@platform/kit';

import { use말, use언어 } from './i18n.js';
import { scenarioApi, type CasePartMaterial } from './scenarioApi.js';
import { ScenarioFields, 시작글자 } from './ScenarioFields.js';
import { ScenarioLinks } from './ScenarioLinks.js';
import { 조립값, type 재료들 } from './scenarioView.js';
import type { 케이스줄들 } from './ScenarioWizardSteps.js';
import { 가져올번호, 연결들, 연결상태, 연결열쇠, 이어받기처음, 제안합치기 } from './scenarioWizardView.js';
import { schemaToFields } from './schema.js';
import { Failed, Loading, message } from './ui.js';
import { useSavedInput } from './useSavedInput.js';
import { useServiceApis } from './useServiceApis.js';

type CasePart = Extract<ScenarioPart, { kind: 'case' }>;

/** 값 연결마다 화면이 들고 있는 것 — 제안의 한 줄 · JSON 경로를 AI 가 짐작했나 · 사람이 확인했나. 열쇠는 연결열쇠다 */
export interface 연결메모 {
  why: string;
  AI: boolean;
  확인: boolean;
}

export const 종류이름: Record<ScenarioLink['kind'], string> = {
  bind: '값 주입',
  block: '요청 차단',
  reuse: '이전 응답 재사용',
  rewrite: '수정 요청으로 변경',
};

interface Props {
  서비스: string;
  단계들: ScenarioPart[];
  set단계들: Dispatch<SetStateAction<ScenarioPart[]>>;
  재료: 재료들;
  케이스줄: 케이스줄들;
  메모: ReadonlyMap<string, 연결메모>;
  set메모: Dispatch<SetStateAction<Map<string, 연결메모>>>;
  지운: ReadonlySet<string>;
  on지움: (열쇠: string) => void;
  이어받기: boolean;
  on이어받기: (켬: boolean) => void;
}

export function 값연결칸(p: Props) {
  const t = use말();
  const 언어 = use언어();
  const [받음, set받음] = useState<'loading' | 'done' | { 오류: string }>('loading');
  // 펼친 카드는 자리로 기억한다 — 고치다 가져올 단계를 바꿔도 칸이 접히지 않게
  const [펼침, set펼침] = useState<ReadonlySet<string>>(new Set());
  const 지도 = useServiceApis(p.서비스, true);
  const { 서비스, 단계들: 보낸, set단계들, set메모, 지운 } = p;

  useEffect(() => {
    // 들어올 때마다 다시 받는다 — 앞 단계에서 단계를 바꿨을 수 있다. 이 단계에서는 차례가 안 바뀌어 받은 번호 그대로 단다
    let 끝 = false;
    scenarioApi.linkSuggestions({ service: 서비스, parts: 보낸 }).then(
      ({ items }) => {
        if (끝) return;
        set단계들((앞) => 제안합치기(앞, items, 지운));
        set메모((앞) => {
          const 새 = new Map(앞);
          for (const s of items) {
            const 열쇠 = 연결열쇠(보낸, s.toSeq, s.link);
            if (!새.has(열쇠)) 새.set(열쇠, { why: s.why, AI: false, 확인: false });
          }
          return 새;
        });
        set받음('done');
      },
      (err: unknown) => {
        if (!끝) set받음({ 오류: message(err, 언어) });
      },
    );
    return () => {
      끝 = true;
    };
    // 들어올 때 한 번만 묻는다. 받은 제안을 달면 단계들이 바뀌는데 그때 또 물으면 끝없이 돈다
  }, []);

  const 이름 = (번호: number | null) => {
    const s = 번호 === null ? undefined : p.단계들[번호 - 1];
    return s?.kind === 'case' ? (p.케이스줄.get(s.tcId)?.name ?? p.재료.get(s.tcId)?.name ?? s.tcId) : '';
  };
  const 단계고침 = (번호: number, 고침: (s: CasePart) => CasePart) =>
    set단계들((앞) => 앞.map((s, i) => (i === 번호 - 1 && s.kind === 'case' ? 고침(s) : s)));
  const 처음 = 이어받기처음(p.단계들, p.재료);
  const 목록 = 연결들(p.단계들);

  return (
    <div className="scw-values">
      <section className="scw-sec">
        <button type="button" role="switch" aria-checked={p.이어받기} className="scn-switch" onClick={() => p.on이어받기(!p.이어받기)}>
          <span className="scn-switch-track" aria-hidden="true" />
          {t('로그인 이어받기')}
        </button>
        {!p.이어받기 || 처음 === null ? null : (
          <p className="hint">
            {t('{번호}번 「{이름}」부터 끝까지 같은 계정으로 이어 갑니다. 뒤 단계의 로그인 사전 단계는 건너뜁니다', { 번호: 처음, 이름: 이름(처음) })}
          </p>
        )}
      </section>

      <section className="scw-sec" aria-label={t('값 연결')}>
        <h3 className="scw-sec-h">{받음 === 'done' ? t('값 연결 {수}곳 찾음', { 수: 목록.length }) : t('값 연결')}</h3>
        {받음 === 'loading' ? (
          <Loading />
        ) : typeof 받음 === 'object' ? (
          <Failed error={받음.오류} />
        ) : 목록.length === 0 ? (
          <p className="hint">{t('넘길 값이 없습니다. 단계끼리 값을 주고받지 않는 흐름입니다')}</p>
        ) : (
          <ul className="scw-links">
            {목록.map(({ 받는번호, link, 자리 }) => {
              const 열쇠 = 연결열쇠(p.단계들, 받는번호, link);
              const 메모 = p.메모.get(열쇠);
              const 상태 = 연결상태(p.단계들, 받는번호, link);
              const 앞 = 가져올번호(link);
              const 칸자리 = `${받는번호}-${자리}`;
              const 받는 = p.단계들[받는번호 - 1] as CasePart;
              const 열림 = 펼침.has(칸자리) || 상태 === 'blank';
              const 경로빔 = (link.kind === 'bind' ? link.value.jsonPath : link.kind === 'rewrite' ? link.to.value.jsonPath : 'x').trim() === '';
              return (
                <li key={칸자리} className={메모?.확인 === true ? 'scw-link ok' : 'scw-link'}>
                  <div className="scw-link-h">
                    <span className="case-tag">{t('{번호}번 {이름}', { 번호: 받는번호, 이름: 이름(받는번호) })}</span>
                    {앞 === null ? null : (
                      <>
                        <span aria-hidden="true">←</span>
                        <span className="case-tag">{t('{번호}번 {이름}', { 번호: 앞, 이름: 이름(앞) })}</span>
                      </>
                    )}
                    <span className={상태 === 'gone' ? 'err scw-link-st' : 'hint scw-link-st'}>
                      {t(상태 === 'gone' ? '가져올 단계가 삭제됐습니다' : 메모?.확인 === true ? '확인함' : '확인 필요')}
                    </span>
                  </div>
                  {메모 === undefined || 메모.why === '' ? null : <p className="scw-link-why">{메모.why}</p>}
                  <span className="hint">
                    {t('서비스 지도에서 찾았습니다 · 종류 「{종류}」', { 종류: t(종류이름[link.kind]) })}
                    {메모?.AI === true ? ` · ${t('JSON 경로는 AI 가 짐작했습니다')}` : null}
                  </span>
                  <div className="scw-link-acts">
                    <button
                      type="button"
                      className={메모?.확인 === true ? 'btn ghost' : 'btn'}
                      onClick={() => set메모((m) => new Map(m).set(열쇠, { why: '', AI: false, ...메모, 확인: 메모?.확인 !== true }))}
                    >
                      {t(메모?.확인 === true ? '확인 취소' : '맞아요')}
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      aria-expanded={열림}
                      onClick={() =>
                        set펼침((앞) => {
                          const 새 = new Set(앞);
                          if (새.has(칸자리)) 새.delete(칸자리);
                          else 새.add(칸자리);
                          return 새;
                        })
                      }
                    >
                      {t('직접 수정')}
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        p.on지움(열쇠);
                        단계고침(받는번호, (s) => ({ ...s, links: (s.links ?? []).filter((_, j) => j !== 자리) }));
                      }}
                    >
                      {t('삭제')}
                    </button>
                  </div>
                  {!열림 ? null : (
                    <div className="scw-link-edit">
                      {경로빔 ? <p className="hint">{t('앞 단계 응답에서 꺼낼 값의 경로를 적습니다 · 예: id, data.id')}</p> : null}
                      {link.kind === 'bind' && link.param.trim() === '' ? <p className="hint">{t('값을 넣을 입력값 칸을 고릅니다')}</p> : null}
                      <ScenarioLinks
                        번호={받는번호}
                        단계={받는}
                        단계들={p.단계들}
                        재료={p.재료}
                        쓰나
                        지도={지도}
                        한칸={자리}
                        on바꿈={(links) => 단계고침(받는번호, (s) => ({ ...s, links }))}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="scw-sec" aria-label={t('입력값')}>
        <h3 className="scw-sec-h">{t('입력값')}</h3>
        <ul className="scw-inputs">
          {p.단계들.map((s, i) =>
            s.kind !== 'case' ? null : (
              <입력줄 key={`${i + 1}-${s.tcId}`} 번호={i + 1} 단계={s} 이름={이름(i + 1)} 케이스={p.재료.get(s.tcId)} on바꿈={(새) => 단계고침(i + 1, () => 새)} />
            ),
          )}
        </ul>
      </section>
    </div>
  );
}

function 입력줄({
  번호,
  단계,
  이름,
  케이스,
  on바꿈,
}: {
  번호: number;
  단계: CasePart;
  이름: string;
  케이스: CasePartMaterial | null | undefined;
  on바꿈: (새: CasePart) => void;
}) {
  const t = use말();
  const [펼침, set펼침] = useState(false);
  const 칸들 = useMemo(() => (케이스 == null ? [] : schemaToFields(케이스.paramSchema)), [케이스]);
  const 꽂는칸 = (단계.links ?? []).flatMap((l) => (l.kind === 'bind' ? [l.param] : []));
  const 직접 = Object.keys(단계.params).length;
  const 저장값 = 칸들.filter((f) => !(f.key in 단계.params) && !꽂는칸.includes(f.key)).length;
  return (
    <li className="scw-input">
      <div className="scw-input-h">
        <span className="scw-t">
          <b>{t('{번호}번 {이름}', { 번호, 이름 })}</b>
          <span className="scw-to">
            {케이스 === undefined
              ? ''
              : 케이스 === null
                ? t('케이스를 찾지 못했습니다')
                : 칸들.length === 0
                  ? t('입력값 없음')
                  : [t('저장값 {수}개', { 수: 저장값 }), ...(직접 === 0 ? [] : [t('입력값 {수}칸 직접 입력', { 수: 직접 })])].join(' · ')}
          </span>
        </span>
        {케이스 == null || 칸들.length === 0 ? null : (
          <button type="button" className="btn ghost" aria-expanded={펼침} aria-label={t('{번호}번 입력값 바꾸기', { 번호 })} onClick={() => set펼침(!펼침)}>
            {t('바꾸기')}
          </button>
        )}
      </div>
      {!펼침 || 케이스 == null ? null : <입력칸 번호={번호} 단계={단계} 케이스={케이스} on바꿈={on바꿈} />}
    </li>
  );
}

// 펼 때만 저장값을 받는다 — 단계마다 미리 다 부르지 않는다
function 입력칸({ 번호, 단계, 케이스, on바꿈 }: { 번호: number; 단계: CasePart; 케이스: CasePartMaterial; on바꿈: (새: CasePart) => void }) {
  const t = use말();
  const 저장 = useSavedInput(단계.tcId);
  const 칸들 = useMemo(() => schemaToFields(케이스.paramSchema), [케이스]);
  const 실제 = useMemo(() => (저장 === null ? undefined : schemaToFields(케이스.paramSchema, 저장.params, 저장.savedSecrets.params)), [케이스, 저장]);
  // 쓰는 중인 `1.` 이 안 날아가게 글자를 여기서 든다 — 조립 화면 설정 패널과 같다
  const [글, set글] = useState(() => 시작글자(칸들, 단계.params));
  const 잠금: Record<string, number> = {};
  for (const l of 단계.links ?? []) if (l.kind === 'bind') 잠금[l.param] = l.value.fromSeq;
  return (
    <div className="scw-input-body">
      <ScenarioFields
        idPrefix={`scw-in-${번호}`}
        fields={칸들}
        실제={실제}
        글={글}
        잠금={잠금}
        잠글까={false}
        on칸={(key, 값) => {
          const 새글 = { ...글, [key]: 값 };
          set글(새글);
          on바꿈({ ...단계, params: 조립값(칸들, 새글) });
        }}
      />
      <p className="hint">{t('바꿀 값만 적습니다 · 나머지는 저장값 그대로')}</p>
    </div>
  );
}
