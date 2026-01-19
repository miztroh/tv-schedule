# Example docker-compose.yml

Replace the environment variables accordingly.

```yml
services:
  tv-schedule:
    environment:
      SD_FETCH_DAYS: ${SD_FETCH_DAYS}
      SD_LINEUP: ${SD_LINEUP}
      SD_PASSWORD: ${SD_PASSWORD}
      SD_USERNAME: ${SD_USERNAME}
      BASE_URL: ${BASE_URL}
      TVDB_APIKEY: ${TVDB_APIKEY}
      TV_SCHEDULE_VERSION: ${TV_SCHEDULE_VERSION}
    image: ghcr.io/miztroh/tv-schedule:${TV_SCHEDULE_VERSION}
    ports:
      - 8000:8000
    volumes:
      - data:/app/data

volumes:
  data:

```