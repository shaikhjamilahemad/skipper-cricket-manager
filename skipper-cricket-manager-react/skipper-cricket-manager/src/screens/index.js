import { MenuScreen, NewCareerScreen, QuickSetupScreen, TournSetupScreen, TournamentDoneScreen, SavesScreen, SettingsScreen, HelpScreen } from './menu';
import { HomeScreen, SquadScreen, PlayerScreen, FixturesScreen, TablesScreen, WorldHubScreen, MoreScreen, InboxScreen, NewsScreen, CareerScreen, MatchReportScreen, ReviewScreen } from './hub';
import { PrematchScreen, LiveScreen, QuickResultScreen, ScorecardScreen } from './match';
import { NatSquadScreen, RetentionScreen, AuctionIntroScreen, AuctionScreen, AuctionDoneScreen, SigningsScreen } from './auction';
import { EditorScreen, EdFindScreen, EdCompScreen, EdTeamScreen, EdPlayerScreen } from './editor';

// screen name -> component. nav.go('name', params) opens one of these.
export const SCREENS = {
  menu: MenuScreen, newCareer: NewCareerScreen, quickSetup: QuickSetupScreen, tournSetup: TournSetupScreen, tournamentDone: TournamentDoneScreen,
  saves: SavesScreen, settings: SettingsScreen, help: HelpScreen,
  home: HomeScreen, squad: SquadScreen, player: PlayerScreen, fixtures: FixturesScreen, tables: TablesScreen, worldHub: WorldHubScreen,
  more: MoreScreen, inbox: InboxScreen, news: NewsScreen, career: CareerScreen, matchReport: MatchReportScreen, review: ReviewScreen,
  prematch: PrematchScreen, live: LiveScreen, quickResult: QuickResultScreen, scorecard: ScorecardScreen,
  natSquad: NatSquadScreen, retention: RetentionScreen, auctionIntro: AuctionIntroScreen, auction: AuctionScreen, auctionDone: AuctionDoneScreen, signings: SigningsScreen,
  editor: EditorScreen, edFind: EdFindScreen, edComp: EdCompScreen, edTeam: EdTeamScreen, edPlayer: EdPlayerScreen,
};
