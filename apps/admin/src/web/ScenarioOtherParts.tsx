// 다른 단계 설정 패널이 나눠 쓰는 칸 틀과 모킹 켜기 · 모킹 끄기 · 대기 단계의 칸 (도메인/시나리오 §8.11)

import { useState, type ReactNode } from 'react';
import type { ScenarioPart } from '@platform/kit';

import { use말 } from './i18n.js';

type 다른단계 = Exclude<ScenarioPart, { kind: 'case' }>;
type MockPart = Extract<ScenarioPart, { kind: 'mock' }>;
type UnmockPart = Extract<ScenarioPart, { kind: 'unmock' }>;
type WaitPart = Extract<ScenarioPart, { kind: 'wait' }>;

export function 정수(글: string, 최소: number, 최대: number): number | null {
  const 깎음 = 글.trim();
  if (!/^\d+$/.test(깎음)) return null;
  const n = Number(깎음);
  return n >= 최소 && n <= 최대 ? n : null;
}

interface 칸Props {
  아이디: string;
  라벨: string;
  문장: string | null;
  children: (속성: { id: string; 'aria-describedby': string | undefined }) => ReactNode;
}

// 문장은 role 없이 aria-describedby 로 그 칸에 잇는다. 칸마다 알림이 울리면 쓰는 중에 시끄럽다
export function 칸({ 아이디, 라벨, 문장, children }: 칸Props) {
  const t = use말();
  const 문장아이디 = `${아이디}-msg`;
  return (
    <div className="field">
      <label htmlFor={아이디}>{t(라벨)}</label>
      <div>
        {children({
          id: 아이디,
          'aria-describedby': 문장 === null ? undefined : 문장아이디,
        })}
        {문장 === null ? null : (
          <p className="error-text" id={문장아이디}>
            {t(문장)}
          </p>
        )}
      </div>
    </div>
  );
}

export interface 몸Props<P> {
  아이디: string;
  잠금: boolean;
  단계: P;
  on바꿈: (새단계: 다른단계) => void;
}

export function 글칸({
  값,
  잠금,
  숫자,
  on글,
  ...속성
}: {
  값: string;
  잠금: boolean;
  숫자?: boolean;
  on글: (글: string) => void;
  id: string;
  'aria-describedby': string | undefined;
}) {
  return (
    <input
      {...속성}
      type="text"
      inputMode={숫자 ? 'numeric' : undefined}
      autoComplete="off"
      value={값}
      disabled={잠금}
      onChange={(e) => on글(e.target.value)}
    />
  );
}

export const 코드문장 = '응답 코드는 100부터 599까지입니다';

export function MockBody({ 아이디, 잠금, 단계, on바꿈 }: 몸Props<MockPart>) {
  const [무늬, set무늬] = useState(단계.urlPattern);
  const [코드, set코드] = useState(String(단계.status));
  const [형식, set형식] = useState(단계.contentType);
  const [본문, set본문] = useState(단계.body);
  return (
    <>
      <칸 아이디={`${아이디}-url`} 라벨="URL 패턴" 문장={무늬 === '' ? 'URL 패턴을 적어야 합니다' : null}>
        {(속성) => (
          <글칸
            {...속성}
            값={무늬}
            잠금={잠금}
            on글={(글) => {
              set무늬(글);
              on바꿈({ ...단계, urlPattern: 글 });
            }}
          />
        )}
      </칸>
      <칸 아이디={`${아이디}-code`} 라벨="응답 코드" 문장={정수(코드, 100, 599) === null ? 코드문장 : null}>
        {(속성) => (
          <글칸
            {...속성}
            값={코드}
            잠금={잠금}
            숫자
            on글={(글) => {
              set코드(글);
              const n = 정수(글, 100, 599);
              if (n !== null) on바꿈({ ...단계, status: n });
            }}
          />
        )}
      </칸>
      <칸 아이디={`${아이디}-type`} 라벨="응답 형식" 문장={null}>
        {(속성) => (
          <글칸
            {...속성}
            값={형식}
            잠금={잠금}
            on글={(글) => {
              set형식(글);
              on바꿈({ ...단계, contentType: 글 });
            }}
          />
        )}
      </칸>
      <칸 아이디={`${아이디}-body`} 라벨="응답 본문" 문장={null}>
        {(속성) => (
          <textarea
            {...속성}
            rows={5}
            value={본문}
            disabled={잠금}
            onChange={(e) => {
              set본문(e.target.value);
              on바꿈({ ...단계, body: e.target.value });
            }}
          />
        )}
      </칸>
    </>
  );
}

export function UnmockBody({ 아이디, 잠금, 단계, on바꿈, 앞 }: 몸Props<UnmockPart> & { 앞: string[] }) {
  const 선택지 = 앞.includes(단계.urlPattern) ? 앞 : [...앞, 단계.urlPattern];
  const 문장 =
    앞.length === 0 ? '앞에서 켠 모킹이 없습니다' : 앞.includes(단계.urlPattern) ? null : '앞에서 켜지 않은 모킹입니다';
  return (
    <칸 아이디={`${아이디}-unmock`} 라벨="끌 모킹" 문장={문장}>
      {(속성) => (
        <select
          {...속성}
          value={단계.urlPattern}
          disabled={잠금}
          onChange={(e) => on바꿈({ ...단계, urlPattern: e.target.value })}
        >
          {선택지.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      )}
    </칸>
  );
}

export function WaitBody({ 아이디, 잠금, 단계, on바꿈 }: 몸Props<WaitPart>) {
  const [초, set초] = useState(String(단계.ms / 1000));
  return (
    <칸
      아이디={`${아이디}-wait`}
      라벨="기다릴 시간(초)"
      문장={정수(초, 1, 60) === null ? '1초부터 60초까지 기다릴 수 있습니다' : null}
    >
      {(속성) => (
        <글칸
          {...속성}
          값={초}
          잠금={잠금}
          숫자
          on글={(글) => {
            set초(글);
            const n = 정수(글, 1, 60);
            if (n !== null) on바꿈({ ...단계, ms: n * 1000 });
          }}
        />
      )}
    </칸>
  );
}
