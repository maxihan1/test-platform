// 결정 목록 「진행하면 이렇게 됩니다」 차례 글과 적용한 뒤의 단계 상태 화면 (도메인/작성 §3.6 「★ 결정 목록」 진행)

import { useEffect, useState } from 'react';

import { api, type AuthoringRow } from './api.js';
import type { 진행단계 } from './decideApi.js';
import { 줄요청, type 차례줄, type 초안셈 } from './decideView.js';
import { use말 } from './i18n.js';

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

export function 차례글(줄: 차례줄, t: 말): string {
  switch (줄.종류) {
    case 'bug':
      return t('{번호} 실패를 이슈로 등록합니다', { 번호: 줄.tcId });
    case 'prd': {
      const 이름 = { EDIT: t('문장 변경'), PICK: t('문구 선택'), CONFIRM: t('확정') };
      const 바뀜 = [...줄.바뀜.map((b) => `${b.reqId} ${이름[b.kind]}`), ...(줄.초안 === null ? [] : [초안글(줄.초안, t)])];
      return t('PRD 를 새 버전으로 저장합니다(버전 {버전}) — {바뀜}', { 버전: 줄.version, 바뀜: 바뀜.join(' · ') });
    }
    case 'draftDrop':
      return t('{키들} 초안을 삭제합니다', { 키들: 줄.이슈.join(', ') });
    case 'draftRetry':
      return t('{키들} PRD 초안을 다시 만듭니다', { 키들: 줄.이슈.join(', ') });
    case 'apply':
      return t('#{번호} 테스트를 승인해 케이스 목록에 올립니다', { 번호: 줄.rootId });
    case 'reject':
      return t('#{번호} 작성 결과를 폐기합니다', { 번호: 줄.rootId });
    case 'fix': {
      const 조각 = [
        ...(줄.화면 > 0 ? [t('PRD 수정 {수}건', { 수: 줄.화면 })] : []),
        ...(줄.문장 > 0 ? [t('문장이 바뀐 요구 {수}건', { 수: 줄.문장 })] : []),
        ...(줄.초안 > 0 ? [t('PRD 초안 {수}줄', { 수: 줄.초안 })] : []),
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

/** 적용한 뒤 — 단계마다 상태. 요청을 세운 단계만 5초마다 읽는다(목록과 같은 간격) */
export function 진행중({ service, 줄들, steps, on돌아가기 }: { service: string; 줄들: 차례줄[]; steps: 진행단계[]; on돌아가기: () => void }) {
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
        <h2 id="decide-run-title">{t('적용을 시작했습니다')}</h2>
        <small className="hint">{t('위에서부터 차례로 적용합니다. 바뀐 내용은 PRD 관리 › 버전 기록에서 볼 수 있습니다')}</small>
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
