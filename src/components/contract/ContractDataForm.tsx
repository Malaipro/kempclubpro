import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Save, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ContractData {
  passport_series: string;
  passport_number: string;
  passport_issued_by: string;
  passport_issued_date: Date | null;
  passport_department_code: string;
  registration_address: string;
  inn: string;
}

interface ContractDataFormProps {
  onDataSaved?: () => void;
}

export const ContractDataForm: React.FC<ContractDataFormProps> = ({ onDataSaved }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ContractData>({
    passport_series: '',
    passport_number: '',
    passport_issued_by: '',
    passport_issued_date: null,
    passport_department_code: '',
    registration_address: '',
    inn: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContractData, string>>>({});

  useEffect(() => {
    if (user) {
      loadContractData();
    }
  }, [user]);

  const loadContractData = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('contract_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          passport_series: data.passport_series || '',
          passport_number: data.passport_number || '',
          passport_issued_by: data.passport_issued_by || '',
          passport_issued_date: data.passport_issued_date ? new Date(data.passport_issued_date) : null,
          passport_department_code: data.passport_department_code || '',
          registration_address: data.registration_address || '',
          inn: data.inn || '',
        });
      }
    } catch (error) {
      console.error('Error loading contract data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ContractData, string>> = {};

    // Серия паспорта: 4 цифры
    if (!formData.passport_series) {
      newErrors.passport_series = 'Обязательное поле';
    } else if (!/^\d{4}$/.test(formData.passport_series)) {
      newErrors.passport_series = 'Должно быть 4 цифры';
    }

    // Номер паспорта: 6 цифр
    if (!formData.passport_number) {
      newErrors.passport_number = 'Обязательное поле';
    } else if (!/^\d{6}$/.test(formData.passport_number)) {
      newErrors.passport_number = 'Должно быть 6 цифр';
    }

    // Кем выдан
    if (!formData.passport_issued_by) {
      newErrors.passport_issued_by = 'Обязательное поле';
    } else if (formData.passport_issued_by.length < 10) {
      newErrors.passport_issued_by = 'Слишком короткое название';
    }

    // Дата выдачи
    if (!formData.passport_issued_date) {
      newErrors.passport_issued_date = 'Обязательное поле';
    } else if (formData.passport_issued_date > new Date()) {
      newErrors.passport_issued_date = 'Дата не может быть в будущем';
    }

    // Код подразделения: XXX-XXX
    if (formData.passport_department_code && !/^\d{3}-\d{3}$/.test(formData.passport_department_code)) {
      newErrors.passport_department_code = 'Формат: XXX-XXX';
    }

    // Адрес регистрации
    if (!formData.registration_address) {
      newErrors.registration_address = 'Обязательное поле';
    } else if (formData.registration_address.length < 20) {
      newErrors.registration_address = 'Введите полный адрес';
    }

    // ИНН (опционально): 10 или 12 цифр
    if (formData.inn && !/^(\d{10}|\d{12})$/.test(formData.inn)) {
      newErrors.inn = 'ИНН должен содержать 10 или 12 цифр';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
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
        description: 'Данные для договора успешно сохранены',
      });

      onDataSaved?.();
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

  const handleInputChange = (field: keyof ContractData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очищаем ошибку при вводе
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center animate-pulse">Загрузка данных...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Данные для договора
        </CardTitle>
        <CardDescription>
          Заполните паспортные данные для формирования договора. Данные защищены и используются только для оформления документов.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Все поля, отмеченные *, обязательны для заполнения
          </AlertDescription>
        </Alert>

        {/* Паспортные данные */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Паспортные данные</h3>
          
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
                  // Auto-format: add dash after 3 digits
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

        {/* Адрес регистрации */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Адрес регистрации</h3>
          
          <div>
            <Label>Полный адрес *</Label>
            <Textarea
              value={formData.registration_address}
              onChange={(e) => handleInputChange('registration_address', e.target.value)}
              placeholder="Например: 123456, г. Москва, ул. Примерная, д. 1, кв. 1"
              rows={3}
              className={errors.registration_address ? 'border-destructive' : ''}
            />
            {errors.registration_address && (
              <p className="text-sm text-destructive mt-1">{errors.registration_address}</p>
            )}
          </div>
        </div>

        {/* ИНН */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Дополнительно</h3>
          
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
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить данные'}
        </Button>
      </CardContent>
    </Card>
  );
};
