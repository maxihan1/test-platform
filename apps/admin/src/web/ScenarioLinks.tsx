// 케이스 단계 설정의 값 연결 편집 — 값 주입 · 요청 차단 · 이전 응답 재사용 · 수정 요청으로 변경 (도메인/시나리오 §8.11)

import { useState } from 'react';
import type { ScenarioLink, ScenarioMethod, ScenarioPart, ScenarioResponseRef } from '@platform/kit';

import { use말 } from './i18n.js';
import { 글칸, 칸 } from './ScenarioOtherParts.js';
import type { 재료들 } from './scenarioView.js';
import { schemaToFields } from './schema.js';

type CasePart = Extract<ScenarioPart, { kind: 'case' }>;
type 종류 = ScenarioLink['kind'];

const 메서드들: ScenarioMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const 바꿀메서드들: Array<'PUT' | 'PATCH'> = ['PUT', 'PATCH'];
const 종류이름: Record<종류, string> = {
  bind: '값 주입',
  block: '요청 차단',
  reuse: '이전 응답 재사용',
  rewrite: '수정 요청으로 변경',
};
const 종류들: 종류[] = ['bind', 'block', 'reuse', 'rewrite'];
const 앞이필요한종류 = new Set<종류>(['bind', 'reuse', 'rewrite']);

// 서버 조립 검사(scenario/validate.ts)의 API 경로 규칙과 같다
function 바른경로(글: string): boolean {
  if (!글.startsWith('/') || 글.startsWith('//')) return false;
  return ![...글].some((c) => c === '\\' || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
}

function 메서드칸<M extends ScenarioMethod>({
  아이디,
  라벨 = '메서드',
  값,
  목록,
  잠금,
  on고름,
}: {
  아이디: string;
  라벨?: string;
  값: M;
  목록: M[];
  잠금: boolean;
  on고름: (m: M) => void;
}) {
  return (
    <칸 아이디={아이디} 라벨={라벨} 문장={null}>
      {(속성) => (
        <select
          {...속성}
          value={값}
          disabled={잠금}
          onChange={(e) => {
            const 고른 = 목록.find((m) => m === e.target.value);
            if (고른 !== undefined) on고름(고른);
          }}
        >
          {목록.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      )}
    </칸>
  );
}

function 무늬칸({ 아이디, 라벨, 값, 잠금, 문장, on글 }: {
  아이디: string;
  라벨: string;
  값: string;
  잠금: boolean;
  문장: string;
  on글: (글: string) => void;
}) {
  return (
    <칸 아이디={아이디} 라벨={라벨} 문장={값.trim() === '' ? 문장 : null}>
      {(속성) => <글칸 {...속성} 값={값} 잠금={잠금} on글={on글} />}
    </칸>
  );
}

function 단계칸({ 아이디, 값, 앞, 잠금, on고름 }: {
  아이디: string;
  값: number;
  앞: Array<{ 번호: number; tcId: string }>;
  잠금: boolean;
  on고름: (번호: number) => void;
}) {
  const t = use말();
  const 있나 = 앞.some((a) => a.번호 === 값);
  return (
    <칸 아이디={아이디} 라벨="가져올 단계" 문장={있나 ? null : '가리키던 단계가 빠졌습니다'}>
      {(속성) => (
        <select
          {...속성}
          value={있나 ? String(값) : ''}
          disabled={잠금}
          onChange={(e) => {
            if (e.target.value !== '') on고름(Number(e.target.value));
          }}
        >
          {있나 ? null : <option value="" />}
          {앞.map((a) => (
            <option key={a.번호} value={a.번호}>
              {t('{번호}번 {tcId}', { 번호: a.번호, tcId: a.tcId })}
            </option>
          ))}
        </select>
      )}
    </칸>
  );
}

// 가져올 단계 · 메서드 · URL 패턴 · JSON 경로 — 값 주입과 수정 요청이 같이 쓴다
function 응답칸({ 아이디, 값, 앞, 잠금, on바꿈 }: {
  아이디: string;
  값: ScenarioResponseRef;
  앞: Array<{ 번호: number; tcId: string }>;
  잠금: boolean;
  on바꿈: (새값: ScenarioResponseRef) => void;
}) {
  return (
    <>
      <단계칸 아이디={`${아이디}-seq`} 값={값.fromSeq} 앞={앞} 잠금={잠금} on고름={(n) => on바꿈({ ...값, fromSeq: n })} />
      <메서드칸 아이디={`${아이디}-method`} 값={값.method} 목록={메서드들} 잠금={잠금} on고름={(m) => on바꿈({ ...값, method: m })} />
      <무늬칸
        아이디={`${아이디}-url`}
        라벨="URL 패턴"
        값={값.urlPattern}
        잠금={잠금}
        문장="URL 패턴을 적어야 합니다"
        on글={(글) => on바꿈({ ...값, urlPattern: 글 })}
      />
      <무늬칸
        아이디={`${아이디}-json`}
        라벨="JSON 경로"
        값={값.jsonPath}
        잠금={잠금}
        문장="JSON 경로를 적어야 합니다"
        on글={(글) => on바꿈({ ...값, jsonPath: 글 })}
      />
    </>
  );
}

interface Props {
  번호: number;
  단계: CasePart;
  단계들: ScenarioPart[];
  재료: 재료들;
  쓰나: boolean;
  on바꿈: (links: ScenarioLink[]) => void;
}

export function ScenarioLinks({ 번호, 단계, 단계들, 재료, 쓰나, on바꿈 }: Props) {
  const t = use말();
  const [펼침, set펼침] = useState(false);
  const links = 단계.links ?? [];
  const 잠금 = !쓰나;
  const 앞 = 단계들.slice(0, 번호 - 1).flatMap((p, i) => (p.kind === 'case' ? [{ 번호: i + 1, tcId: p.tcId }] : []));
  const 입력칸 = schemaToFields(재료.get(단계.tcId)?.paramSchema ?? { type: 'object', properties: {} }).map((f) => f.key);
  const 쓴칸 = (뺄자리: number | null) =>
    links.flatMap((l, j) => (l.kind === 'bind' && j !== 뺄자리 ? [l.param] : []));

  function 고침(자리: number, 새값: ScenarioLink) {
    on바꿈(links.map((l, j) => (j === 자리 ? 새값 : l)));
  }

  function bind칸(l: Extract<ScenarioLink, { kind: 'bind' }>, 자리: number, 아이디: string) {
    const 남은 = 입력칸.filter((k) => !쓴칸(자리).includes(k));
    const 선택지 = l.param === '' || 남은.includes(l.param) ? 남은 : [...남은, l.param];
    return (
      <>
        <칸 아이디={`${아이디}-param`} 라벨="넣을 칸" 문장={l.param === '' ? '넣을 칸을 골라야 합니다' : null}>
          {(속성) => (
            <select {...속성} value={l.param} disabled={잠금} onChange={(e) => 고침(자리, { ...l, param: e.target.value })}>
              {l.param === '' ? <option value="" /> : null}
              {선택지.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          )}
        </칸>
        <응답칸 아이디={아이디} 값={l.value} 앞={앞} 잠금={잠금} on바꿈={(v) => 고침(자리, { ...l, value: v })} />
      </>
    );
  }

  function 더하기(kind: 종류) {
    const fromSeq = 앞.at(-1)?.번호 ?? 0;
    const 응답: ScenarioResponseRef = { fromSeq, method: 'GET', urlPattern: '', jsonPath: '' };
    const 새값: ScenarioLink =
      kind === 'bind'
        ? { kind, param: 입력칸.find((k) => !쓴칸(null).includes(k)) ?? '', value: 응답 }
        : kind === 'block'
          ? { kind, method: 'GET', urlPattern: '' }
          : kind === 'reuse'
            ? { kind, method: 'GET', urlPattern: '', fromSeq }
            : { kind, method: 'GET', urlPattern: '', to: { method: 'PATCH', path: '', value: 응답 } };
    on바꿈([...links, 새값]);
    set펼침(false);
  }

  return (
    <div className="scn-links">
      <p className="hint">{t('값 연결은 첫 확인이 나오기 전 준비에서만 적용됩니다')}</p>
      {links.map((l, i) => {
        const 아이디 = `scn-link-${번호}-${i}`;
        return (
          <fieldset className="scn-set-block scn-set-group" key={i}>
            <legend>{t(종류이름[l.kind])}</legend>
            {l.kind === 'bind' ? bind칸(l, i, 아이디) : null}
            {l.kind === 'block' || l.kind === 'reuse' || l.kind === 'rewrite' ? (
              <>
                <메서드칸 아이디={`${아이디}-method`} 값={l.method} 목록={메서드들} 잠금={잠금} on고름={(m) => 고침(i, { ...l, method: m })} />
                <무늬칸
                  아이디={`${아이디}-url`}
                  라벨="URL 패턴"
                  값={l.urlPattern}
                  잠금={잠금}
                  문장="URL 패턴을 적어야 합니다"
                  on글={(글) => 고침(i, { ...l, urlPattern: 글 })}
                />
              </>
            ) : null}
            {l.kind === 'reuse' ? (
              <단계칸 아이디={`${아이디}-seq`} 값={l.fromSeq} 앞={앞} 잠금={잠금} on고름={(n) => 고침(i, { ...l, fromSeq: n })} />
            ) : null}
            {l.kind === 'rewrite' ? (
              <>
                <메서드칸
                  아이디={`${아이디}-newmethod`}
                  라벨="바꿀 메서드"
                  값={l.to.method}
                  목록={바꿀메서드들}
                  잠금={잠금}
                  on고름={(m) => 고침(i, { ...l, to: { ...l.to, method: m } })}
                />
                <칸
                  아이디={`${아이디}-newpath`}
                  라벨="수정 주소"
                  문장={바른경로(l.to.path) && l.to.path.split('{}').length === 2 ? null : '수정 주소는 / 로 시작하고 {} 자리가 하나 있어야 합니다'}
                >
                  {(속성) => (
                    <글칸 {...속성} 값={l.to.path} 잠금={잠금} on글={(글) => 고침(i, { ...l, to: { ...l.to, path: 글 } })} />
                  )}
                </칸>
                <p className="hint">{t('수정 주소의 {} 자리에 가져온 값이 들어갑니다')}</p>
                <fieldset className="scn-set-block scn-set-group">
                  <legend>{t('가져올 값')}</legend>
                  <응답칸
                    아이디={`${아이디}-to`}
                    값={l.to.value}
                    앞={앞}
                    잠금={잠금}
                    on바꿈={(v) => 고침(i, { ...l, to: { ...l.to, value: v } })}
                  />
                </fieldset>
              </>
            ) : null}
            {!쓰나 ? null : (
              <button type="button" className="btn ghost" onClick={() => on바꿈(links.filter((_, j) => j !== i))}>
                {t('값 연결 빼기')}
              </button>
            )}
          </fieldset>
        );

      })}

      {!쓰나 ? null : (
        <div className="scn-set-block">
          <button type="button" className="btn ghost" aria-expanded={펼침} onClick={() => set펼침(!펼침)}>
            {t('+ 값 연결 추가')}
          </button>
          {!펼침 ? null : (
            <div className="scn-link-kinds">
              {종류들
                .filter((k) => 앞.length > 0 || !앞이필요한종류.has(k))
                .map((k) => (
                  <button key={k} type="button" className="btn ghost" onClick={() => 더하기(k)}>
                    {t(종류이름[k])}
                  </button>
                ))}
              {앞.length > 0 ? null : <p className="hint">{t('앞에 값을 가져올 케이스 단계가 없습니다')}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
