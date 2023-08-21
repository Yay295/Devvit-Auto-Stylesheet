import { Devvit, OnTriggerEvent } from '@devvit/public-api';
import { ModAction } from '@devvit/protos';

Devvit.configure({
	redditAPI: true
});

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

async function generateStyles(context: Devvit.Context): Promise<string> {
	let generatedStyles = '';

	if (await context.settings.get('add-comment-collapse-bar')) {
		// TODO use colors from new reddit styles
		// new reddit uses '--newCommunityTheme-line' and '--newCommunityTheme-button'
		generatedStyles += `

.comment .expand {
	color: #888;
	transition: 0.2s;
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
}
.comment .expand:hover {
	background-color: #F5F5F5;
	color: #666;
	text-decoration: none;
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

	// Try removing extra line breaks.
	generatedStyles = generatedStyles.replace(/\n\n/g, '\n');
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
		if (event.action !== 'COMMUNITY_STYLING') {
			return;
		}

		const { reddit } = context;
		const subreddit = await reddit.getSubredditById(context.subredditId);
		//const subreddit = event.subreddit; // possibly undefined?

		const generatedStyles = await generateStyles(context);

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
