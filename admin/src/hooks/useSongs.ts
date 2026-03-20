import { useEffect, useState, useCallback } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../pluginId';

export interface Song {
  id: number;
  documentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  peaks?: number[] | null;
  artist?: {
    id: number;
    documentId: string;
    name: string;
    image?: {
      id: number;
      url: string;
    } | null;
  } | null;
  image?: {
    id: number;
    url: string;
    alternativeText?: string;
  } | null;
  audio?: {
    id: number;
    url: string;
    name?: string;
    mime?: string;
  } | null;
}

interface SongsResponse {
  data: Song[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export function useSongs(page = 1, pageSize = 10) {
  const { get } = useFetchClient();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    pageCount: 1,
    total: 0,
  });

  const fetchSongs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        'pagination[page]': String(page),
        'pagination[pageSize]': String(pageSize),
        'populate[artist][fields][0]': 'name',
        'populate[artist][populate][image][fields][0]': 'url',
        'populate[image][fields][0]': 'url',
        'populate[image][fields][1]': 'alternativeText',
        'populate[audio][fields][0]': 'url',
        'populate[audio][fields][1]': 'name',
        'populate[audio][fields][2]': 'mime',
        'sort[0]': 'createdAt:desc',
      });

      const { data } = await get(
        `/content-manager/collection-types/plugin::${PLUGIN_ID}.song?${params.toString()}`
      );

      setSongs(data?.results || []);
      setPagination(data?.pagination || { page: 1, pageSize: 10, pageCount: 1, total: 0 });
    } catch (err) {
      console.error('Error fetching songs:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch songs'));
    } finally {
      setLoading(false);
    }
  }, [get, page, pageSize]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  return { songs, loading, error, pagination, refetch: fetchSongs };
}
