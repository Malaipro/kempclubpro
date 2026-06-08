
import React, { useEffect, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Hero } from '@/components/Hero';
import { AboutUs } from '@/components/AboutUs';
import { Program } from '@/components/Program';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

// Below-the-fold sections are code-split to keep the initial bundle small
const Trainers = lazy(() => import('@/components/Trainers').then(m => ({ default: m.Trainers })));
const FounderInterview = lazy(() => import('@/components/FounderInterview').then(m => ({ default: m.FounderInterview })));
const Leaderboard = lazy(() => import('@/components/leaderboard').then(m => ({ default: m.Leaderboard })));
const AllParticipantsProgress = lazy(() => import('@/components/AllParticipantsProgress').then(m => ({ default: m.AllParticipantsProgress })));
const RegisteredParticipants = lazy(() => import('@/components/participants').then(m => ({ default: m.RegisteredParticipants })));
const Achievements = lazy(() => import('@/components/achievements').then(m => ({ default: m.Achievements })));
const Testimonials = lazy(() => import('@/components/Testimonials').then(m => ({ default: m.Testimonials })));
const PhotoGallery = lazy(() => import('@/components/PhotoGallery').then(m => ({ default: m.PhotoGallery })));
const ContactForm = lazy(() => import('@/components/ContactForm').then(m => ({ default: m.ContactForm })));
const TrialTrainingCTA = lazy(() => import('@/components/TrialTrainingCTA').then(m => ({ default: m.TrialTrainingCTA })));

const SectionFallback = () => <div className="min-h-[200px]" aria-hidden="true" />;

const Index = () => {
  useEffect(() => {
    // Set title in Russian
    document.title = 'КЭМП - Клуб Эффективного Мужского Прогресса';
    
    // Add meta description for SEO and social networks
    const metaDescription = document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'Вступай в клуб выносливости, дисциплины и лидерства. Тренировки по кикбоксингу, джиу-джитсу, выездные испытания, закаливание и реальные вызовы.';
    document.head.appendChild(metaDescription);
    
    // Add viewport meta tag for improved mobile experience
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(viewportMeta);
  }, []);

  return (
    <Layout>
      <Hero />
      <AboutUs />
      <Program />
      <Suspense fallback={<SectionFallback />}>
        <TrialTrainingCTA />
        <Trainers />
        <FounderInterview />
        <PhotoGallery />
        <Testimonials />
        <AllParticipantsProgress />
        <Leaderboard />
        <RegisteredParticipants />
        <Achievements />
        <ContactForm />
      </Suspense>
      
      {/* Fixed Personal Cabinet Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link to="/dashboard">
          <Button 
            size="lg"
            className="bg-kamp-accent hover:bg-kamp-accent/90 text-black font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-full px-6 py-3"
          >
            <User className="w-5 h-5 mr-2" />
            Личный кабинет
          </Button>
        </Link>
      </div>
    </Layout>
  );
};

export default Index;
