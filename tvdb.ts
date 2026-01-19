export interface TvDbSearchResponse {
	status: string;
	data: {
		objectID: string;
		aliases: string[];
		country: string;
		id: string;
		image_url: string;
		name: string;
		first_air_time: string;
		overview: string;
		primary_language: string;
		primary_type: string;
		status: string;
		type: string;
		tvdb_id: string;
		year: string;
		slug: string;
		overviews: { [key: string]: string; };
		translations: { [key: string]: string; };
		network: string;
		remote_ids: {
			id: string;
			type: number;
			sourceName: string;
		}[];
		thumbnail: string;
	}[];
	links: {
		prev: null | string;
		self: string;
		next: null | string;
		total_items: number;
		page_size: number;
	};
};

export interface TvDbTokenResponse {
	status: string;
	data: {
		token: string;
	};
};

export const tvDbToken = async (): Promise<TvDbTokenResponse> => {
	const apiKey = Deno.env.get('TVDB_APIKEY');
	if (!apiKey) throw new Error('TVDB_APIKEY is not set');

	const tokenRequest = await fetch(
		'https://api4.thetvdb.com/v4/login',
		{
			method: 'POST',
			body: JSON.stringify({ apikey: apiKey }),
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);

	if (!tokenRequest.ok) throw new Error(`TVDB token request failed with status ${tokenRequest.status}`);
	return await tokenRequest.json();
};