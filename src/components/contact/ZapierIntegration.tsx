
import React, { useState } from 'react';
import { Settings, ExternalLink, Info } from 'lucide-react';
import { toast } from 'sonner';

interface ZapierIntegrationProps {
  onWebhookUrlChange: (url: string) => void;
  webhookUrl: string;
}

export const ZapierIntegration: React.FC<ZapierIntegrationProps> = ({
  onWebhookUrlChange,
  webhookUrl
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    onWebhookUrlChange(url);
    
    // Сохраняем URL в localStorage для удобства
    if (url) {
      localStorage.setItem('zapierWebhookUrl', url);
    } else {
      localStorage.removeItem('zapierWebhookUrl');
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl) {
      toast.error("Введите URL вебхука Zapier");
      return;
    }

    try {
      const testData = {
        name: "Тестовая заявка",
        phone: "+7 (999) 123-45-67",
        social: "@test_user",
        course: "male",
        source: "КЭМП - Клуб Эффективного Мужского Прогресса",
        timestamp: new Date().toISOString(),
        website: "https://kempclub.pro",
        test: true
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      if (response.ok) {
        toast.success("Тестовая заявка успешно отправлена в Zapier!");
      } else {
        toast.error("Ошибка при отправке тестовой заявки");
      }
    } catch (error) {
      toast.error("Не удалось отправить тестовую заявку");
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-kamp-primary" />
          <span className="text-white font-medium">Zapier Integration</span>
          <span className={`text-xs px-2 py-1 rounded ${webhookUrl ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
            {webhookUrl ? 'Настроено' : 'Не настроено'}
          </span>
        </div>
        <div className="text-gray-400">
          {isExpanded ? '▼' : '▶'}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Как настроить Zapier:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Создайте новый Zap в Zapier</li>
                  <li>Выберите "Webhooks by Zapier" как триггер</li>
                  <li>Выберите "Catch Hook" и скопируйте URL</li>
                  <li>Вставьте URL в поле ниже</li>
                  <li>Настройте действие (например, создание лида в CRM)</li>
                </ol>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL вебхука Zapier
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={handleUrlChange}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-kamp-primary focus:border-transparent"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={testWebhook}
              disabled={!webhookUrl}
              className="flex-1 bg-kamp-primary hover:bg-kamp-primary/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Тестировать
            </button>
            <a
              href="https://zapier.com/apps/webhook/integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Zapier</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
