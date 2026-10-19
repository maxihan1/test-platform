// 끝난 실행의 결과 본문 — 요약 띠 → 실패 카드 → 통과 · 미실행 줄. 늘 한 단이다 (도메인/실행 §8.3)

import { useRef } from 'react';

import type { api, ItemStatus, Platform, RunInsights as 비교 } from './api.js';
import { 갈라낸다 } from './group.js';
import { use말 } from './i18n.js';
import { RunFailCards } from './RunFailCards.js';
import { 실패케이스들 } from './RerunFailed.js';
import { 실행판정, type 판정하기 } from './runJudge.js';
import { 결과줄 } from './RunResultRow.js';
import { RunSummary } from './RunSummary.js';
import { PLATFORM_LABEL, 실행디바이스들 } from './ui.js';

type 실행 = Awaited<ReturnType<typeof api.run>>;

export const PAGE_SIZE = 20;

export function 디바이스칩({
  디바이스들,
  device,
  on디바이스,
}: {
  디바이스들: Platform[];
  device: Platform | 'ALL';
  on디바이스: (값: Platform | 'ALL') => void;
}) {
  const t = use말();
  return (
    <>
      <span className="filter-label">{t('디바이스')}</span>
      {/* 판정별 보기에도 「전체」가 있다 — 화면 읽기에서 어느 묶음의 「전체」인지 이름으로 가른다 */}
      <div className="chip-group" role="group" aria-label={t('디바이스로 거르기')}>
        {(['ALL', ...디바이스들] as (Platform | 'ALL')[]).map((값) => (
          <button className="chip" key={값} aria-pressed={device === 값} onClick={() => on디바이스(값)}>
            {값 === 'ALL' ? t('전체') : PLATFORM_LABEL[값]}
          </button>
        ))}
      </div>
    </>
  );
}

export function 쪽넘김({ 쪽, 전체쪽, on쪽 }: { 쪽: number; 전체쪽: number; on쪽: (쪽: number) => void }) {
  const t = use말();
  if (전체쪽 <= 1) return null;
  return (
    <div className="pager">
      <button onClick={() => on쪽(쪽 - 1)} disabled={쪽 <= 1}>
        {t('이전')}
      </button>
      <span>
        {쪽} / {전체쪽}
      </span>
      <button onClick={() => on쪽(쪽 + 1)} disabled={쪽 >= 전체쪽}>
        {t('다음')}
      </button>
    </div>
  );
}

interface Props {
  data: 실행;
  insights: 비교 | null;
  /** 카드의 요구 고리 · 판정 버튼을 그 실행 서비스의 권한으로 가른다 */
  판정하기: 판정하기;
  /** 견주기가 실패했을 때의 문장. 결과는 그대로 서되 조용히 사라지지는 않는다 */
  견줌오류: string | null;
  /** 실행 기록의 결과 칸 안 — 한 단이고 머리 아래 이 칸 하나가 스크롤한다 (도메인/실행 §8.7 「A안」) */
  칸안: boolean;
  판정: ItemStatus | 'ALL';
  on판정: (값: ItemStatus | 'ALL') => void;
  device: Platform | 'ALL';
  on디바이스: (값: Platform | 'ALL') => void;
  page: number;
  on쪽: (쪽: number) => void;
}

export function 끝난결과(props: Props) {
  const { data, insights, 판정하기, 견줌오류, 칸안, 판정, on판정, device, on디바이스, page, on쪽 } = props;
  const t = use말();
  const 통과제목 = useRef<HTMLHeadingElement>(null);
  const 권한 = 실행판정(판정하기, data);
  const 디바이스들 = 실행디바이스들(data.items);
  const columns = device === 'ALL' ? 디바이스들 : [device];
  const { 줄들, 카드안항목수 } = 갈라낸다(data.items, 판정, device);
  const 전체쪽 = Math.max(1, Math.ceil(줄들.length / PAGE_SIZE));
  const 보는쪽 = Math.min(page, 전체쪽);
  const 보이는줄 = 줄들.slice((보는쪽 - 1) * PAGE_SIZE, 보는쪽 * PAGE_SIZE);
  // 통로는 실패가 있을 때만 부른다. 0건이면 부를 까닭이 없다 (§8.3)
  const 카드구획 = 판정 === 'ALL' || 판정 === 'FAIL';
  const 줄구획 = !(판정 === 'FAIL' || (판정 === 'ALL' && 줄들.length === 0));

  const 본문 = (
    <>
      <RunSummary counts={data.counts} 실패케이스수={실패케이스들(data.items).length} insights={insights} 판정={판정} on판정={on판정} />
      {견줌오류 === null ? null : (
        <p className="hint">
          {t('직전 실행과 비교하지 못했습니다')} {견줌오류}
        </p>
      )}

      {/* 옆 칸은 2026-10-19 ⑫ 에 걷었다 — 실행 정보는 머리 한 줄, 증적은 머리 단추, 해결은 요약 띠 안이다.
          창이 900px 보다 좁으면 옆 칸이 맨 아래로 내려가 실행 정보가 화면 끝에 묻혔다 (점검 2.2) */}
      <div className="rr-cols">
        <div className="rr-main">
          <div className="toolbar">
            <디바이스칩 디바이스들={디바이스들} device={device} on디바이스={on디바이스} />
          </div>

          {/* 카드가 길면 키보드 · 화면 읽기로 통과 줄까지 카드 수만큼 탭해야 한다. 주소가 `#/` 로 가는 앱이라
              `#id` 링크 대신 버튼으로 포커스를 옮긴다. 보이는 건 포커스가 왔을 때뿐이다 */}
          {!카드구획 || !줄구획 || data.counts.fail === 0 ? null : (
            <button
              type="button"
              className="btn small ghost skip-link"
              onClick={() => {
                통과제목.current?.focus();
                통과제목.current?.scrollIntoView?.({ block: 'start' });
              }}
            >
              {t('통과 · 미실행으로 건너뛰기')}
            </button>
          )}

          {!카드구획 ? null : data.counts.fail === 0 ? (
            <p className="empty">{t('실패한 케이스가 없습니다')}</p>
          ) : (
            <section className="rr-sec">
              {/* 칩이나 실행이 바뀌면 새로 그린다 — 앞 거르개 · 앞 실행의 쪽 번호가 남으면 안 된다 */}
              <RunFailCards key={`${String(data.runId)}-${device}`} runId={data.runId} env={data.env} items={data.items} platform={device} 권한={권한} 유형들={insights?.실패유형들} />
            </section>
          )}

          {!줄구획 ? null : (
            <section className="rr-sec rr-rows">
              <h2 ref={통과제목} tabIndex={-1} className="fc-title">
                {t('통과 · 미실행')} <span className="rr-n">{줄들.length}</span>
              </h2>
              {보이는줄.length === 0 ? (
                <div className="empty">{t('조건에 맞는 결과가 없습니다')}</div>
              ) : (
                보이는줄.map((group) => <결과줄 key={group.tcId} group={group} columns={columns} runId={data.runId} />)
              )}
              <쪽넘김 쪽={보는쪽} 전체쪽={전체쪽} on쪽={on쪽} />
              {카드안항목수 === 0 ? null : (
                <p className="rr-axis">{t('실패한 케이스 안의 항목 {건수}건은 「전체」에서 카드로 봅니다', { 건수: 카드안항목수 })}</p>
              )}
            </section>
          )}

        </div>
      </div>
    </>
  );

  return 칸안 ? (
    <div className="screen rr pane-results">
      <div className="rows-scroll rr-scroll">{본문}</div>
    </div>
  ) : (
    <div className="screen rr">{본문}</div>
  );
}
