import { Devvit, OnTriggerEvent, Subreddit, TriggerContext } from '@devvit/public-api';
import { AppInstall, AppUpgrade, ModAction } from '@devvit/protos';

Devvit.configure({
	redditAPI: true
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

const STYLESHEET_HEADER = '/* Auto-Generated CSS Start */';
const STYLESHEET_FOOTER = '/* Auto-Generated CSS End */';
const STYLESHEET_MAX_LENGTH = 100000;

async function generateStyles(context: TriggerContext, subreddit: Subreddit): Promise<string> {
	const contextSettings = await context.settings.getAll();
	const subredditSettings = subreddit.settings;

	let generatedStyles = '';

	if (contextSettings['add-comment-collapse-bar']) {
		// TODO use colors from new reddit styles
		// new reddit uses '--newCommunityTheme-line' and '--newCommunityTheme-button'
		const newCommunityThemeLine = '#EDEFF1';
		const newCommunityThemeButton = '#5687E3';
		generatedStyles += `
.comment .expand {
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	width: 18px;
	text-align: center;
}
.comment .expand::after {
	content: "";
	position: absolute;
	top: 17px;
	left: 9px;
	bottom: 0;
	border: ` + newCommunityThemeLine + ` solid 1px;
}
.comment.collapsed .expand::after {
	display: none;
}
.comment .expand:hover::after {
	border-color: ` + newCommunityThemeButton + `;
	text-decoration: none;
}
.comment .child {
	border: none;
}`;
	}

	if (subredditSettings.bannerBackgroundColor) {
		generatedStyles += `
#header {
	background-color: ` + subredditSettings.bannerBackgroundColor + `;
}`;
	}

	/*if (subredditSettings.bannerHeight) {
		generatedStyles += `
#header {
	height: ` + subredditSettings.bannerHeight + `;
}`;
	}

	if (subredditSettings.bannerBackgroundImage) {
		generatedStyles += `
#header {
	background-image: url(` + subredditSettings.bannerBackgroundImage + `);`;
		if (subredditSettings.bannerPosition == 'fill') {
			generatedStyles += `
	background-position: center;
	background-repeat: no-repeat;
	background-size: cover;
`;
		} else if (subredditSettings.bannerPosition == 'tile') {
			generatedStyles += `
	background-position: center top;
	background-repeat: repeat;
	background-size: auto;
`;
		}
		generatedStyles += '}';
	}*/

	if (subredditSettings.bannerImage) {
		generatedStyles += `
#header {
	: url(` + subredditSettings.bannerImage + `);
}`;
	}

	return generatedStyles.trim();
}

/**
 * Combines the header, generated styles, footer, and extra styles.
 * The generated styles will be minified if necessary, but the extra styles will only be trimmed.
 * If the CSS cannot be minified to fit under the limit, this function will return null.
 */
function createStylesheet(extraStylesBefore: string, generatedStyles: string, extraStylesAfter: string): string {
	function computeTotalLength(extraStylesBefore: string, generatedStyles: string, extraStylesAfter: string, spacer: string): number {
		return (extraStylesBefore ? extraStylesBefore.length + spacer.length : 0)
			+ STYLESHEET_HEADER.length + spacer.length + generatedStyles.length + spacer.length + STYLESHEET_FOOTER.length
			+ (extraStylesAfter ? spacer.length + extraStylesAfter.length : 0);
	}
	function merge(extraStylesBefore: string, generatedStyles: string, extraStylesAfter: string, spacer: string): string {
		return (extraStylesBefore ? extraStylesBefore + spacer : '') 
			+ STYLESHEET_HEADER + spacer + generatedStyles + spacer + STYLESHEET_FOOTER
			+ (extraStylesAfter ? spacer + extraStylesAfter : '');
	}

	extraStylesBefore = extraStylesBefore.trim();
	extraStylesAfter = extraStylesAfter.trim();

	let spacer = '\n\n';

	// No minification.
	if (computeTotalLength(extraStylesBefore, generatedStyles, extraStylesAfter, spacer) < STYLESHEET_MAX_LENGTH) {
		return merge(extraStylesBefore, generatedStyles, extraStylesAfter, spacer);
	}

	// Try using a smaller spacer.
	spacer = '\n';
	if (computeTotalLength(extraStylesBefore, generatedStyles, extraStylesAfter, spacer) < STYLESHEET_MAX_LENGTH) {
		return merge(extraStylesBefore, generatedStyles, extraStylesAfter, spacer);
	}

	// Try removing indentation.
	generatedStyles = generatedStyles.replace(/^\s+/g, '');
	if (computeTotalLength(extraStylesBefore, generatedStyles, extraStylesAfter, spacer) < STYLESHEET_MAX_LENGTH) {
		return merge(extraStylesBefore, generatedStyles, extraStylesAfter, spacer);
	}

	// TODO more minification strategies

	throw new Error('New stylesheet is too big.');
}

// https://developers.reddit.com/docs/event_triggers/
Devvit.addTrigger({
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
			const generatedStyles = await generateStyles(context, subreddit);

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

			const newStylesheet = createStylesheet(extraStylesBefore, generatedStyles, extraStylesAfter);
			// https://developers.reddit.com/docs/api/redditapi/classes/RedditAPIClient.RedditAPIClient#updatewikipage
			await reddit.updateWikiPage({
				content: newStylesheet,
				page: 'config/stylesheet',
				subredditName: subreddit.name
			});
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
