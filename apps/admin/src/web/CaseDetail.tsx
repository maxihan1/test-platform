// 케이스 상세 — 가운데 상세 창에 왼쪽은 절차 · 기대 결과 · 실행 기록, 오른쪽은 마지막 결과 · 세부 사항 · 입력값 (도메인/카탈로그 §8.1 「상세 칸」 · DESIGN.md 「상세 창」)
// 2026-11-27 사용자 시안 C 2판 — 이전 버전 오른쪽 서랍(2026-10-20 ⑬-2)은 폭이 좁아 실행 기록이 꺾였다. 그 앞 상자(2026-10-19 ⑫ 앞)는 길어서 한참 내려가야 했다(점검 7.12).
// 서랍 때처럼 목록 위에 떠 있고, 머리의 이전 · 다음으로 창을 닫지 않고 옆 케이스로 넘어간다.
//
// 「케이스마다 이력을 따로 부르지 않는다」(§8.1)는 목록 몫이다 — 여기는 사람이 한 줄을 열 때 부르고, 받은 것(`상세기억`)은 목록이 든다.
//
// **입력 칸은 줄에서 여기로 옮겼다.** 값을 고치고 「실행」하거나 「모두에게 저장」한다.
// 저장은 팀 전체와 정기 실행이 쓰는 값을 바꾸므로 누르기 전에 그 사실을 적는다 — 이전 버전은 줄의 「저장」 뒤에 4초만 떴다(점검 7.6)

import { useEffect, useState } from 'react';

import type { Platform, Technique } from '@platform/kit/types';

import { api, type CaseRow, type HistoryRow } from './api.js';
import { 코드기본값고치기 } from './CaseEdit.js';
import { 케이스자리 } from './CaseListContext.js';
import { DetailModal, 상세상자 } from './DetailModal.js';
import { 오류없음, 채운글자, type 줄글자 } from './caseValues.js';
import { keyOf, type LastMap, 마지막판정 } from './catalogView.js';
import { 이력열쇠, 실행마다묶기, 처음디바이스, type 상세기억 } from './caseDetailView.js';
import { 자동수정상자 } from './CaseAutoFix.js';
import { 실행이력칸 } from './CaseHistory.js';
import { use같은프로시저, 프로시저구획 } from './CaseProc.js';
import { 시험절차칸 } from './CaseSteps.js';
import { Form } from './Form.js';
import { use말 } from './i18n.js';
import { PRD항목주소 } from './route.js';
import { 값저장, 고쳤나 } from './SavedInputBar.js';
import { schemaToFields, toValues } from './schema.js';
import { PLATFORM_LABEL, Verdict } from './ui.js';

/**
 * 기법 이름을 화면 글자로. 값은 kit 식별자라 그대로 두고 글자만 영어 표가 맡는다 (도메인/카탈로그 §3.1).
 * 낱말마다 키를 적는다 — 영어 표 검사가 소스의 글자로 키를 찾고, kit 에 기법이 늘면 `satisfies` 가 깨진다
 */
export function use기법말(): (값: Technique) => string {
  const t = use말();
  const 글 = {
    '경계값 분석': t('경계값 분석'),
    '동등 분할': t('동등 분할'),
    '결정 테이블': t('결정 테이블'),
    '상태 전이': t('상태 전이'),
    '오류 추정': t('오류 추정'),
  } satisfies Record<Technique, string>;
  return (값) => 글[값];
}

/** 목록 줄과 상세가 같이 쓴다. 판정 색이 아니다 (DESIGN.md 「설계 기법 태그」) */
export function 기법태그들({ 기법들 }: { 기법들: Technique[] }) {
  const 기법말 = use기법말();
  return 기법들.map((값) => (
    <span className="tech-tag" key={값}>
      {기법말(값)}
    </span>
  ));
}

export function CaseDetail({
  row,
  마지막,
  기억,
  글자,
  고칠서비스,
  요구보나 = false,
  저장된다 = false,
  on실행,
  테스트만 = false,
  위치 = '',
  on이전,
  on다음,
  onClose,
  on값,
  on저장됨,
}: {
  row: CaseRow;
  마지막: LastMap;
  기억: 상세기억;
  /** 고쳐 넣은 값. 실행 창과 같은 표를 본다 (SPEC §8.1) */
  글자?: 줄글자;
  /** 작성 쓰기일 때만 온다. 있으면 「코드 기본값 바꾸기 요청」 자리를 둔다 (도메인/카탈로그 §8.1) */
  고칠서비스?: string;
  /** 작성 보기 권한 — 있으면 요구 번호가 「PRD 관리」 고리다 */
  요구보나?: boolean;
  /** 케이스 쓰기인가. 아니면 고쳐도 「모두에게 저장」이 없다 (화면공통 §8) */
  저장된다?: boolean;
  /** 실행 쓰기 · 테스트만(`테스트만` — 기록 없는 테스트 실행 창, 도메인/인증 §3.5 「테스트 모드」)일 때만 온다 — 고친 값을 실은 실행 창을 연다. 프로시저 안 케이스면 받아 둔 그 프로시저의 케이스(`묶음`)를 같이 넘긴다 — 못 받았거나 이 케이스가 거기 없으면 이 한 건만 넘긴다(서버가 프로시저를 통째로 펼친다) */
  on실행?: (row: CaseRow, 묶음?: CaseRow[]) => void;
  테스트만?: boolean;
  /** 위치 줄에 설 화면 이름(기능 테스트 · UI 테스트 · 게임 미션). 앱 이름과 기능 묶음 사이에 선다 */
  위치?: string;
  /** 목록에 보이는 차례의 앞 · 뒤 케이스를 연다. 끝이면 없다 */
  on이전?: (() => void) | undefined;
  on다음?: (() => void) | undefined;
  onClose: () => void;
  on값: (어디: 'params' | 'expected', key: string, value: string) => void;
  on저장됨: () => void;
}) {
  const t = use말();
  // 사람이 고르기 전에는 처음디바이스 — 마지막 결과가 칸보다 늦게 와도 따라간다
  const [골랐다, set고른기기] = useState<Platform | null>(null);
  const 고른기기 = 골랐다 ?? 처음디바이스(row, 마지막);
  const [, set받음] = useState(0); // 받아 온 뒤 다시 그리는 신호 — 값은 기억이 든다
  const 결과 = 고른기기 === null ? undefined : 마지막[keyOf(row.tcId, 고른기기)];
  const 열쇠 = 이력열쇠(row, 마지막);
  const 이력 = 기억.이력.get(열쇠);
  const 절차 = 결과 === undefined ? undefined : 기억.절차.get(결과.historyId);

  useEffect(() => {
    let 살아있나 = true;
    const 받을것: Promise<unknown>[] = [];
    if (!기억.이력.has(열쇠)) {
      // 실패는 null 로 남겨 「불러오지 못했다」고 적는다 — 빈 목록으로 삼키면 「기록이 없다」로 읽힌다
      받을것.push(
        api
          .caseHistory(row.tcId)
          .then((r): HistoryRow[] | null => r.items, () => null)
          .then((r) => 기억.이력.set(열쇠, r)),
      );
    }
    // 절차는 그 디바이스의 마지막 결과가 있을 때만 있다. 하나가 실패해도 나머지는 그린다
    if (결과 !== undefined && !기억.절차.has(결과.historyId)) {
      받을것.push(
        api
          .item(결과.runId, 결과.historyId)
          .catch(() => null)
          .then((r) => 기억.절차.set(결과.historyId, r)),
      );
    }
    if (받을것.length > 0) void Promise.all(받을것).then(() => 살아있나 && set받음((n) => n + 1));
    return () => {
      살아있나 = false;
    };
  }, [row.tcId, 열쇠, 결과, 기억]);

  const 입력값 = schemaToFields(row.paramSchema, row.savedInput?.params, row.savedInput?.savedSecrets.params);
  const 기대결과 = schemaToFields(row.expectedSchema, row.savedInput?.expected, row.savedInput?.savedSecrets.expected);
  const 확인문장 = row.verifyStatements ?? [];
  const 기법들 = row.techniques ?? [];
  const 묶음 = 이력 == null ? 이력 : 실행마다묶기(이력);
  const 같은 = use같은프로시저(row, 기억);
  const 프로시저안 = row.isActive && row.procId != null;

  // 실행 단추는 값을 넣는 「입력값」 상자 아래에 선다. 입력 칸이 없으면 마지막 결과 옆이다 (2026-11-27 사용자 — 이전 버전 글자 「이 값으로 실행」이 어색했다)
  const 실행단추 =
    on실행 === undefined || !row.isActive ? null : (
      <button type="button" className="btn" onClick={() => (프로시저안 && 같은 != null && 같은.some((c) => c.tcId === row.tcId) ? on실행(row, 같은) : on실행(row))}>
        {프로시저안 ? t(테스트만 ? '프로시저 시험 실행' : '프로시저 실행') : t(테스트만 ? '시험 실행' : '실행')}
      </button>
    );
  // 상세에서 값을 고칠 수 있는데 단추는 「닫기」뿐이었다(점검 7.10)
  const 저장칸 =
    입력값.length === 0 && 기대결과.length === 0 ? null : (
      <값저장
        tcId={row.tcId}
        값={{
          params: toValues(입력값, 채운글자(입력값, 글자?.params)),
          expected: toValues(기대결과, 채운글자(기대결과, 글자?.expected)),
        }}
        고침={고쳤나(입력값, 글자?.params) || 고쳤나(기대결과, 글자?.expected)}
        saved={row.savedInput}
        된다={저장된다}
        on저장됨={on저장됨}
      />
    );

  return (
    <DetailModal
      id="case-pane"
      위치={[위치, row.feature ?? '']}
      번호={row.tcId}
      제목={row.name}
      on이전={on이전}
      on다음={on다음}
      onClose={onClose}
      왼쪽={
        <>
          <프로시저구획 row={row} 같은={같은} 마지막={마지막} />
          {row.autoFix == null ? null : <자동수정상자 tcId={row.tcId} />}
          {/* 왜 미확정인지가 목록과 상세 어디에도 없었다(점검 7.4). 줄에는 배지만, 사유는 여기 맨 위다 */}
          {typeof row.unconfirmed === 'string' ? (
            <p className="case-unconfirmed">
              <b>{t('미확정')}</b> {row.unconfirmed}
            </p>
          ) : null}
          {row.precondition.length === 0 ? null : (
            <div className="dsec">
              <div className="dlabel">{t('사전 조건')}</div>
              <ol className="dlist">
                {row.precondition.map((줄) => (
                  <li key={줄}>{줄}</li>
                ))}
              </ol>
            </div>
          )}
          <시험절차칸 row={row} 마지막={마지막} 결과={결과} 절차={절차} 고른기기={고른기기} on기기={set고른기기} />
          {/* 기대 결과는 실행 전부터 있는 성공 조건이다 — 케이스 코드의 확인 문장을 적고 고칠 수 있는 값 칸은 그 아래 둔다 (도메인/카탈로그 §8.1 「상세 칸」) */}
          {기대결과.length === 0 && 확인문장.length === 0 ? null : (
            <div className="dsec">
              <div className="dlabel">{t('기대 결과')}</div>
              {확인문장.length === 0 ? null : (
                <ul className="dlist">
                  {확인문장.map((줄) => (
                    <li key={줄}>{줄}</li>
                  ))}
                </ul>
              )}
              {기대결과.length === 0 ? null : (
                <Form
                  idPrefix={`detail-${row.tcId}-e`}
                  fields={기대결과}
                  text={채운글자(기대결과, 글자?.expected)}
                  errors={오류없음}
                  onChange={(key, value) => on값('expected', key, value)}
                />
              )}
              {/* 입력 칸이 없으면 저장 단추는 고친 기대 결과 칸 바로 아래다 */}
              {입력값.length === 0 ? 저장칸 : null}
            </div>
          )}
          <실행이력칸 묶음={묶음} />
        </>
      }
      오른쪽={
        <>
          <div className="dm-status">
            <span className="lbl">{t('마지막 결과')}</span>
            <Verdict status={마지막판정(row, 마지막)} />
            {입력값.length === 0 ? 실행단추 : null}
          </div>
          <상세상자 제목={t('세부 사항')}>
            <dl className="dm-rows">
              {/* 줄에는 첫 요구만 — 덮는 요구 전부는 여기서 본다 (도메인/카탈로그 §8.1 「맥락」) */}
              {(row.reqs ?? []).length === 0 ? null : (
                <>
                  <dt>{t('요구사항')}</dt>
                  <dd>
                    <ul className="case-reqs">
                      {row.reqs!.map((r) => (
                        <li key={`${r.reqId}:${r.axis}`}>
                          {r.text === null || !요구보나 ? <span className="case-req-id">{r.reqId}</span> : <a className="case-req-id" href={PRD항목주소(r.reqId)}>{r.reqId}</a>}{' '}
                          <span className="axis-tag">{t(r.axis)}</span> {r.text ?? t('PRD 에 없는 번호입니다')}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </>
              )}
              <케이스자리 row={row} />
              {기법들.length === 0 ? null : (
                <>
                  <dt>{t('설계 기법')}</dt>
                  <dd>
                    <기법태그들 기법들={기법들} />
                  </dd>
                </>
              )}
              <dt>{t('디바이스')}</dt>
              <dd>{row.platforms.map((p) => t(PLATFORM_LABEL[p])).join(' · ')}</dd>
            </dl>
          </상세상자>
          {입력값.length === 0 ? null : (
            <상세상자 제목={t('입력값')}>
              <div className="dm-card-body">
                <Form
                  idPrefix={`detail-${row.tcId}-p`}
                  fields={입력값}
                  text={채운글자(입력값, 글자?.params)}
                  errors={오류없음}
                  onChange={(key, value) => on값('params', key, value)}
                />
                <div className="dm-card-foot">
                  {저장칸}
                  {실행단추}
                </div>
              </div>
            </상세상자>
          )}
          {/* 저장소의 코드라 맨 아래에 접어 둔다 — 펴 두면 기대결과 칸이 두 벌로 보였다(점검 7.11) */}
          {/* 비활성 케이스는 서버가 늘 거절한다(BAD_EDIT) — 목록 확인 상자도 같은 까닭으로 뺀다 */}
          {고칠서비스 === undefined || !row.isActive ? null : (
            <details className="case-edit-fold dm-card">
              <summary>{t('코드 기본값 변경 요청')}</summary>
              <코드기본값고치기 row={row} service={고칠서비스} />
            </details>
          )}
        </>
      }
    />
  );
}
