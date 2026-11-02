// 새 작성 요청 폼의 API 애플리케이션 칸 — API 문서 판과 대상 서버 (도메인/작성 §7 「AUTHOR API 문서 판」)

import { useEffect, useState } from 'react';

import { ApiError, type EnvRow } from './api.js';
import { apiDocApi, type ApiDocVersionRow } from './apiDocApi.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

interface 읽음 {
  id: number;
  /** null 이면 화면 애플리케이션이다 (NOT_API_SERVICE) */
  버전들: ApiDocVersionRow[] | null;
  기준서버: string | null;
  오류: string | null;
}

/**
 * 이 애플리케이션이 API 종류인지, 문서 판이 무엇무엇인지 묻는다. 화면 애플리케이션은 NOT_API_SERVICE 로 갈린다.
 * `serviceId` 가 없으면(옛 호출) 묻지 않고 화면 폼으로 둔다
 */
export function useApiDocs(serviceId: number | undefined) {
  const 언어 = use언어();
  const [읽음, set읽음] = useState<읽음 | null>(null);

  useEffect(() => {
    if (serviceId === undefined) return;
    let live = true;
    apiDocApi.list(serviceId).then(
      (r) => {
        if (live) set읽음({ id: serviceId, 버전들: r.versions, 기준서버: r.docEnv, 오류: null });
      },
      (err: unknown) => {
        if (!live) return;
        // 화면 애플리케이션은 오류가 아니다. 그 밖의 오류는 화면 폼을 살려 둔 채 알린다
        const 화면앱 = err instanceof ApiError && err.code === 'NOT_API_SERVICE';
        set읽음({ id: serviceId, 버전들: null, 기준서버: null, 오류: 화면앱 ? null : message(err, 언어) });
      },
    );
    return () => {
      live = false;
    };
  }, [serviceId]);

  // 서비스를 바꾸면 앞 서비스의 답을 버린다 — 안 그러면 새 답이 올 때까지 옛 폼이 남는다
  const 지금 = serviceId !== undefined && 읽음?.id === serviceId ? 읽음 : null;
  return { 대기: serviceId !== undefined && 지금 === null, 버전들: 지금?.버전들 ?? null, 기준서버: 지금?.기준서버 ?? null, 오류: 지금?.오류 ?? null };
}

export function ApiDocFields({
  버전들,
  판,
  on판,
  envs,
  서버,
  on서버,
  운영자,
  disabled,
}: {
  버전들: ApiDocVersionRow[];
  판: number | null;
  on판: (판: number) => void;
  envs: EnvRow[];
  서버: string | null;
  on서버: (서버: string) => void;
  운영자: boolean;
  disabled: boolean;
}) {
  const t = use말();

  if (버전들.length === 0) {
    return (
      <div className="authoring-field">
        <span className="error-text">{t('API 문서가 아직 없습니다. API 문서 화면에서 먼저 받습니다')}</span>
        <a href="#/api/docs">{t('API 문서 화면으로')}</a>
      </div>
    );
  }
  return (
    <>
      <div className="authoring-field">
        <span aria-hidden="true">{t('API 문서')}</span>
        <select aria-label={t('API 문서')} value={판 ?? ''} disabled={disabled} onChange={(e) => on판(Number(e.target.value))}>
          {버전들.map((v, i) => (
            <option key={v.version} value={v.version}>
              {i === 0 ? t('버전 {버전} (현재 버전)', { 버전: v.version }) : t('버전 {버전}', { 버전: v.version })}
            </option>
          ))}
        </select>
      </div>
      <div className="authoring-field">
        <span aria-hidden="true">{t('대상 서버')}</span>
        {envs.length === 0 ? (
          <span className="error-text">
            {운영자
              ? t('이 애플리케이션에는 대상 서버가 없습니다. 설정 > 애플리케이션에서 먼저 넣으세요')
              : t('이 애플리케이션에는 대상 서버가 없습니다. 관리자에게 대상 서버를 넣어 달라고 요청하세요')}
          </span>
        ) : (
          <select aria-label={t('대상 서버')} value={서버 ?? ''} disabled={disabled} onChange={(e) => on서버(e.target.value)}>
            {envs.map((it) => (
              <option key={it.env} value={it.env}>
                {it.env}
              </option>
            ))}
          </select>
        )}
      </div>
    </>
  );
}
