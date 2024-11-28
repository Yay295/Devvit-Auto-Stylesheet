import { JSDOM } from 'jsdom';
import { CSSStyleSheet, CSSStyleRule } from 'cssom';

/**
	Reddit currently has 6 style rule blocks:
	default and explicit light,
	default and explicit light stickied,
	browser style dark and not explicit light,
	browser style dark and not explicit light stickied,
	explicit dark,
	explicit dark stickied.
	The last two pairs use the same colors.
*/
type Styles = 'light' | 'light stickied' | 'dark' | 'dark stickied';

type CSSPropertyName = `--${string}`;

export async function scrapeNewNewRedditCSS(subredditName: string): Promise<{ [style in Styles]: CSSPropertyName[] }> {
	const html = await fetch('https://sh.reddit.com/r/' + subredditName).then(r => r.text());
	const dom = new JSDOM(html);
	const styleElement = dom.window.document.getElementById('community-styles-style-element') as HTMLStyleElement;
	// The JSDOM/CSSOM CSSStyleSheet is not quite the same as the spec CSSStyleSheet.
	const stylesheet = styleElement.sheet as unknown as CSSStyleSheet;
	const rules = Array.from(
		stylesheet.cssRules
	).filter(
		(rule): rule is CSSStyleRule => rule.type === CSSRule.STYLE_RULE
	).map(rule => {
		// Parse Selector
		let style: Styles;
		if (rule.selectorText.startsWith(':root .sidebar-grid,')) {
			style = 'light';
		} else if (rule.selectorText.startsWith(':root .sidebar-grid .theme-beta.stickied,')) {
			style = 'light stickied';
		} else if (rule.selectorText.startsWith(':root.theme-dark .sidebar-grid,')) {
			style = 'dark';
		} else if (rule.selectorText.startsWith(':root.theme-dark .sidebar-grid .theme-beta.stickied,')) {
			style = 'dark stickied';
		} else {
			return null;
		}
		// Collect Properties
		const styleDeclaration = rule.style;
		const properties: { [property: CSSPropertyName]: string } = {};
		for (let property of Array.from(styleDeclaration)) {
			if (property.startsWith('--')) {
				properties[property as CSSPropertyName] = styleDeclaration.getPropertyValue(property);
			}
		}
		return [style,properties];
	}).filter(
		style => style !== null
	);
	return Object.fromEntries(rules);
}


import { Devvit, RedisClient } from '@devvit/public-api';
import { getMetadata } from '@devvit/runtimes/plugins/helpers.js';
import * as protos from "@devvit/protos";

type RedditAPIPlugins = {
	Flair: protos.Flair;
	GraphQL: protos.GraphQL;
	LinksAndComments: protos.LinksAndComments;
	Listings: protos.Listings;
	Moderation: protos.Moderation;
	ModNote: protos.ModNote;
	NewModmail: protos.NewModmail;
	PrivateMessages: protos.PrivateMessages;
	Subreddits: protos.Subreddits;
	Users: protos.Users;
	Widgets: protos.Widgets;
	Wiki: protos.Wiki;
};
let redditAPIPlugins: RedditAPIPlugins | null = null;
function getRedditAPIPlugins() {
	if (!redditAPIPlugins) {
		redditAPIPlugins = (Devvit as any).redditAPIPlugins as RedditAPIPlugins;
	}
	return redditAPIPlugins;
}

type ImageName = 'auto-body-background'
	| 'auto-subreddit-icon'
	| 'auto-banner'
	| 'auto-banner-extra'
	| 'auto-banner-extra-hover'
	| 'auto-upvote-active'
	| 'auto-upvote-inactive'
	| 'auto-downvote-active'
	| 'auto-downvote-inactive'
	| 'auto-post-background'
	| 'auto-link-preview-placeholder';

type StylesheetImage = `%%${ImageName}%%`;

/**
 * Reuploads image from New Reddit to Old Reddit to be used in the stylesheet.
 * If an image with the given name already exists it will be replaced.
 * An image that is replaced will not be updated on the subreddit until the next time the stylesheet is saved.
 * Returns the given image name with '%%' added around it, or null if an error occurs.
 */
export async function reuploadImage(subredditName: string, url: string | null, imageName: ImageName, redis: RedisClient): Promise<StylesheetImage | null> {
	if (url == null) {
		return null;
	}

	// Remove any query parameters.
	url = url.split('?')[0];

	// Check if we've previously reuploaded this image with this image name.
	if (url === await redis.get(imageName)) {
		return `%%${imageName}%%`;
	}

	// Get image type.
	const imageType = url.slice(-3);
	if (imageType != 'png' && imageType != 'jpg') {
		return null;
	}

	// Get image from URL.
	// TODO Error: HTTP request to domain: styles.redditmedia.com is not allowed
	// TODO Error: HTTP request to domain: i.redd.it is not allowed
	// TODO Error: HTTP request to domain: reddit-subreddit-uploaded-media.s3-accelerate.amazonaws.com is not allowed
	if (
		/*url.includes('styles.redditmedia.com')
		|| url.includes('i.redd.it')
		||*/ url.includes('reddit-subreddit-uploaded-media.s3-accelerate.amazonaws.com')
	) {
		return null;
	}
	const imageData = await fetch(url).then(response => {
		return response.ok ? response.arrayBuffer() : null;
	});
	if (!imageData) {
		return null;
	}

	console.log('Got ' + url);

	const uploadSRImageResponse = await getRedditAPIPlugins().Subreddits.UploadSrImg(
		{
			/** file upload with maximum size of 500 KiB */
			file: Buffer.from(imageData).toString('binary'), // TODO What is this supposed to be?
			/** an integer between 0 and 1 */
			header: 0,
			/** one of png or jpg (default: png) */
			imgType: imageType,
			/** a valid subreddit image name */
			name: imageName,
			/* one of (img, header, icon, banner) */
			uploadType: 'img',
			/** the name of the subreddit */
			subreddit: subredditName
		},
		getMetadata()
	);
	console.log(uploadSRImageResponse);

	if (uploadSRImageResponse.errors) {
		return null;
	}

	await redis.set(imageName, url);
	return `%%${imageName}%%`;
}
