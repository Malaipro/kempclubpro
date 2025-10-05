import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntensiveScheduleViewer } from "./IntensiveScheduleViewer";
import { ClubScheduleViewer } from "./ClubScheduleViewer";
import { Calendar } from "lucide-react";

interface ScheduleViewerProps {
  isClubResident?: boolean;
}

export const ScheduleViewer: React.FC<ScheduleViewerProps> = ({ isClubResident = false }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Расписание
        </h2>
        <p className="text-muted-foreground">
          {isClubResident ? "Расписание интенсива и мужского клуба" : "Расписание интенсива"}
        </p>
      </div>

      <Tabs defaultValue="intensive" className="w-full">
        <TabsList className={`grid w-full ${isClubResident ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TabsTrigger value="intensive">Интенсив</TabsTrigger>
          {isClubResident && (
            <TabsTrigger value="club">Мужской клуб</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="intensive" className="mt-6">
          <IntensiveScheduleViewer />
        </TabsContent>
        
        {isClubResident && (
          <TabsContent value="club" className="mt-6">
            <ClubScheduleViewer />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
