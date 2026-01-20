export const schedulesDirectToken = async (): Promise<SchedulesDirectTokenResponse> => {
	const username = Deno.env.get('SD_USERNAME');
	if (!username) throw new Error('Missing SD_USERNAME environment variable');
	const password = Deno.env.get('SD_PASSWORD');
	if (!password) throw new Error('Missing SD_PASSWORD environment variable');

	const tokenRequest = await fetch(
		'https://json.schedulesdirect.org/20141201/token',
		{
			method: 'POST',
			body: JSON.stringify({ username, password }),
			headers: {
				'Content-Type': 'application/json',
			}
		}
	);

	if (!tokenRequest.ok) throw new Error(`Token request failed with status ${tokenRequest.status}`);
	const tokenResponse: SchedulesDirectTokenResponse = await tokenRequest.json();
	return tokenResponse;
};

export interface SchedulesDirectLineupsResponse {
	map: {
		stationID: string;
		channel: string;
		atscMajor: number;
		atscMinor: number;
		uhfVhf: number;
	}[];
	stations: {
		stationID: string;
		name: string;
		broadcaster: {
			city: string;
			state: string;
			postalcode: string;
			country: string;
		};
		callsign: string;
		broadcastLanguage: string[];
		descriptionLanguage: string[];
		affiliate: string;
		logo: {
			URL: string;
			height: number;
			width: number;
			md5: string;
			hash: string;
		};
		stationLogo: {
			URL: string;
			height: number;
			width: number;
			md5: string;
			hash: string;
			source: string;
			category: string;
		}[];
		isRadioStation?: boolean;
	}[];
	metadata: {
		lineup: string;
		modified: string;
		transport: string;
	};
};

export interface SchedulesDirectProgramsResponse {
	programID: string;
	resourceID?: string;
	titles: {
		title120: string;
		titleLanguage?: string;
	}[];
	descriptions?: {
		description1000?: {
			descriptionLanguage?: string;
			description: string;
		}[];
		description100?: {
			descriptionLanguage?: string;
			description: string;
		}[];
	};
	originalAirDate?: string;
	showType?: string;
	entityType: string;
	country?: string[];
	genres?: string[];
	cast?: {
		billingOrder?: string;
		role: string;
		name: string;
		characterName?: string;
		nameId?: string;
		personId?: string;
	}[];
	crew?: {
		billingOrder?: string;
		role: string;
		name: string;
		nameId?: string;
		personId?: string;
	}[];
	contentRating?: {
		body: string;
		code: string;
		country?: string;
		contentWarning?: string[];
		contentAdvisory?: string[];
	}[];
	episodeTitle150?: string;
	duration?: number;
	metadata?: {
		Gracenote?: {
			season?: number;
			episode?: number;
			totalSeason?: number;
			totalEpisodes?: number;
		}
	}[];
	hasImageArtwork?: boolean;
	hasEpisodeArtwork?: boolean;
	hasSeasonArtwork?: boolean;
	hasSeriesArtwork?: boolean;
	hash?: string;
	md5?: string;
	movie?: {
		year?: string;
		duration?: number;
		qualityRating?: Array<{
			rating: string;
			maxRating: string;
			ratingsBody: string;
		}>;
	};
	episodeImage?: {
		uri: string;
		width?: number;
		height?: number;
	};
	officialURL?: string;
};

export interface SchedulesDirectSchedulesResponse {
	stationID: string;
	programs: {
		programID: string;
		airDateTime: string;
		duration: number;
		hash?: string;
		md5?: string;
		new?: boolean;
		liveTapeDelay?: string;
		audioProperties?: string[];
		videoProperties?: string[];
		multipart?: {
			partNumber?: number;
			totalParts?: number;
		};
		isPremiereOrFinale?: string;
		ratings?: Array<{
			code: string;
			body: string;
		}>;
	}[];
	metadata: {
		modified: string;
		modifiedEpoch: number;
		hash: string;
		md5: string;
		startDate: string;
	};
};

export interface SchedulesDirectTokenResponse {
	code: number;
	message: string;
	serverID: string;
	datetime: string;
	token: string;
	tokenExpires: number;
	serverTime: number;
};

export interface SchedulesDirectJson {
	lineup: SchedulesDirectLineupsResponse;
	schedules: SchedulesDirectSchedulesResponse[];
	programs: SchedulesDirectProgramsResponse[];
};