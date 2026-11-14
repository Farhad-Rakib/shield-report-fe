import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { siteSettingsApi } from '../../core/api/services/site-settings.api';
import { useSiteSettingsStore } from '../../core/stores/site-settings.store';
import { AuthConsolePanel } from './components/AuthConsolePanel';
import { BrandMark } from './components/BrandMark';

export const AuthLayout: React.FC = () => {
  const { siteTitle, setSettings, settings } = useSiteSettingsStore();

  const { data: fetchedSettings } = useQuery({
    queryKey: ['site-settings-all'],
    queryFn: () => siteSettingsApi.getAll().catch(() => []),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (fetchedSettings && fetchedSettings.length > 0 && fetchedSettings !== settings) {
      setSettings(fetchedSettings);
    }
  }, [fetchedSettings]);

  const getVal = (key: string) => {
    const list = fetchedSettings || settings;
    const s = list.find(s => s.key === key);
    return s?.value || null;
  };

  const title = siteTitle || getVal('site_title') || getVal('SiteTitle') || 'ShieldReport';
  const description = getVal('site_description') || getVal('SiteDescription') || '';

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      <AuthConsolePanel />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-sm">
          {/* Brand is in the left panel on large screens; repeat it here for small ones. */}
          <div className="lg:hidden mb-8 flex justify-center">
            <BrandMark tone="auto" />
          </div>

          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h1>
            {description && <p className="mt-1 text-13 text-gray-500 dark:text-gray-400">{description}</p>}
          </div>

          <div className="panel p-6 sm:p-7">
            <Outlet />
          </div>

          <p className="mt-6 text-center text-2xs text-gray-400 dark:text-gray-600">
            Protected system. Sessions are monitored and audited.
          </p>
        </div>
      </div>
    </div>
  );
};
