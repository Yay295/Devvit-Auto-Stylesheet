import { Devvit, OnTriggerEvent, TriggerContext } from '@devvit/public-api';
import { AppInstall, AppUpgrade, ModAction } from '@devvit/protos';

import { generateStyles, STYLESHEET_HEADER, STYLESHEET_FOOTER, createStylesheet } from './styles.js';

Devvit.configure({
	redditAPI: true,
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
	onEvent: async (event: OnTriggerEvent<AppInstall | AppUpgrade | ModAction>, context: TriggerContext) => {
		// https://developers.reddit.com/docs/mod_actions/
		if (event.type === 'ModAction' && (event as ModAction).action !== 'community_styling') {
			return;
		}

		const { reddit } = context;
		const subreddit = await reddit.getSubredditById(context.subredditId);
		//const { subreddit } = event; // possibly undefined?

		try {
			if (!subreddit.settings.wikiEnabled) {
				throw 'The subreddit wiki must be enabled for this bot to change the stylesheet. Please enable the wiki at /r/' + subreddit.name + '/about/edit?page=wikis.';
			}

			const generatedStyles = await generateStyles(await context.settings.getAll(), subreddit);

			const currentStylesheet = (await reddit.getWikiPage(subreddit.name, 'config/stylesheet')).content;
			const [extraStylesBefore, extraStylesAfter] = (() => {
				const generatedStylesStart = currentStylesheet.indexOf(STYLESHEET_HEADER);
				const extraStylesBefore = generatedStylesStart > 0 ? currentStylesheet.substring(0, generatedStylesStart) : '';
				const generatedStylesEnd = currentStylesheet.indexOf(STYLESHEET_FOOTER, generatedStylesStart);
				if (generatedStylesEnd > -1) {
					// possible header, definite footer
					return [extraStylesBefore, currentStylesheet.substring(currentStylesheet.indexOf(STYLESHEET_FOOTER) + STYLESHEET_FOOTER.length)];
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
				} catch (e) {
					// Only catch the "stylesheet is too big" error.
					// TODO What error is the "stylesheet is too big" error?
					if (false) {
						continue;
					} else {
						throw e;
					}
				}
			}
		} catch (e) {
			let message;
			if (e instanceof Error) {
				message = e.stack ?? e.message;
			} else {
				message = e ? String(e) : 'An unknown error occurred.';
			}
			try {
				await reddit.modMail.createConversation({
					to: null, // creates internal moderator discussion
					subject: 'Auto-Stylesheet Failed to Update',
					body: message,
					subredditName: subreddit.name
				});
			} catch (modmailError) {
				console.error('Error sending mod mail for error:', modmailError, '\nPrevious Error:', e);
			}
		}
	}
});

export default Devvit;
