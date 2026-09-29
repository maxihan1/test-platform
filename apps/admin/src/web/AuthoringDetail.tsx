// 작성 요청 한 건 상세 페이지. 왼쪽은 Status 카드와 차이, 오른쪽은 다음 단계와 요청 정보, 아래는 실행 기록이다
// (도메인/작성 §3.6 · §7 · 도메인/인증 §7 「등급으로 갈리는 자리」 · DESIGN.md 「작성 상태」)

import { useCallback, useEffect } from 'react';

import { api, type AuthoringAsset, type AuthoringRow } from './api.js';
import { AuthoringRuns } from './AuthoringRuns.js';
import { AuthoringStatusCard } from './AuthoringStatusCard.js';
import { AuthoringTodo } from './AuthoringTodo.js';
import { 끝났나, 종류라벨, 차이목록, 차이종류라벨 } from './authoringView.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import type { 판정 } from './role.js';
import { Failed, Loading, useAsync, when } from './ui.js';

/** 파일은 내려받기, 피그마는 저장된(정규화한) 주소로 연다 */
function 자료고리({ 요청, 자료, 글 }: { 요청: number; 자료: AuthoringAsset; 글: string }) {
  if (자료.kind === 'FIGMA') {
    return (
      <a href={자료.figmaUrl ?? 자료.name} target="_blank" rel="noopener noreferrer">
        {글}
      </a>
    );
  }
  // 서버가 attachment 로 준다. download 는 같은 뜻을 브라우저에 한 번 더 말한다
  return (
    <a href={api.authoringAssetUrl(요청, 자료.id)} download>
      {글}
    </a>
  );
}

/**
 * 산출물이 무엇인지. 표시 사본은 어느 입력의 사본인지까지 — 입력이 여럿이면 이름 없이는 못 가린다.
 * 재실행의 입력은 원본 요청에 있어 이 목록에서 못 찾는다 — 그때는 원본 요청을 가리킨다
 */
function 산출물설명(
  a: AuthoringAsset,
  자료들: AuthoringAsset[],
  원본요청: number | null,
  t: (키: string, 값?: Record<string, string | number>) => string,
): string {
  if (a.role === 'REVERSE_SPEC') return t('역기획서');
  const 원본 = 자료들.find((x) => x.id === a.sourceAssetId);
  const 이름 =
    원본?.name ?? (원본요청 === null ? t('기록 없음') : t('원본 요청 #{번호}의 자료', { 번호: 원본요청 }));
  return `${t('표시 사본')} — ${이름}`;
}

export function AuthoringDetail({ service, id, 할수 }: { service: string; id: number; 할수: 판정 }) {
  const t = use말();
  const 언어 = use언어();

  // 보이는 번호는 뿌리 하나다 (도메인/작성 §7 「실행 기록」). 뿌리 상세는 실행 기록을, 상태 카드 · 다음 단계는
  // 최신 실행 상세를 그린다 — 버튼이 옛 실행에 걸리면 멈춤 · 이어서 작성이 엉뚱한 행으로 간다 (2026-09-29 계획 검토)
  const 것 = useAsync<AuthoringRow>(() => api.authoringRequest(service, id), [service, id]);
  const 뿌리 = 것.data;
  const 최신번호 = 뿌리?.runs?.[0]?.id ?? null;
  const 따로 = 최신번호 !== null && 최신번호 !== id;
  const 최신것 = useAsync<AuthoringRow | null>(
    () => (따로 ? api.authoringRequest(service, 최신번호) : Promise.resolve(null)),
    [service, 최신번호, 따로],
  );
  const data = 따로 ? 최신것.data : 뿌리;
  const 뿌리읽기 = 것.reload;
  const 최신읽기 = 최신것.reload;
  const reload = useCallback(() => {
    뿌리읽기();
    최신읽기();
  }, [뿌리읽기, 최신읽기]);
  const 도는중 = data !== null && !끝났나(data.status);

  // 예전 실행 번호로 들어오면 뿌리 번호 쪽으로 — 한 요청이 번호 여럿으로 흩어져 보이지 않게
  const 뿌리번호 = 뿌리?.rootId;
  useEffect(() => {
    if (뿌리번호 !== undefined && 뿌리번호 !== id) window.location.hash = `#/authoring/${String(뿌리번호)}`;
  }, [뿌리번호, id]);

  // 에이전트가 뒤에서 이어 간다. 끝날 때까지만 다시 묻고 끝나면 멈춘다 (RunResult 와 같은 모양)
  useEffect(() => {
    if (!도는중) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [도는중, reload]);

  if (것.error !== null) return <Failed error={것.error} />;
  if (최신것.error !== null) return <Failed error={최신것.error} />;
  if (뿌리 === null || data === null) return <Loading />;

  // 입력과 산출물을 가른다. role 이 없으면 입력이다 — 이 칸을 모르는 옛 응답도 그대로 그린다.
  // 입력은 뿌리(맨 처음 요청)에, 산출물은 그것을 만든 실행에 붙는다
  const 입력 = (뿌리.assets ?? []).filter((a) => (a.role ?? 'INPUT') === 'INPUT');
  const 자료들 = [...입력, ...(data.assets ?? [])];
  const 산출물 = (data.assets ?? []).filter((a) => (a.role ?? 'INPUT') !== 'INPUT');
  const 차이들 = 차이목록(data.result);
  const 부제 = data.compare === true ? `${종류라벨(data.kind, 언어)} · ${t('실제 화면과 대조')}` : 종류라벨(data.kind, 언어);

  return (
    <>
      {/* 상세의 제목은 **그 대상 자체**다 — 실행 결과가 `RUN 2113` 을 쓰는 것과 같은 모양.
          자리 이름(`테스트 작성`)을 또 쓰면 어느 요청을 보고 있는지가 안 보인다 */}
      <Head 제목={`#${String(뿌리.id)}`} 부제={부제} />

      <div className="screen authoring-page">
        <div className="authoring-cols">
          <div className="authoring-col">
            <AuthoringStatusCard 요청={data} 지금={Date.now()} service={service} />

            {차이들 === null ? null : (
              <section className="authoring-panel">
                <h3>
                  {t('기획서와 화면의 차이')} · {t('{수}건', { 수: 차이들.length })}
                </h3>
                {/* 좁은 화면에서 일곱 칸이 쪼개지지 않게 표만 옆으로 구른다 (DESIGN.md 「반응형」) */}
                <div className="authoring-diffs-wrap">
                  <table className="dhist authoring-diffs" aria-label={t('기획서와 화면의 차이')}>
                    <thead>
                      <tr>
                        <th>{t('번호')}</th>
                        <th>{t('종류')}</th>
                        <th>{t('자리')}</th>
                        <th>{t('기획서')}</th>
                        <th>{t('화면')}</th>
                        <th>{t('케이스')}</th>
                        <th>{t('표시')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {차이들.map((d, i) => (
                        <tr key={`${d.no}-${String(i)}`}>
                          <td className="mono">{d.no}</td>
                          <td>{차이종류라벨(d.kind, 언어)}</td>
                          <td>{d.where ?? '—'}</td>
                          <td>{d.doc ?? '—'}</td>
                          <td>{d.screen ?? '—'}</td>
                          <td className="mono">{d.tcId ?? '—'}</td>
                          {/* 표시 실패는 판정이 아니다 — 판정 색 없이 이유만 적는다 (DESIGN.md 「판정 표기」 원칙 1) */}
                          <td>{d.marked ? t('표시함') : `${t('표시 못 함')} — ${d.markError ?? t('이유 기록 없음')}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

          <div className="authoring-col">
            <AuthoringTodo service={service} 요청={data} 할수={할수} 차이수={차이들?.length ?? 0} reload={reload} />

            <section className="authoring-panel" aria-label={t('요청 정보')}>
              <h3>{t('요청 정보')}</h3>
              <dl className="detail">
                <dt>{t('요청한 사람')}</dt>
                <dd>{data.requestedByName}</dd>
                <dt>{t('요청한 시각')}</dt>
                <dd>{when(data.createdAt, 언어)}</dd>
                <dt>{t('작성 에이전트')}</dt>
                <dd>{data.claimedBy ?? t('아직 배정 전')}</dd>
                {/* 역방향 (도메인/작성 §3.6 「★ 역방향」). 계정은 이 응답에 없다 — 집기 응답에만 있다 */}
                {data.compare === true ? (
                  <>
                    <dt>{t('대조할 화면')}</dt>
                    <dd>
                      {data.env ?? t('기록 없음')} · {data.startUrl ?? t('기획서가 말하는 화면에서 시작')}
                      {/* 재실행은 입력이 원본 요청에 있다 — 자기 입력이 비어도 화면만이 아니다 */}
                      {data.kind === 'RERUN' ? (
                        <small>{t('입력은 원본 요청 #{번호} 것을 그대로 씁니다', { 번호: data.sourceId ?? '—' })}</small>
                      ) : 입력.length === 0 ? (
                        <small>{t('화면만 — 기획서 없이 이 화면을 훑습니다')}</small>
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
          </div>
        </div>
        <AuthoringRuns runs={뿌리.runs ?? []} />
      </div>
    </>
  );
}
