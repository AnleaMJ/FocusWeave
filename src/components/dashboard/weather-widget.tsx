'use client';

import { useEffect, useState } from 'react';
import { CloudSun, MapPin, Wind } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconSpinner } from '@/components/icons';
import { handleFetchWeather, handleFetchWeatherByLocationName, type WeatherResult } from '@/lib/actions';
import { useSettings } from '@/contexts/settings-context';



export function WeatherWidget() {
  const { settings } = useSettings();
  const [data, setData] = useState<WeatherResult | null>(null);
  const [statusMessage, setStatusMessage] = useState('Fetching your local weather...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function run() {
      const weatherMode = settings.weatherMode;
      const savedLocation = settings.weatherLocation;

      if (!isActive) return;

      if (weatherMode === 'manual') {
        if (!savedLocation) {
          setStatusMessage('Manual weather mode is enabled. Set a location in Settings.');
          setIsLoading(false);
          return;
        }

        const result = await handleFetchWeatherByLocationName({ location: savedLocation });
        if (!isActive) return;
        setData(result);
        if (!result.ok && result.error) setStatusMessage(result.error);
        setIsLoading(false);
        return;
      }

      if (!navigator.geolocation) {
        setStatusMessage('Geolocation is not supported in this browser.');
        setIsLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const result = await handleFetchWeather({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          if (!isActive) return;
          setData(result);
          if (!result.ok && result.error) setStatusMessage(result.error);
          setIsLoading(false);
        },
        (error) => {
          if (!isActive) return;
          if (error.code === error.PERMISSION_DENIED) {
            setStatusMessage('Location permission denied. Enable it to see local weather.');
          } else {
            setStatusMessage('Could not detect your location right now.');
          }
          setIsLoading(false);
        },
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
      );
    }

    run();
    return () => { isActive = false; };
  }, [settings.weatherMode, settings.weatherLocation]);

  return (
    <Card className="h-full border-border/80 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <CloudSun className="h-5 w-5 text-primary" />
          Weather
        </CardTitle>
        <CardDescription>Live conditions from your selected weather source</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex min-h-[120px] items-center justify-center">
            <IconSpinner className="h-8 w-8 text-primary" />
          </div>
        ) : data?.ok ? (
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-semibold leading-none">{data.temperatureC} C</span>
              <span className="text-sm text-muted-foreground">{data.condition}</span>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {data.locationLabel}
              </p>
              <p className="flex items-center gap-2">
                <Wind className="h-4 w-4" />
                Wind {data.windKmh} km/h
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-[120px] rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {statusMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
