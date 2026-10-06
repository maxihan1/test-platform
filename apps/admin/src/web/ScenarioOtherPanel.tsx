// E2E 시나리오 조립 화면 「N번 설정」 탭 속 — API 호출 · 모킹 켜기 · 모킹 끄기 · 대기 단계의 칸 (도메인/시나리오 §8.11)

import { useState } from 'react';
import type { ScenarioPart } from '@platform/kit';

import { use말 } from './i18n.js';
import { MockBody, UnmockBody, WaitBody, 글칸, 정수, 칸, 코드문장, type 몸Props } from './ScenarioOtherParts.js';
import { 모킹구간 } from './scenarioView.js';

type 다른단계 = Exclude<ScenarioPart, { kind: 'case' }>;
type ApiPart = Extract<ScenarioPart, { kind: 'api' }>;

interface Props {
  번호: number;
  단계: 다른단계;
  단계들: ScenarioPart[];
  쓰나: boolean;
  on바꿈: (새단계: 다른단계) => void;
}

const 메서드들: ApiPart['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// 서버 조립 검사(scenario/validate.ts)의 API 경로 규칙과 같다
function 바른경로(글: string): boolean {
  if (!글.startsWith('/') || 글.startsWith('//')) return false;
  return ![...글].some((c) => c === '\\' || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
}

// 글자 상태는 번호나 종류가 바뀌면 처음부터 다시 시작한다
export function ScenarioOtherPanel(props: Props) {
  return <PanelBody key={`${props.번호}-${props.단계.kind}`} {...props} />;
}

function PanelBody({ 번호, 단계, 단계들, 쓰나, on바꿈 }: Props) {
  const t = use말();
  const 이름 = {
    api: 'API 호출',
    mock: '모킹 켜기',
    unmock: '모킹 끄기',
    wait: '대기§단계',
  }[단계.kind];
  const 아이디 = `scn-set-${번호}`;
  const 잠금 = !쓰나;
  return (
    <div className="scn-set">
      <h3 className="scn-set-title">{t(이름)}</h3>
      {단계.kind === 'api' ? (
        <ApiBody {...{ 아이디, 잠금, 단계, on바꿈 }} 모킹중={(모킹구간(단계들)[번호 - 1] ?? []).length > 0} />
      ) : 단계.kind === 'mock' ? (
        <MockBody {...{ 아이디, 잠금, 단계, on바꿈 }} />
      ) : 단계.kind === 'unmock' ? (
        <UnmockBody {...{ 아이디, 잠금, 단계, on바꿈 }} 앞={모킹구간(단계들)[번호 - 1] ?? []} />
      ) : (
        <WaitBody {...{ 아이디, 잠금, 단계, on바꿈 }} />
      )}
    </div>
  );
}

const 경로문장 = '경로는 / 로 시작하고 // 로 시작하지 않아야 합니다';

function ApiBody({ 아이디, 잠금, 단계, on바꿈, 모킹중 }: 몸Props<ApiPart> & { 모킹중: boolean }) {
  const t = use말();
  const [경로, set경로] = useState(단계.path);
  const [본문, set본문] = useState(단계.body === undefined ? '' : JSON.stringify(단계.body, null, 2));
  const [코드, set코드] = useState(String(단계.expectStatus));
  const 본문읽힘 = 본문.trim() === '' || 읽기(본문).ok;

  // 본문 키는 비우면 빠진다. 값이 undefined 인 키를 남기면 서버 검사가 다르게 본다
  function 본문넣기(글: string) {
    const { kind, method, path, expectStatus } = 단계;
    const 기본: ApiPart = { kind, method, path, expectStatus };
    const 읽음 = 글.trim() === '' ? undefined : 읽기(글);
    if (읽음 === undefined) on바꿈(기본);
    else if (읽음.ok) on바꿈({ ...기본, body: 읽음.값 });
  }

  return (
    <>
      {!모킹중 ? null : <p className="scn-set-note">{t('이 단계의 API 호출은 모킹되지 않습니다')}</p>}
      <칸 아이디={`${아이디}-method`} 라벨="메서드" 문장={null}>
        {(속성) => (
          <select
            {...속성}
            value={단계.method}
            disabled={잠금}
            onChange={(e) =>
              on바꿈({
                ...단계,
                method: 메서드들.find((m) => m === e.target.value) ?? 단계.method,
              })
            }
          >
            {메서드들.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </칸>
      <칸 아이디={`${아이디}-path`} 라벨="경로" 문장={바른경로(경로) ? null : 경로문장}>
        {(속성) => (
          <글칸
            {...속성}
            값={경로}
            잠금={잠금}
            on글={(글) => {
              set경로(글);
              on바꿈({ ...단계, path: 글 });
            }}
          />
        )}
      </칸>
      <칸 아이디={`${아이디}-body`} 라벨="본문" 문장={본문읽힘 ? null : '본문을 JSON 으로 읽지 못했습니다'}>
        {(속성) => (
          <textarea
            {...속성}
            rows={5}
            value={본문}
            disabled={잠금}
            onChange={(e) => {
              set본문(e.target.value);
              본문넣기(e.target.value);
            }}
          />
        )}
      </칸>
      <칸 아이디={`${아이디}-status`} 라벨="기대 응답 코드" 문장={정수(코드, 100, 599) === null ? 코드문장 : null}>
        {(속성) => (
          <글칸
            {...속성}
            값={코드}
            잠금={잠금}
            숫자
            on글={(글) => {
              set코드(글);
              const n = 정수(글, 100, 599);
              if (n !== null) on바꿈({ ...단계, expectStatus: n });
            }}
          />
        )}
      </칸>
    </>
  );
}

function 읽기(글: string): { ok: true; 값: unknown } | { ok: false } {
  try {
    return { ok: true, 값: JSON.parse(글) as unknown };
  } catch {
    return { ok: false };
  }
}
