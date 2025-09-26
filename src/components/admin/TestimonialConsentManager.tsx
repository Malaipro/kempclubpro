import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Testimonial {
  id: string;
  participant_name: string;
  content: string;
  consent_given: boolean;
  consent_date: string | null;
  data_retention_until: string | null;
  is_active: boolean;
  created_at: string;
}

export const TestimonialConsentManager: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error('Error loading testimonials:', error);
      toast.error('Ошибка при загрузке отзывов');
    } finally {
      setLoading(false);
    }
  };

  const updateConsent = async (id: string, consentGiven: boolean) => {
    try {
      const updates: any = {
        consent_given: consentGiven,
        consent_date: consentGiven ? new Date().toISOString() : null,
      };

      // Set data retention period (2 years from consent)
      if (consentGiven) {
        const retentionDate = new Date();
        retentionDate.setFullYear(retentionDate.getFullYear() + 2);
        updates.data_retention_until = retentionDate.toISOString();
      } else {
        updates.data_retention_until = null;
      }

      const { error } = await supabase
        .from('testimonials')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Log consent update
      await supabase.rpc('log_security_event', {
        event_type: 'CONSENT_UPDATE',
        details: { 
          testimonial_id: id, 
          consent_given: consentGiven,
          action: 'testimonial_consent_updated' 
        }
      });

      toast.success(
        consentGiven 
          ? 'Согласие предоставлено' 
          : 'Согласие отозвано'
      );
      
      loadTestimonials();
    } catch (error) {
      console.error('Error updating consent:', error);
      toast.error('Ошибка при обновлении согласия');
    }
  };

  const getConsentStatus = (testimonial: Testimonial) => {
    if (testimonial.consent_given) {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        text: 'Согласие получено',
        variant: 'default' as const,
        color: 'bg-green-100 text-green-800'
      };
    } else if (testimonial.consent_given === false) {
      return {
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        text: 'Согласие отозвано',
        variant: 'destructive' as const,
        color: 'bg-red-100 text-red-800'
      };
    } else {
      return {
        icon: <Clock className="h-4 w-4 text-yellow-500" />,
        text: 'Ожидается согласие',
        variant: 'secondary' as const,
        color: 'bg-yellow-100 text-yellow-800'
      };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRetentionWarning = (testimonial: Testimonial) => {
    if (!testimonial.data_retention_until) return null;
    
    const retentionDate = new Date(testimonial.data_retention_until);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((retentionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 30) {
      return (
        <Alert className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Срок хранения истекает через {daysUntilExpiry} дней ({formatDate(testimonial.data_retention_until)})
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Управление согласиями на отзывы</h2>
        <Badge variant="outline" className="text-white border-white">
          {testimonials.length} отзывов
        </Badge>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>GDPR Compliance:</strong> Отзывы без согласия не отображаются на публичной странице. 
          Согласие действительно 2 года с момента предоставления.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {testimonials.map((testimonial) => {
          const status = getConsentStatus(testimonial);
          return (
            <Card key={testimonial.id} className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">
                    {testimonial.participant_name}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {status.icon}
                    <Badge className={status.color}>
                      {status.text}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-gray-300 text-sm line-clamp-3">
                  {testimonial.content}
                </p>
                
                <div className="text-sm text-gray-400 space-y-1">
                  <div>Создан: {formatDate(testimonial.created_at)}</div>
                  {testimonial.consent_date && (
                    <div>Согласие: {formatDate(testimonial.consent_date)}</div>
                  )}
                  {testimonial.data_retention_until && (
                    <div>Хранение до: {formatDate(testimonial.data_retention_until)}</div>
                  )}
                </div>

                {getRetentionWarning(testimonial)}

                <div className="flex space-x-2 pt-2">
                  <Button
                    onClick={() => updateConsent(testimonial.id, true)}
                    disabled={testimonial.consent_given === true}
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Предоставить согласие
                  </Button>
                  
                  <Button
                    onClick={() => updateConsent(testimonial.id, false)}
                    disabled={testimonial.consent_given === false}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Отозвать согласие
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {testimonials.length === 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="text-center py-8">
              <p className="text-gray-300">Отзывы не найдены</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};