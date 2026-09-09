import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Drawer,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import PersonIcon from '@mui/icons-material/Person';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPartyMembers,
  addPartyMember,
  confirmPartyMemberRsvp,
  removePartyMember,
  type AddPartyMemberRequest,
  type PartyMemberResponse,
} from '../../api/partyApi';
import GuestLayout from './GuestLayout';
import { maskPhone, unmaskPhone, isPhoneLengthValid } from '../../utils/phoneMask';

const ERROR_MESSAGES: Record<string, string> = {
  GUEST_ALREADY_HAS_ACCESS:
    'Essa pessoa já acessa o evento por conta própria. Peça para ela confirmar a presença dela mesma.',
  GUEST_ALREADY_MANAGED: 'Essa pessoa já está sendo gerenciada por outro membro da família.',
  CANNOT_ADD_SELF: 'Não é possível adicionar a si mesmo.',
  CANNOT_REMOVE_SELF_REGISTERED:
    'Não é possível remover um membro que já se registrou por conta própria.',
  PHONE_INVALID: 'Número de telefone inválido. Verifique e tente novamente.',
  NAME_EMPTY: 'Nome não pode estar vazio.',
  INVALID_GUEST_TYPE: 'Tipo de convidado inválido.',
  RSVP_DEADLINE_EXPIRED: 'Prazo de confirmação encerrado.',
  AGE_REQUIRED: 'Informe uma idade válida para a criança.',
  ATTENDANCE_REQUIRED: 'Informe se a pessoa irá ao evento.',
  DIETARY_REQUIRED: 'Informe as restrições alimentares ou escreva "Não possui".',
  ALLERGIES_REQUIRED: 'Informe as alergias ou escreva "Não possui".',
  ADDITIONAL_INFO_REQUIRED: 'Informe dados adicionais ou escreva "Não se aplica".',
};

function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || 'Erro ao processar sua solicitação. Tente novamente.';
}

type DrawerType = 'add-child' | 'add-adult' | null;
type RsvpDraft = {
  attendanceStatus: 'ATTENDING' | 'DECLINED' | null;
  dietaryRestrictions: string;
  allergies: string;
  additionalInfo: string;
};

export default function PartyPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Data fetching
  const { data: members = [], isLoading } = useQuery<PartyMemberResponse[]>({
    queryKey: ['guest', 'party'],
    queryFn: listPartyMembers,
  });

  // Add member mutation
  const addMutation = useMutation({
    mutationFn: addPartyMember,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest', 'party'] });
      setOpenDrawer(null);
      resetFormFields();
      setSuccessMessage('Membro da família adicionado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  // Confirm RSVP mutation
  const confirmRsvpMutation = useMutation({
    mutationFn: ({ guestId, body }: { guestId: string; body: { attendanceStatus: 'ATTENDING' | 'DECLINED'; dietaryRestrictions?: string; allergies?: string; additionalInfo?: string } }) =>
      confirmPartyMemberRsvp(guestId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest', 'party'] });
    },
  });

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: removePartyMember,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guest', 'party'] });
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    },
  });

  // Form state
  const [openDrawer, setOpenDrawer] = useState<DrawerType>(null);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState<number | null>(null);
  const [adultName, setAdultName] = useState('');
  const [adultPhone, setAdultPhone] = useState('');
  const [adultAge, setAdultAge] = useState<number | null>(null);
  const [childAttendance, setChildAttendance] = useState<'ATTENDING' | 'DECLINED' | null>(null);
  const [childDietary, setChildDietary] = useState('');
  const [childAllergies, setChildAllergies] = useState('');
  const [childAdditional, setChildAdditional] = useState('');
  const [adultAttendance, setAdultAttendance] = useState<'ATTENDING' | 'DECLINED' | null>(null);
  const [adultDietary, setAdultDietary] = useState('');
  const [adultAllergies, setAdultAllergies] = useState('');
  const [adultAdditional, setAdultAdditional] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [rsvpDrafts, setRsvpDrafts] = useState<Record<string, RsvpDraft>>({});

  const resetFormFields = () => {
    setChildName('');
    setChildAge(null);
    setAdultName('');
    setAdultPhone('');
    setAdultAge(null);
    setChildAttendance(null);
    setChildDietary('');
    setChildAllergies('');
    setChildAdditional('');
    setAdultAttendance(null);
    setAdultDietary('');
    setAdultAllergies('');
    setAdultAdditional('');
  };

  async function handleAddChild() {
    if (childName.trim().length < 2) {
      return;
    }
    if (!childAttendance || childAge === null || childAge < 0 || childAge > 120 || !childDietary.trim() || !childAllergies.trim() || !childAdditional.trim()) return;
    const request: AddPartyMemberRequest = {
      name: childName,
      guestType: 'CHILD',
      age: childAge,
      attendanceStatus: childAttendance,
      dietaryRestrictions: childDietary.trim(),
      allergies: childAllergies.trim(),
      additionalInfo: childAdditional.trim(),
    };
    addMutation.mutate(request);
  }

  async function handleAddAdult() {
    if (adultName.trim().length < 2) {
      return;
    }
    if (!isPhoneLengthValid(adultPhone)) {
      return;
    }
    if (!adultAttendance || !adultDietary.trim() || !adultAllergies.trim() || !adultAdditional.trim()) return;
    const request: AddPartyMemberRequest = {
      name: adultName,
      phone: unmaskPhone(adultPhone),
      guestType: 'ADULT',
      age: adultAge || undefined,
      attendanceStatus: adultAttendance,
      dietaryRestrictions: adultDietary.trim(),
      allergies: adultAllergies.trim(),
      additionalInfo: adultAdditional.trim(),
    };
    addMutation.mutate(request);
  }

  function draftFor(member: PartyMemberResponse): RsvpDraft {
    return rsvpDrafts[member.guestId] ?? {
      attendanceStatus: member.rsvpStatus === 'PENDING' ? null : member.rsvpStatus,
      dietaryRestrictions: member.dietaryRestrictions ?? '',
      allergies: member.allergies ?? '',
      additionalInfo: member.additionalInfo ?? '',
    };
  }

  function updateDraft(member: PartyMemberResponse, patch: Partial<RsvpDraft>) {
    setRsvpDrafts((current) => ({ ...current, [member.guestId]: { ...draftFor(member), ...patch } }));
  }

  function handleConfirmRsvp(member: PartyMemberResponse) {
    const draft = draftFor(member);
    if (!draft.attendanceStatus) return;
    confirmRsvpMutation.mutate({
      guestId: member.guestId,
      body: {
        attendanceStatus: draft.attendanceStatus,
        dietaryRestrictions: draft.attendanceStatus === 'ATTENDING' ? draft.dietaryRestrictions || undefined : undefined,
        allergies: draft.attendanceStatus === 'ATTENDING' ? draft.allergies || undefined : undefined,
        additionalInfo: draft.attendanceStatus === 'ATTENDING' ? draft.additionalInfo || undefined : undefined,
      },
    });
  }

  function handleRemoveClick(memberId: string) {
    setDeleteTargetId(memberId);
    setDeleteDialogOpen(true);
  }

  function handleConfirmDelete() {
    if (deleteTargetId) {
      removeMutation.mutate(deleteTargetId);
    }
  }

  const selfMember = members.find((m) => m.isSelf);
  const dependents = members.filter((m) => !m.isSelf);

  return (
    <GuestLayout title="Minha Família">
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {addMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getErrorMessage(
            (addMutation.error as any)?.response?.data?.code || 'ERROR'
          )}
        </Alert>
      )}

      {removeMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getErrorMessage(
            (removeMutation.error as any)?.response?.data?.code || 'ERROR'
          )}
        </Alert>
      )}

      <Button variant="text" onClick={() => navigate('/home')} sx={{ mb: 2 }}>
        Voltar para Home
      </Button>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Você */}
          {selfMember && (
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(181, 154, 199, 0.20)',
                borderRadius: 4,
                background: 'linear-gradient(180deg, rgba(255, 253, 251, 0.96), rgba(215, 198, 234, 0.88))',
                boxShadow: '0 18px 46px rgba(128, 102, 167, 0.14)',
                mb: 3,
              }}
            >
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Sua Confirmação
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <MemberCard
                  member={selfMember}
                  draft={draftFor(selfMember)}
                  onDraftChange={(patch) => updateDraft(selfMember, patch)}
                  onConfirmRsvp={() => handleConfirmRsvp(selfMember)}
                  onRemove={() => {}} // Can't remove self
                  disableRemove
                  isLoading={confirmRsvpMutation.isPending}
                />
              </CardContent>
            </Card>
          )}

          {/* Dependentes/Gerenciados */}
          {dependents.length > 0 && (
            <Card
              elevation={0}
              sx={{
                border: '1px solid rgba(181, 154, 199, 0.20)',
                borderRadius: 4,
                background: 'linear-gradient(180deg, rgba(255, 253, 251, 0.96), rgba(215, 198, 234, 0.88))',
                boxShadow: '0 18px 46px rgba(128, 102, 167, 0.14)',
                mb: 3,
              }}
            >
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Dependentes / Gerenciados ({dependents.length})
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {dependents.map((member) => (
                    <div key={member.guestId}>
                      <MemberCard
                        member={member}
                        draft={draftFor(member)}
                        onDraftChange={(patch) => updateDraft(member, patch)}
                        onConfirmRsvp={() => handleConfirmRsvp(member)}
                        onRemove={() => handleRemoveClick(member.guestId)}
                        isLoading={confirmRsvpMutation.isPending}
                      />
                    </div>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* CTA: Adicionar membro */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 4 }}>
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<AddIcon />}
              onClick={() => {
                resetFormFields();
                setOpenDrawer('add-child');
              }}
            >
              Adicionar criança
            </Button>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<AddIcon />}
              onClick={() => {
                resetFormFields();
                setOpenDrawer('add-adult');
              }}
            >
              Adicionar adulto
            </Button>
          </Box>
        </>
      )}

      {/* Drawer: Add Child */}
      <Drawer anchor="bottom" open={openDrawer === 'add-child'} onClose={() => setOpenDrawer(null)}>
        <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', width: '100%' }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Adicionar criança
          </Typography>

          <TextField
            fullWidth
            label="Nome"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Ex: João"
            sx={{ mb: 2 }}
            error={childName.trim().length > 0 && childName.trim().length < 2}
            helperText={
              childName.trim().length > 0 && childName.trim().length < 2
                ? 'Nome deve ter pelo menos 2 caracteres'
                : ''
            }
          />

          <TextField
            fullWidth
            label="Idade *"
            type="number"
            value={childAge !== null ? childAge : ''}
            onChange={(e) => setChildAge(e.target.value ? parseInt(e.target.value) : null)}
            sx={{ mb: 2 }}
            error={childAge !== null && (childAge < 0 || childAge > 120)}
            helperText="Obrigatória para crianças"
          />

          <Typography variant="body2" sx={{ mb: 1 }}>A criança irá ao evento?</Typography>
          <ToggleButtonGroup value={childAttendance} exclusive onChange={(_, value) => value && setChildAttendance(value)} fullWidth sx={{ mb: 2 }}>
            <ToggleButton value="ATTENDING">Sim, vai!</ToggleButton>
            <ToggleButton value="DECLINED">Não vai</ToggleButton>
          </ToggleButtonGroup>
          <TextField fullWidth required label="Restrições alimentares" placeholder="Escreva Não possui, se não houver" value={childDietary} onChange={(e) => setChildDietary(e.target.value)} sx={{ mb: 2 }} multiline rows={2} />
          <TextField fullWidth required label="Alergias" placeholder="Escreva Não possui, se não houver" value={childAllergies} onChange={(e) => setChildAllergies(e.target.value)} sx={{ mb: 2 }} multiline rows={2} />
          <TextField fullWidth required label="Informações adicionais" placeholder="Escreva Não se aplica, se não houver" value={childAdditional} onChange={(e) => setChildAdditional(e.target.value)} sx={{ mb: 3 }} multiline rows={2} />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setOpenDrawer(null)}
              disabled={addMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleAddChild}
              disabled={childName.trim().length < 2 || childAge === null || childAge < 0 || childAge > 120 || !childAttendance || !childDietary.trim() || !childAllergies.trim() || !childAdditional.trim() || addMutation.isPending}
              startIcon={
                addMutation.isPending ? <CircularProgress size={20} color="inherit" /> : undefined
              }
            >
              {addMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Drawer: Add Adult */}
      <Drawer anchor="bottom" open={openDrawer === 'add-adult'} onClose={() => setOpenDrawer(null)}>
        <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', width: '100%' }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Adicionar adulto
          </Typography>

          <TextField
            fullWidth
            label="Nome"
            value={adultName}
            onChange={(e) => setAdultName(e.target.value)}
            placeholder="Ex: Maria"
            sx={{ mb: 2 }}
            error={adultName.trim().length > 0 && adultName.trim().length < 2}
            helperText={
              adultName.trim().length > 0 && adultName.trim().length < 2
                ? 'Nome deve ter pelo menos 2 caracteres'
                : ''
            }
          />

          <TextField
            fullWidth
            label="Telefone (WhatsApp)"
            type="tel"
            inputMode="numeric"
            value={adultPhone}
            onChange={(e) => setAdultPhone(maskPhone(e.target.value))}
            placeholder="(11) 99999-9999"
            sx={{ mb: 2 }}
            error={adultPhone.length > 0 && !isPhoneLengthValid(adultPhone)}
            helperText={
              adultPhone.length > 0 && !isPhoneLengthValid(adultPhone)
                ? 'Número de telefone inválido'
                : 'Use número de celular com DDD'
            }
          />

          <TextField
            fullWidth
            label="Idade (opcional)"
            type="number"
            value={adultAge !== null ? adultAge : ''}
            onChange={(e) => setAdultAge(e.target.value ? parseInt(e.target.value) : null)}
            sx={{ mb: 2 }}
          />

          <Typography variant="body2" sx={{ mb: 1 }}>A pessoa irá ao evento?</Typography>
          <ToggleButtonGroup value={adultAttendance} exclusive onChange={(_, value) => value && setAdultAttendance(value)} fullWidth sx={{ mb: 2 }}>
            <ToggleButton value="ATTENDING">Sim, vai!</ToggleButton>
            <ToggleButton value="DECLINED">Não vai</ToggleButton>
          </ToggleButtonGroup>
          <TextField fullWidth required label="Restrições alimentares" placeholder="Escreva Não possui, se não houver" value={adultDietary} onChange={(e) => setAdultDietary(e.target.value)} sx={{ mb: 2 }} multiline rows={2} />
          <TextField fullWidth required label="Alergias" placeholder="Escreva Não possui, se não houver" value={adultAllergies} onChange={(e) => setAdultAllergies(e.target.value)} sx={{ mb: 2 }} multiline rows={2} />
          <TextField fullWidth required label="Informações adicionais" placeholder="Escreva Não se aplica, se não houver" value={adultAdditional} onChange={(e) => setAdultAdditional(e.target.value)} sx={{ mb: 3 }} multiline rows={2} />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setOpenDrawer(null)}
              disabled={addMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleAddAdult}
              disabled={
                adultName.trim().length < 2 ||
                !isPhoneLengthValid(adultPhone) ||
                !adultAttendance || !adultDietary.trim() || !adultAllergies.trim() || !adultAdditional.trim() ||
                addMutation.isPending
              }
              startIcon={
                addMutation.isPending ? <CircularProgress size={20} color="inherit" /> : undefined
              }
            >
              {addMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Remover membro da família?</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja remover este membro? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={removeMutation.isPending}
          >
            {removeMutation.isPending ? 'Removendo...' : 'Remover'}
          </Button>
        </DialogActions>
      </Dialog>
    </GuestLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────

interface MemberCardProps {
  member: PartyMemberResponse;
  draft: RsvpDraft;
  onDraftChange: (patch: Partial<RsvpDraft>) => void;
  onConfirmRsvp: () => void;
  onRemove?: (guestId: string) => void;
  disableRemove?: boolean;
  isLoading?: boolean;
}

function MemberCard({
  member,
  draft,
  onDraftChange,
  onConfirmRsvp,
  onRemove,
  disableRemove = false,
  isLoading = false,
}: MemberCardProps) {
  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          {member.guestType === 'CHILD' ? (
            <ChildCareIcon fontSize="small" color="secondary" />
          ) : (
            <PersonIcon fontSize="small" />
          )}
          <div>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {member.name}
            </Typography>
            {member.age && (
              <Typography variant="caption" color="textSecondary">
                {member.age} {member.age === 1 ? 'ano' : 'anos'}
              </Typography>
            )}
          </div>
        </Box>
        {!disableRemove && onRemove && (
          <IconButton
            size="small"
            color="error"
            onClick={() => onRemove(member.guestId)}
            disabled={isLoading}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
        <ToggleButtonGroup
          value={member.rsvpStatus === 'PENDING' ? null : member.rsvpStatus}
          exclusive
          onChange={(_, v) => {
            if (v) onDraftChange({
              attendanceStatus: v,
              ...(v === 'DECLINED' ? { dietaryRestrictions: '', allergies: '', additionalInfo: '' } : {}),
            });
          }}
          size="small"
          fullWidth
          disabled={isLoading}
        >
          <ToggleButton value="ATTENDING" sx={{ flex: 1 }}>
            Sim, vou!
          </ToggleButton>
          <ToggleButton value="DECLINED" sx={{ flex: 1 }}>
            Não vou
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {member.selfConfirmationSuggested && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Este jovem possui celular. Se tiver acesso a ele, peça que faça a própria confirmação.
        </Alert>
      )}

      {draft.attendanceStatus === 'ATTENDING' && (
        <Box sx={{ display: 'grid', gap: 1.5, mb: 2 }}>
          <TextField label="Restrições alimentares" value={draft.dietaryRestrictions} onChange={(event) => onDraftChange({ dietaryRestrictions: event.target.value })} multiline rows={2} size="small" />
          <TextField label="Alergias" value={draft.allergies} onChange={(event) => onDraftChange({ allergies: event.target.value })} multiline rows={2} size="small" />
          <TextField label="Informações adicionais" value={draft.additionalInfo} onChange={(event) => onDraftChange({ additionalInfo: event.target.value })} multiline rows={2} size="small" />
        </Box>
      )}

      <Button variant="contained" fullWidth onClick={onConfirmRsvp} disabled={!draft.attendanceStatus || isLoading}>
        Confirmar resposta
      </Button>

      {member.managedByName && !member.isSelf && (
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
          Gerenciado por {member.managedByName}
        </Typography>
      )}
    </Box>
  );
}
