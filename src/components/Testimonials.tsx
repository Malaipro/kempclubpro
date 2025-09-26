import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

interface Testimonial {
  id: string;
  participant_name: string;
  participant_title?: string;
  content: string;
  video_url?: string;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
}

export const Testimonials: React.FC = () => {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [mutedStatus, setMutedStatus] = useState<{ [key: string]: boolean }>({});
  const [openVideo, setOpenVideo] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const modalVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // Загружаем отзывы из базы данных
  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  // Загружаем динамический контент для заголовков
  const { data: contentBlocks = [] } = useQuery({
    queryKey: ['content-blocks-testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
        .in('block_key', ['testimonials_title', 'testimonials_subtitle'])
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const getContentBlock = (key: string) => {
    return contentBlocks.find(block => block.block_key === key);
  };

  // Инициализируем состояние звука
  React.useEffect(() => {
    if (testimonials.length > 0) {
      const initialMutedStatus = testimonials.reduce((acc, testimonial) => {
        acc[testimonial.id] = true;
        return acc;
      }, {} as { [key: string]: boolean });
      setMutedStatus(initialMutedStatus);
    }
  }, [testimonials]);

  const handlePlayPause = (testimonialId: string) => {
    const video = videoRefs.current[testimonialId];
    if (!video) return;

    if (playingVideo === testimonialId) {
      video.pause();
      setPlayingVideo(null);
    } else {
      // Останавливаем все другие видео
      Object.values(videoRefs.current).forEach((v) => {
        if (v) v.pause();
      });
      video.currentTime = 0;
      video.play();
      setPlayingVideo(testimonialId);
    }
  };

  const handleMute = (testimonialId: string) => {
    const video = videoRefs.current[testimonialId];
    if (!video) return;
    
    const newMutedState = !mutedStatus[testimonialId];
    video.muted = newMutedState;
    setMutedStatus(prev => ({
      ...prev,
      [testimonialId]: newMutedState
    }));
  };

  const handleVideoEnd = (testimonialId: string) => {
    setPlayingVideo(null);
  };

  const openVideoModal = (testimonialId: string) => {
    setOpenVideo(testimonialId);
    const modalVideo = modalVideoRefs.current[testimonialId];
    if (modalVideo) {
      modalVideo.currentTime = 0;
      modalVideo.play();
    }
  };

  const closeVideoModal = () => {
    if (openVideo) {
      const modalVideo = modalVideoRefs.current[openVideo];
      if (modalVideo) {
        modalVideo.pause();
      }
    }
    setOpenVideo(null);
  };

  if (isLoading) {
    return (
      <section id="testimonials" className="kamp-section bg-black py-4 md:py-16">
        <div className="kamp-container flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kamp-primary"></div>
        </div>
      </section>
    );
  }

  return (
    <section id="testimonials" className="kamp-section bg-black py-4 md:py-16">
      <div className="kamp-container">
        <div className="section-heading reveal-on-scroll text-center">
          <span className="inline-block text-kamp-primary font-semibold mb-2 text-sm">
            {getContentBlock('testimonials_title')?.title || 'Отзывы участников'}
          </span>
          <h2 className="text-white text-xl md:text-4xl mb-4">
            {getContentBlock('testimonials_title')?.content || 'Отзывы участников'}
          </h2>
          <p className="text-gray-300 text-xs md:text-base max-w-3xl mx-auto">
            {getContentBlock('testimonials_subtitle')?.content || 
            'Узнайте, что говорят наши выпускники о программе КЭМП и как она изменила их жизнь'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mt-8 md:mt-16">
          {testimonials.map((testimonial) => (
            <Card 
              key={testimonial.id}
              className="overflow-hidden bg-gray-900 border border-gray-700 reveal-on-scroll hover-lift"
            >
              <div className="relative">
                {testimonial.video_url ? (
                  <div className="relative aspect-video bg-gray-800">
                    <video
                      ref={(el) => { videoRefs.current[testimonial.id] = el; }}
                      src={testimonial.video_url}
                      className="w-full h-full object-cover"
                      muted={mutedStatus[testimonial.id]}
                      onEnded={() => handleVideoEnd(testimonial.id)}
                      onClick={() => openVideoModal(testimonial.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <button 
                        onClick={() => handlePlayPause(testimonial.id)}
                        className="bg-kamp-primary hover:bg-kamp-primary/90 rounded-full p-4 transition-all duration-300 shadow-lg"
                      >
                        {playingVideo === testimonial.id ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white ml-1" />
                        )}
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => handleMute(testimonial.id)}
                      className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-all duration-300"
                    >
                      {mutedStatus[testimonial.id] ? (
                        <VolumeX className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                ) : testimonial.image_url ? (
                  <div className="aspect-video bg-gray-800">
                    <img 
                      src={testimonial.image_url}
                      alt={testimonial.participant_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-800 flex items-center justify-center">
                    <div className="w-16 h-16 bg-kamp-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-kamp-primary text-xl font-bold">
                        {testimonial.participant_name.charAt(0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <CardContent className="p-4 md:p-6">
                <div className="text-center">
                  <h3 className="text-white text-lg md:text-xl font-bold mb-2">
                    {testimonial.participant_name}
                  </h3>
                  {testimonial.participant_title && (
                    <p className="text-kamp-primary text-sm md:text-base font-medium mb-4">
                      {testimonial.participant_title}
                    </p>
                  )}
                  <blockquote className="text-gray-300 text-sm md:text-base italic leading-relaxed">
                    "{testimonial.content}"
                  </blockquote>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {testimonials.length === 0 && (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <span className="text-6xl">💬</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Отзывы скоро появятся</h3>
            <p className="text-gray-400 text-sm">
              Мы добавляем отзывы наших участников
            </p>
          </div>
        )}
      </div>

      {/* Модальное окно для полноэкранного видео */}
      {openVideo && (
        <Dialog open={!!openVideo} onOpenChange={(open) => !open && closeVideoModal()}>
          <DialogContent className="max-w-4xl w-full p-0 bg-black border-0">
            <div className="relative aspect-video">
              <video
                ref={(el) => { modalVideoRefs.current[openVideo] = el; }}
                src={testimonials.find(t => t.id === openVideo)?.video_url}
                className="w-full h-full object-contain"
                controls
                autoPlay
              />
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                  onClick={closeVideoModal}
                >
                  ✕
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
};