// 값 연결 편집의 칸 조각 — 메서드 · URL 패턴 · 가져올 단계 · 가져올 응답. 값 연결 편집(ScenarioLinks)이 300줄을 넘지 않게 나눴다

import type { ScenarioMethod, ScenarioResponseRef } from '@platform/kit';

import type { 지도API } from '../prd/apiMap.js';
import { use말 } from './i18n.js';
import { 요청고르개 } from './ScenarioLinkPick.js';
import { 글칸, 칸 } from './ScenarioOtherParts.js';

export const 메서드들: ScenarioMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function 메서드칸<M extends ScenarioMethod>({
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

export function 무늬칸({ 아이디, 라벨, 값, 잠금, 문장, 자리, on글 }: {
  아이디: string;
  라벨: string;
  값: string;
  잠금: boolean;
  문장: string;
  자리?: string;
  on글: (글: string) => void;
}) {
  const t = use말();
  return (
    <칸 아이디={아이디} 라벨={라벨} 문장={값.trim() === '' ? 문장 : null}>
      {(속성) => <글칸 {...속성} 값={값} 잠금={잠금} 자리={자리 === undefined ? undefined : t(자리)} on글={on글} />}
    </칸>
  );
}

export function 단계칸({ 아이디, 값, 앞, 잠금, on고름 }: {
  아이디: string;
  값: number;
  앞: Array<{ 번호: number; tcId: string }>;
  잠금: boolean;
  on고름: (번호: number) => void;
}) {
  const t = use말();
  const 있나 = 앞.some((a) => a.번호 === 값);
  return (
    <칸 아이디={아이디} 라벨="가져올 단계" 문장={있나 ? null : '가져올 단계가 삭제됐습니다'}>
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
export function 응답칸({ 아이디, 값, 앞, 지도, 잠금, on바꿈 }: {
  아이디: string;
  값: ScenarioResponseRef;
  앞: Array<{ 번호: number; tcId: string }>;
  지도: 지도API[] | null | undefined;
  잠금: boolean;
  on바꿈: (새값: ScenarioResponseRef) => void;
}) {
  return (
    <>
      <단계칸 아이디={`${아이디}-seq`} 값={값.fromSeq} 앞={앞} 잠금={잠금} on고름={(n) => on바꿈({ ...값, fromSeq: n })} />
      <요청고르개
        아이디={`${아이디}-pick`}
        tcId={앞.find((a) => a.번호 === 값.fromSeq)?.tcId}
        지도={지도}
        방법={값.method}
        무늬={값.urlPattern}
        잠금={잠금}
        on고름={(고른) => on바꿈({ ...값, ...고른 })}
      />
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
        자리="예: data.cartId"
        잠금={잠금}
        문장="JSON 경로를 적어야 합니다"
        on글={(글) => on바꿈({ ...값, jsonPath: 글 })}
      />
    </>
  );
}
