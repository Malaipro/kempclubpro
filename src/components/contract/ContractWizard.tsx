import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar as CalendarIcon, 
  Save, 
  FileText, 
  AlertCircle,
  Send,
  CheckCircle2,
  Eye,
  Clock,
  ArrowRight,
  FileSignature,
  Phone,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ContractFormData {
  passport_series: string;
  passport_number: string;
  passport_issued_by: string;
  passport_issued_date: Date | null;
  passport_department_code: string;
  registration_address: string;
  inn: string;
}

interface Contract {
  id: string;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signed_pdf_url: string | null;
}

type Step = 'data' | 'send' | 'status';

export const ContractWizard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('data');
  const [contract, setContract] = useState<Contract | null>(null);
  const [hasPhone, setHasPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formData, setFormData] = useState<ContractFormData>({
    passport_series: '',
    passport_number: '',
    passport_issued_by: '',
    passport_issued_date: null,
    passport_department_code: '',
    registration_address: '',
    inn: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContractFormData | 'phone', string>>>({});

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Загружаем профиль (телефон)
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('user_id', user.id)
        .single();
      setHasPhone(!!profile?.phone);
      setPhoneNumber(profile?.phone || '');

      // Загружаем данные для договора
      const { data: contractData } = await supabase
        .from('contract_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (contractData) {
        setFormData({
          passport_series: contractData.passport_series || '',
          passport_number: contractData.passport_number || '',
          passport_issued_by: contractData.passport_issued_by || '',
          passport_issued_date: contractData.passport_issued_date ? new Date(contractData.passport_issued_date) : null,
          passport_department_code: contractData.passport_department_code || '',
          registration_address: contractData.registration_address || '',
          inn: contractData.inn || '',
        });
      }

      // Загружаем последний договор
      const { data: contracts } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (contracts && contracts.length > 0) {
        setContract(contracts[0]);
        // Если договор уже есть — показываем статус
        setCurrentStep('status');
      } else if (isFormComplete(contractData)) {
        // Данные заполнены, но договор не отправлен
        setCurrentStep('send');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFormComplete = (data: any): boolean => {
    return data && 
      data.passport_series && 
      data.passport_number &&
      data.passport_issued_by &&
      data.passport_issued_date &&
      data.registration_address;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ContractFormData | 'phone', string>> = {};

    // Проверка телефона
    if (!phoneNumber) {
      newErrors.phone = 'Укажите номер телефона';
    } else if (!/^[\d\s\+\-\(\)]{10,}$/.test(phoneNumber)) {
      newErrors.phone = 'Некорректный формат телефона';
    }

    if (!formData.passport_series) {
      newErrors.passport_series = 'Обязательное поле';
    } else if (!/^\d{4}$/.test(formData.passport_series)) {
      newErrors.passport_series = 'Должно быть 4 цифры';
    }

    if (!formData.passport_number) {
      newErrors.passport_number = 'Обязательное поле';
    } else if (!/^\d{6}$/.test(formData.passport_number)) {
      newErrors.passport_number = 'Должно быть 6 цифр';
    }

    if (!formData.passport_issued_by) {
      newErrors.passport_issued_by = 'Обязательное поле';
    } else if (formData.passport_issued_by.length < 10) {
      newErrors.passport_issued_by = 'Слишком короткое название';
    }

    if (!formData.passport_issued_date) {
      newErrors.passport_issued_date = 'Обязательное поле';
    }

    if (formData.passport_department_code && !/^\d{3}-\d{3}$/.test(formData.passport_department_code)) {
      newErrors.passport_department_code = 'Формат: XXX-XXX';
    }

    if (!formData.registration_address) {
      newErrors.registration_address = 'Обязательное поле';
    } else if (formData.registration_address.length < 20) {
      newErrors.registration_address = 'Введите полный адрес';
    }

    if (formData.inn && !/^(\d{10}|\d{12})$/.test(formData.inn)) {
      newErrors.inn = 'ИНН должен содержать 10 или 12 цифр';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveData = async () => {
    if (!user) return;
    if (!validateForm()) {
      toast({
        title: 'Ошибка валидации',
        description: 'Проверьте правильность заполнения полей',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Сохраняем телефон в профиле
      if (phoneNumber) {
        const { error: phoneError } = await supabase
          .from('profiles')
          .update({ phone: phoneNumber })
          .eq('user_id', user.id);
        
        if (phoneError) throw phoneError;
        setHasPhone(true);
      }

      const dataToSave = {
        user_id: user.id,
        passport_series: formData.passport_series,
        passport_number: formData.passport_number,
        passport_issued_by: formData.passport_issued_by,
        passport_issued_date: formData.passport_issued_date?.toISOString().split('T')[0] || null,
        passport_department_code: formData.passport_department_code || null,
        registration_address: formData.registration_address,
        inn: formData.inn || null,
      };

      const { error } = await supabase
        .from('contract_data')
        .upsert(dataToSave, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Данные сохранены',
        description: 'Теперь можно отправить договор на подпись',
      });

      setCurrentStep('send');
    } catch (error) {
      console.error('Error saving contract data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить данные',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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
        title: 'Договор отправлен!',
        description: 'Вам придёт SMS со ссылкой для подписания',
      });

      // Перезагружаем данные и переходим к статусу
      await loadAllData();
      setCurrentStep('status');
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

  const handleInputChange = (field: keyof ContractFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return { label: 'Черновик', icon: Clock, color: 'text-muted-foreground' };
      case 'sent':
        return { label: 'Отправлен', icon: Send, color: 'text-blue-500' };
      case 'viewed':
        return { label: 'Просмотрен', icon: Eye, color: 'text-yellow-500' };
      case 'signed':
        return { label: 'Подписан', icon: CheckCircle2, color: 'text-green-500' };
      default:
        return { label: status, icon: Clock, color: 'text-muted-foreground' };
    }
  };

  const getProgress = (): number => {
    switch (currentStep) {
      case 'data': return 33;
      case 'send': return 66;
      case 'status': return contract?.status === 'signed' ? 100 : 80;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center animate-pulse">Загрузка...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Прогресс */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span className={currentStep === 'data' ? 'text-primary font-medium' : ''}>
            1. Заполнение данных
          </span>
          <span className={currentStep === 'send' ? 'text-primary font-medium' : ''}>
            2. Отправка
          </span>
          <span className={currentStep === 'status' ? 'text-primary font-medium' : ''}>
            3. Подписание
          </span>
        </div>
        <Progress value={getProgress()} className="h-2" />
      </div>

      {/* Шаг 1: Заполнение данных */}
      {currentStep === 'data' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Данные для договора
            </CardTitle>
            <CardDescription>
              Заполните паспортные данные для формирования договора
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Все поля, отмеченные *, обязательны для заполнения
              </AlertDescription>
            </Alert>

            {/* Телефон */}
            <div className="space-y-4">
              <h3 className="font-semibold">Контактные данные</h3>
              <div>
                <Label>Номер телефона *</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (errors.phone) {
                        setErrors(prev => ({ ...prev, phone: undefined }));
                      }
                    }}
                    placeholder="+7 (999) 999-99-99"
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-destructive mt-1">{errors.phone}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  На этот номер придёт SMS со ссылкой для подписания договора
                </p>
              </div>
            </div>

            {/* Паспортные данные */}
            <div className="space-y-4">
              <h3 className="font-semibold">Паспортные данные</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Серия паспорта *</Label>
                  <Input
                    value={formData.passport_series}
                    onChange={(e) => handleInputChange('passport_series', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                    maxLength={4}
                    className={errors.passport_series ? 'border-destructive' : ''}
                  />
                  {errors.passport_series && (
                    <p className="text-sm text-destructive mt-1">{errors.passport_series}</p>
                  )}
                </div>
                <div>
                  <Label>Номер паспорта *</Label>
                  <Input
                    value={formData.passport_number}
                    onChange={(e) => handleInputChange('passport_number', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className={errors.passport_number ? 'border-destructive' : ''}
                  />
                  {errors.passport_number && (
                    <p className="text-sm text-destructive mt-1">{errors.passport_number}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Кем выдан *</Label>
                <Textarea
                  value={formData.passport_issued_by}
                  onChange={(e) => handleInputChange('passport_issued_by', e.target.value)}
                  placeholder="Например: ГУ МВД России по г. Москве"
                  rows={2}
                  className={errors.passport_issued_by ? 'border-destructive' : ''}
                />
                {errors.passport_issued_by && (
                  <p className="text-sm text-destructive mt-1">{errors.passport_issued_by}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Дата выдачи *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${errors.passport_issued_date ? 'border-destructive' : ''}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.passport_issued_date
                          ? format(formData.passport_issued_date, "dd.MM.yyyy", { locale: ru })
                          : "Выберите дату"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background border shadow-lg z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.passport_issued_date || undefined}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, passport_issued_date: date || null }));
                          if (errors.passport_issued_date) {
                            setErrors(prev => ({ ...prev, passport_issued_date: undefined }));
                          }
                        }}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.passport_issued_date && (
                    <p className="text-sm text-destructive mt-1">{errors.passport_issued_date}</p>
                  )}
                </div>
                <div>
                  <Label>Код подразделения</Label>
                  <Input
                    value={formData.passport_department_code}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^\d-]/g, '');
                      if (value.length === 3 && !value.includes('-')) {
                        value = value + '-';
                      }
                      handleInputChange('passport_department_code', value.slice(0, 7));
                    }}
                    placeholder="000-000"
                    maxLength={7}
                    className={errors.passport_department_code ? 'border-destructive' : ''}
                  />
                  {errors.passport_department_code && (
                    <p className="text-sm text-destructive mt-1">{errors.passport_department_code}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Адрес */}
            <div className="space-y-4">
              <h3 className="font-semibold">Адрес регистрации</h3>
              <div>
                <Label>Полный адрес *</Label>
                <Textarea
                  value={formData.registration_address}
                  onChange={(e) => handleInputChange('registration_address', e.target.value)}
                  placeholder="Например: 123456, г. Москва, ул. Примерная, д. 1, кв. 1"
                  rows={2}
                  className={errors.registration_address ? 'border-destructive' : ''}
                />
                {errors.registration_address && (
                  <p className="text-sm text-destructive mt-1">{errors.registration_address}</p>
                )}
              </div>
            </div>

            {/* ИНН */}
            <div>
              <Label>ИНН (необязательно)</Label>
              <Input
                value={formData.inn}
                onChange={(e) => handleInputChange('inn', e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="10 или 12 цифр"
                maxLength={12}
                className={errors.inn ? 'border-destructive' : ''}
              />
              {errors.inn && (
                <p className="text-sm text-destructive mt-1">{errors.inn}</p>
              )}
            </div>

            <Button 
              onClick={handleSaveData} 
              disabled={saving || !hasPhone}
              className="w-full"
              size="lg"
            >
              {saving ? (
                <>Сохранение...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить и продолжить
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Шаг 2: Отправка договора */}
      {currentStep === 'send' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Отправка договора
            </CardTitle>
            <CardDescription>
              Данные заполнены. Нажмите кнопку, чтобы отправить договор на подпись
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <FileSignature className="h-4 w-4" />
              <AlertDescription>
                После отправки вам придёт SMS со ссылкой для подписания договора. 
                Подписание происходит через ввод кода из SMS.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setCurrentStep('data')}
                className="flex-1"
              >
                Изменить данные
              </Button>
              <Button 
                onClick={handleSendContract} 
                disabled={sending}
                className="flex-1"
                size="lg"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Отправить на подпись
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Шаг 3: Статус договора */}
      {currentStep === 'status' && contract && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              Статус договора
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="text-muted-foreground">Статус:</span>
              {(() => {
                const info = getStatusInfo(contract.status);
                const Icon = info.icon;
                return (
                  <div className={`flex items-center gap-2 font-medium ${info.color}`}>
                    <Icon className="w-5 h-5" />
                    {info.label}
                  </div>
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

            {contract.status === 'signed' ? (
              <>
                <Alert className="bg-green-500/10 border-green-500/20">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700">
                    Договор успешно подписан! Спасибо.
                  </AlertDescription>
                </Alert>

                {contract.signed_pdf_url && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(contract.signed_pdf_url!, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Скачать подписанный договор
                  </Button>
                )}
              </>
            ) : (
              <>
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Ожидаем подписания. Проверьте SMS со ссылкой для подписи.
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={handleSendContract} 
                  disabled={sending}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${sending ? 'animate-spin' : ''}`} />
                  {sending ? 'Отправка...' : 'Отправить повторно'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
