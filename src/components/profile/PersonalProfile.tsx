import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { User, FileText, Shield } from 'lucide-react';
import { AccountSettings } from './AccountSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  display_name?: string;
  phone?: string;
  email?: string;
  telegram?: string;
  date_of_birth?: string;
  leaderboard_visible?: boolean;
  profile_private?: boolean;
  personal_data_consent?: boolean;
  personal_data_consent_date?: string;
}

interface ContractData {
  id?: string;
  user_id?: string;
  passport_series?: string;
  passport_number?: string;
  passport_issued_by?: string;
  passport_issued_date?: string;
  passport_department_code?: string;
  registration_address?: string;
  inn?: string;
}

export const PersonalProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({});
  const [contractData, setContractData] = useState<ContractData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
        toast.error('Ошибка загрузки профиля');
        return;
      }

      setProfile(profileData || { user_id: user.id, email: user.email });

      // Load contract data
      const { data: contractDataResult, error: contractError } = await supabase
        .from('contract_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (contractError && contractError.code !== 'PGRST116') {
        console.error('Error loading contract data:', contractError);
      }

      setContractData(contractDataResult || { user_id: user.id });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleContractDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContractData(prev => ({ ...prev, [name]: value }));
  };

  const handleConsentChange = (checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      personal_data_consent: checked,
      personal_data_consent_date: checked ? new Date().toISOString() : undefined
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Save profile data
      const profileDataToSave = {
        user_id: user.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        middle_name: profile.middle_name || '',
        display_name: profile.display_name || profile.first_name || user.email?.split('@')[0] || '',
        phone: profile.phone || '',
        email: profile.email || user.email || '',
        telegram: profile.telegram || '',
        date_of_birth: profile.date_of_birth || null,
        leaderboard_visible: profile.leaderboard_visible ?? true,
        profile_private: profile.profile_private ?? false,
        personal_data_consent: profile.personal_data_consent ?? false,
        personal_data_consent_date: profile.personal_data_consent_date || null,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileDataToSave, { onConflict: 'user_id' });

      if (profileError) {
        console.error('Error saving profile:', profileError);
        toast.error('Ошибка сохранения профиля');
        return;
      }

      // Save contract data
      const contractDataToSave = {
        user_id: user.id,
        passport_series: contractData.passport_series || '',
        passport_number: contractData.passport_number || '',
        passport_issued_by: contractData.passport_issued_by || '',
        passport_issued_date: contractData.passport_issued_date || null,
        passport_department_code: contractData.passport_department_code || '',
        registration_address: contractData.registration_address || '',
        inn: contractData.inn || '',
      };

      const { error: contractError } = await supabase
        .from('contract_data')
        .upsert(contractDataToSave, { onConflict: 'user_id' });

      if (contractError) {
        console.error('Error saving contract data:', contractError);
        toast.error('Ошибка сохранения паспортных данных');
        return;
      }

      toast.success('Данные успешно сохранены');
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Ошибка сохранения данных');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Загрузка профиля...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <User className="w-5 h-5 text-primary" />
            Личные данные
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="last_name">Фамилия *</Label>
              <Input
                id="last_name"
                name="last_name"
                value={profile.last_name || ''}
                onChange={handleProfileChange}
                placeholder="Иванов"
              />
            </div>
            
            <div>
              <Label htmlFor="first_name">Имя *</Label>
              <Input
                id="first_name"
                name="first_name"
                value={profile.first_name || ''}
                onChange={handleProfileChange}
                placeholder="Иван"
              />
            </div>

            <div>
              <Label htmlFor="middle_name">Отчество</Label>
              <Input
                id="middle_name"
                name="middle_name"
                value={profile.middle_name || ''}
                onChange={handleProfileChange}
                placeholder="Иванович"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date_of_birth">Дата рождения</Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={profile.date_of_birth || ''}
                onChange={handleProfileChange}
              />
            </div>

            <div>
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                name="phone"
                value={profile.phone || ''}
                onChange={handleProfileChange}
                type="tel"
                placeholder="+7 (900) 123-45-67"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={profile.email || user?.email || ''}
                onChange={handleProfileChange}
                placeholder="example@mail.ru"
              />
            </div>

            <div>
              <Label htmlFor="telegram">Telegram</Label>
              <Input
                id="telegram"
                name="telegram"
                value={profile.telegram || ''}
                onChange={handleProfileChange}
                type="text"
                placeholder="@username"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="display_name">Отображаемое имя (для рейтинга)</Label>
            <Input
              id="display_name"
              name="display_name"
              value={profile.display_name || ''}
              onChange={handleProfileChange}
              placeholder="Как вас показывать в рейтинге"
            />
          </div>
        </CardContent>
      </Card>

      {/* Passport Data */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5 text-primary" />
            Паспортные данные
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Данные необходимы для оформления договора
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="passport_series">Серия паспорта</Label>
              <Input
                id="passport_series"
                name="passport_series"
                value={contractData.passport_series || ''}
                onChange={handleContractDataChange}
                placeholder="1234"
                maxLength={4}
              />
            </div>
            
            <div>
              <Label htmlFor="passport_number">Номер паспорта</Label>
              <Input
                id="passport_number"
                name="passport_number"
                value={contractData.passport_number || ''}
                onChange={handleContractDataChange}
                placeholder="567890"
                maxLength={6}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="passport_issued_by">Кем выдан</Label>
            <Input
              id="passport_issued_by"
              name="passport_issued_by"
              value={contractData.passport_issued_by || ''}
              onChange={handleContractDataChange}
              placeholder="ГУ МВД России по г. Москве"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="passport_issued_date">Дата выдачи</Label>
              <Input
                id="passport_issued_date"
                name="passport_issued_date"
                type="date"
                value={contractData.passport_issued_date || ''}
                onChange={handleContractDataChange}
              />
            </div>

            <div>
              <Label htmlFor="passport_department_code">Код подразделения</Label>
              <Input
                id="passport_department_code"
                name="passport_department_code"
                value={contractData.passport_department_code || ''}
                onChange={handleContractDataChange}
                placeholder="770-001"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="registration_address">Адрес по прописке</Label>
            <Input
              id="registration_address"
              name="registration_address"
              value={contractData.registration_address || ''}
              onChange={handleContractDataChange}
              placeholder="г. Москва, ул. Примерная, д. 1, кв. 1"
            />
          </div>

          <div>
            <Label htmlFor="inn">ИНН (при наличии)</Label>
            <Input
              id="inn"
              name="inn"
              value={contractData.inn || ''}
              onChange={handleContractDataChange}
              placeholder="123456789012"
              maxLength={12}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings & Consent */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            Приватность и согласия
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="personal_data_consent"
                checked={profile.personal_data_consent ?? false}
                onCheckedChange={handleConsentChange}
                className="mt-1"
              />
              <div>
                <Label htmlFor="personal_data_consent" className="text-sm font-medium cursor-pointer">
                  Согласие на обработку персональных данных *
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Я даю согласие на обработку моих персональных данных в соответствии с 
                  Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» 
                  для целей заключения и исполнения договора об оказании услуг.
                </p>
                {profile.personal_data_consent && profile.personal_data_consent_date && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    ✓ Согласие дано: {new Date(profile.personal_data_consent_date).toLocaleDateString('ru-RU')}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="leaderboard_visible"
                checked={profile.leaderboard_visible ?? true}
                onCheckedChange={(checked) => 
                  setProfile(prev => ({ ...prev, leaderboard_visible: checked as boolean }))
                }
              />
              <Label htmlFor="leaderboard_visible" className="text-sm">
                Показывать в общем рейтинге
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="profile_private"
                checked={profile.profile_private ?? false}
                onCheckedChange={(checked) => 
                  setProfile(prev => ({ ...prev, profile_private: checked as boolean }))
                }
              />
              <Label htmlFor="profile_private" className="text-sm">
                Приватный профиль
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleSave} 
        disabled={saving}
        className="w-full"
        size="lg"
      >
        {saving ? 'Сохранение...' : 'Сохранить данные'}
      </Button>
      
      <AccountSettings />
    </div>
  );
};
