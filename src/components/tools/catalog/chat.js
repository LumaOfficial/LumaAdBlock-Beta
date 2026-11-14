/**
 * Chat bubbles and push prompts that sit on top of the page.
 */
export const CHAT = [
  {
    id: 'intercom',
    label: 'Intercom',
    domain: 'intercom.io',
    blurb: 'The chat bubble in the corner of a page.',
    type: 'script',
    paths: ['/messenger.js', '/widget'],
  },
  {
    id: 'drift',
    label: 'Drift',
    domain: 'drift.com',
    blurb: 'Chat widgets and sales popups.',
    type: 'script',
    paths: ['/include.js', '/track'],
  },
  {
    id: 'olark',
    label: 'Olark',
    domain: 'olark.com',
    blurb: 'Support chat widget scripts.',
    type: 'script',
    paths: ['/chat.js', '/track'],
  },
  {
    id: 'livechat',
    label: 'LiveChat',
    domain: 'livechatinc.com',
    blurb: 'Live chat widget scripts.',
    type: 'script',
    paths: ['/tracking.js', '/chat'],
  },
  {
    id: 'zendesk-chat',
    label: 'Zendesk Chat',
    domain: 'zopim.com',
    blurb: 'The Zendesk chat widget.',
    type: 'script',
    paths: ['/chat.min.js', '/track'],
  },
  {
    id: 'tawk',
    label: 'Tawk.to',
    domain: 'tawk.to',
    blurb: 'Free chat widget scripts.',
    type: 'script',
    paths: ['/chat.js', '/track'],
  },
  {
    id: 'onesignal',
    label: 'OneSignal',
    domain: 'onesignal.com',
    blurb: 'Push notification prompts and scripts.',
    type: 'script',
    paths: ['/sdks/onesignal.js', '/push'],
  },
  {
    id: 'pushwoosh',
    label: 'Pushwoosh',
    domain: 'pushwoosh.com',
    blurb: 'Web push subscription requests.',
    type: 'script',
    paths: ['/js/push.js', '/push'],
  },
]
