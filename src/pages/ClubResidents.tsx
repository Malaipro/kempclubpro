import React from 'react';
import { Layout } from '@/components/Layout';
import { ClubResidentsList } from '@/components/participants/ClubResidentsList';

const ClubResidents = () => {
  return (
    <Layout>
      <div className="min-h-screen py-20 md:py-24">
        <ClubResidentsList />
      </div>
    </Layout>
  );
};

export default ClubResidents;
