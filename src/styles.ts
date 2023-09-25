import { SettingsValues, Subreddit } from '@devvit/public-api';
import { ColorString, StructuredStyles, UrlString, getSubredditStructuredStyles } from './fetch.js';

export const STYLESHEET_HEADER = '/* Auto-Generated CSS Start */';
export const STYLESHEET_FOOTER = '/* Auto-Generated CSS End */';
const STYLESHEET_MAX_LENGTH = 100000;

/**
 * The New Reddit subreddit styles, in the same layout they are on the website.
 * Mod Tools -> Settings -> Community Appearance -> Appearance
 * The website uses the word "fill" for the "cover" image positions.
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
			imagePosition: 'cover' | 'tiled' | 'centered' | null;
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
		backgroundImagePosition: 'cover' | 'tiled' | null;
		additionalBackgroundImage: UrlString | null;
		hoverImage: UrlString | null;
		hoverImagePosition: 'left' | 'centered' | 'right' | null;
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
			imagePosition: 'cover' | 'tiled';
		};
		linkPreviewPlaceholder: {
			image: UrlString | null;
			imagePosition: 'cover' | 'tiled';
		}
	};
};

/**
 * Creates a SubredditStyles object from the styles in the given data.
 */
async function validateStyles(structuredStyles: StructuredStyles): Promise<SubredditStyles> {
	const styles = structuredStyles?.data?.style ?? {};
	return {
		colorTheme: {
			themeColors: {
				base: styles.primaryColor ?? '#0079d3',
				highlight: styles.highlightColor ?? '#0079d3'
			},
			bodyBackground: {
				color: styles.backgroundColor ?? '#dae0e6',
				image: styles.backgroundImage ?? null,
				imagePosition: styles.backgroundImagePosition ?? 'cover'
			}
		},
		nameAndIcon: {
			nameFormat: styles.bannerCommunityNameFormat ?? 'slashtag',
			image: styles.communityIcon ?? null,
			hideIconInBanner: styles.bannerShowCommunityIcon === 'hide'
		},
		banner: {
			height: styles.bannerHeight ?? 'small',
			backgroundColor: styles.bannerBackgroundColor ?? '#33a8ff',
			backgroundImage: styles.bannerBackgroundImage ?? null,
			backgroundImagePosition: styles.bannerBackgroundImagePosition ?? 'cover',
			additionalBackgroundImage: styles.secondaryBannerPositionedImage ?? null,
			hoverImage: styles.bannerPositionedImage ?? null,
			hoverImagePosition: styles.bannerPositionedImagePosition ?? 'left',
			mobileBannerImage: styles.mobileBannerImage ?? null
		},
		menu: {
			linkColors: {
				activePage: styles.menuLinkColorActive ?? '#0079d3',
				inactivePage: styles.menuLinkColorInactive ?? '#0079d3',
				hover: styles.menuLinkColorHover ?? '#0079d3'
			},
			mainMenuBackground: {
				color: styles.menuBackgroundColor ?? '#dbf0ff',
				opacity: styles.menuBackgroundOpacity ?? '70'
			},
			submenuBackground: {
				style: styles.submenuBackgroundStyle ?? 'default',
				color: styles.submenuBackgroundColor ?? '#dbf0ff'
			}
		},
		posts: {
			titleColor: styles.postTitleColor ?? '#222222',
			voteIcons: {
				custom: styles.postVoteIcons === 'custom',
				upvoteInactive: styles.postUpvoteIconInactive ?? null,
				upvoteActive: styles.postUpvoteIconActive ?? null,
				upvoteCountColor: styles.postUpvoteCountColor ?? '#ff4500',
				downvoteInactive: styles.postDownvoteIconInactive ?? null,
				downvoteActive: styles.postDownvoteIconActive ?? null,
				downvoteCountColor: styles.postDownvoteCountColor ?? '#7193ff'
			},
			postBackground: {
				color: styles.postBackgroundColor ?? '#ffffff',
				image: styles.postBackgroundImage ?? null,
				imagePosition: styles.postBackgroundImagePosition ?? 'cover'
			},
			linkPreviewPlaceholder: {
				image: styles.postPlaceholderImage ?? null,
				imagePosition: styles.postPlaceholderImagePosition ?? 'cover'
			}
		}
	};
}

export async function generateStyles(appSettings: SettingsValues, subreddit: Subreddit): Promise<string> {
	const structuredStyles = await getSubredditStructuredStyles(subreddit.name);
	const styles = await validateStyles(structuredStyles);

	let generatedStyles = '';

	if (appSettings['add-comment-collapse-bar']) {
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

	generatedStyles += `
#header {
	background-color: ` + styles.banner.backgroundColor + `;
}`;

	generatedStyles += `
#header {
	height: ` + styles.banner.height + `; // todo string -> pixels
}`;

	if (styles.banner.backgroundImage) {
		generatedStyles += `
#header {
	background-image: url(` + styles.banner.backgroundImage + `);`;
		if (styles.banner.backgroundImagePosition == 'cover') {
			generatedStyles += `
	background-position: center;
	background-repeat: no-repeat;
	background-size: cover;
`;
		} else if (styles.banner.backgroundImagePosition == 'tiled') {
			generatedStyles += `
	background-position: center top;
	background-repeat: repeat;
	background-size: auto;
`;
		}
		generatedStyles += '}';
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
