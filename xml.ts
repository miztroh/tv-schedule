import { create } from 'xmlbuilder2';
import { Database } from '@db/sqlite';

import { type SchedulesDirectJson } from './schedulesDirectJson.ts';
import { type TvDbSearchResponse } from './tvdb.ts';

const db = new Database('./data/imageUrls.db');

db.run(`
  CREATE TABLE IF NOT EXISTS imageUrls (
    programId TEXT PRIMARY KEY,
    imageUrl TEXT
  )
`);

type Credits = {
	actor?: Array<string | { '@role': string; '#': string }>;
	guest?: string[];
	producer?: string[];
	director?: string[];
	writer?: string[];
	presenter?: string[];
};

export const schedulesDirectXml = async (token: string, json: SchedulesDirectJson): Promise<string> => {
	const xml = {
		'tv': {
			'@source-info-url': 'http://www.schedulesdirect.org',
			'@source-info-name': 'Schedules Direct',
			'@generator-info-name': 'miztroh',
			'channel': json.lineup.stations.map(
				(station) => {
					const displayNames = [
						station.name,
						station.callsign,
					];

					const channel = json.lineup.map.find((map) => map.stationID === station.stationID)?.channel;
					if (channel) displayNames.push(channel);

					return {
						'@id': `I${station.stationID}.json.schedulesdirect.org`,
						'display-name': displayNames,
						'icon': {
							'@src': station.logo?.URL || '',
							'@width': station.logo?.width || '',
							'@height': station.logo?.height || ''
						}
					}
				}
			),
			'programme': await Promise.all(
				json.schedules.flatMap(
					async (schedule) => {
						const station = json.lineup.stations.find((s) => s.stationID === schedule.stationID);
						if (!station) throw new Error(`Station not found for stationID: ${schedule.stationID}`);

						return await Promise.all(
							schedule.programs.map(
								async (programSchedule) => {
									const program = json.programs.find((p) => p.programID === programSchedule.programID);
									if (!program) throw new Error(`Program not found for programID: ${programSchedule.programID}`);
									const metadataProgram = json.metadataPrograms.find((mp) => mp.programID === programSchedule.programID);
									if (!metadataProgram) throw new Error(`Metadata Program not found for programID: ${programSchedule.programID}`);

									const airDate = new Date(programSchedule.airDateTime);
									const pad = (n: number) => n.toString().padStart(2, '0');
									const startDate = new Date(airDate);
									const start = `${startDate.getUTCFullYear()}${pad(startDate.getUTCMonth() + 1)}${pad(startDate.getUTCDate())}${pad(startDate.getUTCHours())}${pad(startDate.getUTCMinutes())}${pad(startDate.getUTCSeconds())} +0000`;
									const stopDate = new Date(startDate.getTime() + (programSchedule.duration * 1000));
									const stop = `${stopDate.getUTCFullYear()}${pad(stopDate.getUTCMonth() + 1)}${pad(stopDate.getUTCDate())}${pad(stopDate.getUTCHours())}${pad(stopDate.getUTCMinutes())}${pad(stopDate.getUTCSeconds())} +0000`;

									let video = undefined;

									if (Array.isArray(programSchedule.videoProperties)) {
										const hasHDTV = programSchedule.videoProperties.some((v) => typeof v === 'string' && /hdtv/i.test(v));
										if (hasHDTV) video = { quality: 'HDTV' };
									}

									let audio = undefined;

									if (Array.isArray(programSchedule.audioProperties)) {
										for (const item of programSchedule.audioProperties) {
											if (typeof item === 'string') {
												if (/mono/i.test(item)) {
													audio = { stereo: 'mono' };
													break;
												} else if (/stereo/i.test(item)) {
													audio = { stereo: 'stereo' };
													break;
												} else if (/DD/i.test(item)) {
													audio = { stereo: 'dolby digital' };
													break;
												}
											}
										}
									}

									let credits: Credits | undefined = undefined;

									if ((program.cast && program.cast.length) || (program.crew && program.crew.length)) {
										const creditObj: Credits = {};

										for (const c of program.cast || []) {
											if (/guest|guest star/i.test(c.role)) {
												if (!creditObj.guest) creditObj.guest = [];
												creditObj.guest.push(c.name);
											} else {
												if (!creditObj.actor) creditObj.actor = [];

												if (c.characterName) {
													creditObj.actor.push({ '@role': c.characterName, '#': c.name });
												} else {
													creditObj.actor.push(c.name);
												}
											}
										}

										for (const c of program.crew || []) {
											if (/producer/i.test(c.role)) {
												if (!creditObj.producer) creditObj.producer = [];
												creditObj.producer.push(c.name);
											} else if (/director/i.test(c.role)) {
												if (!creditObj.director) creditObj.director = [];
												creditObj.director.push(c.name);
											} else if (/writer/i.test(c.role)) {
												if (!creditObj.writer) creditObj.writer = [];
												creditObj.writer.push(c.name);
											} else if (/host|anchor/i.test(c.role)) {
												if (!creditObj.presenter) creditObj.presenter = [];
												creditObj.presenter.push(c.name);
											} else if (/guest|contestant/i.test(c.role)) {
												if (!creditObj.guest) creditObj.guest = [];
												creditObj.guest.push(c.name);
											}
										}

										credits = creditObj;
									}

									let desc = undefined;

									if (program.descriptions?.description1000?.length) {
										desc = program.descriptions.description1000[0].description;
									} else if (program.descriptions?.description100?.length) {
										desc = program.descriptions.description100[0].description;
									}

									let category: string[] | undefined = undefined;

									if (program.genres && program.genres.length) category = program.genres;

									if (program.showType) {
										if (!category) category = [];
										category.push(program.showType);
									}

									if (program.entityType) {
										if (/movie/i.test(program.entityType)) {
											if (!category) category = [];
											category.push('movie');
										} else if (/episode/i.test(program.entityType)) {
											if (!category) category = [];
											category.push('series');
										} else if (/sports/i.test(program.entityType)) {
											if (!category) category = [];
											category.push('sports');
										} else if (station.isRadioStation) {
											if (!category) category = [];
											category.push('radio');
										} else {
											if (!category) category = [];
											category.push('tvshow');
										}
									}

									let length = undefined;

									if (programSchedule.duration) {
										length = { '@units': 'minutes', '#': programSchedule.duration / 60 };
									} else if (program.movie?.duration) {
										length = { '@units': 'minutes', '#': program.movie.duration / 60 };
									}

									let icon = undefined;
									let record = db.prepare('SELECT * FROM imageUrls WHERE programId = ?').get(program.programID);

									if (!record) {
										if (Array.isArray(metadataProgram.data)) {
											let type: 'series' | 'movie' | undefined = undefined;

											if (program.entityType.toLowerCase().includes('movie')) type = 'movie';
											else if (program.entityType.toLowerCase().includes('series') || program.entityType.toLowerCase().includes('episode')) type = 'series';

											if (type) {
												await new Promise(resolve => setTimeout(resolve, 100));

												const searchRequest = await fetch(
													`https://api4.thetvdb.com/v4/search?type=${type}&query=${encodeURIComponent(program.titles?.length ? program.titles[0].title120 : '')}`,
													{
														headers: {
															'Authorization': `Bearer ${token}`,
															'Content-Type': 'application/json'
														}
													}
												);

												if (searchRequest.ok) {
													const searchResponse: TvDbSearchResponse = await searchRequest.json();

													if (Array.isArray(searchResponse.data) && searchResponse.data.length > 0 && searchResponse.data[0].image_url) {
														const imageUrl = searchResponse.data[0].image_url;
														const insert = db.prepare('INSERT OR REPLACE INTO imageUrls (programId, imageUrl) VALUES (?, ?)');
														insert.run(program.programID, imageUrl);
													}
												}
											}
										}
									}

									record = db.prepare('SELECT * FROM imageUrls WHERE programId = ?').get(program.programID);
									if (record) icon = { '@src': record.imageUrl };

									let url = undefined;
									if (program.officialURL) url = [program.officialURL];

									const episodeNum: Array<{ '@system': string; '#': string }> = [];

									let season = '';
									let episode = '';
									let part = '';

									if (Array.isArray(program.metadata)) {
										type EpisodeMeta = {
											season?: number;
											episode?: number;
											totalSeason?: number;
											totalEpisodes?: number;
										};

										type MetadataObj = { [key: string]: EpisodeMeta };

										for (const metadata of program.metadata as MetadataObj[]) {
											if (metadata && typeof metadata === 'object') {
												const gracenote = metadata['Gracenote'];

												if (gracenote) {
													if (typeof gracenote.season === 'number' && gracenote.season > 0) {
														season = String(gracenote.season - 1);
														if (typeof gracenote.totalSeason === 'number' && gracenote.totalSeason > 0) {
															season += `/${gracenote.totalSeason}`;
														}
													}

													if (typeof gracenote.episode === 'number' && gracenote.episode > 0) {
														episode = String(gracenote.episode - 1);
														if (typeof gracenote.totalEpisodes === 'number' && gracenote.totalEpisodes > 0) {
															episode += `/${gracenote.totalEpisodes}`;
														}
													}

													break;
												} else {
													const keys = Object.keys(metadata);

													if (keys.length > 0) {
														const value: EpisodeMeta = metadata[keys[0]];
														if (typeof value?.season === 'number' && value.season > 0) {
															season = String(value.season - 1);
															if (typeof value.totalSeason === 'number' && value.totalSeason > 0) {
																season += `/${value.totalSeason}`;
															}
														}
														if (typeof value?.episode === 'number' && value.episode > 0) {
															episode = String(value.episode - 1);
															if (typeof value.totalEpisodes === 'number' && value.totalEpisodes > 0) {
																episode += `/${value.totalEpisodes}`;
															}
														}
													}
												}
											}
										}
									}

									if (programSchedule.multipart) {
										const mp = programSchedule.multipart;

										if (typeof mp.partNumber === 'number' && mp.partNumber > 0) {
											part = String(mp.partNumber - 1);
											if (typeof mp.totalParts === 'number' && mp.totalParts > 0) part += `/${mp.totalParts}`;
										}
									}

									if (season.length || episode.length || part.length) {
										episodeNum.push(
											{
												'@system': 'xmltv_ns',
												'#': `${season}.${episode}.${part}`
											}
										);
									}

									if (program.programID) episodeNum.push({ '@system': 'dd_progid', '#': program.programID });

									let previouslyShown = undefined;
									if (!programSchedule.new && program.originalAirDate) previouslyShown = { '@start': program.originalAirDate.replace(/-/g, '') };

									let premiere = undefined;
									if (typeof programSchedule.isPremiereOrFinale === 'string' && /premiere/i.test(programSchedule.isPremiereOrFinale)) premiere = [programSchedule.isPremiereOrFinale];

									let subtitles = undefined;
									if (Array.isArray(programSchedule.audioProperties) && programSchedule.audioProperties.some((a) => a === 'cc')) subtitles = [{ '@type': 'teletext' }];

									let rating = undefined;

									if (Array.isArray(program.contentRating) && program.contentRating.length) {
										rating = program.contentRating.map((r) => ({ '@system': r.body, value: r.code }));
									} else if (Array.isArray(programSchedule.ratings) && programSchedule.ratings.length) {
										rating = programSchedule.ratings.map((r) => ({ '@system': r.body, value: r.code }));
									}

									let starRating = undefined;

									if (program.movie?.qualityRating?.length) {
										const r = program.movie.qualityRating[0];
										starRating = [{ '#': `${r.rating}/${r.maxRating}`, '@system': r.ratingsBody }];
									}

									return {
										'@start': start,
										'@stop': stop,
										'@channel': `I${station.stationID}.json.schedulesdirect.org`,
										...(program.titles?.length ? { title: program.titles[0].title120 } : {}),
										...(program.episodeTitle150 ? { 'sub-title': program.episodeTitle150 } : {}),
										...(desc ? { desc } : {}),
										...(credits ? { credits } : {}),
										...(program.movie?.year ? { date: program.movie.year } : {}),
										...(category ? { category } : {}),
										...(length ? { length } : {}),
										...(icon ? { icon } : {}),
										...(url ? { url } : {}),
										...(episodeNum.length ? { 'episode-num': episodeNum } : {}),
										...(video ? { video } : {}),
										...(audio ? { audio } : {}),
										...(previouslyShown ? { 'previously-shown': previouslyShown } : {}),
										...(premiere ? { premiere } : {}),
										...(subtitles ? { subtitles } : {}),
										...(rating ? { rating } : {}),
										...(starRating ? { 'star-rating': starRating } : {}),
									};
								}
							)
						);
					}
				)
			)
		}
	};

	return `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE tv SYSTEM "xmltv.dtd">\n${create(xml).end({ prettyPrint: true, headless: true })}`;
};