import React from 'react';
import { AchievementSystem } from './AchievementSystem';
import { DirectionProgress } from './DirectionProgress';
import { SpecialBadges } from './SpecialBadges';
import { AchievementStats } from './AchievementStats';
import { BeadBracelet } from './BeadBracelet';
export const Achievements: React.FC = () => {
  return <section id="achievements" className="kamp-section bg-black">
      <div className="kamp-container space-y-12">
        {/* Section Header */}
        

        {/* Achievement Stats */}
        <AchievementStats />

        {/* Bead Bracelet Visualization */}
        <BeadBracelet />

        {/* Direction Progress */}
        <DirectionProgress />

        {/* Achievement System */}
        <AchievementSystem />

        {/* Special Badges */}
        <SpecialBadges />
      </div>
    </section>;
};
export * from './AchievementSystem';
export * from './DirectionProgress';
export * from './SpecialBadges';
export * from './AchievementStats';
export * from './BeadBracelet';