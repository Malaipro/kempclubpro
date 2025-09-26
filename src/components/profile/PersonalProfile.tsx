import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { User } from 'lucide-react';
import { AccountSettings } from './AccountSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone?: string;
  telegram?: string;
  leaderboard_visible?: boolean;
  profile_private?: boolean;
}

export const PersonalProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
        return;
      }

      setProfile(data || { user_id: user.id });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        display_name: profile.display_name || profile.first_name || user.email?.split('@')[0] || '',
        phone: profile.phone || '',
        telegram: profile.telegram || '',
        leaderboard_visible: profile.leaderboard_visible ?? true,
        profile_private: profile.profile_private ?? false,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) {
        console.error('Error saving profile:', error);
        toast.error('Failed to save profile');
        return;
      }

      toast.success('Profile saved successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border-gray-300">
        <CardContent className="p-8">
          <div className="text-center">Loading profile...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white border-gray-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <User className="w-5 h-5 text-kamp-accent" />
            Личный профиль
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Имя</Label>
              <Input
                id="first_name"
                name="first_name"
                value={profile.first_name || ''}
                onChange={handleInputChange}
                placeholder="Введите ваше имя"
              />
            </div>
            
            <div>
              <Label htmlFor="last_name">Фамилия</Label>
              <Input
                id="last_name"
                name="last_name"
                value={profile.last_name || ''}
                onChange={handleInputChange}
                placeholder="Введите вашу фамилию"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="display_name">Отображаемое имя</Label>
            <Input
              id="display_name"
              name="display_name"
              value={profile.display_name || ''}
              onChange={handleInputChange}
              placeholder="Как вас показывать в рейтинге"
            />
          </div>

          <div>
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              name="phone"
              value={profile.phone || ''}
              onChange={handleInputChange}
              type="tel"
              placeholder="+7 (900) 123-45-67"
            />
          </div>

          <div>
            <Label htmlFor="telegram">Telegram</Label>
            <Input
              id="telegram"
              name="telegram"
              value={profile.telegram || ''}
              onChange={handleInputChange}
              type="text"
              placeholder="@username"
            />
          </div>
          
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold text-gray-900">Настройки приватности</h4>
            
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

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Сохранение...' : 'Сохранить профиль'}
          </Button>
        </CardContent>
      </Card>
      
      <AccountSettings />
    </div>
  );
};