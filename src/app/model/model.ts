import { PersistentData } from './common';

export interface RootNode extends PersistentData {
  dataRegion: DataRegion;
}

/** The definition a course */
export interface Course extends RootNode {
  /** The name of the course */
  name: string;
  /** The level of the course */
  level: number;
  /** The theme associated with this course */
  theme: string;
  /** Flag indicating if the test is enabled. */
  enabled: boolean;
  /** The test associated with the course */
  test: Test;
  /** Flag indicating if the test can be run alone online. */
  allowedAlone: boolean;
}

export type DurationUnit = 'm' | 'h' | 'd';

/** The test of a course */
export interface Test {
  /** The version number of the test */
  version: string;
  /** Flag indicating if the test is enabled. */
  enabled: boolean;
  /** Duration of test */
  duration: number;
  /** unit of the duration time  */
  durationUnit: DurationUnit;
  /** The list of serie of questions */
  series: QuestionSerie[];
  /** The required number of point for the serie */
  requiredScore: number;
  /** Number of question to ask in the test */
  nbQuestion: number;
  /** List of supported languages */
  supportedLanguages: string[];
  /** The URL of the template of the certificate */
  certificateTemplateUrl: string;
}
export type SelectionMode = 'ALL' | 'RANDOM';

/** A serie of the test */
export interface QuestionSerie {
  /** The name of the question serie. The name is optional. */
  serieName?: string;
  /** The list of the question of the serie */
  questions: Question[];
  /** Indicate if the question is enabled. */
  enabled: boolean;
  /** The required number of point for the serie */
  requiredScore: number;
  /** indicate if this serie is required to be passed, in order to pass the test */
  passRequired: boolean;
  /** the number of question to ask in the serie */
  nbQuestion: number;
  /** mode of selection of the question */
  selectionMode: SelectionMode;
}

/** A translation of the text. The identifier is the <key>.<lang> */
export interface Translation extends RootNode {
  /** the translated text into the language defined in the key. */
  text: string;
}

export interface Translatable {
  /** the translation identifier of the answer */
  key: string;
  text?: string;
}

export type QuestionType =
  /** The question has only one answer */
  'UNIQUE' |
   /** The question has several expected answers */
  'COMBINATION';
/** A question of the serie of the test */
export interface Question extends Translatable {
  /** The identifier of the question */
  questionId: string;
  /** the identifier of the image associated to the question */
  imageId?: string;
  /** The list of the possible answer to the question */
  answers: Answer[];
  /** Indicate if the question is enabled. */
  enabled: boolean;
  /** Flag to indicate the question is required. */
  required: boolean;
  /** does the question has one or several answer expected. */
  questionType?: QuestionType;
}

/** An answer of a question. */
export interface Answer extends Translatable {
  /** The identifier of the answer */
  answerId: string;
  /** the identifier of the image associated to the answer */
  imageId?: string;
  /** Flag indicating if the answer is right */
  right?: boolean;
  /** Number of point wan when the user choose the answer */
  point: number;
}

export type SessionStatus = 'REGISTRATION' | 'STARTED' | 'STOPPED' | 'CORRECTION' | 'CLOSED';


/** A session of a course */
export interface Session extends RootNode {
  /** identifier of the course */
  courseId: string;
  /** Name of the course */
  courseName: string;
  /** Status of the session */
  status: SessionStatus;
  /** the key code associated to the session */
  keyCode: string;
  /** The begin time of the test of the session */
  startDate: Date;
  /** Duration of test in minute */
  expireDate: Date;
  /** The list of the teachers of a session */
  teachers: PersonRef[];
  teacherIds: string[];
  /** The list of the participant of the session (must be sync with 'participantIds')  */
  participants: SessionParticipant[];
  /** The list of the participant identifier of the session (must be sync with 'participants') */
  participantIds: string[];
  /** flag indicating whether the session is run automatically */
  autoPlay?: boolean;
  /**
   * The list of the identifier of the questions to run during the test.
   * The questions are extracted from the course.
   */
  questionIds: string[];
}

export interface PersonRef {
  personId: string;
  firstName: string;
  lastName: string;
}

export interface ParticipantResult {
  /** pass */
  pass: boolean;
  /** score */
  score: number;
  requiredScore: number;
  maxScore: number;
  /** score as percent */
  percent: number;
  answeredQuestions: number;
}
export interface TestParticipantResult extends ParticipantResult {
  seriesResult: ParticipantResult[];
}

/** A participant of a session */
export interface SessionParticipant extends TestParticipantResult {
  /** The user */
  person: PersonRef;
  /** The answerq of the questions */
  questionAnswerIds: string[];
}

export interface ParticipantQuestionAnswer extends RootNode {
  /** Identifier of the learner */
  learnerId: string;
  /** Identifier of the session */
  sessionId: string;
  /** The identifier of the question */
  questionId: string;
  /** The identifier of the choosed answers */
  answerId: string;
  /** The identifier of the choosed answers */
  answerIds?: string[];
  /** time stamp of the response */
  responseTime: Date;
}

export type AuthProvider = 'EMAIL' | 'GOOGLE' | 'FACEBOOK';
export type AppRole = 'TEACHER' | 'LEARNER' | 'ADMIN';
export type AccountStatus = 'VALIDATION_REQUIRED' | 'ACTIVE' | 'LOCKED' | 'DELETED';

export interface Photo {
  path: string;
  url: string;
}

/** A user of the application */
export interface User extends RootNode {
  /** The password of the user */
  password?: string;
  /** The firebase account identifier */
  accountId: string;
  /** The token */
  token?: string;
  /** the data sharing agrement */
  dataSharingAgreement: PersonDataSharingAgreement;
  /** The role of the user */
  role: AppRole;
  /** The authentication provider */
  authProvider?: AuthProvider;
  /** The status of the account */
  accountStatus: AccountStatus;
  /** The email address of the user */
  email: string;
  /** The first name of the user */
  firstName: string;
  /** The last name of the user */
  lastName: string;
  /** The phone number of the user */
  phone: string;
  /** The club of the user */
  club: Club;
  /** The speaking languages of the user */
  speakingLanguages: string[];
  /** The qualification of the user */
  teacherQualifications: TeacherQualification[];
  /** Photo of the user */
  photo: Photo;
}

export interface Nta extends RootNode {
  teacherManagers: User[];
}

export interface Club extends RootNode {
  nta: Nta;
}

export type TeacherQualificationStatus = 'NotQualified' | 'Learner' | 'Qualified';

export interface TeacherQualification {
  region: DataRegion;
  level: string;
  status: TeacherQualificationStatus;
}

export type Sharing =
  /** No sharing */ 'NO'
  | /* sharing with control */ 'LIMITED'
  | /* Sharing allowed */ 'YES';

export interface PersonDataSharingAgreement  {
    /* Agrement of sharing about personnal information */
    personnalInfoSharing: Sharing;
    /* Agrement of sharing about the photo */
    photoSharing: Sharing;
}

export type DataRegion = 'Australia' | 'New Zealand' | 'Europe' | 'South Africa' | 'USA';
export const REGIONS: DataRegion[] = ['Australia', 'New Zealand',  'Europe', 'South Africa', 'USA'];
/** List of countries [0] is the internal name, [1] is the viewed name. */
export const COUNTRIES: string[][] = [
  ['Australia	', 'Australia'],
  ['Austria', 'Austria'],
  ['Belgium', 'Belgium'],
  ['Canada', 'Canada'],
  ['Chile', 'Chile'],
  ['China', 'China'],
  ['Chinese Taipei', 'Chinese Taipei'],
  ['Cook Islands', 'Cook Islands'],
  ['Czech Republic', 'Czech Republic'],
  ['England', 'England'],
  ['Fiji', 'Fiji'],
  ['France', 'France'],
  ['Germany', 'Germany'],
  ['Guernesey', 'Guernesey'],
  ['HongKong', 'HongKong'],
  ['Hungary', 'Hungary'],
  ['India', 'India'],
  ['Ireland', 'Ireland'],
  ['Italy', 'Italy'],
  ['Japan', 'Japan'],
  ['Jersey', 'Jersey'],
  ['Luxembourg', 'Luxembourg'],
  ['Malaysia', 'Malaysia'],
  ['Mauritius', 'Mauritius'],
  ['Netherlands', 'Netherlands'],
  ['New Zealand', 'New Zealand'],
  ['Pakistan', 'Pakistan'],
  ['Papua New Guinea', 'Papua New Guinea'],
  ['Philippines', 'Philippines'],
  ['Portugal', 'Portugal'],
  ['Qatar', 'Qatar'],
  ['Samoa', 'Samoa'],
  ['Scotland', 'Scotland'],
  ['Singapore', 'Singapore'],
  ['South Africa', 'South Africa'],
  ['Spain', 'Spain'],
  ['Sweden', 'Sweden'],
  ['Switzerland', 'Switzerland'],
  ['United Arab Emirates', 'United Arab Emirates'],
  ['USA', 'USA'],
  ['Wales', 'Wales'],
  ['Other', 'Other']
];

export const LANGUAGES: string[][] = [
  ['EN', 'English'],
  ['FR', 'Français'],
  ['DE', 'Deutsch'],
  ['ES', 'Spanish'],
  ['IT', 'Italian'],
  ['PO', 'Portuguese']
];

export const CONSTANTES =  {
  countries: COUNTRIES,
  languages: LANGUAGES,
  regions: REGIONS
};


export interface SharedElement {
  /** List of users */
  sharedWith: SharedWithIds;
}
export interface SharedWithIds {
  /** List of users id */
  users: string[];
  /** List of group id */
  groups: string[];
}

export interface SharedWith {
  /** List of users */
  users: User[];
}
