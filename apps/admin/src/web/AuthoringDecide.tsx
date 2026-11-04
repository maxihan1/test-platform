// 테스트 작성 「결정 필요」 — 사람이 고를 일을 탭 넷(승인 대기 · 결함 판정 · 요구사항 확인 · 테스트 업데이트)으로 나눠 묻고 탭마다 [N건 적용] 하나로 차례대로 진행한다 (도메인/작성 §3.6 「★ 결정 목록」 · 2026-11-04 사용자)
// 고르는 동안 목록을 저절로 다시 읽지 않는다 — 고르던 항목이 바뀌면 사람이 본 것과 다른 것을 보내게 된다(서버도 DECISIONS_STALE 로 막는다)

import { useState, type KeyboardEvent } from 'react';

import { ApiError, type EnvRow } from './api.js';
import { 의도확인, 문구고르기 } from './AuthoringDecideCheck.js';
import { 초안카드 } from './AuthoringDecideDraft.js';
import { 반영대기, 상세할일, 실패판정 } from './AuthoringDecideItems.js';
import { 새로만들기 } from './AuthoringDecideNew.js';
import { 화면고르기 } from './AuthoringDecideScreens.js';
import { 진행중, 차례글 } from './AuthoringDecideRun.js';
import { decideApi, type 결정목록, type 결정항목, type 진행단계 } from './decideApi.js';
import { 고름바꾼표, 보낼것, 차례, 탭of, type 고른값, type 차례줄, type 탭 } from './decideView.js';
import { use말, use언어 } from './i18n.js';
import { message, 기다림글자 } from './ui.js';

type 항목of<K extends 결정항목['kind']> = Extract<결정항목, { kind: K }>;
type 말 = ReturnType<typeof use말>;

const 탭차례: 탭[] = ['approve', 'fail', 'check', 'update'];
const 탭아이디 = (x: 탭) => `decide-tab-${x}`;

/** 탭 이름과 뜻 — 뜻은 마우스를 올리면 뜨고, 휴대폰에서는 탭 줄 아래 한 줄로 보인다(2026-11-04 사용자) */
function 탭말(x: 탭, t: 말): { 이름: string; 뜻: string } {
  return {
    approve: { 이름: t('승인 대기'), 뜻: t('AI 가 만든 테스트입니다. 승인하면 케이스 목록에 정식 테스트로 들어갑니다') },
    fail: { 이름: t('결함 판정'), 뜻: t('실패한 테스트입니다. 화면이 틀렸으면 이슈로 등록하고 기획서가 틀렸으면 PRD 를 수정합니다') },
    check: { 이름: t('요구사항 확인'), 뜻: t('AI 가 확신하지 못한 요구사항입니다. 확정하거나 수정하면 PRD 새 버전으로 저장됩니다') },
    update: { 이름: t('테스트 업데이트'), 뜻: t('바뀐 요구사항 · API 와 테스트가 없는 화면입니다. 테스트를 다시 만들거나 새로 더합니다') },
  }[x];
}

/** 탭을 주소에 담는 쪽(테스트 작성 화면)이 `탭` 과 `on탭` 을 함께 준다. 안 주면 이 화면이 스스로 든다 */
export function AuthoringDecide({ service, 목록, envs, 다시읽기, 탭: 주소탭, on탭 }: { service: string; 목록: 결정목록; envs: EnvRow[]; 다시읽기: () => void; 탭?: 탭 | null; on탭?: (x: 탭) => void }) {
  const t = use말();
  const 언어 = use언어();
  const [고른, set고른] = useState<Map<string, 고른값>>(new Map());
  const [편집, set편집] = useState<Map<string, string>>(new Map());
  const [내탭, set내탭] = useState<탭 | null>(null);
  const 고른탭 = on탭 === undefined ? 내탭 : (주소탭 ?? null);
  const set고른탭 = on탭 ?? set내탭;
  const [바쁨, set바쁨] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const [다시불러옴, set다시불러옴] = useState(false);
  const [진행, set진행] = useState<{ 줄들: 차례줄[]; steps: 진행단계[] } | null>(null);
  const items = 목록.items;
  const on고름 = (key: string, 값: 고른값 | null) => set고른((전) => 고름바꾼표(전, key, 값));
  const on편집 = (key: string, 글: string | null) =>
    set편집((전) => {
      const 새 = new Map(전);
      if (글 === null) 새.delete(key);
      else 새.set(key, 글);
      return 새;
    });

  if (진행 !== null) return <진행중 service={service} 줄들={진행.줄들} steps={진행.steps} on돌아가기={() => set진행(null)} />;
  if (items.length === 0) return <div className="empty">{t('결정이 필요한 일이 없습니다')}</div>;

  // 할 일이 없는 탭은 안 그린다. 고른 탭이 사라지면(적용해서 다 빠지면) 남은 첫 탭이다
  const 수 = (x: 탭) => items.filter((y) => 탭of(y) === x).length + (x === 'fail' ? 목록.failMore : 0);
  const 보이는 = 탭차례.filter((x) => 수(x) > 0);
  const 지금 = 고른탭 !== null && 보이는.includes(고른탭) ? 고른탭 : 보이는[0]!;
  const 탭항목 = items.filter((x) => 탭of(x) === 지금);
  const 열쇠들 = new Set(탭항목.map((x) => x.key));
  // 적용은 이 탭에서 고른 것만 — 차례 계산은 바뀐 요구가 같이 도는지 보려고 목록 전체를 본다
  const 탭고른 = new Map([...고른].filter(([key]) => 열쇠들.has(key)));
  const 보냄 = 보낼것(items, 탭고른);
  const 줄들 = 차례(items, 탭고른, 목록.prdVersion);
  const 안저장 = [...편집.keys()].filter((key) => 열쇠들.has(key)).length;

  function 키누름(e: KeyboardEvent, 자리: number) {
    const 방향 = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (방향 === 0) return;
    e.preventDefault();
    const 다음 = 보이는[(자리 + 방향 + 보이는.length) % 보이는.length]!;
    set고른탭(다음);
    document.getElementById(탭아이디(다음))?.focus();
  }

  async function 적용하기() {
    set바쁨(true);
    set오류(null);
    set다시불러옴(false);
    try {
      const { steps } = await decideApi.run(service, 목록.prdVersion, 보냄);
      set진행({ 줄들, steps });
      // 다른 탭에서 골라 둔 것은 남긴다 — 그 탭은 아직 적용하지 않았다
      set고른((전) => new Map([...전].filter(([key]) => !열쇠들.has(key))));
      set편집((전) => new Map([...전].filter(([key]) => !열쇠들.has(key))));
    } catch (err) {
      // 그 사이 버전이나 목록이 바뀌었다 — 사람이 새 목록을 다시 보고 고른다
      if (err instanceof ApiError && err.code === 'DECISIONS_STALE') {
        set고른(new Map());
        set편집(new Map());
        set다시불러옴(true);
      } else set오류(message(err, 언어));
    }
    set바쁨(false);
    다시읽기();
  }

  const 확인 = (basis: 'SCREEN' | 'OTHER') => 탭항목.filter((x): x is 항목of<'CHECK'> => x.kind === 'CHECK' && x.basis === basis);
  const 화면기준 = 확인('SCREEN');
  const 그밖 = 확인('OTHER');
  const 항목그림 = (x: 결정항목) => {
    const 값 = 고른.get(x.key);
    switch (x.kind) {
      case 'APPLY':
        return <반영대기 key={x.key} x={x} 고른={값} on고름={on고름} />;
      case 'FIX':
        return <상세할일 key={x.key} x={x} />;
      case 'FAIL':
        return <실패판정 key={x.key} x={x} 고른={값} on고름={on고름} />;
      case 'PRD_DRAFT':
        return <초안카드 key={x.key} x={x} 고른={값} on고름={on고름} />;
      case 'SCREENS':
        return <화면고르기 key={x.key} service={service} x={x} 고른={값} on고름={on고름} open={목록.open} envs={envs} on바뀜={다시읽기} />;
      case 'CHECK':
        return x.basis === 'DOCS' ? <문구고르기 key={x.key} x={x} 고른표={고른} on고름={on고름} 편집={편집} on편집={on편집} /> : null;
      default:
        return <새로만들기 key={x.key} service={service} x={x} 고른={값} on고름={on고름} open={목록.open} envs={envs} />;
    }
  };
  const 말 = 탭말(지금, t);

  return (
    <section className="decide" aria-labelledby="decide-title">
      <header>
        <h2 id="decide-title">{t('결정이 필요한 일 {수}건', { 수: 목록.count })}</h2>
        <small className="hint">{t('탭마다 고른 뒤 맨 아래 「적용」을 누릅니다')}</small>
        {다시불러옴 ? <p className="prd-note bad">{t('그 사이 바뀐 것이 있어 다시 불러왔습니다')}</p> : null}
      </header>
      <div role="tablist" className="scn-tabs decide-tabs">
        {보이는.map((x, i) => {
          const 글 = 탭말(x, t);
          return (
            <button
              key={x}
              type="button"
              role="tab"
              id={탭아이디(x)}
              className="scn-tab"
              title={글.뜻}
              aria-selected={x === 지금}
              aria-controls="decide-tabpanel"
              tabIndex={x === 지금 ? 0 : -1}
              onClick={() => set고른탭(x)}
              onKeyDown={(e) => 키누름(e, i)}
            >
              {글.이름} <span className="decide-tab-n">{수(x)}</span>
            </button>
          );
        })}
      </div>
      <p className="hint decide-tab-hint">{말.뜻}</p>
      <div role="tabpanel" id="decide-tabpanel" aria-labelledby={탭아이디(지금)}>
        {지금 !== 'check' ? (
          <>
            {탭항목.map(항목그림)}
            {지금 === 'fail' && 목록.failMore > 0 ? (
              <p className="decide-item hint">{t('실패 {수}건이 더 있습니다. 위의 것을 정하면 이어서 보입니다', { 수: 목록.failMore })}</p>
            ) : null}
          </>
        ) : (
          // 명세 표 차례 — PRD 초안 → 화면 기준 → 기획서 간 불일치 → 그 밖의 확인 필요
          <>
            {탭항목.filter((x) => x.kind === 'PRD_DRAFT').map(항목그림)}
            {화면기준.length === 0 ? null : <의도확인 줄들={화면기준} 화면기준 고른표={고른} on고름={on고름} 편집={편집} on편집={on편집} />}
            {탭항목.filter((x) => x.kind === 'CHECK' && x.basis === 'DOCS').map(항목그림)}
            {그밖.length === 0 ? null : <의도확인 줄들={그밖} 화면기준={false} 고른표={고른} on고름={on고름} 편집={편집} on편집={on편집} />}
          </>
        )}
      </div>
      <footer>
        <b>{t('적용하면 이렇게 됩니다')}</b>
        {줄들.length === 0 ? (
          <small className="hint">{t('아직 고른 것이 없습니다')}</small>
        ) : (
          <ol className="decide-plan">
            {줄들.map((줄, i) => (
              <li key={`${줄.종류}-${String(i)}`}>
                {차례글(줄, t)} <span className="decide-prd">{{ BUG: t('이슈'), PRD: t('PRD'), TEST: t('테스트') }[줄.곳]}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="decide-run">
          <small className="hint">{안저장 === 0 ? t('고르지 않은 일은 이 목록에 남습니다') : t('저장하지 않은 수정 {수}건은 빠집니다', { 수: 안저장 })}</small>
          <button className="btn" type="button" disabled={바쁨 || 보냄.length === 0} onClick={() => void 적용하기()}>
            <기다림글자 중={바쁨} 평소={t('{수}건 적용', { 수: 보냄.length })} 기다림={t('적용하는 중…')} />
          </button>
        </div>
        {오류 === null ? null : (
          <p className="error-text" role="alert">
            {오류}
          </p>
        )}
      </footer>
    </section>
  );
}
