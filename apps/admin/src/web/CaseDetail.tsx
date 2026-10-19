// 케이스 상세 칸 — 목록 오른쪽에 열린다 (도메인/카탈로그 §8.1 「상세 칸」, 2026-10-19 ⑫ 시안 A)
//
// **상자를 그만두고 칸으로 바꿨다.** 상자는 열 때마다 목록을 가려 여러 케이스를 훑기 어려웠고,
// 길어서 절차 · 값 · 이력을 오가려면 상자 안에서 한참 내려가야 했다(점검 7.12). 실행 기록 A안과 같은 짜임이다.
//
// 「케이스마다 이력을 따로 부르지 않는다」(§8.1)는 목록 몫이다 — 여기는 사람이 한 줄을 열 때 부른다.
// 한 번 받은 것은 다시 안 받는다. 받아 둔 것(`상세기억`)은 목록이 들어 칸을 닫아도 남는다.
//
// **입력 칸은 줄에서 여기로 옮겼다.** 값을 고치고 「이 값으로 실행」하거나 「모두에게 저장」한다.
// 저장은 팀 모두와 정기 실행이 쓰는 값을 바꾸므로 누르기 전에 그 사실을 적는다 — 앞 판은 줄의 「저장」 뒤에 4초만 떴다(점검 7.6)

import { useEffect, useState } from 'react';

import type { Platform, Technique } from '@platform/kit/types';

import { api, type CaseRow, type HistoryRow } from './api.js';
import { 코드기본값고치기 } from './CaseEdit.js';
import { 오류없음, 채운글자, type 줄글자 } from './caseValues.js';
import { keyOf, type LastMap } from './catalogView.js';
import { 실행마다묶기, 처음디바이스, type 상세기억 } from './caseDetailView.js';
import { 실행이력칸 } from './CaseHistory.js';
import { 실패이유 } from './FailureWhy.js';
import { Form } from './Form.js';
import { use말, use언어 } from './i18n.js';
import { PRD항목주소 } from './route.js';
import { 값저장, 고쳤나 } from './SavedInputBar.js';
import { schemaToFields, toValues } from './schema.js';
import { PLATFORM_LABEL, seconds, STATUS_LABEL, Verdict, when } from './ui.js';

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
  /** 실행 쓰기일 때만 온다 — 고친 값을 실은 실행 창을 연다 */
  on실행?: (row: CaseRow) => void;
  onClose: () => void;
  on값: (어디: 'params' | 'expected', key: string, value: string) => void;
  on저장됨: () => void;
}) {
  const t = use말();
  const 언어 = use언어();
  // 사람이 고르기 전에는 처음디바이스 — 마지막 결과가 칸보다 늦게 와도 따라간다
  const [골랐다, set고른기기] = useState<Platform | null>(null);
  const 고른기기 = 골랐다 ?? 처음디바이스(row, 마지막);
  // 받아 온 뒤 다시 그리게 하는 신호다. 값은 기억이 든다
  const [, set받음] = useState(0);
  const 결과 = 고른기기 === null ? undefined : 마지막[keyOf(row.tcId, 고른기기)];
  const 이력 = 기억.이력.get(row.tcId);
  const 절차 = 결과 === undefined ? undefined : 기억.절차.get(결과.historyId);

  useEffect(() => {
    let 살아있나 = true;
    const 받을것: Promise<unknown>[] = [];
    if (!기억.이력.has(row.tcId)) {
      받을것.push(
        api
          .caseHistory(row.tcId)
          .catch(() => ({ items: [] as HistoryRow[] }))
          .then((r) => 기억.이력.set(row.tcId, r.items)),
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
  }, [row.tcId, 결과, 기억]);

  const 입력값 = schemaToFields(row.paramSchema, row.savedInput?.params, row.savedInput?.savedSecrets.params);
  const 기대결과 = schemaToFields(row.expectedSchema, row.savedInput?.expected, row.savedInput?.savedSecrets.expected);
  const 기법들 = row.techniques ?? [];
  const 돈기기 = row.platforms.filter((p) => 마지막[keyOf(row.tcId, p)] !== undefined);
  const 묶음 = 이력 === undefined ? null : 실행마다묶기(이력);

  return (
    <aside className="screen case-pane" id="case-pane" aria-labelledby="case-pane-title">
      <div className="case-pane-head">
        <div>
          <div className="tcid">{row.tcId}</div>
          <h2 id="case-pane-title">{row.name}</h2>
        </div>
        <button type="button" className="btn ghost icon" aria-label={t('상세 닫기')} onClick={onClose}>
          ✕
        </button>
      </div>

      {/* 왜 미확정인지가 목록과 상세 어디에도 없었다(점검 7.4). 줄에는 배지만, 사유는 여기 맨 위다 */}
      {typeof row.unconfirmed === 'string' ? (
        <p className="case-unconfirmed">
          <b>{t('미확정')}</b> {row.unconfirmed}
        </p>
      ) : null}

      {/* 줄에는 첫 요구만 — 덮는 요구 전부는 여기서 본다 (도메인/카탈로그 §8.1 「맥락」) */}
      {(row.reqs ?? []).length === 0 ? null : (
        <div className="dsec">
          <div className="dlabel">{t('요구')}</div>
          <ul className="dlist case-reqs">
            {row.reqs!.map((r) => (
              <li key={`${r.reqId}:${r.axis}`}>
                {r.text === null || !요구보나 ? <span className="case-req-id">{r.reqId}</span> : <a className="case-req-id" href={PRD항목주소(r.reqId)}>{r.reqId}</a>}{' '}
                <span className="axis-tag">{t(r.axis)}</span> {r.text ?? t('PRD 에 없는 번호예요')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {기법들.length === 0 ? null : (
        <div className="dsec">
          <div className="dlabel">{t('설계 기법')}</div>
          <기법태그들 기법들={기법들} />
        </div>
      )}

      {row.precondition.length === 0 ? null : (
        <div className="dsec">
          <div className="dlabel">{t('사전조건')}</div>
          <ol className="dlist">
            {row.precondition.map((줄) => (
              <li key={줄}>{줄}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="dsec">
        <div className="dlabel">
          {t('시험 절차')}
          {결과 === undefined ? null : (
            <span className="dfrom">{t('RUN {번호} · {때}', { 번호: 결과.runId, 때: when(결과.finishedAt, 언어) })}</span>
          )}
        </div>
        {/* 디바이스마다 절차가 다르다 — 첫 디바이스 것만 보이면 모바일만 깨진 케이스가 통과로 읽혔다(점검 7.7) */}
        {돈기기.length < 2 ? null : (
          <div className="case-devs" role="group" aria-label={t('디바이스')}>
            {돈기기.map((p) => {
              const 판정 = 마지막[keyOf(row.tcId, p)]!.status;
              return (
                <button
                  type="button"
                  key={p}
                  className={판정 === 'FAIL' ? 'chip chip-fail' : 'chip'}
                  aria-pressed={고른기기 === p}
                  onClick={() => set고른기기(p)}
                >
                  {t(PLATFORM_LABEL[p])} {t(STATUS_LABEL[판정])}
                </button>
              );
            })}
          </div>
        )}
        {결과 === undefined ? (
          <p className="hint">{t('아직 돌린 적이 없습니다. 한 번 돌리면 절차가 여기에 남습니다')}</p>
        ) : 절차 === undefined ? (
          <p className="hint">{t('절차를 불러오는 중입니다')}</p>
        ) : 절차 === null ? (
          <p className="hint">{t('절차를 불러오지 못했습니다')}</p>
        ) : (
          <ol className="dsteps">
            {절차.steps.map((단계) => (
              <li key={단계.seq} className={단계.status === 'FAIL' ? 'dstep-fail' : undefined}>
                <span className="n mono">{단계.seq}</span>
                <span className="t">{단계.title}</span>
                <Verdict status={단계.status} />
                <span className="d mono">{seconds(단계.durationMs, 언어)}</span>
                {/* 응답에 사유와 실패 화면이 다 있는데 안 그렸다(점검 7.9). 원문은 항목 상세에서 본다 */}
                {단계.status !== 'FAIL' ? null : (
                  <span className="dstep-why">
                    <실패이유 failure={절차.failure} />
                    {단계.screenshotPath == null ? null : (
                      <a href={api.screenshot(절차.runId, 절차.historyId, 단계.seq)} target="_blank" rel="noreferrer">
                        {t('실패 화면 보기')}
                      </a>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {입력값.length === 0 && 기대결과.length === 0 ? null : (
        <div className="dsec">
          {입력값.length === 0 ? null : (
            <>
              <div className="dlabel">{t('입력값')}</div>
              <Form
                idPrefix={`detail-${row.tcId}-p`}
                fields={입력값}
                text={채운글자(입력값, 글자?.params)}
                errors={오류없음}
                onChange={(key, value) => on값('params', key, value)}
              />
            </>
          )}
          {기대결과.length === 0 ? null : (
            <>
              <div className="dlabel">{t('기대결과')}</div>
              <Form
                idPrefix={`detail-${row.tcId}-e`}
                fields={기대결과}
                text={채운글자(기대결과, 글자?.expected)}
                errors={오류없음}
                onChange={(key, value) => on값('expected', key, value)}
              />
            </>
          )}
        </div>
      )}
      {/* 상세에서 값을 고칠 수 있는데 단추는 「닫기」뿐이었다(점검 7.10) */}
      <div className="case-pane-act">
        {입력값.length === 0 && 기대결과.length === 0 ? null : (
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
        )}
        {on실행 === undefined || !row.isActive ? null : (
          <button type="button" className="btn" onClick={() => on실행(row)}>
            {입력값.length === 0 && 기대결과.length === 0 ? t('실행') : t('이 값으로 실행')}
          </button>
        )}
      </div>

      <실행이력칸 묶음={묶음} />

      {/* 맨 아래에 접어 둔다 — 위의 기대결과 칸은 이번 실행 값이고 여기는 저장소의 코드다. 펴 두면 기대결과 칸이 두 벌로 보였다(점검 7.11) */}
      {/* 비활성 케이스는 서버가 늘 거절한다(BAD_EDIT) — 목록 확인 상자도 같은 까닭으로 뺀다 */}
      {고칠서비스 === undefined || !row.isActive ? null : (
        <details className="case-edit-fold">
          <summary>{t('코드 기본값 바꾸기 요청')}</summary>
          <코드기본값고치기 row={row} service={고칠서비스} />
        </details>
      )}
    </aside>
  );
}
