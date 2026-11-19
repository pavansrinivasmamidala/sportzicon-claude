// Row types mirroring supabase/migrations/20261119000000_init.sql

export type UserRole = 'athlete' | 'coach' | 'scout' | 'club' | 'organizer' | 'scorer';
export type OrgKind = 'academy' | 'club' | 'association';
export type OpportunityType = 'trial' | 'job' | 'tournament';
export type ApplicationStatus = 'submitted' | 'shortlisted' | 'declined';
export type MatchStatus = 'scheduled' | 'live' | 'completed';
export type ExtraType = 'none' | 'wide' | 'noball' | 'bye' | 'legbye';

export interface Organization {
  id: string;
  kind: OrgKind;
  name: string;
  city: string | null;
  logo_url: string | null;
  about: string | null;
  created_by: string | null;
  created_at: string;
}

export type SkillRatings = Record<string, number>;

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  headline: string | null;
  avatar_url: string | null;
  city: string | null;
  sport: string;
  bio: string | null;
  date_of_birth: string | null;
  playing_role: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  open_to_opportunities: boolean;
  org_id: string | null;
  skill_ratings: SkillRatings;
  skill_rated_by: string | null;
  skill_rated_at: string | null;
  passport_code: string | null;
  onboarded: boolean;
  created_at: string;
}

export interface ProfileWithOrg extends Profile {
  organization: Pick<Organization, 'id' | 'name' | 'kind' | 'city'> | null;
}

export interface Performance {
  id: string;
  athlete_id: string;
  match_id: string | null;
  opponent: string;
  format: string;
  played_on: string;
  runs: number | null;
  balls_faced: number | null;
  fours: number | null;
  sixes: number | null;
  not_out: boolean;
  overs: number | null;
  maidens: number | null;
  runs_conceded: number | null;
  wickets: number | null;
  source: 'self' | 'live_scoring';
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export type PostKind = 'text' | 'video' | 'image' | 'scorecard' | 'article';

export interface Post {
  id: string;
  author_id: string;
  kind: PostKind;
  body: string;
  media_url: string | null;
  performance_id: string | null;
  created_at: string;
}

export interface FeedPost extends Post {
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role' | 'headline' | 'playing_role'> & {
    organization: Pick<Organization, 'name'> | null;
  };
  performance: Performance | null;
  endorsements: number;
  comments: number;
  endorsed_by_me: boolean;
  saved_by_me: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

export interface Opportunity {
  id: string;
  org_id: string;
  posted_by: string | null;
  type: OpportunityType;
  title: string;
  description: string;
  sport: string;
  city: string | null;
  venue: string | null;
  starts_at: string | null;
  deadline: string | null;
  age_group: string | null;
  fee_inr: number | null;
  compensation: string | null;
  vacancies: number | null;
  requirements: string[];
  status: 'open' | 'closed';
  created_at: string;
}

export interface OpportunityWithOrg extends Opportunity {
  organization: Pick<Organization, 'id' | 'name' | 'kind' | 'city'>;
}

export interface Application {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  applicant_org_id: string | null;
  note: string | null;
  document_path: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  last_message_at: string;
  last_message_preview: string | null;
}

export interface MessageAttachment {
  type: 'performance' | 'profile' | 'post';
  id: string;
  title: string;
  subtitle?: string;
  value?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachment: MessageAttachment | null;
  created_at: string;
}

export interface Match {
  id: string;
  created_by: string | null;
  scorer_id: string | null;
  competition: string | null;
  venue: string | null;
  format: string;
  overs_limit: number;
  team_a: string;
  team_b: string;
  batting_first: 'a' | 'b';
  status: MatchStatus;
  current_innings: 1 | 2;
  striker_id: string | null;
  non_striker_id: string | null;
  bowler_id: string | null;
  result: string | null;
  starts_at: string;
  created_at: string;
}

export interface MatchPlayer {
  id: string;
  match_id: string;
  team: 'a' | 'b';
  name: string;
  profile_id: string | null;
  batting_order: number;
}

export interface Ball {
  id: number;
  match_id: string;
  innings: 1 | 2;
  seq: number;
  striker_id: string;
  non_striker_id: string | null;
  bowler_id: string;
  runs_bat: number;
  extra_type: ExtraType;
  extra_runs: number;
  is_wicket: boolean;
  wicket_kind: string | null;
  dismissed_id: string | null;
  shot_zone: string | null;
  pitch_zone: string | null;
  commentary: string | null;
  created_at: string;
}

export type NotificationKind = 'application' | 'message' | 'verification' | 'endorsement' | 'match' | 'opportunity' | 'shortlist';

export interface AppNotification {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
}
