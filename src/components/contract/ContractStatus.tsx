import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileSignature, 
  Send, 
  Clock, 
  Eye, 
  CheckCircle2, 
  XCircle,
  Download,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Contract {
  id: string;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signed_pdf_url: string | null;
  created_at: string;
}

interface ContractData {
  passport_series: string;
  passport_number: string;
  passport_issued_by: string;
  passport_issued_date: string;
  registration_address: string;
}

interface ContractStatusProps {
  onNeedData?: () => void;
}

export const ContractStatus: React.FC<ContractStatusProps> = ({ onNeedData }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contract, setContract] = useState<Contract | null>(null);
  const [hasContractData, setHasContractData] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Проверяем наличие данных для договора
      const { data: contractData } = await supabase
        .from('contract_data')
        .select('passport_series, passport_number, passport_issued_by, passport_issued_date, registration_address')
        .eq('user_id', user.id)
        .maybeSingle();

      const isDataComplete = contractData && 
        contractData.passport_series && 
        contractData.passport_number &&
        contractData.passport_issued_by &&
        contractData.passport_issued_date &&
        contractData.registration_address;

      setHasContractData(!!isDataComplete);

      // Проверяем наличие телефона
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('user_id', user.id)
        .single();

      setHasPhone(!!profile?.phone);

      // Загружаем последний договор
      const { data: contracts } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (contracts && contracts.length > 0) {
        setContract(contracts[0]);
      }
    } catch (error) {
      console.error('Error loading contract data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendContract = async () => {
    if (!user) return;

    setSending(true);
    try {
      const response = await supabase.functions.invoke('podpislon-send', {
        body: { userId: user.id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send contract');
      }

      const result = response.data;
      
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Договор отправлен',
        description: 'Вам придёт SMS со ссылкой для подписания',
      });

      // Перезагружаем данные
      await loadData();
    } catch (error: any) {
      console.error('Error sending contract:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отправить договор',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return { label: 'Черновик', icon: Clock, variant: 'secondary' as const };
      case 'sent':
        return { label: 'Отправлен', icon: Send, variant: 'default' as const };
      case 'viewed':
        return { label: 'Просмотрен', icon: Eye, variant: 'outline' as const };
      case 'signed':
        return { label: 'Подписан', icon: CheckCircle2, variant: 'default' as const };
      case 'cancelled':
        return { label: 'Отменён', icon: XCircle, variant: 'destructive' as const };
      default:
        return { label: status, icon: Clock, variant: 'secondary' as const };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center animate-pulse">Загрузка статуса договора...</div>
        </CardContent>
      </Card>
    );
  }

  const canSendContract = hasContractData && hasPhone;
  const isSigned = contract?.status === 'signed';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="w-5 h-5" />
          Статус договора
        </CardTitle>
        <CardDescription>
          Подписание договора об оказании услуг через СМС
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Предупреждения о недостающих данных */}
        {!hasContractData && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Заполните паспортные данные для отправки договора на подпись
              {onNeedData && (
                <Button variant="link" className="p-0 h-auto ml-1" onClick={onNeedData}>
                  Заполнить сейчас
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {hasContractData && !hasPhone && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Добавьте номер телефона в профиле для получения СМС со ссылкой на подписание
            </AlertDescription>
          </Alert>
        )}

        {/* Информация о договоре */}
        {contract ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Статус:</span>
              {(() => {
                const statusInfo = getStatusInfo(contract.status);
                const StatusIcon = statusInfo.icon;
                return (
                  <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </Badge>
                );
              })()}
            </div>

            {contract.sent_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Отправлен:</span>
                <span>{format(new Date(contract.sent_at), "dd MMMM yyyy, HH:mm", { locale: ru })}</span>
              </div>
            )}

            {contract.viewed_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Просмотрен:</span>
                <span>{format(new Date(contract.viewed_at), "dd MMMM yyyy, HH:mm", { locale: ru })}</span>
              </div>
            )}

            {contract.signed_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Подписан:</span>
                <span className="text-green-600 font-medium">
                  {format(new Date(contract.signed_at), "dd MMMM yyyy, HH:mm", { locale: ru })}
                </span>
              </div>
            )}

            {/* Кнопка скачивания подписанного PDF */}
            {isSigned && contract.signed_pdf_url && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open(contract.signed_pdf_url!, '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                Скачать подписанный договор
              </Button>
            )}

            {/* Кнопка повторной отправки */}
            {!isSigned && canSendContract && (
              <Button 
                onClick={handleSendContract} 
                disabled={sending}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${sending ? 'animate-spin' : ''}`} />
                {sending ? 'Отправка...' : 'Отправить повторно'}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              Договор ещё не отправлен
            </p>
            
            <Button 
              onClick={handleSendContract} 
              disabled={!canSendContract || sending}
              className="w-full"
            >
              <Send className={`w-4 h-4 mr-2 ${sending ? 'animate-spin' : ''}`} />
              {sending ? 'Отправка...' : 'Отправить договор на подпись'}
            </Button>

            {canSendContract && (
              <p className="text-xs text-muted-foreground mt-2">
                После нажатия вы получите СМС со ссылкой для подписания
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
