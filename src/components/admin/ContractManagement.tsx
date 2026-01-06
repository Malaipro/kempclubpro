import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Search, 
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ParticipantWithContract {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  personal_data_consent: boolean | null;
  personal_data_consent_date: string | null;
  contract_data?: {
    passport_series: string | null;
    passport_number: string | null;
    passport_issued_by: string | null;
    passport_issued_date: string | null;
    passport_department_code: string | null;
    registration_address: string | null;
    inn: string | null;
  };
  contracts?: {
    id: string;
    status: string;
    signed_pdf_url: string | null;
    signed_at: string | null;
  }[];
}

export const ContractManagement: React.FC = () => {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<ParticipantWithContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantWithContract | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      // Fetch profiles with contract data
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          first_name,
          last_name,
          middle_name,
          email,
          phone,
          date_of_birth,
          personal_data_consent,
          personal_data_consent_date
        `)
        .order('last_name');

      if (profilesError) throw profilesError;

      // Fetch contract data for each user
      const participantsWithData: ParticipantWithContract[] = [];
      
      for (const profile of profilesData || []) {
        // Get contract data
        const { data: contractData } = await supabase
          .from('contract_data')
          .select('*')
          .eq('user_id', profile.user_id)
          .maybeSingle();

        // Get contracts
        const { data: contracts } = await supabase
          .from('contracts')
          .select('id, status, signed_pdf_url, signed_at')
          .eq('user_id', profile.user_id);

        participantsWithData.push({
          ...profile,
          contract_data: contractData || undefined,
          contracts: contracts || undefined
        });
      }

      setParticipants(participantsWithData);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные участников',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, выберите PDF файл',
        variant: 'destructive',
      });
    }
  };

  const handleUploadContract = async () => {
    if (!selectedParticipant || !selectedFile) return;

    setUploading(true);
    try {
      const fileName = `${selectedParticipant.user_id}/contract_${Date.now()}.pdf`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      // Update or create contract record
      const { data: existingContract } = await supabase
        .from('contracts')
        .select('id')
        .eq('user_id', selectedParticipant.user_id)
        .maybeSingle();

      if (existingContract) {
        await supabase
          .from('contracts')
          .update({
            signed_pdf_url: urlData.publicUrl,
            status: 'signed',
            signed_at: new Date().toISOString(),
          })
          .eq('id', existingContract.id);
      } else {
        await supabase
          .from('contracts')
          .insert({
            user_id: selectedParticipant.user_id,
            signed_pdf_url: urlData.publicUrl,
            status: 'signed',
            signed_at: new Date().toISOString(),
          });
      }

      toast({
        title: 'Договор загружен',
        description: 'Подписанный договор успешно загружен',
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      fetchParticipants();
    } catch (error) {
      console.error('Error uploading contract:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить договор',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const getFullName = (p: ParticipantWithContract) => {
    return [p.last_name, p.first_name, p.middle_name].filter(Boolean).join(' ') || 'Не указано';
  };

  const filteredParticipants = participants.filter(p => {
    const fullName = getFullName(p).toLowerCase();
    const email = (p.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  const hasContractData = (p: ParticipantWithContract) => {
    return p.contract_data?.passport_series || p.contract_data?.passport_number;
  };

  const hasSignedContract = (p: ParticipantWithContract) => {
    return p.contracts?.some(c => c.status === 'signed' && c.signed_pdf_url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="mt-2 text-muted-foreground">Загрузка данных...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Управление договорами
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {filteredParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{getFullName(participant)}</p>
                      <p className="text-sm text-muted-foreground">{participant.email || 'Email не указан'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {participant.personal_data_consent ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Согласие ПД
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        <XCircle className="w-3 h-3 mr-1" />
                        Нет согласия
                      </Badge>
                    )}

                    {hasContractData(participant) ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <CreditCard className="w-3 h-3 mr-1" />
                        Паспорт
                      </Badge>
                    ) : null}

                    {hasSignedContract(participant) ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <FileText className="w-3 h-3 mr-1" />
                        Договор
                      </Badge>
                    ) : null}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedParticipant(participant);
                        setDetailsOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Детали
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedParticipant(participant);
                        setUploadDialogOpen(true);
                      }}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Загрузить договор
                    </Button>
                  </div>
                </div>
              ))}

              {filteredParticipants.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Участники не найдены
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Данные участника</DialogTitle>
          </DialogHeader>
          
          {selectedParticipant && (
            <div className="space-y-6">
              {/* Personal Data */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Личные данные
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">ФИО:</span>
                    <p className="font-medium">{getFullName(selectedParticipant)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Дата рождения:</span>
                    <p className="font-medium">
                      {selectedParticipant.date_of_birth 
                        ? format(new Date(selectedParticipant.date_of_birth), 'dd.MM.yyyy')
                        : 'Не указана'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Телефон:
                    </span>
                    <p className="font-medium">{selectedParticipant.phone || 'Не указан'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email:
                    </span>
                    <p className="font-medium">{selectedParticipant.email || 'Не указан'}</p>
                  </div>
                </div>
              </div>

              {/* Passport Data */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Паспортные данные
                </h3>
                {selectedParticipant.contract_data ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Серия и номер:</span>
                      <p className="font-medium">
                        {selectedParticipant.contract_data.passport_series} {selectedParticipant.contract_data.passport_number}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Дата выдачи:</span>
                      <p className="font-medium">
                        {selectedParticipant.contract_data.passport_issued_date 
                          ? format(new Date(selectedParticipant.contract_data.passport_issued_date), 'dd.MM.yyyy')
                          : 'Не указана'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Кем выдан:</span>
                      <p className="font-medium">{selectedParticipant.contract_data.passport_issued_by || 'Не указано'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Код подразделения:</span>
                      <p className="font-medium">{selectedParticipant.contract_data.passport_department_code || 'Не указан'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ИНН:</span>
                      <p className="font-medium">{selectedParticipant.contract_data.inn || 'Не указан'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Адрес прописки:
                      </span>
                      <p className="font-medium">{selectedParticipant.contract_data.registration_address || 'Не указан'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Паспортные данные не заполнены</p>
                )}
              </div>

              {/* Consent */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Согласия</h3>
                <div className="flex items-center gap-2">
                  {selectedParticipant.personal_data_consent ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">
                        Согласие на обработку ПД получено 
                        {selectedParticipant.personal_data_consent_date && 
                          ` ${format(new Date(selectedParticipant.personal_data_consent_date), 'dd.MM.yyyy HH:mm')}`
                        }
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-muted-foreground">Согласие не получено</span>
                    </>
                  )}
                </div>
              </div>

              {/* Contracts */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Договоры
                </h3>
                {selectedParticipant.contracts && selectedParticipant.contracts.length > 0 ? (
                  <div className="space-y-2">
                    {selectedParticipant.contracts.map((contract) => (
                      <div key={contract.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">
                            Статус: <Badge variant="outline">{contract.status}</Badge>
                          </span>
                          {contract.signed_at && (
                            <span className="text-xs text-muted-foreground">
                              Подписан: {format(new Date(contract.signed_at), 'dd.MM.yyyy')}
                            </span>
                          )}
                        </div>
                        {contract.signed_pdf_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={contract.signed_pdf_url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4 mr-1" />
                              Скачать
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Договоры отсутствуют</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Загрузка подписанного договора</DialogTitle>
          </DialogHeader>
          
          {selectedParticipant && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Участник: <span className="font-medium text-foreground">{getFullName(selectedParticipant)}</span>
              </p>
              
              <div>
                <Label htmlFor="contract-file">PDF файл договора</Label>
                <Input
                  id="contract-file"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="mt-1"
                />
              </div>

              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Выбран файл: {selectedFile.name}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Отмена
                </Button>
                <Button 
                  onClick={handleUploadContract} 
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Загрузить
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
