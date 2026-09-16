# WS-E 진행 기록 — 화면

## 2026-09-16
- 완료: 화면 4종 (케이스 목록 · 실행 설정 · 실행 결과 목록 · 항목 상세) + 실행 묶음 목록.
  React + Vite, 소유 경로 `apps/admin/src/web/**` 안에서만 만들었다. 단위 테스트 34건
- 확인함 (전부 **진짜 API**로. 목 데이터를 만들지 않았다):
  - `paramSchema`로 입력 폼이 자동 생성된다 — DEMO-004 enum→셀렉트(albums·photos·todos),
    DEMO-005 optional→라벨 옆 `선택` + 빈 칸, DEMO-003 파라미터 3개, boolean→`예`/`아니오` 셀렉트.
    라벨은 전부 zod `.describe()` 값이고 `default`가 있으면 칸이 미리 채워진다
  - 작성자 번호에 `아홉`을 넣고 실행하기를 누르니 **버튼은 그대로 살아 있고** 그 칸 아래에
    `작성자 번호(userId)은 숫자여야 한다`가 붙었다 (SPEC §8.2)
  - 케이스 목록이 `cases` + `last-by-case` **각 한 번**으로 다 채워진다. 케이스마다 이력을 부르지 않는다
  - DEMO-008을 눌러 실행 → `POST /api/runs`가 바로 돌아오고 결과 화면이 `도는 중 2건`으로 떴다가
    **스스로 갱신되어** PC 통과 0.60초 · 모바일 통과 0.80초가 됐다 (2초마다 다시 물음, FINISHED가 되면 멈춤)
  - RUN 123에서 DEMO-008이 한 행에 PC·모바일 판정을 나란히, DEMO-010은 PC 칸이 `—`로 비었다
  - 항목 상세(123/161)에 절차 2건 · 검증 문장 · 실패 문장 아래 스크린샷 · 그 아래 접힌 `실패 지점 코드`.
    펼치면 21~26행이 나오고 26행이 강조된다
  - `npx vite build`가 `apps/admin/src/web/dist`에 산출물을 떨어뜨린다 (app.ts의 정적 서빙 자리)
- 미완: 없음
- 막힌 것: 없음

### 컨테이너가 화면을 서빙하지 못한다 — 내 소유 경로 밖이라 고치지 않았다

`app.ts`는 `src/web/dist`가 있으면 서빙하도록 이미 돼 있다. 그런데

- `.dockerignore`에 `**/dist`가 있어 호스트에서 빌드한 산출물이 이미지에 안 들어간다
- `apps/admin/Dockerfile`에 vite 빌드 단계가 없다

둘 다 `apps/admin/src/web/**` 밖이다 (CLAUDE.md §1.1). **병합 담당이 Dockerfile에
`RUN npx vite build --config apps/admin/src/web/vite.config.ts` 한 줄을 넣으면 된다.**
`.dockerignore`는 `**/dist`를 그대로 둬도 된다 — 이미지 안에서 빌드하면 COPY를 타지 않는다.

지금 확인하는 방법은 개발 서버다. API는 진짜 admin(3000)이 받는다.

```
docker compose up -d
npx vite --config apps/admin/src/web/vite.config.ts
# → http://localhost:5173
```

### SPEC에 안 적혀 있어 판단한 것 3가지

| 무엇 | 정한 것 | 왜 |
|------|--------|-----|
| 실행 제목 | 실행 설정에 `실행 제목` 칸을 두고 `<tcId> 실행`으로 미리 채운다 | `POST /api/runs`의 `title`이 필수인데 §8.2 화면에 그 칸이 없다. 실행 목록이 제목으로 실행을 가린다 |
| §8.3의 `소요시간` 칸 | 환경별 판정 배지 **아래**에 각각 적는다 | 환경이 둘인 행에서 소요시간이 하나면 어느 환경 것인지 알 수 없다 |
| 아직 안 끝난 항목 | 판정 배지 대신 `도는 중` | `run_item`은 생성 시 `NA`다. 끝나야 판정이 들어간다 (SPEC §3.2). 미실행 배지를 붙이면 끝난 것처럼 보인다 |

### 다음 세션이 알아야 할 것

- **진입점**: 폼 자동 생성은 `schema.ts`의 `schemaToFields`/`toValues`,
  실행 전 검증은 `validation.ts`, 환경별 묶기는 `group.ts`, 주소 해시는 `route.ts`.
  화면은 `CaseList`·`RunSetup`·`RunList`·`RunResult`·`ItemDetail` 다섯 개, 공용 조각은 `ui.tsx`
- **`validation.ts`는 서버의 `../execution/validate.ts`를 그대로 부른다.** 검증기를 두 벌 두면
  '실행하기'와 '입력값 세트로 저장'이 같은 값에 다른 사유를 낸다. WS-B가 그 파일에
  DB나 fastify를 import 하면 화면 빌드가 깨진다 — 순수 함수로 남겨 둬야 한다
- **Vite 프록시 규칙은 `'^/api/'`다.** `'/api'`로 적으면 소스 파일 `/api.ts` 요청까지
  admin으로 넘어가 화면이 통째로 빈다 (LEARNINGS)
- **개발 서버 명령에 `--config`가 꼭 필요하다.** 화면 폴더에 package.json을 만들지 않았다 —
  루트·admin의 package.json은 Phase 0 공용 골격이라 스크립트를 넣을 수 없다
- **단위 테스트는 `*.test.ts`만이다.** vitest include가 `apps/**/*.test.ts`라 `.test.tsx`는 안 잡힌다.
  그래서 JSX가 아니라 순수 함수(스키마→칸, 묶기, 주소)를 테스트했다. DB를 쓰지 않으므로 fixture 접두사도 없다
- **좁은 창(620px 미만) 레이아웃은 눈으로 확인하지 못했다.** 목업의 미디어 쿼리를 그대로 옮기고
  `.err`·`.after-assert` 두 개를 더했다. 브라우저 창을 620px 아래로 줄이지 못했다
- `docs/LEARNINGS.md`가 202줄이다. 자체 규칙(100줄)을 넘었으니 정리 대상이다 — 내 갈래 소유가 아니라 건드리지 않았다
