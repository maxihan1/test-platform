// 실행 결과 화면의 실패 케이스 카드 목록 — 카드는 접힌 머리 한 줄로 서고, 펴면 깨진 디바이스와 통과 · 미실행 줄이 나온다 (실행 §8.3)

import { useEffect, useRef, useState } from 'react';

import { api, type Platform, type RunItemSummary, type 실패유형묶음 } from './api.js';
import { 실패유형이름 } from './DashboardTypes.js';
import { 카드찾기 } from './failureFind.js';
import { use말 } from './i18n.js';
import type { 판정 } from './role.js';
import { 실패카드 } from './RunFailCard.js';
import { 바꾼보기, 처음보기, 펼침바꾼보기, type 결과보기, type 보기바꿈 } from './runResultView.js';
import { Failed, Loading, useAsync } from './ui.js';
import type { 다시돌린결과 } from './useRerunResults.js';

interface Props {
  runId: number;
  env: string;
  /** 그 실행 응답의 항목 — 실패 케이스의 통과 · 미실행 디바이스 줄을 그리는 데 쓴다 */
  items: RunItemSummary[];
  platform: Platform | 'ALL';
  /** 그 실행 서비스의 권한 — 「화면이 맞음」 · 「버그」 버튼과 요구 고리를 가른다. 안 주면 아무것도 못 하는 것으로 본다 */
  권한?: 판정;
  /** insights 의 실패유형들 — 카드 위 「실패 유형」 칩 줄. 못 받았으면 줄을 안 그린다 */
  유형들?: 실패유형묶음[];
  /** 요약 띠 직전 대비의 「회귀 실패」 · 「기존 실패」를 눌러 건 거르개. 받은 쪽 안에서만 거른다 */
  변화?: '새로깨짐' | '계속깨짐' | null;
  /** 이 케이스를 펼친 채 연다 — 대시보드 · 항목 상세에서 원인까지 곧장 내려온 주소(`&tc=`)다. 다른 쪽에 있으면 그 쪽으로 간다 */
  열카드?: string;
  /** 「실패 다시 실행」으로 다시 돌린 결과 — 케이스마다 가장 새 것 */
  다시돌림?: ReadonlyMap<string, 다시돌린결과>;
  /** 카드 쪽 · 유형 칩 · 「판정 안 한 카드」 · 펼친 카드. 결과 화면이 주소에 담는다. 안 주면 이 목록이 스스로 든다 */
  보기?: 결과보기;
  바꾸기?: (바꿀: 보기바꿈) => void;
}

const 권한없음: 판정 = () => false;

export function RunFailCards(props: Props) {
  const t = use말();
  // 항목이 없으면 실패도 없다. 통로를 부르지 않는다
  if (props.items.length === 0) return <p className="empty">{t('실패한 케이스가 없습니다')}</p>;
  return <카드목록 {...props} />;
}

function 카드목록({ runId, env, items, platform, 권한 = 권한없음, 유형들 = [], 변화 = null, 열카드, 다시돌림, ...props }: Props) {
  const t = use말();
  // 보기를 안 받은 목록(시험 · 다른 화면)은 링크로 온 카드를 펼친 카드로 들고 시작한다
  const [내보기, set내보기] = useState(() => (열카드 === undefined ? 처음보기 : { ...처음보기, 열린: [열카드] }));
  const 보기 = props.보기 ?? 내보기;
  const 바꾸기 = props.바꾸기 ?? ((바꿀: 보기바꿈) => set내보기((앞) => 바꾼보기(앞, 바꿀)));
  // 디바이스를 고르면 보기가 1쪽으로 푼다(runResultView 디바이스고른보기) — 이 목록은 그때 새로 선다
  const { 카드쪽: 쪽, 유형: 고른유형, 안본것만 } = 보기;
  // 돌아오면 마지막에 편 카드로 화면을 옮긴다 — 링크로 온 카드가 있으면 그것. 한 번 옮기면 비운다 — 칩을 껐다 켜 카드가 다시 설 때마다 화면이 뛰면 안 된다
  const 맞출 = useRef(열카드 ?? 보기.열린.at(-1));
  const 응답 = useAsync(() => api.failures(runId, 쪽, platform === 'ALL' ? undefined : platform), [runId, 쪽, platform]);
  const 머리 = useRef<HTMLHeadingElement>(null);
  const 넘김 = useRef(false);

  // 펼칠 카드가 1쪽에 없으면 그 쪽으로 간다 — 이 실행을 연 처음 한 번만. 디바이스 칩을 바꿔 부른 사람의 쪽 넘김을 되돌리지 않는다. 못 찾으면 1쪽에 그대로 둔다
  const 이동했나 = useRef(false);
  useEffect(() => {
    if (열카드 === undefined || 이동했나.current) return;
    // 찾는 사이 디바이스를 바꿔 이 목록이 내려가면 답을 버린다 — 보기는 바깥이 들어 새 목록의 쪽을 덮는다
    let 살아있음 = true;
    카드찾기(runId, 열카드, platform === 'ALL' ? undefined : platform).then(
      (찾음) => {
        if (!살아있음) return;
        이동했나.current = true;
        if (찾음 !== null) 바꾸기({ 카드쪽: 찾음.쪽 });
      },
      (err: unknown) => console.error('[run] finding the card to open failed; staying on page 1', err),
    );
    return () => {
      살아있음 = false;
    };
  }, [runId, 열카드, platform]);

  // 쪽을 넘기면 키보드 사용자가 새 목록의 처음으로 돌아가야 한다
  useEffect(() => {
    if (!넘김.current || 응답.data === null) return;
    넘김.current = false;
    머리.current?.focus();
  }, [응답.data]);

  const 다시읽기 = 응답.reload;

  if (응답.error !== null) return <Failed error={응답.error} />;
  if (응답.data === null) return <Loading />;

  // 쪽을 넘기면 다른 카드가 선다 — 펼친 카드도 비운다
  const 이동 = (다음쪽: number) => {
    넘김.current = true;
    바꾸기({ 카드쪽: 다음쪽, 열린: [] });
  };
  // 총수는 서버가 실패 케이스를 그룹으로 센 정확한 값이다. 받은 건수가 쪽 크기와 같다고 더 있다고 보면
  // 정확히 한 쪽 크기일 때 빈 다음 쪽이 열린다
  const 더있나 = 쪽 * 응답.data.pageSize < 응답.data.total;
  // ponytail: 유형 거르기는 받은 쪽 안에서만 한다 — 실패 카드 통로에 유형 조건이 없어서다(계약 밖). 쪽이 여럿이면 아래 한 줄이 전체 수를 알린다
  const 유형칸 = platform === 'ALL' ? (유형들.find((u) => u.type === 고른유형) ?? null) : null;
  const 보일카드 = 응답.data.items.filter(
    (c) =>
      (유형칸 === null || 유형칸.tcIds.includes(c.tcId)) &&
      (변화 === null || c.devices.some((d) => d.change === 변화)) &&
      (!안본것만 || c.judgment === null),
  );
  const 받은카드 = 응답.data.items;
  const 안본수 = 응답.data.items.filter((c) => c.judgment === null).length;
  // 변화 · 판정 거르개는 이 쪽 안에서만 거른다 — 카드 통로에 그 조건이 없다(계약 밖). 유형은 전체 수를 알아 따로 안내한다
  const 이쪽만거름 = (변화 !== null || 안본것만) && (쪽 > 1 || 더있나);

  return (
    <section className="fc-list">
      <h2 ref={머리} tabIndex={-1} className="fc-title">
        {t('실패한 케이스')} <span className="fc-count">{응답.data.total}</span>
      </h2>

      {/* 같은 원인끼리 훑는다 — 수는 카드(케이스) 수다. 앞 판의 「같은 사유로 실패」는 확인 문장마다 한 덩어리였다 (실행 §8.3 「실패 유형으로 묶는다」 · WEB-F7-13).
          유형은 디바이스 차례로 첫 깨진 디바이스 것이라 디바이스를 거른 동안에는 카드 머리 칩과 어긋난다 — 그때는 판을 안 그린다 */}
      {유형들.length === 0 || platform !== 'ALL' ? null : (
        <div className="fc-causes" role="group" aria-label={t('실패 원인')}>
          <div className="fc-causes-h">
            <b>{t('실패 원인')}</b>
            <span>{t('실패 {건수}건을 원인별로 묶었습니다 · 누르면 그 원인 카드만 보입니다', { 건수: 유형들.reduce((합, u) => 합 + u.count, 0) })}</span>
          </div>
          {유형들.map((u) => {
            // 원인 글은 이 쪽에서 그 유형의 첫 카드 것이다 — 통로가 유형마다 대표 글을 주지 않는다(계약 밖)
            const 첫카드 = 받은카드.find((c) => u.tcIds.includes(c.tcId));
            const 글 = 첫카드?.devices[0]?.item.failure?.reason ?? null;
            return (
              <button
                key={u.type}
                type="button"
                className={u.type === 'environment' ? 'fc-cause env' : 'fc-cause'}
                aria-pressed={u.type === 고른유형}
                // 다시 누르면 푼다 — 「전체」 칸을 따로 두지 않는다
                onClick={() => 바꾸기({ 유형: u.type === 고른유형 ? null : u.type })}
              >
                <b className="fc-cause-n num">{u.count}</b>
                <span className="fc-cause-type">{t(실패유형이름[u.type])}</span>
                <span className="fc-cause-what">{글}</span>
                <span className="fc-cause-tcs">
                  {u.tcIds.slice(0, 3).map((tc) => (
                    <span key={tc} className="mono">
                      {tc}
                    </span>
                  ))}
                  {u.tcIds.length > 3 ? <span>{t('외 {건수}건', { 건수: u.tcIds.length - 3 })}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {/* 판정한 카드와 아직 안 본 카드를 가른다 — 판정은 카드 맨 아래라 접힌 줄만 봐서는 몰랐다 (점검 2.24) */}
      <div className="chip-group fc-types" role="group" aria-label={t('판정 여부')}>
        <button type="button" className="chip" aria-pressed={안본것만} onClick={() => 바꾸기({ 안본것만: !안본것만 })}>
          {t('판정 안 한 카드')} <b className="num">{안본수}</b>
        </button>
      </div>
      {!이쪽만거름 ? null : <p className="hint">{t('거른 결과는 이 쪽 카드 안에서만 보입니다 — 다른 쪽도 확인하세요')}</p>}
      {유형칸 === null || 보일카드.length === 유형칸.count ? null : (
        <p className="hint">{t('이 쪽에 {보인}건 · 이 유형 전체 {전체}건 — 나머지는 다른 쪽에 있습니다', { 보인: 보일카드.length, 전체: 유형칸.count })}</p>
      )}

      {보일카드.length === 0 ? (
        유형칸 === null ? <p className="empty">{t('실패한 케이스가 없습니다')}</p> : null
      ) : (
        보일카드.map((c) => (
          <실패카드
            key={c.tcId}
            c={c}
            runId={runId}
            env={env}
            items={items}
            platform={platform}
            권한={권한}
            on남김={다시읽기}
            열기={보기.열린.includes(c.tcId)}
            맞추기={c.tcId === 맞출.current}
            on맞춤={() => {
              맞출.current = undefined;
            }}
            on펼침={(열림) => 바꾸기((앞) => 펼침바꾼보기(앞, c.tcId, 열림))}
            다시돌림={다시돌림?.get(c.tcId)}
          />
        ))
      )}

      {쪽 === 1 && !더있나 ? null : (
        <div className="pager">
          <button type="button" onClick={() => 이동(쪽 - 1)} disabled={쪽 <= 1}>
            {t('이전')}
          </button>
          <span>{t('{쪽}쪽', { 쪽 })}</span>
          <button type="button" onClick={() => 이동(쪽 + 1)} disabled={!더있나}>
            {t('다음')}
          </button>
        </div>
      )}
    </section>
  );
}
