/**
 * UI string dictionary for FI/EN localization. Keyed by stable dot-separated
 * keys; each value is { fi, en }. Consumed via t(key) in js/i18n.js.
 *
 * Team names, league proper names, and bookmaker brand names are data and are
 * NOT translated here. Sport names, the consensus label, knockout-stage names,
 * split-group names and country suffixes are UI-ish and ARE translated.
 */
export const TRANSLATIONS = {
  // Header
  'nav.subtitle': { fi: 'Urheiluvedonlyönnin todennäköisyyslaskuri', en: 'Sports Betting Probability Calculator' },
  'nav.lastUpdated': { fi: 'Päivitetty:', en: 'Last updated:' },
  'nav.noDataYet': { fi: 'Ei vielä dataa', en: 'No data yet' },

  // Selector bar
  'sel.sport': { fi: 'Laji', en: 'Sport' },
  'sel.league': { fi: 'Sarja', en: 'League' },
  'sel.season': { fi: 'Kausi', en: 'Season' },
  'sel.bookmaker': { fi: 'Vedonvälittäjä', en: 'Bookmaker' },
  'sel.currentSeasonOnly': { fi: 'Vain kuluva kausi', en: 'Current Season Only' },

  // Section titles
  'sec.matches': { fi: 'Ottelut', en: 'Matches' },
  'sec.matchAnalysis': { fi: 'Otteluanalyysi', en: 'Match Analysis' },
  'sec.scoreMatrix': { fi: 'Tulosmatriisi', en: 'Score Matrix' },
  'sec.matchOutcome': { fi: 'Ottelun lopputulos', en: 'Match Outcome' },
  'sec.overUnder': { fi: 'Yli/Alle', en: 'Over/Under' },
  'sec.valueBets': { fi: 'Arvovedot', en: 'Value Bets' },
  'sec.fades': { fi: 'Fadet', en: 'Fades' },
  'sec.bookmakerComparison': { fi: 'Vedonvälittäjävertailu', en: 'Bookmaker Comparison' },
  'sec.allBets': { fi: 'Kaikki vedot', en: 'All Bets Overview' },
  'sec.standings': { fi: 'Sarjataulukko', en: 'Standings' },
  'sec.settings': { fi: 'Asetukset', en: 'Settings' },
  'sec.plSimulation': { fi: 'Kauden tuottosimulaatio', en: 'Season P/L Simulation' },
  'sec.predictionTracker': { fi: 'Ennusteseuranta', en: 'Prediction Tracker' },
  'sec.eloRatings': { fi: 'Elo-luvut', en: 'Elo Ratings' },

  // Model slider panel
  'panel.model': { fi: 'Malli', en: 'Model' },
  'panel.reset': { fi: 'Nollaa', en: 'Reset' },
  'panel.seasonOnly': { fi: 'Vain kausi', en: 'Season Only' },

  // Settings + slider labels
  'set.marketTrust': { fi: 'Markkinoiden luottamus', en: 'Market Trust' },
  'set.marketTrustShort': { fi: 'Markkinaluottamus', en: 'Market Trust' },
  'set.prevSeason': { fi: 'Edellinen kausi', en: 'Previous Season' },
  'set.prevSeasonShort': { fi: 'Ed. kausi', en: 'Prev Season' },
  'set.lowScoreCorrection': { fi: 'Vähämaalisten korjaus', en: 'Low-Score Correction' },
  'set.lowScoreCorrShort': { fi: 'Vähämaal. korjaus', en: 'Low-Score Corr' },
  'set.formBoost': { fi: 'Virekorotus', en: 'Form Boost' },
  'set.bayesianPrior': { fi: 'Bayesiläinen priori', en: 'Bayesian Prior' },
  'set.kellyFraction': { fi: 'Kelly-osuus', en: 'Kelly Fraction' },
  'set.bankroll': { fi: 'Pelikassa', en: 'Bankroll' },
  'set.minEdge': { fi: 'Vähimmäisetu', en: 'Min. Edge' },
  'set.matchDepth': { fi: 'Otteluhistorian syvyys', en: 'Match Depth' },

  // Match list
  'list.loading': { fi: 'Ladataan...', en: 'Loading...' },
  'list.all': { fi: 'Kaikki', en: 'All' },
  'list.showEarlier': { fi: 'Näytä aiemmat päivät', en: 'Show earlier dates' },
  'list.hideEarlier': { fi: 'Piilota aiemmat päivät', en: 'Hide earlier dates' },
  'list.showLater': { fi: 'Näytä myöhemmät päivät', en: 'Show later dates' },
  'list.hideLater': { fi: 'Piilota myöhemmät päivät', en: 'Hide later dates' },
  'list.colPrediction': { fi: 'Ennuste', en: 'Prediction' },
  'list.col1x2': { fi: '1 X 2', en: '1 X 2' },
  'list.oddsMoving': { fi: 'KERTOIMET LIIKKUU', en: 'ODDS MOVING' },
  'streak.W': { fi: 'V', en: 'W' },
  'streak.D': { fi: 'T', en: 'D' },
  'streak.L': { fi: 'H', en: 'L' },
  'list.statusResults': { fi: 'Tulokset', en: 'Results' },
  'list.statusUpcoming': { fi: 'Tulevat', en: 'Upcoming' },
  'list.statusInProgress': { fi: 'Käynnissä', en: 'In Progress' },
  'date.today': { fi: 'Tänään', en: 'Today' },
  'date.yesterday': { fi: 'Eilen', en: 'Yesterday' },
  'date.tomorrow': { fi: 'Huomenna', en: 'Tomorrow' },

  'ctx.neutralVenue': { fi: 'Neutraali kenttä', en: 'Neutral venue' },

  // Score-matrix prediction summary line
  'sm.prediction': { fi: 'Ennuste:', en: 'Prediction:' },
  'sm.mostLikelyScoreline': { fi: 'Todennäköisin tulos:', en: 'Most likely scoreline:' },
  'sm.mostLikely': { fi: 'Todennäköisin:', en: 'Most likely:' },
  'sm.explainDiff': {
    fi: 'Ennuste on todennäköisin tulos ennustetulle lopputulokselle ({label}). {ml}:llä on korkein yksittäinen todennäköisyys, mutta kaikkien {sum}tulosten summa on suurempi. <strong>1X2-vedoissa</strong> seuraa lopputulostodennäköisyyksiä alla. <strong>Täsmätulosvedoissa</strong> käytä matriisia.',
    en: 'The prediction is the most likely score for the predicted outcome ({label}). {ml} has the highest individual probability, but adding up all {sum} scorelines gives a higher total. For <strong>1X2 bets</strong>, follow the outcome probabilities below. For <strong>exact score bets</strong>, use the matrix.',
  },
  'sm.explainSame': {
    fi: 'Molemmat tulokset kuuluvat samaan lopputulokseen ({label}), mutta {ml}:llä on korkein yksittäinen todennäköisyys. <strong>1X2-vedoissa</strong> seuraa lopputulostodennäköisyyksiä alla. <strong>Täsmätulosvedoissa</strong> käytä matriisia.',
    en: 'Both scores belong to the same outcome ({label}), but {ml} has the highest individual probability across all scorelines. For <strong>1X2 bets</strong>, follow the outcome probabilities below. For <strong>exact score bets</strong>, use the matrix.',
  },

  // Match outcome
  'outcome.home': { fi: 'Koti', en: 'Home' },
  'outcome.away': { fi: 'Vieras', en: 'Away' },
  'outcome.draw': { fi: 'Tasapeli', en: 'Draw' },
  'outcome.homeWin': { fi: 'Kotivoitto', en: 'Home Win' },
  'outcome.awayWin': { fi: 'Vierasvoitto', en: 'Away Win' },
  'outcome.book': { fi: 'vv.', en: 'book' },
  'label.over': { fi: 'Yli', en: 'Over' },
  'label.under': { fi: 'Alle', en: 'Under' },
  'outcome.modelFairOdds': { fi: 'Mallin reilut kertoimet', en: 'Model fair odds' },
  'outcome.bookImpliedOdds': { fi: 'Vedonvälittäjän kertoimista johdettu', en: 'Bookmaker implied odds' },

  // Table column headers (shared)
  'col.line': { fi: 'Raja', en: 'Line' },
  'col.yourPct': { fi: 'Oma %', en: 'Your %' },
  'col.bookmakerPct': { fi: 'VV %', en: 'Bookmaker %' },
  'col.bookPct': { fi: 'VV %', en: 'Book %' },
  'col.modelPct': { fi: 'Malli %', en: 'Model %' },
  'col.edge': { fi: 'Etu', en: 'Edge' },
  'col.bet': { fi: 'Veto', en: 'Bet' },
  'col.kelly': { fi: 'Kelly %', en: 'Kelly %' },
  'col.stake': { fi: 'Panos', en: 'Stake' },
  'col.bookmaker': { fi: 'Vedonvälittäjä', en: 'Bookmaker' },
  'col.date': { fi: 'Pvm', en: 'Date' },
  'col.match': { fi: 'Ottelu', en: 'Match' },
  'col.odds': { fi: 'Kertoimet', en: 'Odds' },
  'col.pl': { fi: 'Voitto/tappio', en: 'P/L' },

  // Value / all bets
  'bets.noValueBets': { fi: 'Ei arvovetoja', en: 'No value bets found' },
  'bets.best': { fi: 'Paras:', en: 'Best:' },
  'bets.moreBelowThreshold': { fi: '{n} muuta vetoa alle {edge}% eturajan', en: '{n} more bets below {edge}% edge threshold' },

  // Fades
  'fades.overvaluedOutcome': { fi: 'Yliarvostettu lopputulos', en: 'Overvalued Outcome' },
  'fades.overvaluedBy': { fi: 'Yliarvostus', en: 'Overvalued By' },
  'fades.noOvervalued': { fi: 'Ei yliarvostettuja lopputuloksia', en: 'No overvalued outcomes found' },
  'fades.edge': { fi: 'Etu', en: 'Edge' },
  'fades.stake': { fi: 'Panos', en: 'Stake' },

  // Bookmaker comparison
  'comp.comparedAgainst': { fi: 'Verrattuna:', en: 'Compared against:' },
  'comp.benchPinnacle': { fi: 'Pinnacle (terävä)', en: 'Pinnacle (sharp)' },
  'comp.ourModel': { fi: 'Oma malli', en: 'Our Model' },
  'comp.noMultiOdds': { fi: 'Ei usean vedonvälittäjän kertoimia', en: 'No multi-bookmaker odds available' },
  'comp.badgeBest': { fi: 'PARAS', en: 'BEST' },
  'comp.badgeSharpValue': { fi: 'TERÄVÄ ARVO', en: 'SHARP VALUE' },
  'comp.was': { fi: 'oli', en: 'was' },
  'comp.opened': { fi: 'avaus', en: 'opened' },

  // Elo
  'elo.showAll': { fi: 'Näytä kaikki', en: 'Show all' },
  'elo.showAllN': { fi: 'Näytä kaikki ({n})', en: 'Show all ({n})' },
  'elo.showTop': { fi: 'Näytä top {cap}', en: 'Show top {cap}' },
  'elo.noMatchData': { fi: 'Ei otteludataa', en: 'No match data available' },
  'elo.team': { fi: 'Joukkue', en: 'Team' },
  'elo.rating': { fi: 'Luku', en: 'Rating' },
  'elo.change': { fi: 'Muutos', en: 'Change' },
  'elo.form': { fi: 'Vire', en: 'Form' },
  'elo.played': { fi: 'O', en: 'P' },

  // Prediction tracker
  'track.noFinished': { fi: 'Ei vielä päättyneitä otteluita seurattavaksi', en: 'No finished matches to track yet' },
  'track.avgBrier': { fi: 'Keskim. Brier-pisteet', en: 'Avg Brier Score' },
  'track.1x2Accuracy': { fi: '1X2-osumatarkkuus', en: '1X2 Accuracy' },
  'track.exactScore': { fi: 'Tarkka tulos', en: 'Exact Score' },
  'track.pred': { fi: 'Ennuste', en: 'Pred' },
  'track.actual': { fi: 'Toteutunut', en: 'Actual' },
  'track.1x2': { fi: '1X2', en: '1X2' },
  'track.score': { fi: 'Tulos', en: 'Score' },
  'track.ok': { fi: 'OK', en: 'OK' },
  'track.miss': { fi: 'X', en: 'X' },
  'track.predCorrect': { fi: '1X2-ennuste osui', en: 'Our 1X2 prediction was correct' },
  'track.predMissed': { fi: '1X2-ennuste meni pieleen', en: 'Our 1X2 prediction missed' },
  'track.predictedScore': { fi: 'Ennustettu tulos', en: 'Predicted score' },

  // P/L simulation
  'pl.noBets': { fi: 'Ei arvovetoja vielä — simulaatio alkaa 10 päättyneen ottelun jälkeen ja huomioi vain positiivisen edun vedot.', en: 'No value bets yet — the simulation starts after 10 finished matches and only counts positive-edge picks.' },
  'pl.totalPL': { fi: 'Kokonaistulos', en: 'Total P/L' },
  'pl.roi': { fi: 'ROI', en: 'ROI' },
  'pl.maxDrawdown': { fi: 'Suurin pudotus', en: 'Max Drawdown' },
  'pl.winRate': { fi: 'Voitto-%', en: 'Win Rate' },
  'pl.betN': { fi: 'Veto #{n}: {val}', en: 'Bet #{n}: {val}' },

  // Suggested Bets (cross-league)
  'sb.title': { fi: 'Ehdotetut vedot', en: 'Suggested Bets' },
  'sb.thisWeek': { fi: 'Tämän viikon ehdotukset', en: "This week's picks" },
  'sb.trackRecord': { fi: 'Tulokset', en: 'Track record' },
  'sb.empty': { fi: 'Ei ehdotuksia vielä — päivittyy torstaisin.', en: 'No suggestions yet — updates on Thursdays.' },
  'sb.colLeague': { fi: 'Sarja', en: 'League' },
  'sb.colConfidence': { fi: 'Luottamus', en: 'Confidence' },
  'sb.confCold': { fi: 'Kylmä', en: 'Cold' },
  'sb.confWarming': { fi: 'Lämpenee', en: 'Warming' },
  'sb.confWarm': { fi: 'Lämmin', en: 'Warm' },
  'sb.record': { fi: 'Osumat', en: 'Record' },
  'sb.help': { fi: 'Mallin parhaat arvovedot tulevista otteluista, koottuna kaikista sarjoista. Jokaisessa ottelussa mallin 1X2-todennäköisyyksiä verrataan vedonvälittäjän kertoimiin (marginaali poistettuna); veto on arvoveto kun malli arvioi lopputuloksen todennäköisemmäksi kuin markkina — tämä ero on <strong>etu</strong>. Mukaan otetaan vedot joiden etu on vähintään 3 % ja jotka pelataan seuraavan noin 8 päivän aikana, ne järjestetään edun mukaan ja näytetään 20 parasta. Luottamuspiste kertoo kuinka monta ottelua sarjassa on pelattu (enemmän otteluita = luotettavampi malli). Jokaista vetoa seurataan tasapanoksin (1 yksikkö: voitto tuottaa kerroin−1, tappio −1) ja se arvostellaan kun ottelu päättyy. Ei tuottotakuuta — urheiluvedonlyöntiä.',
               en: "The model's best value bets on upcoming fixtures, gathered across every league. For each match the model's 1X2 probabilities are compared against the bookmaker odds (with the margin removed); an outcome is a value bet when the model rates it more likely than the market — that gap is the <strong>edge</strong>. We keep bets with an edge of at least 3% on matches in the next ~8 days, rank them by edge, and show the top 20. The confidence dot shows how many matches the league has played (more games = more reliable model). Each pick is tracked at level stakes (1 unit: a win pays odds−1, a loss −1) and is graded once the match finishes. Not a profit guarantee — this is sports betting." },

  // Standings tables
  'st.groupNotStarted': { fi: 'Lohkovaihe ei ole vielä alkanut', en: "Group stage hasn't started yet" },
  'st.groupComplete': { fi: 'Lohkovaihe valmis — lopulliset sijoitukset', en: 'Group Stage Complete — Final Standings' },
  'st.fullTable': { fi: 'Koko taulukko', en: 'Full Table' },
  'st.knockoutResults': { fi: 'Pudotuspelien tulokset', en: 'Knockout Results' },
  'st.group': { fi: 'Lohko', en: 'Group' },
  'st.conference': { fi: 'konferenssi', en: 'Conference' },
  'st.championshipGroup': { fi: 'Mestaruussarja', en: 'Championship Group' },
  'st.relegationGroup': { fi: 'Putoamissarja', en: 'Relegation Group' },
  'st.rank': { fi: 'Sija', en: 'Rank' },
  'st.team': { fi: 'Joukkue', en: 'Team' },
  'st.played': { fi: 'Ottelut', en: 'Played' },
  'st.playedAbbr': { fi: 'O', en: 'P' },
  'st.won': { fi: 'Voitot', en: 'Won' },
  'st.wonAbbr': { fi: 'V', en: 'W' },
  'st.drawn': { fi: 'Tasapelit', en: 'Drawn' },
  'st.drawnAbbr': { fi: 'T', en: 'D' },
  'st.lost': { fi: 'Häviöt', en: 'Lost' },
  'st.lostAbbr': { fi: 'H', en: 'L' },
  'st.otWin': { fi: 'JA-voitto', en: 'OT Win' },
  'st.otWinAbbr': { fi: 'JVV', en: 'OTW' },
  'st.otLoss': { fi: 'JA-tappio', en: 'OT Loss' },
  'st.otLossAbbr': { fi: 'JVH', en: 'OTL' },
  'st.goalsFor': { fi: 'Tehdyt maalit', en: 'Goals For' },
  'st.goalsForAbbr': { fi: 'TM', en: 'GF' },
  'st.goalsAgainst': { fi: 'Päästetyt maalit', en: 'Goals Against' },
  'st.goalsAgainstAbbr': { fi: 'PM', en: 'GA' },
  'st.goalDiff': { fi: 'Maaliero', en: 'Goal Difference' },
  'st.goalDiffAbbr': { fi: 'ME', en: 'GD' },
  'st.points': { fi: 'Pisteet', en: 'Points' },
  'st.pointsAbbr': { fi: 'P', en: 'Pts' },

  // Knockout stage names
  'stage.LAST_32': { fi: '32:n kierros', en: 'Round of 32' },
  'stage.LAST_16': { fi: '16:n kierros', en: 'Round of 16' },
  'stage.QUARTER_FINAL': { fi: 'Puolivälierä', en: 'Quarter-Final' },
  'stage.SEMI_FINAL': { fi: 'Välierä', en: 'Semi-Final' },
  'stage.THIRD_PLACE': { fi: 'Pronssiottelu', en: 'Third-Place Play-off' },
  'stage.FINAL': { fi: 'Loppuottelu', en: 'Final' },

  // Sport names
  'sport.football': { fi: 'Jalkapallo', en: 'Football' },
  'sport.ice_hockey': { fi: 'Jääkiekko', en: 'Ice Hockey' },

  // Bookmaker consensus label
  'bk.consensus': { fi: 'Konsensus (ka.)', en: 'Consensus (avg)' },
};

/** Country suffixes that appear inside league display names, e.g. "… (Finland)". */
export const COUNTRY_SUFFIX = {
  Finland: 'Suomi',
  England: 'Englanti',
  Spain: 'Espanja',
  Germany: 'Saksa',
  Italy: 'Italia',
  International: 'Maaottelut',
};
