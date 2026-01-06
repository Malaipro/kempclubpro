import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Contract {
  id: string;
  status: string;
  signed_pdf_url: string | null;
  signed_at: string | null;
  created_at: string | null;
}

export const UserContracts: React.FC = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const fetchContracts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, status, signed_pdf_url, signed_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Подписан
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Ожидает подписания
          </Badge>
        );
      case 'sent':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Отправлен
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="animate-pulse text-center text-muted-foreground">
            Загрузка документов...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contracts.length === 0) {
    return null; // Don't show section if no contracts
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileText className="w-5 h-5 text-primary" />
          Мои документы
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {contracts.map((contract) => (
          <div
            key={contract.id}
            className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Договор об оказании услуг</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(contract.status)}
                  {contract.signed_at && (
                    <span className="text-xs text-muted-foreground">
                      от {format(new Date(contract.signed_at), 'dd MMMM yyyy', { locale: ru })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {contract.signed_pdf_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={contract.signed_pdf_url} target="_blank" rel="noopener noreferrer" download>
                  <Download className="w-4 h-4 mr-2" />
                  Скачать PDF
                </a>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
