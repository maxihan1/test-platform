// E2E 조립 화면 API 호출 단계 설정의 「API 인증」 · 「값 주입」 · 「응답 값 확인」 칸 (도메인/시나리오 §3.7 결정 14 · §8.11)

import { useState } from 'react';
import type { ScenarioJsonCheck, ScenarioPart } from '@platform/kit';

import { use말 } from './i18n.js';
import { 응답칸 } from './ScenarioLinkParts.js';
import { 글칸, 칸 } from './ScenarioOtherParts.js';
import type { 앱줄 } from './scenarioView.js';

type ApiPart = Extract<ScenarioPart, { kind: 'api' }>;

// 서버 조립 검사(scenario/validate.ts 값이름)와 같은 규칙이다
const 값이름 = /^[A-Za-z0-9_가-힣]{1,20}$/;

interface Props {
  아이디: string;
  번호: number;
  단계: ApiPart;
  단계들: ScenarioPart[];
  앱들: readonly 앱줄[];
  시작: string;
  잠금: boolean;
  on바꿈: (새단계: ApiPart) => void;
}

// 비면 칸을 뺀다 — 빈 목록을 남기면 저장 모양이 고르지 않은 것과 달라진다
function 고친단계<K extends 'auth' | 'values' | 'expectJson'>(단계: ApiPart, 키: K, 값: ApiPart[K] | undefined): ApiPart {
  const 나머지: ApiPart = { ...단계 };
  delete 나머지[키];
  const 비었나 = 값 === undefined || (Array.isArray(값) && 값.length === 0);
  return 비었나 ? 나머지 : { ...나머지, [키]: 값 };
}

// JSON 으로 읽히면 그 값, 아니면 적은 글자 그대로 — 「주문이 완료되었습니다」를 따옴표 없이 적게
function 기대값(글: string): unknown {
  try {
    return JSON.parse(글) as unknown;
  } catch {
    return 글;
  }
}

const 기대글 = (값: unknown): string => (typeof 값 === 'string' ? 값 : JSON.stringify(값));

export function ScenarioApiExtras({ 아이디, 번호, 단계, 단계들, 앱들, 시작, 잠금, on바꿈 }: Props) {
  const t = use말();
  const 앱 = 앱들.find((a) => a.prefix === (단계.service ?? 시작));
  const 이름들 = [...new Set((앱?.envs ?? []).flatMap((e) => e.apiAuthNames ?? []))];
  // 저장된 이름이 지금 설정에 없어도 보이게 둔다 — 대상 서버마다 따로 넣는 이름이라 이 서버에만 없을 수 있다
  const 선택지 = 단계.auth === undefined || 이름들.includes(단계.auth) ? 이름들 : [...이름들, 단계.auth];
  const 앞 = 단계들.slice(0, 번호 - 1).flatMap((p, i) =>
    p.kind === 'case' ? [{ 번호: i + 1, tcId: p.tcId }] : p.kind === 'api' ? [{ 번호: i + 1, tcId: `${p.method} ${p.path}` }] : [],
  );
  const values = 단계.values ?? [];
  const checks = 단계.expectJson ?? [];
  // 기대값 글자는 적는 동안 그대로 둔다 — 3 을 적다 지운 「3.」 이 숫자로 바뀌어 사라지지 않게
  const [기대글자들, set기대글자들] = useState(() => checks.map((c) => 기대글(c.equals)));

  function 확인고침(자리: number, 새값: ScenarioJsonCheck) {
    on바꿈(고친단계(단계, 'expectJson', checks.map((c, j) => (j === 자리 ? 새값 : c))));
  }

  return (
    <>
      <칸 아이디={`${아이디}-auth`} 라벨="API 인증" 문장={null}>
        {(속성) => (
          <select {...속성} value={단계.auth ?? ''} disabled={잠금} onChange={(e) => on바꿈(고친단계(단계, 'auth', e.target.value === '' ? undefined : e.target.value))}>
            <option value="">{t('인증 없이')}</option>
            {선택지.map((이름) => (
              <option key={이름} value={이름}>
                {이름}
              </option>
            ))}
          </select>
        )}
      </칸>
      {선택지.length > 0 ? null : <p className="hint">{t('이 애플리케이션 대상 서버에 등록한 API 인증이 없습니다')}</p>}

      <div className="scn-set-block">
        <h4>{t('값 주입')}</h4>
        <p className="hint">{t('경로 · 본문의 {이름} 자리에 앞 단계 응답 값이 들어갑니다')}</p>
        {values.map((v, 자리) => {
          const 칸아이디 = `${아이디}-value-${자리}`;
          const 고침 = (새값: typeof v) => on바꿈(고친단계(단계, 'values', values.map((x, j) => (j === 자리 ? 새값 : x))));
          return (
            <fieldset key={자리} className="scn-link">
              <legend>{t('값 주입')}</legend>
              <칸 아이디={`${칸아이디}-name`} 라벨="이름" 문장={값이름.test(v.name) ? null : '이름은 영문 · 숫자 · 한글 · _ 1~20자여야 합니다'}>
                {(속성) => <글칸 {...속성} 값={v.name} 잠금={잠금} 자리={t('예: 아이디')} on글={(글) => 고침({ ...v, name: 글 })} />}
              </칸>
              <응답칸 아이디={칸아이디} 값={v.value} 앞={앞} 지도={null} 잠금={잠금} on바꿈={(새값) => 고침({ ...v, value: 새값 })} />
              {잠금 ? null : (
                <button type="button" className="btn ghost" onClick={() => on바꿈(고친단계(단계, 'values', values.filter((_, j) => j !== 자리)))}>
                  {t('값 주입 삭제')}
                </button>
              )}
            </fieldset>
          );
        })}
        {잠금 ? null : 앞.length === 0 ? (
          <p className="hint">{t('앞에 값을 가져올 단계가 없습니다')}</p>
        ) : (
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              on바꿈(고친단계(단계, 'values', [...values, { name: '', value: { fromSeq: 앞[앞.length - 1]!.번호, method: 'POST', urlPattern: '**', jsonPath: '' } }]))
            }
          >
            {t('+ 값 주입 추가')}
          </button>
        )}
      </div>

      <div className="scn-set-block">
        <h4>{t('응답 값 확인')}</h4>
        <p className="hint">{t('응답 JSON 의 그 자리 값이 같아야 통과합니다')}</p>
        {checks.map((c, 자리) => {
          const 칸아이디 = `${아이디}-check-${자리}`;
          return (
            <fieldset key={자리} className="scn-link">
              <legend>{t('응답 값 확인')}</legend>
              <칸 아이디={`${칸아이디}-json`} 라벨="JSON 경로" 문장={c.jsonPath.trim() === '' ? 'JSON 경로를 적어야 합니다' : null}>
                {(속성) => <글칸 {...속성} 값={c.jsonPath} 잠금={잠금} 자리={t('예: items.0.title')} on글={(글) => 확인고침(자리, { ...c, jsonPath: 글 })} />}
              </칸>
              <칸 아이디={`${칸아이디}-equals`} 라벨="기대 값" 문장={null}>
                {(속성) => (
                  <글칸
                    {...속성}
                    값={기대글자들[자리] ?? 기대글(c.equals)}
                    잠금={잠금}
                    on글={(글) => {
                      set기대글자들((앞글) => 앞글.map((x, j) => (j === 자리 ? 글 : x)));
                      확인고침(자리, { ...c, equals: 기대값(글) });
                    }}
                  />
                )}
              </칸>
              {잠금 ? null : (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    set기대글자들((앞글) => 앞글.filter((_, j) => j !== 자리));
                    on바꿈(고친단계(단계, 'expectJson', checks.filter((_, j) => j !== 자리)));
                  }}
                >
                  {t('응답 값 확인 삭제')}
                </button>
              )}
            </fieldset>
          );
        })}
        {잠금 ? null : (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              set기대글자들((앞글) => [...앞글, '']);
              on바꿈(고친단계(단계, 'expectJson', [...checks, { jsonPath: '', equals: '' }]));
            }}
          >
            {t('+ 응답 값 확인 추가')}
          </button>
        )}
      </div>
    </>
  );
}
