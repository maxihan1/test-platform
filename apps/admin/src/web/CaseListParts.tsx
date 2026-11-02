// 케이스 목록 화면이 그리는 조각 — 찾기 칸 · 케이스 한 줄 (SPEC §8.1). 표머리는 CaseListHead.tsx · 조건은 CaseListFilterBar.tsx
// 고르는 칸이 붙으면서 CaseList 가 300줄을 넘었다. 판단은 CaseList 에 두고 그리는 쪽만 여기로 옮겼다.
// 빈 목록 안내 · 스캔 결과 줄은 CaseListNotes.tsx 로 갔다 (2026-10-01 — 이 파일도 300줄을 넘었다)

import type { CaseRow, ItemStatus } from './api.js';
import { 케이스맥락 } from './CaseListContext.js';
import { 스모크칩 } from './CaseSmoke.js';
import { keyOf, type LastMap, 마지막판정 } from './catalogView.js';
import { use지금앱 } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 종류 } from './kind.js';
import { 아이콘 } from './icons.js';
import { 판정흐름 } from './Summary.js';
import { PLATFORM_LABEL, seconds, STATUS_COLOR, Verdict, when } from './ui.js';

// 빈 목록 안내도 같은 말을 쓴다. 두 벌을 두면 칩과 안내가 서로 다른 이름으로 같은 것을 부른다
export const 결과라벨: Record<ItemStatus | 'ALL', string> = {
  ALL: '전체',
  PASS: '통과',
  FAIL: '실패',
  NA: '미실행',
};

/** 이름·ID 로 찾는 칸. 「조건 초기화」는 거른 것이 있을 때만 나온다 (SPEC §8.1) */
export function 찾기폼({
  typed,
  건조건,
  onTyped,
  onSearch,
  onClear,
}: {
  typed: string;
  건조건: boolean;
  onTyped: (값: string) => void;
  onSearch: () => void;
  onClear: () => void;
}) {
  const t = use말();

  return (
    <form
      className="find"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <input
        type="text"
        placeholder={t('케이스 이름이나 ID로 찾기')}
        value={typed}
        onChange={(e) => onTyped(e.target.value)}
      />
      <button className="chip" type="submit">
        {t('찾기')}
      </button>
      {!건조건 ? null : (
        <button className="chip" type="button" onClick={onClear}>
          {t('조건 초기화')}
        </button>
      )}
    </form>
  );
}

export function 케이스줄({
  row,
  마지막,
  고름,
  뒤집기,
  열림 = false,
  on실행,
  on열기,
  on스모크,
  요구보나 = false,
  요구쓰나 = false,
}: {
  row: CaseRow;
  마지막: LastMap;
  고름: boolean;
  /** `사이` — Shift 를 누른 채 골랐다. 지난번 고른 줄부터 이 줄까지 (도메인/카탈로그 §8.1) */
  뒤집기: (row: CaseRow, 사이: boolean) => void;
  /** 오른쪽 상세 칸에 이 케이스가 열려 있나 */
  열림?: boolean;
  /** 줄의 ▶ — 그 한 건으로 실행 창을 연다. 고른 서비스에서 실행 쓰기가 아니면 오지 않고 버튼도 없다 (화면공통 §8) */
  on실행?: (row: CaseRow) => void;
  on열기: (tcId: string) => void;
  /** 스모크 칩을 고칠 수 있을 때만 온다(cases write) — 없으면 켜진 칩만 글자로 보인다 */
  on스모크?: () => Promise<unknown>;
  /** 작성 보기 권한 — 없으면 요구 번호가 「PRD 관리」 고리가 아니라 글자다 (도메인/카탈로그 §8.1 「맥락」) */
  요구보나?: boolean;
  /** 서비스가 PRD 를 쓴다 — 안 쓰면 「연결된 요구 없음」을 줄마다 달지 않는다 */
  요구쓰나?: boolean;
}) {
  const 디바이스이름 = 종류(use지금앱()?.kind).디바이스칩;
  const t = use말();
  const 언어 = use언어();

  return (
    <div className={열림 ? 'row pickable row-open' : 'row pickable'}>
      <div className="gutter" style={{ background: STATUS_COLOR[마지막판정(row, 마지막)] }} />
      {/* 고르는 칸은 왼쪽 거터 칸 안이다. 줄 내용 쪽 첫 요소로 두면 목록이 좁아
          줄이 쌓일 때 케이스명 위에 체크박스만 홀로 한 줄이 된다 (SPEC §8.1).
          label 로 감싸 칸 전체가 누르는 자리가 된다 — 15px 네모만 노리게 두지 않는다 */}
      <label className="pick">
        <input
          type="checkbox"
          checked={고름}
          // ID 만 읽으면 화면을 안 보는 사람에게는 무엇을 고르는지가 암호다
          aria-label={t('{아이디} {이름} 고르기', { 아이디: row.tcId, 이름: row.name })}
          // 체크박스의 onChange 는 React 가 click 으로 받는다 — 원래 사건이 Shift 를 안다
          onChange={(e) => 뒤집기(row, (e.nativeEvent as MouseEvent).shiftKey === true)}
        />
      </label>
      <div className="tcid">{row.tcId}</div>
      {/* 입력 칸은 줄에서 뺐다 — 값은 오른쪽 상세 칸에서 고친다 (⑫ 시안 A · 도메인/카탈로그 §8.1).
          이름을 누르면 그 칸이 열린다. 따로 「상세」 버튼을 두면 같은 일을 하는 자리가 둘이다 */}
      <div className="title">
        <button
          type="button"
          id={`case-open-${row.tcId}`}
          className="case-open"
          aria-expanded={열림}
          aria-controls="case-pane"
          onClick={() => on열기(row.tcId)}
        >
          {row.name}
        </button>
        {/* 사유는 상세 칸 맨 위에 적는다. 줄에는 배지와 말풍선만 — 판정 색은 쓰지 않는다 (도메인/카탈로그 §8.1) */}
        {typeof row.unconfirmed === 'string' ? <span className="case-tag" title={row.unconfirmed}>{t('미확정')}</span> : null}
        <스모크칩 row={row} on바뀜={on스모크} />
        {/* 기법은 이름 옆이 아니라 아래 작은 줄에 — 이름 옆이면 기법이 둘일 때 둘째 태그가 다음 줄로 밀린다 (도메인/카탈로그 §8.1) */}
        <케이스맥락 row={row} 요구보나={요구보나} 요구쓰나={요구쓰나} />
      </div>
      <div className="right">
        <div className="devices">
          {row.platforms.map((platform) => {
            const result = 마지막[keyOf(row.tcId, platform)];
            return (
              <div className="device" key={platform}>
                {디바이스이름 ? <span className="device-name">{t(PLATFORM_LABEL[platform])}</span> : null}
                {result === undefined ? (
                  <span className="device-none">{t('실행 기록 없음')}</span>
                ) : (
                  <>
                    <a
                      href={`#/runs/${result.runId}/items/${result.historyId}`}
                      title={`${when(result.finishedAt, 언어)} · ${seconds(result.durationMs, 언어)}`}
                    >
                      <Verdict status={result.status} />
                    </a>
                    {/* 흐름은 디바이스마다다. 줄에 하나만 두면 PC 와 모바일이 한 줄로 뭉개진다 */}
                    <판정흐름 recent={result.recent} />
                  </>
                )}
              </div>
            );
          })}
        </div>
        {/* 글자 대신 아이콘이다 — 영어 「Run」이 「Details」 아래로 밀려 내려갔다(진행판 WEB-F2-12). 이름은 화면 읽기가 말한다 */}
        {on실행 === undefined ? null : (
          <button
            type="button"
            className="btn ghost icon"
            aria-label={t('{케이스} 실행', { 케이스: row.tcId })}
            title={t('실행')}
            onClick={() => on실행(row)}
          >
            <아이콘 이름="run" />
          </button>
        )}
      </div>
    </div>
  );
}
