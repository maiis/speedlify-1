module.exports = {
	name: "nho.io",
	description: "My own short URL manager",
	skip: false,
	options: {
		frequency: 60 * 24 * 7, // runs once a week
		freshChrome: "site"
	},
	urls: ["https://nho.io/"]
};