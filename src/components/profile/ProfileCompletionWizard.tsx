import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  FileText, 
  Shield, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProfileCompletionWizardProps {
  onComplete: () => void;
}

export const ProfileCompletionWizard: React.FC<ProfileCompletionWizardProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const totalSteps = 3;

  const [profileData, setProfileData] = useState({
    last_name: '',
    first_name: '',
    middle_name: '',
    date_of_birth: '',
    phone: '',
    email: '',
    telegram: '',
    // Optional
    height_cm: '',
    weight_kg: '',
  });

  const [passportData, setPassportData] = useState({
    passport_series: '',
    passport_number: '',
    passport_issued_by: '',
    passport_issued_date: '',
    passport_department_code: '',
    registration_address: '',
    // Optional
    inn: '',
  });

  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setProfileData(prev => ({ ...prev, email: user.email || '' }));
    }
  }, [user]);

  const validateStep1 = () => {
    if (!profileData.last_name.trim()) {
      toast.error('Укажите фамилию');
      return false;
    }
    if (!profileData.first_name.trim()) {
      toast.error('Укажите имя');
      return false;
    }
    if (!profileData.phone.trim()) {
      toast.error('Укажите телефон');
      return false;
    }
    if (!profileData.date_of_birth) {
      toast.error('Укажите дату рождения');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!passportData.passport_series.trim()) {
      toast.error('Укажите серию паспорта');
      return false;
    }
    if (!passportData.passport_number.trim()) {
      toast.error('Укажите номер паспорта');
      return false;
    }
    if (!passportData.passport_issued_by.trim()) {
      toast.error('Укажите кем выдан паспорт');
      return false;
    }
    if (!passportData.passport_issued_date) {
      toast.error('Укажите дату выдачи паспорта');
      return false;
    }
    if (!passportData.passport_department_code.trim()) {
      toast.error('Укажите код подразделения');
      return false;
    }
    if (!passportData.registration_address.trim()) {
      toast.error('Укажите адрес прописки');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!consent) {
      toast.error('Необходимо дать согласие на обработку персональных данных');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      // Save profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          middle_name: profileData.middle_name || null,
          display_name: `${profileData.first_name} ${profileData.last_name}`,
          date_of_birth: profileData.date_of_birth || null,
          phone: profileData.phone,
          email: profileData.email || user.email,
          telegram: profileData.telegram || null,
          height_cm: profileData.height_cm ? parseInt(profileData.height_cm) : null,
          weight_kg: profileData.weight_kg ? parseInt(profileData.weight_kg) : null,
          personal_data_consent: true,
          personal_data_consent_date: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // Save passport/contract data
      const { error: contractError } = await supabase
        .from('contract_data')
        .upsert({
          user_id: user.id,
          passport_series: passportData.passport_series,
          passport_number: passportData.passport_number,
          passport_issued_by: passportData.passport_issued_by,
          passport_issued_date: passportData.passport_issued_date || null,
          passport_department_code: passportData.passport_department_code,
          registration_address: passportData.registration_address,
          inn: passportData.inn || null,
        }, { onConflict: 'user_id' });

      if (contractError) throw contractError;

      toast.success('Профиль успешно заполнен!');
      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Ошибка сохранения данных');
    } finally {
      setSaving(false);
    }
  };

  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Заполнение профиля</CardTitle>
          <CardDescription>
            Для продолжения работы необходимо заполнить данные профиля
          </CardDescription>
          <Progress value={progress} className="mt-4" />
          <p className="text-sm text-muted-foreground mt-2">
            Шаг {step} из {totalSteps}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Personal Data */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Личные данные</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="last_name">Фамилия *</Label>
                  <Input
                    id="last_name"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Иванов"
                  />
                </div>
                <div>
                  <Label htmlFor="first_name">Имя *</Label>
                  <Input
                    id="first_name"
                    value={profileData.first_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Иван"
                  />
                </div>
                <div>
                  <Label htmlFor="middle_name">Отчество</Label>
                  <Input
                    id="middle_name"
                    value={profileData.middle_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, middle_name: e.target.value }))}
                    placeholder="Иванович"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date_of_birth">Дата рождения *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={profileData.date_of_birth}
                    onChange={(e) => setProfileData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Телефон *</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+7 (900) 123-45-67"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="example@mail.ru"
                  />
                </div>
                <div>
                  <Label htmlFor="telegram">Telegram</Label>
                  <Input
                    id="telegram"
                    value={profileData.telegram}
                    onChange={(e) => setProfileData(prev => ({ ...prev, telegram: e.target.value }))}
                    placeholder="@username"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label htmlFor="height_cm">Рост (см) — необязательно</Label>
                  <Input
                    id="height_cm"
                    type="number"
                    value={profileData.height_cm}
                    onChange={(e) => setProfileData(prev => ({ ...prev, height_cm: e.target.value }))}
                    placeholder="175"
                  />
                </div>
                <div>
                  <Label htmlFor="weight_kg">Вес (кг) — необязательно</Label>
                  <Input
                    id="weight_kg"
                    type="number"
                    value={profileData.weight_kg}
                    onChange={(e) => setProfileData(prev => ({ ...prev, weight_kg: e.target.value }))}
                    placeholder="75"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Passport Data */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Паспортные данные</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Данные необходимы для оформления договора об оказании услуг
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="passport_series">Серия паспорта *</Label>
                  <Input
                    id="passport_series"
                    value={passportData.passport_series}
                    onChange={(e) => setPassportData(prev => ({ ...prev, passport_series: e.target.value }))}
                    placeholder="1234"
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label htmlFor="passport_number">Номер паспорта *</Label>
                  <Input
                    id="passport_number"
                    value={passportData.passport_number}
                    onChange={(e) => setPassportData(prev => ({ ...prev, passport_number: e.target.value }))}
                    placeholder="567890"
                    maxLength={6}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="passport_issued_by">Кем выдан *</Label>
                <Input
                  id="passport_issued_by"
                  value={passportData.passport_issued_by}
                  onChange={(e) => setPassportData(prev => ({ ...prev, passport_issued_by: e.target.value }))}
                  placeholder="ГУ МВД России по г. Москве"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="passport_issued_date">Дата выдачи *</Label>
                  <Input
                    id="passport_issued_date"
                    type="date"
                    value={passportData.passport_issued_date}
                    onChange={(e) => setPassportData(prev => ({ ...prev, passport_issued_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="passport_department_code">Код подразделения *</Label>
                  <Input
                    id="passport_department_code"
                    value={passportData.passport_department_code}
                    onChange={(e) => setPassportData(prev => ({ ...prev, passport_department_code: e.target.value }))}
                    placeholder="770-001"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="registration_address">Адрес по прописке *</Label>
                <Input
                  id="registration_address"
                  value={passportData.registration_address}
                  onChange={(e) => setPassportData(prev => ({ ...prev, registration_address: e.target.value }))}
                  placeholder="г. Москва, ул. Примерная, д. 1, кв. 1"
                />
              </div>

              <div className="pt-4 border-t">
                <Label htmlFor="inn">ИНН — необязательно</Label>
                <Input
                  id="inn"
                  value={passportData.inn}
                  onChange={(e) => setPassportData(prev => ({ ...prev, inn: e.target.value }))}
                  placeholder="123456789012"
                  maxLength={12}
                />
              </div>
            </div>
          )}

          {/* Step 3: Consent */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Согласие на обработку данных</h3>
              </div>

              <div className="p-6 bg-muted/50 rounded-lg border">
                <h4 className="font-medium mb-4">
                  Согласие на обработку персональных данных
                </h4>
                <div className="text-sm text-muted-foreground space-y-3 max-h-60 overflow-y-auto pr-2">
                  <p>
                    Я, субъект персональных данных, в соответствии с Федеральным законом от 27.07.2006 г. 
                    № 152-ФЗ «О персональных данных» предоставляю согласие на обработку моих персональных 
                    данных, а именно:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Фамилия, имя, отчество</li>
                    <li>Дата рождения</li>
                    <li>Паспортные данные</li>
                    <li>Адрес регистрации</li>
                    <li>Контактный телефон</li>
                    <li>Адрес электронной почты</li>
                    <li>ИНН (при наличии)</li>
                  </ul>
                  <p>
                    Согласие дается для целей заключения и исполнения договора об оказании услуг, 
                    а также для информирования о мероприятиях и услугах.
                  </p>
                  <p>
                    Согласие действует до момента его отзыва путём направления письменного заявления.
                  </p>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="consent"
                    checked={consent}
                    onCheckedChange={(checked) => setConsent(checked as boolean)}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="consent" className="font-medium cursor-pointer">
                      Я даю согласие на обработку персональных данных *
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Нажимая на кнопку «Завершить», я подтверждаю, что ознакомлен с условиями 
                      обработки персональных данных и даю своё согласие.
                    </p>
                  </div>
                </div>
              </div>

              {consent && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Согласие получено</span>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <Button onClick={handleNext}>
                Далее
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={!consent || saving}
                className="bg-primary"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Завершить
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
