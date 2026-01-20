import { schedulesDirectXml } from './xml.ts';
import { schedulesDirectJson } from './json.ts';
import { schedulesDirectToken } from './schedulesDirectJson.ts';
import { tvDbToken } from './tvdb.ts';

let updateHour: number = +(Deno.env.get('SD_UPDATE_HOUR') ?? '0');
if (isNaN(updateHour) || updateHour < 0 || updateHour > 23) updateHour = 0;

export interface Tokens {
	schedulesDirect: string;
	tvDb: string;
	date: string;
};

const tokens: Tokens = { schedulesDirect: '', tvDb: '', date: '' };

const loadTokens = async (): Promise<void> => {
	Object.assign(tokens, JSON.parse(await Deno.readTextFile('./data/tokens.json')));
	if (new Date(tokens.date) < new Date(Date.now() - 24 * 60 * 60 * 1000)) await updateTokens();
};

const updateTokens = async (): Promise<void> => {
	const newTokens: Tokens = {
		schedulesDirect: (await schedulesDirectToken()).token,
		tvDb: (await tvDbToken()).data.token,
		date: new Date().toISOString()
	};

	await Deno.writeTextFile('./data/tokens.json', JSON.stringify(newTokens));
	await loadTokens();
};

try {
	await loadTokens();
} catch (_err) {
	await updateTokens();
}

const scheduleFetch = async () => {
	try {
		console.log('Updating schedule.json');
		const json = await schedulesDirectJson(tokens.schedulesDirect);
		await Deno.writeTextFile('./data/schedule.json', JSON.stringify(json));
		console.log('Updating schedule.xml');
		const xml = await schedulesDirectXml(tokens.tvDb, json);
		await Deno.writeTextFile('./data/schedule.xml', xml);
	} catch (error) {
		console.error('Error fetching schedule:', error);
	}
};

try {
	await Deno.stat('./data/schedule.json');
} catch (_err) {
	console.log('Creating schedule.json');
	await Deno.writeTextFile('./data/schedule.json', JSON.stringify(await schedulesDirectJson(tokens.schedulesDirect)));
}

try {
	await Deno.stat('./data/schedule.xml');
} catch (_err) {
	console.log('Creating schedule.xml');
	await Deno.writeTextFile('./data/schedule.xml', await schedulesDirectXml(tokens.tvDb, JSON.parse(await Deno.readTextFile('./data/schedule.json'))));
}

Deno.cron(
	'schedule-fetch',
	`0 ${updateHour} * * *`,
	async () => {
		await updateTokens();
		await scheduleFetch();
	}
);

Deno.serve(
	async (req) => {
		const url = new URL(req.url);

		if (url.pathname === '/schedule.xml') {
			const scheduleXml = await Deno.readTextFile('./data/schedule.xml');

			return new Response(
				scheduleXml,
				{
					status: 200,
					headers: {
						'Content-Type': 'application/xml',
					},
				}
			);
		}

		if (url.pathname === '/') {
			return new Response('OK', { status: 200 });
		}

		return new Response('Not Found', { status: 404 });
	}
);