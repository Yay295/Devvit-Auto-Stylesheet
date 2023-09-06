import { Devvit, OnTriggerEvent, Subreddit } from '@devvit/public-api';
import { ModAction } from '@devvit/protos';

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

async function generateStyles(context: Devvit.Context, subreddit: Subreddit): Promise<string> {
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
function createStylesheet(generatedStyles: string, extraStyles: string): string | null {
	function computeTotalLength(generatedStyles: string, extraStyles: string, spacer: string): number {
		return STYLESHEET_HEADER.length + spacer.length + generatedStyles.length + spacer.length + STYLESHEET_FOOTER.length + (extraStyles ? spacer.length + extraStyles.length : 0);
	}
	function merge(generatedStyles: string, extraStyles: string, spacer: string): string {
		return STYLESHEET_HEADER + spacer + generatedStyles + spacer + STYLESHEET_FOOTER + (extraStyles ? spacer + extraStyles : '');
	}

	extraStyles = extraStyles.trim();

	let spacer = '\n\n';

	// No minification.
	if (computeTotalLength(generatedStyles, extraStyles, spacer) < STYLESHEET_MAX_LENGTH) {
		return merge(generatedStyles, extraStyles, spacer);
	}

	// Try using a smaller spacer.
	spacer = '\n';
	if (computeTotalLength(generatedStyles, extraStyles, spacer) < STYLESHEET_MAX_LENGTH) {
		return merge(generatedStyles, extraStyles, spacer);
	}

	// Try removing indentation.
	generatedStyles = generatedStyles.replace(/^\s+/g, '');
	if (computeTotalLength(generatedStyles, extraStyles, spacer) < STYLESHEET_MAX_LENGTH) {
		return merge(generatedStyles, extraStyles, spacer);
	}

	// TODO more minification strategies

	return null;
}

// https://developers.reddit.com/docs/event_triggers/
Devvit.addTrigger({
	event: 'ModAction',
	onEvent: async (event: OnTriggerEvent<ModAction>, context: Devvit.Context) => {
		// https://developers.reddit.com/docs/mod_actions/
		if (event.action !== 'community_styling') {
			return;
		}

		const { reddit } = context;
		const subreddit = await reddit.getSubredditById(context.subredditId);
		//const subreddit = event.subreddit; // possibly undefined?

		const generatedStyles = await generateStyles(context, subreddit);

		const currentStylesheet = (await reddit.getWikiPage(subreddit.name, 'config/stylesheet')).content;
		const extraStyles = (() => {
			const extraStylesStart = currentStylesheet.indexOf(STYLESHEET_FOOTER);
			if (extraStylesStart > -1) {
				return currentStylesheet.substring(currentStylesheet.indexOf(STYLESHEET_FOOTER) + STYLESHEET_FOOTER.length);
			}
			return currentStylesheet;
		})();

		const newStylesheet = createStylesheet(generatedStyles, extraStyles);
		if (newStylesheet === null) {
			// send mod mail?
			// throw exception?
		} else {
			// https://developers.reddit.com/docs/api/redditapi/classes/RedditAPIClient.RedditAPIClient#updatewikipage
			await reddit.updateWikiPage({
				content: newStylesheet,
				page: 'config/stylesheet',
				subredditName: subreddit.name
			});
		}
	}
});

export default Devvit;
