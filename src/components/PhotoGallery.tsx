import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

interface Moment {
  id: string;
  title?: string;
  description?: string;
  image_url: string;
  video_url?: string;
  is_active: boolean;
  sort_order: number;
}

export const PhotoGallery: React.FC = () => {
  const [selectedMedia, setSelectedMedia] = useState<Moment | null>(null);
  const isMobile = useIsMobile();

  // Загружаем моменты из базы данных
  const { data: moments = [], isLoading } = useQuery({
    queryKey: ['moments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moments')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Moment[];
    },
  });

  // Загружаем динамический контент для заголовков
  const { data: contentBlocks = [] } = useQuery({
    queryKey: ['content-blocks-gallery'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
        .in('block_key', ['gallery_title', 'gallery_subtitle'])
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const getContentBlock = (key: string) => {
    return contentBlocks.find(block => block.block_key === key);
  };

  if (isLoading) {
    return (
      <section id="gallery" className="kamp-section bg-kamp-secondary py-4 md:py-16">
        <div className="kamp-container flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kamp-primary"></div>
        </div>
      </section>
    );
  }

  return (
    <section id="gallery" className="kamp-section bg-kamp-secondary py-4 md:py-16">
      <div className="kamp-container">
        <div className="section-heading reveal-on-scroll text-center">
          <span className="inline-block text-kamp-accent font-semibold mb-2 text-sm">
            {getContentBlock('gallery_title')?.title || 'Галерея'}
          </span>
          <h2 className="text-kamp-dark text-xl md:text-4xl mb-4">
            {getContentBlock('gallery_title')?.content || 'Моменты КЭМП'}
          </h2>
          <p className="text-gray-700 text-xs md:text-base max-w-3xl mx-auto">
            {getContentBlock('gallery_subtitle')?.content || 
            'Путешествие преображения: реальные моменты из жизни участников нашего клуба'}
          </p>
        </div>

        {moments.length > 0 ? (
          <div className="mt-8 md:mt-16">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
              {moments.map((moment) => (
                <div
                  key={moment.id}
                  className="relative aspect-square overflow-hidden rounded-lg cursor-pointer hover-lift reveal-on-scroll"
                  onClick={() => setSelectedMedia(moment)}
                >
                  <img
                    src={moment.image_url}
                    alt={moment.title || `Момент КЭМП ${moment.id}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-110"
                  />
                  
                  {moment.video_url && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                        <Play className="w-6 h-6 text-white ml-1" />
                      </div>
                    </div>
                  )}

                  {moment.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-white text-xs font-medium truncate">
                        {moment.title}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 mt-8 md:mt-16">
            <div className="text-gray-400 mb-4">
              <span className="text-6xl">📷</span>
            </div>
            <h3 className="text-xl font-semibold text-kamp-dark mb-2">Галерея скоро заполнится</h3>
            <p className="text-gray-600 text-sm">
              Мы добавляем фотографии и видео из жизни клуба
            </p>
          </div>
        )}
      </div>

      {/* Модальное окно для просмотра медиа */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button 
              onClick={() => setSelectedMedia(null)}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 z-10 transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="relative rounded-lg overflow-hidden bg-black">
              {selectedMedia.video_url ? (
                <video
                  src={selectedMedia.video_url}
                  controls
                  autoPlay
                  className="w-full max-h-[80vh] object-contain"
                />
              ) : (
                <img
                  src={selectedMedia.image_url}
                  alt={selectedMedia.title || 'Момент КЭМП'}
                  className="w-full max-h-[80vh] object-contain"
                />
              )}

              {(selectedMedia.title || selectedMedia.description) && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                  {selectedMedia.title && (
                    <h3 className="text-white text-xl font-bold mb-2">
                      {selectedMedia.title}
                    </h3>
                  )}
                  {selectedMedia.description && (
                    <p className="text-gray-300 text-sm md:text-base">
                      {selectedMedia.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};