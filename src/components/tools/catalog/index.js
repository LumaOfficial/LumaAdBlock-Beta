import { ADVERTISING } from './advertising'
import { TRACKING } from './tracking'
import { SOCIAL } from './social'
import { CONSENT } from './consent'
import { CHAT } from './chat'

/**
 * Every service Luma can be asked about, grouped the way the Tools page shows
 * them. One entry becomes one tool.
 */
export const SERVICE_CHECKS = [
  ...ADVERTISING.map((service) => ({ ...service, section: 'Advertising' })),
  ...TRACKING.map((service) => ({ ...service, section: 'Tracking' })),
  ...SOCIAL.map((service) => ({ ...service, section: 'Social & video' })),
  ...CONSENT.map((service) => ({ ...service, section: 'Consent & popups' })),
  ...CHAT.map((service) => ({ ...service, section: 'Chat & push' })),
]
