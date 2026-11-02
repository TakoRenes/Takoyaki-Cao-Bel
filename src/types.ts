export type CharacterStatus = 'draft' | 'published';

export type CharacterGenre =
  | 'Slice of Life'
  | 'Fantasy'
  | 'Romance'
  | 'Mystery'
  | 'Sci-Fi'
  | 'Historical'
  | 'Supernatural'
  | 'Drama'
  | 'Adventure';

export interface TakoyakiCharacter {
  id: string;
  name: string;
  artwork: string;
  avatar: string;
  coverImage: string;
  shortDescription: string;
  plot: string;
  personality: string;
  scenario: string;
  openingScene?: string;
  setting: string;
  relationship: string;
  genre: CharacterGenre;
  tags: string[];
  contentWarning: string;
  creator: string;
  playUrl: string;
  is_spicy: boolean;
  allowsMale?: boolean;
  allowsFemale?: boolean;
  playCount: number;
  viewCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
  status: CharacterStatus;
  imagePosition?: string;
}

export interface CharacterCreateInput {
  name: string;
  artwork: string;
  avatar?: string;
  coverImage?: string;
  shortDescription: string;
  plot: string;
  personality: string;
  scenario: string;
  openingScene?: string;
  setting?: string;
  relationship?: string;
  genre: CharacterGenre;
  tags: string[];
  contentWarning: string;
  creator: string;
  playUrl: string;
  is_spicy: boolean;
  allowsMale?: boolean;
  allowsFemale?: boolean;
  status: CharacterStatus;
  imagePosition?: string;
}

export interface FeedbackReview {
  id: string;
  authorName: string;
  authorAvatar?: string;
  isAnonymous: boolean;
  rating: number; // 1 to 5
  comment: string;
  photos: string[]; // Base64 or image URLs
  helpfulCount: number;
  createdAt: string;
}

export interface FeedbackCreateInput {
  authorName: string;
  authorAvatar?: string;
  isAnonymous: boolean;
  rating: number;
  comment: string;
  photos: string[];
}

export interface AgeVerificationRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhoto?: string;
  documentImage: string; // Base64 data URL or preview
  documentName?: string;
  note?: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export type ActiveTab =
  | 'welcome'
  | 'discover'
  | 'fresh'
  | 'ranking'
  | 'my-box'
  | 'feedback'
  | 'kitchen'
  | 'profile';

export interface SpicyWhitelistItem {
  email: string;
  addedAt: string;
  note?: string;
}


