// 작성 요청 한 건 상세 페이지. 한 줄로 Status 카드 → 다음 단계 → 만든 케이스 → 차이 → 요청 정보 → 실행 기록이다
// (도메인/작성 §3.6 · §7 · 도메인/인증 §7 「등급으로 갈리는 자리」 · DESIGN.md 「작성 상태」)

import { useCallback, useEffect } from 'react';

import { api, type AuthoringRow } from './api.js';
import { 산출물설명, 자료고리 } from './AuthoringAssetParts.js';
import { 고칠내용 } from './AuthoringEditParts.js';
import { AuthoringCases } from './AuthoringCases.js';
import { AuthoringMergeFailed } from './AuthoringMergeFailed.js';
import { AuthoringRuns } from './AuthoringRuns.js';
import { AuthoringStatusCard } from './AuthoringStatusCard.js';
import { AuthoringTodo } from './AuthoringTodo.js';
import { 고칠것목록, 끝났나, 요청제목, 자료요약, 종류라벨, 차이목록, 차이종류라벨 } from './authoringView.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import type { 판정 } from './role.js';
import { 케이스주소 } from './route.js';
import { Failed, Loading, useAsync, when } from './ui.js';

export function AuthoringDetail({
  service,
  id,
  할수,
  서비스번호,
  배정번호들 = [],
  on서비스번호,
}: {
  service: string;
  id: number;
  할수: 판정;
  /** 띠에서 고른 서비스의 번호 — 요청의 서비스와 다르면 띠를 그 서비스로 옮긴다 (점검 12.14) */
  서비스번호?: number;
  /** 띠를 옮길 수 있는(배정된) 서비스 번호들. 배정 밖 서비스의 요청은 옮기지 못해 그대로 그린다 */
  배정번호들?: number[];
  on서비스번호?: (serviceId: number) => void;
}) {
  const t = use말();
  const 언어 = use언어();

  // 보이는 번호는 뿌리 하나다 (도메인/작성 §7 「실행 기록」). 뿌리 상세는 실행 기록을, 상태 카드 · 다음 단계는
  // 최신 실행 상세를 그린다 — 버튼이 옛 실행에 걸리면 멈춤 · 이어서 작성이 엉뚱한 행으로 간다 (2026-09-29 계획 검토)
  // 실패한 머지는 건너뛴다 — 끝난 작성 실행을 다시 보여 반영 버튼이 돌아온다(서버 `최신실행` 과 같은 규칙).
  // 차이 · 산출물은 머지가 아니라 그것을 만든 작성 실행에 붙어 있다 (2026-09-29 검사)
  const 것 = useAsync<AuthoringRow>(() => api.authoringRequest(service, id), [service, id]);
  const 뿌리 = 것.data;
  const 버튼번호 = 뿌리?.runs?.find((r) => !(r.kind === 'MERGE' && r.status === 'FAILED'))?.id ?? id;
  const 작성번호 = 뿌리?.runs?.find((r) => r.kind !== 'MERGE')?.id ?? id;
  const 최신것 = useAsync<AuthoringRow | null>(
    () => (버튼번호 !== id ? api.authoringRequest(service, 버튼번호) : Promise.resolve(null)),
    [service, 버튼번호, id],
  );
  const 작성것 = useAsync<AuthoringRow | null>(
    () => (작성번호 !== id && 작성번호 !== 버튼번호 ? api.authoringRequest(service, 작성번호) : Promise.resolve(null)),
    [service, 작성번호, 버튼번호, id],
  );
  const data = 버튼번호 !== id ? 최신것.data : 뿌리;
  const 작성 = 작성번호 === id ? 뿌리 : 작성번호 === 버튼번호 ? data : 작성것.data;
  const 뿌리읽기 = 것.reload;
  const 최신읽기 = 최신것.reload;
  const 작성읽기 = 작성것.reload;
  const reload = useCallback(() => {
    뿌리읽기();
    최신읽기();
    작성읽기();
  }, [뿌리읽기, 최신읽기, 작성읽기]);
  const 도는중 = data !== null && !끝났나(data.status);

  // 예전 실행 번호로 들어오면 뿌리 번호 쪽으로 — 한 요청이 번호 여럿으로 흩어져 보이지 않게.
  // **지금 번호의 답일 때만 넘긴다** — 다른 요청 상세로 넘어가는 동안(남은 요구 · 원본 고리) 앞 요청의 답이 남아 있으면
  // 그 뿌리로 되돌려 보내 새 번호에 영영 못 간다 (2026-09-30 화면 확인에서 잡았다)
  const 뿌리번호 = 뿌리?.id === id ? 뿌리.rootId : undefined;
  useEffect(() => {
    if (뿌리번호 !== undefined && 뿌리번호 !== id) window.location.hash = `#/authoring/${String(뿌리번호)}`;
  }, [뿌리번호, id]);

  // 다른 서비스의 요청을 고리로 열면(알림 · 대시보드) 띠를 그 서비스로 옮긴다 — 앞 판은 띠의 서비스 이름 · 권한으로 카드와 버튼을 그렸다 (점검 12.14)
  const 요청서비스 = 뿌리?.id === id ? 뿌리.serviceId : undefined;
  // 배정 밖이면 띠가 안 옮겨 가 「불러오는 중」에서 멈춘다 — 그때는 옮기지 않고 그린다(코드 검토)
  const 다른서비스 =
    요청서비스 !== undefined && 서비스번호 !== undefined && 요청서비스 !== 서비스번호 && 배정번호들.includes(요청서비스);
  useEffect(() => {
    if (다른서비스 && on서비스번호 !== undefined) on서비스번호(요청서비스);
  }, [다른서비스, 요청서비스, on서비스번호]);

  // 에이전트가 뒤에서 이어 간다. 끝날 때까지만 다시 묻고 끝나면 멈춘다 (RunResult 와 같은 모양)
  useEffect(() => {
    if (!도는중) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [도는중, reload]);

  if (것.error !== null) return <Failed error={것.error} />;
  if (최신것.error !== null) return <Failed error={최신것.error} />;
  if (작성것.error !== null) return <Failed error={작성것.error} />;
  // 번호가 바뀐 직후에는 옛 실행 답이 남아 있다 — 그 버튼을 누르면 엉뚱한 행이 멈추거나 폐기된다 (2026-09-29 검사)
  if (뿌리 === null || data === null || 작성 === null || data.id !== 버튼번호 || 작성.id !== 작성번호) return <Loading />;
  // 띠가 옮겨 가는 동안 옛 서비스 이름 · 권한으로 그리지 않는다
  if (다른서비스) return <Loading />;

  // 입력과 산출물을 가른다. role 이 없으면 입력이다 — 이 칸을 모르는 옛 응답도 그대로 그린다.
  // 입력은 뿌리(맨 처음 요청)에, 산출물은 그것을 만든 실행에 붙는다
  const 입력 = (뿌리.assets ?? []).filter((a) => (a.role ?? 'INPUT') === 'INPUT');
  const 자료들 = [...입력, ...(작성.assets ?? [])];
  const 산출물 = (작성.assets ?? []).filter((a) => (a.role ?? 'INPUT') !== 'INPUT');
  const 차이들 = 차이목록(작성.result);
  // 케이스 고치기는 뿌리가 말한다 — 최신 실행이 다시 적용 · 반영이어도 「케이스 고치기」다 (DESIGN.md 「작성 상태」)
  const 고치기 = 뿌리.kind === 'EDIT';
  // 반영이 실패했으면(다른 PR 과 충돌) 최신 버튼은 실패한 머지를 건너뛴 고치기 실행이다 — 거기서 다시 적용을 낸다 (작성 §3.6 「다시 적용」)
  const 반영실패 = 뿌리.runs?.[0]?.kind === 'MERGE' && 뿌리.runs[0].status === 'FAILED';
  // 반영이 끝나야 케이스가 카탈로그에 있다 — 그 전의 케이스 고리는 빈 상세로 간다
  const 반영됨 = 뿌리.runs?.[0]?.kind === 'MERGE' && 뿌리.runs[0].status === 'DONE';
  // 반영 전에 사람이 뺀 케이스(입력 단계의 케이스 제외 · 중복의 새 케이스 제외)는 반영이 파일째 지운다 — 수 · 실행 · 고리에서 뺀다.
  // ponytail: 반영이 병합되면 상세가 중복 결정을 더는 싣지 않아(최근 반영이 실패일 때만) 중복으로 뺀 것은 못 거른다 — 실행 창이 카탈로그에 없는 번호를 빼고 알린다
  const 뺀번호 = new Set([
    ...(작성.held ?? []).filter((h) => h.input?.removed === true).map((h) => h.tcId),
    ...(작성.conflicts ?? []).filter((c) => c.input?.action === 'DROP').map((c) => c.tcId),
  ]);
  const 넣은것 = 작성.cases == null ? null : 작성.cases.filter((c) => !뺀번호.has(c.tcId));
  const 부제글 = 고치기
    ? 종류라벨('EDIT', 언어)
    : data.compare === true
      ? `${종류라벨(data.kind, 언어)} · ${t('실제 화면과 대조')}`
      : 종류라벨(data.kind, 언어);
  // 남은 요구로 이어 작성한 요청 — 칸은 뿌리(작성 요청)에만 있다. 재실행이 최신이어도 뿌리 것을 읽는다 (§3.6 「★ 원장」)
  const 원본 = 뿌리.continueFrom ?? null;
  // 대조가 병합된 뒤 서버가 세운 기획서에 없는 화면 작성 — 그 대조 뿌리로 가는 고리 (§3.6 「기획서에 없는 화면 — 두 번째 작성」)
  const 앞대조 = 뿌리.uncoveredOf ?? null;
  const 부제 =
    원본 === null && 앞대조 === null ? (
      부제글
    ) : (
      <>
        {부제글}
        {원본 === null ? null : (
          <>
            {' · '}
            <a href={`#/authoring/${String(원본)}`}>{t('#{번호}의 남은 요구', { 번호: 원본 })}</a>
          </>
        )}
        {앞대조 === null ? null : (
          <>
            {' · '}
            <a href={`#/authoring/${String(앞대조)}`}>{t('#{번호} 다음 · 기획서에 없는 화면', { 번호: 앞대조 })}</a>
          </>
        )}
      </>
    );

  return (
    <>
      {/* 상세의 제목은 **그 대상 자체**다 — 목록 줄과 같은 넣은 자료 이름. 번호만으로는 무엇을 요청했는지 몰랐다 (점검 12.16).
          자리 이름(`테스트 작성`)을 또 쓰면 어느 요청을 보고 있는지가 안 보인다 */}
      <Head
        제목={요청제목(자료요약(입력), { compare: data.compare, rootKind: 뿌리.kind }, 언어)}
        부제={
          <>
            #{String(뿌리.id)} · {부제}
          </>
        }
      />

      {/* 한 줄로 놓는다 — 할 일이 맨 위에 오고 입력 · 중복 표가 그 단계 안에 펴진다. 두 칸일 때 좁은 화면에서 할 일이 맨 아래로 밀렸다 (시안 A · 점검 12.12) */}
      <div className="screen authoring-page">
        {/* 셈은 차이 표처럼 머지를 뺀 최신 작성 실행 것이다 — 머지 행에는 셈이 없다 */}
        <AuthoringStatusCard
          요청={data}
          커버리지={작성.coverage ?? null}
          지금={Date.now()}
          service={service}
          최신={뿌리.runs?.[0]}
          뿌리종류={뿌리.kind}
          운영자={할수('설정')}
        />
        {고치기 ? <고칠내용 목록={고칠것목록(뿌리.params) ?? []} /> : null}

        {/* 케이스 고치기는 자기 반영 실패 안내(다시 적용)가 있다 */}
        {고치기 ? null : (
          <AuthoringMergeFailed
            service={service}
            실행={뿌리.runs?.[0]}
            원본={작성.kind === 'AUTHOR' ? 작성.id : (작성.sourceId ?? null)}
            권한={할수('작성요청')}
            반영권한={할수('작성머지')}
            운영자={할수('설정')}
            겹침수={data.conflicts?.length ?? 0}
            reload={reload}
          />
        )}
        <AuthoringTodo
          service={service}
          요청={data}
          할수={할수}
          차이수={차이들?.length ?? 0}
          커버리지={작성.coverage ?? null}
          고치기={고치기 ? { 반영실패 } : undefined}
          만든것={넣은것}
          reload={reload}
        />

        {고치기 ? null : <AuthoringCases cases={작성.cases ?? null} prUrl={작성.prUrl} 등록됨={반영됨} 뺀번호={뺀번호} />}

        {차이들 === null ? null : (
          <section id="diffs" className="authoring-panel" aria-labelledby="diffs-title">
            <h3 id="diffs-title">
              {t('기획서와 화면의 차이')} · {t('{수}건', { 수: 차이들.length })}
            </h3>
            {/* 좁은 화면에서 칸이 쪼개지지 않게 표만 옆으로 구른다 (DESIGN.md 「반응형」).
                에이전트 안 번호 · 표시 성공 칸은 사람이 할 일과 상관없어 뺐다 (점검 12.11) */}
            <div className="authoring-diffs-wrap">
              <table className="dhist authoring-diffs" aria-label={t('기획서와 화면의 차이')}>
                <thead>
                  <tr>
                    <th>{t('종류')}</th>
                    <th>{t('자리')}</th>
                    <th>{t('기획서')}</th>
                    <th>{t('화면')}</th>
                    <th>{t('케이스')}</th>
                  </tr>
                </thead>
                <tbody>
                  {차이들.map((d, i) => (
                    <tr key={`${d.no}-${String(i)}`}>
                      <td>{차이종류라벨(d.kind, 언어)}</td>
                      <td>{d.where ?? '—'}</td>
                      <td>{d.doc ?? '—'}</td>
                      <td>{d.screen ?? '—'}</td>
                      <td>
                        {d.tcId == null ? (
                          '—'
                        ) : 반영됨 ? (
                          <a className="mono" href={케이스주소(d.tcId)}>
                            {d.tcId}
                          </a>
                        ) : (
                          <span className="mono">{d.tcId}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="btns">
              <a className="btn ghost" href="#/prd">
                {t('PRD 관리에서 확인 필요 보기')}
              </a>
            </div>
          </section>
        )}

        <section className="authoring-panel" aria-label={t('요청 정보')}>
          <h3>{t('요청 정보')}</h3>
          <dl className="detail">
            <dt>{t('요청한 사람')}</dt>
            <dd>{data.requestedByName}</dd>
            <dt>{t('요청한 시각')}</dt>
            <dd>{when(data.createdAt, 언어)}</dd>
            {/* 역방향 (도메인/작성 §3.6 「★ 역방향」). 계정은 이 응답에 없다 — 집기 응답에만 있다 */}
            {data.compare === true ? (
              <>
                <dt>{t('대조할 화면')}</dt>
                <dd>
                  {data.env ?? t('기록 없음')} · {data.startUrl ?? t('대상 서버 주소에서 시작')}
                  {/* 재실행은 입력이 원본 요청에 있다 — 자기 입력이 비어도 화면만이 아니다 */}
                  {data.kind === 'RERUN' ? (
                    <small>{t('원본 요청 #{번호}의 입력을 그대로 씁니다', { 번호: data.sourceId ?? '—' })}</small>
                  ) : 입력.length === 0 ? (
                    <small>{t('화면만 — 기획서 없이 PRD 에 없는 화면만 작성합니다')}</small>
                  ) : null}
                </dd>
              </>
            ) : null}
          </dl>

          {입력.length === 0 ? null : (
            <>
              <h3>{t('넣은 자료')}</h3>
              <ol className="authoring-assets" aria-label={t('입력 자료')}>
                {입력.map((a) => (
                  <li key={a.id}>
                    <자료고리 요청={뿌리.id} 자료={a} 글={a.name} />
                  </li>
                ))}
              </ol>
            </>
          )}

          {산출물.length === 0 ? null : (
            <>
              <h3>{t('산출물')}</h3>
              <ol className="authoring-assets" aria-label={t('산출물')}>
                {산출물.map((a) => (
                  <li key={a.id}>
                    <자료고리 요청={data.id} 자료={a} 글={a.name} />
                    <small>{산출물설명(a, 자료들, data.kind === 'RERUN' ? data.sourceId ?? null : null, t)}</small>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
        <AuthoringRuns runs={뿌리.runs ?? []} 뿌리종류={뿌리.kind} 운영자={할수('설정')} />
      </div>
    </>
  );
}
