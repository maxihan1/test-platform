# 러너 컨테이너. 브라우저 바이너리가 들어 있는 Playwright 공식 이미지에서 시작한다 (SPEC §9)
# 태그는 @playwright/test 버전과 정확히 같아야 한다. 다르면 브라우저 바이너리를 못 찾는다
FROM mcr.microsoft.com/playwright:v1.63.0-jammy

WORKDIR /app

# /tests는 읽기 전용이라 그 안에 node_modules를 둘 수 없다. 모듈은 /app에서 resolve 된다
COPY package.json package-lock.json ./
COPY packages/kit/package.json packages/kit/
COPY apps/admin/package.json apps/admin/
COPY apps/runner/package.json apps/runner/
RUN npm ci

# Node는 파일 위치에서 루트까지 올라가며 node_modules를 찾는다. /tests에서 시작하면 /app을 못 지나므로
# 루트에 링크를 걸어야 @playwright/test·@platform/kit·zod가 resolve 된다 (SPEC §9)
RUN ln -s /app/node_modules /node_modules

COPY tsconfig.json playwright.config.ts ./
COPY packages ./packages
COPY apps/runner ./apps/runner

EXPOSE 4000
CMD ["npx", "tsx", "apps/runner/src/server.ts"]
