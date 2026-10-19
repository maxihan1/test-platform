// 케이스 목록 화면이 그리는 조각 — 찾기 칸 · 조건 칩 · 케이스 한 줄 (SPEC §8.1). 표머리는 CaseListHead.tsx
// 고르는 칸이 붙으면서 CaseList 가 300줄을 넘었다. 판단은 CaseList 에 두고 그리는 쪽만 여기로 옮겼다.
// 빈 목록 안내 · 스캔 결과 줄은 CaseListNotes.tsx 로 갔다 (2026-10-01 — 이 파일도 300줄을 넘었다)

import { useId } from 'react';

import type { CasePage, CaseRow, ItemStatus, Platform, 케이스축 } from './api.js';
import { use기법말 } from './CaseDetail.js';
import { 케이스맥락 } from './CaseListContext.js';
import { 기법고름들, type 기법고름 } from './CaseListFilter.js';
import { keyOf, type LastMap, 마지막판정 } from './catalogView.js';
import { use말, use언어 } from './i18n.js';
import { 아이콘 } from './icons.js';
import { 판정흐름 } from './Summary.js';
import { PLATFORM_LABEL, seconds, STATUS_COLOR, Verdict, when } from './ui.js';

const 결과칩: (ItemStatus | 'ALL')[] = ['ALL', 'PASS', 'FAIL', 'NA'];
const 디바이스칩: (Platform | 'ALL')[] = ['ALL', 'desktop', 'mobile'];
// 종류는 기능 목록에만 — UI 는 넷째 종류라 UI 목록 전부다 (도메인/카탈로그 §8.1 「맥락」)
const 종류칩: (Exclude<케이스축, 'UI'> | 'ALL')[] = ['ALL', '정상', '경계', '예외'];
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

/** 검색 조건 (SPEC §8.1 표가 정본). 서비스는 조건이 아니라 맨 위 띠의 선택이다 */
export function 조건칩들({
  디바이스,
  활성만,
  결과,
  건수,
  on디바이스,
  on활성만,
  on결과,
}: {
  디바이스: Platform | 'ALL';
  활성만: boolean;
  결과: ItemStatus | 'ALL';
  /** 서버가 last 를 뺀 조건으로 센 수 — 칩을 걸어도 그대로다. 실행 read 가 없으면 null 이고 칩도 안 그린다 (도메인/카탈로그 §7) */
  건수: CasePage['lastCounts'];
  on디바이스: (값: Platform | 'ALL') => void;
  on활성만: (값: boolean) => void;
  on결과: (값: ItemStatus | 'ALL') => void;
}) {
  const t = use말();
  const 칩수 = (값: ItemStatus | 'ALL'): number | undefined =>
    건수 == null ? undefined : 값 === 'ALL' ? 건수.total : 값 === 'PASS' ? 건수.pass : 값 === 'FAIL' ? 건수.fail : 건수.na;

  // 라벨과 칩은 한 덩어리로 같이 다음 줄로 간다 — 라벨만 윗줄 끝에 홀로 남았다 (진행판 WEB-F2-11)
  return (
    <>
      <span className="filter-group">
        <span className="filter-label">{t('디바이스')}</span>
        {디바이스칩.map((값) => (
          <button className="chip" key={값} aria-pressed={디바이스 === 값} onClick={() => on디바이스(값)}>
            {값 === 'ALL' ? t('전체') : t(PLATFORM_LABEL[값])}
          </button>
        ))}
      </span>
      <span className="filter-group">
        <span className="filter-label">{t('표시')}</span>
        {/* 비활성 케이스는 기본으로 감춘다. 코드에서 사라진 케이스는 지우지 않고 남겨 두므로
            시간이 지날수록 목록이 과거로 채워진다 (SPEC §8.1) */}
        <button className="chip" aria-pressed={활성만} onClick={() => on활성만(true)}>
          {t('활성만')}
        </button>
        <button className="chip" aria-pressed={!활성만} onClick={() => on활성만(false)}>
          {t('전체')}
        </button>
      </span>
      {/* 집계 띠를 칩으로 합쳤다 — 띠가 50px 을 먹어 목록이 한두 줄만 보였다(점검 N1). 수는 쪽이 아니라 조건에 맞은 전부다 (⑫ 시안 A) */}
      {건수 == null ? null : (
        <span className="filter-group">
          <span className="filter-label">{t('마지막 결과')}</span>
          {결과칩.map((값) => (
            <button className={값 === 'FAIL' && 건수.fail > 0 ? 'chip chip-fail' : 'chip'} key={값} aria-pressed={결과 === 값} onClick={() => on결과(값)}>
              {t(결과라벨[값])} <span className="chip-n">{칩수(값)}</span>
            </button>
          ))}
        </span>
      )}
    </>
  );
}

/** 종류 — 기능 테스트 목록에만. 서버가 지도 ① 의 축으로 거른다 (도메인/카탈로그 §7 `?axis=`) */
export function 종류칩들({ 축, on축 }: { 축: 케이스축 | 'ALL'; on축: (값: 케이스축 | 'ALL') => void }) {
  const t = use말();
  return (
    <span className="filter-group">
      <span className="filter-label">{t('종류')}</span>
      {종류칩.map((값) => (
        <button className="chip" key={값} aria-pressed={축 === 값} onClick={() => on축(값)}>
          {t(값 === 'ALL' ? '전체' : 값)}
        </button>
      ))}
    </span>
  );
}

/** 설계 기법 — 기능 테스트 목록에만. 칩으로 늘어놓으면 도구 줄이 더 길어진다 (도메인/카탈로그 §8.1 「설계 기법」) */
export function 기법고르개({ 기법, on기법 }: { 기법: 기법고름; on기법: (값: 기법고름) => void }) {
  const t = use말();
  const 기법말 = use기법말();
  const id = useId();
  // 한 덩어리라 넘쳐도 같이 다음 줄로 간다(2026-10-05 실측). 이름은 보이는 라벨 하나 — 감싸면 고른 값까지 이름에 붙어 for 로 잇는다
  return (
    <span className="filter-group">
      <label className="filter-label" htmlFor={id}>{t('설계 기법')}</label>
      <select id={id} value={기법} onChange={(e) => on기법(기법고름들.find((값) => 값 === e.target.value) ?? 'ALL')}>
        {기법고름들.map((값) => (
          <option key={값} value={값}>
            {값 === 'ALL' ? t('전체') : 값 === 'none' ? t('기법 없음') : 기법말(값)}
          </option>
        ))}
      </select>
    </span>
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
  요구보나 = false,
  요구쓰나 = false,
}: {
  row: CaseRow;
  마지막: LastMap;
  고름: boolean;
  뒤집기: (row: CaseRow) => void;
  /** 오른쪽 상세 칸에 이 케이스가 열려 있나 */
  열림?: boolean;
  /** 줄의 ▶ — 그 한 건으로 실행 창을 연다. 고른 서비스에서 실행 쓰기가 아니면 오지 않고 버튼도 없다 (화면공통 §8) */
  on실행?: (row: CaseRow) => void;
  on열기: (tcId: string) => void;
  /** 작성 보기 권한 — 없으면 요구 번호가 「PRD 관리」 고리가 아니라 글자다 (도메인/카탈로그 §8.1 「맥락」) */
  요구보나?: boolean;
  /** 서비스가 PRD 를 쓴다 — 안 쓰면 「연결된 요구 없음」을 줄마다 달지 않는다 */
  요구쓰나?: boolean;
}) {
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
          onChange={() => 뒤집기(row)}
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
        {/* 기법은 이름 옆이 아니라 아래 작은 줄에 — 이름 옆이면 기법이 둘일 때 둘째 태그가 다음 줄로 밀린다 (도메인/카탈로그 §8.1) */}
        <케이스맥락 row={row} 요구보나={요구보나} 요구쓰나={요구쓰나} />
      </div>
      <div className="right">
        <div className="devices">
          {row.platforms.map((platform) => {
            const result = 마지막[keyOf(row.tcId, platform)];
            return (
              <div className="device" key={platform}>
                <span className="device-name">{t(PLATFORM_LABEL[platform])}</span>
                {result === undefined ? (
                  <span className="device-none">{t('실행 이력 없음')}</span>
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
