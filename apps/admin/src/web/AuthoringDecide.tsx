// 테스트 작성 「결정 필요」 — 사람이 고를 일을 묶음 셋으로 묻고 맨 아래 버튼 하나로 차례대로 진행한다 (도메인/작성 §3.6 「★ 결정 목록」 · 2026-10-26 시안 3판)
// 고르는 동안 목록을 저절로 다시 읽지 않는다 — 고르던 항목이 바뀌면 사람이 본 것과 다른 것을 보내게 된다(서버도 DECISIONS_STALE 로 막는다)

import { useEffect, useState } from 'react';

import { api, ApiError, type AuthoringRow, type EnvRow } from './api.js';
import { 초안카드 } from './AuthoringDecideDraft.js';
import { 문구고르기, 반영대기, 상세할일, 실패판정, 의도확인 } from './AuthoringDecideItems.js';
import { 새로만들기 } from './AuthoringDecideNew.js';
import { decideApi, type 결정목록, type 결정항목, type 진행단계 } from './decideApi.js';
import { 고름바꾼표, 보낼것, 줄요청, 차례, 켜졌나, type 고른값, type 차례줄, type 초안셈 } from './decideView.js';
import { use말, use언어 } from './i18n.js';
import { message, 기다림글자 } from './ui.js';

type 항목of<K extends 결정항목['kind']> = Extract<결정항목, { kind: K }>;
type 말 = ReturnType<typeof use말>;

/** 초안에서 담는 줄 셈 — 「초안 추가 1 · 수정 1 · 삭제 1 · 확인 필요 1」. 0 인 칸은 뺀다 */
function 초안글(셈: 초안셈, t: 말): string {
  const 칸 = [
    ...(셈.추가 > 0 ? [t('추가 {수}', { 수: 셈.추가 })] : []),
    ...(셈.수정 > 0 ? [t('수정 {수}', { 수: 셈.수정 })] : []),
    ...(셈.삭제 > 0 ? [t('삭제 {수}', { 수: 셈.삭제 })] : []),
    ...(셈.확인 > 0 ? [t('확인 필요 {수}', { 수: 셈.확인 })] : []),
  ];
  return t('초안 {내용}', { 내용: 칸.join(' · ') });
}

const 묶음제목 = ['AI 가 만든 테스트를 올릴까요?', '무엇이 맞는지 골라 주세요', '테스트를 새로 만들까요?'] as const;

function 차례글(줄: 차례줄, t: 말): string {
  switch (줄.종류) {
    case 'bug':
      return t('{번호} 실패를 버그로 기록합니다', { 번호: 줄.tcId });
    case 'prd': {
      const 이름 = { EDIT: t('문장 변경'), PICK: t('문구 선택'), CONFIRM: t('확정') };
      const 바뀜 = [...줄.바뀜.map((b) => `${b.reqId} ${이름[b.kind]}`), ...(줄.초안 === null ? [] : [초안글(줄.초안, t)])];
      return t('기획서를 새 버전으로 저장합니다(버전 {버전}) — {바뀜}', { 버전: 줄.version, 바뀜: 바뀜.join(' · ') });
    }
    case 'draftDrop':
      return t('{키들} 초안을 삭제합니다', { 키들: 줄.이슈.join(', ') });
    case 'draftRetry':
      return t('{키들} 기획서 초안을 다시 만듭니다', { 키들: 줄.이슈.join(', ') });
    case 'apply':
      return t('#{번호} 테스트를 케이스 목록에 올립니다', { 번호: 줄.rootId });
    case 'fix': {
      const 조각 = [
        ...(줄.화면 > 0 ? [t('화면이 맞음 {수}건', { 수: 줄.화면 })] : []),
        ...(줄.문장 > 0 ? [t('문장이 바뀐 요구 {수}건', { 수: 줄.문장 })] : []),
        ...(줄.초안 > 0 ? [t('기획서 초안 {수}줄', { 수: 줄.초안 })] : []),
        ...(줄.바뀐요구 ? [줄.바뀐요구수 === null ? t('바뀐 요구') : t('바뀐 요구 {수}건', { 수: 줄.바뀐요구수 })] : []),
      ];
      const 글 = t('{대상}의 테스트를 고치고 다시 만듭니다', { 대상: 조각.join(' · ') });
      return 줄.같이 ? `${글} (${t('바뀐 요구도 같이 다시 만듭니다')})` : 글;
    }
    case 'api':
      return 줄.수 === null ? t('바뀐 API 의 테스트를 다시 만듭니다') : t('바뀐 API {수}건의 테스트를 다시 만듭니다', { 수: 줄.수 });
    case 'screens':
      return 줄.수 === null ? t('테스트가 확인하지 않은 화면의 테스트를 만듭니다') : t('테스트가 확인하지 않은 화면 {수}개의 테스트를 만듭니다', { 수: 줄.수 });
  }
}

const 끝난상태 = new Set<AuthoringRow['status']>(['DONE', 'FAILED', 'STOPPED']);

/** 진행 뒤 — 단계마다 상태. 요청을 세운 단계만 5초마다 읽는다(목록과 같은 간격) */
function 진행중({ service, 줄들, steps, on돌아가기 }: { service: string; 줄들: 차례줄[]; steps: 진행단계[]; on돌아가기: () => void }) {
  const t = use말();
  const [상태, set상태] = useState<Map<number, AuthoringRow['status']>>(new Map());
  const 번호들 = [...new Set(줄들.map((줄) => 줄요청(줄, steps)).filter((x): x is number => x !== null))];
  const 남음 = 번호들.some((n) => !끝난상태.has(상태.get(n) ?? 'PENDING'));
  useEffect(() => {
    if (!남음) return;
    const 읽기 = () => {
      // 하나를 못 읽어도 나머지는 보인다 — 못 읽은 줄은 앞 상태로 남는다
      void Promise.allSettled(번호들.map((n) => api.authoringRequest(service, n))).then((답들) =>
        set상태((전) => new Map([...전, ...답들.flatMap((답, i) => (답.status === 'fulfilled' ? [[번호들[i]!, 답.value.status] as const] : []))])),
      );
    };
    읽기();
    const timer = setInterval(읽기, 5000);
    return () => clearInterval(timer);
  }, [service, 번호들.join(), 남음]);

  const 상태글 = (n: number | null) => {
    if (n === null) return t('끝남');
    const s = 상태.get(n);
    if (s === undefined || s === 'PENDING' || s === 'DRAFT') return t('앞 일이 끝나면 시작');
    if (s === 'RUNNING') return t('진행 중');
    return { DONE: t('끝남'), FAILED: t('실패'), STOPPED: t('중단') }[s];
  };
  return (
    <section className="decide" role="status" aria-labelledby="decide-run-title">
      <header>
        <h2 id="decide-run-title">{t('진행을 시작했습니다')}</h2>
        <small className="hint">{t('위에서부터 차례로 진행합니다. 바뀐 내용은 PRD 관리 › 버전 기록에서 볼 수 있습니다')}</small>
      </header>
      <ol className="decide-plan">
        {줄들.map((줄, i) => {
          const 번호 = 줄요청(줄, steps);
          return (
            <li key={`${줄.종류}-${String(i)}`}>
              {차례글(줄, t)} <span className="hint">· {상태글(번호)}</span>
              {번호 === null || 줄.종류 === 'draftRetry' ? null : (
                <>
                  {' '}
                  <a href={`#/authoring/${String(줄.종류 === 'apply' ? 줄.rootId : 번호)}`}>{t('#{번호} 요청 보기', { 번호: 줄.종류 === 'apply' ? 줄.rootId : 번호 })}</a>
                </>
              )}
            </li>
          );
        })}
      </ol>
      <footer>
        <button className="btn ghost small" type="button" onClick={on돌아가기}>
          {t('결정 목록으로 돌아가기')}
        </button>
      </footer>
    </section>
  );
}

export function AuthoringDecide({ service, 목록, envs, 다시읽기 }: { service: string; 목록: 결정목록; envs: EnvRow[]; 다시읽기: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [고른, set고른] = useState<Map<string, 고른값>>(new Map());
  const [바쁨, set바쁨] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const [다시불러옴, set다시불러옴] = useState(false);
  const [진행, set진행] = useState<{ 줄들: 차례줄[]; steps: 진행단계[] } | null>(null);
  const items = 목록.items;
  const on고름 = (key: string, 값: 고른값 | null) => set고른((전) => 고름바꾼표(items, 전, key, 값));

  if (진행 !== null) return <진행중 service={service} 줄들={진행.줄들} steps={진행.steps} on돌아가기={() => set진행(null)} />;
  if (items.length === 0) return <div className="empty">{t('결정이 필요한 일이 없습니다')}</div>;

  const 보냄 = 보낼것(items, 고른);
  const 줄들 = 차례(items, 고른, 목록.prdVersion);
  // 문장을 바꾸는 고름이 있으면 바뀐 요구는 같이 돈다 — 그 항목의 「나중에」를 끈다(§3.6 진행 4)
  const 고침줄 = 줄들.find((x) => x.종류 === 'fix');
  const 같이 = 고침줄?.종류 === 'fix' && 고침줄.화면 + 고침줄.문장 > 0;

  async function 진행하기() {
    set바쁨(true);
    set오류(null);
    set다시불러옴(false);
    try {
      const { steps } = await decideApi.run(service, 목록.prdVersion, 보냄);
      set진행({ 줄들, steps });
      set고른(new Map());
    } catch (err) {
      // 그 사이 버전이나 목록이 바뀌었다 — 사람이 새 목록을 다시 보고 고른다
      if (err instanceof ApiError && err.code === 'DECISIONS_STALE') {
        set고른(new Map());
        set다시불러옴(true);
      } else set오류(message(err, 언어));
    }
    set바쁨(false);
    다시읽기();
  }

  const 묶음 = (g: 1 | 2 | 3) => items.filter((x) => x.group === g);
  const 확인 = (basis: 'SCREEN' | 'OTHER') => items.filter((x): x is 항목of<'CHECK'> => x.kind === 'CHECK' && x.basis === basis);
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
      case 'CHECK':
        return x.basis === 'DOCS' ? <문구고르기 key={x.key} x={x} 고른={값} on고름={on고름} /> : null;
      default:
        return (
          <새로만들기 key={x.key} service={service} x={x} 고른={값} on고름={on고름} open={목록.open} envs={envs} 켜짐={켜졌나(x, items, 고른)} 같이={x.kind === 'PRD_CHANGED' && 같이} />
        );
    }
  };

  return (
    <section className="decide" aria-labelledby="decide-title">
      <header>
        <h2 id="decide-title">{t('결정이 필요한 일 {수}건', { 수: 목록.count })}</h2>
        <small className="hint">{t('항목마다 고른 뒤 맨 아래 버튼으로 한 번에 진행합니다')}</small>
        {다시불러옴 ? <p className="prd-note bad">{t('그 사이 바뀐 것이 있어 다시 불러왔습니다')}</p> : null}
      </header>
      {([1, 2, 3] as const).map((g) =>
        묶음(g).length === 0 ? null : (
          <div key={g}>
            <div className="decide-group">
              <span className="decide-num">{g}</span>
              {t(묶음제목[g - 1])}
              {g === 2 ? <span className="decide-prd">{t('고른 내용은 기획서(PRD) 새 버전으로 저장됩니다')}</span> : null}
            </div>
            {g !== 2 ? (
              묶음(g).map(항목그림)
            ) : (
              // 명세 표 차례 — 실패 → 화면 기준 → 기획서 간 불일치 → 그 밖의 확인 필요
              <>
                {묶음(g).filter((x) => x.kind === 'PRD_DRAFT').map(항목그림)}
                {묶음(g).filter((x) => x.kind === 'FAIL').map(항목그림)}
                {목록.failMore === 0 ? null : (
                  <p className="decide-item hint">{t('실패 {수}건이 더 있습니다. 위의 것을 정하면 이어서 보입니다', { 수: 목록.failMore })}</p>
                )}
                {확인('SCREEN').length === 0 ? null : <의도확인 줄들={확인('SCREEN')} 화면기준 고른표={고른} on고름={on고름} />}
                {묶음(g).filter((x) => x.kind === 'CHECK' && x.basis === 'DOCS').map(항목그림)}
                {확인('OTHER').length === 0 ? null : <의도확인 줄들={확인('OTHER')} 화면기준={false} 고른표={고른} on고름={on고름} />}
              </>
            )}
          </div>
        ),
      )}
      <footer>
        <b>{t('진행하면 이렇게 됩니다')}</b>
        {줄들.length === 0 ? (
          <small className="hint">{t('아직 고른 것이 없습니다')}</small>
        ) : (
          <ol className="decide-plan">
            {줄들.map((줄, i) => (
              <li key={`${줄.종류}-${String(i)}`}>
                {차례글(줄, t)} <span className="decide-prd">{{ BUG: t('버그'), PRD: t('기획서'), TEST: t('테스트') }[줄.곳]}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="decide-run">
          <small className="hint">{t('고른 것 {수}건 / {전체}건 · 고르지 않은 일은 이 목록에 남습니다', { 수: 보냄.length, 전체: 목록.count })}</small>
          <button className="btn" type="button" disabled={바쁨 || 보냄.length === 0} onClick={() => void 진행하기()}>
            <기다림글자 중={바쁨} 평소={t('결정한 {수}건 진행', { 수: 보냄.length })} 기다림={t('진행하는 중…')} />
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
