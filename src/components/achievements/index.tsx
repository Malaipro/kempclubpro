import React from 'react';
import { DirectionProgress } from './DirectionProgress';
import { SpecialBadges } from './SpecialBadges';
import { AchievementStats } from './AchievementStats';
import { BeadBracelet } from './BeadBracelet';

export const Achievements: React.FC = () => {
  return (
    <section id="achievements" className="kamp-section bg-black">
      <div className="kamp-container space-y-12">
        {/* Section Header */}
        <div className="section-heading">
          <h2 className="text-gradient">Система достижений КЭМП</h2>
          <p>Отслеживайте свой прогресс и получайте награды за достижения</p>
        </div>

        {/* Achievement Stats */}
        <AchievementStats />

        {/* Bead Bracelet Visualization */}
        <BeadBracelet />

        {/* Direction Progress */}
        <DirectionProgress />

        {/* Special Badges */}
        <SpecialBadges />
      </div>
    </section>
  );
};

export * from './DirectionProgress';
export * from './SpecialBadges';
export * from './AchievementStats';
export * from './BeadBracelet';