import {
  Award,
  BookOpen,
  Eraser,
  FlaskConical,
  Layers,
  ListChecks,
  Search,
  Sparkles,
  Timer,
  UserCheck,
  Wallet,
} from 'lucide-react'
import LabPanel from '../LabPanel'
import InspectorPanel from '../InspectorPanel'
import BulkCheck from './BulkCheck'
import ListCoverage from './ListCoverage'
import RuleLibrary from './RuleLibrary'
import RuleBuilder from './RuleBuilder'
import RuleCleanup from './RuleCleanup'
import TrustedSites from './TrustedSites'
import SavingsCalculator from './SavingsCalculator'
import SpeedCheck from './SpeedCheck'
import ProtectionScore from './ProtectionScore'

/**
 * Every tool the app offers. The order here is the order on the Tools page:
 * the everyday ones first, the tidy-up ones after.
 */
export const TOOLS = [
  {
    id: 'score',
    label: 'Protection score',
    icon: Award,
    title: 'How protected are you?',
    lede: 'One number for your setup, and the few changes that lift it.',
    blurb: 'See how much of Luma is working for you.',
    Panel: ProtectionScore,
  },
  {
    id: 'lab',
    label: 'Test lab',
    icon: FlaskConical,
    title: 'See the engine work.',
    lede: 'Four simulated sites, one real filter engine. Luma screens every request and hides every ad slot using the rules you have enabled.',
    blurb: 'Watch Luma strip ads from four simulated sites.',
    Panel: LabPanel,
  },
  {
    id: 'inspector',
    label: 'URL inspector',
    icon: Search,
    title: 'Why was that blocked?',
    lede: 'Paste any request and Luma will check it against your protection, then tell you what it would do.',
    blurb: 'Paste a link and see exactly which rule decides.',
    Panel: InspectorPanel,
  },
  {
    id: 'bulk',
    label: 'Bulk check',
    icon: ListChecks,
    title: 'Check a list of links at once.',
    lede: 'Paste a handful of addresses and Luma gives you a verdict for each one in a single pass.',
    blurb: 'Paste many links, get a verdict for each.',
    Panel: BulkCheck,
  },
  {
    id: 'coverage',
    label: 'List coverage',
    icon: Layers,
    title: 'Which list catches it?',
    lede: 'Compare one address against every list you have, and see which ones would stop it.',
    blurb: 'Compare one link against each of your lists.',
    Panel: ListCoverage,
  },
  {
    id: 'library',
    label: 'Rule library',
    icon: BookOpen,
    title: 'One-click rules.',
    lede: 'Ready-made rules for the annoyances you keep running into. Add one and it joins your setup everywhere.',
    blurb: 'Quiet a specific annoyance without learning syntax.',
    Panel: RuleLibrary,
  },
  {
    id: 'builder',
    label: 'Rule builder',
    icon: Sparkles,
    title: 'Rules without the syntax.',
    lede: 'Say what you want in plain words. Luma writes the rule, checks it against the engine, and adds it to your protection.',
    blurb: 'Build your own rule in plain words.',
    Panel: RuleBuilder,
  },
  {
    id: 'cleanup',
    label: 'Rule clean-up',
    icon: Eraser,
    title: 'Tidy your own rules.',
    lede: 'Finds the rules you added that are already covered by a list, cannot be read, or never run.',
    blurb: 'Find rules that are covered, broken or never run.',
    Panel: RuleCleanup,
  },
  {
    id: 'trusted',
    label: 'Trusted sites',
    icon: UserCheck,
    title: 'Sites Luma leaves alone.',
    lede: 'Every site you have trusted, in one list. Remove one and protection comes back.',
    blurb: 'Review and remove the sites you trust.',
    Panel: TrustedSites,
  },
  {
    id: 'savings',
    label: 'Savings calculator',
    icon: Wallet,
    title: 'What blocking saves you.',
    lede: 'Turn a rough idea of your browsing into the ads and data Luma keeps off your connection.',
    blurb: 'Turn your browsing into data and ads saved.',
    Panel: SavingsCalculator,
  },
  {
    id: 'speed',
    label: 'Speed check',
    icon: Timer,
    title: 'How fast is the engine?',
    lede: 'Times your ruleset against a batch of requests, right here in this browser.',
    blurb: 'Time your ruleset against a batch of requests.',
    Panel: SpeedCheck,
  },
]

export function toolById(id) {
  return TOOLS.find((tool) => tool.id === id) || null
}
