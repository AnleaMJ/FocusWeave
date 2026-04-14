export interface QuickLinkItem {
  id: string;
  label: string;
  url: string;
}

export type WeatherMode = 'device' | 'manual';

const DEFAULT_QUICK_LINKS: QuickLinkItem[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    url: 'https://www.youtube.com/',
  },
  {
    id: 'teams',
    label: 'Microsoft Teams',
    url: 'https://teams.microsoft.com/',
  },
  {
    id: 'slack',
    label: 'Slack',
    url: 'https://slack.com/signin',
  },
];

export function getDefaultQuickLinks(): QuickLinkItem[] {
  return DEFAULT_QUICK_LINKS;
}
