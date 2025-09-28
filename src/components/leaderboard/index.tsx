import React from 'react';
import { SecureLeaderboard } from './SecureLeaderboard';
import { DetailedLeaderboard } from './DetailedLeaderboard';

export const Leaderboard: React.FC = () => {
  return (
    <section id="leaderboard" className="kamp-section bg-kamp-secondary py-4 md:py-16">
      <div className="kamp-container">
        <div className="section-heading reveal-on-scroll">
          <span className="inline-block text-kamp-accent font-semibold mb-1 text-sm md:text-base">Лидерборд</span>
          <h2 className="text-kamp-dark text-xl md:text-3xl">Соревнуйся и побеждай</h2>
          <p className="text-gray-400 text-sm md:text-base">
            Система рейтинга участников клуба
          </p>
        </div>
        
        <div className="mt-8">
          <DetailedLeaderboard />
        </div>
      </div>
    </section>
  );
};