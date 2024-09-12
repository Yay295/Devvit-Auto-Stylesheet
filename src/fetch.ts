import { Devvit } from '@devvit/public-api';
import { getMetadata } from '@devvit/runtimes/plugins/helpers.js';

import { Flair } from '@devvit/runtimes/plugins/redditapi/Flair.js';
import { GraphQL } from '@devvit/runtimes/plugins/redditapi/GraphQL.js';
import { LinksAndComments } from '@devvit/runtimes/plugins/redditapi/LinksAndComments.js';
import { Listings } from '@devvit/runtimes/plugins/redditapi/Listings.js';
import { Moderation } from '@devvit/runtimes/plugins/redditapi/Moderation.js';
import { ModNote } from '@devvit/runtimes/plugins/redditapi/ModNote.js';
import { NewModmail } from '@devvit/runtimes/plugins/redditapi/NewModmail.js';
import { PrivateMessages } from '@devvit/runtimes/plugins/redditapi/PrivateMessages.js';
import { Subreddits } from '@devvit/runtimes/plugins/redditapi/Subreddits.js';
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
export async function reuploadImage(subreddit: string, url: string | null, imageName: ImageName): Promise<StylesheetImage | null> {
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
		},
		getMetadata()
	);
	console.log(uploadSRImageResponse);

	return uploadSRImageResponse.errors ? null : `%%${imageName}%%`;
}
