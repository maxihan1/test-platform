# 부하 발생 에이전트 컨테이너. 다른 기계에도 이 이미지 하나만 띄우므로 저장소 부품은 담지 않고 node · k6 · tsx 만 담는다 (도메인/성능 §5.4)
# 빌드 자리는 이 폴더다(compose build: ./apps/perf-agent) — 다른 기계에서는 이 폴더만 있으면 된다
# k6 는 실행 파일만 쓴다 — 고치지 않는다(AGPL-3.0, 공통/6 §9.1)
FROM grafana/k6:2.3.0 AS k6

FROM node:22-bookworm-slim
COPY --from=k6 /usr/bin/k6 /usr/bin/k6

WORKDIR /app
# "type": "module" 이 있어야 tsx 가 ESM 으로 읽는다(main.ts 의 맨 위 await)
COPY package.json ./
# 저장소 package-lock.json 의 tsx 와 같은 판
RUN npm install --no-save --no-audit --no-fund tsx@4.23.13
COPY src ./src

# 종료 신호는 compose 의 init 이 넘긴다 (공통/6 §9)
CMD ["node", "--import", "tsx", "src/main.ts"]
