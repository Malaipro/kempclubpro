import React, { useState } from 'react';
import { Button } from './ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Users, Book, Dumbbell, Award } from 'lucide-react';
export const AboutUs: React.FC = () => {
  const isMobile = useIsMobile();
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const scrollToProgram = () => {
    const programSection = document.getElementById('program');
    if (programSection) {
      programSection.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };
  const features = [{
    icon: <Users className="w-5 h-5 md:w-6 md:h-6 text-kamp-primary" />,
    title: "Окружение",
    description: "Мужчины, которые разделяют твои ценности и стремление к развитию. Здесь поддерживают, делятся опытом и помогают двигаться вперёд."
  }, {
    icon: <Book className="w-5 h-5 md:w-6 md:h-6 text-kamp-primary" />,
    title: "Развитие",
    description: "Системная работа над телом, мышлением и привычками. Каждый новый этап помогает закреплять достигнутое и ставить более высокие цели."
  }, {
    icon: <Dumbbell className="w-5 h-5 md:w-6 md:h-6 text-kamp-primary" />,
    title: "Испытания",
    description: "Выход за привычные границы через физические и интеллектуальные вызовы. Возможность проверить свои решения, выдержку и готовность действовать."
  }, {
    icon: <Award className="w-5 h-5 md:w-6 md:h-6 text-kamp-primary" />,
    title: "Лидерство",
    description: "Умение брать ответственность за себя и команду. Возможность проявлять инициативу, поддерживать товарищей и становиться опорой для других."
  }];

  // Пирамида КЭМПа — серьёзная тёмная гамма: красная вершина, ниже — графит
  const diltsLevels = [{
    level: "Миссия",
    description: "Зачем живу",
    color: "bg-kamp-primary",
    border: "border-kamp-primary/60",
    info: "Высшая цель и смысл существования"
  }, {
    level: "Идентичность",
    description: "Кто я такой",
    color: "bg-[#3a1a1a]",
    border: "border-kamp-primary/40",
    info: "Самоопределение и понимание своей роли"
  }, {
    level: "Убеждения",
    description: "Во что я верю",
    color: "bg-[#2e2e32]",
    border: "border-gray-600/50",
    info: "Ценности и принципы, которые направляют жизнь"
  }, {
    level: "Способности",
    description: "Как я выбираю",
    color: "bg-[#29292d]",
    border: "border-gray-600/40",
    info: "Навыки принятия решений и стратегического мышления"
  }, {
    level: "Поведение",
    description: "Что я делаю",
    color: "bg-[#242428]",
    border: "border-gray-700/40",
    info: "Конкретные действия и привычки для достижения целей"
  }, {
    level: "Окружение",
    description: "Что я имею",
    color: "bg-[#1f1f23]",
    border: "border-gray-700/30",
    info: "Физические ресурсы, связи, возможности"
  }];
  return <section id="about" className="kamp-section bg-kamp-light border-t-4 border-kamp-primary">
      <div className="kamp-container">
        <div className="section-heading reveal-on-scroll max-w-3xl mx-auto">
          <span className="inline-block text-kamp-accent font-semibold mb-2 uppercase tracking-wider">О клубе</span>
          <h2 className="text-white mb-4">Больше, чем тренировки</h2>
          <p className="text-balance text-gray-300 max-w-2xl mx-auto">
            КЭМП — закрытое мужское сообщество. Здесь формируются дисциплина, 
            сильное окружение и привычка развиваться постоянно.
          </p>
        </div>

        <div className="mt-8 md:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 reveal-on-scroll">
          {features.map((feature, index) => <div key={index} className="bg-[#222226] border border-gray-700/50 p-4 md:p-6 rounded-lg hover:border-kamp-primary/50 transition-all duration-300 flex flex-col h-full">
              <div className="flex flex-col items-center mb-4">
                <div className="flex-shrink-0 mb-2">
                  {feature.icon}
                </div>
                <h3 className="text-white font-semibold text-center w-full truncate px-2 text-sm md:text-base">{feature.title}</h3>
              </div>
              <p className="text-gray-400 text-xs md:text-sm flex-grow text-center">{feature.description}</p>
            </div>)}
        </div>

        <p className="mt-10 md:mt-16 max-w-3xl mx-auto text-center text-gray-300 text-sm md:text-lg leading-relaxed">
          Сила начинается не только с физической подготовки. В КЭМП мы работаем с тем, что определяет поступки мужчины: его убеждениями, ценностями, целями и пониманием собственного пути. Для этого создана <span className="text-white font-semibold">Пирамида КЭМП</span> — инструмент осознанного развития.
        </p>

        <div className="mt-8 md:mt-16 reveal-on-scroll">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-center">
            <div className="text-left mb-8 md:mb-0 order-2 md:order-1 bg-[#222226] border border-gray-700 p-4 md:p-10 rounded-md">
              <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white border-l-4 border-kamp-primary pl-4">
                Психологический профиль клуба
              </h3>
              <p className="text-gray-300 mb-4 text-sm md:text-base">
                В основе методологии КЭМП лежит пирамида КЭМПа — мощный инструмент для 
                системного развития личности через логические уровни мышления.
              </p>
              <p className="text-gray-300 mb-4 text-sm md:text-base">
                Мы работаем с каждым уровнем сознания: от материального окружения до высшей миссии. 
                Это позволяет участникам не просто тренироваться, а осознанно трансформировать свою жизнь, 
                развивая лидерские качества и внутреннюю силу.
              </p>
              <p className="text-gray-300 mb-6 text-sm md:text-base">
                Каждое занятие в клубе направлено на проработку определенного уровня, 
                что обеспечивает комплексное развитие личности современного мужчины.
              </p>
              
              {!isMobile && <Button onClick={scrollToProgram} className="bg-kamp-primary hover:bg-kamp-primary/90 text-white mt-6">
                  Узнать больше
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Button>}
            </div>
            
            <div className="flex justify-center order-1 md:order-2">
              <div className="relative w-full max-w-[400px]">
                <h4 className="text-center text-white font-bold mb-6 text-lg md:text-xl">Пирамида КЭМПа</h4>
                <div className="space-y-2">
                  {diltsLevels.map((level, index) => <div key={index} className={`${level.color} border ${level.border} text-white p-3 md:p-4 rounded-sm shadow-lg transform transition-all duration-300 hover:border-kamp-primary/70 cursor-pointer ${activeLevel === index ? 'ring-1 ring-kamp-primary' : ''}`} style={{
                  marginLeft: `${(diltsLevels.length - 1 - index) * (isMobile ? 8 : 16)}px`,
                  marginRight: `${(diltsLevels.length - 1 - index) * (isMobile ? 8 : 16)}px`
                }} onClick={() => setActiveLevel(activeLevel === index ? null : index)} onMouseEnter={() => !isMobile && setActiveLevel(index)} onMouseLeave={() => !isMobile && setActiveLevel(null)}>
                      <div className="text-center">
                        <div className="font-bold text-sm md:text-base uppercase tracking-wider">{level.level}</div>
                        <div className="text-xs md:text-sm text-gray-400">{level.description}</div>
                        {activeLevel === index && <div className="text-xs md:text-sm mt-2 bg-black/20 rounded p-2 animate-fade-in">
                            {level.info}
                          </div>}
                      </div>
                    </div>)}
                </div>
                <p className="text-center text-gray-400 text-xs md:text-sm mt-4">
                  Наведите курсор на уровень, чтобы узнать больше
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};