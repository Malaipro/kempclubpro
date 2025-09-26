
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Hero } from '@/components/Hero';
import { AboutUs } from '@/components/AboutUs';
import { Program } from '@/components/Program';
import { Trainers } from '@/components/Trainers';
import { Leaderboard } from '@/components/leaderboard';
import { AllParticipantsProgress } from '@/components/AllParticipantsProgress';
import { RegisteredParticipants } from '@/components/participants';
import { Achievements } from '@/components/achievements';
import { Testimonials } from '@/components/Testimonials';
import { PhotoGallery } from '@/components/PhotoGallery';
import { ContactForm } from '@/components/ContactForm';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

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
      <Trainers />
      <PhotoGallery />
      <Testimonials />
      <AllParticipantsProgress />
      <Leaderboard />
      <RegisteredParticipants />
      <Achievements />
      <ContactForm />
      
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
