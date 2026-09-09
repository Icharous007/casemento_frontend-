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
};

function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || 'Erro ao processar sua solicitação. Tente novamente.';
}

type DrawerType = 'add-child' | 'add-adult' | null;

export default function PartyPage() {
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
    mutationFn: ({ guestId, status }: { guestId: string; status: 'ATTENDING' | 'DECLINED' }) =>
      confirmPartyMemberRsvp(guestId, status),
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const resetFormFields = () => {
    setChildName('');
    setChildAge(null);
    setAdultName('');
    setAdultPhone('');
    setAdultAge(null);
  };

  async function handleAddChild() {
    if (childName.trim().length < 2) {
      return;
    }
    const request: AddPartyMemberRequest = {
      name: childName,
      guestType: 'CHILD',
      age: childAge || undefined,
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
    const request: AddPartyMemberRequest = {
      name: adultName,
      phone: unmaskPhone(adultPhone),
      guestType: 'ADULT',
      age: adultAge || undefined,
    };
    addMutation.mutate(request);
  }

  function handleConfirmRsvp(memberId: string, status: 'ATTENDING' | 'DECLINED') {
    confirmRsvpMutation.mutate({ guestId: memberId, status });
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
                  onConfirmRsvp={handleConfirmRsvp}
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
                        onConfirmRsvp={handleConfirmRsvp}
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
            label="Idade (opcional)"
            type="number"
            value={childAge !== null ? childAge : ''}
            onChange={(e) => setChildAge(e.target.value ? parseInt(e.target.value) : null)}
            sx={{ mb: 3 }}
          />

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
              disabled={childName.trim().length < 2 || addMutation.isPending}
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
            sx={{ mb: 3 }}
          />

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
  onConfirmRsvp: (guestId: string, status: 'ATTENDING' | 'DECLINED') => void;
  onRemove?: (guestId: string) => void;
  disableRemove?: boolean;
  isLoading?: boolean;
}

function MemberCard({
  member,
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
            if (v) onConfirmRsvp(member.guestId, v);
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

      {member.managedByName && !member.isSelf && (
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
          Gerenciado por {member.managedByName}
        </Typography>
      )}
    </Box>
  );
}
