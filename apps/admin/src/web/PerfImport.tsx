// 마법사 1단계의 가져오기 셋 — E2E 녹화 · Swagger · JMeter·nGrinder 파일. 셋 다 AI 일을 맡겨 트랜잭션 목록을 받는다 (도메인/성능 §3.9 「시나리오 만들기 — 세 길」)

import { useState } from 'react';

import type { ServiceRow } from './api.js';
import { apiDocApi } from './apiDocApi.js';
import { use말 } from './i18n.js';
import { 마지막서버 } from './layout.js';
import { perfApi, type 초안결과 } from './perfApi.js';
import { scenarioApi } from './scenarioApi.js';
import { Failed, Loading, useAsync, 기다림글자 } from './ui.js';
import { usePerfJob } from './usePerfJob.js';

type 길 = 'RECORD' | 'SWAGGER' | 'FILE';

export function PerfImport({ service, 받음 }: { service: ServiceRow; 받음: (결과: 초안결과, jobId: number) => void }) {
  const t = use말();
  const [열린, set열린] = useState<길 | null>(null);
  const 일 = usePerfJob<초안결과>((결과, jobId) => {
    set열린(null);
    받음(결과, jobId);
  });

  const 단추 = (어느: 길, 글: string) => (
    <button type="button" className="btn ghost small" aria-expanded={열린 === 어느} disabled={일.도나} onClick={() => set열린(열린 === 어느 ? null : 어느)}>
      {글}
    </button>
  );

  return (
    <>
      <div className="perf-row">
        <span className="perf-faint">{t('가져오면 지금 트랜잭션 목록을 바꿉니다')}</span>
        <div className="perf-acts">
          {단추('RECORD', t('E2E 녹화'))}
          {단추('SWAGGER', t('Swagger 가져오기'))}
          {단추('FILE', t('JMeter·nGrinder 가져오기'))}
        </div>
      </div>
      {일.도나 ? (
        <div className="perf-well" role="status">
          <기다림글자 중 평소="" 기다림={t('AI 가 트랜잭션 목록을 만드는 중입니다. 녹화는 몇 분 걸립니다')} />
        </div>
      ) : 열린 === 'RECORD' ? (
        <녹화칸 service={service} 맡기기={일.맡기기} />
      ) : 열린 === 'SWAGGER' ? (
        <스웨거칸 service={service} 맡기기={일.맡기기} />
      ) : 열린 === 'FILE' ? (
        <div className="perf-well">
          <label className="perf-field">
            {t('.jmx 또는 nGrinder 스크립트 파일')}
            <input
              type="file"
              accept=".jmx,.groovy,.py,.xml,.txt"
              onChange={(e) => {
                const 파일 = e.target.files?.[0];
                // 비워 둬야 실패한 뒤 같은 파일을 다시 골라도 onChange 가 선다
                e.target.value = '';
                if (파일 !== undefined) void 일.맡기기(() => perfApi.draftFile(service.id, 파일));
              }}
            />
          </label>
          <span className="perf-faint">{t('옮기지 못한 부분(BeanShell · 자바 코드)은 따로 보여 줍니다. 1MB 까지 올릴 수 있습니다')}</span>
        </div>
      ) : null}
      {일.오류 === null ? null : <p className="perf-err" role="alert">{일.오류}</p>}
    </>
  );
}

type 맡기기 = (요청: () => Promise<{ jobId: number }>) => Promise<void>;

function 녹화칸({ service, 맡기기 }: { service: ServiceRow; 맡기기: 맡기기 }) {
  const t = use말();
  const 목록 = useAsync(() => scenarioApi.list(service.prefix), [service.prefix]);
  const [시나리오, set시나리오] = useState('');
  const [env, setEnv] = useState(() => 마지막서버(service.prefix, service.envs));
  const [까닭, set까닭] = useState<string | null>(null);

  if (목록.error !== null) return <Failed error={목록.error} />;
  if (목록.data === null) return <Loading />;

  function 시작() {
    if (시나리오 === '' || env === '') {
      set까닭(t('E2E 시나리오와 대상 서버를 골라 주세요'));
      return;
    }
    void 맡기기(() => perfApi.draft({ serviceId: service.id, from: 'RECORD', env, scenarioId: Number(시나리오) }));
  }

  return (
    <div className="perf-well">
      <div className="perf-fields">
        <label className="perf-field">
          {t('E2E 시나리오')}
          <select value={시나리오} onChange={(e) => set시나리오(e.target.value)}>
            <option value="">{t('고르기')}</option>
            {목록.data.items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>
        </label>
        <label className="perf-field">
          {t('대상 서버')}
          <select value={env} onChange={(e) => setEnv(e.target.value)}>
            <option value="">{t('고르기')}</option>
            {service.envs.map((it) => (
              <option key={it.env} value={it.env}>
                {it.env}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn small" onClick={시작}>
          {t('녹화 시작')}
        </button>
      </div>
      <span className="perf-faint">{t('서버 테스트 실행기가 시나리오를 한 번 돌리며 오간 요청을 남깁니다. 이 실행은 실행 기록에 남지 않습니다')}</span>
      {까닭 === null ? null : <p className="perf-err">{까닭}</p>}
    </div>
  );
}

const 메서드들 = ['get', 'post', 'put', 'patch', 'delete'];

function 스웨거칸({ service, 맡기기 }: { service: ServiceRow; 맡기기: 맡기기 }) {
  const t = use말();
  // 가장 새 판에서 고른다. 판을 고르는 칸은 두지 않는다 — 옛 판으로 시나리오를 만들 일은 드물다
  const 문서 = useAsync(async () => {
    const { versions } = await apiDocApi.list(service.id);
    const 판 = versions[0];
    // 「없다」를 null 로 돌리면 「불러오는 중」과 갈리지 않는다 — 한 겹 싼다
    if (판 === undefined) return { 판: null };
    const { doc } = await apiDocApi.doc(service.id, 판.version);
    const 작업들 = Object.entries(doc.paths ?? {}).flatMap(([path, ops]) =>
      Object.entries(ops ?? {}).filter(([m]) => 메서드들.includes(m)).map(([method, op]) => ({ method: method.toUpperCase(), path, summary: op?.summary ?? '' })),
    );
    return { 판: { version: 판.version, 작업들 } };
  }, [service.id]);
  // 고른 차례가 곧 트랜잭션 차례다 (§3.9 「Swagger」 — 고른 API 의 차례를 정한다)
  const [고른, set고른] = useState<string[]>([]);
  const [까닭, set까닭] = useState<string | null>(null);

  if (문서.error !== null) return <Failed error={문서.error} />;
  if (문서.data === null) return <Loading />;
  if (문서.data.판 === null) return <div className="perf-well perf-faint">{t('이 애플리케이션에 올린 API 문서가 없습니다. PRD 관리 › API 문서에서 먼저 올려 주세요')}</div>;
  const { version, 작업들 } = 문서.data.판;

  function 가져오기() {
    if (고른.length === 0) {
      set까닭(t('API 를 하나 이상 골라 주세요'));
      return;
    }
    const operations = 고른.map((키) => {
      const [method = '', path = ''] = 키.split(' ');
      return { method, path };
    });
    void 맡기기(() => perfApi.draft({ serviceId: service.id, from: 'SWAGGER', apiDocVersion: version, operations }));
  }

  return (
    <div className="perf-well">
      <span className="perf-faint">{t('API 문서 버전 {번호} · 고른 차례대로 트랜잭션이 됩니다 (50개까지)', { 번호: version })}</span>
      <div className="perf-picks">
        {작업들.map((op) => {
          const 키 = `${op.method} ${op.path}`;
          const 차례 = 고른.indexOf(키);
          return (
            <label key={키}>
              <input
                type="checkbox"
                checked={차례 >= 0}
                disabled={차례 < 0 && 고른.length >= 50}
                onChange={() => set고른(차례 >= 0 ? 고른.filter((it) => it !== 키) : [...고른, 키])}
              />{' '}
              {차례 >= 0 ? <b>{차례 + 1}. </b> : null}
              <span className="mono">{키}</span> {op.summary === '' ? null : <span className="perf-faint">{op.summary}</span>}
            </label>
          );
        })}
      </div>
      <div>
        <button type="button" className="btn small" onClick={가져오기}>
          {t('고른 API 가져오기')}
        </button>
      </div>
      {까닭 === null ? null : <p className="perf-err">{까닭}</p>}
    </div>
  );
}
