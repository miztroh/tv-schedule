FROM denoland/deno:latest

LABEL org.opencontainers.image.source=https://github.com/miztroh/tv-schedule

WORKDIR /app

COPY . .

RUN deno cache serve.ts

EXPOSE 8000

VOLUME [ "/app/data" ]

CMD ["deno", "run", "--unstable-cron", "--allow-net=0.0.0.0:8000,json.schedulesdirect.org:443,api4.thetvdb.com:443,github.com:443,release-assets.githubusercontent.com:443", "--allow-read=/app", "--allow-read=/root", "--allow-write=/root", "--allow-env", "--allow-ffi", "./serve.ts"]