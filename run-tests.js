const fs = require("fs").promises;
const shortHash = require("short-hash");
const PerfLeaderboard = require("performance-leaderboard");

const NUMBER_OF_RUNS = 3;
const FREQUENCY = 60; // in minutes

const prettyTime = (seconds) => {
	// Based on https://johnresig.com/blog/javascript-pretty-date/
	const days = Math.floor(seconds / (60*60*24));

	return (
		(days === 0 &&
			((seconds < 60 && "just now") ||
				(seconds < 60 * 2 && "1 minute ago") ||
				(seconds < 3600 && Math.floor(seconds / 60) + " minutes ago") ||
				(seconds < 7200 && "1 hour ago") ||
				(seconds < 86400 * 2 && Math.floor(seconds / 3600) + " hours ago"))) ||
		(days < 7 && days + " days ago") ||
		(Math.ceil(days / 7) + " weeks ago")
	);
}

(async function() {
	let today = Date.now();
	let dataDir = `./_data/`;
	// Careful here, this filename needs to be .gitignore’d and
	// listed in the keep-data-cache plugin.
	let lastRunsFilename = `${dataDir}results-last-runs.json`;
	let lastRuns;
	try {
		lastRuns = require(lastRunsFilename);
	} catch (e) {
		console.log(`There are no known last run timestamps`);
		lastRuns = {};
	}

	let groups = require("./_data/sites.js");
	for(let key in groups) {
		let group = groups[key];
		let runFrequency =
			group.options && group.options.frequency
				? group.options.frequency
				: FREQUENCY;
		if (!lastRuns[key]) {
			console.log(`First tests for ${key}.`);
		} else {
			const lastRun = lastRuns[key];
			const lastRunSecondsAgo = (today - lastRun.timestamp) / 1000;
			const lastRunSecondsAgoPretty = prettyTime(lastRunSecondsAgo);
			const lastRunMinutesAgo = lastRunSecondsAgo / 60;
			if (lastRunMinutesAgo < runFrequency) {
				console.log(
					`Previous test for ${key} ran ${lastRunSecondsAgoPretty}, less than ${runFrequency} minutes, skipping.`
				);
				continue;
			} else {
				console.log(`Previous test for ${key} ran ${lastRunSecondsAgoPretty}, more than ${runFrequency} minutes, running.`);

			}
		}

		let runCount =
			group.options && group.options.runs ? group.options.runs : NUMBER_OF_RUNS;
		let results = await PerfLeaderboard(
			group.urls,
			runCount,
			group.options || {}
		);

		let promises = [];
		for(let result of results) {
			let id = shortHash(result.url);
			let dir = `${dataDir}results/${id}/`;
			let filename = `${dir}date-${today}.json`;
			await fs.mkdir(dir, { recursive: true });
			promises.push(fs.writeFile(filename, JSON.stringify(result, null, 2)));
			console.log( `Writing ${filename}.` );
		}

		await Promise.all(promises);
		lastRuns[key] = { timestamp: today };
		console.log( `Finished testing "${key}".` );
	}

	// Write the last run time to avoid re-runs
	await fs.writeFile(lastRunsFilename, JSON.stringify(lastRuns, null, 2));
})();
