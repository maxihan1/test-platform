// 실행 결과 본문 — 요약 한 줄 → 실행 차례 표. 도는 동안에도 같은 표이고 요약 자리에 진행 띠와 판정 칩이 선다. 늘 한 단이다 (도메인/실행 §8.3)

import type { api, ItemStatus, Platform, RunInsights as 비교 } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 통과알림목록 } from './RunInsights.js';
import { 실행판정, type 판정하기 } from './runJudge.js';
import { 흐름표 } from './RunFlowTable.js';
import { type 결과보기, type 보기바꿈, 디바이스고른보기, 판정고른보기 } from './runResultView.js';
import { RunSummary, 칸수 } from './RunSummary.js';
import { PLATFORM_LABEL, STATUS_LABEL, 돈디바이스들 } from './ui.js';
import { use다시돌린결과 } from './useRerunResults.js';
import { 케이스서비스 } from './role.js';
import { 그중미확정글 } from './unconfirmed.js';

type 실행 = Awaited<ReturnType<typeof api.run>>;

const STATUSES: (ItemStatus | 'ALL')[] = ['ALL', 'PASS', 'FAIL', 'NA'];

/** 디바이스가 하나인 실행은 고를 것이 없어 그리지 않는다 (DESIGN.md 「실행 결과」) */
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
  if (디바이스들.length < 2) return null;
  return (
    <>
      <span className="filter-label">{t('디바이스')}</span>
      {/* 판정별 보기에도 「전체」가 있다 — 화면 읽기에서 어느 묶음의 「전체」인지 이름으로 가른다 */}
      <div className="chip-group" role="group" aria-label={t('디바이스 필터')}>
        {(['ALL', ...디바이스들] as (Platform | 'ALL')[]).map((값) => (
          <button className="chip" key={값} aria-pressed={device === 값} onClick={() => on디바이스(값)}>
            {값 === 'ALL' ? t('전체') : PLATFORM_LABEL[값]}
          </button>
        ))}
      </div>
    </>
  );
}

/** 도는 동안 머리에 서는 판정 숫자 — 끝나면 요약 한 줄이 맡는다. 같은 숫자를 두 번 두지 않는다 (도메인/실행 §8.3) */
export function 도는집계({ counts }: { counts: 실행['counts'] }) {
  const t = use말();
  const 미확정 = 그중미확정글(counts, use언어());
  return (
    <>
      <div>
        <b style={{ color: 'var(--pass-text)' }}>{counts.pass}</b>
        <span>{t('Pass')}</span>
      </div>
      <div>
        <b style={{ color: 'var(--fail-text)' }}>{counts.fail}</b>
        <span>{t('Fail')}</span>
      </div>
      <div>
        <b style={{ color: 'var(--na-text)' }}>{counts.na}</b>
        <span>{t('Not tested')}</span>
      </div>
      {/* 미확정은 위 숫자에 이미 센 항목이다 — 「그중 N건」 글자만 뒤에 붙는다. 없으면 안 쓴다 (도메인/실행 §8.3 · §3.2) */}
      {미확정 === '' ? null : (
        <div>
          <span>{미확정}</span>
        </div>
      )}
    </>
  );
}

interface Props {
  data: 실행;
  /** 도는 중인가 — 요약 한 줄은 끝난 뒤에 선다. 판정이 안 들어간 항목이 미실행으로 읽혀 통과율이 틀린다 */
  running: boolean;
  insights: 비교 | null;
  /** 펼친 줄의 요구 고리 · 판정 버튼을 그 실행 서비스의 권한으로 가른다 */
  판정하기: 판정하기;
  /** 견주기가 실패했을 때의 문장. 결과는 그대로 서되 조용히 사라지지는 않는다 */
  견줌오류: string | null;
  /** 실행 기록의 결과 칸 안 — 한 단이고 머리 아래 이 칸 하나가 스크롤한다 (도메인/실행 §8.7 「A안」) */
  칸안: boolean;
  /** 거르개 · 쪽 · 펼친 줄 — 주소에 담긴다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」) */
  보기: 결과보기;
  바꾸기: (바꿀: 보기바꿈) => void;
  /** 대시보드 · 항목 상세에서 곧장 내려온 케이스 — 그 줄을 펼친 채 연다 (`&tc=`) */
  열카드?: string;
}

export function 결과본문(props: Props) {
  const { data, running, insights, 판정하기, 견줌오류, 칸안, 보기, 바꾸기, 열카드 } = props;
  const { 판정 } = 보기;
  const t = use말();
  // 주소로 온 직전 대비 거르개는 풀 단추가 있을 때만 건다 — 직전 실행이 없거나 그 건수가 0이면 단추가 없거나 꺼져 줄이 다 사라진 채 풀 길이 없다
  const 변화 = 보기.변화 !== null && insights !== null && insights.previous !== null && 칸수(insights, 보기.변화) > 0 ? 보기.변화 : null;
  const on판정 = (값: ItemStatus | 'ALL') => 바꾸기(판정고른보기(값));
  const on디바이스 = (값: Platform | 'ALL') => 바꾸기(디바이스고른보기(값));
  // 「Fail N건 다시 실행」으로 다시 돌린 결과를 원래 줄에 잇는다 — 실패가 있고 끝난 실행일 때만 찾는다 (점검 2.17)
  const 다시돌림 = use다시돌린결과(data.runId, 케이스서비스(data.items[0]?.tcId ?? ''), !running && data.counts.fail > 0);
  // 칸은 실제로 돈 디바이스다 — PC 만 돈 웹 실행에 모바일 칸을 두면 모든 줄이 — 로 빈다
  const 디바이스들 = 돈디바이스들(data.items);
  // 주소에 남은 디바이스가 이 실행에 없으면 전체로 본다 — 빈 표로 굳지 않게
  const device = 보기.device !== 'ALL' && 디바이스들.includes(보기.device) ? 보기.device : 'ALL';
  const { pass, fail, na } = data.counts;

  const 본문 = (
    <>
      {running ? (
        <>
          {/* 남은 것도 칸을 받는다 — 끝난 것만으로 띠를 채우면 12/40 인데 띠가 다 찬 것으로 읽힌다 (점검 2.14) */}
          {data.counts.total === 0 ? null : (
            <div className="stripe">
              <i style={{ background: 'var(--pass)', flex: pass }} />
              <i style={{ background: 'var(--fail)', flex: fail }} />
              <i style={{ background: 'var(--na)', flex: na }} />
              <i style={{ background: 'var(--well)', flex: data.counts.running }} />
            </div>
          )}
          <div className="toolbar">
            <span className="filter-label">{t('판정')}</span>
            <div className="chip-group" role="group" aria-label={t('판정')}>
              {STATUSES.map((값) => (
                <button className="chip" key={값} aria-pressed={판정 === 값} onClick={() => on판정(값)}>
                  {값 === 'ALL' ? t('전체') : STATUS_LABEL[값]}
                </button>
              ))}
            </div>
            <디바이스칩 디바이스들={디바이스들} device={device} on디바이스={on디바이스} />
          </div>
        </>
      ) : (
        <>
          <RunSummary counts={data.counts} insights={insights} 판정={판정} on판정={on판정} 변화={변화} on변화={(값) => 바꾸기({ 변화: 값, 쪽: 1 })} 항목들={data.items} />
          <통과알림목록 insights={insights} runId={data.runId} />
          {견줌오류 === null ? null : (
            <p className="hint">
              {t('이전 실행과 비교하지 못했습니다')} {견줌오류}
            </p>
          )}
          {디바이스들.length < 2 ? null : (
            <div className="toolbar">
              <디바이스칩 디바이스들={디바이스들} device={device} on디바이스={on디바이스} />
            </div>
          )}
        </>
      )}

      {/* 디바이스를 바꾸면 펼친 Fail 줄이 그 디바이스 것을 다시 받는다 — 표를 새로 세운다 */}
      <흐름표
        key={`${String(data.runId)}-${device}`}
        runId={data.runId}
        env={data.env}
        items={data.items}
        columns={device === 'ALL' ? 디바이스들 : [device]}
        device={device}
        권한={실행판정(판정하기, data)}
        끝났나={!running}
        자동수정={data.autoFixedCases ?? []}
        다시돌림={다시돌림}
        insights={변화 === null ? null : insights}
        보기={{ ...보기, 변화 }}
        바꾸기={바꾸기}
        열카드={열카드}
      />
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
