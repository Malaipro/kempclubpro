import React, { useState } from 'react';
import { ExternalLink, Smartphone, Share, PlusSquare, MoreVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import appScreen from '@/assets/app-home-athlete.jpg';

const APP_URL = 'https://kemp-app.ru/app';

export const AppPromo: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <section id="app" className="kamp-section bg-[#121212] border-t border-gray-800 overflow-hidden">
      <div className="kamp-container grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className="text-center md:text-left order-2 md:order-1">
          <span className="inline-block text-kamp-primary font-semibold mb-2 uppercase tracking-[0.2em] text-xs md:text-sm">Всегда под рукой</span>
          <h2 className="text-white font-display mb-4">Приложение КЭМП</h2>
          <p className="text-gray-300 max-w-lg mx-auto md:mx-0">
            Личный кабинет, расписание, чат с командой, нутрициолог и трекер прогресса — всё в одном месте.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-md bg-kamp-primary px-6 py-3.5 font-bold text-white hover:bg-kamp-primary/90 transition-colors">
              Открыть приложение <ExternalLink className="w-4 h-4" />
            </a>
            <button onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-md border border-kamp-primary px-6 py-3.5 font-bold text-white hover:bg-kamp-primary/10 transition-colors">
              <Smartphone className="w-4 h-4" /> Добавить на экран
            </button>
          </div>
        </div>

        <div className="order-1 md:order-2 flex justify-center">
          <div className="relative w-[230px] sm:w-[260px] aspect-[9/19] rounded-[2.5rem] border-[10px] border-[#1d1d1d] bg-black shadow-[0_30px_80px_-20px_rgba(230,0,0,0.45)] ring-1 ring-gray-700 overflow-hidden">
            <span aria-hidden="true" className="absolute top-2 left-1/2 -translate-x-1/2 z-10 h-5 w-20 rounded-full bg-black" />
            <img src={appScreen} alt="Главный экран приложения КЭМП" width={1536} height={1024} loading="lazy" className="absolute inset-x-0 top-0 h-[45%] w-full object-cover" />
            <div className="absolute inset-x-0 top-[28%] px-4">
              <p className="text-2xl font-display font-extrabold text-white">КЭМП</p>
              <p className="text-[9px] tracking-[0.2em] text-gray-300">СИЛЬНЕЕ КАЖДЫЙ ДЕНЬ</p>
            </div>
            <div className="absolute inset-x-0 top-[47%] bottom-12 px-3 grid grid-cols-3 gap-1.5 content-start">
              {['Чат', 'Расписание', 'Рейтинг', 'Нутрициолог', 'Аскезы', 'Магазин'].map((t) => (
                <div key={t} className="aspect-square rounded-md bg-[#1d1d1d] border border-gray-800 flex items-end p-1.5 text-[8px] font-semibold text-white">{t}</div>
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-11 border-t border-gray-800 bg-[#1f1f1f] flex items-center justify-around text-[8px] text-gray-500">
              <span className="text-kamp-primary">Главная</span><span>Расписание</span><span>Чат</span><span>Профиль</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#1d1d1d] border-gray-700 text-white">
          <DialogHeader><DialogTitle className="text-white">Добавить КЭМП на экран</DialogTitle></DialogHeader>
          <div className="space-y-5 text-sm text-gray-300">
            <div>
              <p className="font-bold text-white mb-2">iPhone (Safari)</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Откройте <a href={APP_URL} className="text-kamp-primary underline">kemp-app.ru/app</a> в Safari</li>
                <li className="flex-inline">Нажмите «Поделиться» <Share className="inline w-4 h-4" /></li>
                <li>Выберите «На экран „Домой“» <PlusSquare className="inline w-4 h-4" /></li>
              </ol>
            </div>
            <div>
              <p className="font-bold text-white mb-2">Android (Chrome)</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Откройте <a href={APP_URL} className="text-kamp-primary underline">kemp-app.ru/app</a> в Chrome</li>
                <li>Нажмите меню <MoreVertical className="inline w-4 h-4" /></li>
                <li>Выберите «Добавить на главный экран»</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
