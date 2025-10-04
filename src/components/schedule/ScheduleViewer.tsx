import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntensiveScheduleViewer } from "./IntensiveScheduleViewer";
import { ClubScheduleViewer } from "./ClubScheduleViewer";
import { Calendar } from "lucide-react";

export const ScheduleViewer: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Расписание
        </h2>
        <p className="text-muted-foreground">Расписание интенсива и мужского клуба</p>
      </div>

      <Tabs defaultValue="intensive" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="intensive">Интенсив</TabsTrigger>
          <TabsTrigger value="club">Мужской клуб</TabsTrigger>
        </TabsList>
        
        <TabsContent value="intensive" className="mt-6">
          <IntensiveScheduleViewer />
        </TabsContent>
        
        <TabsContent value="club" className="mt-6">
          <ClubScheduleViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};
