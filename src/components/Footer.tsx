
import React from 'react';
import { Phone, MapPin, MessageCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export const Footer: React.FC = () => {
  const isMobile = useIsMobile();
  
  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      window.scrollTo({
        top: section.offsetTop - 100,
        behavior: 'smooth'
      });
    }
  };

  const menuItems = [
    { id: 'about', label: 'О нас' },
    { id: 'program', label: 'Программа' },
    { id: 'trainers', label: 'Тренеры' },
    { id: 'leaderboard', label: 'Рейтинг' },
    { id: 'contact', label: 'Контакты' }
  ];

  const programItems = [
    { label: 'Кикбоксинг' },
    { label: 'Джиу-джитсу' },
    { label: 'Выездные испытания' },
    { label: 'Реабилитация' },
    { label: 'Пробежки и закаливание' }
  ];

  if (isMobile) {
    return (
      <footer className="bg-gray-900 text-white text-xs">
        <div className="kamp-container py-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} 
                className="text-base font-display font-bold"
              >
                КЭМП
              </a>
              <p className="mt-1 text-gray-400 text-[10px]">
                Клуб Эффективного Мужского Прогресса — интенсивная программа для тех, 
                кто готов пройти испытания и стать сильнее.
              </p>
              <div className="flex space-x-2 mt-2">
                <a 
                  href="https://t.me/Dmitriy116" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 p-1 rounded-full transition-colors flex items-center justify-center"
                  aria-label="Telegram"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send">
                    <path d="m22 2-7 20-4-9-9-4Z"></path>
                    <path d="M22 2 11 13"></path>
                  </svg>
                </a>
                <a 
                  href="https://wa.me/79673785151" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 p-1 rounded-full transition-colors flex items-center justify-center"
                  aria-label="WhatsApp"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.485 3.488"/>
                  </svg>
                </a>
                <a 
                  href="https://vk.com/kemp_ryx" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 p-1 rounded-full transition-colors flex items-center justify-center"
                  aria-label="VKontakte"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-.907-1.734-.907-.354 0-.453.1-.453.574v1.575c0 .424-.135.677-1.252.677-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.1-.488.574-.488h1.744c.424 0 .584.135.744.574.8 2.254 2.101 4.862 2.635 4.862.203 0 .305-.093.305-.608V9.72c-.068-1.186-.695-1.287-.695-1.71 0-.204.169-.407.441-.407h2.729c.356 0 .492.186.492.57v3.473c0 .356.16.491.254.491.203 0 .407-.135.813-.542 1.237-1.382 2.117-3.473 2.117-3.473.119-.254.322-.488.746-.488h1.744c.508 0 .625.254.508.677-.254 1.072-2.363 3.727-2.363 3.727-.203.305-.271.44 0 .813.203.271.864.847 1.295 1.364.744.847 1.320 1.558 1.464 2.05.169.508-.085.779-.576.779z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-bold mt-2 mb-1">Навигация</h3>
              <ul className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                {menuItems.map((item) => (
                  <li key={item.id} className="text-[10px]">
                    <button 
                      onClick={() => scrollToSection(item.id)} 
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-xs font-bold mt-2 mb-1">Контакты</h3>
              <ul className="space-y-1">
                <li className="flex">
                  <Phone size={10} className="mr-1 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px]">89673785151</span>
                </li>
                <li className="flex">
                  <MapPin size={10} className="mr-1 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px]">ул. Павлюхина 108б к2, г. Казань</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-3 pt-2 flex flex-col items-center">
            <p className="text-gray-500 text-[9px]">
              © {new Date().getFullYear()} КЭМП. Все права защищены.
            </p>
            <div className="mt-1 flex space-x-3">
              <a href="#" className="text-gray-500 hover:text-gray-300 text-[9px]">
                Политика конфиденциальности
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-300 text-[9px]">
                Условия использования
              </a>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-gray-900 text-white">
      <div className="kamp-container py-8">
        <div className="grid md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="text-xl font-display font-bold"
            >
              КЭМП
            </a>
            <p className="mt-2 text-gray-400 text-sm">
              Клуб Эффективного Мужского Прогресса — интенсивная программа для тех, 
              кто готов пройти испытания и стать сильнее.
            </p>
            <div className="flex space-x-3 mt-3">
              <a 
                href="https://t.me/Dmitriy116" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors flex items-center justify-center"
                aria-label="Telegram"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send">
                  <path d="m22 2-7 20-4-9-9-4Z"></path>
                  <path d="M22 2 11 13"></path>
                </svg>
              </a>
              <a 
                href="https://wa.me/79673785151" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors flex items-center justify-center"
                aria-label="WhatsApp"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.485 3.488"/>
                </svg>
              </a>
              <a 
                href="https://vk.com/kemp_ryx" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors flex items-center justify-center"
                aria-label="VKontakte"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-.907-1.734-.907-.354 0-.453.1-.453.574v1.575c0 .424-.135.677-1.252.677-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.1-.488.574-.488h1.744c.424 0 .584.135.744.574.8 2.254 2.101 4.862 2.635 4.862.203 0 .305-.093.305-.608V9.72c-.068-1.186-.695-1.287-.695-1.71 0-.204.169-.407.441-.407h2.729c.356 0 .492.186.492.57v3.473c0 .356.16.491.254.491.203 0 .407-.135.813-.542 1.237-1.382 2.117-3.473 2.117-3.473.119-.254.322-.488.746-.488h1.744c.508 0 .625.254.508.677-.254 1.072-2.363 3.727-2.363 3.727-.203.305-.271.44 0 .813.203.271.864.847 1.295 1.364.744.847 1.320 1.558 1.464 2.05.169.508-.085.779-.576.779z"/>
                </svg>
              </a>
            </div>
          </div>
          
          <div className="md:col-span-1">
            <h3 className="text-base font-bold mb-2">Навигация</h3>
            <ul className="space-y-1.5">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button 
                    onClick={() => scrollToSection(item.id)} 
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="md:col-span-1">
            <h3 className="text-base font-bold mb-2">Программы</h3>
            <ul className="space-y-1.5">
              {programItems.map((item, index) => (
                <li key={index}>
                  <button 
                    onClick={() => scrollToSection('program')} 
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="md:col-span-1">
            <h3 className="text-base font-bold mb-2">Контакты</h3>
            <ul className="space-y-2">
              <li className="flex">
                <Phone size={16} className="mr-2 text-gray-400 flex-shrink-0" />
                <span className="text-gray-400 text-sm">89673785151</span>
              </li>
              <li className="flex">
                <MapPin size={16} className="mr-2 text-gray-400 flex-shrink-0" />
                <span className="text-gray-400 text-sm">ул. Павлюхина 108б к2, г. Казань</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-6 pt-4 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} КЭМП. Все права защищены.
          </p>
          <div className="mt-2 md:mt-0 flex space-x-4">
            <a href="#" className="text-gray-500 hover:text-gray-300 text-xs">
              Политика конфиденциальности
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-300 text-xs">
              Условия использования
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
