import { Devvit } from '@devvit/public-api';


import { Flair } from '@devvit/runtimes/plugins/redditapi/Flair.js';
import { GraphQL } from '@devvit/runtimes/plugins/redditapi/GraphQL.js';
import { LinksAndComments } from '@devvit/runtimes/plugins/redditapi/LinksAndComments.js';
import { Listings } from '@devvit/runtimes/plugins/redditapi/Listings.js';
import { Moderation } from '@devvit/runtimes/plugins/redditapi/Moderation.js';
import { ModNote } from '@devvit/runtimes/plugins/redditapi/ModNote.js';
import { NewModmail } from '@devvit/runtimes/plugins/redditapi/NewModmail.js';
import { PrivateMessages } from '@devvit/runtimes/plugins/redditapi/PrivateMessages.js';
import { Subreddits } from '@devvit/runtimes/plugins/redditapi/Subreddits.js';
import { PostCollections } from '@devvit/runtimes/plugins/redditapi/PostCollections.js';
import { Users } from '@devvit/runtimes/plugins/redditapi/Users.js';
import { Widgets } from '@devvit/runtimes/plugins/redditapi/Widgets.js';
import { Wiki } from '@devvit/runtimes/plugins/redditapi/Wiki.js';

type RedditAPIPlugins = {
	Flair: Flair;
	GraphQL: GraphQL;
	LinksAndComments: LinksAndComments;
	Listings: Listings;
	Moderation: Moderation;
	ModNote: ModNote;
	NewModmail: NewModmail;
	PrivateMessages: PrivateMessages;
	Subreddits: Subreddits;
	PostCollections: PostCollections;
	Users: Users;
	Widgets: Widgets;
	Wiki: Wiki;
};
let redditAPIPlugins: RedditAPIPlugins | null = null;
function getRedditAPIPlugins() {
	if (!redditAPIPlugins) {
		redditAPIPlugins = (Devvit as any).redditAPIPlugins as RedditAPIPlugins;
	}
	return redditAPIPlugins;
}


export type ColorString = string;
export type UrlString = string | null;

export type StructuredStyles = {
	data?: {
		content?: {
			widgets?: {
				items?: any;
				layout?: any;
			};
		};
		style?: {
			menuBackgroundBlur?: any | null;
			bannerShowCommunityIcon?: 'show' | 'hide' | null;
			postDownvoteIconInactive?: UrlString | null;
			bannerCommunityNameFormat?: 'slashtag' | 'hide' | 'pretty' | null;
			postUpvoteIconInactive?: UrlString | null;
			highlightColor?: ColorString | null;
			menuBackgroundOpacity?: string | null;
			postUpvoteCountColor?: ColorString | null;
			bannerHeight?: 'small' | 'medium' | 'large' | null;
			postBackgroundColor?: ColorString | null;
			mobileBannerImage?: UrlString | null;
			bannerOverlayColor?: ColorString | null;
			bannerCommunityName?: any | null;
			postDownvoteIconActive?: UrlString | null;
			postUpvoteIconActive?: UrlString | null;
			menuBackgroundColor?: ColorString | null;
			postBackgroundImagePosition?: 'cover' | 'tiled' | null; // cover = fill
			backgroundImage?: UrlString | null;
			backgroundImagePosition?: 'cover' | 'tiled' | 'centered' | null; // cover = fill
			backgroundColor?: ColorString | null;
			submenuBackgroundStyle?: 'default' | 'custom' | null;
			bannerBackgroundImagePosition?: 'cover' | 'tiled' | null; // cover = fill
			menuLinkColorInactive?: ColorString | null;
			bannerBackgroundColor?: ColorString | null;
			submenuBackgroundColor?: ColorString | null;
			sidebarWidgetHeaderColor?: ColorString | null;
			bannerPositionedImagePosition?: 'left' | 'centered' | 'right' | null;
			bannerBackgroundImage?: UrlString | null;
			postDownvoteCountColor?: ColorString | null;
			postPlaceholderImagePosition?: 'cover' | 'tiled' | null; // cover = fill
			menuLinkColorHover?: ColorString | null;
			primaryColor?: ColorString | null;
			sidebarWidgetBackgroundColor?: ColorString | null;
			mobileKeyColor?: ColorString | null;
			menuPosition?: any | null;
			postVoteIcons?: 'default' | 'custom' | null;
			menuLinkColorActive?: ColorString | null;
			bannerPositionedImage?: UrlString | null;
			secondaryBannerPositionedImage?: UrlString | null;
			menuBackgroundImage?: UrlString | null;
			postBackgroundImage?: UrlString | null;
			postPlaceholderImage?: UrlString | null;
			communityIcon?: UrlString | null;
			postTitleColor?: ColorString | null;
		};
		flairTemplate?: any;
	};
};

export async function getSubredditStructuredStyles(subreddit: string): Promise<StructuredStyles> {
	return fetch('https://www.reddit.com/api/v1/structured_styles/' + subreddit + '.json').then(response => response.json());
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
const asdjasgjhdgas = true;
export async function reuploadImage(subreddit: string, url: UrlString, imageName: ImageName): Promise<StylesheetImage | null> {
	if (url == null) {
		return null;
	}

	// Remove any query parameters.
	url = url.split('?')[0];

	// Get image type.
	const imageType = url.slice(-3);
	if (imageType != 'png' && imageType != 'jpg') {
		return null;
	}

	// Get image from URL.
	// TODO Error: HTTP request to domain: styles.redditmedia.com is not allowed
	if (asdjasgjhdgas) return null;
	const imageData = await fetch(url).then(response => {
		return response.ok ? response.blob() : null;
	});
	if (!imageData) {
		return null;
	}

	// Upload image to Old Reddit.
	// https://www.reddit.com/dev/api/#POST_api_upload_sr_img
	const formData = new FormData();
	formData.append('file', imageData);
	formData.append('header', '0');
	formData.append('img_type', imageType);
	formData.append('name', imageName);
	//formData.append('uh', modhash); // required?
	formData.append('upload_type', 'img');
	// TODO: Response?
	let response = await fetch(
		'https://www.reddit.com/r/' + subreddit + '/api/upload_sr_img',
		{
			method: 'POST',
			body: formData
		}
	);
	console.log(response);
	const uploadSRImageResponse = await getRedditAPIPlugins().Subreddits.UploadSrImg({
		/** file upload with maximum size of 500 KiB */
		// https://stackoverflow.com/questions/18650168/convert-blob-to-base64
		// https://developer.mozilla.org/en-US/docs/Web/API/FileReader
		file: await imageData.text(),
		/** (optional) can be ignored */
		header: 0,
		/** an integer between 0 and 1 */
		imgType: '0',
		/** a valid subreddit image name */
		name: imageName,
		/** one of png or jpg (default: png) */
		uploadType: imageType,
		/** the name of the subreddit */
		subreddit: subreddit
	}, {
		// TODO
	});
	console.log(uploadSRImageResponse);

	return `%%${imageName}%%`;
}
