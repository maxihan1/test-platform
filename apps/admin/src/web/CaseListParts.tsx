// 케이스 목록 화면이 그리는 조각 — 찾기 칸 · 조건 칩 · 표머리 · 케이스 한 줄 (SPEC §8.1)
// 고르는 칸이 붙으면서 CaseList 가 300줄을 넘었다. 판단은 CaseList 에 두고 그리는 쪽만 여기로 옮겼다.
// 빈 목록 안내 · 스캔 결과 줄은 CaseListNotes.tsx 로 갔다 (2026-10-01 — 이 파일도 300줄을 넘었다)

import { useId } from 'react';

import type { CaseRow, ItemStatus, Platform } from './api.js';
import { CaseDetail, use기법말, 기법태그들 } from './CaseDetail.js';
import { 기법고름들, type 기법고름 } from './CaseListFilter.js';
import { CaseRowParams, type 줄글자 } from './CaseRowParams.js';
import { keyOf, type LastMap, 마지막판정 } from './catalogView.js';
import { use말, use언어 } from './i18n.js';
import { 판정흐름 } from './Summary.js';
import { PLATFORM_LABEL, seconds, STATUS_COLOR, Verdict, when } from './ui.js';

const 결과칩: (ItemStatus | 'ALL')[] = ['ALL', 'PASS', 'FAIL', 'NA'];
const 디바이스칩: (Platform | 'ALL')[] = ['ALL', 'desktop', 'mobile'];
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
  on디바이스,
  on활성만,
  on결과,
}: {
  디바이스: Platform | 'ALL';
  활성만: boolean;
  결과: ItemStatus | 'ALL';
  on디바이스: (값: Platform | 'ALL') => void;
  on활성만: (값: boolean) => void;
  on결과: (값: ItemStatus | 'ALL') => void;
}) {
  const t = use말();

  return (
    <>
      <span className="filter-label">{t('디바이스')}</span>
      {디바이스칩.map((값) => (
        <button className="chip" key={값} aria-pressed={디바이스 === 값} onClick={() => on디바이스(값)}>
          {값 === 'ALL' ? t('전체') : t(PLATFORM_LABEL[값])}
        </button>
      ))}
      <span className="filter-label">{t('표시')}</span>
      {/* 비활성 케이스는 기본으로 감춘다. 코드에서 사라진 케이스는 지우지 않고 남겨 두므로
          시간이 지날수록 목록이 과거로 채워진다 (SPEC §8.1) */}
      <button className="chip" aria-pressed={활성만} onClick={() => on활성만(true)}>
        {t('활성만')}
      </button>
      <button className="chip" aria-pressed={!활성만} onClick={() => on활성만(false)}>
        {t('전체')}
      </button>
      <span className="filter-label">{t('마지막 결과')}</span>
      {결과칩.map((값) => (
        <button className="chip" key={값} aria-pressed={결과 === 값} onClick={() => on결과(값)}>
          {t(결과라벨[값])}
        </button>
      ))}
    </>
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

/**
 * 목록 맨 위 표머리 (SPEC §8.1, 2026-09-22).
 *
 * **좁은 화면에서는 감춘다.** 줄이 2단으로 접혀 칸이 세로로 눕기 때문이다 —
 * 케이스 목록은 §8 의 「좁은 화면에서 제대로 되는 둘」에 없다.
 * 실행 기록은 다르다 (실행 §8.7 은 감추지 않고 줄마다 라벨을 붙인다).
 *
 * `<table>` 이 아니라 격자라서 `role` 로 칸 이름을 읽히게 한다.
 */
export function 표머리({ 고름상태, on모두고르기 }: { 고름상태?: 'none' | 'some' | 'all'; on모두고르기?: () => void } = {}) {
  const t = use말();
  return (
    <div className="rowhead" role="row">
      <span aria-hidden="true" />
      {/* 이 쪽에 보이는 케이스를 한 번에 고르고 푼다. 「전체 실행」은 이미 모든 쪽이라 여기는 보이는 쪽만이다 (2026-09-30) */}
      {고름상태 === undefined || on모두고르기 === undefined ? (
        <span aria-hidden="true" />
      ) : (
        <label className="pick">
          <input
            type="checkbox"
            aria-label={t('이 쪽 전체 선택')}
            checked={고름상태 === 'all'}
            ref={(el) => {
              if (el !== null) el.indeterminate = 고름상태 === 'some';
            }}
            onChange={on모두고르기}
          />
        </label>
      )}
      {/* 두 언어가 같은 글자라 표를 안 탄다 */}
      <span role="columnheader">TC ID</span>
      <span role="columnheader">{t('케이스명')}</span>
      <span role="columnheader">{t('입력값')}</span>
      <span role="columnheader">{t('마지막 결과')}</span>
    </div>
  );
}

export function 케이스줄({
  row,
  마지막,
  고름,
  뒤집기,
  글자,
  폈나 = false,
  실행된다 = true,
  저장된다 = false,
  고칠서비스,
  on값,
  on더보기,
  on저장됨,
}: {
  row: CaseRow;
  마지막: LastMap;
  고름: boolean;
  뒤집기: (row: CaseRow) => void;
  /** 이 줄에서 고쳐 넣은 값. 없으면 코드의 기본값으로 돈다 */
  글자?: 줄글자;
  폈나?: boolean;
  /** 고른 서비스에서 실행 쓰기인가. 아니면 줄의 실행 링크가 없다 (화면공통 §8) */
  실행된다?: boolean;
  저장된다?: boolean;
  /** 작성 쓰기일 때만 온다 — 없으면 상세에 「코드 기본값 바꾸기 요청」 자리가 없다 (도메인/카탈로그 §8.1) */
  고칠서비스?: string;
  on값: (tcId: string, 어디: 'params' | 'expected', key: string, value: string) => void;
  on더보기: (tcId: string) => void;
  on저장됨?: (tcId: string) => void;
}) {
  const t = use말();
  const 언어 = use언어();

  return (
    <>
    <div className="row pickable">
      <div className="gutter" style={{ background: STATUS_COLOR[마지막판정(row, 마지막)] }} />
      {/* 고르는 칸은 왼쪽 거터 칸 안이다. 줄 내용 쪽 첫 요소로 두면 620px 미만에서
          줄이 2단으로 접힐 때 케이스명 위에 체크박스만 홀로 한 줄이 된다 (SPEC §8.1).
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
      {/* 입력 칸은 **케이스명 칸 밖**이다 (SPEC §8.1, 2026-09-22).
          안에 넣으면 이름 아래에 칸이 붙어 한 줄이 두 덩어리로 보이고 표머리를 달 수 없다 */}
      <div className="title">
        {row.name}
        {/* 사유 한 문장은 상세에서 본다. 줄에는 배지만 — 판정 색은 쓰지 않는다 (도메인/카탈로그 §8.1) */}
        {typeof row.unconfirmed === 'string' ? <span className="case-tag">{t('미확정')}</span> : null}
        {/* 기법은 이름 옆이 아니라 이 작은 줄에 — 이름 옆이면 기법이 둘일 때 둘째 태그가 다음 줄로 밀린다 (도메인/카탈로그 §8.1) */}
        <small>
          {t('지원 디바이스 {목록}', { 목록: row.platforms.map((p) => t(PLATFORM_LABEL[p])).join(', ') })}
          {row.techniques?.length ? <> <span className="tech-line">· {t('설계 기법')} <기법태그들 기법들={row.techniques} /></span></> : null}
        </small>
      </div>
      <div className="params">
        <CaseRowParams
          tcId={row.tcId}
          paramSchema={row.paramSchema}
          expectedSchema={row.expectedSchema}
          savedInput={row.savedInput}
          글자={글자}
          on값={(어디, key, value) => on값(row.tcId, 어디, key, value)}
          on더보기={() => on더보기(row.tcId)}
          저장된다={저장된다}
          on저장됨={on저장됨 === undefined ? undefined : () => on저장됨(row.tcId)}
        />
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
        {/* 눌러서 여는 상자다. 화면을 안 보는 사람에게 「상자가 열린다」를 미리 알린다
            (DESIGN.md 접근성 기준 · 2026-09-22 에 펼침에서 상자로) */}
        <button
          type="button"
          className="btn small ghost"
          aria-haspopup="dialog"
          onClick={() => on더보기(row.tcId)}
        >
          {t('상세')}
        </button>
        {!실행된다 ? null : (
          <a className="btn small" href={`#/cases/${encodeURIComponent(row.tcId)}/run`}>
            {t('실행')}
          </a>
        )}
      </div>
    </div>
    <CaseDetail
      row={row}
      폈나={폈나}
      마지막={마지막[keyOf(row.tcId, row.platforms[0] ?? 'desktop')]}
      글자={글자}
      고칠서비스={고칠서비스}
      onClose={() => on더보기(row.tcId)}
      on값={(어디, key, value) => on값(row.tcId, 어디, key, value)}
    />
    </>
  );
}
