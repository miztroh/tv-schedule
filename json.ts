import { type SchedulesDirectLineupsResponse, type SchedulesDirectSchedulesResponse, type SchedulesDirectProgramsResponse, type SchedulesDirectJson } from './schedulesDirectJson.ts';

export const schedulesDirectJson = async (token: string): Promise<SchedulesDirectJson> => {
	const days = Deno.env.get('SD_FETCH_DAYS');
	if (!days || !Number.isInteger(+days) || +days < 1 || +days > 14) throw new Error('Days must be an integer between 1 and 14');

	const lineup = Deno.env.get('SD_LINEUP');
	if (!lineup || !lineup.match(/^[A-Z0-9-]+$/)) throw new Error('Lineup format is invalid');

	const dates: string[] = [];

	for (let i = 0; i < +days; i += 1) {
		const d = new Date();
		d.setDate(d.getDate() + i);
		const dateString = d.toISOString().split('T')[0];
		dates.push(dateString);
	}

	const lineupsRequest = await fetch(
		`https://json.schedulesdirect.org/20141201/lineups/${lineup}?token=${token}`,
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);

	if (!lineupsRequest.ok) throw new Error(`Lineups request failed with status ${lineupsRequest.status}`);

	const lineupsResponse: SchedulesDirectLineupsResponse = await lineupsRequest.json();

	const schedulesRequest = await fetch(
		`https://json.schedulesdirect.org/20141201/schedules?token=${token}`,
		{
			method: 'POST',
			body: JSON.stringify(
				lineupsResponse.stations.map(
					(station) => {
						return {
							stationID: station.stationID,
							date: dates
						}
					}
				)
			),
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);

	if (!schedulesRequest.ok) throw new Error(`Schedules request failed with status ${schedulesRequest.status}`);

	const schedulesResponse: SchedulesDirectSchedulesResponse[] = await schedulesRequest.json();

	const programIDs = Array.from(new Set(schedulesResponse.flatMap((schedule) => schedule.programs).map((program) => program.programID))).sort();

	const programsBatchSize = 5000;
	const programsResponses: SchedulesDirectProgramsResponse[] = [];

	for (let i = 0; i < programIDs.length; i += programsBatchSize) {
		const batchProgramIDs = programIDs.slice(i, i + programsBatchSize);

		const programsRequest = await fetch(
			`https://json.schedulesdirect.org/20141201/programs?token=${token}`,
			{
				method: 'POST',
				body: JSON.stringify(
					batchProgramIDs
				),
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);

		if (!programsRequest.ok) throw new Error(`Programs request failed with status ${programsRequest.status}`);

		const programsResponse: SchedulesDirectProgramsResponse[] = await programsRequest.json();
		programsResponses.push(...programsResponse);
	}

	return {
		lineup: lineupsResponse,
		schedules: schedulesResponse,
		programs: programsResponses
	};
};