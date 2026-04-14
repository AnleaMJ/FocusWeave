"use client";

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/contexts/settings-context';

type SearchEngineKey = 'google' | 'youtube' | 'quora' | 'reddit';

const SEARCH_ENGINE_CACHE_KEY = 'focusweave.searchEngine';
const SEARCH_ENGINES: Record<SearchEngineKey, { label: string; action: string; param: string }> = {
  google: {
    label: 'Google',
    action: 'https://www.google.com/search',
    param: 'q',
  },
  youtube: {
    label: 'YouTube',
    action: 'https://www.youtube.com/results',
    param: 'search_query',
  },
  quora: {
    label: 'Quora',
    action: 'https://www.quora.com/search',
    param: 'q',
  },
  reddit: {
    label: 'Reddit',
    action: 'https://www.reddit.com/search/',
    param: 'q',
  },
};

export function DirectSearchWidget() {
  const { settings, updateSettings } = useSettings();
  const [query, setQuery] = useState('');

  const engine = (settings.searchEngine as SearchEngineKey) || 'google';

  const handleEngineChange = (value: SearchEngineKey) => {
    updateSettings({ searchEngine: value });
  };

  const placeholder = useMemo(
    () => `Search on ${SEARCH_ENGINES[engine].label}...`,
    [engine]
  );

  return (
    <Card className="h-full border-border/80 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Search className="h-5 w-5 text-primary" />
          Direct Search
        </CardTitle>
        <CardDescription>Search Google, YouTube, Quora, or Reddit directly from FocusWeave</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={SEARCH_ENGINES[engine].action}
          method="GET"
          target="_blank"
          rel="noopener noreferrer"
          className="space-y-3"
        >
          <Select value={engine} onValueChange={(value) => handleEngineChange(value as SearchEngineKey)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a search engine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="quora">Quora</SelectItem>
              <SelectItem value="reddit">Reddit</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input
              name={SEARCH_ENGINES[engine].param}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
            />
            <Button type="submit" disabled={!query.trim()}>
              Search
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
