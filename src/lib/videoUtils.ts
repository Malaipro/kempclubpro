// Utility functions for handling video URLs

export const getVideoEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  
  // YouTube URLs
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=0&controls=1&modestbranding=1`;
  }
  
  // Vimeo URLs
  const vimeoRegex = /vimeo\.com\/(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=0&controls=1`;
  }
  
  // Direct video file URLs (.mp4, .webm, .ogg)
  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
    return url;
  }
  
  // If no pattern matches, return the original URL (assuming it's a direct video)
  return url;
};

export const isYouTubeUrl = (url: string): boolean => {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/.test(url);
};

export const isVimeoUrl = (url: string): boolean => {
  return /vimeo\.com\/\d+/.test(url);
};

export const isDirectVideoUrl = (url: string): boolean => {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
};

export const getVideoType = (url: string): 'youtube' | 'vimeo' | 'direct' | 'unknown' => {
  if (isYouTubeUrl(url)) return 'youtube';
  if (isVimeoUrl(url)) return 'vimeo';
  if (isDirectVideoUrl(url)) return 'direct';
  return 'unknown';
};