import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, TrendingUp, Plus } from 'lucide-react';

export const EnhancedCooperTest: React.FC = () => {
  const [activeTab, setActiveTab] = useState('test1');

  const TestCard = ({ title, count, children }: { title: string; count: number; children?: React.ReactNode }) => (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Zap className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-medium">{title} ({count})</h3>
      </div>
      {children || (
        <div className="text-center py-8 text-muted-foreground">
          <p>Нет результатов для {title.toLowerCase()}</p>
        </div>
      )}
    </Card>
  );

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-5 h-5 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">Тест Купера</h2>
      </div>
      <p className="text-gray-400 mb-6">Управление результатами всех участников (4 круга в зале)</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800 mb-6">
          <TabsTrigger value="test1" className="text-white data-[state=active]:bg-destructive data-[state=active]:text-white">
            <Zap className="w-4 h-4 mr-2" />
            Тест 1 (0)
          </TabsTrigger>
          <TabsTrigger value="test2" className="text-white data-[state=active]:bg-destructive data-[state=active]:text-white">
            <TrendingUp className="w-4 h-4 mr-2" />
            Тест 2 (0)
          </TabsTrigger>
          <TabsTrigger value="test3" className="text-white data-[state=active]:bg-destructive data-[state=active]:text-white">
            <Plus className="w-4 h-4 mr-2" />
            Тест 3 (0)
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
          <TabsTrigger 
            value="test2" 
            className="flex items-center gap-2 data-[state=active]:bg-white"
          >
            <Zap className="w-4 h-4" />
            Тест 2 (0)
          </TabsTrigger>
          <TabsTrigger 
            value="comparison" 
            className="flex items-center gap-2 data-[state=active]:bg-white"
          >
            <TrendingUp className="w-4 h-4" />
            Сравнение (0)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test1" className="mt-6">
          <TestCard title="Тест 1" count={0} />
        </TabsContent>

        <TabsContent value="test2" className="mt-6">
          <TestCard title="Тест 2" count={0} />
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <TestCard title="Сравнение" count={0} />
        </TabsContent>
      </Tabs>
    </div>
  );
};