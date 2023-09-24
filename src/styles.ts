import { Subreddit, TriggerContext } from '@devvit/public-api';
import { ColorString, UrlString, getSubredditStructuredStyles } from './fetch.js';

export const STYLESHEET_HEADER = '/* Auto-Generated CSS Start */';
export const STYLESHEET_FOOTER = '/* Auto-Generated CSS End */';
const STYLESHEET_MAX_LENGTH = 100000;

/**
 * The New Reddit subreddit styles, in the same layout they are on the website.
 * Mod Tools -> Settings -> Community Appearance -> Appearance
 */
type SubredditStyles = {
	colorTheme: {
		themeColors: {
			base: ColorString;
			highlight: ColorString;
		};
		bodyBackground: {
			color: ColorString;
			image: UrlString | null;
		};
	};
	nameAndIcon: {
		nameFormat: 'slashtag' | 'pretty' | 'hide';
		image: UrlString | null;
		hideIconInBanner: boolean; // 'show' | 'hide'
	};
	banner: {
		height: 'small' | 'medium' | 'large';
		backgroundColor: ColorString;
		backgroundImage: UrlString | null;
		additionalBackgroundImage: UrlString | null;
		mobileBannerImage: UrlString | null;
	};
	menu: {
		linkColors: {
			activePage: ColorString;
			inactivePage: ColorString;
			hover: ColorString;
		};
		mainMenuBackground: {
			color: ColorString;
			opacity: string;
		};
		submenuBackground: {
			style: 'default' | 'custom';
			color: ColorString;
		};
	};
	posts: {
		titleColor: ColorString;
		voteIcons: {
			custom: boolean; // 'default' | 'custom'
			upvoteInactive: UrlString | null;
			upvoteActive: UrlString | null;
			upvoteCountColor: ColorString;
			downvoteInactive: UrlString | null;
			downvoteActive: UrlString | null;
			downvoteCountColor: ColorString;
		};
		postBackground: {
			color: ColorString;
			image: UrlString | null;
		};
		linkPreviewPlaceholderImage: UrlString | null;
	};
};

/**
 * Creates a SubredditStyles object from the styles in the given data.
 */
async function validateStyles(subreddit: Subreddit): Promise<SubredditStyles> {
	const structuredStyles = (await getSubredditStructuredStyles(subreddit.name))?.data?.style ?? {};
	return {
		colorTheme: {
			themeColors: {
				base: structuredStyles.primaryColor ?? '#0079d3',
				highlight: structuredStyles.highlightColor ?? '#0079d3'
			},
			bodyBackground: {
				color: structuredStyles.backgroundColor ?? '#dae0e6',
				image: structuredStyles.backgroundImage ?? null
			}
		},
		nameAndIcon: {
			nameFormat: structuredStyles.bannerCommunityNameFormat ?? 'slashtag',
			image: structuredStyles.communityIcon ?? null,
			hideIconInBanner: structuredStyles.bannerShowCommunityIcon === 'hide'
		},
		banner: {
			height: structuredStyles.bannerHeight ?? 'small',
			backgroundColor: structuredStyles.bannerBackgroundColor ?? '#33a8ff',
			backgroundImage: structuredStyles.bannerBackgroundImage ?? null,
			additionalBackgroundImage: structuredStyles.secondaryBannerPositionedImage ?? null,
			mobileBannerImage: structuredStyles.mobileBannerImage ?? null
		},
		menu: {
			linkColors: {
				activePage: structuredStyles.menuLinkColorActive ?? '#0079d3',
				inactivePage: structuredStyles.menuLinkColorInactive ?? '#0079d3',
				hover: structuredStyles.menuLinkColorHover ?? '#0079d3'
			},
			mainMenuBackground: {
				color: structuredStyles.menuBackgroundColor ?? '#dbf0ff',
				opacity: structuredStyles.menuBackgroundOpacity ?? '70'
			},
			submenuBackground: {
				style: structuredStyles.submenuBackgroundStyle ?? 'default',
				color: structuredStyles.submenuBackgroundColor ?? '#dbf0ff'
			}
		},
		posts: {
			titleColor: structuredStyles.postTitleColor ?? '#222222',
			voteIcons: {
				custom: structuredStyles.postVoteIcons === 'custom',
				upvoteInactive: structuredStyles.postUpvoteIconInactive ?? null,
				upvoteActive: structuredStyles.postUpvoteIconActive ?? null,
				upvoteCountColor: structuredStyles.postUpvoteCountColor ?? '#ff4500',
				downvoteInactive: structuredStyles.postDownvoteIconInactive ?? null,
				downvoteActive: structuredStyles.postDownvoteIconActive ?? null,
				downvoteCountColor: structuredStyles.postDownvoteCountColor ?? '#7193ff'
			},
			postBackground: {
				color: structuredStyles.postBackgroundColor ?? '#ffffff',
				image: structuredStyles.postBackgroundImage ?? null
			},
			linkPreviewPlaceholderImage: structuredStyles.postPlaceholderImage ?? null
		}
	};
}

export async function generateStyles(context: TriggerContext, subreddit: Subreddit): Promise<string> {
	const contextSettings = await context.settings.getAll();
	const subredditSettings = subreddit.settings;
	const structuredStyles = (await getSubredditStructuredStyles(subreddit.name))?.data?.style ?? {};

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

	if (structuredStyles?.bannerHeight) {
		generatedStyles += `
#header {
	height: ` + structuredStyles.bannerHeight + `;
}`;
	}

	if (subredditSettings.bannerBackgroundImage) {
		generatedStyles += `
#header {
	background-image: url(` + subredditSettings.bannerBackgroundImage + `);`;
		if (structuredStyles.bannerBackgroundImagePosition == 'fill') {
			generatedStyles += `
	background-position: center;
	background-repeat: no-repeat;
	background-size: cover;
`;
		} else if (structuredStyles.bannerBackgroundImagePosition == 'tile') {
			generatedStyles += `
	background-position: center top;
	background-repeat: repeat;
	background-size: auto;
`;
		}
		generatedStyles += '}';
	}

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
export function createStylesheet(extraStylesBefore: string, generatedStyles: string, extraStylesAfter: string): string {
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
