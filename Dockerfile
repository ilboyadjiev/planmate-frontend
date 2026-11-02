# ---- Build stage ----
FROM node:20.14.0-alpine AS build

WORKDIR /app

# Install exactly what the lockfile specifies (fails if package.json and lockfile drift)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG REACT_APP_BACKEND_BASE_URL
ENV REACT_APP_BACKEND_BASE_URL=$REACT_APP_BACKEND_BASE_URL

ARG REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID

# Commit SHA baked into the bundle as /version.json, so the deploy smoke test can
# verify the *new* build is live (not just that something answers with 200).
ARG GIT_SHA=unknown
RUN printf '{"sha":"%s"}\n' "$GIT_SHA" > public/version.json

RUN npm run build

# ---- Serve stage ----
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
