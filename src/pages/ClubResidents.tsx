import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/Layout';
import { ClubResidentsList } from '@/components/participants/ClubResidentsList';

const ClubResidents = () => {
  return (
    <Layout>
      <Helmet>
        <title>Резиденты клуба КЭМП — мужское братство дисциплины и выносливости</title>
        <meta name="description" content="Резиденты закрытого мужского клуба КЭМП: единомышленники, прошедшие интенсив, тренировки и испытания. Братство дисциплины, выносливости и лидерства." />
        <link rel="canonical" href="https://kempclub.pro/club-residents" />
        <meta property="og:title" content="Резиденты клуба КЭМП — мужское братство" />
        <meta property="og:description" content="Закрытое сообщество мужчин, прошедших путь дисциплины и испытаний в клубе КЭМП." />
        <meta property="og:url" content="https://kempclub.pro/club-residents" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen py-20 md:py-24">
        <ClubResidentsList />
      </div>
    </Layout>
  );
};

export default ClubResidents;
