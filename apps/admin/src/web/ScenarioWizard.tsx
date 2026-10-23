// E2E 시나리오 마법사 — 화면 전체를 덮고 왼쪽 단계 띠 · 지금 단계 안내 칸, 오른쪽 본문으로 한 단계씩 넘긴다. 저장 모양은 조립 화면과 같은 ScenarioPart[] 다 (도메인/시나리오 §3.7 결정 15 · §8.11 「마법사」)

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScenarioPart } from '@platform/kit';

import type { CaseRow, Platform, ServiceRow, User } from './api.js';
import { use말 } from './i18n.js';
import { 떠나기막기, 떠나기상자 } from './leaveGuard.js';
import { 판정을만든다 } from './role.js';
import { 단계칸, type 케이스줄들 } from './ScenarioWizardSteps.js';
import { AI칸, 시작칸, type 시작방법 } from './ScenarioWizardStart.js';
import { 단계띠, 단계이름, 단계제목, type 마법사단계 } from './ScenarioWizardHelp.js';
import { 저장칸 } from './ScenarioWizardSave.js';
import { 시험칸 } from './ScenarioWizardTrial.js';
import { 값연결칸 } from './ScenarioWizardValues.js';
import { 종류글, 후보단계들 } from './scenarioView.js';
import { useFlowSuggest } from './useFlowSuggest.js';
import { 초안넘기기 } from './useScenarioDraft.js';
import { useWizardEnd } from './useWizardEnd.js';
import { useWizardKeys } from './useWizardKeys.js';
import { useWizardMaterial } from './useWizardMaterial.js';
import { useWizardValues } from './useWizardValues.js';

const 나가는곳 = '#/scenarios';

export function ScenarioWizard({ 띠서비스, user }: { 띠서비스: ServiceRow | null; user: User }) {
  const t = use말();
  // 열 때 고른 애플리케이션이 시나리오 서비스다 — 헤더 고르개를 바꿔도 따라가지 않는다(조립 화면과 같다)
  const [서비스, set서비스] = useState(띠서비스?.prefix ?? '');
  const [방법, set방법] = useState<시작방법 | null>(null);
  const [디바이스, set디바이스] = useState<Platform>('desktop');
  const [단계들, set단계들] = useState<ScenarioPart[]>([]);
  const [이름, set이름] = useState('');
  const [바람, set바람] = useState('');
  const [고른후보, set고른후보] = useState<number | null>(null);
  const [케이스줄, set케이스줄] = useState<케이스줄들>(new Map());
  const [지금, set지금] = useState(0);
  const [방향, set방향] = useState<'fwd' | 'back' | null>(null);
  const [이유, set이유] = useState<string | null>(null);
  // 같은 까닭으로 또 막혀도 다시 흔들리게 열쇠를 바꾼다
  const [흔들, set흔들] = useState(0);
  const 흐름 = useFlowSuggest();
  const { 재료 } = useWizardMaterial(단계들.flatMap((p) => (p.kind === 'case' ? [p.tcId] : [])));
  const 틀 = useRef<HTMLDivElement>(null);
  const 본문 = useRef<HTMLDivElement>(null);
  useWizardKeys(틀, 나가는곳);

  const 쓰나 = 판정을만든다(user, 서비스)('실행');
  useEffect(() => {
    // 읽기만 하는 사람이 주소로 연 마법사는 쓸 데가 없다
    if (!쓰나) window.location.hash = 나가는곳;
  }, [쓰나]);

  // 단계가 바뀌면 그 단계 첫 칸에 손이 간다 — 키보드로 넘기는 사람이 칸을 찾아 헤매지 않게.
  // 본문 스크롤도 맨 위로 — 긴 후보 목록 아래에서 고르고 넘기면 다음 단계가 제목 없이 중간부터 보였다
  useEffect(() => {
    if (본문.current?.parentElement) 본문.current.parentElement.scrollTop = 0;
    본문.current?.querySelector<HTMLElement>('input:not(:disabled), select, [aria-pressed]')?.focus({ preventScroll: true });
  }, [지금]);

  const 읽음 = useCallback((rows: CaseRow[]) => {
    set케이스줄((앞) => {
      const 다음 = new Map(앞);
      for (const c of rows) 다음.set(c.tcId, { name: c.name, screens: (c.screens ?? []).flatMap((s) => (s.url === null ? [] : [s.url])) });
      return 다음;
    });
  }, []);

  const 값 = useWizardValues(단계들, 재료);
  const { 보낼 } = 값;
  const 앱들 = user.services.filter((s) => s.projectId === user.services.find((x) => x.prefix === 서비스)?.projectId);
  const 끝 = useWizardEnd({ 서비스, 디바이스, 이름, 보낼, 앱들, on까닭: set이유 });
  const { 시험, 저장됨 } = 끝;

  if (!쓰나) return null;
  const 목록: 마법사단계[] = ['start', ...(방법 === 'ai' ? (['ai'] as const) : []), 'steps', 'values', 'trial', 'save'];
  const st = 목록[Math.min(지금, 목록.length - 1)]!;
  const 바람값 = 바람.trim() === '' ? {} : { wish: 바람.trim() };
  const 이름의 = (번호: number) => {
    const p = 보낼[번호 - 1];
    return p?.kind === 'case' ? (케이스줄.get(p.tcId)?.name ?? 재료.get(p.tcId)?.name ?? p.tcId) : '';
  };

  const 간다 = (i: number, 쪽: 'fwd' | 'back') => {
    set지금(i);
    set방향(쪽);
    set이유(null);
  };
  // 시작 방법 · 애플리케이션 · 디바이스가 바뀌면 받은 AI 후보는 다른 조건의 것이다
  const 추천버림 = () => {
    흐름.버리기();
    set고른후보(null);
  };

  function 막는이유(): string | null {
    if (st === 'start') return 방법 === null ? '시작 방법을 고릅니다' : null;
    if (st === 'ai') {
      if (흐름.도나) return '추천을 만드는 중입니다. 끝나면 후보를 골라 주세요';
      return 고른후보 === null ? '후보를 하나 골라 주세요. 맞는 후보가 없으면 「이전」에서 「직접 고르기」로 바꿉니다' : null;
    }
    if (st === 'steps') return 단계들.length === 0 ? '단계를 하나 이상 넣습니다' : null;
    if (st === 'values') return 값.막힘 ? '빈 칸이 남은 값 연결이 있습니다. 적거나 삭제합니다' : null;
    if (st === 'trial') return 시험.단계 === 'running' ? '시험 실행이 끝나면 넘어갑니다' : null;
    return null;
  }

  // 막지 않고 바닥에 남기는 안내 (결정 15 — 시험 실행은 저장 조건이 아니다)
  function 안내(): string | null {
    if (st === 'values' && 값.미확인 > 0) return t('확인하지 않은 값 연결이 {수}곳 있습니다', { 수: 값.미확인 });
    if (st !== 'trial') return null;
    if (시험.단계 === 'idle' || 시험.단계 === 'failed') return t('시험 없이 넘어가도 저장할 수 있습니다');
    return 시험.단계 === 'done' && 시험.결과?.status !== 'PASS' ? t('멈춘 채로도 저장할 수 있습니다') : null;
  }

  async function 저장누름(실행: boolean) {
    const 까닭 = await 끝.저장(실행);
    if (까닭 === null) return;
    set이유(까닭);
    set흔들((n) => n + 1);
  }

  const 곳으로 = (곳: 마법사단계) => {
    const i = 목록.indexOf(곳);
    if (i >= 0) 간다(i, 'back');
  };

  function 다음() {
    const 까닭 = 막는이유();
    if (까닭 !== null) {
      set이유(까닭);
      set흔들((n) => n + 1);
      return;
    }
    // 처음 들어올 때만 맡긴다 — 받은 결과가 있으면 「이전」으로 돌아와도 다시 맡기지 않는다
    if (목록[지금 + 1] === 'ai' && !흐름.맡겼나) 흐름.맡기기({ service: 서비스, platform: 디바이스, ...바람값 });
    간다(지금 + 1, 'fwd');
  }

  function 후보고름(i: number) {
    const 후보 = 흐름.결과?.candidates?.[i];
    if (후보 === undefined) return;
    set고른후보(i);
    set이유(null);
    const 새단계 = 후보단계들(후보);
    set단계들(새단계);
    값.후보메모(후보, 새단계);
    // 이름을 아직 손대지 않았으면 후보 이름으로 채운다 — 앞 후보 이름이 들어 있던 것도 손댄 것이 아니다
    const 후보이름들 = (흐름.결과?.candidates ?? []).map((c) => c.name);
    if (이름 === '' || 후보이름들.includes(이름)) set이름(후보.name);
    set케이스줄((앞) => {
      const 다음 = new Map(앞);
      for (const s of 후보.steps) if (!다음.has(s.tcId)) 다음.set(s.tcId, { name: s.name, screens: [] });
      return 다음;
    });
  }

  function 조립화면으로() {
    초안넘기기({ 서비스, 이름, 디바이스, 단계들: 보낼 });
    // 자기 이동에 떠나기 상자를 띄우지 않는다 — 초안은 조립 화면이 들고 간다
    떠나기막기(null);
    window.location.hash = '#/scenarios/new/build';
  }

  const 막나 = 저장됨 === null && (단계들.length > 0 || 이름.trim() !== '');
  const [제목, 설명] = 단계제목[st];

  return (
    <div ref={틀} className="wz" role="dialog" aria-modal="true" aria-label={t('새 시나리오')}>
      <단계띠 목록={목록} 지금={지금} 재료={흐름.결과?.material ?? null} on돌아감={(i) => 간다(i, 'back')} />

      <div className="wz-main">
        <div className="wz-top">
          <span>
            {t('E2E 시나리오')} › {t('새 시나리오')}
          </span>
          <button type="button" className="btn ghost" onClick={조립화면으로}>
            {t('조립 화면으로')}
          </button>
          <a className="btn ghost scw-exit" href={나가는곳}>
            {t('나가기')}
          </a>
        </div>
        {/* 단계마다 열쇠가 달라 새로 그려진다 — 그때 넘긴 쪽에서 미끄러져 들어온다 */}
        <div key={st} ref={본문} className={방향 === null ? 'wz-step' : `wz-step ${방향}`}>
          <p className="scw-count">
            {지금 + 1} / {목록.length} · {t(단계이름[st])}
          </p>
          <h2 className="wz-h">{t(제목)}</h2>
          <p className="wz-sub">{t(설명)}</p>
          <div className="scw-form">
            {st === 'start' ? (
              <시작칸
                방법={방법}
                서비스={서비스}
                디바이스={디바이스}
                앱들={앱들}
                on방법={(값) => {
                  if (값 !== 방법) 추천버림();
                  set방법(값);
                  set이유(null);
                }}
                on서비스={(값) => {
                  // 애플리케이션이 시나리오 서비스다 — 바꾸면 앞 애플리케이션 기준 단계 · 추천은 쓸 수 없다
                  추천버림();
                  set단계들([]);
                  set서비스(값);
                }}
                on디바이스={(값) => {
                  추천버림();
                  set디바이스(값);
                }}
              />
            ) : st === 'ai' ? (
              <AI칸
                흐름={흐름}
                바람={바람}
                on바람={set바람}
                고른후보={고른후보}
                on후보={후보고름}
                on다시={() => {
                  set고른후보(null);
                  흐름.맡기기({ service: 서비스, platform: 디바이스, ...바람값 });
                }}
                on직접={() => {
                  추천버림();
                  set방법('manual');
                  // 「직접 고르기」에는 AI 추천 단계가 없어 지금 자리가 곧 「단계」다
                  간다(1, 'fwd');
                }}
              />
            ) : st === 'steps' ? (
              <단계칸 시작={서비스} 앱들={앱들} 디바이스={디바이스} 단계들={단계들} on단계들={set단계들} 케이스줄={케이스줄} on읽음={읽음} />
            ) : st === 'values' ? (
              <값연결칸 서비스={서비스} 단계들={단계들} set단계들={set단계들} 재료={재료} 케이스줄={케이스줄} {...값.칸} />
            ) : st === 'trial' ? (
              <시험칸
                시험={시험}
                서버들={끝.서버들}
                서버={끝.서버}
                on서버={끝.서버고름}
                미리={끝.미리}
                막는글={끝.시험글}
                단계들={보낼}
                디바이스={디바이스}
                재료={재료}
                이름={이름의}
                on시작={끝.시험시작}
                on간다={곳으로}
              />
            ) : (
              <저장칸
                이름={이름}
                on이름={set이름}
                후보이름={방법 === 'ai' && 고른후보 !== null ? (흐름.결과?.candidates?.[고른후보]?.name ?? null) : null}
                앱={앱들.find((a) => a.prefix === 서비스)?.name ?? 서비스}
                디바이스={디바이스}
                단계이름들={보낼.map((p, i) => (p.kind === 'case' ? 이름의(i + 1) : t(종류글[p.kind])))}
                연결수={값.연결수}
                이어받기={값.칸.이어받기}
                시험={시험}
                on수정={곳으로}
                서버칸={끝.서버열기 ? { 서버들: 끝.서버들, 서버: 끝.서버, on서버: 끝.서버고름 } : null}
                저장됨={저장됨}
              />
            )}
          </div>
          <div className="wz-foot">
            <span key={흔들} className={이유 === null ? 'hint wz-why' : 'err wz-why wz-shake'} role={이유 === null ? undefined : 'alert'}>
              {이유 === null ? (안내() ?? '') : t(이유)}
            </span>
            {지금 > 0 && 저장됨 === null ? (
              <button type="button" className="btn ghost" onClick={() => 간다(지금 - 1, 'back')}>
                {t('이전')}
              </button>
            ) : null}
            {st !== 'save' ? (
              <button type="button" className="btn" onClick={다음}>
                {t('다음')}
              </button>
            ) : 저장됨 !== null ? null : (
              <>
                <button type="button" className="btn ghost" disabled={끝.저장중} onClick={() => void 저장누름(true)}>
                  {t('저장하고 실행')}
                </button>
                <button type="button" className="btn" disabled={끝.저장중} onClick={() => void 저장누름(false)}>
                  {t('저장')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <떠나기상자 막나={막나} />
    </div>
  );
}
