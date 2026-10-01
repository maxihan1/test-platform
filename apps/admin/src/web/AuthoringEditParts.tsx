// 케이스 고치기(EDIT) 요청 상세의 두 조각 — 고칠 내용 목록 · 다음 단계 (DESIGN.md 「작성 상태」 · 도메인/작성 §3.6 「★ 케이스 고치기」)
// 자료 · 대조 · 커버리지 · 보류 · 작성 단계 막대가 없다. 이어서 작성 · 같은 자료로 다시 작성 대신 「다시 적용」이 있다.
// AuthoringTodo 가 300줄에 닿아 고치기 갈래를 여기로 뗐다

import { api, type AuthoringRow } from './api.js';
import { 반영단계 } from './AuthoringMergeStep.js';
import { 일 } from './authoringTodoParts.js';
import type { 고칠줄 } from './authoringView.js';
import type { 기대값 } from '../authoring/edit.js';
import { use말 } from './i18n.js';
import type { 판정 } from './role.js';

/** 케이스마다 한 줄 — 삭제 · 기대값 · 확정. 옛 값은 요청에 없어 PR 본문에서 본다 */
export function 고칠내용({ 목록 }: { 목록: 고칠줄[] }) {
  const t = use말();
  // 참거짓은 화면 다른 자리처럼 예 · 아니오로 (DESIGN.md) — 코드 낱말 false 를 그대로 보이지 않는다
  const 값글 = (값: 기대값): string => (typeof 값 === 'boolean' ? t(값 ? '예' : '아니오') : String(값));
  return (
    <section className="authoring-panel" aria-label={t('고칠 내용')}>
      <h3>
        {t('고칠 내용')} · {t('{수}건', { 수: 목록.length })}
      </h3>
      <ul className="edit-list">
        {목록.map((줄) => (
          <li key={줄.tcId}>
            <span className="mono">{줄.tcId}</span>{' '}
            {줄.삭제
              ? t('삭제')
              : [...줄.기대값.map(([칸, 값]) => t('기대값 {칸}: {값}', { 칸, 값: 값글(값) })), ...(줄.확정 ? [t('확정')] : [])].join(' · ')}
          </li>
        ))}
      </ul>
      <p className="hint">{t('바뀌기 전 값은 PR 본문에 있습니다.')}</p>
    </section>
  );
}

interface Props {
  service: string;
  /** 최신 실행 — 고치기 · 다시 적용 · 반영 중 하나다 */
  요청: AuthoringRow;
  할수: 판정;
  보내는중: boolean;
  새줄로: (만든다: () => Promise<{ id: number }>) => void;
  /** 서버가 잰 canStop · canDiscard 로 AuthoringTodo 가 만든 버튼. 못 누르면 null */
  중단버튼: React.ReactNode;
  폐기버튼: React.ReactNode;
  /** 마지막 반영이 실패했다(다른 PR 과 충돌) — 완료 항목에 다시 적용을 더한다 */
  반영실패: boolean;
}

/** 「다음 단계」 본문 — 폐기된 것은 AuthoringTodo 가 먼저 가른다 */
export function 고치기할일({ service, 요청, 할수, 보내는중, 새줄로, 중단버튼, 폐기버튼, 반영실패 }: Props) {
  const t = use말();
  const 권한 = 할수('작성요청');
  // 다시 적용은 늘 뿌리(EDIT)로 간다 — 재실행의 원본도 뿌리다
  const 원본 = 요청.kind === 'EDIT' ? 요청.id : 요청.sourceId;
  const 다시적용 = (표: string, 설명: string) => (
    <일 표={표} 제목={t('다시 적용')} 설명={권한 ? 설명 : t('다시 적용은 작성 쓰기 권한이 있는 사람만 할 수 있습니다.')}>
      {권한 && 원본 !== null ? (
        <button
          className="btn"
          type="button"
          disabled={보내는중}
          onClick={() => 새줄로(() => api.createAuthoringRequest(service, { kind: 'RERUN', sourceId: 원본 }))}
        >
          {보내는중 ? t('시작하는 중…') : t('다시 적용')}
        </button>
      ) : null}
    </일>
  );
  const 폐기 = (표: string) =>
    폐기버튼 === null ? null : (
      <일 표={표} 제목={t('폐기')} 설명={t('목록에서 사라집니다. GitHub 의 PR 은 남으니 GitHub 에서 닫으세요.')}>
        <div className="btns">{폐기버튼}</div>
      </일>
    );

  if (요청.status === 'PENDING' || 요청.status === 'RUNNING') {
    // 도는 동안엔 자식이 없어 멈출 자리가 없다 — 서버가 대기 중 · 신호가 몇 분 끊긴 것에만 canStop 을 준다 (작성 §3.6 「중단 · 폐기」).
    // 끊겼다고 단정하지 않는다 — 고치기 에이전트는 단계 글을 세 번만 올려 타입 검사가 길면 살아 있어도 신호가 빈다 (2026-10-01 화면 QA)
    const 끊김 = 요청.status === 'RUNNING' && 중단버튼 !== null;
    return (
      <>
        <p>
          {끊김
            ? t('에이전트 소식이 한동안 없습니다. 검사가 길어지는 중일 수도 있습니다. 멈춘 것 같으면 작성 중단을 누른 뒤 다시 적용하세요')
            : 요청.kind === 'MERGE'
              ? t('테스트를 반영하는 중입니다. CI 를 기다려 합치므로 몇 분 걸립니다. 이 페이지를 닫아도 됩니다.')
              : 요청.status === 'PENDING'
                ? t('에이전트 순서를 기다리는 중입니다. 이 페이지를 닫아도 됩니다.')
                : t('케이스를 고쳐 PR 로 올리는 중입니다. 이 페이지를 닫아도 됩니다.')}
        </p>
        {중단버튼 === null ? null : (
          <>
            <div className="btns">{중단버튼}</div>
            {요청.status === 'PENDING' ? <span className="hint">{t('아직 시작 전이라 누르면 바로 취소됩니다.')}</span> : null}
          </>
        )}
      </>
    );
  }

  if (요청.status === 'DONE' && 요청.kind === 'MERGE') {
    // 남은 요구로 이어 작성은 없다 — 고치기에는 기획서 요구 목록이 없다
    return <p>{t('테스트가 반영됐습니다. 케이스 목록에서 「다시 스캔」을 누르면 바뀐 것이 보입니다.')}</p>;
  }

  if (요청.status === 'DONE') {
    return (
      <ol>
        {/* 에이전트는 PR 주소 없이 완료로 닫지 않는다 — 없으면 검토 항목만 안 그린다 */}
        {요청.prUrl === null ? null : (
          <일 표="1" 제목={t('고친 테스트 코드 검토')} 설명={t('초안 PR로 올라갔습니다. 바뀐 줄을 읽어 보고 이상하면 폐기하세요.')}>
            <a className="btn ghost" href={요청.prUrl} target="_blank" rel="noreferrer">
              {t('고친 테스트 코드 보기 (PR)')}
            </a>
          </일>
        )}
        <반영단계 service={service} 요청={요청} 표="2" 반영권한={할수('작성머지')} 보내는중={보내는중} 새줄로={새줄로} 커버리지={null} />
        {반영실패
          ? 다시적용('3', t('반영이 실패했습니다. 다른 PR 과 충돌했으면 지금 main 위에서 같은 내용으로 다시 고친 뒤 반영하세요.'))
          : null}
        {폐기(반영실패 ? '4' : '3')}
      </ol>
    );
  }

  // FAILED · STOPPED — 새 main 위에서 같은 고칠 내용으로 다시 고친다. 넘겨받을 작업 폴더가 없어 이어하기는 없다
  return (
    <ol>
      {다시적용('A', t('지금 main 위에서 같은 내용으로 다시 고칩니다. 지금까지의 실행은 실행 기록에 남습니다.'))}
      {폐기('B')}
    </ol>
  );
}
