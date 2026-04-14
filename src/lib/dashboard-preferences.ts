export type DashboardWidgetKey = 'directSearch' | 'weather' | 'quote' | 'news' | 'quickLinks' | 'taskStatus';

export interface DashboardWidgetPreferences {
  directSearch: boolean;
  weather: boolean;
  quote: boolean;
  news: boolean;
  quickLinks: boolean;
  taskStatus: boolean;
  widgetOrder: DashboardWidgetKey[];
}

const DEFAULT_ORDER: DashboardWidgetKey[] = ['weather', 'quote', 'taskStatus', 'directSearch', 'news', 'quickLinks'];

const DEFAULT_DASHBOARD_WIDGET_PREFERENCES: DashboardWidgetPreferences = {
  directSearch: true,
  weather: true,
  quote: true,
  news: true,
  quickLinks: true,
  taskStatus: true,
  widgetOrder: DEFAULT_ORDER,
};

export function sanitizeDashboardWidgetPreferences(
  input: Partial<DashboardWidgetPreferences> | null | undefined
): DashboardWidgetPreferences {
  const order = Array.isArray(input?.widgetOrder) ? input?.widgetOrder as DashboardWidgetKey[] : DEFAULT_ORDER;
  // Ensure all keys are present in order
  const missingKeys = DEFAULT_ORDER.filter(k => !order.includes(k));
  const finalOrder = [...order.filter(k => DEFAULT_ORDER.includes(k)), ...missingKeys];

  return {
    directSearch: typeof input?.directSearch === 'boolean' ? input.directSearch : true,
    weather: typeof input?.weather === 'boolean' ? input.weather : true,
    quote: typeof input?.quote === 'boolean' ? input.quote : true,
    news: typeof input?.news === 'boolean' ? input.news : true,
    quickLinks: typeof input?.quickLinks === 'boolean' ? input.quickLinks : true,
    taskStatus: typeof input?.taskStatus === 'boolean' ? input.taskStatus : true,
    widgetOrder: finalOrder,
  };
}

export function getDefaultDashboardWidgetPreferences(): DashboardWidgetPreferences {
  return DEFAULT_DASHBOARD_WIDGET_PREFERENCES;
}
