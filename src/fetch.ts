import { Devvit } from '@devvit/public-api';

export type ColorString = string;
export type UrlString = string;

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
