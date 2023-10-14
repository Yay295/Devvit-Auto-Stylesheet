import { SettingsValues, Subreddit } from '@devvit/public-api';
import { ColorString, StructuredStyles, UrlString, getSubredditStructuredStyles, reuploadImage } from './fetch.js';

export const STYLESHEET_HEADER = '/* Auto-Generated CSS Start */';
export const STYLESHEET_FOOTER = '/* Auto-Generated CSS End */';

/**
 * The New Reddit subreddit styles, in the same layout they are on the website.
 * Mod Tools -> Settings -> Community Appearance -> Appearance
 * The website uses the word "fill" for the "cover" image positions.
 */
type SubredditStyles = {
	colorTheme: {
		themeColors: {
			/** Color for subreddit icon background and sidebar section title background. Also changes banner background (if it isn't set), but to a complimentary color. */
			base: ColorString;
			/** Color for icons, sidebar button backgrounds, links, and the comment expando line on hover. Actual displayed color is limited to keep it from being too bright. */
			highlight: ColorString;
		};
		bodyBackground: {
			/** Color for page body background. */
			color: ColorString;
			image: UrlString;
			imagePosition: 'cover' | 'tiled' | 'centered';
		};
	};
	nameAndIcon: {
		nameFormat: 'slashtag' | 'pretty' | 'hide';
		image: UrlString;
		hideIconInBanner: boolean; // 'show' | 'hide'
	};
	banner: {
		/** The pixel heights listed on the subreddit banner style page are wrong. The actual heights are: 80px, 144px, and 208px. */
		height: 'small' | 'medium' | 'large';
		backgroundColor: ColorString;
		backgroundImage: UrlString;
		backgroundImagePosition: 'cover' | 'tiled';
		additionalBackgroundImage: UrlString;
		hoverImage: UrlString;
		hoverImagePosition: 'left' | 'centered' | 'right';
		mobileBannerImage: UrlString;
	};
	/** There is no menu on Old Reddit, so we don't need to do anything with these styles. */
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
			upvoteInactive: UrlString;
			upvoteActive: UrlString;
			upvoteCountColor: ColorString;
			downvoteInactive: UrlString;
			downvoteActive: UrlString;
			downvoteCountColor: ColorString;
		};
		postBackground: {
			color: ColorString;
			image: UrlString;
			imagePosition: 'cover' | 'tiled';
		};
		linkPreviewPlaceholder: {
			image: UrlString;
			imagePosition: 'cover' | 'tiled';
		}
	};
};

/**
 * Creates a SubredditStyles object from the styles in the given data.
 */
async function validateStyles(structuredStyles: StructuredStyles): Promise<SubredditStyles> {
	function limitHighlightColor(highlightThemeColor: ColorString): string {
		// TODO This color is limited to keep it from being too bright, but I'm not sure how.
		// ex. #ffffff -> #e6e6e6, #fffff0 -> #ffffbd, #ffffbe -> #ffff8b
		return highlightThemeColor;
	}
	function calculateBannerBackgroundColor(primaryThemeColor: ColorString | null | undefined): string {
		if (!primaryThemeColor) {
			return '#33a8ff';
		}
		// TODO How does Reddit calculate this?
		// It's not the complimentary color; I tested the functions at https://stackoverflow.com/questions/1664140/js-function-to-calculate-complementary-colour and they don't match.
		return '#33a8ff';
	}

	const styles = structuredStyles?.data?.style ?? {};

	return {
		colorTheme: {
			themeColors: {
				base: styles.primaryColor ?? '#0079d3',
				highlight: styles.highlightColor ? limitHighlightColor(styles.highlightColor) : '#0079d3'
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
			backgroundColor: styles.bannerBackgroundColor ?? calculateBannerBackgroundColor(styles.primaryColor),
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
		// new reddit uses '--newCommunityTheme-line' for the line when not hovered
		const newCommunityThemeLine = '#edeff1';
		generatedStyles += `
.comment {
	position: relative;
}
.comment.noncollapsed {
	padding-left: 23px;
}
.comment .expand {
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
}
.comment .expand::after {
	content: "";
	position: absolute;
	top: 17px;
	left: 8.5px;
	bottom: 0;
	border: ` + newCommunityThemeLine + ` solid 1px;
}
.comment.collapsed .expand::after {
	display: none;
}
.comment .expand:hover::after {
	border-color: ` + styles.colorTheme.themeColors.highlight + `;
	text-decoration: none;
}
.comment .child {
	border: none;
}`;
	}

	generatedStyles += `
a {
	color: ` + styles.colorTheme.themeColors.highlight + `;
}
body {
	background-color: ` + styles.colorTheme.bodyBackground.color + `;
}`;

	const bodyBackground = styles.colorTheme.bodyBackground;
	const bodyBackgroundImage = await reuploadImage(subreddit.name, bodyBackground.image, 'auto-body-background');
	if (bodyBackgroundImage) {
		generatedStyles += `
body {
	background-image: url(` + bodyBackgroundImage + `);
	background-attachment: fixed;`;
		if (bodyBackground.imagePosition == 'cover') {
			generatedStyles += `
	background-position: center;
	background-repeat: no-repeat;
	background-size: cover;
`;
		} else if (bodyBackground.imagePosition == 'tiled') {
			generatedStyles += `
	background-position: center top;
	background-repeat: repeat;
	background-size: auto;
`;
		} else if (bodyBackground.imagePosition == 'centered') {
			generatedStyles += `
	background-position: center top;
	background-repeat: no-repeat;
	background-size: auto;
`;
		}
		generatedStyles += '}';
	}

	const bannerHeight = {
		'small': '80px',
		'medium': '144px',
		'large': '208px'
	}[styles.banner.height];
	generatedStyles += `
#header-bottom-left {
	align-items: end;
	background-color: ` + styles.banner.backgroundColor + `;
	display: flex;
	height: ` + bannerHeight + `;
}`;

	const bannerBackgroundImage = await reuploadImage(subreddit.name, styles.banner.backgroundImage, 'auto-banner');
	if (bannerBackgroundImage) {
		generatedStyles += `
#header-bottom-left {
	background-image: url(` + bannerBackgroundImage + `);`;
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

	// Hide the Reddit logo. It gets in the way of the subreddit logo and is just unnecessary.
	generatedStyles += `
#header-img {
	display: none;
}`;

	if (!styles.nameAndIcon.hideIconInBanner) {
		const communityIconImage = await reuploadImage(subreddit.name, styles.nameAndIcon.image, 'auto-subreddit-icon');
		if (communityIconImage) {
			generatedStyles += `
.pagename a::before {
	content: "",
	display: inline-block;
	width: 72px;
	height: 72px;
	background-image: url(` + communityIconImage + `);
	background-size: cover;
	border-color: #fff;
	border-radius: 40px;
	border-style: solid;
	border-width: 4px;
	vertical-align: bottom;
}`;
		}
	}

	generatedStyles += `
.listing-page .link {
	background-color: ` + styles.posts.postBackground.color + `;
}
.listing-page .link a.title {
	color: ` + styles.posts.titleColor + `;
}`;

	return generatedStyles.trim();
}

/**
 * Combines the header, generated styles, footer, and extra styles.
 * The generated styles will be minified if necessary, but the extra styles will only be trimmed.
 * This generator function returns successively more minified stylesheets. When it runs out of minification strategies it will throw an error.
 */
export function* createStylesheet(extraStylesBefore: string, generatedStyles: string, extraStylesAfter: string): Generator<string> {
	function merge(extraStylesBefore: string, generatedStyles: string, extraStylesAfter: string, spacer: string): string {
		return (extraStylesBefore ? extraStylesBefore + spacer : '')
			+ STYLESHEET_HEADER + spacer + generatedStyles + spacer + STYLESHEET_FOOTER
			+ (extraStylesAfter ? spacer + extraStylesAfter : '');
	}

	extraStylesBefore = extraStylesBefore.trim();
	extraStylesAfter = extraStylesAfter.trim();

	let spacer = '\n\n';

	// No minification.
	yield merge(extraStylesBefore, generatedStyles, extraStylesAfter, spacer);

	// Try using a smaller spacer.
	spacer = '\n';
	yield merge(extraStylesBefore, generatedStyles, extraStylesAfter, spacer);

	// Try removing indentation.
	generatedStyles = generatedStyles.replace(/^\s+/g, '');
	yield merge(extraStylesBefore, generatedStyles, extraStylesAfter, spacer);

	// TODO more minification strategies

	throw new Error('New stylesheet is too big.');
}
