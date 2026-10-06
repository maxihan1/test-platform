// E2E 시나리오 조립 화면 왼쪽의 단계 카드 목록 — 한 줄 요약 · 칩 · 모킹 구간 · 위로 · 아래로 · 빼기 (도메인/시나리오 §8.11)

import type { ScenarioPart } from '@platform/kit';
import { useEffect, useRef, type ReactNode } from 'react';

import type { Platform } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 모킹구간, 빼기, 순서바꾸기, 카드요약, 종류글, type 재료들 } from './scenarioView.js';
import type { 조립탭 } from './ScenarioTabs.js';
import { PLATFORM_LABEL } from './ui.js';

type 동작 = 'up' | 'down' | 'pick' | 'add';

/** 카드 하나가 옮겨지면 고른 번호가 어디로 가는지. 고른 카드는 따라가고 지나가는 카드는 한 칸 밀린다 */
function 따라간번호(고른: number, from: number, to: number): number {
  if (고른 === from) return to;
  if (from < 고른 && 고른 <= to) return 고른 - 1;
  if (to <= 고른 && 고른 < from) return 고른 + 1;
  return 고른;
}

export function ScenarioCards({
  단계들,
  단계들바꾸기,
  재료,
  디바이스,
  쓰나,
  고른번호,
  on고르기,
  on탭,
  시험요약,
}: {
  단계들: ScenarioPart[];
  단계들바꾸기: (다음: ScenarioPart[]) => void;
  재료: 재료들;
  디바이스: Platform;
  쓰나: boolean;
  고른번호: number | null;
  on고르기: (번호: number | null) => void;
  on탭: (탭: 조립탭) => void;
  시험요약?: ReactNode;
}) {
  const t = use말();
  const 언어 = use언어();
  const 뿌리 = useRef<HTMLDivElement>(null);
  // 버튼이 새 자리에 다시 그려진 뒤에야 포커스를 줄 수 있어 다음 그리기에서 처리한다
  const 포커스 = useRef<{ 번호: number; 동작: 동작 } | null>(null);
  const 구간 = 모킹구간(단계들);

  useEffect(() => {
    const 갈곳 = 포커스.current;
    if (갈곳 === null) return;
    포커스.current = null;
    const 찾기 = (번호: number, 동작: 동작) =>
      뿌리.current?.querySelector<HTMLElement>(
        동작 === 'add' ? '[data-act="add"]' : `[data-card="${번호}"][data-act="${동작}"]`,
      );
    // 맨 위 · 맨 아래에 닿아 같은 방향 버튼이 사라졌으면 그 카드의 고르는 버튼이 받는다
    (찾기(갈곳.번호, 갈곳.동작) ?? 찾기(갈곳.번호, 'pick'))?.focus();
  }, [단계들]);

  function 옮기기(from: number, to: number, 동작: 'up' | 'down') {
    포커스.current = { 번호: to, 동작 };
    단계들바꾸기(순서바꾸기(단계들, from, to));
    if (고른번호 !== null) on고르기(따라간번호(고른번호, from, to));
  }

  function 빼내기(seq: number) {
    const 남음 = 단계들.length - 1;
    포커스.current = 남음 === 0 ? { 번호: 0, 동작: 'add' } : { 번호: Math.min(seq, 남음), 동작: 'pick' };
    단계들바꾸기(빼기(단계들, seq));
    if (고른번호 === seq) {
      on고르기(null);
      on탭('add');
    } else if (고른번호 !== null && 고른번호 > seq) {
      on고르기(고른번호 - 1);
    }
  }

  return (
    <div className="scn-cards-wrap" ref={뿌리}>
      <div className="scn-cards-head">
        <h2 className="scn-cards-title">{t('단계 순서')}</h2>
        {!쓰나 ? null : (
          <button type="button" className="btn ghost" data-act="add" onClick={() => on탭('add')}>
            {t('+ 단계 추가')}
          </button>
        )}
      </div>
      <p className="scn-cards-hint">{t('단계를 누르면 설정이 열립니다')}</p>
      {단계들.length === 0 ? (
        <p className="scn-cards-empty">{t('아직 단계가 없습니다. 「단계 추가」 탭에서 케이스를 고릅니다')}</p>
      ) : (
        <ol className="scn-cards">
          {단계들.map((part, i) => {
            const 번호 = i + 1;
            const 재료값 = part.kind === 'case' ? 재료.get(part.tcId) : undefined;
            const 모킹안 = (구간[i]?.length ?? 0) > 0;
            const 이름 =
              part.kind === 'case' ? (재료값 ? `${part.tcId} ${재료값.name}` : part.tcId) : 카드요약(part, undefined, 언어);
            const 요약 =
              part.kind !== 'case' ? '' : 재료값 === null ? t('케이스를 찾지 못했습니다') : 카드요약(part, 재료값, 언어);
            const 클래스 = ['scn-card', 번호 === 고른번호 ? 'selected' : '', 모킹안 ? 'mocked' : ''].filter(Boolean).join(' ');
            return (
              <li key={번호} className={클래스}>
                <button
                  type="button"
                  className="scn-card-pick"
                  data-card={번호}
                  data-act="pick"
                  aria-current={번호 === 고른번호}
                  onClick={() => {
                    on고르기(번호);
                    on탭('settings');
                  }}
                >
                  <span className="scn-card-seq">{번호}</span>
                  <span className="tech-tag">{t(종류글[part.kind])}</span>
                  <span className="scn-card-name">{이름}</span>
                  {요약 === '' ? null : <span className="scn-card-sum">{요약}</span>}
                </button>
                <span className="scn-card-chips">
                  {part.kind === 'case' ? 칩들(part, 재료값, 디바이스, t) : null}
                  {part.kind === 'api' && 모킹안 ? <span className="tech-tag">{t('모킹되지 않음')}</span> : null}
                </span>
                {!쓰나 ? null : (
                  <span className="scn-card-ops">
                    {번호 === 1 ? null : (
                      <button type="button" className="scn-op" data-card={번호} data-act="up" aria-label={t('{번호}번 위로', { 번호 })} onClick={() => 옮기기(번호, 번호 - 1, 'up')}>
                        ↑
                      </button>
                    )}
                    {번호 === 단계들.length ? null : (
                      <button type="button" className="scn-op" data-card={번호} data-act="down" aria-label={t('{번호}번 아래로', { 번호 })} onClick={() => 옮기기(번호, 번호 + 1, 'down')}>
                        ↓
                      </button>
                    )}
                    <button type="button" className="scn-op" aria-label={t('{번호}번 빼기', { 번호 })} onClick={() => 빼내기(번호)}>
                      ✕
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {시험요약 === undefined ? null : <div className="scn-cards-trial">{시험요약}</div>}
    </div>
  );
}

// 서버 점검(checks)의 번호는 순서를 바꾸면 낡아서 칩을 전부 여기서 계산한다
function 칩들(
  part: Extract<ScenarioPart, { kind: 'case' }>,
  재료값: ReturnType<재료들['get']>,
  디바이스: Platform,
  t: (키: string, 값?: Record<string, string | number>) => string,
): ReactNode {
  if (재료값 === undefined) return null;
  const 단독 = part.carryOver === false ? <span className="tech-tag">{t('단독 실행')}</span> : null;
  if (재료값 === null) {
    return (
      <>
        <span className="case-tag">{t('실행 불가')}</span>
        {단독}
      </>
    );
  }
  const 건너뛸수있는 = new Set(재료값.steps.filter((s) => s.skippable).map((s) => s.title));
  const 확인필요 = part.skipSteps.some((s) => !건너뛸수있는.has(s));
  return (
    <>
      {재료값.unconfirmed === null ? null : <span className="case-tag">{t('미확정')}</span>}
      {단독}
      {!확인필요 ? null : <span className="case-tag">{t('확인 필요')}</span>}
      {재료값.platforms.includes(디바이스) ? null : (
        <span className="case-tag">{t('{디바이스}에서 돌지 않는 케이스', { 디바이스: t(PLATFORM_LABEL[디바이스]) })}</span>
      )}
    </>
  );
}
