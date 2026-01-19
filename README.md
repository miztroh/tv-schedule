# Overview

This app fetches lineup data from the SchedulesDirect JSON API, converting it to XML and updating each program's icon value with an image URL fetched from The TVDB.  The resulting XML file is served at /schedule.xml and can be consumed by any applications supporting XMLTV (e.g. Jellyfin) guide data.

# Example docker-compose.yml

Replace the environment variables accordingly.

> [!NOTE]
> The SD_PASSWORD password must be SHA1 hashed: ``echo -n "password" | shasum -a 1``

```yml
services:
  tv-schedule:
    environment:
      # SchedulesDirect number of days to fetch
      SD_FETCH_DAYS: ${SD_FETCH_DAYS}
      # SchedulesDirect lineup ID
      SD_LINEUP: ${SD_LINEUP}
      # SchedulesDirect username
      SD_USERNAME: ${SD_USERNAME}
      # SchedulesDirect password (see note above)
      SD_PASSWORD: ${SD_PASSWORD}
      # The TvDB API key
      TVDB_APIKEY: ${TVDB_APIKEY}
    image: ghcr.io/miztroh/tv-schedule:${TV_SCHEDULE_VERSION}
    ports:
      - 8000:8000
    volumes:
      - data:/app/data

volumes:
  data:
```