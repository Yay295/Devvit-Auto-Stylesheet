import { Devvit } from '@devvit/public-api';

import { generateStyles, STYLESHEET_HEADER, STYLESHEET_FOOTER, createStylesheet } from './styles.js';

Devvit.configure({
	redditAPI: true,
	redis: true,
	http: true
});

// Will need "edit config" permissions.
// Permissions are not yet configurable.
// https://developers.reddit.com/docs/app_accounts#permissions

// https://developers.reddit.com/docs/install_settings/
Devvit.addSettings([
	{
		type: 'boolean',
		name: 'add-comment-collapse-bar',
		defaultValue: true,
		label: 'Extend comment expando to the full height of the comment?'
	}
]);

// https://developers.reddit.com/docs/event_triggers/
Devvit.addTrigger({
	// TODO trigger on app settings change
	events: ['AppInstall','AppUpgrade','ModAction'],
	onEvent: async (event,context) => {
		// https://developers.reddit.com/docs/mod_actions/
		if (event.type === 'ModAction' && event.action !== 'community_styling') {
			return;
		}

		const { reddit } = context;
		const subreddit = await reddit.getSubredditById(context.subredditId);
		//const { subreddit } = event; // possibly undefined?

		try {
			if (!subreddit.settings.wikiEnabled) {
				throw 'The subreddit wiki must be enabled for this bot to change the stylesheet. Please enable the wiki at /r/' + subreddit.name + '/about/edit?page=wikis.';
			}

			const subredditStyles = await reddit.getSubredditStyles(context.subredditId);
			if (true) {
				const entries = Object.entries(subredditStyles).sort();
				console.log('Subreddit Styles:');
				for (const entry of entries) {
					console.log('  ' + entry[0] + ': ' + entry[1]);
				}
			}
			const generatedStyles = await generateStyles(subredditStyles, context);

			const currentStylesheet = (await reddit.getWikiPage(subreddit.name, 'config/stylesheet')).content;
			const [extraStylesBefore, extraStylesAfter] = (() => {
				const generatedStylesStart = currentStylesheet.indexOf(STYLESHEET_HEADER);
				const extraStylesBefore = generatedStylesStart > 0 ? currentStylesheet.substring(0, generatedStylesStart) : '';
				const generatedStylesEnd = currentStylesheet.lastIndexOf(STYLESHEET_FOOTER, generatedStylesStart);
				if (generatedStylesEnd > -1) {
					// possible header, definite footer
					return [extraStylesBefore, currentStylesheet.substring(currentStylesheet.lastIndexOf(STYLESHEET_FOOTER) + STYLESHEET_FOOTER.length)];
				} else if (generatedStylesStart > -1) {
					// definite header, no footer
					return [extraStylesBefore, ''];
				} else {
					// no header, no footer
					return ['', currentStylesheet];
				}
			})();

			for (const newStylesheet of createStylesheet(extraStylesBefore, generatedStyles, extraStylesAfter)) {
				try {
					// https://developers.reddit.com/docs/api/redditapi/classes/RedditAPIClient.RedditAPIClient#updatewikipage
					await reddit.updateWikiPage({
						content: newStylesheet,
						page: 'config/stylesheet',
						subredditName: subreddit.name
					});
					break;
				} catch (e) {
					// Only catch the "stylesheet is too big" error.
					// TODO What error is the "stylesheet is too big" error?
					if (e instanceof Error) {
						console.log('Error Name: ' + e.name);
						console.log('Error Message: ' + e.message);
						//continue;
						throw e;
					} else {
						throw e;
					}
				}
			}
		} catch (e) {
			console.error(e);
			let message;
			if (e instanceof Error) {
				message = e.stack?.replace(/^/gm, '    ') ?? e.message;
			} else {
				message = e ? String(e) : 'An unknown error occurred.';
			}
			try {
				await reddit.modMail.createModNotification({
					subject: 'Auto-Stylesheet Failed to Update',
					bodyMarkdown: message,
					subredditId: context.subredditId
				});
			} catch (modmailError) {
				console.error(`error sending mod notification\n${message}\n${modmailError}`);
			}
		}
	}
});

export default Devvit;
